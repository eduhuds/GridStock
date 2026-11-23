// Exercises the built Next application against its own temporary, local-only database.
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'gridstock-access-api-'));
const cpf=n=>{let s=String(n).padStart(9,'0');for(let len=10;len<=11;len++){const sum=[...s].reduce((v,d,i)=>v+Number(d)*(len-i),0);s+=(sum*10%11)%10;}return s;};
let server,base,admin,member,technician,memberAccount,techAccount;
const password='AccessTestOnly2026';
async function request(method,url,body,cookie){
 const response=await fetch(base+url,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function login(username,role='ops'){const r=await request('POST','/api/auth/login',{cpf:username,password,role});assert.equal(r.status,200,JSON.stringify(r.data));return r.cookie;}
test('Next API: permissões por usuário, identidade real, revogação e isolamento do técnico',{timeout:60000},async()=>{
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));base=`http://localhost:${port}`;
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'-H','127.0.0.1'],{cwd:root,env:{...process.env,GRIDSTOCK_STORAGE_MODE:'local',GRIDSTOCK_DB:path.join(temp,'app.sqlite'),GRIDSTOCK_INITIAL_MODE:'seed',GRIDSTOCK_ADMIN_USERNAME:cpf(123456789),GRIDSTOCK_ADMIN_PASSWORD:password},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Servidor local não iniciou')),30000);server.once('exit',code=>{clearTimeout(timer);reject(new Error('Next encerrou: '+code));});server.stdout.on('data',data=>{if(String(data).includes('Ready')){clearTimeout(timer);resolve();}});});
 admin=await login(cpf(123456789));
 let r=await request('POST','/api/users',{name:'Operacional limitado',username:cpf(234567890),password,role:'ops',access:{companyAdmin:false,permissions:['stock','history','team']}},admin);
 assert.equal(r.status,200);memberAccount=r.data.savedUser;
 member=await login(memberAccount.username);
 r=await request('GET','/api/bootstrap',undefined,member);assert.deepEqual(r.data.users,[]);assert.deepEqual(r.data.audit,[]);assert.equal(r.data.user.companyAdmin,false);
 for(const [url,body] of [['/api/users',{name:'Intruso',username:cpf(345678901),password,role:'ops',access:{companyAdmin:true,permissions:[]}}],['/api/products',{}],['/api/warehouses',{}],['/api/technicians',{}],['/api/system/reset',{mode:'empty'}]]) {
   assert.equal((await request('POST',url,body,member)).status,403,url);
 }
 for(const kind of ['entry','stockout','transfer','withdraw','use','return','count','departure','arrival','finish'])assert.equal((await request('POST','/api/movements',{kind,technician:'t1',part:'p1',warehouse:'w1',qty:1,placement:'Teste'},member)).status,403,kind);
 // A self profile update cannot promote the operator or change its assigned identity.
 r=await request('POST','/api/users',{...memberAccount,access:{companyAdmin:true,permissions:['count']}},member);assert.equal(r.status,200);assert.equal(r.data.user.companyAdmin,false);
 r=await request('POST','/api/users',{...memberAccount,access:{companyAdmin:false,permissions:['stock','history','team','count']}},admin);assert.equal(r.status,200);
 r=await request('POST','/api/movements',{kind:'count',technician:'t1',part:'p1',qty:7,note:'Conferência autorizada',operator:'Nome falso'},member);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.movement.operator,memberAccount.name);
 await request('POST','/api/users',{...memberAccount,access:{companyAdmin:false,permissions:['stock']}},admin);
 assert.equal((await request('POST','/api/movements',{kind:'count',technician:'t1',part:'p1',qty:5},member)).status,403);
 r=await request('GET','/api/bootstrap',undefined,member);assert.equal(r.data.state.technicians.length,0);assert.equal(r.data.state.stock.t1,undefined);assert.deepEqual(r.data.state.movements,[]);
 // Creation and credential management require an actual company admin.
 r=await request('POST','/api/users',{name:'Técnico limitado',username:cpf(456789012),password,role:'tech',technicianId:'t1',access:{companyAdmin:false,permissions:['stock','history','use']}},admin);assert.equal(r.status,200);techAccount=r.data.savedUser;
 technician=await login(techAccount.username,'tech');
 r=await request('POST','/api/movements',{kind:'use',technician:'t2',part:'p1',qty:1,placement:'Cliente de teste · sala 03'},technician);assert.equal(r.status,200);assert.equal(r.data.movement.technician,'t1');assert.equal(r.data.state.stock.t2,undefined);assert.equal(r.data.state.technicians.length,1);
 assert.equal((await request('POST','/api/movements',{kind:'count',technician:'t1',part:'p1',qty:20},technician)).status,403);
 r=await request('POST','/api/users',{...techAccount,role:'ops',technicianId:'t2',access:{companyAdmin:true,permissions:[]}},technician);assert.equal(r.status,200);assert.equal(r.data.user.role,'tech');assert.equal(r.data.user.technicianId,'t1');assert.equal(r.data.user.companyAdmin,false);assert.deepEqual(r.data.user.permissions,['stock','history','use']);
 // No bypass through nested product/load/credential creation in the technician endpoint.
 await request('POST','/api/users',{...memberAccount,access:{companyAdmin:false,permissions:['stock','team','technicians','products']}},admin);
 for(const body of [{name:'Outro',load:[{part:'p1',qty:1}]},{name:'Outro',newParts:[{sku:'TESTE',name:'Teste',baseQty:2,techQty:1}]},{id:'t1',name:'Técnico',username:cpf(567890123),password}])assert.equal((await request('POST','/api/technicians',body,member)).status,403);
 assert.equal((await request('POST','/api/products',{qty:1},member)).status,403);
 assert.equal((await request('DELETE','/api/technicians/t1',undefined,member)).status,403);
});
after(async()=>{if(server&&server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}fs.rmSync(temp,{recursive:true,force:true});});
