'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../dist/domain.js');
const {
  createDatabase,
  loadState,
  saveState,
  authenticate,
  getUserByToken,
  logoutToken,
  listUsers,
  saveUser,
  syncTechnicianUser,
  deleteUser
} = require('./db.js');

const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Requisição excedeu o tamanho máximo permitido.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Formato JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

function extractToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

function createApp({ dbPath } = {}) {
  if (dbPath !== ':memory:') throw new Error('Servidor legado disponível apenas para testes em memória.');
  const db = createDatabase(dbPath);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method.toUpperCase();

      if (pathname.startsWith('/api/')) {
        if (method === 'POST' && pathname === '/api/auth/login') {
          const body = await readBody(req);
          const { token, user } = authenticate(db, body.username, body.password);
          const state = loadState(db);
          const users = user.role === 'ops' ? listUsers(db) : [];
          return sendJson(res, 200, { token, user, state, users });
        }

        const token = extractToken(req);
        const user = getUserByToken(db, token);

        if (method === 'POST' && pathname === '/api/auth/logout') {
          logoutToken(db, token);
          return sendJson(res, 200, { ok: true });
        }

        if (!user) {
          return sendJson(res, 401, { error: 'Sessão expirada ou não autenticada. Faça login novamente.' });
        }

        if (method === 'GET' && pathname === '/api/bootstrap') {
          const state = loadState(db);
          const users = user.role === 'ops' ? listUsers(db) : [];
          return sendJson(res, 200, { user, state, users });
        }

        if (method === 'POST' && pathname === '/api/movements') {
          const body = await readBody(req);
          const state = loadState(db);
          if (user.role === 'tech') {
            if (['transfer', 'entry'].includes(body.kind)) {
              return sendJson(res, 403, { error: 'Apenas o Controle Operacional pode realizar esta operação.' });
            }
            body.technician = user.technicianId;
          }
          body.operator = user.name;
          const movement = G.apply(state, body);
          saveState(db, state);
          return sendJson(res, 200, { movement, state });
        }

        // Operations below require 'ops' role
        if (user.role !== 'ops') {
          return sendJson(res, 403, { error: 'Acesso restrito ao Controle Operacional.' });
        }

        if (method === 'POST' && pathname === '/api/warehouses') {
          const body = await readBody(req);
          const state = loadState(db);
          const warehouse = G.saveWarehouse(state, body);
          saveState(db, state);
          return sendJson(res, 200, { warehouse, state });
        }

        if (method === 'DELETE' && pathname.startsWith('/api/warehouses/')) {
          const id = decodeURIComponent(pathname.slice('/api/warehouses/'.length));
          const state = loadState(db);
          G.deleteWarehouse(state, id);
          saveState(db, state);
          return sendJson(res, 200, { state });
        }

        if (method === 'POST' && pathname === '/api/products') {
          const body = await readBody(req);
          const state = loadState(db);
          body.operator = user.name;
          const product = G.saveProduct(state, body);
          saveState(db, state);
          return sendJson(res, 200, { product, state });
        }

        if (method === 'DELETE' && pathname.startsWith('/api/products/')) {
          const id = decodeURIComponent(pathname.slice('/api/products/'.length));
          const state = loadState(db);
          G.deleteProduct(state, id);
          saveState(db, state);
          return sendJson(res, 200, { state });
        }

        if (method === 'POST' && pathname === '/api/technicians') {
          const body = await readBody(req);
          const state = loadState(db);
          const technician = G.saveTechnician(state, body);
          if (body.username !== undefined) {
            syncTechnicianUser(db, technician, body.username, body.password);
          }
          saveState(db, state);
          return sendJson(res, 200, { technician, state, users: listUsers(db) });
        }

        if (method === 'DELETE' && pathname.startsWith('/api/technicians/')) {
          const id = decodeURIComponent(pathname.slice('/api/technicians/'.length));
          const state = loadState(db);
          G.deleteTechnician(state, id);
          const linkedUser = db.prepare('SELECT id FROM users WHERE technician_id = ?').get(id);
          if (linkedUser) {
            db.prepare('DELETE FROM sessions WHERE user_id = ?').run(linkedUser.id);
            db.prepare('DELETE FROM users WHERE id = ?').run(linkedUser.id);
          }
          saveState(db, state);
          return sendJson(res, 200, { state, users: listUsers(db) });
        }

        if (method === 'POST' && pathname === '/api/users') {
          const body = await readBody(req);
          const savedUser = saveUser(db, body);
          return sendJson(res, 200, { user: savedUser, users: listUsers(db) });
        }

        if (method === 'DELETE' && pathname.startsWith('/api/users/')) {
          const id = decodeURIComponent(pathname.slice('/api/users/'.length));
          deleteUser(db, id, user.id);
          return sendJson(res, 200, { users: listUsers(db) });
        }

        if (method === 'POST' && pathname === '/api/system/reset') {
          const body = await readBody(req);
          const nextState = body.mode === 'seed' ? G.seed() : G.emptyState();
          saveState(db, nextState);
          if (body.mode === 'empty') {
            const techUsers = db.prepare("SELECT id FROM users WHERE role = 'tech'").all();
            for (const tu of techUsers) {
              db.prepare('DELETE FROM sessions WHERE user_id = ?').run(tu.id);
            }
            db.exec("DELETE FROM users WHERE role = 'tech'");
          } else if (body.mode === 'seed' && process.env.GRIDSTOCK_SEED_TECH_PASSWORD) {
            for (const t of nextState.technicians) {
              const login = t.name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              try {
                syncTechnicianUser(db, t, login, process.env.GRIDSTOCK_SEED_TECH_PASSWORD);
              } catch {}
            }
          }
          return sendJson(res, 200, { state: loadState(db), users: listUsers(db) });
        }

        return sendJson(res, 404, { error: 'Rota da API não encontrada.' });
      }

      // Serve static files from dist/
      const cleanPath = pathname === '/' ? '/index.html' : pathname;
      const filePath = path.resolve(DIST_DIR, '.' + cleanPath);
      if (!filePath.startsWith(DIST_DIR + path.sep)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Arquivo não encontrado');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      sendJson(res, 400, { error: err.message || 'Erro interno ao processar a solicitação.' });
    }
  });

  return { server, db };
}

if (require.main === module) {
  throw new Error('Servidor legado desativado. Use npm run dev ou npm start para iniciar a aplicação atual.');
  const port = Number(process.env.PORT) || 8080;
  const { server } = createApp();
  server.listen(port, () => {
    console.log(`GridStock em execução em http://localhost:${port}`);
  });
}

module.exports = { createApp };

