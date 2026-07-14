import 'dotenv/config';
import { randomUUID, timingSafeEqual } from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';

import {
  LEAD_STATUSES,
  checkDatabase,
  claimChatSession,
  closeDatabase,
  createLead,
  deleteLead,
  getLeadIdentity,
  listLeads,
  runMigrations,
  updateLead,
  type LeadStatus,
} from './database.js';
import { runRouterOnce } from './neuro_seller/router.js';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const USER_ID_COOKIE = 'lambda19_user_id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readUserIdCookie(req: Request): string | null {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${USER_ID_COOKIE}=`))
    ?.slice(USER_ID_COOKIE.length + 1);

  return cookie && UUID_PATTERN.test(cookie) ? cookie : null;
}

function setUserIdCookie(res: Response, userId: string): void {
  res.cookie(USER_ID_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/',
  });
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

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      jwt.verify(authHeader.slice(7), JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'lambda19',
      });
      return next();
    } catch {
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
      return res.json({ success: true, token });
    }
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
      const validSessionId = sessionId === undefined || sessionId === ''
        ? null
        : parseRequiredText(sessionId, 128);

      if (!validName || !validContact || validTask === null || (sessionId !== undefined && sessionId !== '' && !validSessionId)) {
        return res.status(400).json({ success: false, message: 'Invalid lead data' });
      }

      const identity = await getLeadIdentity(readUserIdCookie(req), validSessionId);
      const lead = await createLead({
        name: validName,
        contact: validContact,
        task: validTask,
        userId: identity.userId,
        sessionId: identity.sessionId,
      });
      return res.status(201).json({ success: true, lead });
    } catch (error: unknown) {
      console.error('Error creating lead:', error);
      return res.status(500).json({ success: false, message: 'Unable to save the lead' });
    }
  });

  app.get('/api/leads', requireAdmin, async (_req, res) => {
    try {
      return res.json({ success: true, leads: await listLeads() });
    } catch (error: unknown) {
      console.error('Error listing leads:', error);
      return res.status(500).json({ success: false, message: 'Unable to load leads' });
    }
  });

  app.patch('/api/leads/:id', requireAdmin, async (req, res) => {
    try {
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
      return lead
        ? res.json({ success: true, lead })
        : res.status(404).json({ success: false, message: 'Lead not found' });
    } catch (error: unknown) {
      console.error('Error updating lead:', error);
      return res.status(500).json({ success: false, message: 'Unable to update the lead' });
    }
  });

  app.delete('/api/leads/:id', requireAdmin, async (req, res) => {
    try {
      return (await deleteLead(req.params.id))
        ? res.status(204).send()
        : res.status(404).json({ success: false, message: 'Lead not found' });
    } catch (error: unknown) {
      console.error('Error deleting lead:', error);
      return res.status(500).json({ success: false, message: 'Unable to delete the lead' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not configured on the server.');
        return res.status(500).json({ success: false, message: 'OpenAI API key is not configured on the server' });
      }

      const { messages, sessionId } = req.body as {
        messages?: ChatMessage[];
        sessionId?: string;
      };

      if (!Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing messages array' });
      }

      if (sessionId !== undefined && (typeof sessionId !== 'string' || sessionId.trim().length > 128)) {
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

      const cookieUserId = readUserIdCookie(req);
      const userId = cookieUserId || randomUUID();
      const claimedSessionId = await claimChatSession(userId, sessionId?.trim() || undefined);
      if (!cookieUserId) setUserIdCookie(res, userId);

      const result = await runRouterOnce(lastUserMessage, claimedSessionId);
      return res.json({
        success: true,
        text: result.response,
        sessionId: result.sessionId,
        userId,
      });
    } catch (error: unknown) {
      console.error('Error in /api/chat:', error);
      return res.status(500).json({ success: false, message: 'Unable to process the chat request' });
    }
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await checkDatabase();
      return res.json({ status: 'ok', database: 'ok' });
    } catch (error: unknown) {
      console.error('Database health check failed:', error);
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
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  void closeDatabase().finally(() => process.exit(1));
});
