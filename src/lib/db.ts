import { requireCpf, isValidCpf, normalizeCpf } from './cpf';
import { assertCpfAvailable, companyIdForDatabase } from './companies';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const envPath = path.resolve(process.cwd(), '.env');
if (typeof process.loadEnvFile === 'function' && fs.existsSync(envPath)) {
  try { process.loadEnvFile(envPath); } catch {}
}
import {
  emptyState,
  seed,
  GridStockState,
  Warehouse,
  Part,
  Technician,
  Movement,
  MovementKind,
  TechColor,
  TechStatus,
} from './domain';

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: 'ops' | 'tech';
  technicianId: string | null;
  createdAt: number;
}

interface UserRow {
  id: string;
  username: string;
  name: string;
  password_hash: string;
  role: 'ops' | 'tech';
  technician_id: string | null;
  created_at: number;
}

export function hashPassword(password: string): string {
  if (String(password).length > 256) throw new Error('A senha deve ter no máximo 256 caracteres.');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (String(password).length > 256) return false;
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function cleanUser(row?: UserRow | null): UserAccount | null {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    technicianId: row.technician_id || null,
    createdAt: row.created_at,
  };
}

const globalForDb = globalThis as unknown as { __gridstockDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (globalForDb.__gridstockDb) {
    return globalForDb.__gridstockDb;
  }
  const defaultPath = process.env.VERCEL
    ? '/tmp/gridstock.db'
    : path.join(process.cwd(), 'data', 'gridstock.db');
  const resolved = process.env.GRIDSTOCK_DB || defaultPath;
  if (resolved !== ':memory:') {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
  }
  const db = createDatabase(resolved);
  globalForDb.__gridstockDb = db;
  return db;
}

export function createDatabase(resolved: string, createAdmin = true): DatabaseSync {
  const db = new DatabaseSync(resolved);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      technician_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      responsible TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'un.',
      min INTEGER NOT NULL DEFAULT 0,
      base_min INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS technicians (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'mint',
      vehicle TEXT NOT NULL,
      region TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      order_code TEXT NOT NULL DEFAULT '',
      client TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      checked_at INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_locations (
      warehouse_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      corridor TEXT NOT NULL,
      shelf TEXT NOT NULL,
      PRIMARY KEY (warehouse_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS stock_balances (
      location_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (location_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY,
      seq_num INTEGER NOT NULL,
      kind TEXT NOT NULL,
      technician_id TEXT,
      part_id TEXT,
      qty INTEGER,
      warehouse_id TEXT,
      from_id TEXT,
      to_id TEXT,
      from_address TEXT,
      to_address TEXT,
      order_code TEXT,
      placement TEXT,
      note TEXT,
      operator TEXT,
      before_qty INTEGER,
      delta INTEGER,
      ts INTEGER NOT NULL
    );
  `);

  const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM users').get() as { cnt: number };
  const adminUser = process.env.GRIDSTOCK_ADMIN_USERNAME;
  const adminPass = process.env.GRIDSTOCK_ADMIN_PASSWORD;
  const adminName = process.env.GRIDSTOCK_ADMIN_NAME || 'Controle Operacional';
  const adminId = process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin';
  if (createAdmin && countRow.cnt === 0 && adminUser && adminPass) {
    const now = Date.now();
    db.prepare(`
      INSERT INTO users (id, username, name, password_hash, role, technician_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(adminId, adminUser, adminName, hashPassword(adminPass), 'ops', null, now);
  }

  const metaVersion = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('version');
  if (!metaVersion) {
    const initial = createAdmin && process.env.GRIDSTOCK_INITIAL_MODE === 'seed' ? seed() : emptyState();
    saveState(db, initial);
  }

  return db;
}

export function loadState(db = getDb()): GridStockState {
  const metaRows = db.prepare('SELECT key, value FROM app_meta').all() as { key: string; value: string }[];
  const meta = Object.fromEntries(metaRows.map(r => [r.key, JSON.parse(r.value)]));

  const warehouses: Warehouse[] = (db.prepare('SELECT * FROM warehouses ORDER BY sort_order ASC').all() as Record<string, unknown>[]).map(w => ({
    id: String(w.id),
    code: String(w.code),
    name: String(w.name),
    city: String(w.city),
    responsible: String(w.responsible),
    address: String(w.address || ''),
  }));

  const parts: Part[] = (db.prepare('SELECT * FROM products ORDER BY sort_order ASC').all() as Record<string, unknown>[]).map(p => ({
    id: String(p.id),
    sku: String(p.sku),
    name: String(p.name),
    category: String(p.category),
    unit: String(p.unit || 'un.'),
    min: Number(p.min ?? 0),
    baseMin: Number(p.base_min ?? 0),
  }));

  const technicians: Technician[] = (db.prepare('SELECT * FROM technicians ORDER BY sort_order ASC').all() as Record<string, unknown>[]).map(t => ({
    id: String(t.id),
    name: String(t.name),
    initials: String(t.initials),
    color: (t.color as TechColor) || 'mint',
    vehicle: String(t.vehicle),
    region: String(t.region),
    status: (t.status as TechStatus) || 'available',
    order: String(t.order_code || ''),
    client: String(t.client || ''),
    address: String(t.address || ''),
    checkedAt: t.checked_at !== null && t.checked_at !== undefined ? Number(t.checked_at) : null,
  }));

  const locations: GridStockState['locations'] = {};
  for (const w of warehouses) {
    locations[w.id] = {};
  }
  const locRows = db.prepare('SELECT * FROM product_locations').all() as {
    warehouse_id: string;
    product_id: string;
    corridor: string;
    shelf: string;
  }[];
  for (const r of locRows) {
    if (!locations[r.warehouse_id]) locations[r.warehouse_id] = {};
    locations[r.warehouse_id][r.product_id] = { corridor: r.corridor, shelf: r.shelf };
  }

  const stock: GridStockState['stock'] = {};
  for (const w of warehouses) {
    stock[w.id] = Object.fromEntries(parts.map(p => [p.id, 0]));
  }
  for (const t of technicians) {
    stock[t.id] = Object.fromEntries(parts.map(p => [p.id, 0]));
  }
  const stockRows = db.prepare('SELECT * FROM stock_balances').all() as {
    location_id: string;
    product_id: string;
    qty: number;
  }[];
  for (const r of stockRows) {
    if (!stock[r.location_id]) stock[r.location_id] = {};
    stock[r.location_id][r.product_id] = Number(r.qty);
  }

  const movements: Movement[] = (db.prepare('SELECT * FROM movements ORDER BY ts DESC, seq_num DESC').all() as Record<string, unknown>[]).map(m => {
    const ev: Movement = {
      id: String(m.id),
      kind: m.kind as MovementKind,
      ts: Number(m.ts),
    };
    if (m.technician_id !== null && m.technician_id !== undefined) ev.technician = String(m.technician_id);
    if (m.part_id !== null && m.part_id !== undefined) ev.part = String(m.part_id);
    if (m.qty !== null && m.qty !== undefined) ev.qty = Number(m.qty);
    if (m.warehouse_id !== null && m.warehouse_id !== undefined) ev.warehouse = String(m.warehouse_id);
    if (m.from_id !== null && m.from_id !== undefined) ev.from = String(m.from_id);
    if (m.to_id !== null && m.to_id !== undefined) ev.to = String(m.to_id);
    if (m.from_address) ev.fromAddress = JSON.parse(String(m.from_address));
    if (m.to_address) ev.toAddress = JSON.parse(String(m.to_address));
    if (m.order_code !== null && m.order_code !== undefined) ev.order = String(m.order_code);
    if (m.placement !== null && m.placement !== undefined) ev.placement = String(m.placement);
    if (m.note !== null && m.note !== undefined) ev.note = String(m.note);
    if (m.operator !== null && m.operator !== undefined) ev.operator = String(m.operator);
    if (m.before_qty !== null && m.before_qty !== undefined) ev.before = Number(m.before_qty);
    if (m.delta !== null && m.delta !== undefined) ev.delta = Number(m.delta);
    return ev;
  });

  return {
    version: meta.version ?? 2,
    warehouses,
    parts,
    technicians,
    stock,
    locations,
    movements,
    used: meta.used ?? 0,
    seq: meta.seq ?? 0,
    warehouseSeq: meta.warehouseSeq ?? warehouses.length,
    productSeq: meta.productSeq ?? parts.length,
    techSeq: meta.techSeq ?? technicians.length,
    demo: meta.demo ?? {},
    updatedAt: meta.updatedAt ?? Date.now(),
  };
}

export function saveState(db: DatabaseSync, s: GridStockState): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    const setMeta = db.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)');
    for (const key of ['version', 'used', 'seq', 'warehouseSeq', 'productSeq', 'techSeq', 'demo', 'updatedAt'] as const) {
      setMeta.run(key, JSON.stringify(s[key] ?? (key === 'demo' ? {} : 0)));
    }

    db.exec('DELETE FROM warehouses');
    const insWarehouse = db.prepare(`
      INSERT INTO warehouses (id, code, name, city, responsible, address, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    s.warehouses.forEach((w, i) => {
      insWarehouse.run(w.id, w.code, w.name, w.city, w.responsible, w.address || '', i);
    });

    db.exec('DELETE FROM products');
    const insProduct = db.prepare(`
      INSERT INTO products (id, sku, name, category, unit, min, base_min, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    s.parts.forEach((p, i) => {
      insProduct.run(p.id, p.sku, p.name, p.category, p.unit || 'un.', p.min ?? 0, p.baseMin ?? 0, i);
    });

    db.exec('DELETE FROM technicians');
    const insTech = db.prepare(`
      INSERT INTO technicians (id, name, initials, color, vehicle, region, status, order_code, client, address, checked_at, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    s.technicians.forEach((t, i) => {
      insTech.run(
        t.id,
        t.name,
        t.initials,
        t.color || 'mint',
        t.vehicle,
        t.region,
        t.status || 'available',
        t.order || '',
        t.client || '',
        t.address || '',
        t.checkedAt ?? null,
        i
      );
    });

    db.exec('DELETE FROM product_locations');
    const insLoc = db.prepare(`
      INSERT INTO product_locations (warehouse_id, product_id, corridor, shelf)
      VALUES (?, ?, ?, ?)
    `);
    for (const [wid, slots] of Object.entries(s.locations || {})) {
      for (const [pid, slot] of Object.entries(slots || {})) {
        if (slot && slot.corridor && slot.shelf) {
          insLoc.run(wid, pid, slot.corridor, slot.shelf);
        }
      }
    }

    db.exec('DELETE FROM stock_balances');
    const insStock = db.prepare(`
      INSERT INTO stock_balances (location_id, product_id, qty)
      VALUES (?, ?, ?)
    `);
    for (const [locId, balances] of Object.entries(s.stock || {})) {
      for (const [pid, qty] of Object.entries(balances || {})) {
        insStock.run(locId, pid, Number(qty) || 0);
      }
    }

    db.exec('DELETE FROM movements');
    const insMov = db.prepare(`
      INSERT INTO movements (
        id, seq_num, kind, technician_id, part_id, qty, warehouse_id,
        from_id, to_id, from_address, to_address, order_code, placement,
        note, operator, before_qty, delta, ts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    s.movements.forEach((m, idx) => {
      const numMatch = String(m.id || '').match(/(\d+)$/);
      const seqNum = numMatch ? Number(numMatch[1]) : s.movements.length - idx;
      insMov.run(
        m.id,
        seqNum,
        m.kind,
        m.technician ?? null,
        m.part ?? null,
        m.qty ?? null,
        m.warehouse ?? null,
        m.from ?? null,
        m.to ?? null,
        m.fromAddress ? JSON.stringify(m.fromAddress) : null,
        m.toAddress ? JSON.stringify(m.toAddress) : null,
        m.order ?? null,
        m.placement ?? null,
        m.note ?? null,
        m.operator ?? null,
        m.before ?? null,
        m.delta ?? null,
        m.ts
      );
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function authenticate(username: unknown, password: unknown, db = getDb(), legacyConversion = false): { token: string; user: UserAccount } {
  const u = legacyConversion ? String(username ?? '').trim().toLowerCase() : requireCpf(username);
  const p = String(password ?? '');
  if (!u || !p) throw new Error('Informe usuário e senha.');
  const row = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(u) as UserRow | undefined;
  if (!row || (legacyConversion && isValidCpf(row.username)) || !verifyPassword(p, row.password_hash)) {
    throw new Error('Usuário ou senha inválidos.');
  }
  const user = cleanUser(row)!;
  const now = Date.now();
  const expiresAt = now + 12 * 60 * 60 * 1000;
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT OR REPLACE INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    row.id,
    now,
    expiresAt
  );
  return { token, user };
}

export function getUserFromRequest(req: Request, db = getDb()): UserAccount | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const now = Date.now();
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as
    | { token: string; user_id: string; expires_at: number }
    | undefined;
  if (session) {
    if (session.expires_at < now) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as UserRow | undefined;
    return cleanUser(userRow);
  }
  return null;
}

export function logoutRequest(req: Request, db = getDb()): void {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function listUsers(db = getDb()): UserAccount[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as unknown as UserRow[];
  return rows.map(r => cleanUser(r)!);
}

export function saveUser(payload: Record<string, unknown>, db = getDb()): UserAccount {
  const editing = Boolean(payload.id);
  const existing = editing
    ? (db.prepare('SELECT * FROM users WHERE id = ?').get(String(payload.id)) as unknown as UserRow | undefined)
    : undefined;
  if (editing && !existing) throw new Error('Usuário não encontrado.');

  const username = requireCpf(payload.cpf ?? payload.username);
  const name = String(payload.name ?? '').trim().slice(0, 80);
  if (payload.role !== 'ops' && payload.role !== 'tech') throw new Error('Perfil de acesso inválido.');
  const role: 'ops' | 'tech' = payload.role;
  const technicianId = role === 'tech' ? String(payload.technicianId ?? '').trim() || null : null;
  const password = String(payload.password ?? '').trim();

  if (!name) throw new Error('Informe o nome do usuário.');
  if (role === 'tech' && !technicianId) {
    throw new Error('Vincule este usuário a um técnico cadastrado.');
  }

  assertCpfAvailable(username, companyIdForDatabase(db) || 'root', existing?.id || '');
  const dup = db
    .prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?')
    .get(username, existing ? existing.id : '') as { id: string } | undefined;
  if (dup) throw new Error('Este CPF ou login já possui um cadastro.');

  if (editing && existing) {
    if (existing.role === 'ops' && role !== 'ops' && (db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='ops'").get() as {n:number}).n <= 1) throw new Error('Mantenha pelo menos um administrador da empresa.');
    const nextHash = password ? hashPassword(password) : existing.password_hash;
    if (password && password.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
    db.prepare(`
      UPDATE users SET username = ?, name = ?, password_hash = ?, role = ?, technician_id = ?
      WHERE id = ?
    `).run(username, name, nextHash, role, technicianId, existing.id);
    if (password || username !== existing.username || role !== existing.role || technicianId !== existing.technician_id) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    const updatedRow = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id) as unknown as UserRow;
    return cleanUser(updatedRow)!;
  }

  if (!password || password.length < 8) {
    throw new Error('Informe uma senha com pelo menos 8 caracteres.');
  }
  const id = 'u-' + crypto.randomBytes(6).toString('hex');
  const now = Date.now();
  db.prepare(`
    INSERT INTO users (id, username, name, password_hash, role, technician_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, username, name, hashPassword(password), role, technicianId, now);
  const createdRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow;
  return cleanUser(createdRow)!;
}

export function syncTechnicianUser(
  technician: Technician,
  username: unknown,
  password: unknown,
  db = getDb()
): UserAccount | null {
  const cleanUsername = String(username ?? '').trim() ? requireCpf(username) : '';
  const cleanPassword = String(password ?? '').trim();
  const existing = db.prepare('SELECT * FROM users WHERE technician_id = ?').get(technician.id) as UserRow | undefined;

  if (!cleanUsername) {
    return existing ? cleanUser(existing) : null;
  }

  if (existing) {
    return saveUser(
      {
        id: existing.id,
        username: cleanUsername,
        name: technician.name,
        password: cleanPassword,
        role: 'tech',
        technicianId: technician.id,
      },
      db
    );
  }

  if (cleanPassword.length < 4) throw new Error('Informe uma senha de pelo menos 8 caracteres para criar o acesso do técnico.');

  return saveUser(
    {
      username: cleanUsername,
      name: technician.name,
      password: cleanPassword,
      role: 'tech',
      technicianId: technician.id,
    },
    db
  );
}

export function deleteUser(id: string, activeUserId: string, db = getDb()): boolean {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(String(id)) as UserRow | undefined;
  if (!existing) throw new Error('Usuário não encontrado.');
  if (db === getDb() && existing.id === (process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin')) throw new Error('A conta do administrador geral é protegida.');
  if (existing.id === activeUserId) {
    throw new Error('Você não pode excluir o seu próprio usuário em uso.');
  }
  if (existing.role === 'ops') {
    const opsCount = (db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE role = 'ops'").get() as { cnt: number }).cnt;
    if (opsCount <= 1) throw new Error('O sistema precisa manter pelo menos um usuário de Operação.');
  }
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
  return true;
}

export function stateForUser(state: GridStockState, user: UserAccount): GridStockState {
  if (user.role === 'ops') return state;
  const movements = state.movements.filter(m => m.technician === user.technicianId);
  const locations = new Set([...state.warehouses.map(w => w.id), user.technicianId]);
  return {
    ...state,
    technicians: state.technicians.filter(t => t.id === user.technicianId),
    stock: Object.fromEntries(Object.entries(state.stock).filter(([id]) => locations.has(id))),
    movements,
    used: movements.filter(m => m.kind === 'use').reduce((sum, m) => sum + (m.qty || 0), 0),
  };
}
