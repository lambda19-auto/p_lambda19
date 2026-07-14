import 'dotenv/config';
import { randomUUID, timingSafeEqual } from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import pinoHttp from 'pino-http';

import {
  LEAD_STATUSES,
  banUserForHours,
  checkDatabase,
  closeDatabase,
  createLead,
  deleteLead,
  ensureUser,
  findOwnedSessionId,
  getActiveUserBan,
  listLeads,
  resolveChatSession,
  runMigrations,
  updateLead,
  type LeadStatus,
} from './database.js';
import { runRouterOnce } from './neuro_seller/router.js';
import { errorDetails, logger } from './logger.js';
import {
  deleteLogsByType,
  getLogsForExport,
  getLogSummary,
  isLogType,
  logsToCsv,
  persistLog,
  recordLog,
  runLogRetention,
} from './logStore.js';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type RequestWithLogging = Request & {
  id?: string;
};

type LogContext = {
  userId?: string | null;
  sessionId?: string | null;
  leadId?: string | null;
};

const GOODBYE_HARD_BAN_HOURS = 24;
const USER_ID_COOKIE = 'lambda19_user_id';
const USER_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = part.slice(0, separatorIndex).trim();
    if (key !== name) continue;

    try {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && LEAD_STATUSES.some((status) => status === value);
}

function parseRequiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function requestId(req: Request): string {
  return (req as RequestWithLogging).id || 'unknown';
}

function setLogContext(res: Response, context: LogContext): void {
  res.locals.logContext = { ...(res.locals.logContext as LogContext | undefined), ...context };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const JWT_SECRET = requireEnvironmentVariable('JWT_SECRET');
  const ADMIN_USERNAME = requireEnvironmentVariable('ADMIN_USERNAME');
  const ADMIN_PASSWORD = requireEnvironmentVariable('ADMIN_PASSWORD');

  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  await runMigrations();
  await runLogRetention();
  const retentionTimer = setInterval(() => {
    void runLogRetention().catch((error: unknown) => {
      logger.error({ event: 'logging.retention_failed', ...errorDetails(error) }, 'Log retention failed');
    });
  }, 24 * 60 * 60 * 1000);
  retentionTimer.unref();

  const getOrCreateUserId = async (req: Request, res: Response): Promise<string> => {
    const cookieUserId = getCookie(req, USER_ID_COOKIE);
    const userId = isUuid(cookieUserId) ? cookieUserId : randomUUID();

    await ensureUser(userId);

    if (cookieUserId !== userId) {
      res.cookie(USER_ID_COOKIE, userId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: USER_COOKIE_MAX_AGE_MS,
        path: '/',
      });
    }

    return userId;
  };

  app.disable('x-powered-by');
  app.use(pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const id = typeof incoming === 'string' && incoming.length <= 128 ? incoming : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customLogLevel(_req, res, error) {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage() {
      return 'HTTP request completed';
    },
    customErrorMessage() {
      return 'HTTP request failed';
    },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, path: req.url?.split('?')[0], remoteAddress: req.remoteAddress };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }));
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.once('finish', () => {
      if (res.statusCode < 400) {
        const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
        const context = (res.locals.logContext || {}) as LogContext;
        void persistLog({
          type: 'http_success',
          level: 'info',
          event: 'http.request_succeeded',
          message: 'HTTP request completed successfully',
          requestId: requestId(req),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs,
          ...context,
        });
      }
    });
    next();
  });
  app.use(express.json({ limit: '32kb' }));

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      void recordLog({
        type: 'security_audit', level: 'warn', event: 'admin.authorization_failed',
        message: 'Admin request rejected: token missing', requestId: requestId(req),
        method: req.method, path: req.path,
      });
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'lambda19',
      });
      if (typeof decoded !== 'object' || decoded.role !== 'admin' || typeof decoded.username !== 'string') {
        throw new Error('Token does not contain an admin identity');
      }
      res.locals.adminUsername = decoded.username;
      return next();
    } catch {
      void recordLog({
        type: 'security_audit', level: 'warn', event: 'admin.authorization_failed',
        message: 'Admin request rejected: token invalid or expired', requestId: requestId(req),
        method: req.method, path: req.path,
      });
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  };

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body as { username?: unknown; password?: unknown };
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    if (safeEqual(username, ADMIN_USERNAME) && safeEqual(password, ADMIN_PASSWORD)) {
      const token = jwt.sign(
        { username, role: 'admin' },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '24h', issuer: 'lambda19' },
      );
      void recordLog({
        type: 'security_audit', level: 'info', event: 'admin.login_succeeded',
        message: 'Administrator signed in', requestId: requestId(req), actor: username,
      });
      return res.json({ success: true, token });
    }
    void recordLog({
      type: 'security_audit', level: 'warn', event: 'admin.login_failed',
      message: 'Administrator sign-in failed', requestId: requestId(req),
      metadata: { usernameLength: username.length },
    });
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  });

  app.post('/api/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'lambda19',
      });
      return res.json({ success: true, decoded });
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  });

  app.post('/api/logout', requireAdmin, async (req, res) => {
    await recordLog({
      type: 'security_audit', level: 'info', event: 'admin.logout',
      message: 'Administrator signed out', requestId: requestId(req), actor: res.locals.adminUsername,
    });
    return res.status(204).send();
  });

  app.post('/api/leads', async (req, res) => {
    try {
      const { name, contact, task, sessionId } = req.body as {
        name?: unknown;
        contact?: unknown;
        task?: unknown;
        sessionId?: unknown;
      };
      const validName = parseRequiredText(name, 200);
      const validContact = parseRequiredText(contact, 500);
      const validTask = task === undefined || task === '' ? '' : parseRequiredText(task, 10_000);

      if (!validName || !validContact || validTask === null) {
        return res.status(400).json({ success: false, message: 'Invalid lead data' });
      }
      if (sessionId !== undefined && !isUuid(sessionId)) {
        return res.status(400).json({ success: false, message: 'Invalid session ID' });
      }

      const userId = await getOrCreateUserId(req, res);
      const ownedSessionId = await findOwnedSessionId(userId, isUuid(sessionId) ? sessionId : undefined);
      const lead = await createLead({
        userId,
        sessionId: ownedSessionId,
        name: validName,
        contact: validContact,
        task: validTask,
      });
      setLogContext(res, { userId, sessionId: ownedSessionId, leadId: lead.leadId });
      await recordLog({
        type: 'lead_audit', level: 'info', event: 'lead.created',
        message: 'Lead created', requestId: requestId(req), userId,
        sessionId: ownedSessionId, leadId: lead.leadId,
      });
      return res.status(201).json({
        success: true,
        userId,
        sessionId: ownedSessionId,
        leadId: lead.leadId,
        lead,
      });
    } catch (error: unknown) {
      await recordLog({
        type: 'application_error', level: 'error', event: 'lead.create_failed',
        message: 'Unable to create lead', requestId: requestId(req), metadata: errorDetails(error),
      });
      return res.status(500).json({ success: false, message: 'Unable to save the lead' });
    }
  });

  app.get('/api/leads', requireAdmin, async (req, res) => {
    try {
      void recordLog({
        type: 'security_audit', level: 'info', event: 'admin.leads_viewed',
        message: 'Administrator viewed leads', requestId: requestId(req), actor: res.locals.adminUsername,
      });
      return res.json({ success: true, leads: await listLeads() });
    } catch (error: unknown) {
      await recordLog({
        type: 'application_error', level: 'error', event: 'lead.list_failed',
        message: 'Unable to list leads', requestId: requestId(req), metadata: errorDetails(error),
      });
      return res.status(500).json({ success: false, message: 'Unable to load leads' });
    }
  });

  app.patch('/api/leads/:id', requireAdmin, async (req, res) => {
    try {
      if (!isUuid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid lead ID' });
      }
      const { status, notes } = req.body as { status?: unknown; notes?: unknown };
      if (status === undefined && notes === undefined) {
        return res.status(400).json({ success: false, message: 'No changes provided' });
      }
      if (status !== undefined && !isLeadStatus(status)) {
        return res.status(400).json({ success: false, message: 'Invalid lead status' });
      }
      if (notes !== undefined && (typeof notes !== 'string' || notes.length > 10_000)) {
        return res.status(400).json({ success: false, message: 'Invalid lead notes' });
      }

      const lead = await updateLead(req.params.id, {
        status: status as LeadStatus | undefined,
        notes: typeof notes === 'string' ? notes.trim() : undefined,
      });
      if (lead) {
        setLogContext(res, { userId: lead.userId, sessionId: lead.sessionId, leadId: lead.leadId });
        await recordLog({
          type: 'lead_audit', level: 'info', event: 'lead.updated',
          message: 'Lead updated by administrator', requestId: requestId(req),
          actor: res.locals.adminUsername, userId: lead.userId, sessionId: lead.sessionId,
          leadId: lead.leadId, metadata: { changedFields: Object.keys(req.body as object) },
        });
      }
      return lead
        ? res.json({ success: true, lead })
        : res.status(404).json({ success: false, message: 'Lead not found' });
    } catch (error: unknown) {
      await recordLog({
        type: 'application_error', level: 'error', event: 'lead.update_failed',
        message: 'Unable to update lead', requestId: requestId(req),
        leadId: req.params.id, metadata: errorDetails(error),
      });
      return res.status(500).json({ success: false, message: 'Unable to update the lead' });
    }
  });

  app.delete('/api/leads/:id', requireAdmin, async (req, res) => {
    try {
      if (!isUuid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid lead ID' });
      }
      const deleted = await deleteLead(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Lead not found' });
      await recordLog({
        type: 'lead_audit', level: 'info', event: 'lead.deleted',
        message: 'Lead deleted by administrator', requestId: requestId(req),
        actor: res.locals.adminUsername, leadId: req.params.id,
      });
      return res.status(204).send();
    } catch (error: unknown) {
      await recordLog({
        type: 'application_error', level: 'error', event: 'lead.delete_failed',
        message: 'Unable to delete lead', requestId: requestId(req),
        leadId: req.params.id, metadata: errorDetails(error),
      });
      return res.status(500).json({ success: false, message: 'Unable to delete the lead' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        await recordLog({
          type: 'ai_error', level: 'error', event: 'ai.configuration_missing',
          message: 'OpenAI API key is not configured', requestId: requestId(req),
        });
        return res.status(500).json({ success: false, message: 'OpenAI API key is not configured on the server' });
      }

      const { messages, sessionId } = req.body as {
        messages?: ChatMessage[];
        sessionId?: string;
      };

      if (!Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing messages array' });
      }

      if (sessionId !== undefined && !isUuid(sessionId)) {
        return res.status(400).json({ success: false, message: 'Invalid session ID' });
      }

      const lastUserMessage = [...messages]
        .reverse()
        .find((message) => message.role === 'user' && typeof message.content === 'string')
        ?.content.trim();

      if (!lastUserMessage) {
        return res.status(400).json({ success: false, message: 'A user message is required' });
      }

      if (lastUserMessage.length > 4000) {
        return res.status(413).json({ success: false, message: 'Message is too long' });
      }

      const userId = await getOrCreateUserId(req, res);
      const activeBan = await getActiveUserBan(userId);
      if (activeBan) {
        const retryAfterSeconds = Math.max(1, Math.ceil((activeBan.getTime() - Date.now()) / 1000));
        setLogContext(res, { userId });
        res.setHeader('Retry-After', String(retryAfterSeconds));
        await recordLog({
          type: 'security_audit', level: 'warn', event: 'ai.user_ban_enforced',
          message: 'Temporarily banned user attempted to access the AI consultant',
          requestId: requestId(req), userId,
          metadata: { bannedUntil: activeBan.toISOString(), retryAfterSeconds },
        });
        return res.status(429).json({
          success: false,
          code: 'USER_TEMPORARILY_BANNED',
          message: 'Chat access is temporarily suspended',
          bannedUntil: activeBan.toISOString(),
        });
      }

      const boundSessionId = await resolveChatSession(userId, sessionId);
      setLogContext(res, { userId, sessionId: boundSessionId });
      logger.info({ event: 'ai.request_started', requestId: requestId(req), userId, sessionId: boundSessionId }, 'AI consultant request started');
      const result = await runRouterOnce(lastUserMessage, boundSessionId);

      let bannedUntil: Date | null = null;
      if (result.goodbyeHardTriggered) {
        bannedUntil = await banUserForHours(userId, GOODBYE_HARD_BAN_HOURS);
        await recordLog({
          type: 'security_audit', level: 'warn', event: 'ai.user_temporarily_banned',
          message: 'User temporarily banned after goodbye_hard response',
          requestId: requestId(req), userId, sessionId: result.sessionId,
          metadata: {
            durationHours: GOODBYE_HARD_BAN_HOURS,
            bannedUntil: bannedUntil.toISOString(),
          },
        });
      }

      logger.info({ event: 'ai.request_completed', requestId: requestId(req), userId, sessionId: result.sessionId }, 'AI consultant request completed');
      return res.json({
        success: true,
        text: result.response,
        userId,
        sessionId: result.sessionId,
        temporarilyBanned: Boolean(bannedUntil),
        bannedUntil: bannedUntil?.toISOString() ?? null,
      });
    } catch (error: unknown) {
      const context = (res.locals.logContext || {}) as LogContext;
      await recordLog({
        type: 'ai_error', level: 'error', event: 'ai.request_failed',
        message: 'AI consultant request failed', requestId: requestId(req),
        ...context, metadata: errorDetails(error),
      });
      return res.status(500).json({ success: false, message: 'Unable to process the chat request' });
    }
  });

  app.get('/api/logs/summary', requireAdmin, async (req, res) => {
    try {
      const summary = await getLogSummary();
      await recordLog({
        type: 'security_audit', level: 'info', event: 'admin.logs_viewed',
        message: 'Administrator viewed log summary', requestId: requestId(req),
        actor: res.locals.adminUsername,
      });
      return res.json({ success: true, logs: summary });
    } catch (error: unknown) {
      await recordLog({
        type: 'application_error', level: 'error', event: 'logs.summary_failed',
        message: 'Unable to load log summary', requestId: requestId(req), metadata: errorDetails(error),
      });
      return res.status(500).json({ success: false, message: 'Unable to load log summary' });
    }
  });

  app.get('/api/logs/export', requireAdmin, async (req, res) => {
    const type = req.query.type;
    const reason = parseRequiredText(req.query.reason, 500);
    if (!isLogType(type) || !reason) {
      return res.status(400).json({ success: false, message: 'Valid log type and export reason are required' });
    }
    try {
      const rows = await getLogsForExport(type);
      await recordLog({
        type: 'security_audit', level: 'info', event: 'admin.logs_exported',
        message: 'Administrator exported logs', requestId: requestId(req),
        actor: res.locals.adminUsername, metadata: { exportedType: type, reason, rowCount: rows.length },
      });
      const filename = `lambda19-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(`\uFEFF${logsToCsv(rows)}`);
    } catch (error: unknown) {
      await recordLog({
        type: 'application_error', level: 'error', event: 'logs.export_failed',
        message: 'Unable to export logs', requestId: requestId(req), metadata: errorDetails(error),
      });
      return res.status(500).json({ success: false, message: 'Unable to export logs' });
    }
  });

  app.delete('/api/logs', requireAdmin, async (req, res) => {
    const { type, reason } = req.body as { type?: unknown; reason?: unknown };
    const validReason = parseRequiredText(reason, 500);
    if (!isLogType(type) || !validReason) {
      return res.status(400).json({ success: false, message: 'Valid log type and deletion reason are required' });
    }
    try {
      const deletedCount = await deleteLogsByType(type);
      await recordLog({
        type: 'security_audit', level: 'warn', event: 'admin.logs_deleted',
        message: 'Administrator deleted logs', requestId: requestId(req),
        actor: res.locals.adminUsername, metadata: { deletedType: type, reason: validReason, deletedCount },
      });
      return res.json({ success: true, deletedCount });
    } catch (error: unknown) {
      await recordLog({
        type: 'application_error', level: 'error', event: 'logs.delete_failed',
        message: 'Unable to delete logs', requestId: requestId(req), metadata: errorDetails(error),
      });
      return res.status(500).json({ success: false, message: 'Unable to delete logs' });
    }
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await checkDatabase();
      return res.json({ status: 'ok', database: 'ok' });
    } catch (error: unknown) {
      await recordLog({
        type: 'application_error', level: 'error', event: 'database.healthcheck_failed',
        message: 'Database health check failed', requestId: requestId(_req), metadata: errorDetails(error),
      });
      return res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info({ event: 'application.started', port: PORT }, 'Server started');
  });

  const shutdown = () => {
    clearInterval(retentionTimer);
    logger.info({ event: 'application.shutdown_started' }, 'Server shutdown started');
    server.close(() => {
      void closeDatabase().finally(() => {
        logger.info({ event: 'application.shutdown_completed' }, 'Server shutdown completed');
        process.exit(0);
      });
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((error: unknown) => {
  logger.fatal({ event: 'application.start_failed', ...errorDetails(error) }, 'Failed to start server');
  void closeDatabase().finally(() => process.exit(1));
});

process.on('unhandledRejection', (error: unknown) => {
  void recordLog({
    type: 'application_error', level: 'error', event: 'application.unhandled_rejection',
    message: 'Unhandled promise rejection', metadata: errorDetails(error),
  });
});

process.on('uncaughtException', (error: unknown) => {
  logger.fatal({ event: 'application.uncaught_exception', ...errorDetails(error) }, 'Uncaught exception');
  void persistLog({
    type: 'application_error', level: 'error', event: 'application.uncaught_exception',
    message: 'Uncaught exception', metadata: errorDetails(error),
  }).finally(() => closeDatabase().finally(() => process.exit(1)));
});
