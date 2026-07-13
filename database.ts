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

export async function createLead(input: { name: string; contact: string; task: string }): Promise<Lead> {
  const result = await pool.query<LeadRow>(
    `INSERT INTO leads (id, name, contact, task)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [randomUUID(), input.name, input.contact, input.task],
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
