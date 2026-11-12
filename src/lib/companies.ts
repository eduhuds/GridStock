import { isValidCpf, requireCpf, normalizeCpf, maskCpf } from './cpf';
import { defaultConfig, parseCompanyConfig, type CompanyConfig } from './companyConfig';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { authenticate, createDatabase, ensureSchemaMigrations, getDb, hashPassword, verifyPassword, saveUser, loadState, saveState, getUserFromRequest } from './db';
import { emptyState, type GridStockState } from './domain';
import { ensureFinanceSchema } from './platformFinance';

export interface Company {
  id: string; slug: string; name: string; tagline: string;
  color: string; active: boolean; createdAt: number; config: CompanyConfig;
}
const cache = globalThis as unknown as { companyDbs?: Map<string, DatabaseSync> };
cache.companyDbs ??= new Map();
const preparedRegistries = new WeakSet<DatabaseSync>();
function registry() {
  const db = getDb();
  if (!preparedRegistries.has(db)) {
  db.exec(`CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, tagline TEXT NOT NULL, color TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, createdAt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS master_sessions (token TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS master_account (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, password_hash TEXT NOT NULL);`);
  db.exec('CREATE TABLE IF NOT EXISTS platform_admin_accounts (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)');
  const sessionColumns = db.prepare('PRAGMA table_info(master_sessions)').all() as { name: string }[];
  if (!sessionColumns.some(c => c.name === 'admin_id')) db.exec("ALTER TABLE master_sessions ADD COLUMN admin_id TEXT NOT NULL DEFAULT ''");
  const columns = db.prepare('PRAGMA table_info(companies)').all() as { name: string }[];
  if (!columns.some(c => c.name === 'config')) db.exec("ALTER TABLE companies ADD COLUMN config TEXT NOT NULL DEFAULT '{}'");
  db.exec('CREATE TABLE IF NOT EXISTS platform_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL, company_name TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, ts INTEGER NOT NULL)');
  preparedRegistries.add(db);
  }
  if (!db.prepare('SELECT id FROM master_account WHERE id=1').get()) {
    const owner = (
      db.prepare('SELECT username, password_hash FROM users WHERE id = ?').get(process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin')
    ) as { username: string; password_hash: string } | undefined;
    if (owner) {
      db.prepare('INSERT OR IGNORE INTO master_account VALUES (1, ?, ?)').run(owner.username, owner.password_hash);
    }
  }
  return db;
}
export function listCompanies(): Company[] {
  return (registry().prepare('SELECT * FROM companies ORDER BY createdAt DESC').all() as unknown as (Omit<Company, 'config'> & { config: string })[]).map(c => ({ ...c, active: !!c.active, config: parseCompanyConfig(JSON.parse(c.config)) }));
}
export function findCompany(slug: string): Company | undefined {
  const row = registry().prepare('SELECT * FROM companies WHERE slug = ?').get(slug) as unknown as (Omit<Company, 'config'> & { config: string }) | undefined;
  return row ? { ...row, active: !!row.active, config: parseCompanyConfig(JSON.parse(row.config)) } : undefined;
}
export function isCompanyDatabase(db: DatabaseSync) {
  return [...cache.companyDbs!.values()].includes(db);
}
export function companyIdForDatabase(db: DatabaseSync): string | null {
  for (const [id, conn] of cache.companyDbs!.entries()) {
    if (conn === db) return id;
  }
  return null;
}
function companyDb(company: Company) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(company.id)) throw new Error('Identificador de empresa inválido.');
  if (!cache.companyDbs!.has(company.id)) {
    const root = process.env.GRIDSTOCK_DB;
    const baseDir = root && root !== ':memory:'
      ? path.dirname(root)
      : process.env.VERCEL
        ? '/tmp'
        : path.join(process.cwd(), 'data');
    const dir = path.join(baseDir, 'companies');
    if (root !== ':memory:') fs.mkdirSync(dir, { recursive: true });
    const db = createDatabase(root === ':memory:' ? ':memory:' : path.join(dir, `${company.id}.db`), false);
    cache.companyDbs!.set(company.id, db);
  }
  const db = cache.companyDbs!.get(company.id)!;
  ensureSchemaMigrations(db);
  return db;
}
export function databaseForRequest(req: Request) {
  const slug = req.headers.get('x-gridstock-company');
  if (slug === null) return getDb();
  const company = findCompany(slug);
  if (!company || !company.active) throw new Error('Empresa indisponível. Consulte o administrador.');
  const db = companyDb(company);
  const user = getUserFromRequest(req, db);
  if (user?.role === 'tech' && !company.config.fieldService) throw new Error('O módulo de equipe em campo está desabilitado.');
  return db;
}

export function authenticateCompanyFallback(username: unknown, password: unknown, requiredRole?: string) {
  const cpf = requireCpf(username);
  const candidates = listCompanies().filter(c => c.active && (requiredRole !== 'tech' || c.config.fieldService)).map(company => ({company, db:companyDb(company)})).filter(({db}) => db.prepare('SELECT id FROM users WHERE username = ?').get(cpf));
  if (candidates.length !== 1) throw new Error('CPF ou senha inválidos.');
  const { company, db } = candidates[0];
  const auth = authenticate(cpf, password, db);
  if ((requiredRole && auth.user.role !== requiredRole) || (auth.user.role === 'tech' && !company.config.fieldService)) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(auth.token);
    throw new Error('CPF ou senha inválidos.');
  }
  return [{ company, db, ...auth }];
}
function masterToken(req: Request) { return (req.headers.get('authorization') || '').replace(/^Bearer /, ''); }
export function requireMaster(req: Request) {
  const db = registry();
  const session = db.prepare('SELECT created_at, admin_id FROM master_sessions WHERE token = ?').get(masterToken(req)) as { created_at: number; admin_id: string } | undefined;
  if (!session || session.created_at + 12 * 60 * 60 * 1000 <= Date.now()) throw new Error('Acesso exclusivo do administrador geral.');
  if (session.admin_id && !db.prepare('SELECT id FROM platform_admin_accounts WHERE id = ?').get(session.admin_id)) throw new Error('Administrador indisponível.');
  return session.admin_id || '';
}
function administratorAccount(req: Request) {
  const id = requireMaster(req);
  const table = id ? 'platform_admin_accounts' : 'master_account';
  const account = registry().prepare(`SELECT username, password_hash FROM ${table} WHERE id = ?`).get(id || 1) as {username: string; password_hash: string};
  return { id, table, ...account };
}
export function createPlatformAdmin(username: unknown, password: unknown) {
  const login = String(username || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9._-]{2,39}$/.test(login)) throw new Error('Use de 3 a 40 letras, números, ponto, hífen ou sublinhado, começando por letra.');
  if (String(password || '').length < 10 || String(password).length > 256) throw new Error('Use uma senha de 10 a 256 caracteres.');
  const db = registry();
  if (db.prepare('SELECT id FROM master_account WHERE lower(username) = ?').get(login) || db.prepare('SELECT id FROM platform_admin_accounts WHERE username = ?').get(login)) throw new Error('Este usuário já existe.');
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO platform_admin_accounts VALUES (?, ?, ?)').run(id, login, hashPassword(String(password)));
  db.prepare('INSERT INTO platform_audit (company_id, company_name, action, detail, ts) VALUES (?, ?, ?, ?, ?)').run('platform', 'GRIDSTOCK', 'Administrador criado', 'Criado acesso dedicado à plataforma.', Date.now());
  return { id, username: login };
}
export function masterLogin(username: unknown, password: unknown, legacyConversion = false) {
  const db = registry();
  const extra = !legacyConversion ? db.prepare('SELECT * FROM platform_admin_accounts WHERE username = ?').get(String(username ?? '').trim().toLowerCase()) as {id:string; username:string; password_hash:string} | undefined : undefined;
  const account = extra || db.prepare('SELECT * FROM master_account WHERE id=1').get() as { username: string; password_hash: string } | undefined;
  const loginId = legacyConversion || extra ? String(username ?? '').trim().toLowerCase() : requireCpf(username);
  if (legacyConversion && account && isValidCpf(account.username)) throw new Error('Esta conta já utiliza CPF.');
  if (!account || !verifyPassword(String(password || ''), account.password_hash)) throw new Error('Credenciais inválidas.');
  const storedLower = account.username.trim().toLowerCase();
  if (loginId !== storedLower && normalizeCpf(account.username) !== loginId) throw new Error('Credenciais inválidas.');
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM master_sessions WHERE created_at < ?').run(Date.now() - 12 * 60 * 60 * 1000);
  db.prepare('INSERT INTO master_sessions (token, created_at, admin_id) VALUES (?, ?, ?)').run(token, Date.now(), extra?.id || '');
  return { token };
}
export function masterLogout(req: Request) { registry().prepare('DELETE FROM master_sessions WHERE token = ?').run(masterToken(req)); }
export function changeMasterPassword(req: Request, current: unknown, next: unknown) {
  requireMaster(req);
  const db = registry();
  const account = administratorAccount(req);
  if (!account || !verifyPassword(String(current || ''), account.password_hash)) throw new Error('Senha atual incorreta.');
  if (String(next || '').trim().length < 10 || String(next).length > 256) throw new Error('Use de 10 a 256 caracteres na nova senha.');
  db.prepare(`UPDATE ${account.table} SET password_hash = ? WHERE id = ?`).run(hashPassword(String(next)), account.id || 1);
  db.prepare('DELETE FROM master_sessions WHERE token != ? AND admin_id = ?').run(masterToken(req), account.id);
}
export function saveCompany(body: Record<string, unknown>): Company {
  const db = registry();
  const existing = body.id ? listCompanies().find(c => c.id === body.id) : undefined;
  if (body.id && !existing) throw new Error('Empresa não encontrada.');
  const name = String(body.name || '').trim().slice(0, 80);
  const slug = existing?.slug || String(body.slug || '').trim().toLowerCase().replace(/^\/empresa\//, '').replace(/\/$/, '');
  const tagline = String(body.tagline || '').trim().slice(0, 160);
  const color = String(body.color || '#285d48');
  if (!name || !/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) throw new Error('Informe nome e endereço com 3 a 40 letras minúsculas, números ou hífen.');
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Escolha uma cor válida.');
  if (listCompanies().some(c => c.slug === slug && c.id !== existing?.id)) throw new Error('Este endereço já pertence a outra empresa.');
  const config = parseCompanyConfig(body.config, existing?.config || defaultConfig);
  if (existing) {
    const tenantDb = companyDb(existing);
    const state = loadState(tenantDb);
    if (!config.fieldService && state.technicians.some(t => Object.values(state.stock[t.id] || {}).some(q => q > 0) || t.status !== 'available')) throw new Error('Devolva o estoque dos técnicos e conclua os atendimentos antes de desabilitar a equipe em campo.');
    const count = (tenantDb.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
    if (count > config.maxUsers || state.warehouses.length > config.maxWarehouses) throw new Error('O limite não pode ficar abaixo da quantidade já cadastrada.');
  }
  if (!existing) requireCpf(body.cpf ?? body.username);
  const company: Company = { config, id: existing?.id || crypto.randomUUID(), slug, name, tagline, color, active: existing ? (typeof body.active === 'boolean' ? body.active : existing.active) : true, createdAt: existing?.createdAt || Date.now() };
  if (!existing) {
    const password = String(body.password || '');
    if (password.trim().length < 8) throw new Error('Use pelo menos 8 caracteres na senha do responsável.');
    const tenantDb = companyDb(company);
    try {
      saveUser({ username: body.cpf ?? body.username, name: body.adminName || name, password, role: 'ops' }, tenantDb);
    } catch (err) {
      tenantDb.close(); cache.companyDbs!.delete(company.id);
      throw err;
    }
  }
  db.prepare('INSERT INTO companies (id, slug, name, tagline, color, active, createdAt, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, tagline=excluded.tagline, color=excluded.color, active=excluded.active, config=excluded.config').run(company.id, slug, name, tagline, color, Number(company.active), company.createdAt, JSON.stringify(config));
  if (!company.active) companyDb(company).exec('DELETE FROM sessions');
  if (existing?.config.fieldService && !config.fieldService) companyDb(company).exec("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role = 'tech')");
  audit(company, existing ? 'Empresa atualizada' : 'Empresa criada', JSON.stringify({ before: existing ? { config: existing.config, active: existing.active, name: existing.name } : null, after: { config, active: company.active, name } }));
  return company;
}

export function configForRequest(req: Request): CompanyConfig {
  const slug = req.headers.get('x-gridstock-company');
  if (slug === null) return defaultConfig;
  const company = findCompany(slug);
  if (!company?.active) throw new Error('Empresa indisponível.');
  return company.config;
}
export function enforceCompanyAction(req: Request, action: string, body: Record<string, unknown> = {}) {
  const config = configForRequest(req);
  const fieldKinds = ['withdraw', 'return', 'use', 'count', 'arrival', 'finish', 'departure'];
  if (!config.fieldService && (action === 'technicians' || (action === 'login' && body.role === 'tech') || (action === 'users' && body.role === 'tech') || (action === 'movements' && fieldKinds.includes(String(body.kind))))) throw new Error('Equipe em campo não está habilitada para esta empresa.');
  if (action === 'movements' && body.kind === 'stockout' && !config.stockOut) throw new Error('Saídas de estoque não estão habilitadas para esta empresa.');
  if (action === 'movements' && body.kind === 'transfer' && !config.transfers) throw new Error('Transferências não estão habilitadas para esta empresa.');
  if (action === 'reset' && body.mode === 'seed' && !config.fieldService) throw new Error('Dados de exemplo de campo exigem o módulo de equipe em campo.');
  const db = databaseForRequest(req);
  if (action === 'users' && !body.id && (db.prepare('SELECT COUNT(*) AS n FROM users').get() as {n:number}).n >= config.maxUsers) throw new Error('Limite de usuários atingido. Consulte o administrador da plataforma.');
  if (action === 'warehouses' && !body.id && loadState(db).warehouses.length >= config.maxWarehouses) throw new Error('Limite de estoques atingido. Consulte o administrador da plataforma.');
  if (action === 'technicians' && body.username && !db.prepare('SELECT id FROM users WHERE technician_id = ?').get(String(body.id || '')) && (db.prepare('SELECT COUNT(*) AS n FROM users').get() as {n:number}).n >= config.maxUsers) throw new Error('Limite de usuários atingido. Consulte o administrador da plataforma.');
}
function audit(company: Company, action: string, detail: string) {
  registry().prepare('INSERT INTO platform_audit (company_id, company_name, action, detail, ts) VALUES (?, ?, ?, ?, ?)').run(company.id, company.name, action, detail, Date.now());
}
export function platformOverview(req?: Request) {
  const now = Date.now();
  const companies = listCompanies().map(company => {
    const db = companyDb(company);
    return { ...company, usage: {
      users: (db.prepare('SELECT COUNT(*) AS n FROM users').get() as {n:number}).n,
      warehouses: (db.prepare('SELECT COUNT(*) AS n FROM warehouses').get() as {n:number}).n,
      products: (db.prepare('SELECT COUNT(*) AS n FROM products').get() as {n:number}).n,
      sessions: (db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?').get(now) as {n:number}).n,
      movements: (db.prepare('SELECT COUNT(*) AS n FROM movements').get() as {n:number}).n,
      lastActivityAt: (db.prepare('SELECT MAX(ts) AS ts FROM movements').get() as {ts:number | null}).ts,
    } };
  });
  const history = registry().prepare('SELECT id, company_id AS companyId, company_name AS companyName, action, detail, ts FROM platform_audit ORDER BY id DESC LIMIT 200').all();
  const account = req ? administratorAccount(req) : registry().prepare('SELECT username FROM master_account WHERE id=1').get() as { username: string } | undefined;
  return { companies, history, administrator: account ? { username: account.username, role: 'platform_admin' } : null };
}
export function revokeCompanySessions(id: string) {
  const company = listCompanies().find(c => c.id === id);
  if (!company) throw new Error('Empresa não encontrada.');
  companyDb(company).exec('DELETE FROM sessions');
  audit(company, 'Sessões encerradas', 'Todos os usuários precisarão entrar novamente.');
}
export function resetCompanyData(id: string) {
  const company = listCompanies().find(c => c.id === id);
  if (!company) throw new Error('Empresa não encontrada.');
  const db = companyDb(company);
  saveState(db, emptyState());
  const techUsers = db.prepare("SELECT id FROM users WHERE role = 'tech'").all() as { id: string }[];
  for (const tu of techUsers) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(tu.id);
  }
  db.exec("DELETE FROM users WHERE role = 'tech'");
  audit(company, 'Banco zerado', 'Estoques, produtos, técnicos e movimentações foram limpos.');
}
export function deleteCompany(id: string) {
  const company = listCompanies().find(c => c.id === id);
  if (!company) throw new Error('Empresa não encontrada.');
  const conn = cache.companyDbs?.get(company.id);
  if (conn) {
    try { conn.close(); } catch {}
    cache.companyDbs?.delete(company.id);
  }
  const root = process.env.GRIDSTOCK_DB;
  if (root !== ':memory:') {
    const baseDir = root ? path.dirname(root) : process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
    const dbPath = path.join(baseDir, 'companies', `${company.id}.db`);
    for (const suffix of ['', '-shm', '-wal']) {
      try { fs.rmSync(dbPath + suffix, { force: true }); } catch {}
    }
  }
  registry().prepare('DELETE FROM companies WHERE id = ?').run(company.id);
  audit(company, 'Empresa excluída', 'Empresa e dados removidos da plataforma.');
}

export interface PlatformRegistrySnapshot {
  companies: Record<string, unknown>[];
  masterAccount: Record<string, unknown> | null;
  platformAdmins?: Record<string, unknown>[];
  financeEntries?: Record<string, unknown>[];
  masterSessions: Record<string, unknown>[];
  platformAudit: Record<string, unknown>[];
}

export interface CompanyDbSnapshot {
  users: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  state: GridStockState;
  companyAudit?: Record<string, unknown>[];
}

export function exportPlatformRegistry(): PlatformRegistrySnapshot {
  const db = registry();
  ensureFinanceSchema();
  return {
    financeEntries: db.prepare('SELECT * FROM platform_finance').all() as Record<string, unknown>[],
    platformAdmins: db.prepare('SELECT * FROM platform_admin_accounts').all() as Record<string, unknown>[],
    companies: db.prepare('SELECT * FROM companies ORDER BY createdAt DESC').all() as Record<string, unknown>[],
    masterAccount: (db.prepare('SELECT * FROM master_account WHERE id=1').get() as Record<string, unknown> | undefined) || null,
    masterSessions: db.prepare('SELECT * FROM master_sessions').all() as Record<string, unknown>[],
    platformAudit: db.prepare('SELECT * FROM platform_audit ORDER BY id ASC').all() as Record<string, unknown>[],
  };
}

export function importPlatformRegistry(snapshot: Partial<PlatformRegistrySnapshot>) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const db = registry();
  ensureFinanceSchema();
  db.exec('BEGIN IMMEDIATE');
  try {
    if (Array.isArray(snapshot.financeEntries)) {
      db.exec('DELETE FROM platform_finance');
      const insert = db.prepare('INSERT INTO platform_finance VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const e of snapshot.financeEntries) insert.run(String(e.id), String(e.companyId || ''), String(e.companyName), String(e.kind), String(e.description), Number(e.amountCents), String(e.dueDate), String(e.paidDate || ''), String(e.status), Number(e.createdAt));
    }
    if (Array.isArray(snapshot.companies)) {
      db.exec('DELETE FROM companies');
      const ins = db.prepare(
        'INSERT INTO companies (id, slug, name, tagline, color, active, createdAt, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const c of snapshot.companies) {
        ins.run(
          String(c.id),
          String(c.slug),
          String(c.name),
          String(c.tagline || ''),
          String(c.color || '#285d48'),
          Number(c.active ?? 1),
          Number(c.createdAt || Date.now()),
          typeof c.config === 'string' ? c.config : JSON.stringify(c.config || {})
        );
      }
    }
    if (snapshot.masterAccount && snapshot.masterAccount.username && snapshot.masterAccount.password_hash) {
      db.prepare('INSERT OR REPLACE INTO master_account (id, username, password_hash) VALUES (1, ?, ?)').run(
        String(snapshot.masterAccount.username),
        String(snapshot.masterAccount.password_hash)
      );
    }
    if (Array.isArray(snapshot.platformAdmins)) {
      db.exec('DELETE FROM platform_admin_accounts');
      const insert = db.prepare('INSERT INTO platform_admin_accounts (id, username, password_hash) VALUES (?, ?, ?)');
      for (const admin of snapshot.platformAdmins) insert.run(String(admin.id), String(admin.username), String(admin.password_hash));
    }
    if (Array.isArray(snapshot.masterSessions)) {
      db.exec('DELETE FROM master_sessions');
      const insS = db.prepare('INSERT OR REPLACE INTO master_sessions (token, created_at, admin_id) VALUES (?, ?, ?)');
      for (const s of snapshot.masterSessions) {
        insS.run(String(s.token), Number(s.created_at), String(s.admin_id || ''));
      }
    }
    if (Array.isArray(snapshot.platformAudit)) {
      const insA = db.prepare(
        'INSERT OR REPLACE INTO platform_audit (id, company_id, company_name, action, detail, ts) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const a of snapshot.platformAudit) {
        insA.run(
          Number(a.id),
          String(a.company_id),
          String(a.company_name),
          String(a.action),
          String(a.detail || ''),
          Number(a.ts)
        );
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function exportCompanySnapshot(companyId: string): CompanyDbSnapshot | null {
  const company = listCompanies().find(c => c.id === companyId);
  if (!company) return null;
  const tenantDb = companyDb(company);
  return {
    users: tenantDb.prepare('SELECT * FROM users').all() as Record<string, unknown>[],
    sessions: tenantDb.prepare('SELECT * FROM sessions').all() as Record<string, unknown>[],
    state: loadState(tenantDb),
    companyAudit: tenantDb.prepare('SELECT * FROM company_audit ORDER BY id ASC').all() as Record<string, unknown>[],
  };
}

export function importCompanySnapshot(companyId: string, snapshot: CompanyDbSnapshot) {
  const company = listCompanies().find(c => c.id === companyId);
  if (!company || !snapshot) return;
  const tenantDb = companyDb(company);
  tenantDb.exec('BEGIN IMMEDIATE');
  try {
    if (Array.isArray(snapshot.users)) {
      tenantDb.exec('DELETE FROM users');
      const insU = tenantDb.prepare(
        'INSERT INTO users (id, username, name, password_hash, role, technician_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const u of snapshot.users) {
        insU.run(
          String(u.id),
          String(u.username),
          String(u.name),
          String(u.password_hash),
          String(u.role || 'ops'),
          u.technician_id ? String(u.technician_id) : null,
          Number(u.created_at || Date.now())
        );
      }
    }
    if (Array.isArray(snapshot.sessions)) {
      tenantDb.exec('DELETE FROM sessions');
      const insS = tenantDb.prepare(
        'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
      );
      for (const s of snapshot.sessions) {
        insS.run(String(s.token), String(s.user_id), Number(s.created_at), Number(s.expires_at));
      }
    }
    if (Array.isArray(snapshot.companyAudit)) {
      tenantDb.exec('DELETE FROM company_audit');
      const insA = tenantDb.prepare(
        'INSERT OR REPLACE INTO company_audit (id, actor_name, actor_username, actor_role, category, action, target, detail, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const a of snapshot.companyAudit) {
        insA.run(
          Number(a.id),
          String(a.actor_name || 'Sistema'),
          String(a.actor_username || ''),
          String(a.actor_role || 'ops'),
          String(a.category || 'system'),
          String(a.action || ''),
          String(a.target || ''),
          String(a.detail || ''),
          Number(a.ts || Date.now())
        );
      }
    }
    tenantDb.exec('COMMIT');
  } catch (err) {
    tenantDb.exec('ROLLBACK');
    throw err;
  }
  if (snapshot.state) {
    saveState(tenantDb, snapshot.state);
  }
}

/** Changes only the platform identity; tenant accounts remain independent. */
export function updateMasterUsername(req: Request, username: unknown, currentPassword: unknown) {
  requireMaster(req);
  const db = registry();
  const account = administratorAccount(req);
  if (!account || !verifyPassword(String(currentPassword || ''), account.password_hash)) throw new Error('Senha atual incorreta.');
  const next = account.id ? String(username || '').trim().toLowerCase() : requireCpf(username);
  if (account.id) {
    if (!/^[a-z][a-z0-9._-]{2,39}$/.test(next)) throw new Error('Use um usuário de 3 a 40 caracteres, começando por letra.');
    if (db.prepare('SELECT id FROM platform_admin_accounts WHERE username = ? AND id != ?').get(next, account.id) || db.prepare('SELECT id FROM master_account WHERE lower(username) = ?').get(next)) throw new Error('Este usuário já existe.');
  } else assertCpfAvailable(next, 'platform', 'master');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`UPDATE ${account.table} SET username = ? WHERE id = ?`).run(next, account.id || 1);
    db.prepare('DELETE FROM master_sessions WHERE token != ? AND admin_id = ?').run(masterToken(req), account.id);
    db.prepare('INSERT INTO platform_audit (company_id, company_name, action, detail, ts) VALUES (?, ?, ?, ?, ?)').run('platform', 'GRIDSTOCK', 'Login do administrador atualizado', JSON.stringify({ before: maskCpf(account.username), after: maskCpf(next) }), Date.now());
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return { username: next, role: 'platform_admin' };
}

/** Called synchronously before writing an identity. Never reveal the other owner. */
export function assertCpfAvailable(value: unknown, scope: string, userId: string) {
  const cpf = normalizeCpf(value);
  const masterUserId = process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin';
  const root = registry();
  const master = root.prepare('SELECT username FROM master_account WHERE id=1').get() as {username:string} | undefined;
  if (scope !== 'platform' && !(scope === 'root' && userId === masterUserId) && master && normalizeCpf(master.username) === cpf) {
    throw new Error('Este CPF já possui um cadastro. Consulte o administrador da plataforma.');
  }
  const databases = new Map<string, DatabaseSync>([['root', root], ...listCompanies().map(c => [c.id, companyDb(c)] as [string, DatabaseSync]), ...cache.companyDbs!.entries()]);
  for (const [databaseScope, db] of databases) {
    const users = db.prepare('SELECT id, username FROM users').all() as { id:string; username:string }[];
    if (users.some(u => normalizeCpf(u.username) === cpf && !(databaseScope === scope && u.id === userId) && !(scope === 'platform' && databaseScope === 'root' && u.id === masterUserId))) {
      throw new Error('Este CPF já possui um cadastro. Consulte o administrador da plataforma.');
    }
  }
}
export function convertMasterToCpf(username: unknown, password: unknown, cpf: unknown) {
  const next = requireCpf(cpf);
  const {token} = masterLogin(username, password, true);
  const req = new Request('http://local', {headers:{authorization:`Bearer ${token}`}});
  try { updateMasterUsername(req, next, password); }
  finally { masterLogout(req); }
  return masterLogin(next, password);
}
