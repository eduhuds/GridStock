const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../dist/domain.js');
const sum=s=>Object.values(s.stock).reduce((a,x)=>a+Object.values(x).reduce((a,b)=>a+b,0),0);
function rejectsWithoutMutation(s,a,re){const before=JSON.stringify(s);assert.throws(()=>G.apply(s,a),re);assert.equal(JSON.stringify(s),before)}
test('fluxo completo: retirada, chegada, uso rastreado e devolução conservam o estoque',()=>{
 const s=G.seed(),start=sum(s),own=s.stock.t1.p1,base=s.stock.base.p1;
 G.apply(s,{kind:'withdraw',technician:'t1',part:'p1',qty:2});assert.equal(sum(s),start);assert.equal(s.stock.t1.p1,own+2);assert.equal(s.stock.base.p1,base-2);
 G.apply(s,{kind:'arrival',technician:'t1',order:'OS-2048',placement:'Clínica Horizonte'},1000);assert.equal(s.technicians[0].status,'working');assert.equal(s.technicians[0].checkedAt,1000);
 const use=G.apply(s,{kind:'use',technician:'t1',part:'p1',qty:1,order:'OS-2048',placement:'Clínica Horizonte · rack 02'});assert.equal(sum(s),start-1);assert.equal(use.placement,'Clínica Horizonte · rack 02');assert.equal(use.order,'OS-2048');
 G.apply(s,{kind:'return',technician:'t1',part:'p1',qty:1,note:'Sobra em bom estado'});assert.equal(sum(s),start-1);assert.equal(s.stock.t1.p1,own);assert.equal(s.stock.base.p1,base-1);
 assert.equal(new Set(s.movements.map(m=>m.id)).size,s.movements.length);assert.deepEqual(s.demo,{withdraw:true,arrival:true,use:true,return:true});
});
test('retirada acima do saldo é rejeitada sem alterar o estado',()=>{const s=G.seed();rejectsWithoutMutation(s,{kind:'withdraw',technician:'t1',part:'p1',qty:999},/base possui/)});
test('devolução acima do saldo é rejeitada sem alterar o estado',()=>{const s=G.seed();rejectsWithoutMutation(s,{kind:'return',technician:'t1',part:'p1',qty:999,note:'teste'},/técnico possui/)});
test('uso direto do estoque pessoal exige localização de onde a peça foi utilizada',()=>{const s=G.seed();rejectsWithoutMutation(s,{kind:'use',technician:'t1',part:'p1',qty:1,order:'OS-1'},/onde a peça/);rejectsWithoutMutation(s,{kind:'use',technician:'t1',part:'p1',qty:999,order:'OS-1',placement:'rack'},/técnico possui/);const u=G.apply(s,{kind:'use',technician:'t1',part:'p1',qty:1,placement:'Av. Beira Mar, 100 [GPS: -3.72, -38.50]'});assert.equal(u.placement,'Av. Beira Mar, 100 [GPS: -3.72, -38.50]')});
test('quantidades inválidas nunca alteram saldos',()=>{for(const qty of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){const s=G.seed();rejectsWithoutMutation(s,{kind:'withdraw',technician:'t1',part:'p1',qty},/inteira válida/)}});
test('devolução e contagem exigem justificativa',()=>{const s=G.seed();for(const kind of ['return','count'])rejectsWithoutMutation(s,{kind,technician:'t1',part:'p1',qty:1},/motivo|justificativa/)});
test('contagem registra saldo anterior, diferença e aceita zero',()=>{const s=G.seed(),before=s.stock.t1.p1,base=s.stock.base.p1;const m=G.apply(s,{kind:'count',technician:'t1',part:'p1',qty:0,note:'Conferência física'});assert.equal(m.before,before);assert.equal(m.delta,-before);assert.equal(s.stock.t1.p1,0);assert.equal(s.stock.base.p1,base);assert(G.alerts(s).some(a=>a.loc==='t1'&&a.part==='p1'))});
test('chegada duplicada é bloqueada e conclusão libera técnico',()=>{const s=G.seed();G.apply(s,{kind:'arrival',technician:'t1',order:'OS-1',placement:'Cliente'});rejectsWithoutMutation(s,{kind:'arrival',technician:'t1',order:'OS-1',placement:'Cliente'},/já foi/);G.apply(s,{kind:'finish',technician:'t1'});assert.equal(s.technicians[0].status,'available')});
test('movimentar um técnico preserva os demais',()=>{const s=G.seed(),other=JSON.stringify(s.stock.t2);G.apply(s,{kind:'withdraw',technician:'t1',part:'p1',qty:2});assert.equal(JSON.stringify(s.stock.t2),other)});
test('migração da versão anterior preserva saldos e registros sem alterar a entrada',()=>{
 const old=G.seed();old.version=1;for(const key of ['parts','warehouses','locations','warehouseSeq','productSeq'])delete old[key];delete old.stock.w2;const before=JSON.stringify(old),s=G.upgrade(old);assert.equal(JSON.stringify(old),before);assert.equal(s.version,2);assert.deepEqual(s.stock.t1,old.stock.t1);assert.equal(s.stock.base.p1,64);assert.equal(s.movements.length,old.movements.length);assert.deepEqual(G.upgrade(s),s);
});
test('cadastro de estoque começa vazio e rejeita código duplicado',()=>{
 const s=G.seed(),before=sum(s);const w=G.saveWarehouse(s,{name:'Base Parangaba',code:'prg',city:'Fortaleza, CE',responsible:'Teste'});assert.equal(w.code,'PRG');assert.equal(G.total(s,w.id),0);assert.equal(sum(s),before);assert.equal(Object.keys(s.stock[w.id]).length,s.parts.length);const snapshot=JSON.stringify(s);assert.throws(()=>G.saveWarehouse(s,{name:'Outra base',code:'prg',city:'Fortaleza',responsible:'Teste'}),/código/);assert.equal(JSON.stringify(s),snapshot);
});
test('produto novo possui endereço obrigatório e código único sem duplicar saldos',()=>{
 const s=G.seed(),before=sum(s),input={sku:'GS-009',name:'Toner de teste',category:'Suprimentos',warehouse:'base',corridor:'a',shelf:'03',baseMin:2,min:0,qty:10};const snapshot=JSON.stringify(s);assert.throws(()=>G.saveProduct(s,{...input,corridor:''}),/corredor/);assert.equal(JSON.stringify(s),snapshot);const p=G.saveProduct(s,input);assert.equal(sum(s),before+10);assert.equal(s.stock.base[p.id],10);assert.equal(s.stock.t1[p.id],0);assert.deepEqual(s.locations.base[p.id],{corridor:'A',shelf:'03'});assert.equal(s.movements[0].kind,'entry');assert(!G.alerts(s).some(a=>a.loc==='w2'&&a.part===p.id));const saved=JSON.stringify(s);assert.throws(()=>G.saveProduct(s,{...input,sku:'gs-009'}),/código/);assert.equal(JSON.stringify(s),saved);
});
test('transferência conserva total e registra origem, destino e endereços independentes',()=>{
 const s=G.seed(),before=sum(s),from=s.stock.base.p1,to=s.stock.w2.p1;const m=G.apply(s,{kind:'transfer',from:'base',to:'w2',part:'p1',qty:5,corridor:'B',shelf:'02',note:'Reposição'});assert.equal(sum(s),before);assert.equal(s.stock.base.p1,from-5);assert.equal(s.stock.w2.p1,to+5);assert.equal(m.from,'base');assert.equal(m.to,'w2');assert.deepEqual(m.toAddress,{corridor:'B',shelf:'02'});assert.deepEqual(s.locations.base.p1,{corridor:'01',shelf:'01'});
 G.saveProduct(s,{...s.parts[0],warehouse:'w2',corridor:'C',shelf:'04'});assert.deepEqual(m.toAddress,{corridor:'B',shelf:'02'});assert.deepEqual(s.locations.w2.p1,{corridor:'C',shelf:'04'});assert.equal(sum(s),before);
});
test('transferências inválidas não alteram nenhum saldo nem histórico',()=>{
 const s=G.seed(),a={kind:'transfer',from:'base',to:'w2',part:'p1',qty:5,corridor:'B',shelf:'02',note:'Teste'};
 for(const [change,re] of [[{to:'base'},/diferentes/],[{qty:999},/origem possui/],[{qty:0},/inteira/],[{qty:1.5},/inteira/],[{corridor:''},/corredor/],[{shelf:''},/prateleira/],[{note:''},/motivo/],[{from:'inválido'},/estoque válido/]])rejectsWithoutMutation(s,{...a,...change},re);
});
test('transferência usa endereço existente sem substituí-lo',()=>{
 const s=G.seed();G.apply(s,{kind:'transfer',from:'base',to:'w2',part:'p1',qty:2,corridor:'B',shelf:'02',note:'Primeiro envio'});G.apply(s,{kind:'transfer',from:'base',to:'w2',part:'p1',qty:1,corridor:'Z',shelf:'99',note:'Reposição'});assert.deepEqual(s.locations.w2.p1,{corridor:'B',shelf:'02'});assert.equal(s.stock.w2.p1,3);
});
test('técnico retira e devolve no estoque escolhido sem afetar a base Centro',()=>{
 const s=G.seed();G.apply(s,{kind:'transfer',from:'base',to:'w2',part:'p1',qty:5,corridor:'B',shelf:'02',note:'Reposição'});const base=s.stock.base.p1,own=s.stock.t1.p1,total=sum(s);G.apply(s,{kind:'withdraw',warehouse:'w2',technician:'t1',part:'p1',qty:2});assert.equal(s.stock.w2.p1,3);assert.equal(s.stock.t1.p1,own+2);G.apply(s,{kind:'return',warehouse:'w2',technician:'t1',part:'p1',qty:1,note:'Sobra'});assert.equal(s.stock.w2.p1,4);assert.equal(s.stock.base.p1,base);assert.equal(sum(s),total);assert.equal(s.movements[0].warehouse,'w2');
});
test('editar produto e endereçar outra base não altera quantidades',()=>{
 const s=G.seed(),p=s.parts[0],stock=JSON.stringify(s.stock);G.saveProduct(s,{...p,name:'Conector atualizado',warehouse:'w2',corridor:'D',shelf:'05',qty:100});assert.equal(JSON.stringify(s.stock),stock);assert.equal(s.parts.length,8);assert.equal(s.parts[0].name,'Conector atualizado');assert.deepEqual(s.locations.w2.p1,{corridor:'D',shelf:'05'});assert.deepEqual(s.locations.base.p1,{corridor:'01',shelf:'01'});
});
test('estado limpo (emptyState) permite cadastrar estoque, produto, entrada adicional, técnico e movimentar do zero',()=>{
 const s=G.emptyState();
 assert.equal(s.warehouses.length,0);assert.equal(s.parts.length,0);assert.equal(s.technicians.length,0);
 const w=G.saveWarehouse(s,{name:'Almoxarifado Matriz',code:'MTZ',city:'Fortaleza, CE',responsible:'Carlos'});
 const p=G.saveProduct(s,{sku:'CAB-100',name:'Cabo Drop 1FO',category:'Fibra óptica',warehouse:w.id,corridor:'01',shelf:'02',baseMin:5,min:1,qty:10,operator:'Carlos'});
 G.apply(s,{kind:'entry',warehouse:w.id,part:p.id,qty:5,note:'NF 123',operator:'Carlos'});
 assert.equal(s.stock[w.id][p.id],15);
 const t=G.saveTechnician(s,{name:'Diego Souza',vehicle:'V-101',region:'Sul',color:'blue',order:'OS-900',client:'Condomínio Mar'});
 assert.equal(t.initials,'DS');assert.equal(s.stock[t.id][p.id],0);
 G.apply(s,{kind:'withdraw',warehouse:w.id,technician:t.id,part:p.id,qty:3});
 assert.equal(s.stock[w.id][p.id],12);assert.equal(s.stock[t.id][p.id],3);
 assert.throws(()=>G.deleteTechnician(s,t.id),/possui peças/);
 assert.throws(()=>G.deleteProduct(s,p.id),/unidades/);
 assert.throws(()=>G.deleteWarehouse(s,w.id),/peças armazenadas/);
 G.apply(s,{kind:'return',warehouse:w.id,technician:t.id,part:p.id,qty:3,note:'Devolução total'});
 G.deleteTechnician(s,t.id);
 assert.equal(s.technicians.length,0);
});
test('cadastrar técnico com saída do dia transfere peças existentes e cria peças inline',()=>{
 const s=G.seed(),baseP1=s.stock.base.p1;
 const t=G.saveTechnician(s,{
  name:'Lucas Andrade',
  order:'OS-3010',
  warehouse:'base',
  load:[{part:'p1',qty:4}],
  newParts:[{sku:'NEW-900',name:'Conector SC/APC',category:'Fibra',corridor:'A2',shelf:'P04',baseQty:10,techQty:3}]
 });
 assert.equal(t.name,'Lucas Andrade');
 assert.equal(t.status,'route');
 assert.equal(s.stock.base.p1,baseP1-4);
 assert.equal(s.stock[t.id].p1,4);
 const createdPart=s.parts.find(p=>p.sku==='NEW-900');
 assert(createdPart);
 assert.equal(s.stock.base[createdPart.id],7);
 assert.equal(s.stock[t.id][createdPart.id],3);
});
