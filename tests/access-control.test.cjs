const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'gridstock-access-'));
process.env.GRIDSTOCK_DB=path.join(temp,'main.db');
process.env.GRIDSTOCK_INITIAL_MODE='seed';
process.env.GRIDSTOCK_ADMIN_USERNAME='52998224725';
process.env.GRIDSTOCK_ADMIN_PASSWORD='access-test-password';
const root=path.resolve(__dirname,'..');
execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig','src/lib/db.ts','--outDir',temp,'--module','commonjs','--target','es2022','--skipLibCheck','--esModuleInterop','--types','node'],{cwd:root});
const db=require(path.join(temp,'db.js')),p=require(path.join(temp,'permissions.js')),a=require(path.join(temp,'accessPolicy.js')),c=require(path.join(temp,'companies.js'));
const store=db.getDb();
const cpf=n=>{let s=String(n).padStart(9,'0');for(let len=10;len<=11;len++){const sum=[...s].reduce((v,d,i)=>v+Number(d)*(len-i),0);s+=(sum*10%11)%10;}return s;};
let operator,tech;
test('upgrade preserva somente o administrador original e novos operacionais não recebem poderes administrativos',()=>{
 assert.equal(db.listUsers(store)[0].companyAdmin,true);
 operator=db.saveUser({username:cpf(876543210),name:'Operacional',password:'test-password',role:'ops'},store);
 assert.equal(operator.companyAdmin,false);assert.equal(p.can(operator,'count'),false);assert.equal(p.can(operator,'products'),false);
 assert.throws(()=>p.parsePolicy({companyAdmin:false,permissions:['constructor']},'ops'));
});
test('permissões são persistidas e revogação é aplicada à sessão existente',()=>{
 const login=db.authenticate(operator.username,'test-password',store);
 const req=new Request('http://local',{headers:{authorization:'Bearer '+login.token}});
 db.saveUser({...operator,access:{companyAdmin:false,permissions:['stock','count']}},store);
 assert.equal(p.can(db.getUserFromRequest(req,store),'count'),true);
 db.saveUser({...operator,access:{companyAdmin:false,permissions:['stock']}},store);
 assert.equal(p.can(db.getUserFromRequest(req,store),'count'),false);
});
test('último administrador não pode ser rebaixado ou removido',()=>{
 const owner=db.listUsers(store)[0];
 assert.throws(()=>db.saveUser({...owner,access:{companyAdmin:false,permissions:[]}},store),/administrador/);
 assert.throws(()=>a.protectLastAdmin(store,owner.id,false),/administrador/);
});
test('conta técnica não ganha acesso administrativo e mantém permissões ao editar dados pessoais',()=>{
 tech=db.saveUser({username:cpf(765432109),name:'Técnico',password:'test-password',role:'tech',technicianId:'t1',access:{companyAdmin:false,permissions:['stock','history','use']}},store);
 assert.throws(()=>db.saveUser({...tech,access:{companyAdmin:true,permissions:[]}},store));
 assert.throws(()=>db.saveUser({...tech,access:{companyAdmin:false,permissions:['products']}},store));
 const changed=db.saveUser({...tech,name:'Técnico atualizado'},store);
 assert.deepEqual(changed.permissions,['stock','history','use']);
});
test('projeção não expõe equipe, saldos ou histórico não autorizados',()=>{
 const state=db.loadState(store);
 const limited=db.stateForUser(state,{...operator,permissions:['stock']});
 assert.equal(limited.technicians.length,0);assert.equal(limited.movements.length,0);assert.equal(limited.stock.t1,undefined);
 const personal=db.stateForUser(state,tech);
 assert.deepEqual(personal.technicians.map(t=>t.id),['t1']);assert.equal(personal.stock.t2,undefined);
 assert.ok(personal.movements.every(m=>m.technician==='t1'));
 const empty=db.stateForUser(state,{...operator,permissions:[]});
 assert.equal(empty.parts.length,0);assert.deepEqual(empty.stock,{});
});
test('snapshot preserva permissões por empresa sem alterar outra empresa',()=>{
 const company=c.saveCompany({name:'Empresa A',slug:'access-alpha',username:cpf(654321098),password:'test-password',adminName:'Admin A'});
 const req=new Request('http://local',{headers:{'x-gridstock-company':'access-alpha'}});
 const tenant=c.databaseForRequest(req);
 const owner=db.listUsers(tenant)[0];assert.equal(owner.companyAdmin,true);
 const member=db.saveUser({username:cpf(543210987),name:'Leitura',password:'test-password',role:'ops',access:{companyAdmin:false,permissions:['stock','history']}},tenant);
 const snapshot=c.exportCompanySnapshot(company.id);
 assert.equal(snapshot.accessPolicies[member.id].companyAdmin,false);
 a.writePolicies(tenant,{});c.importCompanySnapshot(company.id,snapshot);
 assert.deepEqual(db.listUsers(tenant).find(u=>u.id===member.id).permissions,['stock','history']);
 assert.equal(db.listUsers(store).some(u=>u.id===member.id),false);
});
after(()=>{for(const connection of global.companyDbs?.values()||[])connection.close();store.close();fs.rmSync(temp,{recursive:true,force:true});});
