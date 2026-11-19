const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = mkdtempSync(path.join(require('node:os').tmpdir(), 'gridstock-preview-'));
after(() => rmSync(out, { recursive: true, force: true }));
execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', 'src/lib/movementPreview.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'], { cwd: root });
const { movementPreview } = require(path.join(out, 'movementPreview.js'));
const { seed, apply } = require(path.join(out, 'domain.js'));

test('prévia de saldo coincide com o resultado do domínio para retirada, devolução, uso e entrada', () => {
  for (const kind of ['withdraw', 'return', 'use', 'entry', 'stockout', 'count', 'departure']) {
    const state = seed();
    const warehouse = state.warehouses[0].id, technician = state.technicians[0].id, part = state.parts[0].id;
    state.stock[warehouse][part] = 28;
    state.stock[technician][part] = 4;
    const preview = movementPreview(kind, 2, 28, 4);
    assert.equal(preview.error, '', kind);
    apply(state, { kind, warehouse, technician, part, qty: 2, note: 'Verificação de saldo', placement: 'Cliente de teste · sala 03', order: 'REF-TESTE' });
    assert.equal(state.stock[warehouse][part], preview.baseAfter, kind);
    assert.equal(state.stock[technician][part], preview.personalAfter, kind);
  }
});

test('bloqueia ausência de saldo, excesso, frações, negativos e valores não finitos', () => {
  for (const kind of ['withdraw', 'return', 'use', 'entry', 'stockout']) {
    for (const qty of [0, -1, 0.5, NaN, Infinity]) assert.ok(movementPreview(kind, qty, 5, 3).error, `${kind}:${qty}`);
  }
  for (const kind of ['use', 'return', 'departure']) {
    assert.match(movementPreview(kind, 1, 28, 0).error, /não tem esta peça/);
    assert.ok(movementPreview(kind, 4, 28, 3).error);
  }
  assert.ok(movementPreview('withdraw', 6, 5, 3).error);
  assert.ok(movementPreview('stockout', 6, 5, 3).error);
  assert.ok(movementPreview('entry', 1, Number.MAX_SAFE_INTEGER, 0).error);
  assert.equal(movementPreview('count', 0, 5, 3).error, '');
  assert.equal(movementPreview('departure', 0, 5, 3).error, '');
});

test('utilização manual mantém o local no histórico e não exige chegada ou altera o status', () => {
  const state = seed();
  const technician = state.technicians[0], part = state.parts[0].id;
  technician.status = 'available';
  state.stock[technician.id][part] = 3;
  const event = apply(state, { kind: 'use', technician: technician.id, part, qty: 1, placement: 'Cliente de teste · Rua Central, 120 · sala 03', order: 'REF-42' });
  assert.equal(event.placement, 'Cliente de teste · Rua Central, 120 · sala 03');
  assert.equal(event.order, 'REF-42');
  assert.equal(technician.status, 'available');
  assert.equal(state.stock[technician.id][part], 2);
  assert.equal(state.movements[0].id, event.id);
});
