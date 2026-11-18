const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'gridstock-platform-'));
process.env.GRIDSTOCK_DB=':memory:';
process.env.GRIDSTOCK_INITIAL_MODE='empty';
process.env.GRIDSTOCK_ADMIN_USERNAME='legacy';
process.env.GRIDSTOCK_ADMIN_PASSWORD='legacy-password-test';
execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig','src/lib/platformFinance.ts','src/lib/adminOverview.ts','src/lib/adminExport.ts','--outDir',temp,'--module','commonjs','--target','es2022','--skipLibCheck','--esModuleInterop','--types','node'],{cwd:root});
const c=require(path.join(temp,'companies.js')),f=require(path.join(temp,'finance.js')),store=require(path.join(temp,'platformFinance.js')),admin=require(path.join(temp,'adminOverview.js')),db=require(path.join(temp,'db.js'));
const req=token=>new Request('http://local',{headers:token?{authorization:`Bearer ${token}`}:{}});
let a,b,record;
after(()=>{for(const conn of global.companyDbs.values())conn.close();db.getDb().close();fs.rmSync(temp,{recursive:true,force:true});});
test('administradores dedicados não substituem conta anterior e isolam troca de senha',()=>{
 c.createPlatformAdmin('admin-one','long-password-one');c.createPlatformAdmin('admin-two','long-password-two');
 assert.throws(()=>c.createPlatformAdmin('admin-one','different-long-password'));
 assert.throws(()=>c.masterLogin('admin-one','wrong-password'));
 a=c.masterLogin('admin-one','long-password-one').token;b=c.masterLogin('admin-two','long-password-two').token;
 const otherA=c.masterLogin('admin-one','long-password-one').token;
 assert.equal(c.platformOverview(req(a)).administrator.username,'admin-one');
 c.changeMasterPassword(req(a),'long-password-one','long-new-password-one');
 assert.throws(()=>c.requireMaster(req(otherA)));c.requireMaster(req(a));c.requireMaster(req(b));
 assert.ok(c.masterLogin('legacy','legacy-password-test',true).token);
 assert.equal(db.getUserFromRequest(req(a)),null);
 assert.equal(JSON.stringify(c.platformOverview(req(a))).includes('password_hash'),false);
});
test('financeiro exige admin, valida centavos e datas e preserva auditoria',()=>{
 assert.throws(()=>store.listFinanceEntries(req()));
 const payload={description:'Mensalidade de teste',kind:'income',status:'paid',amountCents:14990,dueDate:'2026-01-10',paidDate:'2026-02-02'};
 assert.throws(()=>store.saveFinanceEntry(req(),payload));
 assert.throws(()=>store.saveFinanceEntry(req(a),{...payload,amountCents:1.5}));
 assert.throws(()=>store.saveFinanceEntry(req(a),{...payload,dueDate:'2026-02-30'}));
 assert.throws(()=>store.saveFinanceEntry(req(a),{...payload,paidDate:'9999-01-01'}));
 assert.throws(()=>store.saveFinanceEntry(req(a),{...payload,companyId:'missing'}));
 record=store.saveFinanceEntry(req(a),payload);
 assert.equal(store.listFinanceEntries(req(a)).length,1);
 const edited=store.saveFinanceEntry(req(a),{...record,status:'cancelled'});
 assert.equal(edited.paidDate,'');assert.equal(store.listFinanceEntries(req(a)).length,1);
 assert.ok(c.platformOverview(req(a)).history.some(h=>h.action==='Lançamento financeiro atualizado'));
});
test('resumo usa pagamento para caixa e vencimento para pendências sem contar cancelados',()=>{
 const base={id:'1',companyId:'',companyName:'Plataforma',description:'Teste',createdAt:1};
 const rows=[
 {...base,kind:'income',status:'paid',amountCents:10000,dueDate:'2026-01-10',paidDate:'2026-02-02'},
 {...base,kind:'expense',status:'paid',amountCents:2000,dueDate:'2026-02-10',paidDate:'2026-02-02'},
 {...base,kind:'income',status:'pending',amountCents:3000,dueDate:'2026-02-01',paidDate:''},
 {...base,kind:'income',status:'cancelled',amountCents:99999,dueDate:'2026-02-01',paidDate:''},
 {...base,kind:'expense',status:'pending',amountCents:500,dueDate:'2026-02-28',paidDate:''}];
 const result=f.summarizeFinance(rows,'2026-02-01','2026-02-28','2026-02-10');
 assert.deepEqual({...result,days:undefined},{received:10000,expenses:2000,result:8000,receivable:3000,payable:500,overdue:3000,days:undefined});
 assert.equal(result.days[0].income,10000);
 assert.equal(f.summarizeFinance(rows,'2026-01-01','2026-01-31','2026-02-10').received,0);
});
test('snapshot preserva financeiro e sessão do administrador dedicado',()=>{
 const snapshot=c.exportPlatformRegistry();c.importPlatformRegistry(snapshot);
 c.requireMaster(req(a));assert.equal(c.platformOverview(req(a)).administrator.username,'admin-one');
 assert.equal(store.listFinanceEntries(req(a))[0].id,record.id);
 const legacy={...snapshot};delete legacy.platformAdmins;delete legacy.financeEntries;c.importPlatformRegistry(legacy);
 c.requireMaster(req(a));assert.equal(store.listFinanceEntries(req(a)).length,1);
});
test('filtros e alertas respeitam limites, perfis e situação sem alterar lista original',()=>{
 const base={id:'a',slug:'alpha',name:'Alpha',active:true,createdAt:1,config:{businessType:'field',maxUsers:10,maxWarehouses:5},usage:{users:8,warehouses:1,products:2}};
 const list=[base,{...base,id:'b',name:'Beta',active:false,createdAt:2}];
 assert.equal(admin.capacityAlerts(base).length,1);assert.equal(admin.capacityAlerts(list[1]).length,0);
 assert.deepEqual(admin.filterAdminCompanies(list,'','capacity','all','name').map(c=>c.id),['a']);
 assert.deepEqual(admin.filterAdminCompanies(list,'Beta','paused','field','recent').map(c=>c.id),['b']);
 assert.equal(list[0].id,'a');
 assert.equal(admin.filterAdminCompanies([{...base,usage:{users:1,products:0,warehouses:1}}],'','onboarding','all','name').length,1);
});
test('períodos financeiros preservam viradas de mês e comparação com mesma duração',()=>{
 assert.deepEqual(f.financePeriod('30days','2026-03-01'),{from:'2026-01-31',to:'2026-03-01'});
 assert.deepEqual(f.financePeriod('month','2026-03-01'),{from:'2026-03-01',to:'2026-03-01'});
 assert.deepEqual(f.previousFinancePeriod('2024-03-01','2024-03-02'),{from:'2024-02-28',to:'2024-02-29'});
 assert.equal(f.previousFinancePeriod('',''),null);
 const days=f.financeTimeline([{date:'2026-02-02',income:500,expense:10}],'2026-02-01','2026-02-03');
 assert.equal(days.length,3);assert.equal(days[0].income,0);assert.equal(days[1].income,500);assert.equal(days[2].expense,0);
 assert.equal(f.financeTimeline([],'2026-01-01','2027-01-02').length,0);
});
test('filtros financeiros isolam pendências vencidas sem incluir pagamentos ou cancelamentos',()=>{
 const base={id:'1',companyId:'x',companyName:'Empresa Alpha',description:'Mensalidade',createdAt:1,kind:'income',amountCents:100,paidDate:'',dueDate:'2026-02-01',status:'pending'};
 const list=[base,{...base,id:'2',status:'cancelled'},{...base,id:'3',kind:'expense'},{...base,id:'4',status:'paid',paidDate:'2026-03-01'}];
 assert.deepEqual(f.filterFinanceEntries(list,'2026-02-01','2026-02-28','alpha','overdue','income','2026-02-02').map(e=>e.id),['1']);
 assert.equal(f.filterFinanceEntries(list,'2026-02-01','2026-02-28','','overdue','all','2026-02-01').length,0);
 assert.equal(list[0].id,'1');
});

test('exportação protege fórmulas e mantém aspas e linhas nos valores',()=>{
 const {adminCsv}=require(path.join(temp,'adminExport.js'));
 const csv=adminCsv([['=SUM(A1)', ' +SUM(A1)', '@cmd', 'Empresa "A"', 'Primeira\nSegunda']]);
 assert.ok(csv.startsWith('\uFEFF"\'=SUM(A1)";"\' +SUM(A1)";"\'@cmd";'));
 assert.ok(csv.includes('"Empresa ""A"""'));assert.ok(csv.includes('"Primeira\nSegunda"'));
});
