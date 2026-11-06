import { defaultConfig, parseCompanyConfig, type CompanyConfig } from './companyConfig';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { createDatabase, getDb, hashPassword, verifyPassword, saveUser, loadState, getUserFromRequest } from './db';

export interface Company {
  id: string; slug: string; name: string; tagline: string;
  color: string; active: boolean; createdAt: number; config: CompanyConfig;
}
const cache = globalThis as unknown as { companyDbs?: Map<string, DatabaseSync> };
cache.companyDbs ??= new Map();
function registry() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, tagline TEXT NOT NULL, color TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, createdAt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS master_sessions (token TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS master_account (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, password_hash TEXT NOT NULL);`);
  const columns = db.prepare('PRAGMA table_info(companies)').all() as { name: string }[];
  if (!columns.some(c => c.name === 'config')) db.exec("ALTER TABLE companies ADD COLUMN config TEXT NOT NULL DEFAULT '{}'");
  db.exec('CREATE TABLE IF NOT EXISTS platform_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL, company_name TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, ts INTEGER NOT NULL)');
  if (!db.prepare('SELECT id FROM master_account WHERE id=1').get()) {
    const owner = db.prepare('SELECT username, password_hash FROM users WHERE id = ?').get(process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin') as { username: string; password_hash: string } | undefined;
    if (!owner) throw new Error('Administrador principal não encontrado.');
    db.prepare('INSERT OR IGNORE INTO master_account VALUES (1, ?, ?)').run(owner.username, owner.password_hash);
  }
  return db;
}
export function listCompanies(): Company[] {
  return (registry().prepare('SELECT * FROM companies ORDER BY createdAt DESC').all() as unknown as (Omit<Company, 'config'> & { config: string })[]).map(c => ({ ...c, active: !!c.active, config: parseCompanyConfig(JSON.parse(c.config)) }));
}
export function findCompany(slug: string): Company | undefined {
  return listCompanies().find(c => c.slug === slug);
}
export function isCompanyDatabase(db: DatabaseSync) {
  return [...cache.companyDbs!.values()].includes(db);
}
function companyDb(company: Company) {
  if (!cache.companyDbs!.has(company.id)) {
    if (process.env.VERCEL) throw new Error('Empresas exigem um servidor com armazenamento persistente.');
    const root = process.env.GRIDSTOCK_DB;
    const dir = path.join(root && root !== ':memory:' ? path.dirname(root) : path.join(process.cwd(), 'data'), 'companies');
    if (root !== ':memory:') fs.mkdirSync(dir, { recursive: true });
    const db = createDatabase(root === ':memory:' ? ':memory:' : path.join(dir, `${company.id}.db`), false);
    cache.companyDbs!.set(company.id, db);
  }
  return cache.companyDbs!.get(company.id)!;
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
function masterToken(req: Request) { return (req.headers.get('authorization') || '').replace(/^Bearer /, ''); }
export function requireMaster(req: Request) {
  const session = registry().prepare('SELECT created_at FROM master_sessions WHERE token = ?').get(masterToken(req)) as { created_at: number } | undefined;
  if (!session || session.created_at + 12 * 60 * 60 * 1000 <= Date.now()) throw new Error('Acesso exclusivo do administrador geral.');
}
export function masterLogin(username: unknown, password: unknown) {
  const db = registry();
  const account = db.prepare('SELECT * FROM master_account WHERE id=1').get() as { username: string; password_hash: string };
  if (String(username).trim().toLowerCase() !== account.username.toLowerCase() || !verifyPassword(String(password || ''), account.password_hash)) throw new Error('Credenciais inválidas.');
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM master_sessions WHERE created_at < ?').run(Date.now() - 12 * 60 * 60 * 1000);
  db.prepare('INSERT INTO master_sessions VALUES (?, ?)').run(token, Date.now());
  return { token };
}
export function masterLogout(req: Request) { registry().prepare('DELETE FROM master_sessions WHERE token = ?').run(masterToken(req)); }
export function changeMasterPassword(req: Request, current: unknown, next: unknown) {
  requireMaster(req);
  const db = registry();
  const account = db.prepare('SELECT password_hash FROM master_account WHERE id=1').get() as { password_hash: string };
  if (!verifyPassword(String(current || ''), account.password_hash)) throw new Error('Senha atual incorreta.');
  if (String(next || '').trim().length < 10) throw new Error('Use pelo menos 10 caracteres na nova senha.');
  db.prepare('UPDATE master_account SET password_hash = ? WHERE id=1').run(hashPassword(String(next)));
  db.prepare('DELETE FROM master_sessions WHERE token != ?').run(masterToken(req));
}
export function saveCompany(body: Record<string, unknown>): Company {
  if (process.env.VERCEL) throw new Error('Empresas exigem armazenamento persistente. Configure um servidor antes de cadastrar.');
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
  const company: Company = { config, id: existing?.id || crypto.randomUUID(), slug, name, tagline, color, active: existing ? (typeof body.active === 'boolean' ? body.active : existing.active) : true, createdAt: existing?.createdAt || Date.now() };
  if (!existing) {
    const password = String(body.password || '');
    if (password.trim().length < 8) throw new Error('Use pelo menos 8 caracteres na senha do responsável.');
    const tenantDb = companyDb(company);
    try {
      saveUser({ username: body.username, name: body.adminName || name, password, role: 'ops' }, tenantDb);
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
  if (action === 'reset' && req.headers.has('x-gridstock-company')) throw new Error('A administração da empresa não pode redefinir os dados da operação.');
  const db = databaseForRequest(req);
  if (action === 'users' && !body.id && (db.prepare('SELECT COUNT(*) AS n FROM users').get() as {n:number}).n >= config.maxUsers) throw new Error('Limite de usuários atingido. Consulte o administrador da plataforma.');
  if (action === 'warehouses' && !body.id && loadState(db).warehouses.length >= config.maxWarehouses) throw new Error('Limite de estoques atingido. Consulte o administrador da plataforma.');
  if (action === 'technicians' && body.username && !db.prepare('SELECT id FROM users WHERE technician_id = ?').get(String(body.id || '')) && (db.prepare('SELECT COUNT(*) AS n FROM users').get() as {n:number}).n >= config.maxUsers) throw new Error('Limite de usuários atingido. Consulte o administrador da plataforma.');
}
function audit(company: Company, action: string, detail: string) {
  registry().prepare('INSERT INTO platform_audit (company_id, company_name, action, detail, ts) VALUES (?, ?, ?, ?, ?)').run(company.id, company.name, action, detail, Date.now());
}
export function platformOverview() {
  const companies = listCompanies().map(company => {
    const db = companyDb(company);
    return { ...company, usage: {
      users: (db.prepare('SELECT COUNT(*) AS n FROM users').get() as {n:number}).n,
      warehouses: (db.prepare('SELECT COUNT(*) AS n FROM warehouses').get() as {n:number}).n,
      products: (db.prepare('SELECT COUNT(*) AS n FROM products').get() as {n:number}).n,
    } };
  });
  const history = registry().prepare('SELECT id, company_name AS companyName, action, ts FROM platform_audit ORDER BY id DESC LIMIT 30').all();
  return { companies, history };
}
export function revokeCompanySessions(id: string) {
  const company = listCompanies().find(c => c.id === id);
  if (!company) throw new Error('Empresa não encontrada.');
  companyDb(company).exec('DELETE FROM sessions');
  audit(company, 'Sessões encerradas', 'Todos os usuários precisarão entrar novamente.');
}
