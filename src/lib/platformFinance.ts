import crypto from 'node:crypto';
import { getDb } from './db';
import { listCompanies, requireMaster } from './companies';
import { validateFinanceInput, type FinanceEntry } from './finance';

export function ensureFinanceSchema() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS platform_finance (
    id TEXT PRIMARY KEY, companyId TEXT NOT NULL, companyName TEXT NOT NULL,
    kind TEXT NOT NULL, description TEXT NOT NULL, amountCents INTEGER NOT NULL,
    dueDate TEXT NOT NULL, paidDate TEXT NOT NULL, status TEXT NOT NULL, createdAt INTEGER NOT NULL
  )`);
  return db;
}
export function listFinanceEntries(req: Request): FinanceEntry[] {
  requireMaster(req);
  return ensureFinanceSchema().prepare('SELECT * FROM platform_finance ORDER BY dueDate DESC, createdAt DESC').all() as FinanceEntry[];
}
export function saveFinanceEntry(req: Request, body: Record<string, unknown>) {
  requireMaster(req);
  const db = ensureFinanceSchema();
  const values = validateFinanceInput(body);
  const existing = body.id ? db.prepare('SELECT * FROM platform_finance WHERE id = ?').get(String(body.id)) as FinanceEntry | undefined : undefined;
  if (body.id && !existing) throw new Error('Lançamento não encontrado.');
  const companyId = String(body.companyId || '');
  const company = companyId ? listCompanies().find(c => c.id === companyId) : undefined;
  if (companyId && !company && existing?.companyId !== companyId) throw new Error('Empresa não encontrada.');
  const entry: FinanceEntry = { id: existing?.id || crypto.randomUUID(), companyId, companyName: company?.name || (companyId ? existing?.companyName || '' : 'Plataforma'), ...values, createdAt: existing?.createdAt || Date.now() };
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT OR REPLACE INTO platform_finance (id, companyId, companyName, kind, description, amountCents, dueDate, paidDate, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(entry.id, entry.companyId, entry.companyName, entry.kind, entry.description, entry.amountCents, entry.dueDate, entry.paidDate, entry.status, entry.createdAt);
    db.prepare('INSERT INTO platform_audit (company_id, company_name, action, detail, ts) VALUES (?, ?, ?, ?, ?)').run(companyId || 'platform', entry.companyName, existing ? 'Lançamento financeiro atualizado' : 'Lançamento financeiro criado', `${entry.description} · ${entry.status}`, Date.now());
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return entry;
}
