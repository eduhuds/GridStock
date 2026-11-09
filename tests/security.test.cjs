const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const path=require('node:path');
const temp=mkdtempSync(path.join(require('node:os').tmpdir(),'gridstock-security-'));
process.env.GRIDSTOCK_DB=':memory:';
process.env.GRIDSTOCK_INITIAL_MODE='empty';
process.env.GRIDSTOCK_ADMIN_USERNAME='legacyadmin';
process.env.GRIDSTOCK_ADMIN_PASSWORD='security-test-password';
const root=path.resolve(__dirname,'..');
execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig','src/lib/apiSecurity.ts','src/lib/xlsx.ts','--outDir',temp,'--module','commonjs','--target','es2022','--skipLibCheck','--esModuleInterop','--types','node'],{cwd:root});
const {secureRoute,allowLoginAttempt}=require(path.join(temp,'apiSecurity.js'));
const db=require(path.join(temp,'db.js'));
const companies=require(path.join(temp,'companies.js'));
const {parseXlsxBytes}=require(path.join(temp,'xlsx.js'));
const request=(pathname,body,headers={})=>new Request('https://gridstock.test'+pathname,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});

test('login entrega cookie HttpOnly, sem expor token no JSON, e respeita empresa',async()=>{
 const token='a'.repeat(43);
 const login=secureRoute(async()=>Response.json({token,companySlug:'alpha'}));
 const res=await login(request('/api/auth/login',{cpf:'123'}));
 assert.equal((await res.json()).token,'cookie');
 const cookie=res.headers.get('set-cookie');
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
 const read=secureRoute(async req=>Response.json({authorization:req.headers.get('authorization')}));
 const same=await read(request('/api/products',{}, {cookie:cookie.split(';')[0],'x-gridstock-company':'alpha',authorization:'Bearer cookie'}));
 assert.equal((await same.json()).authorization,'Bearer '+token);
 const other=await read(request('/api/products',{}, {cookie:cookie.split(';')[0],'x-gridstock-company':'beta',authorization:'Bearer cookie'}));
 assert.equal((await other.json()).authorization,null);
});
test('requisição de outra origem e corpo grande não chegam ao handler',async()=>{
 let calls=0;const route=secureRoute(async()=>{calls++;return Response.json({ok:true});});
 assert.equal((await route(request('/api/products',{}, {origin:'https://attacker.test'}))).status,403);
 assert.equal((await route(request('/api/products',{value:'x'.repeat(1024*1024)}))).status,400);
 assert.equal(calls,0);
});
test('limite de tentativas persiste no banco e expira',()=>{
 const now=Date.now();for(let i=0;i<10;i++)assert.equal(allowLoginAttempt('rate-test',now),true);
 assert.equal(allowLoginAttempt('rate-test',now),false);
 assert.equal(allowLoginAttempt('rate-test',now+15*60_000),true);
});
test('requisições não intercalam importação e gravação de snapshots',async()=>{
 const order=[];const route=secureRoute(async req=>{const {n}=await req.json();order.push('start'+n);await new Promise(resolve=>setTimeout(resolve,10));order.push('end'+n);return Response.json({ok:true});});
 await Promise.all([route(request('/api/products',{n:1})),route(request('/api/products',{n:2}))]);
 assert.deepEqual(order,['start1','end1','start2','end2']);
});
test('troca de senha revoga sessões e último administrador é preservado',()=>{
 const store=db.getDb();store.prepare("UPDATE users SET username=? WHERE id='u-admin'").run('12345678909');
 const session=db.authenticate('12345678909','security-test-password');
 const req=new Request('https://gridstock.test',{headers:{authorization:'Bearer '+session.token}});
 assert.ok(db.getUserFromRequest(req));
 assert.throws(()=>db.saveUser({...session.user,password:'short'}));
 assert.throws(()=>db.saveUser({...session.user,role:'tech',technicianId:'t1'}));
 assert.throws(()=>db.saveUser({...session.user,role:'unknown'}));
 db.saveUser({...session.user,password:'changed-test-password'});
 assert.equal(db.getUserFromRequest(req),null);
 assert.equal(db.verifyPassword('x'.repeat(257),db.hashPassword('valid-password')),false);
});
test('importação vazia revoga sessões master antigas',()=>{
 const {token}=companies.masterLogin('12345678909','security-test-password');
 const req=new Request('https://gridstock.test',{headers:{authorization:'Bearer '+token}});
 companies.requireMaster(req);companies.importPlatformRegistry({masterSessions:[]});
 assert.throws(()=>companies.requireMaster(req));
});
test('planilha grande é rejeitada antes de descompactar',async()=>{
 await assert.rejects(parseXlsxBytes(new ArrayBuffer(10*1024*1024+1)),/excede/);
});
test('execução serverless é bloqueada enquanto persistência usa snapshots',async()=>{
 process.env.VERCEL='1';
 try { assert.equal((await secureRoute(async()=>Response.json({ok:true}))(request('/api/products',{}))).status,503); }
 finally {delete process.env.VERCEL;}
});
after(()=>{for(const connection of global.companyDbs?.values()||[])connection.close();db.getDb().close();rmSync(temp,{recursive:true,force:true});});
