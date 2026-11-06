const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const temp = mkdtempSync(path.join(tmpdir(), 'gridstock-companies-'));
process.env.GRIDSTOCK_DB = path.join(temp, 'main.db');
process.env.GRIDSTOCK_INITIAL_MODE = 'empty';
execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', 'src/lib/companies.ts', '--outDir', temp, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck', '--esModuleInterop', '--types', 'node'], { cwd: root });
const db = require(path.join(temp, 'db.js'));
const companies = require(path.join(temp, 'companies.js'));
const request = (slug, token) => new Request('http://local/api/bootstrap', { headers: { ...(slug === undefined ? {} : { 'X-Gridstock-Company': slug }), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
after(() => { for (const connection of global.companyDbs.values()) connection.close(); db.getDb().close(); rmSync(temp, { recursive: true, force: true }); });

const adminUser = process.env.GRIDSTOCK_ADMIN_USERNAME;
const adminPass = process.env.GRIDSTOCK_ADMIN_PASSWORD;

test('empresas isolam dados, logins repetidos, sessões, suspensão e persistência', () => {
  const a = companies.saveCompany({ name: 'Alpha', slug: 'alpha', username: 'gestor', password: 'alpha-pass' });
  const b = companies.saveCompany({ name: 'Beta', slug: 'beta', username: 'gestor', password: 'beta-pass' });
  const aDb = companies.databaseForRequest(request(a.slug));
  const bDb = companies.databaseForRequest(request(b.slug));
  assert.notEqual(aDb, bDb);
  assert.equal(db.listUsers(aDb).length, 1);
  assert.throws(() => db.authenticate(adminUser, adminPass, aDb));
  assert.throws(() => db.authenticate('gestor', 'alpha-pass', bDb));
  const aSession = db.authenticate('gestor', 'alpha-pass', aDb);
  const bSession = db.authenticate('gestor', 'beta-pass', bDb);
  assert.equal(db.getUserFromRequest(request('beta', aSession.token), bDb), null);
  assert.equal(db.getUserFromRequest(request(undefined, aSession.token)), null);
  assert.ok(db.getUserFromRequest(request('alpha', aSession.token), aDb));
  const state = db.loadState(aDb);
  state.parts.push({ id: 'p1', name: 'Exclusivo Alpha', sku: 'P01', category: 'Peças', unit: 'un.', min: 0, baseMin: 0 });
  db.saveState(aDb, state);
  assert.equal(db.loadState(bDb).parts.length, 0);
  assert.equal(db.loadState().parts.length, 0);
  aDb.close(); global.companyDbs.delete(a.id);
  const reopened = companies.databaseForRequest(request('alpha'));
  assert.equal(db.loadState(reopened).parts[0].name, 'Exclusivo Alpha');
  assert.ok(db.getUserFromRequest(request('alpha', aSession.token), reopened));
  companies.saveCompany({ ...a, name: 'Alpha Nova', color: '#123456', tagline: 'Equipe Alpha', active: false });
  assert.throws(() => companies.databaseForRequest(request('alpha')));
  companies.saveCompany({ ...a, active: true });
  assert.equal(db.getUserFromRequest(request('alpha', aSession.token), reopened), null);
  assert.ok(db.getUserFromRequest(request('beta', bSession.token), bDb));
  db.logoutRequest(request('beta', bSession.token), bDb);
  assert.equal(db.getUserFromRequest(request('beta', bSession.token), bDb), null);
  for (const slug of ['missing', '../main', '']) assert.throws(() => companies.databaseForRequest(request(slug)));
});

test('administração exige sessão própria, protege credenciais e permite troca de senha', () => {
  const ordinary = db.authenticate(adminUser, adminPass);
  assert.throws(() => companies.requireMaster(request(undefined, ordinary.token)));
  const master = companies.masterLogin(adminUser, adminPass);
  companies.requireMaster(request(undefined, master.token));
  assert.equal(db.getUserFromRequest(request(undefined, master.token)), null);
  db.saveUser({ id: process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin', username: adminUser, name: 'Admin', password: 'changed-root-password', role: 'ops' });
  assert.throws(() => companies.masterLogin(adminUser, 'changed-root-password'));
  companies.changeMasterPassword(request(undefined, master.token), adminPass, 'new-master-pass');
  assert.throws(() => companies.masterLogin(adminUser, adminPass));
  const next = companies.masterLogin(adminUser, 'new-master-pass');
  companies.masterLogout(request(undefined, next.token));
  assert.throws(() => companies.requireMaster(request(undefined, next.token)));
});

test('validação rejeita duplicidade e dados inválidos sem registrar empresas', () => {
  const count = companies.listCompanies().length;
  for (const input of [
    { slug: 'alpha', password: 'long-password' }, { slug: '../escape', password: 'long-password' },
    { slug: 'gamma', password: '123' }, { slug: 'gamma', password: 'long-password', color: 'red;}' },
    { slug: 'gamma', password: 'long-password', username: '!' },
  ]) assert.throws(() => companies.saveCompany({ name: 'Teste', username: 'gestor', ...input }));
  assert.equal(companies.listCompanies().length, count);
});

test('módulos, limites e desligamento de campo são aplicados no servidor', () => {
  const { businessPreset } = require(path.join(temp, 'companyConfig.js'));
  const domain = require(path.join(temp, 'domain.js'));
  let c = companies.saveCompany({ name: 'Estoque geral', slug: '/empresa/geral', username: 'gestor', password: 'test-password', config: { ...businessPreset('general'), maxUsers: 1, maxWarehouses: 1, transfers: false } });
  const req = request('geral');
  const local = companies.databaseForRequest(req);
  assert.equal(c.slug, 'geral');
  for (const [action, body] of [['technicians',{}],['login',{role:'tech'}],['users',{role:'tech'}],['movements',{kind:'withdraw'}],['movements',{kind:'transfer'}],['users',{username:'extra'}],['reset',{mode:'seed'}]]) assert.throws(() => companies.enforceCompanyAction(req, action, body));
  companies.enforceCompanyAction(req, 'users', { id: db.listUsers(local)[0].id, role: 'ops' });
  const state = db.loadState(local);
  domain.saveWarehouse(state,{name:'Principal',code:'PRI',city:'Cidade',responsible:'Equipe'});
  domain.saveProduct(state,{name:'Produto',sku:'P1',category:'Geral',warehouse:state.warehouses[0].id,corridor:'A',shelf:'1',baseMin:2,qty:10});
  db.saveState(local,state);
  assert.throws(() => companies.enforceCompanyAction(req,'warehouses',{}));
  const before = JSON.stringify(state);
  for (const qty of [11,-1,0,1.5,NaN]) assert.throws(() => domain.apply(state,{kind:'stockout',warehouse:state.warehouses[0].id,part:state.parts[0].id,qty,note:'Venda'}));
  assert.equal(JSON.stringify(state),before);
  domain.apply(state,{kind:'stockout',warehouse:state.warehouses[0].id,part:state.parts[0].id,qty:3,note:'Consumo',operator:'Gestor'});
  assert.equal(state.stock[state.warehouses[0].id][state.parts[0].id],7);
  assert.equal(state.movements[0].operator,'Gestor');
  db.saveState(local,state);
  c = companies.saveCompany({...c, config:{...c.config,stockOut:false}});
  assert.throws(() => companies.enforceCompanyAction(req,'movements',{kind:'stockout'}));
  c = companies.saveCompany({...c, config:{...c.config,fieldService:true}});
  const tech = domain.saveTechnician(state,{name:'Equipe'});
  state.stock[tech.id][state.parts[0].id]=1;
  db.saveState(local,state);
  assert.throws(() => companies.saveCompany({...c,config:{...c.config,fieldService:false}}));
  const session = db.authenticate('gestor','test-password',local);
  companies.revokeCompanySessions(c.id);
  assert.equal(db.getUserFromRequest(request('geral',session.token),local),null);
  assert.ok(companies.platformOverview().history.some(h=>h.action==='Sessões encerradas'));
  assert.equal(companies.platformOverview().companies.find(x=>x.id===c.id).usage.users,1);
});
