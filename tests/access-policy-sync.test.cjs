const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'gridstock-access-sync-'));
const root=path.resolve(__dirname,'..');
process.env.GRIDSTOCK_DB=path.join(temp,'root.db');process.env.GRIDSTOCK_INITIAL_MODE='empty';process.env.GRIDSTOCK_ADMIN_USERNAME='52998224725';process.env.GRIDSTOCK_ADMIN_PASSWORD='test-password';
execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig','src/lib/accessPolicySync.ts','--outDir',temp,'--module','commonjs','--target','es2022','--skipLibCheck','--esModuleInterop','--types','node'],{cwd:root});
const rows=new Map();let offline=false;
const client={from:()=>({
 select:()=>({eq:(_,key)=>({maybeSingle:async()=>offline?{error:{message:'offline'}}:{data:rows.has(key)?{value:rows.get(key)}:null}})}),
 insert:async({key,value})=>{if(offline||rows.has(key))return {error:{message:'conflict'}};rows.set(key,value);return {error:null};},
 update:({value})=>{let key,expected;const query={eq:(field,v)=>{if(field==='key')key=v;else expected=v;return query;},select:async()=>{if(offline)return {error:{message:'offline'}};if(rows.get(key)!==expected)return {data:[]};rows.set(key,value);return {data:[{key}]};}};return query;}
})};
require.cache[path.join(temp,'supabaseStore.js')]={exports:{getSupabaseAdminClient:()=>client}};
const sync=require(path.join(temp,'accessPolicySync.js')),db=require(path.join(temp,'db.js')),access=require(path.join(temp,'accessPolicy.js'));
const a=db.createDatabase(path.join(temp,'a.db')),b=db.createDatabase(path.join(temp,'b.db'));
test('permissões remotas não aceitam gravação de outra instância com versão desatualizada',async()=>{
 await sync.refreshAccessPolicy(a);await sync.refreshAccessPolicy(b);
 await sync.persistAccessPolicy(a);
 await assert.rejects(sync.persistAccessPolicy(b),/salvar os acessos/);
 await sync.refreshAccessPolicy(a);await sync.refreshAccessPolicy(b);
 access.writePolicies(b,{'u-admin':{companyAdmin:true,permissions:['stock']}});
 await sync.persistAccessPolicy(b);
 access.writePolicies(a,{'u-admin':{companyAdmin:true,permissions:['stock','count']}});
 await assert.rejects(sync.persistAccessPolicy(a),/outra sessão/);
 await sync.refreshAccessPolicy(a);assert.deepEqual(access.policies(a)['u-admin'].permissions,['stock']);
});
test('indisponibilidade remota bloqueia verificação em vez de usar permissões antigas',async()=>{
 offline=true;await assert.rejects(sync.refreshAccessPolicy(a),/verificar suas permissões/);offline=false;
});
after(()=>{a.close();b.close();fs.rmSync(temp,{recursive:true,force:true});});
