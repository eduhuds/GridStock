// Provision a dedicated platform administrator without changing an existing account.
// Credentials are read/written locally in .env and never printed.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
process.loadEnvFile(path.join(root, '.env'));
process.env.NODE_PATH = path.join(root, 'node_modules');
require('node:module').Module._initPaths();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gridstock-admin-'));
(async () => {
  try {
    execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', 'src/lib/supabaseStore.ts', '--outDir', temp, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck', '--esModuleInterop', '--types', 'node'], { stdio: 'pipe' });
    const { getDb } = require(path.join(temp, 'db.js'));
    const companies = require(path.join(temp, 'companies.js'));
    const sync = require(path.join(temp, 'supabaseStore.js'));
    const remote = sync.getSupabaseAdminClient();
    if (remote) {
      const { error } = await remote.from('app_meta').select('key').limit(1);
      if (error) throw new Error('A conexão remota não foi validada; nenhuma conta foi criada.');
    }
    const backup = path.join(root, 'data', `before-admin-${Date.now()}.db`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    getDb().prepare('VACUUM INTO ?').run(backup);
    fs.chmodSync(backup, 0o600);
    await sync.ensureSupabaseSynced(getDb());
    await sync.pullPlatformFromSupabase();
    companies.listCompanies(); // Initialize the platform schema.
    const username = process.env.GRIDSTOCK_PLATFORM_ADMIN_USERNAME || 'admin-gridstock';
    const existing = getDb().prepare('SELECT id FROM platform_admin_accounts WHERE username = ?').get(username);
    const password = process.env.GRIDSTOCK_PLATFORM_ADMIN_PASSWORD || (!existing ? crypto.randomBytes(24).toString('base64url') : '');
    if (!password) throw new Error('Conta já existente sem senha no .env; nenhuma credencial foi substituída.');
    if (!existing) companies.createPlatformAdmin(username, password);
    const session = companies.masterLogin(username, password);
    const request = new Request('http://local', { headers: { authorization: `Bearer ${session.token}` } });
    companies.requireMaster(request);
    companies.masterLogout(request);
    let env = fs.readFileSync('.env', 'utf8');
    for (const [key, value] of [['GRIDSTOCK_PLATFORM_ADMIN_USERNAME', username], ['GRIDSTOCK_PLATFORM_ADMIN_PASSWORD', password]]) {
      if (/[\r\n]/.test(value)) throw new Error('Credencial com quebra de linha não suportada.');
      const line = key + '=' + JSON.stringify(value);
      const pattern = new RegExp('^' + key + '=.*$', 'm');
      env = pattern.test(env) ? env.replace(pattern, () => line) : env.trimEnd() + '\n' + line + '\n';
    }
    fs.writeFileSync('.env', env, { mode: 0o600 }); fs.chmodSync('.env', 0o600);
    const remoteSynced = remote ? await sync.pushPlatformToSupabase(undefined, { registryOnly: true }) : false;
    if (remote && !remoteSynced) throw new Error('Conta e credenciais salvas localmente, mas sincronização remota falhou. Execute novamente para sincronizar.');
    console.log(JSON.stringify({ created: !existing, username, loginVerified: true, remoteSynced, passwordLocation: '.env / GRIDSTOCK_PLATFORM_ADMIN_PASSWORD', backupCreated: true }));
  } catch (error) {
    console.error('Provisionamento:', error.message);
    process.exitCode = 1;
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
})();
