import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Pool, type PoolClient } from 'pg';

export const LEAD_STATUSES = ['New', 'In Progress', 'Completed', 'Rejected'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: string;
  name: string;
  contact: string;
  task: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  notes: string;
  userId: string | null;
  sessionId: string | null;
};

type LeadRow = {
  id: string;
  name: string;
  contact: string;
  task: string;
  status: LeadStatus;
  created_at: Date;
  updated_at: Date;
  notes: string;
  user_id: string | null;
  session_id: string | null;
};

type LeadIdentityRow = {
  user_id: string;
  session_id: string | null;
};

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    task: row.task,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    notes: row.notes,
    userId: row.user_id,
    sessionId: row.session_id,
  };
}

async function applyMigration(client: PoolClient, name: string, sql: string): Promise<void> {
  await client.query(sql);
  await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
  console.log(`Applied database migration: ${name}`);
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('p_lambda19_migrations'))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'dist', 'migrations')
      : path.join(process.cwd(), 'migrations');
    const migrationNames = (await fs.readdir(migrationsPath))
      .filter((name) => name.endsWith('.sql'))
      .sort();
    const appliedResult = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((row) => row.name));

    for (const name of migrationNames) {
      if (!applied.has(name)) {
        const sql = await fs.readFile(path.join(migrationsPath, name), 'utf8');
        await applyMigration(client, name, sql);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function claimChatSession(userId: string, requestedSessionId?: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
      [userId],
    );

    const candidateSessionId = requestedSessionId || randomUUID();
    const claimed = await client.query<{ id: string }>(
      `INSERT INTO chat_sessions (id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE
         SET updated_at = NOW()
         WHERE chat_sessions.user_id = EXCLUDED.user_id
       RETURNING id`,
      [candidateSessionId, userId],
    );

    const sessionId = claimed.rows[0]?.id || randomUUID();
    if (!claimed.rows[0]) {
      await client.query(
        'INSERT INTO chat_sessions (id, user_id) VALUES ($1, $2)',
        [sessionId, userId],
      );
    }

    await client.query('COMMIT');
    return sessionId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getLeadIdentity(
  userId: string | null,
  sessionId: string | null,
): Promise<{ userId: string | null; sessionId: string | null }> {
  if (!userId) return { userId: null, sessionId: null };

  const result = await pool.query<LeadIdentityRow>(
    `SELECT users.id AS user_id, chat_sessions.id AS session_id
     FROM users
     LEFT JOIN chat_sessions
       ON chat_sessions.user_id = users.id
      AND chat_sessions.id = $2
     WHERE users.id = $1`,
    [userId, sessionId],
  );

  return result.rows[0]
    ? { userId: result.rows[0].user_id, sessionId: result.rows[0].session_id }
    : { userId: null, sessionId: null };
}

export async function createLead(input: {
  name: string;
  contact: string;
  task: string;
  userId: string | null;
  sessionId: string | null;
}): Promise<Lead> {
  const result = await pool.query<LeadRow>(
    `INSERT INTO leads (id, name, contact, task, user_id, session_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [randomUUID(), input.name, input.contact, input.task, input.userId, input.sessionId],
  );
  return mapLead(result.rows[0]);
}

export async function listLeads(): Promise<Lead[]> {
  const result = await pool.query<LeadRow>('SELECT * FROM leads ORDER BY created_at DESC');
  return result.rows.map(mapLead);
}

export async function updateLead(
  id: string,
  input: { status?: LeadStatus; notes?: string },
): Promise<Lead | null> {
  const result = await pool.query<LeadRow>(
    `UPDATE leads
     SET status = COALESCE($2, status),
         notes = COALESCE($3, notes),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, input.status ?? null, input.notes ?? null],
  );
  return result.rows[0] ? mapLead(result.rows[0]) : null;
}

export async function deleteLead(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM leads WHERE id = $1', [id]);
  return result.rowCount === 1;
}

export async function checkDatabase(): Promise<void> {
  await pool.query('SELECT 1');
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
