import fs from 'node:fs';
import path from 'node:path';
import {
  isCompanyDatabase,
  companyIdForDatabase,
  listCompanies,
  exportPlatformRegistry,
  importPlatformRegistry,
  exportCompanySnapshot,
  importCompanySnapshot,
  type PlatformRegistrySnapshot,
  type CompanyDbSnapshot,
} from './companies';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseSync } from 'node:sqlite';
import { ensureSchemaMigrations } from './db';

const PLATFORM_REGISTRY_KEY = '__platform_registry__';
const COMPANY_DB_PREFIX = '__company_db__:';

const TABLES = [
  'users',
  'sessions',
  'app_meta',
  'warehouses',
  'products',
  'technicians',
  'product_locations',
  'stock_balances',
  'movements',
] as const;

let cachedClient: SupabaseClient | null = null;
let initialSyncDone = false;
let lastPlatformPullAt = 0;
let productsHasExtendedColumns: boolean | null = null;
let movementsHasExtendedColumns: boolean | null = null;
const PLATFORM_PULL_TTL_MS = 10_000;

function reloadDotEnvIfMissing() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (k && v && (!process.env[k] || (k === 'GRIDSTOCK_ADMIN_USERNAME' && process.env[k] === 'admin'))) {
        process.env[k] = v;
      }
    }
  } catch {}
}

function isNetworkUnavailableError(err: unknown): boolean {
  const msg = String((err as { message?: string; details?: string })?.message || '') +
    ' ' +
    String((err as { details?: string })?.details || '') +
    ' ' +
    String(err || '');
  return /fetch failed|EAI_AGAIN|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|UND_ERR_CONNECT_TIMEOUT/i.test(msg);
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (process.env.GRIDSTOCK_DB === ':memory:' || process.env.GRIDSTOCK_STORAGE_MODE === 'local') return null;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
    reloadDotEnvIfMissing();
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url) return null;
  if (!key) throw new Error('Configure a chave secreta do Supabase no servidor.');
  if (!cachedClient) {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

/**
 * Push platform registry (companies, master_account, master_sessions, platform_audit)
 * and one or all company databases to Supabase app_meta.
 */
export async function pushPlatformToSupabase(companyId?: string, { registryOnly = false }: { registryOnly?: boolean } = {}): Promise<boolean> {
  const sb = getSupabaseAdminClient();
  if (!sb) return false;
  try {
    const registryPayload = exportPlatformRegistry();
    const rows: { key: string; value: string }[] = [
      { key: PLATFORM_REGISTRY_KEY, value: JSON.stringify(registryPayload) },
    ];
    const ids = registryOnly ? [] : companyId ? [companyId] : listCompanies().map(c => c.id);
    for (const id of ids) {
      const snap = exportCompanySnapshot(id);
      if (snap) {
        rows.push({ key: `${COMPANY_DB_PREFIX}${id}`, value: JSON.stringify(snap) });
      }
    }
    const { error } = await sb.from('app_meta').upsert(rows, { onConflict: 'key' }).throwOnError();
    if (error) throw error;
    lastPlatformPullAt = Date.now();
    return true;
  } catch {
    lastPlatformPullAt = Date.now();
    return false;
  }
}

export async function deleteCompanyFromSupabase(companyId: string): Promise<void> {
  const sb = getSupabaseAdminClient();
  if (!sb) return;
  try {
    await sb.from('app_meta').delete().eq('key', `${COMPANY_DB_PREFIX}${companyId}`).throwOnError();
    await pushPlatformToSupabase();
  } catch {}
}

/**
 * Pull platform registry and all company databases from Supabase app_meta into local SQLite.
 */
export async function pullPlatformFromSupabase(force = false): Promise<void> {
  const sb = getSupabaseAdminClient();
  if (!sb) return;
  const now = Date.now();
  if (!force && lastPlatformPullAt > 0 && now - lastPlatformPullAt < PLATFORM_PULL_TTL_MS) {
    return;
  }
  try {
    const { data, error } = await sb
      .from('app_meta')
      .select('key, value')
      .or(`key.eq.${PLATFORM_REGISTRY_KEY},key.like.${COMPANY_DB_PREFIX}%`);
    if (error) {
      if (!process.env.VERCEL && isNetworkUnavailableError(error)) {
        lastPlatformPullAt = Date.now();
        return;
      }
      throw new Error('Falha ao consultar o banco remoto.');
    }
    if (data && data.length > 0) {
      const regRow = data.find(r => r.key === PLATFORM_REGISTRY_KEY);
      if (regRow?.value) {
        try {
          const parsed = JSON.parse(String(regRow.value)) as PlatformRegistrySnapshot;
          importPlatformRegistry(parsed);
        } catch {}
      }

      for (const row of data) {
        if (String(row.key).startsWith(COMPANY_DB_PREFIX) && row.value) {
          try {
            const companyId = String(row.key).slice(COMPANY_DB_PREFIX.length);
            const snap = JSON.parse(String(row.value)) as CompanyDbSnapshot;
            importCompanySnapshot(companyId, snap);
          } catch {}
        }
      }
    }

    const regSnap = exportPlatformRegistry();
    const envAdminUser = (process.env.GRIDSTOCK_ADMIN_USERNAME || '').trim();
    if (!regSnap.masterAccount) {
      const { data: usersData } = await sb.from('users').select('*');
      if (usersData && usersData.length > 0) {
        const owner =
          usersData.find(u => String(u.id) === (process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin'));
        if (owner) {
          importPlatformRegistry({
            masterAccount: {
              username: owner.username === 'admin' && envAdminUser ? envAdminUser : owner.username,
              password_hash: owner.password_hash,
            },
          });
        }
      }
    } else if (regSnap.masterAccount.username === 'admin' && envAdminUser && envAdminUser !== 'admin') {
      importPlatformRegistry({
        masterAccount: {
          username: envAdminUser,
          password_hash: regSnap.masterAccount.password_hash,
        },
      });
    }
    lastPlatformPullAt = Date.now();
  } catch {
    // Keep local SQLite cache authoritative if remote platform registry cannot be fetched
    lastPlatformPullAt = Date.now();
  }
}

/**
 * Push all current SQLite tables to Supabase Postgres in parallel.
 * Safe no-op if Supabase is not configured or schema.sql has not been applied yet.
 */
export async function pushAllToSupabase(db: DatabaseSync): Promise<boolean> {
  ensureSchemaMigrations(db);
  if (isCompanyDatabase(db)) {
    const cid = companyIdForDatabase(db);
    return pushPlatformToSupabase(cid || undefined);
  }
  const sb = getSupabaseAdminClient();
  if (!sb) return false;

  try {
    const users = db.prepare('SELECT * FROM users').all() as Record<string, unknown>[];
    const sessions = db.prepare('SELECT * FROM sessions').all() as Record<string, unknown>[];
    const meta = db.prepare('SELECT * FROM app_meta').all() as Record<string, unknown>[];
    const warehouses = db.prepare('SELECT * FROM warehouses').all() as Record<string, unknown>[];
    const products = db.prepare('SELECT * FROM products').all() as Record<string, unknown>[];
    const technicians = db.prepare('SELECT * FROM technicians').all() as Record<string, unknown>[];
    const locations = db.prepare('SELECT * FROM product_locations').all() as Record<string, unknown>[];
    const balances = db.prepare('SELECT * FROM stock_balances').all() as Record<string, unknown>[];
    const movements = db.prepare('SELECT * FROM movements').all() as Record<string, unknown>[];

    const registryPayload = exportPlatformRegistry();
    const metaRows: Record<string, unknown>[] = [
      ...meta,
      { key: PLATFORM_REGISTRY_KEY, value: JSON.stringify(registryPayload) },
    ];

    const syncUsersTask = (async () => {
      if (users.length > 0) {
        await sb.from('users').upsert(users, { onConflict: 'id' }).throwOnError();
      }
      const remoteUsers = await sb.from('users').select('id').throwOnError();
      if (remoteUsers.data) {
        const localUserIds = new Set(users.map(u => String(u.id)));
        const toDelete = remoteUsers.data.map(u => String(u.id)).filter(id => !localUserIds.has(id));
        if (toDelete.length > 0) {
          await sb.from('users').delete().in('id', toDelete).throwOnError();
        }
      }
    })();

    await syncUsersTask;

    const syncSessionsTask = (async () => {
      if (sessions.length > 0) {
        await sb.from('sessions').upsert(sessions, { onConflict: 'token' }).throwOnError();
      }
      const remoteSessions = await sb.from('sessions').select('token').throwOnError();
      if (remoteSessions.error) throw remoteSessions.error;
      const localTokens = new Set(sessions.map(s => String(s.token)));
      const revoked = (remoteSessions.data || []).map(s => String(s.token)).filter(t => !localTokens.has(t));
      if (revoked.length) {
        const result = await sb.from('sessions').delete().in('token', revoked).throwOnError();
        if (result.error) throw result.error;
      }
    })();

    const syncMetaTask = (async () => {
      if (metaRows.length > 0) {
        await sb.from('app_meta').upsert(metaRows, { onConflict: 'key' }).throwOnError();
      }
    })();

    const syncWarehousesTask = (async () => {
      await sb.from('warehouses').delete().neq('id', '__never__').throwOnError();
      if (warehouses.length > 0) {
        await sb.from('warehouses').insert(warehouses).throwOnError();
      }
    })();

    const syncProductsTask = (async () => {
      await sb.from('products').delete().neq('id', '__never__').throwOnError();
      if (products.length > 0) {
        if (productsHasExtendedColumns === false) {
          const legacyProducts = products.map(({ unit_cost: _uc, supplier: _sp, ...rest }) => rest);
          await sb.from('products').insert(legacyProducts).throwOnError();
        } else {
          try {
            await sb.from('products').insert(products).throwOnError();
            productsHasExtendedColumns = true;
          } catch {
            productsHasExtendedColumns = false;
            const legacyProducts = products.map(({ unit_cost: _uc, supplier: _sp, ...rest }) => rest);
            await sb.from('products').insert(legacyProducts).throwOnError();
          }
        }
      }
    })();

    const syncTechniciansTask = (async () => {
      await sb.from('technicians').delete().neq('id', '__never__').throwOnError();
      if (technicians.length > 0) {
        await sb.from('technicians').insert(technicians).throwOnError();
      }
    })();

    const syncLocationsTask = (async () => {
      await sb.from('product_locations').delete().neq('warehouse_id', '__never__').throwOnError();
      if (locations.length > 0) {
        await sb.from('product_locations').insert(locations).throwOnError();
      }
    })();

    const syncBalancesTask = (async () => {
      await sb.from('stock_balances').delete().neq('location_id', '__never__').throwOnError();
      if (balances.length > 0) {
        await sb.from('stock_balances').insert(balances).throwOnError();
      }
    })();

    const syncMovementsTask = (async () => {
      await sb.from('movements').delete().neq('id', '__never__').throwOnError();
      if (movements.length > 0) {
        if (movementsHasExtendedColumns === false) {
          const legacyMovements = movements.map(({ serial: _sr, photo: _ph, ...rest }) => rest);
          await sb.from('movements').insert(legacyMovements).throwOnError();
        } else {
          try {
            await sb.from('movements').insert(movements).throwOnError();
            movementsHasExtendedColumns = true;
          } catch {
            movementsHasExtendedColumns = false;
            const legacyMovements = movements.map(({ serial: _sr, photo: _ph, ...rest }) => rest);
            await sb.from('movements').insert(legacyMovements).throwOnError();
          }
        }
      }
    })();

    await Promise.all([
      syncSessionsTask,
      syncMetaTask,
      syncWarehousesTask,
      syncProductsTask,
      syncTechniciansTask,
      syncLocationsTask,
      syncBalancesTask,
      syncMovementsTask,
    ]);

    lastPlatformPullAt = Date.now();
    return true;
  } catch {
    lastPlatformPullAt = Date.now();
    return false;
  }
}

/**
 * Pull state & users from Supabase Postgres into local SQLite cache on cold start,
 * or push local seed/empty state to Supabase if Supabase tables are newly created and empty.
 */
export async function ensureSupabaseSynced(db: DatabaseSync, forcePull = false): Promise<void> {
  ensureSchemaMigrations(db);
  await pullPlatformFromSupabase(forcePull);
  if (isCompanyDatabase(db)) return;
  if (initialSyncDone && !forcePull) return;
  const sb = getSupabaseAdminClient();
  if (!sb) return;

  try {
    const { data: metaRows, error: metaErr } = await sb.from('app_meta').select('key, value').throwOnError();
    if (metaErr || !metaRows) {
      throw new Error('Banco remoto indisponível.');
    }


    const coreMetaRows = metaRows.filter(
      m => m.key !== PLATFORM_REGISTRY_KEY && !String(m.key).startsWith(COMPANY_DB_PREFIX)
    );

    // If Supabase tables exist but are empty, push our local SQLite data up to Supabase!
    if (coreMetaRows.length === 0) {
      await pushAllToSupabase(db);
      initialSyncDone = true;
      return;
    }

    // Otherwise, pull all tables from Supabase into local SQLite
    const [
      usersRes,
      sessionsRes,
      warehousesRes,
      productsRes,
      techsRes,
      locsRes,
      balancesRes,
      movementsRes,
    ] = await Promise.all([
      sb.from('users').select('*').throwOnError(),
      sb.from('sessions').select('*').throwOnError(),
      sb.from('warehouses').select('*').order('sort_order', { ascending: true }).throwOnError(),
      sb.from('products').select('*').order('sort_order', { ascending: true }).throwOnError(),
      sb.from('technicians').select('*').order('sort_order', { ascending: true }).throwOnError(),
      sb.from('product_locations').select('*').throwOnError(),
      sb.from('stock_balances').select('*').throwOnError(),
      sb.from('movements').select('*').order('ts', { ascending: false }).throwOnError(),
    ]);

    db.exec('BEGIN IMMEDIATE');
    try {
      if (usersRes.data && usersRes.data.length > 0) {
        db.exec('DELETE FROM users');
        const insUser = db.prepare(`
          INSERT INTO users (id, username, name, password_hash, role, technician_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const masterUserId = process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin';
        const envAdminUser = (process.env.GRIDSTOCK_ADMIN_USERNAME || '').trim();
        for (const u of usersRes.data) {
          const uname =
            String(u.id) === masterUserId && String(u.username) === 'admin' && envAdminUser
              ? envAdminUser
              : String(u.username);
          insUser.run(
            String(u.id),
            uname,
            String(u.name),
            String(u.password_hash),
            String(u.role),
            u.technician_id ? String(u.technician_id) : null,
            Number(u.created_at)
          );
        }
      }

      if (sessionsRes.data) {
        db.exec('DELETE FROM sessions');
        const insSession = db.prepare(`
          INSERT INTO sessions (token, user_id, created_at, expires_at)
          VALUES (?, ?, ?, ?)
        `);
        for (const s of sessionsRes.data) {
          insSession.run(String(s.token), String(s.user_id), Number(s.created_at), Number(s.expires_at));
        }
      }

      db.exec('DELETE FROM app_meta');
      const insMeta = db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)');
      for (const m of coreMetaRows) {
        insMeta.run(String(m.key), String(m.value));
      }

      if (warehousesRes.data) {
        db.exec('DELETE FROM warehouses');
        const insW = db.prepare(`
          INSERT INTO warehouses (id, code, name, city, responsible, address, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const w of warehousesRes.data) {
          insW.run(
            String(w.id),
            String(w.code),
            String(w.name),
            String(w.city),
            String(w.responsible),
            String(w.address || ''),
            Number(w.sort_order ?? 0)
          );
        }
      }

      if (productsRes.data) {
        db.exec('DELETE FROM products');
        const insP = db.prepare(`
          INSERT INTO products (id, sku, name, category, unit, min, base_min, unit_cost, supplier, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of productsRes.data) {
          insP.run(
            String(p.id),
            String(p.sku),
            String(p.name),
            String(p.category),
            String(p.unit || 'un.'),
            Number(p.min ?? 0),
            Number(p.base_min ?? 0),
            Number(p.unit_cost ?? 0),
            String(p.supplier || ''),
            Number(p.sort_order ?? 0)
          );
        }
      }

      if (techsRes.data) {
        db.exec('DELETE FROM technicians');
        const insT = db.prepare(`
          INSERT INTO technicians (id, name, initials, color, vehicle, region, status, order_code, client, address, checked_at, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const t of techsRes.data) {
          insT.run(
            String(t.id),
            String(t.name),
            String(t.initials),
            String(t.color || 'mint'),
            String(t.vehicle),
            String(t.region),
            String(t.status || 'available'),
            String(t.order_code || ''),
            String(t.client || ''),
            String(t.address || ''),
            t.checked_at !== null && t.checked_at !== undefined ? Number(t.checked_at) : null,
            Number(t.sort_order ?? 0)
          );
        }
      }

      if (locsRes.data) {
        db.exec('DELETE FROM product_locations');
        const insL = db.prepare(`
          INSERT INTO product_locations (warehouse_id, product_id, corridor, shelf)
          VALUES (?, ?, ?, ?)
        `);
        for (const l of locsRes.data) {
          insL.run(String(l.warehouse_id), String(l.product_id), String(l.corridor), String(l.shelf));
        }
      }

      if (balancesRes.data) {
        db.exec('DELETE FROM stock_balances');
        const insB = db.prepare(`
          INSERT INTO stock_balances (location_id, product_id, qty)
          VALUES (?, ?, ?)
        `);
        for (const b of balancesRes.data) {
          insB.run(String(b.location_id), String(b.product_id), Number(b.qty ?? 0));
        }
      }

      if (movementsRes.data) {
        db.exec('DELETE FROM movements');
        const insM = db.prepare(`
          INSERT INTO movements (
            id, seq_num, kind, technician_id, part_id, qty, warehouse_id,
            from_id, to_id, from_address, to_address, order_code, placement,
            note, operator, before_qty, delta, serial, photo, ts
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of movementsRes.data) {
          insM.run(
            String(m.id),
            Number(m.seq_num ?? 0),
            String(m.kind),
            m.technician_id ?? null,
            m.part_id ?? null,
            m.qty ?? null,
            m.warehouse_id ?? null,
            m.from_id ?? null,
            m.to_id ?? null,
            m.from_address ?? null,
            m.to_address ?? null,
            m.order_code ?? null,
            m.placement ?? null,
            m.note ?? null,
            m.operator ?? null,
            m.before_qty ?? null,
            m.delta ?? null,
            m.serial ?? null,
            m.photo ?? null,
            Number(m.ts)
          );
        }
      }

      db.exec('COMMIT');
      initialSyncDone = true;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  } catch {
    initialSyncDone = true;
    return;
  }
}

export { TABLES };

