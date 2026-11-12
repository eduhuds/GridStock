const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const compiled = mkdtempSync(path.join(tmpdir(), 'gridstock-dashboard-'));
after(() => rmSync(compiled, { recursive: true, force: true }));
execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'),
  '--ignoreConfig', 'src/lib/dashboard.ts', '--outDir', compiled,
  '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'], { cwd: root });
const { dailyStockActivity } = require(path.join(compiled, 'dashboard.js'));

test('dashboard usa o dia de Fortaleza e preenche dias sem movimento', () => {
  const now = Date.parse('2026-11-05T02:30:00Z'); // Ainda 04/11 em Fortaleza.
  const days = dailyStockActivity([
    { kind: 'withdraw', ts: Date.parse('2026-11-05T01:00:00Z'), qty: 5 },
    { kind: 'use', ts: Date.parse('2026-11-04T02:00:00Z'), qty: 2 },
    { kind: 'departure', ts: now, qty: 99 },
    { kind: 'count', ts: now, qty: 80 },
    { kind: 'use', ts: now + 1, qty: 30 },
    { kind: 'use', ts: Date.parse('2026-10-01T12:00:00Z'), qty: 20 },
  ], 7, now);
  assert.equal(days.length, 7);
  assert.deepEqual(days[6], { date: '2026-11-04', label: '04/11', withdrawn: 5, used: 0 });
  assert.equal(days[5].used, 2);
  assert.equal(days[0].withdrawn, 0);
  assert.equal(days.reduce((sum, day) => sum + day.used, 0), 2);
});

test('dashboard mantém ordem cronológica e soma unidades em 30 dias', () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  const days = dailyStockActivity([
    { kind: 'withdraw', ts: now, qty: 3 }, { kind: 'withdraw', ts: now, qty: 4 },
  ], 30, now);
  assert.equal(days.length, 30);
  assert.equal(days[0].date, '2026-10-07');
  assert.equal(days[29].withdrawn, 7);
  assert.equal(dailyStockActivity([], 7, now).every(day => day.withdrawn === 0 && day.used === 0), true);
});

test('janela inclui a meia-noite de Fortaleza e ignora registros anteriores e inválidos', () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  const start = Date.parse('2026-10-30T03:00:00Z');
  const days = dailyStockActivity([
    { kind: 'use', ts: start - 1, qty: 100 },
    { kind: 'use', ts: start, qty: 2 },
    { kind: 'withdraw', ts: start + 1, qty: 3 },
    { kind: 'use', ts: NaN, qty: 100 },
    { kind: 'use', ts: Infinity, qty: 100 },
  ], 7, now);
  assert.equal(days[0].date, '2026-10-30');
  assert.equal(days[0].used, 2);
  assert.equal(days[0].withdrawn, 3);
  assert.equal(days.reduce((sum, day) => sum + day.used, 0), 2);
});
