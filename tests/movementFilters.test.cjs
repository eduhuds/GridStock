const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = mkdtempSync(path.join(require('node:os').tmpdir(), 'gridstock-filters-'));
after(() => rmSync(out, {recursive:true,force:true}));
execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig','src/lib/movementFilters.ts','--outDir',out,'--module','commonjs','--target','es2022','--skipLibCheck'],{cwd:root});
const {matchesMovementFilter:matches,emptyMovementFilter:empty} = require(path.join(out,'movementFilters.js'));
const m = {kind:'transfer',from:'a',to:'b',operator:'Ana',ts:Date.parse('2026-11-11T02:59:59.999Z')};
test('período inclui o dia inteiro de Fortaleza, inclusive a última fração de segundo',()=>{
 const f={...empty,from:'2026-11-10',to:'2026-11-10'};
 assert.equal(matches(m,f),true);
 assert.equal(matches({...m,ts:Date.parse('2026-11-11T03:00:00Z')},f),false);
 assert.equal(matches({...m,ts:Date.parse('2026-11-10T02:59:59Z')},f),false);
 assert.equal(matches({...m,ts:Date.parse('2026-11-10T03:00:00Z')},f),true);
});
test('transferência aparece tanto na origem quanto no destino e combina responsável',()=>{
 assert.equal(matches(m,{...empty,warehouse:'a',operator:'Ana'}),true);
 assert.equal(matches(m,{...empty,warehouse:'b'}),true);
 assert.equal(matches(m,{...empty,warehouse:'c'}),false);
 assert.equal(matches(m,{...empty,warehouse:'a',operator:'Outro'}),false);
 assert.equal(matches({...m,from:undefined,to:undefined,warehouse:'a'},{...empty,warehouse:'a'}),true);
});
test('período invertido não retorna registros; filtros vazios preservam histórico',()=>{
 assert.equal(matches(m,{...empty,from:'2026-11-12',to:'2026-11-10'}),false);
 assert.equal(matches(m,empty),true);
 assert.equal(matches(m,{...empty,to:'2026-11-10'}),true);
 assert.equal(matches({...m,ts:NaN},{...empty,from:'2026-11-10'}),false);
});
