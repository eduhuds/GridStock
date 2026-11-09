'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const G = require('../dist/domain.js');

try {
  const envFile = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFile);
  }
} catch {}

function hashPassword(password) {
  if (String(password).length > 256) throw new Error('A senha deve ter no máximo 256 caracteres.');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (String(password).length > 256) return false;
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function cleanUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    technicianId: row.technician_id || null,
    createdAt: row.created_at
  };
}

function createDatabase(dbPath) {
  const resolved = dbPath || process.env.GRIDSTOCK_DB || path.join(__dirname, '..', 'data', 'gridstock.db');
  if (resolved !== ':memory:') {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
  }
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

  // Ensure default admin exists
  const userCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
  const adminUser = process.env.GRIDSTOCK_ADMIN_USERNAME;
  const adminPass = process.env.GRIDSTOCK_ADMIN_PASSWORD;
  const adminName = process.env.GRIDSTOCK_ADMIN_NAME || 'Controle Operacional';
  const adminId = process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin';
  if (userCount === 0 && adminUser && adminPass) {
    const now = Date.now();
    db.prepare(`
      INSERT INTO users (id, username, name, password_hash, role, technician_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(adminId, adminUser, adminName, hashPassword(adminPass), 'ops', null, now);
  }

  // Ensure initial state metadata exists (clean database by default)
  const metaVersion = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('version');
  if (!metaVersion) {
    const initialMode = process.env.GRIDSTOCK_INITIAL_MODE === 'seed' ? G.seed() : G.emptyState();
    saveState(db, initialMode);
  }

  return db;
}

function loadState(db) {
  const metaRows = db.prepare('SELECT key, value FROM app_meta').all();
  const meta = Object.fromEntries(metaRows.map(r => [r.key, JSON.parse(r.value)]));

  const warehouses = db.prepare('SELECT * FROM warehouses ORDER BY sort_order ASC').all().map(w => ({
    id: w.id,
    code: w.code,
    name: w.name,
    city: w.city,
    responsible: w.responsible,
    address: w.address
  }));

  const parts = db.prepare('SELECT * FROM products ORDER BY sort_order ASC').all().map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    unit: p.unit,
    min: p.min,
    baseMin: p.base_min
  }));

  const technicians = db.prepare('SELECT * FROM technicians ORDER BY sort_order ASC').all().map(t => ({
    id: t.id,
    name: t.name,
    initials: t.initials,
    color: t.color,
    vehicle: t.vehicle,
    region: t.region,
    status: t.status,
    order: t.order_code,
    client: t.client,
    address: t.address,
    checkedAt: t.checked_at
  }));

  const locations = {};
  for (const w of warehouses) {
    locations[w.id] = {};
  }
  const locRows = db.prepare('SELECT * FROM product_locations').all();
  for (const r of locRows) {
    if (!locations[r.warehouse_id]) locations[r.warehouse_id] = {};
    locations[r.warehouse_id][r.product_id] = { corridor: r.corridor, shelf: r.shelf };
  }

  const stock = {};
  for (const w of warehouses) {
    stock[w.id] = Object.fromEntries(parts.map(p => [p.id, 0]));
  }
  for (const t of technicians) {
    stock[t.id] = Object.fromEntries(parts.map(p => [p.id, 0]));
  }
  const stockRows = db.prepare('SELECT * FROM stock_balances').all();
  for (const r of stockRows) {
    if (!stock[r.location_id]) stock[r.location_id] = {};
    stock[r.location_id][r.product_id] = r.qty;
  }

  const movements = db.prepare('SELECT * FROM movements ORDER BY ts DESC, seq_num DESC').all().map(m => {
    const ev = { id: m.id, kind: m.kind, ts: m.ts };
    if (m.technician_id !== null) ev.technician = m.technician_id;
    if (m.part_id !== null) ev.part = m.part_id;
    if (m.qty !== null) ev.qty = m.qty;
    if (m.warehouse_id !== null) ev.warehouse = m.warehouse_id;
    if (m.from_id !== null) ev.from = m.from_id;
    if (m.to_id !== null) ev.to = m.to_id;
    if (m.from_address) ev.fromAddress = JSON.parse(m.from_address);
    if (m.to_address) ev.toAddress = JSON.parse(m.to_address);
    if (m.order_code !== null) ev.order = m.order_code;
    if (m.placement !== null) ev.placement = m.placement;
    if (m.note !== null) ev.note = m.note;
    if (m.operator !== null) ev.operator = m.operator;
    if (m.before_qty !== null) ev.before = m.before_qty;
    if (m.delta !== null) ev.delta = m.delta;
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
    updatedAt: meta.updatedAt ?? Date.now()
  };
}

function saveState(db, s) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const setMeta = db.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)');
    for (const key of ['version', 'used', 'seq', 'warehouseSeq', 'productSeq', 'techSeq', 'demo', 'updatedAt']) {
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
      const seqNum = numMatch ? Number(numMatch[1]) : (s.movements.length - idx);
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

function authenticate(db, username, password) {
  const u = String(username ?? '').trim().toLowerCase();
  const p = String(password ?? '');
  if (!u || !p) throw Error('Informe usuário e senha.');
  const row = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(u);
  if (!row || !verifyPassword(p, row.password_hash)) {
    throw Error('Usuário ou senha inválidos.');
  }
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + 12 * 60 * 60 * 1000; // 30 days
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    row.id,
    now,
    expiresAt
  );
  return { token, user: cleanUser(row) };
}

function getUserByToken(db, token) {
  if (!token) return null;
  const now = Date.now();
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(String(token));
  if (!session) return null;
  if (session.expires_at < now) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(String(token));
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  return cleanUser(user);
}

function logoutToken(db, token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(String(token));
}

function listUsers(db) {
  return db.prepare('SELECT * FROM users ORDER BY created_at ASC').all().map(cleanUser);
}

function saveUser(db, payload) {
  const editing = Boolean(payload.id);
  const existing = editing ? db.prepare('SELECT * FROM users WHERE id = ?').get(String(payload.id)) : null;
  if (editing && !existing) throw Error('Usuário não encontrado.');

  const username = String(payload.username ?? '').trim().toLowerCase().slice(0, 50);
  const name = String(payload.name ?? '').trim().slice(0, 80);
  const role = payload.role === 'tech' ? 'tech' : 'ops';
  const technicianId = role === 'tech' ? String(payload.technicianId ?? '').trim() || null : null;
  const password = String(payload.password ?? '').trim();

  if (!username || !/^[a-z0-9._@-]{3,50}$/.test(username)) {
    throw Error('O login deve ter de 3 a 50 caracteres (letras, números, ponto, hífen ou @).');
  }
  if (!name) throw Error('Informe o nome do usuário.');
  if (role === 'tech' && !technicianId) {
    throw Error('Vincule este usuário a um técnico cadastrado.');
  }

  const dup = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?').get(username, existing ? existing.id : '');
  if (dup) throw Error('Já existe um usuário com este login.');

  if (editing) {
    const nextHash = password ? hashPassword(password) : existing.password_hash;
    if (password && password.length < 8) throw Error('A senha deve ter pelo menos 8 caracteres.');
    db.prepare(`
      UPDATE users SET username = ?, name = ?, password_hash = ?, role = ?, technician_id = ?
      WHERE id = ?
    `).run(username, name, nextHash, role, technicianId, existing.id);
    return cleanUser(db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id));
  }

  if (!password || password.length < 8) {
    throw Error('Informe uma senha com pelo menos 8 caracteres.');
  }
  const id = 'u-' + crypto.randomBytes(6).toString('hex');
  const now = Date.now();
  db.prepare(`
    INSERT INTO users (id, username, name, password_hash, role, technician_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, username, name, hashPassword(password), role, technicianId, now);
  return cleanUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
}

function syncTechnicianUser(db, technician, username, password) {
  const cleanUsername = String(username ?? '').trim().toLowerCase();
  const cleanPassword = String(password ?? '').trim();
  const existing = db.prepare('SELECT * FROM users WHERE technician_id = ?').get(technician.id);

  if (!cleanUsername) {
    return existing ? cleanUser(existing) : null;
  }

  if (existing) {
    return saveUser(db, {
      id: existing.id,
      username: cleanUsername,
      name: technician.name,
      password: cleanPassword,
      role: 'tech',
      technicianId: technician.id
    });
  }

  return saveUser(db, {
    username: cleanUsername,
    name: technician.name,
    password: cleanPassword || process.env.GRIDSTOCK_SEED_TECH_PASSWORD,
    role: 'tech',
    technicianId: technician.id
  });
}

function deleteUser(db, id, activeUserId) {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(String(id));
  if (!existing) throw Error('Usuário não encontrado.');
  if (existing.id === activeUserId) {
    throw Error('Você não pode excluir o seu próprio usuário em uso.');
  }
  if (existing.role === 'ops') {
    const opsCount = db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE role = 'ops'").get().cnt;
    if (opsCount <= 1) throw Error('O sistema precisa manter pelo menos um usuário de Operação.');
  }
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
  return true;
}

module.exports = {
  createDatabase,
  loadState,
  saveState,
  authenticate,
  getUserByToken,
  logoutToken,
  listUsers,
  saveUser,
  syncTechnicianUser,
  deleteUser,
  hashPassword,
  verifyPassword
};

