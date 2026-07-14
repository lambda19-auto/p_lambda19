import { randomUUID } from 'crypto';

import { pool } from './database.js';
import { logger } from './logger.js';

export const LOG_TYPES = [
  'http_success',
  'application_error',
  'ai_error',
  'lead_audit',
  'security_audit',
] as const;

export type LogType = (typeof LOG_TYPES)[number];
export type LogLevel = 'info' | 'warn' | 'error';

export const LOG_RETENTION_DAYS: Record<LogType, number> = {
  http_success: 30,
  application_error: 90,
  ai_error: 90,
  lead_audit: 365,
  security_audit: 365,
};

export type LogEntry = {
  type: LogType;
  level: LogLevel;
  event: string;
  message: string;
  requestId?: string;
  userId?: string | null;
  sessionId?: string | null;
  leadId?: string | null;
  actor?: string | null;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

type StoredLogRow = {
  id: string;
  created_at: Date;
  type: LogType;
  level: LogLevel;
  event: string;
  message: string;
  request_id: string | null;
  user_id: string | null;
  session_id: string | null;
  lead_id: string | null;
  actor: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
};

export function isLogType(value: unknown): value is LogType {
  return typeof value === 'string' && LOG_TYPES.some((type) => type === value);
}

function writeToStdout(entry: LogEntry): void {
  const { level, message, ...fields } = entry;
  logger[level](fields, message);
}

export async function persistLog(entry: LogEntry): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO logs (
         id, type, level, event, message, request_id, user_id, session_id,
         lead_id, actor, method, path, status_code, duration_ms, metadata
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
       )`,
      [
        randomUUID(), entry.type, entry.level, entry.event, entry.message,
        entry.requestId ?? null, entry.userId ?? null, entry.sessionId ?? null,
        entry.leadId ?? null, entry.actor ?? null, entry.method ?? null,
        entry.path ?? null, entry.statusCode ?? null, entry.durationMs ?? null,
        entry.metadata ?? {},
      ],
    );
    return true;
  } catch (error: unknown) {
    logger.error({ event: 'logging.persistence_failed', errorType: error instanceof Error ? error.name : 'UnknownError' }, 'Unable to persist log entry');
    return false;
  }
}

export async function recordLog(entry: LogEntry): Promise<boolean> {
  writeToStdout(entry);
  return persistLog(entry);
}

export async function runLogRetention(): Promise<Record<LogType, number>> {
  const result = await pool.query<{ type: LogType }>(
    `DELETE FROM logs
     WHERE (type = 'http_success' AND created_at < NOW() - INTERVAL '30 days')
        OR (type IN ('application_error', 'ai_error') AND created_at < NOW() - INTERVAL '90 days')
        OR (type IN ('lead_audit', 'security_audit') AND created_at < NOW() - INTERVAL '365 days')
     RETURNING type`,
  );
  const deleted = Object.fromEntries(LOG_TYPES.map((type) => [type, 0])) as Record<LogType, number>;
  for (const row of result.rows) deleted[row.type] += 1;
  logger.info({ event: 'logging.retention_completed', deleted }, 'Log retention completed');
  return deleted;
}

export async function getLogSummary(): Promise<Array<{
  type: LogType;
  retentionDays: number;
  count: number;
  oldestAt: string | null;
  newestAt: string | null;
}>> {
  const result = await pool.query<{
    type: LogType;
    count: string;
    oldest_at: Date | null;
    newest_at: Date | null;
  }>(
    `SELECT type, COUNT(*)::text AS count, MIN(created_at) AS oldest_at, MAX(created_at) AS newest_at
     FROM logs
     GROUP BY type`,
  );
  const rows = new Map(result.rows.map((row) => [row.type, row]));
  return LOG_TYPES.map((type) => {
    const row = rows.get(type);
    return {
      type,
      retentionDays: LOG_RETENTION_DAYS[type],
      count: Number(row?.count ?? 0),
      oldestAt: row?.oldest_at?.toISOString() ?? null,
      newestAt: row?.newest_at?.toISOString() ?? null,
    };
  });
}

export async function getLogsForExport(type: LogType, limit = 50_000): Promise<StoredLogRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50_000);
  const result = await pool.query<StoredLogRow>(
    `SELECT id, created_at, type, level, event, message, request_id, user_id,
            session_id, lead_id, actor, method, path, status_code, duration_ms, metadata
     FROM logs
     WHERE type = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [type, safeLimit],
  );
  return result.rows;
}

export async function deleteLogsByType(type: LogType): Promise<number> {
  const result = await pool.query('DELETE FROM logs WHERE type = $1', [type]);
  return result.rowCount ?? 0;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const normalized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const spreadsheetSafe = /^[=+\-@\t\r]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${spreadsheetSafe.replace(/"/g, '""')}"`;
}

export function logsToCsv(rows: StoredLogRow[]): string {
  const columns: Array<keyof StoredLogRow> = [
    'id', 'created_at', 'type', 'level', 'event', 'message', 'request_id',
    'user_id', 'session_id', 'lead_id', 'actor', 'method', 'path',
    'status_code', 'duration_ms', 'metadata',
  ];
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n');
}
