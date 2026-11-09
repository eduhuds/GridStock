'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server/index.js');

async function withServer(fn) {
  const { server, db } = createApp({ dbPath: ':memory:' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function req(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  try {
    await fn({ req, db, baseUrl });
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
}

test('API inicia com banco limpo, exige autenticação e permite fluxo real completo', async () => {
  await withServer(async ({ req }) => {
    // 1. Sem token retorna 401
    const unauth = await req('GET', '/api/bootstrap');
    assert.equal(unauth.status, 401);

    // 2. Login como admin configurado no .env
    const login = await req('POST', '/api/auth/login', {
      username: process.env.GRIDSTOCK_ADMIN_USERNAME,
      password: process.env.GRIDSTOCK_ADMIN_PASSWORD
    });
    assert.equal(login.status, 200);
    const adminToken = login.data.token;
    assert.ok(adminToken);
    assert.equal(login.data.user.role, 'ops');
    assert.equal(login.data.state.warehouses.length, 0);
    assert.equal(login.data.state.parts.length, 0);
    assert.equal(login.data.state.technicians.length, 0);

    // 3. Cadastrar estoque real
    const whRes = await req('POST', '/api/warehouses', {
      name: 'Almoxarifado Central',
      code: 'alm-01',
      city: 'Fortaleza, CE',
      responsible: 'Eduardo',
      address: 'Av. Central, 500'
    }, adminToken);
    assert.equal(whRes.status, 200);
    const wid = whRes.data.warehouse.id;
    assert.equal(whRes.data.warehouse.code, 'ALM-01');

    // 4. Cadastrar produto real com saldo inicial
    const prodRes = await req('POST', '/api/products', {
      sku: 'onu-gpon-01',
      name: 'ONU GPON Dual Band',
      category: 'Equipamentos',
      warehouse: wid,
      corridor: 'A',
      shelf: '01',
      baseMin: 5,
      min: 2,
      qty: 20
    }, adminToken);
    assert.equal(prodRes.status, 200);
    const pid = prodRes.data.product.id;
    assert.equal(prodRes.data.state.stock[wid][pid], 20);

    // 5. Lançar entrada adicional de estoque (compra/NF)
    const entryRes = await req('POST', '/api/movements', {
      kind: 'entry',
      warehouse: wid,
      part: pid,
      qty: 10,
      note: 'NF 98765'
    }, adminToken);
    assert.equal(entryRes.status, 200);
    assert.equal(entryRes.data.state.stock[wid][pid], 30);

    // 6. Cadastrar técnico real já com credenciais de login
    const techRes = await req('POST', '/api/technicians', {
      name: 'Marcos Silva',
      vehicle: 'Fiorino V-10',
      region: 'Centro',
      color: 'mint',
      status: 'route',
      order: 'OS-5001',
      client: 'Hospital São José',
      address: 'Rua Principal, 100',
      username: 'marcos',
      password: 'tech12345'
    }, adminToken);
    assert.equal(techRes.status, 200);
    const tid = techRes.data.technician.id;

    // 7. Fazer login como o técnico Marcos
    const techLogin = await req('POST', '/api/auth/login', { username: 'marcos', password: 'tech12345' });
    assert.equal(techLogin.status, 200);
    const techToken = techLogin.data.token;
    assert.equal(techLogin.data.user.role, 'tech');
    assert.equal(techLogin.data.user.technicianId, tid);

    // 8. Técnico não pode criar estoques nem dar entrada de compra
    const forbiddenWh = await req('POST', '/api/warehouses', {
      name: 'Outro',
      code: 'OUT',
      city: 'Fortaleza',
      responsible: 'Teste'
    }, techToken);
    assert.equal(forbiddenWh.status, 403);

    // 9. Técnico realiza retirada, chegada, aplicação na OS e devolução
    const withdraw = await req('POST', '/api/movements', {
      kind: 'withdraw',
      warehouse: wid,
      part: pid,
      qty: 3
    }, techToken);
    assert.equal(withdraw.status, 200);
    assert.equal(withdraw.data.state.stock[wid][pid], 27);
    assert.equal(withdraw.data.state.stock[tid][pid], 3);

    const arrival = await req('POST', '/api/movements', {
      kind: 'arrival',
      order: 'OS-5001',
      placement: 'Hospital São José'
    }, techToken);
    assert.equal(arrival.status, 200);

    const use = await req('POST', '/api/movements', {
      kind: 'use',
      part: pid,
      qty: 2,
      order: 'OS-5001',
      placement: 'Hospital São José · Recepção'
    }, techToken);
    assert.equal(use.status, 200);
    assert.equal(use.data.state.stock[tid][pid], 1);

    const ret = await req('POST', '/api/movements', {
      kind: 'return',
      warehouse: wid,
      part: pid,
      qty: 1,
      note: 'Unidade reserva não utilizada'
    }, techToken);
    assert.equal(ret.status, 200);
    assert.equal(ret.data.state.stock[tid][pid], 0);
    assert.equal(ret.data.state.stock[wid][pid], 28);

    // 10. Como o técnico está com saldo zero, admin pode excluí-lo
    const delTech = await req('DELETE', `/api/technicians/${tid}`, null, adminToken);
    assert.equal(delTech.status, 200);
    assert.equal(delTech.data.state.technicians.length, 0);
  });
});

