(function(root){
'use strict';
const parts=[
{id:'p1',sku:'GS-001',name:'Conector RJ45 CAT6',category:'Conectividade',unit:'un.',min:4,baseMin:25},
{id:'p2',sku:'GS-002',name:'ONU óptica XPON',category:'Equipamentos',unit:'un.',min:2,baseMin:15},
{id:'p3',sku:'GS-003',name:'Roteador Wi-Fi 6',category:'Equipamentos',unit:'un.',min:2,baseMin:12},
{id:'p4',sku:'GS-004',name:'Cordão óptico SC/APC',category:'Fibra óptica',unit:'un.',min:3,baseMin:20},
{id:'p5',sku:'GS-005',name:'Fonte 12V / 1A',category:'Elétrica',unit:'un.',min:2,baseMin:12},
{id:'p6',sku:'GS-006',name:'Splitter óptico 1:8',category:'Fibra óptica',unit:'un.',min:1,baseMin:10},
{id:'p7',sku:'GS-007',name:'Conector óptico APC',category:'Fibra óptica',unit:'un.',min:3,baseMin:20},
{id:'p8',sku:'GS-008',name:'Adaptador SC/APC',category:'Fibra óptica',unit:'un.',min:2,baseMin:12}
];
const technicians=[
{id:'t1',name:'Rafael Lima',initials:'RL',color:'mint',vehicle:'V-012',region:'Aldeota',status:'route',order:'OS-2048',client:'Clínica Horizonte',address:'Rua das Palmeiras, 240 · Aldeota',checkedAt:null},
{id:'t2',name:'Camila Santos',initials:'CS',color:'peach',vehicle:'V-008',region:'Meireles',status:'working',order:'OS-2046',client:'Edifício Atlântico',address:'Av. do Sol, 510 · Meireles',checkedAt:80},
{id:'t3',name:'Bruno Oliveira',initials:'BO',color:'blue',vehicle:'V-015',region:'Centro',status:'available',order:'OS-2051',client:'Mercado Central',address:'Rua do Comércio, 85 · Centro',checkedAt:null},
{id:'t4',name:'Juliana Rocha',initials:'JR',color:'purple',vehicle:'V-003',region:'Cocó',status:'route',order:'OS-2052',client:'Escritório Boa Vista',address:'Rua do Parque, 130 · Cocó',checkedAt:null},
{id:'t5',name:'Pedro Alves',initials:'PA',color:'mint',vehicle:'V-019',region:'Papicu',status:'working',order:'OS-2047',client:'Residencial Jardim',address:'Rua das Acácias, 60 · Papicu',checkedAt:90},
{id:'t6',name:'Ana Martins',initials:'AM',color:'peach',vehicle:'V-021',region:'Benfica',status:'offline',order:'OS-2055',client:'Escola Nova Geração',address:'Rua do Saber, 75 · Benfica',checkedAt:null}
];
function seed(now=Date.now()){
 const stock={};const balances={base:[64,42,28,36,22,18,54,26],t1:[8,4,2,5,1,2,6,3],t2:[10,3,3,4,3,1,5,4],t3:[12,5,4,6,4,2,8,4],t4:[3,4,2,5,2,1,4,3],t5:[8,1,1,4,3,2,5,2],t6:[6,3,2,2,3,1,4,3]};
 for(const [loc,qs] of Object.entries(balances))stock[loc]=Object.fromEntries(parts.map((p,i)=>[p.id,qs[i]]));
 const ts=technicians.map(t=>({...t,checkedAt:t.checkedAt?now-t.checkedAt*60000:null}));
 const movements=[
 {id:'MOV-0108',kind:'use',technician:'t2',part:'p2',qty:1,order:'OS-2046',placement:'Edifício Atlântico · apartamento 302',note:'Substituição da ONU',ts:now-8*60000},
 {id:'MOV-0107',kind:'withdraw',technician:'t1',part:'p1',qty:4,note:'Reposição para a rota da manhã',ts:now-23*60000},
 {id:'MOV-0106',kind:'arrival',technician:'t5',qty:0,order:'OS-2047',placement:'Residencial Jardim',note:'Chegada registrada pelo técnico',ts:now-90*60000},
 {id:'MOV-0105',kind:'return',technician:'t3',part:'p3',qty:1,note:'Peça não utilizada, em boas condições',ts:now-48*60000},
 {id:'MOV-0104',kind:'use',technician:'t5',part:'p4',qty:2,order:'OS-2047',placement:'Residencial Jardim · bloco B',note:'Instalação de ponto óptico',ts:now-57*60000},
 {id:'MOV-0103',kind:'withdraw',technician:'t4',part:'p5',qty:2,note:'Retirada na base Centro',ts:now-70*60000},
 {id:'MOV-0102',kind:'arrival',technician:'t2',qty:0,order:'OS-2046',placement:'Edifício Atlântico',note:'Chegada registrada pelo técnico',ts:now-80*60000},
 {id:'MOV-0101',kind:'withdraw',technician:'t3',part:'p2',qty:3,note:'Abastecimento do veículo V-015',ts:now-105*60000}
 ];
 return upgrade({version:1,stock,technicians:ts,movements:movements.sort((a,b)=>b.ts-a.ts),used:23,seq:108,demo:{},updatedAt:now});
}
function upgrade(input){
 if(input.version===2){if(input.techSeq===undefined)input.techSeq=input.technicians?input.technicians.length:0;return input;}
 if(input.version!==1)throw Error('Versão de simulação não reconhecida.');
 const s=JSON.parse(JSON.stringify(input));
 s.version=2;s.parts=parts.map(p=>({...p}));s.warehouseSeq=2;s.productSeq=parts.length;s.techSeq=s.technicians.length;
 s.warehouses=[{id:'base',code:'CTR',name:'Base Centro',city:'Fortaleza, CE',responsible:'Marina Costa',address:'Rua do Estoque, 100 · Centro'},
 {id:'w2',code:'MES',name:'Base Messejana',city:'Fortaleza, CE',responsible:'Lucas Ferreira',address:'Av. das Oficinas, 420 · Messejana'}];
 s.stock.w2=Object.fromEntries(s.parts.map(p=>[p.id,0]));
 s.locations={base:Object.fromEntries(s.parts.map((p,i)=>[p.id,{corridor:String(Math.floor(i/3)+1).padStart(2,'0'),shelf:String(i%3+1).padStart(2,'0')}])),w2:{}};
 s.movements.forEach(m=>{if(['withdraw','return'].includes(m.kind))m.warehouse='base'});
 return s;
}
function emptyState(now=Date.now()){
 return {version:2,warehouses:[],parts:[],technicians:[],stock:{},locations:{},movements:[],used:0,seq:0,warehouseSeq:0,productSeq:0,techSeq:0,demo:{},updatedAt:now};
}
function clean(value,max=300){return String(value??'').trim().slice(0,max)}
function code(value){return clean(value,50).normalize('NFKC').toUpperCase()}
function integer(value,zero=false){const n=Number(value);if(value===''||value===null||value===undefined||!Number.isSafeInteger(n)||n<(zero?0:1))throw Error('Informe uma quantidade inteira válida.');return n}
function warehouse(s,id){const w=s.warehouses.find(w=>w.id===id);if(!w)throw Error('Selecione um estoque válido.');return w}
function location(a){const corridor=code(a.corridor),shelf=code(a.shelf);if(!corridor||!shelf)throw Error('Informe o corredor e a prateleira do produto.');return {corridor,shelf}}
function updated(s,now){s.updatedAt=Math.max(now,s.updatedAt+1)}
function record(s,event,now){event.id=`MOV-${String(++s.seq).padStart(4,'0')}`;event.ts=now;s.movements.unshift(event);s.demo[event.kind]=true;updated(s,now);return event}
function saveWarehouse(s,a,now=Date.now()){
 const editing=Boolean(a.id),existing=editing?s.warehouses.find(w=>w.id===a.id):null;
 if(editing&&!existing)throw Error('Estoque não encontrado.');
 const name=clean(a.name,80),idCode=code(a.code),city=clean(a.city,100),responsible=clean(a.responsible,100),address=clean(a.address,180);
 if(!name||!idCode||!city||!responsible)throw Error('Preencha nome, código, cidade e responsável pelo estoque.');
 if(!/^[A-Z0-9-]{2,12}$/.test(idCode))throw Error('O código deve ter de 2 a 12 letras, números ou hífens.');
 if(s.warehouses.some(w=>w.id!==a.id&&code(w.code)===idCode))throw Error('Já existe um estoque com este código.');
 if(s.warehouses.some(w=>w.id!==a.id&&code(w.name)===code(name)))throw Error('Já existe um estoque com este nome.');
 if(editing){
  Object.assign(existing,{code:idCode,name,city,responsible,address});
  updated(s,now);return existing;
 }
 const w={id:`w${++s.warehouseSeq}`,code:idCode,name,city,responsible,address};
 s.warehouses.push(w);s.stock[w.id]=Object.fromEntries(s.parts.map(p=>[p.id,0]));s.locations[w.id]={};updated(s,now);return w;
}
function deleteWarehouse(s,id,now=Date.now()){
 const idx=s.warehouses.findIndex(w=>w.id===id);
 if(idx===-1)throw Error('Estoque não encontrado.');
 if(total(s,id)>0)throw Error('Não é possível excluir um estoque com peças armazenadas. Transfira ou zere o saldo antes de excluir.');
 s.warehouses.splice(idx,1);
 delete s.stock[id];
 delete s.locations[id];
 updated(s,now);
 return true;
}
function saveProduct(s,a,now=Date.now()){
 const editing=Boolean(a.id),existing=editing?s.parts.find(p=>p.id===a.id):null;
 if(editing&&!existing)throw Error('Produto não encontrado.');
 const sku=code(a.sku),name=clean(a.name,100),category=clean(a.category,60),baseMin=integer(a.baseMin,true),min=integer(a.min??0,true),w=warehouse(s,a.warehouse),slot=location(a),operator=clean(a.operator,100)||'Marina Costa';
 if(!sku||!name||!category)throw Error('Preencha código, nome e categoria do produto.');
 if(s.parts.some(p=>p.id!==a.id&&code(p.sku)===sku))throw Error('Já existe um produto com este código.');
 const qty=editing?0:integer(a.qty,true);
 let p;if(editing){p=existing;Object.assign(p,{sku,name,category,baseMin,min})}else{
  p={id:`p${++s.productSeq}`,sku,name,category,baseMin,min,unit:'un.'};s.parts.push(p);
  Object.values(s.stock).forEach(stock=>stock[p.id]=0);s.stock[w.id][p.id]=qty;
 }
 s.locations[w.id][p.id]=slot;
 if(!editing&&qty>0)record(s,{kind:'entry',part:p.id,qty,warehouse:w.id,toAddress:{...slot},note:'Saldo inicial no cadastro do produto',operator},now);
 else updated(s,now);
 return p;
}
function deleteProduct(s,id,now=Date.now()){
 const idx=s.parts.findIndex(p=>p.id===id);
 if(idx===-1)throw Error('Produto não encontrado.');
 const qty=Object.values(s.stock).reduce((sum,st)=>sum+(st[id]||0),0);
 if(qty>0)throw Error(`Não é possível excluir este produto pois ainda existem ${qty} unidades no estoque ou em campo.`);
 s.parts.splice(idx,1);
 Object.values(s.stock).forEach(st=>{delete st[id]});
 Object.values(s.locations).forEach(loc=>{delete loc[id]});
 updated(s,now);
 return true;
}
function initialsFromName(name){
 const words=clean(name,80).split(/\s+/).filter(Boolean);
 if(!words.length)return 'TC';
 if(words.length===1)return words[0].slice(0,2).toUpperCase();
 return (words[0][0]+words[words.length-1][0]).toUpperCase();
}
function saveTechnician(s,a,now=Date.now()){
 const editing=Boolean(a.id),existing=editing?s.technicians.find(t=>t.id===a.id):null;
 if(editing&&!existing)throw Error('Técnico não encontrado.');
 const name=clean(a.name,80);
 if(!name)throw Error('Informe o nome completo do técnico.');
 if(s.technicians.some(t=>t.id!==a.id&&code(t.name)===code(name)))throw Error('Já existe um técnico cadastrado com este nome.');
 const selectedWh=a.warehouse?s.warehouses.find(w=>w.id===a.warehouse):s.warehouses[0];
 const order=clean(a.order,100)||(existing?.order||'Rota do dia');
 const vehicle=clean(a.vehicle,40)||(existing?.vehicle||(selectedWh?selectedWh.code:'CAMPO'));
 const region=clean(a.region,60)||(existing?.region||(selectedWh?selectedWh.name:'Operação'));
 const client=clean(a.client,130)||(existing?.client||order);
 const address=clean(a.address,180)||(existing?.address||region);
 const colors=['mint','peach','blue','purple'];
 const color=colors.includes(a.color)?a.color:(existing?.color||colors[s.technicians.length%colors.length]);
 const loadItems=Array.isArray(a.load)?a.load.map(i=>({part:String(i.part||''),qty:Number(i.qty||0)})).filter(i=>i.part&&i.qty>0):[];
 const newParts=Array.isArray(a.newParts)?a.newParts.filter(np=>clean(np.sku)&&clean(np.name)):[];
 if((loadItems.length>0||newParts.length>0)&&!selectedWh)throw Error('Cadastre ou selecione um estoque base para retirar as peças do técnico.');
 for(const item of loadItems){
  if(!Number.isSafeInteger(item.qty)||item.qty<1)throw Error('Informe uma quantidade inteira válida para as peças da saída.');
  const p=s.parts.find(x=>x.id===item.part);if(!p)throw Error('Peça selecionada não encontrada.');
  const available=s.stock[selectedWh.id]?.[p.id]??0;
  if(item.qty>available)throw Error(`O estoque "${selectedWh.name}" possui apenas ${available} un. de "${p.name}".`);
 }
 for(const np of newParts){
  const baseQty=integer(np.baseQty,true),techQty=integer(np.techQty??0,true);
  if(techQty>baseQty)throw Error(`A quantidade levada pelo técnico em "${clean(np.name)}" não pode ser maior que o saldo inicial (${baseQty}).`);
  const skuCode=code(np.sku);
  if(s.parts.some(p=>code(p.sku)===skuCode))throw Error(`Já existe um produto com o código "${skuCode}".`);
 }
 const hasLoad=loadItems.length>0||newParts.some(np=>Number(np.techQty)>0);
 const status=['route','working','available','offline'].includes(a.status)?a.status:(existing?.status||(hasLoad||clean(a.order)?'route':'available'));
 const initials=clean(a.initials,4).toUpperCase()||initialsFromName(name);
 const operator=clean(a.operator,100)||'Marina Costa';
 let techRecord;
 if(editing){
  const checkedAt=status==='working'?(existing.checkedAt||now):null;
  Object.assign(existing,{name,initials,color,vehicle,region,status,order,client,address,checkedAt});
  techRecord=existing;updated(s,now);
 }else{
  s.techSeq=Math.max(s.techSeq||0,s.technicians.length);
  let id=`t${++s.techSeq}`;
  while(s.technicians.some(t=>t.id===id))id=`t${++s.techSeq}`;
  techRecord={id,name,initials,color,vehicle,region,status,order,client,address,checkedAt:status==='working'?now:null};
  s.technicians.push(techRecord);
  s.stock[techRecord.id]=Object.fromEntries(s.parts.map(p=>[p.id,0]));
  updated(s,now);
 }
 for(const np of newParts){
  const createdPart=saveProduct(s,{sku:np.sku,name:np.name,category:clean(np.category,60)||'Campo',warehouse:selectedWh.id,corridor:clean(np.corridor,40)||'01',shelf:clean(np.shelf,40)||'01',baseMin:2,min:1,qty:Number(np.baseQty)||0,operator},now);
  const takeQty=Number(np.techQty)||0;
  if(takeQty>0)apply(s,{kind:'withdraw',warehouse:selectedWh.id,technician:techRecord.id,part:createdPart.id,qty:takeQty,note:`Saída do dia · ${order}`,operator},now);
 }
 for(const item of loadItems){
  apply(s,{kind:'withdraw',warehouse:selectedWh.id,technician:techRecord.id,part:item.part,qty:item.qty,note:`Saída do dia · ${order}`,operator},now);
 }
 return techRecord;
}
function deleteTechnician(s,id,now=Date.now()){
 const idx=s.technicians.findIndex(t=>t.id===id);
 if(idx===-1)throw Error('Técnico não encontrado.');
 if(total(s,id)>0)throw Error('Não é possível excluir um técnico que possui peças no veículo. Devolva ou zere o saldo antes de excluir.');
 s.technicians.splice(idx,1);
 delete s.stock[id];
 updated(s,now);
 return true;
}
function apply(s,a,now=Date.now()){
 if(a.kind==='entry'){
  const w=warehouse(s,a.warehouse),p=s.parts.find(p=>p.id===a.part),qty=integer(a.qty),note=clean(a.note)||'Entrada de estoque',operator=clean(a.operator,100)||'Marina Costa';
  if(!p)throw Error('Selecione uma peça válida.');
  const current=s.stock[w.id][p.id]||0;
  if(!Number.isSafeInteger(current+qty))throw Error('A quantidade ultrapassa o limite permitido.');
  const hasSlotInput=clean(a.corridor)&&clean(a.shelf);
  const toAddress=hasSlotInput?location(a):(s.locations[w.id][p.id]||location(a));
  s.stock[w.id][p.id]=current+qty;
  s.locations[w.id][p.id]={...toAddress};
  return record(s,{kind:'entry',part:p.id,qty,warehouse:w.id,toAddress:{...toAddress},note,operator},now);
 }
 if(a.kind==='transfer'){
  const from=warehouse(s,a.from),to=warehouse(s,a.to),p=s.parts.find(p=>p.id===a.part),qty=integer(a.qty),note=clean(a.note),operator=clean(a.operator,100)||'Marina Costa';
  if(from.id===to.id)throw Error('Selecione estoques de origem e destino diferentes.');
  if(!p)throw Error('Selecione uma peça válida.');
  if(!note)throw Error('Informe o motivo da transferência.');
  const source=s.stock[from.id][p.id],destination=s.stock[to.id][p.id];
  if(qty>source)throw Error(`O estoque de origem possui apenas ${source} unidades disponíveis.`);
  if(!Number.isSafeInteger(destination+qty))throw Error('A quantidade ultrapassa o limite permitido.');
  const fromAddress=s.locations[from.id][p.id];if(!fromAddress)throw Error('Cadastre o endereço do produto no estoque de origem.');
  const toAddress=s.locations[to.id][p.id]||location(a);
  s.stock[from.id][p.id]-=qty;s.stock[to.id][p.id]+=qty;s.locations[to.id][p.id]={...toAddress};
  return record(s,{kind:'transfer',part:p.id,qty,from:from.id,to:to.id,fromAddress:{...fromAddress},toAddress:{...toAddress},note,operator},now);
 }
 const t=s.technicians.find(t=>t.id===a.technician);if(!t)throw Error('Selecione um técnico válido.');
 let event={kind:a.kind,technician:t.id,note:clean(a.note)};
 if(a.kind==='arrival'){
  if(t.status==='working')throw Error('A chegada neste atendimento já foi registrada.');
  if(!clean(a.order)||!clean(a.placement))throw Error('Informe a OS e o local de chegada.');
  event.order=clean(a.order);event.placement=clean(a.placement);
  t.status='working';t.checkedAt=now;t.order=event.order;t.client=event.placement;
 }else if(a.kind==='finish'){
  if(t.status!=='working')throw Error('Registre a chegada antes de concluir o atendimento.');
  event.order=t.order;event.placement=t.client;t.status='available';
 }else{
  const p=s.parts.find(p=>p.id===a.part);if(!p)throw Error('Selecione uma peça válida.');
  const qty=integer(a.qty,a.kind==='count'||a.kind==='departure'),own=s.stock[t.id][p.id];
  event.part=p.id;event.qty=qty;
  if(['withdraw','return'].includes(a.kind)){
   const w=warehouse(s,a.warehouse||'base'),slot=s.locations[w.id][p.id],base=s.stock[w.id][p.id];
   if(!slot)throw Error('Cadastre corredor e prateleira deste produto no estoque escolhido.');
   event.warehouse=w.id;
   if(a.kind==='withdraw'){
    if(qty>base)throw Error(`A base possui apenas ${base} unidades disponíveis.`);
    if(!Number.isSafeInteger(own+qty))throw Error('A quantidade ultrapassa o limite permitido.');
    event.fromAddress={...slot};s.stock[w.id][p.id]-=qty;s.stock[t.id][p.id]+=qty;
   }else{
    if(qty>own)throw Error(`O técnico possui apenas ${own} unidades disponíveis.`);
    if(!event.note)throw Error('Informe o motivo da devolução.');
    if(!Number.isSafeInteger(base+qty))throw Error('A quantidade ultrapassa o limite permitido.');
    event.toAddress={...slot};s.stock[t.id][p.id]-=qty;s.stock[w.id][p.id]+=qty;
   }
  }else if(a.kind==='use'){
   if(qty>own)throw Error(`O técnico possui apenas ${own} unidades disponíveis.`);
   if(!clean(a.placement))throw Error('Informe ou ative a localização de onde a peça foi utilizada.');
   event.order=clean(a.order)||t.order||'Campo';event.placement=clean(a.placement);
   t.client=event.placement;t.checkedAt=now;
   s.stock[t.id][p.id]-=qty;s.used+=qty;
  }else if(a.kind==='departure'){
   if(qty>own)throw Error(`Seu estoque possui apenas ${own} unidades disponíveis.`);
   event.order=clean(a.order)||t.order;
  }else if(a.kind==='count'){
   if(!event.note)throw Error('Informe uma justificativa para o ajuste de contagem.');
   if(qty===own)throw Error('A contagem informada é igual ao saldo atual.');
   event.before=own;event.delta=qty-own;s.stock[t.id][p.id]=qty;
  }else throw Error('Operação inválida.');
 }
 return record(s,event,now);
}
function total(s,loc){return Object.values(s.stock[loc]||{}).reduce((a,b)=>a+b,0)}
function alerts(s){return Object.entries(s.stock).flatMap(([loc,stock])=>s.parts.filter(p=>{
 const isWarehouse=s.warehouses.some(w=>w.id===loc);return (!isWarehouse||s.locations[loc]?.[p.id])&&stock[p.id]<(isWarehouse?p.baseMin:p.min);
 }).map(p=>({loc,part:p.id,qty:stock[p.id],min:s.warehouses.some(w=>w.id===loc)?p.baseMin:p.min})));}
const api={parts,seed,emptyState,upgrade,apply,total,alerts,saveWarehouse,deleteWarehouse,saveProduct,deleteProduct,saveTechnician,deleteTechnician};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GridStock=api;
})(typeof window!=='undefined'?window:globalThis);
