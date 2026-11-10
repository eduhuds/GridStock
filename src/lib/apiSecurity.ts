import crypto from 'node:crypto';
import { getDb } from './db';

const MAX_BODY = 1024 * 1024;
const state = globalThis as unknown as { gridstockQueue?: Promise<void>; gridstockPending?: number };

function cookieName(master: boolean, company: string) {
  return master ? 'gridstock_master_session' : `gridstock_session_${crypto.createHash('sha256').update(company).digest('hex').slice(0, 24)}`;
}
function cookieValue(req: Request, name: string) {
  const value = (req.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1) || '';
  return /^[A-Za-z0-9_-]{40,100}$/.test(value) ? value : '';
}

export async function boundedJsonBody(req: Request): Promise<string | undefined> {
  if (!req.body) return undefined;
  if (Number(req.headers.get('content-length') || 0) > MAX_BODY) throw new Error('size');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BODY) { await reader.cancel(); throw new Error('size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = Buffer.concat(chunks).toString('utf8');
  if (body) {
    const parsed = JSON.parse(body);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('json');
  }
  return body || undefined;
}

// Persistent counters; identifiers are hashed and proxy-supplied IP headers are not trusted.
export function allowLoginAttempt(identity: string, now = Date.now()): boolean {
  const db = getDb();
  db.exec('CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL)');
  db.prepare('DELETE FROM auth_attempts WHERE until <= ?').run(now);
  for (const [key, limit, window] of [
    ['global', 120, 60_000],
    [crypto.createHash('sha256').update(identity.slice(0, 256)).digest('hex'), 10, 15 * 60_000],
  ] as const) {
    const row = db.prepare('SELECT count FROM auth_attempts WHERE key=?').get(key) as {count:number} | undefined;
    if (row && row.count >= limit) return false;
    db.prepare('INSERT INTO auth_attempts VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key, now + window);
  }
  return true;
}

function protectedResponse(response: Response) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

/** Serializes the SQLite/snapshot request cycle within this server process. */
export function secureRoute<Context>(handler: (req: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context): Promise<Response> => {
    const deny = (error: string, status: number) => protectedResponse(Response.json({error}, {status}));
    const url = new URL(request.url);
    const mutates = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const origin = request.headers.get('origin');
    if (mutates && ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site')) return deny('Origem da solicitação não permitida.', 403);
    let body: string | undefined;
    try { body = await boundedJsonBody(request); }
    catch { return deny('Conteúdo inválido ou maior que 1 MB.', 400); }
    if ((state.gridstockPending || 0) >= 50) return deny('Servidor ocupado. Tente novamente.', 503);
    state.gridstockPending = (state.gridstockPending || 0) + 1;
    const previous = state.gridstockQueue || Promise.resolve();
    let release!: () => void;
    state.gridstockQueue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      const hasRemotePersistence =
        process.env.GRIDSTOCK_DB !== ':memory:' &&
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
      if (process.env.VERCEL && !hasRemotePersistence) return deny('Este armazenamento exige um servidor único com disco persistente. Migre o armazenamento antes de usar múltiplas instâncias.', 503);
      const master = url.pathname.startsWith('/api/admin/');
      const scope = request.headers.get('x-gridstock-company') || '';
      if (scope.length > 40) return deny('Empresa inválida.', 400);
      const login = request.method === 'POST' && ['/api/auth/login', '/api/auth/convert-cpf', '/api/admin/login'].includes(url.pathname);
      if (login) {
        const input = JSON.parse(body || '{}');
        const identity = String(input.cpf ?? input.username ?? input.legacyUsername ?? '').replace(/[.\-\s]/g, '').toLowerCase();
        if (!allowLoginAttempt(identity)) return deny('Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.', 429);
      }
      const headers = new Headers(request.headers);
      const session = cookieValue(request, cookieName(master, scope));
      // Browser storage holds only the non-secret marker "cookie".
      if (headers.get('authorization') === 'Bearer cookie' || !headers.has('authorization')) {
        headers.delete('authorization');
        if (session) headers.set('authorization', `Bearer ${session}`);
      }
      const req = new Request(request.url, {method: request.method, headers, body});
      let response = await handler(req, context);
      if (login && response.ok) {
        const payload = await response.clone().json();
        if (typeof payload.token === 'string') {
          const token = payload.token;
          payload.token = 'cookie';
          response = Response.json(payload, {status: response.status, headers: response.headers});
          const name = cookieName(master, payload.companySlug || scope);
          response.headers.append('Set-Cookie', `${name}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=43200${url.protocol === 'https:' ? '; Secure' : ''}`);
        }
      }
      if ((url.pathname === '/api/auth/logout' && request.method === 'POST') || (url.pathname === '/api/admin/login' && request.method === 'DELETE')) {
        response.headers.append('Set-Cookie', `${cookieName(master, scope)}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${url.protocol === 'https:' ? '; Secure' : ''}`);
      }
      return protectedResponse(response);
    } catch {
      return deny('Não foi possível concluir a solicitação. Verifique a configuração do servidor.', 503);
    } finally {
      state.gridstockPending!--;
      release();
    }
  };
}
