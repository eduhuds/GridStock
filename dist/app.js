(()=>{'use strict';
const G=window.GridStock,KEY='gridstock-demo-v1',TOKEN_KEY='gridstock-auth-token',app=document.getElementById('app'),modalRoot=document.getElementById('modal-root');
const paths={grid:'<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',box:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>',arrows:'<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',chevron:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',check:'<path d="m5 12 4 4L19 6"/>',shield:'<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z"/><path d="m8 12 3 3 5-6"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',alert:'<path d="m10.3 4-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',reset:'<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',help:'<rect x="4" y="3" width="16" height="19" rx="2"/><path d="M9 3v5h6V3M8 13h8M8 17h5"/>',van:'<path d="M3 5h11v12H3zM14 9h4l3 4v4h-7"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/>',out:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',in:'<path d="M12 16V4m-4 4 4-4 4 4M4 15v6h16v-6"/>',tool:'<path d="M14.7 6.3a5.5 5.5 0 0 0-7-2.8l3.1 3.1-3.7 3.7L4 7.2a5.5 5.5 0 0 0 7.1 7.1l7 7a2 2 0 0 0 2.8-2.8l-7-7a5.5 5.5 0 0 0 .8-5.2Z"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',edit:'<path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5"/>',route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h7"/>',logout:'<path d="M9 21H4V3h5M13 8l5 4-5 4M9 12h12"/>',trash:'<path d="M3 6h18M8 6V4h8v2m-9 0v14h10V6"/>'};
function icon(n){return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[n]||paths.box}</svg>`}
function e(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function loadLocal(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&[1,2].includes(s.version)&&s.stock&&s.technicians&&s.movements&&s.demo)return G.upgrade(s);}catch{}return G.emptyState()}

let state=loadLocal(),users=[],currentUser=null,apiOnline=true,authToken=localStorage.getItem(TOKEN_KEY)||'';
let view='ops',page='overview',techId='t1',query='',filterKind='',filterTech='',filterLoc='',filterCategory='',lowOnly=false,modalType=null,lastFocus=null,toastTimer;

const statusMap={route:['A caminho','blue'],working:['Em atendimento','green'],available:['Disponível','amber'],offline:['Fora de turno','']};
const kindMap={withdraw:['Retirada','green','out'],return:['Devolução','blue','in'],use:['Utilização','amber','tool'],count:['Ajuste','purple','edit'],arrival:['Chegada','green','pin'],finish:['Conclusão','','check'],transfer:['Transferência','purple','arrows'],entry:['Entrada de estoque','green','box']};

const part=id=>state.parts.find(p=>p.id===id),tech=id=>state.technicians.find(t=>t.id===id);
function current(){
 if(currentUser?.role==='tech'&&currentUser.technicianId){
  const linked=tech(currentUser.technicianId);
  if(linked)return linked;
 }
 const found=tech(techId)||state.technicians[0]||null;
 if(found)techId=found.id;
 return found;
}
const n=v=>Number(v||0).toLocaleString('pt-BR');
const warehouseById=id=>state.warehouses.find(w=>w.id===id),isWarehouse=id=>Boolean(warehouseById(id)),locName=id=>warehouseById(id)?.name||tech(id)?.name||'—';
const slotLabel=slot=>slot?`Corredor ${slot.corridor} · Prateleira ${slot.shelf}`:'Sem endereço cadastrado';
const warehousesTotal=()=>state.warehouses.reduce((v,w)=>v+G.total(state,w.id),0);
const time=ts=>new Date(ts||Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Fortaleza'});
const date=ts=>new Date(ts||Date.now()).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'America/Fortaleza'});
function badge(label,color='',dot=false){return `<span class="badge ${color}">${dot?'<i class="dot"></i>':''}${e(label)}</span>`}
function status(t){if(!t)return '';const [label,color]=statusMap[t.status]||statusMap.available;return badge(label,color,true)}
function avatar(t){if(!t)return `<div class="avatar mint">OP</div>`;return `<div class="avatar ${t.color||'mint'}">${e(t.initials||'TC')}</div>`}
function totalAll(){return Object.keys(state.stock||{}).reduce((s,l)=>s+G.total(state,l),0)}
function persistLocal(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function toast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4200)}

async function apiRequest(method,url,body){
 const headers={'Content-Type':'application/json'};
 if(authToken)headers['Authorization']=`Bearer ${authToken}`;
 const res=await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>({}));
 if(res.status===401&&url!=='/api/auth/login'){
  authToken='';localStorage.removeItem(TOKEN_KEY);currentUser=null;renderLogin();
  throw Error(data.error||'Sua sessão expirou. Entre novamente.');
 }
 if(!res.ok)throw Error(data.error||'Não foi possível concluir a operação.');
 return data;
}

function applySession(data){
 if(data.token){authToken=data.token;localStorage.setItem(TOKEN_KEY,authToken);}
 if(data.user)currentUser=data.user;
 if(data.state){state=data.state;persistLocal();}
 if(data.users)users=data.users;
 if(currentUser?.role==='tech'){
  view='tech';
  if(currentUser.technicianId)techId=currentUser.technicianId;
  if(!['overview','stock','movements'].includes(page))page='overview';
 }else if(state.technicians.length&&!tech(techId)){
  techId=state.technicians[0].id;
 }
}

function renderLogin(errorMsg=''){
 closeModal();
 app.innerHTML=`<div class="login-shell">
  <aside class="login-aside">
   <div class="brand"><div class="brand-mark"><i></i><i></i><i></i><i></i></div><span>gridstock</span></div>
   <div class="login-hero">
    <span class="eyebrow" style="color:var(--lime)">OPERAÇÃO E CAMPO EM TEMPO REAL</span>
    <h1>Controle físico de estoques, endereços e equipe técnica.</h1>
    <p>Rastreabilidade ponta a ponta: do corredor e prateleira do almoxarifado até o veículo do técnico e a aplicação na Ordem de Serviço.</p>
    <div class="login-highlights">
     <div class="login-highlight"><strong>Multiestoques</strong><span>Endereçamento independente por corredor e prateleira em cada base.</span></div>
     <div class="login-highlight"><strong>Equipe em campo</strong><span>Retiradas, chegadas, aplicações em OS, contagens e devoluções.</span></div>
    </div>
   </div>
   <div class="small" style="color:#8da396">GridStock · Sistema de Gestão de Estoque em Movimento</div>
  </aside>
  <main class="login-main">
   <form class="login-card" id="login-form">
    <h2>Acessar o GridStock</h2>
    <p>Entre com suas credenciais de Controle Operacional ou de Técnico em campo.</p>
    <div class="error" id="login-error" role="alert">${e(errorMsg)}</div>
    <div class="field">
     <label for="login-user">Usuário</label>
     <input class="input" id="login-user" name="username" placeholder="Ex.: admin" autocomplete="username" required>
    </div>
    <div class="field">
     <label for="login-pass">Senha</label>
     <input class="input" id="login-pass" name="password" type="password" placeholder="Sua senha de acesso" autocomplete="current-password" required>
    </div>
    <button class="button full" type="submit" id="login-submit">${icon('check')}Entrar no sistema</button>
    <div class="login-hint">
     No painel operacional você pode cadastrar novos usuários e criar logins individuais para os técnicos.
    </div>
   </form>
  </main>
 </div>`;
 const form=document.getElementById('login-form');
 form.querySelector('#login-user')?.focus();
 form.onsubmit=async ev=>{
  ev.preventDefault();
  const btn=document.getElementById('login-submit'),errEl=document.getElementById('login-error');
  errEl.textContent='';btn.disabled=true;
  try{
   const fd=Object.fromEntries(new FormData(form));
   const data=await apiRequest('POST','/api/auth/login',fd);
   applySession(data);
   view=currentUser.role==='tech'?'tech':'ops';
   page='overview';
   clearFilters();
   render();
   toast(`Bem-vindo, ${currentUser.name}.`);
  }catch(err){
   errEl.textContent=err.message;
   btn.disabled=false;
  }
 };
}

function action(kind,tid=techId,pid='',wid=''){openMovement(kind,tid,pid,wid||state.warehouses[0]?.id||'base')}
function nav(label,ico,p,count=''){return `<button class="nav-button ${page===p?'active':''}" data-page="${p}">${icon(ico)}<span>${label}</span>${count!==''?`<span class="nav-count">${count}</span>`:''}</button>`}

function render(){
 if(apiOnline&&!currentUser){renderLogin();return;}
 if(currentUser?.role==='tech'){view='tech';if(currentUser.technicianId)techId=currentUser.technicianId;}
 const t=current(),ops=view==='ops',isOpsUser=!currentUser||currentUser.role==='ops';
 const title=ops?({overview:'Visão geral',stock:'Inventário',warehouses:'Estoques',products:'Produtos',movements:'Movimentações',team:'Equipe em campo'}[page]||'Visão geral'):({overview:'Minha jornada',stock:'Meu estoque',movements:'Minhas movimentações'}[page]||'Minha jornada');
 const userInitials=ops?(currentUser?.name?currentUser.name.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase():'OP'):(t?.initials||'TC');
 const userName=ops?(currentUser?.name||'Controle Operacional'):(t?.name||currentUser?.name||'Técnico');
 const userRoleLabel=ops?'Controle operacional':(t?.vehicle?`Técnico · ${t.vehicle}`:'Técnico em campo');

 app.innerHTML=`<div class="app-shell"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark"><i></i><i></i><i></i><i></i></div><span>gridstock</span></div><div class="workspace"><div class="workspace-icon">${icon('box')}</div><div><strong>Rede de estoques</strong><small>${state.warehouses.length} ${state.warehouses.length===1?'estoque ativo':'estoques ativos'} · Online</small></div></div><div class="nav-label">${ops?'OPERAÇÃO':'ESPAÇO DO TÉCNICO'}</div><nav class="nav">${nav(ops?'Visão geral':'Minha jornada','grid','overview')}${ops?nav('Estoques','box','warehouses',state.warehouses.length):''}${nav(ops?'Inventário':'Meu estoque','grid','stock')}${ops?nav('Produtos','box','products',state.parts.length):''}${nav(ops?'Movimentações':'Minhas movimentações','arrows','movements')}${ops?nav('Equipe em campo','users','team',state.technicians.length):''}</nav><div class="sidebar-help">${icon('shield')}<strong>${isOpsUser?'Administração e acessos':'Operação rastreada'}</strong><p>${isOpsUser?'Gerencie usuários, logins da equipe e manutenção do banco de dados.':'Registre chegadas, aplicações em OS e devoluções em tempo real.'}</p>${isOpsUser?`<button data-action="system">Acessos e banco de dados ${icon('arrow')}</button>`:`<button data-action="logout">Encerrar sessão ${icon('logout')}</button>`}</div><div class="profile">${avatar(ops?{initials:userInitials,color:'mint'}:t)}<div><strong>${e(userName)}</strong><small>${e(userRoleLabel)}</small></div><button class="icon-button" data-action="logout" title="Sair da conta" aria-label="Sair da conta" style="margin-left:auto;border-color:#344d40;color:#b6c6bc">${icon('logout')}</button></div></aside><main class="main"><header class="topbar"><button class="icon-button mobile-menu" data-action="menu" aria-label="Abrir navegação">${icon('menu')}</button><div class="breadcrumb">Controle de estoque ${icon('chevron')}<strong>${title}</strong></div><div class="top-actions">${isOpsUser?`<div class="view-switch" aria-label="Escolher visão"><button data-view="ops" class="${ops?'active':''}" aria-pressed="${ops}">${icon('grid')}Operação</button><button data-view="tech" class="${!ops?'active':''}" aria-pressed="${!ops}">${icon('van')}Técnico em campo</button></div>`:badge(userRoleLabel,'green',true)}<button class="icon-button" data-action="alerts" title="Ver alertas de estoque mínimo" aria-label="Ver alertas de estoque">${icon('bell')}</button>${isOpsUser?`<button class="icon-button" data-action="system" title="Acessos e banco de dados" aria-label="Configurações do sistema">${icon('users')}</button>`:''}<div class="avatar top-avatar">${e(userInitials)}</div></div></header><div class="content">${ops?opsPage():techPage()}<footer class="footer"><span>GridStock <span>© 2026</span> · Gestão de Estoque e Operação de Campo</span><span><i class="live-dot"></i> Banco de dados sincronizado · ${time(state.updatedAt)}</span></footer></div></main></div>`;

 app.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
 app.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(currentUser?.role==='tech')return;view=b.dataset.view;page='overview';clearFilters();render()});
 app.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>handle(b.dataset.action,b.dataset));
 const selector=document.getElementById('technician-select');if(selector)selector.onchange=()=>{techId=selector.value;clearFilters();render()};
 bindFilters();
}

function clearFilters(){query='';filterKind='';filterTech='';filterLoc='';filterCategory='';lowOnly=false}
function navigate(p){page=p;clearFilters();render();window.scrollTo({top:0,behavior:'smooth'})}

async function handle(a,d){
 if(a==='menu')document.getElementById('sidebar')?.classList.toggle('open');
 else if(a==='logout'){
  try{if(apiOnline)await apiRequest('POST','/api/auth/logout');}catch{}
  authToken='';localStorage.removeItem(TOKEN_KEY);currentUser=null;renderLogin();toast('Sessão encerrada.');
 }
 else if(a==='system')systemModal();
 else if(a==='seed-load')confirmDatabaseReset('seed');
 else if(a==='db-clear')confirmDatabaseReset('empty');
 else if(a==='warehouse-new')warehouseForm();
 else if(a==='warehouse-edit')warehouseForm(d.warehouse);
 else if(a==='product-new')productForm();
 else if(a==='product-edit')productForm(d.part);
 else if(a==='tech-new')techForm();
 else if(a==='tech-edit')techForm(d.tech);
 else if(a==='transfer')transferForm(d.from||state.warehouses[0]?.id||'base',d.to||'',d.part||'');
 else if(a==='warehouse-stock'){page='stock';clearFilters();filterLoc=d.warehouse;render()}
 else if(a==='alerts'){page='stock';clearFilters();lowOnly=true;render();toast('Exibindo peças abaixo do estoque mínimo.')}
 else if(a==='move')action(d.kind||'withdraw',d.tech||techId,d.part||'',d.warehouse||state.warehouses[0]?.id||'base');
 else if(a==='arrival')arrival(d.tech||techId);
 else if(a==='finish')finish(d.tech||techId);
 else if(a==='detail')detail(d.tech);
 else if(a==='all-moves')navigate('movements');
 else if(a==='all-team')navigate('team');
 else if(a==='export')exportCSV();
}

function heading(title,subtitle,actions=''){return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`}
function stat(label,value,foot,ico,cls=''){return `<div class="stat-card ${cls}"><div class="stat-top">${label}<span class="stat-icon">${icon(ico)}</span></div><div class="stat-value mono">${value}</div><div class="stat-foot">${foot}</div></div>`}

function opsStats(){
 const on=state.technicians.filter(t=>['route','working'].includes(t.status)).length,al=G.alerts(state),tot=totalAll(),whTot=warehousesTotal();
 return `<div class="stats">${stat('Peças em estoque',n(tot),`<span class="green">${n(whTot)} nos estoques</span> · ${n(tot-whTot)} em campo`,'box','featured')}${stat('Técnicos em campo',String(on).padStart(2,'0'),`${state.technicians.filter(t=>t.status==='working').length} em atendimento · ${state.technicians.filter(t=>t.status==='route').length} a caminho`,'users')}${stat('Movimentações',n(state.movements.filter(m=>m.part).length),`<span class="green">${state.movements.filter(m=>m.kind==='use').length} utilizações</span> registradas no histórico`,'arrows')}${stat('Saldos em atenção',String(al.length).padStart(2,'0'),`${new Set(al.filter(a=>!isWarehouse(a.loc)).map(a=>a.loc)).size} técnicos com peças abaixo do mínimo`,'alert',al.length?'alert':'')}</div>`;
}

function setupPanel(){
 const hasW=state.warehouses.length>0,hasP=state.parts.length>0,hasT=state.technicians.length>0;
 if(hasW&&hasP&&hasT)return '';
 return `<section class="setup-panel">
  <div class="setup-head">
   <div>
    <h2>Configuração da Operação</h2>
    <p>Cadastre os dados reais da sua operação abaixo ou carregue uma base de demonstração para explorar.</p>
   </div>
   <button class="button secondary" data-action="seed-load">${icon('box')}Carregar base de exemplo</button>
  </div>
  <div class="setup-grid">
   <div class="setup-step ${hasW?'done':''}">
    <div>
     <div class="setup-step-top"><span>PASSO 1</span>${hasW?badge(`${state.warehouses.length} cadastrado(s)`,'green'):badge('Pendente','amber')}</div>
     <h3>Estoques / Almoxarifados</h3>
     <p>Cadastre suas bases físicas com código, cidade, endereço e responsável.</p>
    </div>
    <button class="button ${hasW?'secondary':''}" data-action="warehouse-new">${icon('plus')}Cadastrar estoque</button>
   </div>
   <div class="setup-step ${hasP?'done':''}">
    <div>
     <div class="setup-step-top"><span>PASSO 2</span>${hasP?badge(`${state.parts.length} cadastrado(s)`,'green'):badge('Pendente','amber')}</div>
     <h3>Catálogo de Produtos</h3>
     <p>Registre SKUs únicos, estoque mínimo, saldo inicial, corredor e prateleira.</p>
    </div>
    <button class="button ${hasP?'secondary':''}" data-action="product-new">${icon('plus')}Cadastrar produto</button>
   </div>
   <div class="setup-step ${hasT?'done':''}">
    <div>
     <div class="setup-step-top"><span>PASSO 3</span>${hasT?badge(`${state.technicians.length} cadastrado(s)`,'green'):badge('Pendente','amber')}</div>
     <h3>Equipe em Campo</h3>
     <p>Cadastre seus técnicos, veículos, regiões de atendimento e credenciais de acesso.</p>
    </div>
    <button class="button ${hasT?'secondary':''}" data-action="tech-new">${icon('plus')}Cadastrar técnico</button>
   </div>
  </div>
 </section>`;
}

function opsPage(){if(page==='overview')return overview();if(page==='stock')return stockPage();if(page==='movements')return movementsPage();if(page==='team')return teamPage();if(page==='warehouses')return warehousesPage();if(page==='products')return productsPage();return overview()}

function overview(){
 const al=G.alerts(state),tot=totalAll(),whTot=warehousesTotal(),whPct=tot>0?Math.round(whTot/tot*100):0,fieldPct=tot>0?Math.round((tot-whTot)/tot*100):0;
 return `${heading('Visão geral','Tudo o que está nos estoques e em campo, em um só lugar.',`<span class="date-chip">${icon('calendar')}${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',timeZone:'America/Fortaleza'})}</span><button class="button" data-action="move">${icon('plus')}Registrar movimentação</button>`)}${setupPanel()}${opsStats()}<div class="grid-main"><section class="panel"><div class="panel-head"><div><h2>Onde está o estoque</h2><p>Distribuição de peças por localização</p></div>${badge(`${n(tot)} peças`,'')}</div><div class="stock-dist">${distribution()}<div class="dist-summary"><span><strong>${whPct}%</strong> nos estoques</span><span><strong>${fieldPct}%</strong> em campo</span><span>Saldos em tempo real</span></div></div></section><section class="panel"><div class="panel-head"><div><h2>Equipe em movimento</h2><p>Situação atual dos técnicos</p></div><button class="text-link" data-action="all-team">Ver equipe ${icon('arrow')}</button></div><div class="team-list">${state.technicians.length?state.technicians.slice(0,5).map(t=>`<button class="team-row" data-action="detail" data-tech="${t.id}">${avatar(t)}<div class="team-info"><strong>${e(t.name)}</strong><small>${e(t.vehicle)} · ${e(t.region)}</small></div>${status(t)}${icon('chevron')}</button>`).join(''):`<div class="empty" style="padding:28px 10px"><p>Nenhum técnico cadastrado.</p><button class="button secondary" style="margin-top:10px" data-action="tech-new">${icon('plus')}Cadastrar técnico</button></div>`}</div></section></div>${al.length?`<div class="notice">${icon('alert')}<span><strong>${al.length} saldos abaixo do mínimo.</strong> Confira as peças que precisam de reposição.</span><button class="text-link" data-action="alerts">Ver alertas ${icon('arrow')}</button></div>`:''}<section class="panel"><div class="panel-head"><div><h2>Últimas movimentações</h2><p>Rastreabilidade completa de cada operação realizada.</p></div><button class="text-link" data-action="all-moves">Ver todas ${icon('arrow')}</button></div>${movementTable(state.movements.slice(0,5))}<div class="table-footer"><span>Últimos ${Math.min(5,state.movements.length)} de ${state.movements.length} registros</span><span>Horário de Fortaleza · UTC−3</span></div></section>`;
}

function distribution(){
 const colors=['#567c48','#91a979','#b1c497','#c7d5b4','#a5bc90','#d2dec3','#dde5d4'],locs=[...state.warehouses.map(w=>w.id),...state.technicians.map(t=>t.id)];
 if(!locs.length)return `<div class="empty" style="padding:24px 0"><p>Cadastre estoques e técnicos para visualizar a distribuição de peças.</p></div>`;
 const max=Math.max(1,...locs.map(l=>G.total(state,l)));
 return locs.map((l,i)=>`<div class="dist-row" style="--c:${colors[i%colors.length]}"><span class="dist-label" title="${e(locName(l))}"><i></i>${e(locName(l))}</span><div class="bar-track"><div class="bar-fill" style="width:${G.total(state,l)/max*100}%"></div></div><span class="dist-value mono">${n(G.total(state,l))}</span></div>`).join('');
}

function movementTable(rows){
 return rows.length?`<div class="table-wrap"><table><thead><tr><th>Peça / registro</th><th>Responsável</th><th>Movimentação</th><th>Qtd.</th><th>Local / destino</th><th>Data e hora</th></tr></thead><tbody>${rows.map(m=>{const p=part(m.part),t=tech(m.technician),k=kindMap[m.kind]||['Registro','','box'],qty=m.kind==='count'?`${m.delta>0?'+':''}${m.delta}`:m.kind==='transfer'?`↔ ${m.qty}`:m.part?`${['use','return'].includes(m.kind)?'−':'+'}${m.qty}`:'—';const tFirst=t?t.name.split(' ')[0]:'Técnico';let destination=m.kind==='transfer'?locName(m.from)+' → '+locName(m.to):m.kind==='withdraw'?locName(m.warehouse||'base')+' → '+tFirst:m.kind==='return'?tFirst+' → '+locName(m.warehouse||'base'):m.kind==='entry'?locName(m.warehouse):m.kind==='count'?m.before+' → '+m.qty+' un. · '+m.note:m.placement||'—';let sub=m.order||((m.toAddress||m.fromAddress)?slotLabel(m.toAddress||m.fromAddress):'');return `<tr><td><div class="cell-main"><span class="item-icon">${icon(p?'box':k[2])}</span><div><strong>${e(p?p.name:k[0]+' no atendimento')}</strong><span class="cell-sub">${e(p?p.sku:(m.order||'OS'))} · ${e(m.id)}</span></div></div></td><td><strong>${e(t?t.name:m.operator||'Controle Operacional')}</strong><span class="cell-sub">${e(t?t.vehicle:'Controle operacional')}</span></td><td>${badge(k[0],k[1])}</td><td class="quantity ${['use','return'].includes(m.kind)?'negative':''}">${qty}</td><td><span title="${e(m.note)}">${e(destination)}</span>${sub?`<span class="cell-sub">${e(sub)}</span>`:''}</td><td class="mono">${time(m.ts)}<span class="cell-sub">${date(m.ts)}</span></td></tr>`}).join('')}</tbody></table></div>`:empty('Nenhuma movimentação encontrada.','Registre uma nova movimentação ou altere os filtros de busca.');
}

function empty(title,sub){return `<div class="empty">${icon('search')}<div>${e(title)}</div><p>${e(sub)}</p></div>`}

function stockRows(){
 const t=current();
 const locs=view==='tech'?(t?[t.id]:[]):filterLoc?[filterLoc]:Object.keys(state.stock);
 return locs.flatMap(l=>state.parts.filter(p=>!isWarehouse(l)||state.locations[l]?.[p.id]).map(p=>({p,loc:l,qty:state.stock[l]?.[p.id]??0,min:isWarehouse(l)?p.baseMin:p.min,slot:state.locations[l]?.[p.id]}))).filter(r=>(!query||(r.p.name+' '+r.p.sku+' '+locName(r.loc)+' '+slotLabel(r.slot)).toLowerCase().includes(query.toLowerCase()))&&(!filterCategory||r.p.category===filterCategory)&&(!lowOnly||r.qty<r.min));
}

function stockPage(){
 const ops=view==='ops',t=current();
 return `${heading(ops?'Inventário':'Meu estoque',ops?'Cada peça, em cada estoque, no endereço certo.':'Seu inventário em campo, sempre à mão.',ops?`<button class="button secondary" data-action="move" data-kind="entry">${icon('in')}Entrada de estoque</button><button class="button secondary" data-action="transfer">${icon('arrows')}Transferir peças</button><button class="button" data-action="product-new">${icon('plus')}Cadastrar produto</button>`:techSelect())}${ops?opsStats():techStats()}${!ops&&t?`<div class="stock-note">${icon('van')}Estoque sob sua responsabilidade · ${e(t.vehicle)}<button class="text-link" style="margin-left:auto" data-action="move" data-kind="count">${icon('edit')}Atualizar contagem</button></div>`:''}<section class="panel"><div class="panel-head"><div><h2>${ops?'Inventário por localização':'Peças no meu veículo'}</h2><p>Quantidade disponível e mínimo de referência</p></div>${t||ops?`<button class="text-link" data-action="move" data-kind="count">Ajustar contagem ${icon('edit')}</button>`:''}</div>${stockToolbar(ops)}<div id="stock-results">${stockResults()}</div></section>`;
}

function stockToolbar(ops){
 return `<div class="toolbar"><div class="search">${icon('search')}<input id="query" class="input" aria-label="Buscar peça ou código" placeholder="Peça, código, corredor ou prateleira..." value="${e(query)}"></div>${ops?`<select id="filter-location" aria-label="Filtrar localização"><option value="">Todas as localizações</option><optgroup label="Estoques">${state.warehouses.map(w=>`<option value="${w.id}" ${filterLoc===w.id?'selected':''}>${e(w.name)}</option>`).join('')}</optgroup><optgroup label="Técnicos">${state.technicians.map(t=>`<option value="${t.id}" ${filterLoc===t.id?'selected':''}>${e(t.name)}</option>`).join('')}</optgroup></select>`:''}<select id="filter-category" aria-label="Filtrar categoria"><option value="">Todas as categorias</option>${[...new Set(state.parts.map(p=>p.category))].map(c=>`<option value="${e(c)}" ${c===filterCategory?'selected':''}>${e(c)}</option>`).join('')}</select><select id="filter-low" aria-label="Filtrar situação do saldo"><option value="">Todos os saldos</option><option value="low" ${lowOnly?'selected':''}>Abaixo do mínimo</option></select></div>`;
}

function stockResults(){
 const rows=stockRows();
 if(!rows.length)return empty('Nenhuma peça encontrada.','Cadastre um produto, dê entrada no estoque ou altere os filtros.');
 return `<div class="table-wrap"><table><thead><tr><th>Peça</th>${view==='ops'?'<th>Localização</th><th>Endereço físico</th>':''}<th>Disponível</th><th>Mínimo</th><th>Situação</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><div class="cell-main"><span class="item-icon">${icon('box')}</span><div><strong>${e(r.p.name)}</strong><span class="cell-sub">${e(r.p.sku)} · ${e(r.p.category)}</span></div></div></td>${view==='ops'?`<td><strong>${e(locName(r.loc))}</strong><span class="cell-sub">${isWarehouse(r.loc)?'Almoxarifado':e(tech(r.loc)?.vehicle||'Veículo')}</span></td><td>${r.slot?`<span class="address-tag">C${e(r.slot.corridor)} / P${e(r.slot.shelf)}</span><span class="cell-sub">Corredor / Prateleira</span>`:'<span class="muted">No veículo</span>'}</td>`:''}<td><strong>${r.qty} ${r.p.unit}</strong></td><td>${r.min} ${r.p.unit}</td><td>${badge(r.qty<r.min?'Estoque baixo':'Regular',r.qty<r.min?'amber':'green')}</td><td><button class="text-link stock-move" data-loc="${r.loc}" data-part="${r.p.id}">${isWarehouse(r.loc)?'Retirar':'Movimentar'} ${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>${rows.length} ${rows.length===1?'saldo encontrado':'saldos encontrados'}</span><span>Atualizado às ${time(state.updatedAt)}</span></div>`;
}

function techSelect(){
 if(currentUser?.role==='tech'||!state.technicians.length)return '';
 return `<select class="tech-select" id="technician-select" aria-label="Selecionar técnico">${state.technicians.map(t=>`<option value="${t.id}" ${techId===t.id?'selected':''}>${e(t.name)} · ${e(t.vehicle)}</option>`).join('')}</select>`;
}

function techStats(){
 const t=current();
 if(!t)return '';
 const a=G.alerts(state).filter(a=>a.loc===t.id);
 return `<div class="stats">${stat('Peças comigo',n(G.total(state,t.id)),`<span class="green">${state.parts.filter(p=>(state.stock[t.id]?.[p.id]||0)>0).length} tipos</span> disponíveis no veículo`,'box','featured')}${stat('Minhas movimentações',state.movements.filter(m=>m.technician===t.id&&m.part).length,'Retiradas, usos, devoluções e ajustes','arrows')}${stat('Peças utilizadas',state.movements.filter(m=>m.technician===t.id&&m.kind==='use').reduce((s,m)=>s+m.qty,0),'Com OS e local de aplicação','tool')}${stat('Abaixo do mínimo',String(a.length).padStart(2,'0'),a.length?'Confira a necessidade de reposição':'Estoque dentro do mínimo','alert',a.length?'alert':'')}</div>`;
}

function techPage(){
 const t=current();
 if(!t){
  return `${heading('Espaço do Técnico','Nenhum técnico cadastrado ainda.',currentUser?.role==='ops'?`<button class="button" data-action="tech-new">${icon('plus')}Cadastrar técnico</button>`:'')}<section class="panel">${empty('Cadastre um técnico na operação.','Para operar o estoque em campo, cadastre ao menos um técnico e seu veículo.')}</section>`;
 }
 if(page==='stock')return stockPage();
 if(page==='movements')return movementsPage();
 return `${heading(`Olá, ${e(t.name.split(' ')[0])}.`,'Seu dia em campo começa por aqui.',techSelect())}${techStats()}<div class="grid-main"><section class="tech-hero"><div class="hero-top"><span class="eyebrow">${t.status==='working'?'ATENDIMENTO EM ANDAMENTO':'ATENDIMENTO DA ROTA'} · ${e(t.order||'Sem OS')}</span>${status(t)}</div><div><h2>${e(t.client||'Sem cliente atribuído')}</h2><p>${icon('pin')}${e(t.address||t.region)}</p></div><div class="hero-bottom">${t.status==='working'?`<button class="button lime" data-action="move" data-kind="use">${icon('tool')}Registrar utilização</button><span class="muted">Chegada confirmada<br>${time(t.checkedAt)}</span>`:`<button class="button lime" data-action="arrival">${icon('pin')}Registrar chegada</button><span class="muted">Confirme sua chegada<br>ao local do atendimento.</span>`}</div>${t.status==='working'?`<button class="text-link" style="color:#c1d6ac;margin-top:17px;position:relative;z-index:1" data-action="finish">Concluir atendimento ${icon('arrow')}</button>`:''}</section><section class="panel"><div class="panel-head"><div><h2>Movimente seu estoque</h2><p>Cada registro mantém a operação atualizada</p></div></div><div class="quick-actions">${quick('Retirar peças','Da base para o seu veículo','out','withdraw')}${quick('Devolver peças','Retorne o que não foi utilizado','in','return')}${quick('Atualizar contagem','Confira e ajuste o seu saldo','edit','count')}</div></section></div><section class="panel"><div class="panel-head"><div><h2>Meu estoque em campo</h2><p>Peças disponíveis no ${e(t.vehicle)}</p></div><button class="text-link" data-page="stock">Ver inventário ${icon('arrow')}</button></div>${state.parts.length?`<div class="inventory-grid">${state.parts.slice(0,6).map(p=>inventoryCard(p,t)).join('')}</div>`:empty('Nenhum produto cadastrado no catálogo.','Aguarde o cadastro de produtos pela operação.')}</section><section class="panel" style="margin-top:22px"><div class="panel-head"><div><h2>Minha atividade recente</h2><p>Seu histórico de peças e atendimentos</p></div><button class="text-link" data-action="all-moves">Ver histórico ${icon('arrow')}</button></div>${movementTable(state.movements.filter(m=>m.technician===t.id).slice(0,4))}</section>`;
}

function quick(title,sub,ico,kind){return `<button class="quick-action" data-action="move" data-kind="${kind}"><span class="quick-icon">${icon(ico)}</span><div><strong>${title}</strong><small>${sub}</small></div>${icon('chevron')}</button>`}
function inventoryCard(p,t){const qty=state.stock[t.id]?.[p.id]??0,low=qty<p.min;return `<article class="inventory-card"><div class="inventory-top"><span class="item-icon">${icon('box')}</span>${badge(low?'Repor':'Disponível',low?'amber':'green')}</div><h3>${e(p.name)}</h3><span class="sku">${e(p.sku)}</span><div class="inventory-bottom"><div><strong>${qty}</strong><small>${e(p.unit)}</small></div><button class="button secondary" data-action="move" data-kind="use" data-part="${p.id}" ${qty===0?'disabled':''}>Usar peça ${icon('arrow')}</button></div><div class="inventory-track"><span style="width:${Math.min(100,qty/Math.max(1,p.min*3)*100)}%;${low?'background:#cbaa72':''}"></span></div></article>`}

function movementsPage(){
 const ops=view==='ops';
 return `${heading(ops?'Movimentações':'Minhas movimentações',ops?'Rastreabilidade da base até o ponto de utilização.':'Todos os seus registros, em um único histórico.',`${!ops?techSelect():''}<button class="button" data-action="move">${icon('plus')}Novo registro</button>`)}<section class="panel"><div class="panel-head"><div><h2>Histórico de movimentações</h2><p>Entradas, retiradas, utilizações, devoluções, transferências e chegadas</p></div><button class="text-link" data-action="export">${icon('download')}Exportar CSV</button></div><div class="toolbar"><div class="search">${icon('search')}<input id="query" class="input" placeholder="Buscar peça, OS ou local..." aria-label="Buscar no histórico" value="${e(query)}"></div><select id="filter-kind" aria-label="Filtrar tipo de movimentação"><option value="">Todas as movimentações</option>${Object.entries(kindMap).map(([k,v])=>`<option value="${k}" ${filterKind===k?'selected':''}>${v[0]}</option>`).join('')}</select>${ops?`<select id="filter-tech" aria-label="Filtrar técnico"><option value="">Todos os técnicos</option>${state.technicians.map(t=>`<option value="${t.id}" ${filterTech===t.id?'selected':''}>${e(t.name)}</option>`).join('')}</select>`:''}</div><div id="movement-results">${movementResults()}</div></section>`;
}

function filteredMovements(){return state.movements.filter(m=>(view==='ops'||m.technician===techId)&&(!filterKind||m.kind===filterKind)&&(!filterTech||m.technician===filterTech)&&(!query||[part(m.part)?.name,part(m.part)?.sku,m.order,m.placement,tech(m.technician)?.name,m.operator,locName(m.from),locName(m.to),locName(m.warehouse),slotLabel(m.fromAddress),slotLabel(m.toAddress),m.note,m.id].join(' ').toLowerCase().includes(query.toLowerCase())))}
function movementResults(){const rows=filteredMovements();return movementTable(rows)+`<div class="table-footer"><span>${rows.length} ${rows.length===1?'registro encontrado':'registros encontrados'}</span><span>Mais recentes primeiro</span></div>`}

function teamPage(){
 return `${heading('Equipe em campo','Acompanhe pessoas, veículos, estoque móvel e ordens de serviço.',`<button class="button" data-action="tech-new">${icon('plus')}Cadastrar técnico</button>`)}<div class="stats">${stat('Técnicos cadastrados',String(state.technicians.length).padStart(2,'0'),'Veículos com estoque individual','users','featured')}${stat('Em atendimento',String(state.technicians.filter(t=>t.status==='working').length).padStart(2,'0'),'Chegada registrada no local','pin')}${stat('A caminho',String(state.technicians.filter(t=>t.status==='route').length).padStart(2,'0'),'Em deslocamento para uma OS','route')}${stat('Disponíveis',String(state.technicians.filter(t=>t.status==='available').length).padStart(2,'0'),'Prontos para o próximo atendimento','check')}</div>${state.technicians.length?`<div class="tech-grid">${state.technicians.map(t=>{const linkedUser=users.find(u=>u.technicianId===t.id);return `<article class="panel tech-card"><div class="tech-card-head">${avatar(t)}<div><h3>${e(t.name)}</h3><span class="muted small">${e(t.vehicle)}${linkedUser?` · @${e(linkedUser.username)}`:''}</span></div>${status(t)}</div><div class="tech-meta"><div><small>ESTOQUE</small><strong>${G.total(state,t.id)} peças · ${state.parts.length} tipos</strong></div><div><small>ATENDIMENTO</small><strong>${e(t.order||'Sem OS')}</strong></div><div><small>ÚLTIMA CHEGADA</small><strong>${t.checkedAt?time(t.checkedAt):'Não registrada'}</strong></div><div><small>REPOSIÇÃO</small><strong>${G.alerts(state).filter(a=>a.loc===t.id).length} ${G.alerts(state).filter(a=>a.loc===t.id).length===1?'saldo em atenção':'saldos em atenção'}</strong></div></div><div class="tech-location">${icon('pin')}<span>${e(t.client||'Base')} · ${e(t.region)}</span></div><div class="tech-card-actions"><button class="button secondary" data-action="detail" data-tech="${t.id}">Acompanhar ${icon('arrow')}</button><button class="icon-button" data-action="tech-edit" data-tech="${t.id}" title="Editar técnico ou atribuir OS" aria-label="Editar ${e(t.name)}">${icon('edit')}</button></div></article>`}).join('')}</div>`:`<section class="panel">${empty('Nenhum técnico cadastrado.','Clique em "Cadastrar técnico" para adicionar sua equipe de campo.')}</section>`}`;
}

function bindFilters(){
 const q=document.getElementById('query');if(q)q.oninput=()=>{query=q.value;refreshResults()};
 const bindings={'filter-location':v=>filterLoc=v,'filter-category':v=>filterCategory=v,'filter-low':v=>lowOnly=v==='low','filter-kind':v=>filterKind=v,'filter-tech':v=>filterTech=v};
 for(const [id,fn] of Object.entries(bindings)){const el=document.getElementById(id);if(el)el.onchange=()=>{fn(el.value);refreshResults()}}
 bindStockButtons();
}

function refreshResults(){
 const sr=document.getElementById('stock-results'),mr=document.getElementById('movement-results');
 if(sr){sr.innerHTML=stockResults();bindStockButtons()}
 if(mr)mr.innerHTML=movementResults();
 const pr=document.getElementById('product-results');
 if(pr){pr.innerHTML=productResults();pr.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>handle(b.dataset.action,b.dataset))}
}

function bindStockButtons(){
 document.querySelectorAll('.stock-move').forEach(b=>b.onclick=()=>action(isWarehouse(b.dataset.loc)?'withdraw':view==='tech'?'use':'withdraw',isWarehouse(b.dataset.loc)?techId:b.dataset.loc,b.dataset.part,isWarehouse(b.dataset.loc)?b.dataset.loc:(state.warehouses[0]?.id||'base')));
}

function showModal(title,sub,body,footer='',wide=false){
 if(!modalType)lastFocus=document.activeElement;
 modalType=title;
 modalRoot.innerHTML=`<div class="modal-overlay"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="modal-header"><div><h2 id="dialog-title">${title}</h2><p>${sub}</p></div><button class="modal-close" type="button" aria-label="Fechar janela">${icon('close')}</button></div>${body}${footer?`<div class="modal-footer">${footer}</div>`:''}</section></div>`;
 document.body.style.overflow='hidden';
 modalRoot.querySelector('.modal-close').onclick=closeModal;
 modalRoot.querySelector('.modal-overlay').onclick=ev=>{if(ev.target.classList.contains('modal-overlay'))closeModal()};
 modalRoot.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
 requestAnimationFrame(()=>modalRoot.querySelector('input:not([type=hidden]):not(:disabled), select:not(:disabled), .modal-close')?.focus());
}

function closeModal(){modalRoot.innerHTML='';modalType=null;document.body.style.overflow='';if(lastFocus&&document.contains(lastFocus))lastFocus.focus()}

document.addEventListener('keydown',ev=>{
 if(!modalType)return;
 if(ev.key==='Escape')closeModal();
 if(ev.key==='Tab'){
  const focusable=[...modalRoot.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(el=>el.offsetParent!==null);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable.at(-1);
  if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus()}
  else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus()}
 }
});

async function doCommit(a){
 if(apiOnline){
  const res=await apiRequest('POST','/api/movements',a);
  applySession(res);
  return res.movement;
 }
 const result=G.apply(state,a);
 persistLocal();
 return result;
}

async function saveEntity(kind,values){
 if(apiOnline){
  const endpoint=kind==='warehouse'?'/api/warehouses':kind==='product'?'/api/products':'/api/technicians';
  const res=await apiRequest('POST',endpoint,values);
  applySession(res);
  return res.warehouse||res.product||res.technician;
 }
 const result=kind==='warehouse'?G.saveWarehouse(state,values):kind==='product'?G.saveProduct(state,values):G.saveTechnician(state,values);
 persistLocal();
 return result;
}

async function deleteEntity(kind,id){
 if(apiOnline){
  const endpoint=kind==='warehouse'?`/api/warehouses/${encodeURIComponent(id)}`:kind==='product'?`/api/products/${encodeURIComponent(id)}`:`/api/technicians/${encodeURIComponent(id)}`;
  const res=await apiRequest('DELETE',endpoint);
  applySession(res);
  return true;
 }
 if(kind==='warehouse')G.deleteWarehouse(state,id);
 else if(kind==='product')G.deleteProduct(state,id);
 else G.deleteTechnician(state,id);
 persistLocal();
 return true;
}

function openMovement(kind='withdraw',tid=techId,pid='',wid=''){
 if(!wid||!isWarehouse(wid))wid=state.warehouses[0]?.id||'';
 if(kind==='transfer'){transferForm(wid,'',pid);return}
 if(!state.parts.length){
  toast('Cadastre pelo menos um produto antes de registrar movimentações.');
  if(view==='ops')productForm();
  return;
 }
 if(kind!=='entry'&&!state.technicians.length){
  toast('Cadastre pelo menos um técnico para movimentar peças de campo.');
  if(view==='ops')techForm();
  return;
 }
 if(['withdraw','return','entry'].includes(kind)&&!state.warehouses.length){
  toast('Cadastre pelo menos um estoque antes de realizar esta operação.');
  if(view==='ops')warehouseForm();
  return;
 }
 if(view==='tech')tid=current()?.id||techId;
 const t=tech(tid)||state.technicians[0],p=part(pid)||state.parts[0];
 if(t)tid=t.id;
 const labels={
  withdraw:['Registrar retirada','Escolha o estoque de origem para abastecer o técnico.','Confirmar retirada'],
  return:['Registrar devolução','Escolha o estoque que receberá as peças devolvidas.','Confirmar devolução'],
  use:['Registrar utilização','Vincule a peça ao atendimento e ao local onde foi aplicada.','Confirmar utilização'],
  count:['Atualizar contagem','Ajuste o saldo físico do veículo com uma justificativa rastreável.','Salvar contagem'],
  entry:['Entrada de estoque','Adicione novas unidades compradas ou recebidas diretamente em uma base.','Confirmar entrada']
 };
 const [title,sub,submit]=labels[kind]||labels.withdraw;
 const tabs=[['withdraw','Retirada'],['use','Utilização'],['return','Devolução'],['count','Contagem'],...(view==='ops'?[['entry','Entrada'],['transfer','Transferir']]:[])];

 showModal(title,sub,`<form id="movement-form"><div class="modal-body"><div class="form-tabs" aria-label="Tipo de registro">${tabs.map(([k,v])=>`<button type="button" data-tab="${k}" class="${kind===k?'active':''}" aria-pressed="${kind===k}">${v}</button>`).join('')}</div><div id="form-error" class="error" role="alert"></div>${kind==='entry'?'':view==='ops'?`<div class="field"><label for="move-tech">Técnico responsável</label><select name="technician" id="move-tech">${state.technicians.map(x=>`<option value="${x.id}" ${x.id===tid?'selected':''}>${e(x.name)} · ${e(x.vehicle)}</option>`).join('')}</select></div>`:`<input type="hidden" name="technician" value="${tid}"><div class="stock-note">${icon('van')}${e(t.name)} · ${e(t.vehicle)}</div>`}<div class="field"><label for="move-part">Peça</label><select name="part" id="move-part">${state.parts.map(x=>`<option value="${x.id}" ${p.id===x.id?'selected':''}>${e(x.sku)} · ${e(x.name)}</option>`).join('')}</select></div>${['withdraw','return','entry'].includes(kind)?`<div class="field"><label for="move-warehouse">${kind==='withdraw'?'Estoque de origem':kind==='entry'?'Estoque de destino':'Estoque de devolução'}</label><select id="move-warehouse" name="warehouse">${state.warehouses.map(w=>`<option value="${w.id}" ${w.id===wid?'selected':''}>${e(w.name)}</option>`).join('')}</select><small id="move-slot"></small></div>`:''}${kind==='entry'?`<div id="entry-address-fields"></div>`:''}<div class="balance-preview" id="balance-preview"></div><div class="field"><label for="move-qty">${kind==='count'?'Quantidade encontrada na contagem':'Quantidade (unidades)'}</label><input class="input" id="move-qty" type="number" name="qty" min="${kind==='count'?0:1}" step="1" value="${kind==='count'?(state.stock[tid]?.[p.id]??0):1}" required inputmode="numeric"><small>${kind==='count'?'O saldo será substituído pela contagem informada.':'Use apenas números inteiros. O saldo não pode ficar negativo.'}</small></div>${kind==='use'?`<div id="arrival-warning"></div><div class="form-grid"><div class="field"><label for="move-order">Ordem de serviço *</label><input class="input" id="move-order" name="order" maxlength="100" required value="${e(t?.order||'')}"></div><div class="field"><label for="move-place">Cliente / obra *</label><input class="input" id="move-place" name="site" maxlength="130" required value="${e(t?.client||'')}"></div></div><div class="field"><label for="move-placement">Onde a peça foi utilizada? *</label><input class="input" id="move-placement" name="placement" maxlength="150" required placeholder="Ex.: sala 03, rack principal, ponto 02"><small>Informe o ambiente, equipamento ou ponto de aplicação.</small></div>`:''}<div class="field"><label for="move-note">${kind==='return'?'Motivo da devolução *':kind==='count'?'Justificativa do ajuste *':kind==='entry'?'Nota fiscal / origem da entrada':'Observações (opcional)'}</label><textarea id="move-note" name="note" maxlength="300" ${['return','count'].includes(kind)?'required':''} placeholder="${kind==='return'?'Ex.: sobra do atendimento, peça sem uso e em boas condições':kind==='count'?'Ex.: diferença identificada na conferência do veículo':kind==='entry'?'Ex.: NF 45890 · reposição de fornecedor':'Detalhes adicionais sobre este registro'}"></textarea></div><div class="form-note">${icon('shield')}Registro auditado e gravado no banco de dados da operação.</div></div><div class="modal-footer"><button class="button secondary" type="button" data-close>Cancelar</button><button class="button" type="submit">${icon('check')}${submit}</button></div></form>`);

 const form=document.getElementById('movement-form');
 modalRoot.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{const v=new FormData(form);openMovement(b.dataset.tab,v.get('technician')||tid,v.get('part')||pid,v.get('warehouse')||wid)});
 const preview=()=>{
  const values=new FormData(form),selPid=values.get('part'),qty=Number(values.get('qty')),selWid=values.get('warehouse')||wid,base=state.stock[selWid]?.[selPid]??0;
  const slot=state.locations[selWid]?.[selPid];
  const slotInfo=document.getElementById('move-slot');if(slotInfo)slotInfo.textContent=slotLabel(slot);
  if(kind==='entry'){
   const addrBox=document.getElementById('entry-address-fields');
   if(addrBox){
    addrBox.innerHTML=slot?'':`<div class="form-grid"><div class="field"><label for="entry-corridor">Corredor no estoque *</label><input class="input" id="entry-corridor" name="corridor" placeholder="Ex.: A ou 01" maxlength="40" required></div><div class="field"><label for="entry-shelf">Prateleira no estoque *</label><input class="input" id="entry-shelf" name="shelf" placeholder="Ex.: 03" maxlength="40" required></div></div>`;
   }
   document.getElementById('balance-preview').innerHTML=`<span>Saldo atual na base: <strong>${base} un.</strong></span><span>Após entrada: <strong>${!Number.isSafeInteger(qty)||qty<1?'Quantidade inválida':(base+qty)+' un.'}</strong></span>`;
   return;
  }
  const selTech=tech(values.get('technician')||tid),own=selTech?(state.stock[selTech.id]?.[selPid]??0):0,next=kind==='count'?qty:kind==='withdraw'?own+qty:own-qty;
  document.getElementById('balance-preview').innerHTML=`<span>${kind==='withdraw'?`Base: <strong>${base} un.</strong>`:`Saldo atual: <strong>${own} un.</strong>`}</span><span>${kind==='withdraw'?'Técnico':kind==='return'?'Base após retorno':kind==='count'?'Após ajuste':'Após utilização'}: <strong>${!Number.isSafeInteger(qty)||qty<(kind==='count'?0:1)||(kind==='withdraw'&&qty>base)||(['return','use'].includes(kind)&&qty>own)?'Quantidade inválida':(kind==='return'?base+qty:next)+' un.'}</strong></span>`;
  const warn=document.getElementById('arrival-warning');
  if(warn&&selTech){
   warn.innerHTML=selTech.status!=='working'?`<div class="stock-note" style="background:#faf2e3;color:#a18b61">${icon('pin')}Registre a chegada para utilizar peças.<button type="button" class="text-link" id="arrival-first" style="margin-left:auto">Registrar chegada ${icon('arrow')}</button></div>`:'';
   const b=document.getElementById('arrival-first');if(b)b.onclick=()=>arrival(selTech.id,()=>openMovement('use',selTech.id,selPid));
  }
 };
 document.getElementById('move-part').onchange=()=>{if(kind==='count'){const v=new FormData(form);document.getElementById('move-qty').value=state.stock[v.get('technician')]?.[v.get('part')]??0}preview()};
 document.getElementById('move-qty').oninput=preview;
 const ts=document.getElementById('move-tech');if(ts)ts.onchange=()=>{const selT=tech(ts.value);if(kind==='use'&&selT){document.getElementById('move-order').value=selT.order;document.getElementById('move-place').value=selT.client}if(kind==='count')document.getElementById('move-qty').value=state.stock[ts.value]?.[document.getElementById('move-part').value]??0;preview()};
 const ws=document.getElementById('move-warehouse');if(ws)ws.onchange=preview;
 preview();
 form.onsubmit=async ev=>{
  ev.preventDefault();
  const values=Object.fromEntries(new FormData(form));
  values.kind=kind;
  if(kind==='use')values.placement=values.site+' · '+values.placement;
  try{
   await doCommit(values);
   closeModal();render();
   toast(`${kind==='count'?'Contagem atualizada':kindMap[kind][0]+' registrada'}. Saldos atualizados.`);
  }catch(err){
   const el=document.getElementById('form-error');el.textContent=err.message;el.scrollIntoView({block:'nearest'});
  }
 };
}

function arrival(tid=techId,after=null){
 if(view==='tech')tid=current()?.id||techId;
 const t=tech(tid);if(!t)return;
 showModal('Registrar chegada','Confirme o local e avise a operação que o atendimento começou.',`<form id="arrival-form"><div class="modal-body"><div class="stock-note">${icon('van')}${e(t.name)} · ${e(t.vehicle)}</div><div class="error" id="form-error" role="alert"></div><div class="form-grid"><div class="field"><label for="arrival-order">Ordem de serviço *</label><input id="arrival-order" class="input" name="order" value="${e(t.order==='Sem OS'?'':t.order)}" placeholder="Ex.: OS-2048" maxlength="100" required></div><div class="field"><label for="arrival-place">Local de chegada *</label><input id="arrival-place" class="input" name="placement" value="${e(t.client==='Base Operacional'?'':t.client)}" placeholder="Nome do cliente ou local" maxlength="150" required></div></div><div class="field"><label for="arrival-note">Observações (opcional)</label><textarea name="note" id="arrival-note" maxlength="300" placeholder="Ex.: aguardando liberação na recepção"></textarea></div><div class="balance-preview"><span>Após confirmar</span><strong>Em atendimento</strong></div><div class="form-note">${icon('clock')}O horário da confirmação será registrado no histórico da operação.</div></div><div class="modal-footer"><button type="button" class="button secondary" data-close>Cancelar</button><button type="submit" class="button">${icon('pin')}Confirmar chegada</button></div></form>`);
 document.getElementById('arrival-form').onsubmit=async ev=>{
  ev.preventDefault();
  try{
   const values=Object.fromEntries(new FormData(ev.currentTarget));
   await doCommit({...values,kind:'arrival',technician:tid});
   closeModal();render();toast('Chegada registrada. A operação já pode acompanhar.');
   if(after)after();
  }catch(err){document.getElementById('form-error').textContent=err.message}
 };
}

function finish(tid){
 const t=tech(tid);if(!t)return;
 showModal('Concluir atendimento',`${e(t.order)} · ${e(t.client)}`,`<div class="modal-body"><div class="guide-summary">As peças utilizadas permanecem vinculadas à OS. Após concluir, o técnico ficará disponível. Peças restantes continuam no seu estoque e podem ser devolvidas à base.</div><div class="error" id="form-error" role="alert"></div></div>`,`<button class="button secondary" data-close>Voltar</button><button class="button" id="finish-confirm">${icon('check')}Concluir atendimento</button>`);
 document.getElementById('finish-confirm').onclick=async ()=>{
  try{
   await doCommit({kind:'finish',technician:tid});
   closeModal();render();toast('Atendimento concluído. Técnico disponível.');
  }catch(err){document.getElementById('form-error').textContent=err.message}
 };
}

function detail(tid){
 const t=tech(tid);if(!t)return;
 const events=state.movements.filter(m=>m.technician===tid),a=G.alerts(state).filter(x=>x.loc===tid);
 showModal(e(t.name),`${e(t.vehicle)} · ${e(t.region)} · ${statusMap[t.status]?.[0]||'Disponível'}`,`<div class="modal-body"><div class="detail-stats"><div><small>PEÇAS COM O TÉCNICO</small><strong>${G.total(state,tid)}</strong></div><div><small>SALDOS EM ATENÇÃO</small><strong>${a.length}</strong></div><div><small>ÚLTIMA CHEGADA</small><strong style="font-size:18px">${t.checkedAt?time(t.checkedAt):'—'}</strong></div></div><div class="stock-note">${icon('pin')}<span>${e(t.order)} · ${e(t.client)}<br><span class="small muted">${e(t.address)}</span></span><button type="button" class="text-link" id="detail-edit-tech" style="margin-left:auto">${icon('edit')}Editar / OS</button></div><h3 style="margin-bottom:12px">Estoque no veículo</h3>${state.parts.length?`<div class="table-wrap"><table><thead><tr><th>Peça</th><th>Saldo</th><th>Situação</th></tr></thead><tbody>${state.parts.map(p=>`<tr><td><strong>${e(p.name)}</strong><span class="cell-sub">${e(p.sku)}</span></td><td>${state.stock[tid]?.[p.id]??0} un.</td><td>${badge((state.stock[tid]?.[p.id]??0)<p.min?'Repor':'Regular',(state.stock[tid]?.[p.id]??0)<p.min?'amber':'green')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted small">Nenhum produto cadastrado.</p>'}<h3 style="margin:24px 0 8px">Atividade recente</h3>${events.length?events.slice(0,5).map(m=>`<div class="timeline-item">${icon(kindMap[m.kind]?.[2]||'box')}<div><strong>${kindMap[m.kind]?.[0]||m.kind}${m.part?' · '+e(part(m.part)?.name||'')+' · '+m.qty+' un.':''}</strong><p>${e(m.placement||m.note||'Base operacional')} ${m.order?'· '+e(m.order):''}</p><p>${date(m.ts)} às ${time(m.ts)}</p></div></div>`).join(''):'<p class="muted small">Nenhuma atividade registrada.</p>'}</div>`,`<button class="button secondary" data-close>Fechar</button><button class="button" id="simulate-tech">${icon('van')}Abrir visão do técnico</button>`,true);
 document.getElementById('detail-edit-tech').onclick=()=>techForm(tid);
 document.getElementById('simulate-tech').onclick=()=>{techId=tid;view='tech';page='overview';clearFilters();closeModal();render()};
}

function exportCSV(){
 const rows=filteredMovements();
 const safe=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 const cols=['Registro','Data','Hora','Responsável','Tipo','Código','Peça','Quantidade','OS','Local','Origem','Destino','Endereço de origem','Endereço de destino','Observação'];
 const csv='\uFEFF'+[cols,...rows.map(m=>[m.id,date(m.ts),time(m.ts),tech(m.technician)?.name||m.operator||'Controle Operacional',kindMap[m.kind]?.[0]||m.kind,part(m.part)?.sku||'',part(m.part)?.name||'',m.part?m.qty:'',m.order||'',m.placement||'',m.from?locName(m.from):m.kind==='withdraw'?locName(m.warehouse):'',m.to?locName(m.to):['return','entry'].includes(m.kind)?locName(m.warehouse):'',m.fromAddress?slotLabel(m.fromAddress):'',m.toAddress?slotLabel(m.toAddress):'',m.note||''])].map(row=>row.map(safe).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');
 a.href=url;a.download='gridstock-movimentacoes.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast(`${rows.length} ${rows.length===1?'registro exportado':'registros exportados'}.`);
}

function warehousesPage(){
 return `${heading('Estoques','Uma rede conectada. Cada base com seu próprio saldo e endereçamento.',`<button class="button secondary" data-action="transfer">${icon('arrows')}Transferir peças</button><button class="button" data-action="warehouse-new">${icon('plus')}Cadastrar estoque</button>`)}<div class="stats">${stat('Estoques cadastrados',String(state.warehouses.length).padStart(2,'0'),'Bases e almoxarifados da operação','box','featured')}${stat('Peças armazenadas',n(warehousesTotal()),'Soma dos saldos em todos os estoques','grid')}${stat('Transferências',String(state.movements.filter(m=>m.kind==='transfer').length).padStart(2,'0'),'Movimentações entre estoques','arrows')}${stat('Endereços cadastrados',Object.values(state.locations).reduce((n,slots)=>n+Object.keys(slots).length,0),'Produto + estoque + corredor + prateleira','pin')}</div><div class="warehouse-grid">${state.warehouses.map(w=>{const count=Object.keys(state.locations[w.id]||{}).length;return `<article class="panel warehouse-card"><div class="warehouse-card-top"><span class="warehouse-symbol">${icon('box')}</span>${badge(w.code,'green')}</div><h2>${e(w.name)}</h2><p class="warehouse-city">${icon('pin')}${e(w.city)}</p><div class="warehouse-totals"><div><strong>${n(G.total(state,w.id))}</strong><small>peças disponíveis</small></div><div><strong>${count}</strong><small>produtos endereçados</small></div></div><div class="warehouse-meta"><span>Responsável <strong>${e(w.responsible)}</strong></span><p>${e(w.address||'Endereço da base não informado')}</p></div><div class="warehouse-buttons"><button class="button secondary" data-action="warehouse-stock" data-warehouse="${w.id}">Ver inventário ${icon('arrow')}</button><button class="icon-button" data-action="warehouse-edit" data-warehouse="${w.id}" title="Editar estoque" aria-label="Editar ${e(w.name)}">${icon('edit')}</button><button class="icon-button" data-action="transfer" data-from="${w.id}" title="Transferir de ${e(w.name)}" aria-label="Transferir de ${e(w.name)}">${icon('arrows')}</button></div></article>`}).join('')}<button class="warehouse-add" data-action="warehouse-new"><span>${icon('plus')}</span><strong>Adicionar um estoque</strong><p>Organize mais uma base da operação</p></button></div>`;
}

function productsPage(){
 return `${heading('Produtos','Um cadastro por produto. Um endereço em cada estoque.',`<button class="button secondary" data-action="move" data-kind="entry">${icon('in')}Entrada de saldo</button><button class="button" data-action="product-new">${icon('plus')}Cadastrar produto</button>`)}<div class="stock-note">${icon('pin')}O mesmo produto pode estar em corredores e prateleiras diferentes em cada estoque.</div><section class="panel"><div class="panel-head"><div><h2>Catálogo de produtos</h2><p>${state.parts.length} ${state.parts.length===1?'produto cadastrado':'produtos cadastrados'} · código único em toda a rede</p></div>${badge('Endereçamento físico','green')}</div><div class="toolbar"><div class="search">${icon('search')}<input class="input" id="query" aria-label="Buscar produtos" placeholder="Produto, código ou endereço..." value="${e(query)}"></div><select id="filter-location" aria-label="Filtrar estoque do produto"><option value="">Todos os estoques</option>${state.warehouses.map(w=>`<option value="${w.id}" ${filterLoc===w.id?'selected':''}>${e(w.name)}</option>`).join('')}</select></div><div id="product-results">${productResults()}</div></section>`;
}

function productResults(){
 const rows=state.parts.filter(p=>(!filterLoc||state.locations[filterLoc]?.[p.id])&&(!query||[p.name,p.sku,p.category,...state.warehouses.filter(w=>state.locations[w.id]?.[p.id]).map(w=>w.name+' '+slotLabel(state.locations[w.id][p.id]))].join(' ').toLowerCase().includes(query.toLowerCase())));
 if(!rows.length)return empty('Nenhum produto encontrado.','Cadastre um produto ou altere a busca.');
 return `<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Saldo total</th><th>Estoque / corredor / prateleira</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td><div class="cell-main"><span class="item-icon">${icon('box')}</span><div><strong>${e(p.name)}</strong><span class="cell-sub">${e(p.sku)} · Mín. base: ${p.baseMin} · Mín. técnico: ${p.min}</span></div></div></td><td>${e(p.category)}</td><td><strong>${n(Object.values(state.stock).reduce((n,stock)=>n+(stock[p.id]||0),0))} ${e(p.unit)}</strong><span class="cell-sub">Base + técnicos</span></td><td><div class="product-addresses">${state.warehouses.filter(w=>state.locations[w.id]?.[p.id]).map(w=>{const a=state.locations[w.id][p.id];return `<span><strong>${e(w.name)}</strong><span class="address-tag">C${e(a.corridor)} / P${e(a.shelf)}</span></span>`}).join('')||'<span class="muted">Sem endereço</span>'}</div></td><td style="text-align:right"><div class="row-actions"><button class="text-link" data-action="move" data-kind="entry" data-part="${p.id}">+ Entrada</button><button class="text-link" data-action="product-edit" data-part="${p.id}">Editar / endereçar ${icon('edit')}</button></div></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>${rows.length} ${rows.length===1?'produto encontrado':'produtos encontrados'}</span><span>Saldo consolidado da rede</span></div>`;
}

function warehouseOptions(selected){return state.warehouses.map(w=>`<option value="${w.id}" ${w.id===selected?'selected':''}>${e(w.name)} (${e(w.code)})</option>`).join('')}

function warehouseForm(wid=''){
 const w=warehouseById(wid),editing=Boolean(w);
 showModal(editing?'Editar estoque':'Cadastrar estoque',editing?'Atualize os dados cadastrais desta base operacional.':'Crie uma base para organizar produtos e receber transferências.',`<form id="warehouse-form"><div class="modal-body"><div class="error" id="form-error" role="alert"></div><input type="hidden" name="id" value="${e(wid)}"><div class="field"><label for="wh-name">Nome do estoque *</label><input class="input" name="name" id="wh-name" value="${e(w?.name||'')}" placeholder="Ex.: Almoxarifado Parangaba" maxlength="80" required></div><div class="form-grid"><div class="field"><label for="wh-code">Código do estoque *</label><input class="input" name="code" id="wh-code" value="${e(w?.code||'')}" placeholder="Ex.: PRG" pattern="[A-Za-z0-9-]{2,12}" maxlength="12" required><small>Código único, com 2 a 12 caracteres.</small></div><div class="field"><label for="wh-city">Cidade / UF *</label><input class="input" name="city" id="wh-city" value="${e(w?.city||'')}" placeholder="Ex.: Fortaleza, CE" maxlength="100" required></div></div><div class="field"><label for="wh-responsible">Responsável pelo estoque *</label><input class="input" name="responsible" id="wh-responsible" value="${e(w?.responsible||'')}" placeholder="Nome do responsável" maxlength="100" required></div><div class="field"><label for="wh-address">Endereço da base (opcional)</label><input class="input" name="address" id="wh-address" value="${e(w?.address||'')}" placeholder="Rua, número e bairro" maxlength="180"></div>${!editing?`<div class="guide-summary">O estoque começa vazio. Para abastecê-lo, transfira peças de outra base ou cadastre um produto com saldo inicial.</div>`:''}</div><div class="modal-footer">${editing?`<button type="button" class="button danger" id="wh-delete" style="margin-right:auto">${icon('trash')}Excluir</button>`:''}<button type="button" class="button secondary" data-close>Cancelar</button><button type="submit" class="button">${icon('check')}${editing?'Salvar alterações':'Salvar estoque'}</button></div></form>`);
 if(editing){
  document.getElementById('wh-delete').onclick=async ()=>{
   try{
    await deleteEntity('warehouse',wid);
    closeModal();page='warehouses';clearFilters();render();toast('Estoque excluído com sucesso.');
   }catch(err){document.getElementById('form-error').textContent=err.message}
  };
 }
 document.getElementById('warehouse-form').onsubmit=async ev=>{
  ev.preventDefault();
  try{
   await saveEntity('warehouse',Object.fromEntries(new FormData(ev.currentTarget)));
   closeModal();page='warehouses';clearFilters();render();toast(editing?'Estoque atualizado com sucesso.':'Estoque cadastrado. Pronto para receber produtos.');
  }catch(err){document.getElementById('form-error').textContent=err.message}
 };
}

function productForm(pid=''){
 if(!state.warehouses.length){
  toast('Cadastre primeiro um estoque para endereçar o produto.');
  warehouseForm();
  return;
 }
 const p=part(pid),editing=Boolean(p),wid=(filterLoc&&isWarehouse(filterLoc)?filterLoc:state.warehouses.find(w=>state.locations[w.id]?.[pid])?.id)||state.warehouses[0].id,a=state.locations[wid]?.[pid];
 showModal(editing?'Editar produto e endereço':'Cadastrar produto',editing?'Atualize o cadastro e defina o endereço no estoque selecionado.':'Defina o código, o estoque e o endereço físico da peça.',`<form id="product-form"><div class="modal-body"><div class="error" id="form-error" role="alert"></div><input type="hidden" name="id" value="${e(pid)}"><div class="form-grid"><div class="field"><label for="product-sku">Código / SKU *</label><input class="input" name="sku" id="product-sku" value="${e(p?.sku||'')}" placeholder="Ex.: GS-009" maxlength="50" required></div><div class="field"><label for="product-category">Categoria *</label><input class="input" name="category" id="product-category" value="${e(p?.category||'')}" placeholder="Ex.: Conectividade" list="category-options" maxlength="60" required><datalist id="category-options">${[...new Set(state.parts.map(p=>p.category))].map(c=>`<option value="${e(c)}"></option>`).join('')}</datalist></div></div><div class="field"><label for="product-name">Nome do produto *</label><input class="input" name="name" id="product-name" value="${e(p?.name||'')}" placeholder="Ex.: Conector RJ45 CAT6" maxlength="100" required></div><div class="form-grid"><div class="field"><label for="product-min">Estoque mínimo por base *</label><input class="input" name="baseMin" id="product-min" type="number" min="0" step="1" value="${p?.baseMin??10}" required></div><div class="field"><label for="product-tech-min">Mínimo por técnico *</label><input class="input" name="min" id="product-tech-min" type="number" min="0" step="1" value="${p?.min??2}" required></div></div><div class="field"><label for="product-qty">${editing?'Saldo no estoque selecionado (consulta)':'Quantidade inicial (unidades) *'}</label><input class="input" name="qty" id="product-qty" type="number" min="0" step="1" value="${editing?(state.stock[wid]?.[pid]??0):0}" ${editing?'disabled':'required'}></div><div class="form-section-label">${icon('pin')}ENDEREÇO DO PRODUTO</div><div class="field"><label for="product-warehouse">Estoque do produto *</label><select id="product-warehouse" name="warehouse">${warehouseOptions(wid)}</select></div><div class="form-grid"><div class="field"><label for="product-corridor">Corredor *</label><input class="input" id="product-corridor" name="corridor" value="${e(a?.corridor||'')}" placeholder="Ex.: A ou 01" maxlength="40" required></div><div class="field"><label for="product-shelf">Prateleira *</label><input class="input" id="product-shelf" name="shelf" value="${e(a?.shelf||'')}" placeholder="Ex.: 03" maxlength="40" required></div></div><div class="form-note">${icon('help')}${editing?'O endereço pertence ao estoque escolhido. Saldos são alterados por movimentações.':'O saldo inicial entra no estoque selecionado e o produto fica disponível no catálogo da rede.'}</div></div><div class="modal-footer">${editing?`<button type="button" class="button danger" id="prod-delete" style="margin-right:auto">${icon('trash')}Excluir</button>`:''}<button type="button" class="button secondary" data-close>Cancelar</button><button type="submit" class="button">${icon('check')}${editing?'Salvar alterações':'Salvar produto'}</button></div></form>`);
 document.getElementById('product-warehouse').onchange=ev=>{const nextWid=ev.target.value,slot=state.locations[nextWid]?.[pid];document.getElementById('product-corridor').value=slot?.corridor||'';document.getElementById('product-shelf').value=slot?.shelf||'';if(editing)document.getElementById('product-qty').value=state.stock[nextWid]?.[pid]??0};
 if(editing){
  document.getElementById('prod-delete').onclick=async ()=>{
   try{
    await deleteEntity('product',pid);
    closeModal();page='products';clearFilters();render();toast('Produto excluído do catálogo.');
   }catch(err){const el=document.getElementById('form-error');el.textContent=err.message;el.scrollIntoView({block:'nearest'})}
  };
 }
 document.getElementById('product-form').onsubmit=async ev=>{
  ev.preventDefault();
  try{
   await saveEntity('product',Object.fromEntries(new FormData(ev.currentTarget)));
   closeModal();page='products';clearFilters();render();toast(editing?'Produto e endereço atualizados.':'Produto cadastrado com corredor e prateleira.');
  }catch(err){const el=document.getElementById('form-error');el.textContent=err.message;el.scrollIntoView({block:'nearest'})}
 };
}

function techForm(tid=''){
 const t=tech(tid),editing=Boolean(t),linkedUser=editing?users.find(u=>u.technicianId===tid):null;
 showModal(editing?'Editar técnico e atendimento':'Cadastrar técnico',editing?'Atualize os dados do técnico, ordem de serviço atual ou credenciais de acesso.':'Adicione um profissional à equipe de campo com estoque móvel individual.',`<form id="tech-form"><div class="modal-body"><div class="error" id="form-error" role="alert"></div><input type="hidden" name="id" value="${e(tid)}"><div class="form-grid"><div class="field"><label for="tech-name">Nome completo *</label><input class="input" id="tech-name" name="name" value="${e(t?.name||'')}" placeholder="Ex.: Rafael Lima" maxlength="80" required></div><div class="field"><label for="tech-vehicle">Veículo / Frota *</label><input class="input" id="tech-vehicle" name="vehicle" value="${e(t?.vehicle||'')}" placeholder="Ex.: V-012 · ABC-1D23" maxlength="40" required></div></div><div class="form-grid"><div class="field"><label for="tech-region">Região / Base *</label><input class="input" id="tech-region" name="region" value="${e(t?.region||'')}" placeholder="Ex.: Aldeota" maxlength="60" required></div><div class="field"><label for="tech-status">Situação atual *</label><select id="tech-status" name="status">${Object.entries(statusMap).map(([k,v])=>`<option value="${k}" ${(t?.status||'available')===k?'selected':''}>${v[0]}</option>`).join('')}</select></div></div><div class="form-grid"><div class="field"><label for="tech-color">Cor de identificação</label><select id="tech-color" name="color">${[['mint','Verde Menta'],['peach','Pêssego'],['blue','Azul'],['purple','Roxo']].map(([k,v])=>`<option value="${k}" ${(t?.color||'mint')===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label for="tech-order">Ordem de Serviço (OS)</label><input class="input" id="tech-order" name="order" value="${e(t?.order||'')}" placeholder="Ex.: OS-2048" maxlength="100"></div></div><div class="form-grid"><div class="field"><label for="tech-client">Cliente / Local atual</label><input class="input" id="tech-client" name="client" value="${e(t?.client||'')}" placeholder="Ex.: Clínica Horizonte" maxlength="130"></div><div class="field"><label for="tech-address">Endereço do atendimento</label><input class="input" id="tech-address" name="address" value="${e(t?.address||'')}" placeholder="Rua, número e bairro" maxlength="180"></div></div><div class="form-section-label">${icon('shield')}CREDENCIAIS DE ACESSO DO TÉCNICO (OPCIONAL)</div><div class="form-grid"><div class="field"><label for="tech-username">Usuário de login</label><input class="input" id="tech-username" name="username" value="${e(linkedUser?.username||'')}" placeholder="Ex.: rafael" maxlength="50"><small>Permite que o técnico entre direto na visão de campo.</small></div><div class="field"><label for="tech-password">${linkedUser?'Nova senha (deixe vazio p/ manter)':'Senha de acesso'}</label><input class="input" id="tech-password" name="password" type="password" placeholder="${linkedUser?'••••••••':'Mínimo de 4 caracteres'}" maxlength="60"></div></div></div><div class="modal-footer">${editing?`<button type="button" class="button danger" id="tech-delete" style="margin-right:auto">${icon('trash')}Excluir</button>`:''}<button type="button" class="button secondary" data-close>Cancelar</button><button type="submit" class="button">${icon('check')}${editing?'Salvar alterações':'Cadastrar técnico'}</button></div></form>`);
 if(editing){
  document.getElementById('tech-delete').onclick=async ()=>{
   try{
    await deleteEntity('technician',tid);
    closeModal();page='team';clearFilters();render();toast('Técnico excluído com sucesso.');
   }catch(err){const el=document.getElementById('form-error');el.textContent=err.message;el.scrollIntoView({block:'nearest'})}
  };
 }
 document.getElementById('tech-form').onsubmit=async ev=>{
  ev.preventDefault();
  try{
   await saveEntity('technician',Object.fromEntries(new FormData(ev.currentTarget)));
   closeModal();page='team';clearFilters();render();toast(editing?'Dados do técnico atualizados.':'Técnico cadastrado na equipe.');
  }catch(err){const el=document.getElementById('form-error');el.textContent=err.message;el.scrollIntoView({block:'nearest'})}
 };
}

function transferForm(from='base',to='',pid=''){
 if(state.warehouses.length<2){
  toast('Cadastre pelo menos 2 estoques para realizar transferências entre bases.');
  warehouseForm();
  return;
 }
 if(!isWarehouse(from))from=state.warehouses[0].id;
 if(!isWarehouse(to)||to===from)to=state.warehouses.find(w=>w.id!==from)?.id||'';
 showModal('Transferir entre estoques','Movimente peças entre bases com saldo e endereço rastreáveis.',`<form id="transfer-form"><div class="modal-body"><div class="error" id="form-error" role="alert"></div><div class="form-grid"><div class="field"><label for="transfer-from">Estoque de origem *</label><select id="transfer-from" name="from">${warehouseOptions(from)}</select></div><div class="field"><label for="transfer-to">Estoque de destino *</label><select id="transfer-to" name="to">${warehouseOptions(to)}</select></div></div><div class="field"><label for="transfer-part">Produto *</label><select id="transfer-part" name="part" required></select><small id="transfer-origin-address"></small></div><div class="field"><label for="transfer-qty">Quantidade a transferir *</label><input class="input" id="transfer-qty" name="qty" type="number" value="1" min="1" step="1" required inputmode="numeric"></div><div class="form-section-label">${icon('pin')}ARMAZENAMENTO NO DESTINO</div><div id="transfer-address"></div><div class="transfer-preview" id="transfer-preview"></div><div class="field"><label for="transfer-note">Motivo da transferência *</label><textarea id="transfer-note" name="note" placeholder="Ex.: reposição para a equipe de Messejana" maxlength="300" required></textarea></div><div class="form-note">${icon('shield')}Ao confirmar, a quantidade sai da origem e entra no destino. O total da rede permanece igual.</div></div><div class="modal-footer"><button type="button" class="button secondary" data-close>Cancelar</button><button type="submit" class="button" id="transfer-submit">${icon('arrows')}Confirmar transferência</button></div></form>`);
 const form=document.getElementById('transfer-form'),fromEl=document.getElementById('transfer-from'),toEl=document.getElementById('transfer-to'),partEl=document.getElementById('transfer-part'),qtyEl=document.getElementById('transfer-qty');
 const preview=()=>{const selPid=partEl.value,qty=Number(qtyEl.value),a=state.stock[fromEl.value]?.[selPid]||0,b=state.stock[toEl.value]?.[selPid]||0,valid=Number.isSafeInteger(qty)&&qty>0&&qty<=a&&fromEl.value!==toEl.value;document.getElementById('transfer-preview').innerHTML=`<div><small>ORIGEM · ${e(locName(fromEl.value))}</small><strong>${a} <span>→</span> ${valid?a-qty:'—'} <em>un.</em></strong></div><div><small>DESTINO · ${e(locName(toEl.value))}</small><strong>${b} <span>→</span> ${valid?b+qty:'—'} <em>un.</em></strong></div>`};
 const address=()=>{const selP=partEl.value,a=state.locations[toEl.value]?.[selP];document.getElementById('transfer-origin-address').textContent='Origem: '+slotLabel(state.locations[fromEl.value]?.[selP]);document.getElementById('transfer-address').innerHTML=a?`<div class="stock-note">${icon('pin')}${e(slotLabel(a))}</div>`:`<div class="form-grid"><div class="field"><label for="transfer-corridor">Corredor no destino *</label><input class="input" id="transfer-corridor" name="corridor" placeholder="Ex.: B" maxlength="40" required></div><div class="field"><label for="transfer-shelf">Prateleira no destino *</label><input class="input" id="transfer-shelf" name="shelf" placeholder="Ex.: 02" maxlength="40" required></div></div><p class="small muted" style="font-size:10px;margin:-5px 0 18px">Primeiro envio deste produto: informe onde ele será guardado.</p>`;preview()};
 const fillParts=()=>{const selected=partEl.value||pid,rows=state.parts.filter(p=>state.locations[fromEl.value]?.[p.id]);partEl.innerHTML=rows.length?rows.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${e(p.sku)} · ${e(p.name)} (${state.stock[fromEl.value]?.[p.id]||0} un.)</option>`).join(''):'<option value="">Nenhum produto neste estoque</option>';document.getElementById('transfer-submit').disabled=!rows.length;address()};
 fromEl.onchange=()=>{if(fromEl.value===toEl.value)toEl.value=state.warehouses.find(w=>w.id!==fromEl.value)?.id||fromEl.value;fillParts()};toEl.onchange=address;partEl.onchange=address;qtyEl.oninput=preview;fillParts();
 form.onsubmit=async ev=>{
  ev.preventDefault();
  try{
   await doCommit({...Object.fromEntries(new FormData(form)),kind:'transfer'});
   closeModal();render();toast('Transferência concluída. Saldos dos dois estoques atualizados.');
  }catch(err){const el=document.getElementById('form-error');el.textContent=err.message;el.scrollIntoView({block:'nearest'})}
 };
}

function systemModal(){
 showModal('Acessos e Banco de Dados','Gerencie contas de usuários (Operação e Técnicos) e os dados do servidor.',`<div class="modal-body">
  <div class="error" id="sys-error" role="alert"></div>
  <h3 style="margin-bottom:10px">Usuários com acesso ao sistema</h3>
  <div class="table-wrap" style="border:1px solid var(--line);border-radius:8px;margin-bottom:20px">
   <table>
    <thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th></th></tr></thead>
    <tbody>
     ${users.map(u=>`<tr>
      <td><strong>${e(u.name)}</strong></td>
      <td class="mono">@${e(u.username)}</td>
      <td>${u.role==='ops'?badge('Operação','green'):badge('Técnico · '+(tech(u.technicianId)?.name||'Campo'),'blue')}</td>
      <td style="text-align:right">${u.id!==currentUser?.id?`<button type="button" class="text-link danger" data-del-user="${u.id}">Remover</button>`:'<span class="muted small">Sessão atual</span>'}</td>
     </tr>`).join('')}
    </tbody>
   </table>
  </div>
  <form id="user-form" style="background:#fafbf8;border:1px solid var(--line);border-radius:8px;padding:16px;margin-bottom:22px">
   <h3 style="margin-bottom:12px">Adicionar ou atualizar usuário</h3>
   <div class="form-grid">
    <div class="field"><label for="u-name">Nome *</label><input class="input" id="u-name" name="name" placeholder="Ex.: Carlos Souza" required></div>
    <div class="field"><label for="u-login">Login *</label><input class="input" id="u-login" name="username" placeholder="Ex.: carlos" required></div>
   </div>
   <div class="form-grid">
    <div class="field"><label for="u-pass">Senha *</label><input class="input" id="u-pass" name="password" type="password" placeholder="Mínimo 4 caracteres" required></div>
    <div class="field"><label for="u-role">Perfil de acesso *</label><select id="u-role" name="role"><option value="ops">Controle Operacional (Total)</option><option value="tech" ${state.technicians.length?'':'disabled'}>Técnico em campo</option></select></div>
   </div>
   <div class="field" id="u-tech-wrap" style="display:none">
    <label for="u-tech">Técnico vinculado *</label>
    <select id="u-tech" name="technicianId">${state.technicians.map(t=>`<option value="${t.id}">${e(t.name)} (${e(t.vehicle)})</option>`).join('')}</select>
   </div>
   <button type="submit" class="button">${icon('plus')}Salvar usuário</button>
  </form>
  <div class="form-section-label">${icon('box')}MANUTENÇÃO DO BANCO DE DADOS</div>
  <div class="guide-summary" style="margin-bottom:12px">
   Você pode iniciar o banco de dados completamente limpo (zerado) para cadastrar apenas os dados reais da sua empresa, ou carregar o cenário de exemplo para testes.
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap">
   <button type="button" class="button secondary" id="btn-seed-data">${icon('box')}Carregar dados de exemplo</button>
   <button type="button" class="button danger" id="btn-clear-data">${icon('reset')}Zerar banco de dados (iniciar limpo)</button>
  </div>
 </div>`,`<button class="button secondary" data-close>Fechar</button>`,true);

 const roleSelect=document.getElementById('u-role'),techWrap=document.getElementById('u-tech-wrap');
 roleSelect.onchange=()=>{techWrap.style.display=roleSelect.value==='tech'?'flex':'none'};
 modalRoot.querySelectorAll('[data-del-user]').forEach(b=>b.onclick=async ()=>{
  try{
   const res=await apiRequest('DELETE',`/api/users/${encodeURIComponent(b.dataset.delUser)}`);
   applySession(res);systemModal();toast('Usuário removido.');
  }catch(err){document.getElementById('sys-error').textContent=err.message}
 });
 document.getElementById('user-form').onsubmit=async ev=>{
  ev.preventDefault();
  try{
   const fd=Object.fromEntries(new FormData(ev.currentTarget));
   const res=await apiRequest('POST','/api/users',fd);
   applySession({users:res.users});systemModal();toast('Usuário salvo com sucesso.');
  }catch(err){document.getElementById('sys-error').textContent=err.message}
 };
 document.getElementById('btn-seed-data').onclick=()=>confirmDatabaseReset('seed');
 document.getElementById('btn-clear-data').onclick=()=>confirmDatabaseReset('empty');
}

function confirmDatabaseReset(mode){
 const isSeed=mode==='seed';
 showModal(isSeed?'Carregar dados de exemplo?':'Zerar banco de dados?',isSeed?'Preenche o banco SQLite com estoques, produtos, técnicos e movimentações de demonstração.':'Remove todos os estoques, produtos, técnicos e movimentações para começar do zero.',`<div class="modal-body"><div class="error" id="reset-error" role="alert"></div><p class="small muted" style="line-height:1.8">${isSeed?'Os cadastros atuais serão substituídos pela base de exemplo (2 estoques, 8 produtos e 6 técnicos, com logins criados automaticamente conforme a senha padrão configurada no ambiente).':'Todos os cadastros de estoques, produtos, técnicos e histórico serão apagados do banco de dados SQLite. Sua conta de Controle Operacional será mantida.'}</p></div>`,`<button class="button secondary" data-close>Cancelar</button><button class="button ${isSeed?'':'danger'}" id="confirm-reset-btn">${icon(isSeed?'check':'reset')}${isSeed?'Carregar base de exemplo':'Confirmar limpeza total'}</button>`);
 document.getElementById('confirm-reset-btn').onclick=async ()=>{
  try{
   if(apiOnline){
    const res=await apiRequest('POST','/api/system/reset',{mode});
    applySession(res);
   }else{
    state=isSeed?G.seed():G.emptyState();
    persistLocal();
   }
   clearFilters();closeModal();page='overview';render();
   toast(isSeed?'Dados de exemplo carregados no banco de dados.':'Banco de dados zerado. Pronto para seus cadastros reais.');
  }catch(err){document.getElementById('reset-error').textContent=err.message}
 };
}

async function boot(){
 try{
  const res=await fetch('/api/bootstrap',{headers:authToken?{'Authorization':`Bearer ${authToken}`}:{}});
  if(res.status===401){
   apiOnline=true;currentUser=null;renderLogin();return;
  }
  if(res.ok){
   apiOnline=true;
   const data=await res.json();
   applySession(data);
   render();
   return;
  }
 }catch{
  apiOnline=false;
 }
 render();
}

boot();
})();
