'use client';
import { HistoryFilters, SetupChecklist, RequirementDialog, type Requirement } from './OperationalTools';
import { emptyMovementFilter, matchesMovementFilter } from '@/lib/movementFilters';
import { useState, useRef, type FormEvent } from 'react';
import type { GridStockState, Movement } from '@/lib/domain';
import CompanyUsersPanel from './CompanyUsersPanel';
import { can, type Permission } from '@/lib/permissions';
import type { UserAccount, CompanyAuditEntry } from '@/lib/db';
import { businessLabels, type CompanyConfig } from '@/lib/companyConfig';
import { parseXlsxBytes } from '@/lib/xlsx';
import ThemeToggle from './ThemeToggle';
import RestockOrderModal from './RestockOrderModal';
import BarcodeScannerModal from './BarcodeScannerModal';
import ProductQrModal from './ProductQrModal';
import { LegalFooterLinks, openLegalHub } from './LegalAccessibilityHub';
type Payload = { state?: GridStockState; users?: UserAccount[]; audit?: CompanyAuditEntry[] };
type Editor = { type: 'warehouse' | 'product' | 'entry' | 'stockout' | 'transfer' | 'user'; id?: string } | null;
const labels: Record<string, string> = { entry: 'Entrada', stockout: 'Saída', transfer: 'Transferência', withdraw: 'Retirada', return: 'Devolução', use: 'Utilização', count: 'Ajuste', departure: 'Saída do dia', arrival: 'Chegada', finish: 'Conclusão' };
export default function StockWorkspace({ state, users, audit = [], user, name, config, api, update, logout }: {
  state: GridStockState; users: UserAccount[]; audit?: CompanyAuditEntry[]; user: UserAccount; name: string; config: CompanyConfig;
  api: (method: string, url: string, body?: unknown) => Promise<Payload>;
  update: (data: Payload) => void; logout: () => void;
}) {
  const [page, setPage] = useState('overview');
  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [deletion, setDeletion] = useState<{ endpoint: string; name: string } | null>(null);
  const [historyFilter, setHistoryFilter] = useState({...emptyMovementFilter});
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [movementPage, setMovementPage] = useState(1);
  const [restockOpen, setRestockOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrPartId, setQrPartId] = useState<string | 'all' | null>(null);
  const xlsxInputRef = useRef<HTMLInputElement | null>(null);
  const total = state.warehouses.reduce((sum, w) => sum + Object.values(state.stock[w.id] || {}).reduce((a, b) => a + b, 0), 0);
  const low = state.warehouses.flatMap(w => state.parts.filter(p => (state.stock[w.id]?.[p.id] || 0) < p.baseMin).map(p => ({ w, p, qty: state.stock[w.id]?.[p.id] || 0 })));
  function open(type: NonNullable<Editor>['type'], id?: string) {
    const required = ({warehouse:'warehouses',product:'products',entry:'entry',stockout:'stockout',transfer:'transfer'} as Record<string,Permission>)[type];
    if ((required && !can(user,required)) || (type==='user' && !user.companyAdmin)) { setError('Seu acesso não permite esta ação. Fale com o administrador.'); return; }
    setError(''); setNotice('');
    if (type !== 'warehouse' && type !== 'user' && !state.warehouses.length) { setRequirement({message:'Cadastre primeiro o estoque onde os produtos ficarão armazenados.',label:'Cadastrar estoque',action:()=>open('warehouse')}); return; }
    if (['entry','stockout','transfer'].includes(type) && !state.parts.length) { setRequirement({message:'Cadastre um produto antes de registrar entradas, saídas ou transferências.',label:'Cadastrar produto',action:()=>open('product')}); return; }
    if (type === 'transfer' && state.warehouses.length < 2) { setRequirement({message:'Uma transferência precisa de dois estoques: origem e destino.',label:'Cadastrar estoque',action:()=>open('warehouse')}); return; }
    setEditor({type,id});
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor) return; setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...values, ...(editor.id ? { id: editor.id } : {}) };
    const endpoint = editor.type === 'warehouse' ? '/api/warehouses' : editor.type === 'product' ? '/api/products' : editor.type === 'user' ? '/api/users' : '/api/movements';
    try { const data = await api('POST', endpoint, body); update({ state: data.state, users: data.users, audit: data.audit }); setEditor(null); setNotice('Registro salvo com sucesso.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function handleImportXlsx(file: File) {
    setBusy(true); setError('');
    try {
      const matrix = await parseXlsxBytes(await file.arrayBuffer());
      if (matrix.length < 2) throw new Error('A planilha .xlsx está vazia.');
      const defaultW = state.warehouses[0];
      if (!defaultW) throw new Error('Cadastre um estoque antes de importar produtos.');
      let latest: Payload | null = null;
      let count = 0;
      for (const row of matrix.slice(1)) {
        const sku = String(row[0] || '').trim();
        const prodName = String(row[1] || '').trim();
        const category = String(row[2] || 'Geral').trim() || 'Geral';
        if (!sku || !prodName) continue;
        const baseMin = Math.max(0, Math.floor(Number(row[3] ?? 10) || 0));
        const qty = Math.max(0, Math.floor(Number(row[5] ?? row[4] ?? 0) || 0));
        latest = await api('POST', '/api/products', { sku, name: prodName, category, baseMin, min: 0, qty, warehouse: defaultW.id, corridor: String(row[7] || '01').trim() || '01', shelf: String(row[8] || '01').trim() || '01' });
        count++;
      }
      if (!count) throw new Error('Nenhum produto válido encontrado na planilha .xlsx.');
      if (latest) update({ state: latest.state, users: latest.users, audit: latest.audit });
      setEditor(null);
      setNotice(`${count} produto(s) importado(s) via .xlsx com sucesso.`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); if (xlsxInputRef.current) xlsxInputRef.current.value = ''; }
  }
  async function remove() {
    if (!deletion) return; setBusy(true); setError('');
    try { const data = await api('DELETE', deletion.endpoint); update({ state: data.state, users: data.users, audit: data.audit }); setDeletion(null); setNotice('Registro excluído.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const movementRows = (rows: Movement[]) => <div className="table-wrap"><table><thead><tr><th>Quando</th><th>Tipo</th><th>Produto</th><th>Quantidade</th><th>Estoque</th><th>Motivo / Responsável</th></tr></thead><tbody>{rows.map(m => <tr key={m.id}><td>{new Date(m.ts).toLocaleString('pt-BR')}</td><td>{labels[m.kind] || m.kind}</td><td>{state.parts.find(p => p.id === m.part)?.name || '—'}</td><td>{m.qty ?? '—'}</td><td>{state.warehouses.find(w => w.id === (m.warehouse || m.from))?.name || 'Registro histórico'}{m.to ? ` → ${state.warehouses.find(w => w.id === m.to)?.name || m.to}` : ''}</td><td>{m.note || '—'}<small className="cell-sub">{m.operator}</small></td></tr>)}</tbody></table>{!rows.length && <p className="stock-empty">Nenhuma movimentação registrada.</p>}</div>;
  const filteredHistory = state.movements.filter(m => matchesMovementFilter(m, historyFilter) && [m.id, m.note, m.operator, state.parts.find(p => p.id === m.part)?.name, state.parts.find(p => p.id === m.part)?.sku].join(' ').toLowerCase().includes(query.toLowerCase()));
  const historyPages = Math.max(1, Math.ceil(filteredHistory.length / 25));
  const safePage = Math.min(movementPage, historyPages);
  const warehouseOptions = state.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>);
  const product = state.parts.find(p => p.id === editor?.id);
  const warehouse = state.warehouses.find(w => w.id === editor?.id);
  const account = users.find(u => u.id === editor?.id);
  const text = (field: string, label: string, value = '', required = true, type = 'text') => <label className="field" key={field}>{label}<input className="input" name={field} defaultValue={value} required={required} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 1 : undefined} /></label>;
  return <main className="stock-workspace">
    <header className="company-top"><div className="brand"><img src="/gridstock-mark.svg" alt="" width={36} height={36} /><span>{name}</span></div><button type="button" className="text-link" style={{ textAlign: 'left', color: 'inherit', textDecoration: 'none' }} onClick={() => open('user', user.id)} title="Editar meu perfil e senha"><span><strong>{user.name}</strong><small className="cell-sub">Administrador da empresa · Editar perfil</small></span></button><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ThemeToggle /><button className="button secondary" onClick={logout}>Sair</button></div></header>
    <nav className="stock-navigation" aria-label="Páginas da empresa">{Object.entries({ overview: 'Visão geral', products: 'Produtos e inventário', warehouses: 'Estoques', movements: 'Movimentações', users: 'Usuários', audit: `Auditoria (${audit.length})` }).filter(([key])=>key==='users'?user.companyAdmin:key==='audit'?can(user,'audit'):key==='movements'?can(user,'history'):key==='overview'||can(user,'stock')).map(([key, label]) => <button className={`button ${page === key ? '' : 'secondary'}`} aria-current={page === key ? 'page' : undefined} key={key} onClick={() => { setPage(key); setQuery(''); }}>{label}</button>)}</nav>
    <section className="company-hero"><div><span className="page-eyebrow">{businessLabels[config.businessType]} · GESTÃO DE ESTOQUE</span><h1>{({ overview: 'Sua operação, organizada.', products: 'Produtos e inventário', warehouses: 'Seus estoques', movements: 'Entradas e saídas', users: 'Acessos da empresa', audit: 'Auditoria da empresa' } as Record<string,string>)[page]}</h1><p>Produtos, saldos e movimentações de {name}.</p></div><div className="heading-actions"><button className="button secondary" onClick={() => open('entry')}>+ Entrada</button>{config.stockOut && <button className="button" onClick={() => open('stockout')}>Registrar saída</button>}{config.transfers && <button className="button secondary" onClick={() => open('transfer')}>Transferir</button>}</div></section>
    {notice && <p className="company-notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    <div key={page} className="page-transition">
    {page === 'overview' && <><SetupChecklist state={state} warehouse={() => open('warehouse')} product={() => open('product')} entry={() => open('entry')} /><div className="company-metrics"><div><span>Unidades em estoque</span><strong>{total.toLocaleString('pt-BR')}</strong></div><div><span>Produtos cadastrados</span><strong>{state.parts.length}</strong></div><div><span>Itens para reposição</span><strong>{low.length}</strong></div></div><div className="stock-setup"><button className="button secondary" onClick={() => open('warehouse')}>Cadastrar estoque</button><button className="button secondary" disabled={!state.warehouses.length} onClick={() => open('product')}>Cadastrar produto</button><button className="button secondary" onClick={() => setRestockOpen(true)}>Pedido de compra</button></div><section className="panel"><div className="panel-head"><h2>Reposição de estoque</h2>{low.length > 0 && <button className="button secondary" type="button" onClick={() => setRestockOpen(true)}>Gerar pedido de compra</button>}</div>{low.length ? <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Estoque</th><th>Saldo</th><th>Mínimo</th></tr></thead><tbody>{low.map(({w,p,qty}) => <tr key={`${w.id}-${p.id}`}><td>{p.name}</td><td>{w.name}</td><td>{qty}</td><td>{p.baseMin}</td></tr>)}</tbody></table></div> : <p className="stock-empty">Nenhum produto abaixo do mínimo.</p>}</section><section className="panel"><div className="panel-head"><h2>Últimas movimentações</h2></div>{movementRows(state.movements.slice(0, 8))}</section></>}
    {page === 'products' && <section className="panel"><div className="panel-head"><div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}><input className="input company-search" aria-label="Buscar produto" placeholder="Nome, código ou categoria" value={query} onChange={e => setQuery(e.target.value)} /><button className="button secondary" type="button" onClick={() => setScannerOpen(true)}>Bipar código / QR</button>{state.parts.length > 0 && <button className="button secondary" type="button" onClick={() => setQrPartId('all')}>Etiquetas QR</button>}</div><button className="button" disabled={!state.warehouses.length} onClick={() => open('product')}>Cadastrar produto</button></div>{!state.warehouses.length && <p className="stock-empty">Cadastre um estoque para começar.</p>}<div className="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Mínimo</th>{state.warehouses.map(w => <th key={w.id}>{w.name}</th>)}<th>Ações</th></tr></thead><tbody>{state.parts.filter(p => `${p.name} ${p.sku} ${p.category} ${p.supplier || ''}`.toLowerCase().includes(query.toLowerCase())).map(p => <tr key={p.id}><td><strong>{p.name}</strong><small className="cell-sub">{p.sku}{p.unitCost ? ` · R$ ${p.unitCost.toFixed(2)}` : ''}{p.supplier ? ` · ${p.supplier}` : ''}</small></td><td>{p.category}</td><td>{p.baseMin}</td>{state.warehouses.map(w => <td key={w.id}>{state.stock[w.id]?.[p.id] || 0}<small className="cell-sub">{state.locations[w.id]?.[p.id] ? `${state.locations[w.id][p.id].corridor} / ${state.locations[w.id][p.id].shelf}` : 'Sem endereço'}</small></td>)}<td><button className="text-link" onClick={() => setQrPartId(p.id)}>QR Code</button> · <button className="text-link" onClick={() => open('product',p.id)}>Editar</button> · <button className="text-link" onClick={() => setDeletion({ endpoint: `/api/products/${p.id}`, name: p.name })}>Excluir</button></td></tr>)}</tbody></table></div></section>}
    {page === 'warehouses' && <><div className="company-section-title"><p>{state.warehouses.length} de {config.maxWarehouses} estoques disponíveis</p><button className="button" onClick={() => open('warehouse')}>Cadastrar estoque</button></div><div className="company-grid">{state.warehouses.map(w => <article className="company-card" key={w.id}><h2>{w.name}</h2><p>{w.code} · {w.city}<br />{w.address}<br />Responsável: {w.responsible}</p><button className="button secondary" onClick={() => open('warehouse',w.id)}>Editar estoque</button><button className="text-link" onClick={() => setDeletion({ endpoint:`/api/warehouses/${w.id}`, name:w.name })}>Excluir estoque vazio</button></article>)}</div></>}
    {page === 'movements' && <section className="panel"><div className="panel-head"><h2>Histórico da operação</h2></div><div className="toolbar"><input className="input" aria-label="Buscar no histórico" placeholder="Produto, código, motivo ou responsável" value={query} onChange={e => {setQuery(e.target.value);setMovementPage(1);}} /><button className="text-link" onClick={() => {setQuery('');setHistoryFilter({...emptyMovementFilter});setMovementPage(1);}}>Limpar todos os filtros</button></div><HistoryFilters state={state} value={historyFilter} onChange={v => {setHistoryFilter(v);setMovementPage(1);}} />{movementRows(filteredHistory.slice((safePage-1)*25,safePage*25))}<div className="table-footer"><span>{filteredHistory.length} registros · Página {safePage} de {historyPages}</span><button className="button secondary" disabled={safePage <= 1} onClick={() => setMovementPage(safePage-1)}>Anterior</button><button className="button secondary" disabled={safePage >= historyPages} onClick={() => setMovementPage(safePage+1)}>Próxima</button></div></section>}
    {page === 'users' && user.companyAdmin && <section className="panel" style={{padding:24}}><CompanyUsersPanel users={users} currentUser={user} technicians={[]} fieldService={false} api={api} onSaved={update}/></section>}
    {page === 'audit' && <section className="panel"><div className="panel-head"><div><h2>Trilha de Auditoria da Empresa</h2><p>Registro cronológico de acessos, cadastros e movimentações realizadas nesta empresa.</p></div><input className="input company-search" aria-label="Buscar na auditoria" placeholder="Operador, ação, registro ou detalhe" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="table-wrap"><table><thead><tr><th>Quando</th><th>Operador</th><th>Categoria</th><th>Ação</th><th>Registro Afetado</th><th>Detalhes</th></tr></thead><tbody>{audit.filter(a => `${a.actorName} ${a.actorUsername} ${a.action} ${a.target} ${a.detail}`.toLowerCase().includes(query.toLowerCase())).map(a => <tr key={a.id}><td>{new Date(a.ts).toLocaleString('pt-BR')}</td><td><strong>{a.actorName}</strong><small className="cell-sub">{a.actorUsername ? `@${a.actorUsername}` : a.actorRole}</small></td><td>{a.category}</td><td><strong>{a.action}</strong></td><td>{a.target || '—'}</td><td style={{ whiteSpace: 'normal', maxWidth: 340 }}>{a.detail || '—'}</td></tr>)}</tbody></table>{!audit.length && <p className="stock-empty">Nenhum evento de auditoria registrado.</p>}</div></section>}
    </div>

    {deletion && <div className="modal-overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="modal-header"><h2 id="delete-title">Excluir {deletion.name}?</h2></div><div className="modal-body"><p>A exclusão é definitiva. Registros com saldo e o último administrador são protegidos.</p>{error && <p className="error" role="alert">{error}</p>}</div><div className="modal-footer"><button className="button secondary" disabled={busy} onClick={() => setDeletion(null)}>Cancelar</button><button className="button" disabled={busy} onClick={remove}>Excluir</button></div></section></div>}
    {editor && <div className="modal-overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="stock-editor-title"><div className="modal-header"><h2 id="stock-editor-title">{editor.id ? 'Editar' : 'Registrar'} {({warehouse:'estoque',product:'produto',user:'usuário',entry:'entrada',stockout:'saída',transfer:'transferência'})[editor.type]}</h2><button className="button secondary" disabled={busy} onClick={() => setEditor(null)}>Fechar</button></div><form onSubmit={save}><div className="modal-body company-form">{error && <p className="error company-wide" role="alert">{error}</p>}
      {editor.type === 'warehouse' && <>{text('name','Nome',warehouse?.name)}{text('code','Código',warehouse?.code)}{text('city','Cidade',warehouse?.city)}{text('responsible','Responsável',warehouse?.responsible || user.name)}{text('address','Endereço',warehouse?.address,false)}</>}
      {editor.type === 'product' && <>{!editor.id && <div className="company-wide" style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><div><strong style={{ display: 'block', fontSize: '0.9rem' }}>Importar planilha (.xlsx)</strong><small className="cell-sub">Cadastre vários produtos de uma vez enviando um arquivo .xlsx.</small></div><div><button type="button" className="button secondary" disabled={busy} onClick={() => xlsxInputRef.current?.click()}>{busy ? 'Importando...' : 'Importar .xlsx'}</button><input ref={xlsxInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImportXlsx(f); }} /></div></div>}{text('name','Nome',product?.name)}{text('sku','Código / SKU',product?.sku)}{text('category','Categoria',product?.category)}{text('baseMin','Estoque mínimo',String(product?.baseMin || 0),true,'number')}{text('unitCost','Custo unitário R$ (opcional)',product?.unitCost ? String(product.unitCost) : '',false)}{text('supplier','Fornecedor (opcional)',product?.supplier || '',false)}<input type="hidden" name="min" value={product?.min || 0} /><label className="field">Estoque para endereçamento<select name="warehouse" required>{warehouseOptions}</select></label>{text('corridor','Corredor',state.locations[state.warehouses[0]?.id]?.[product?.id || '']?.corridor || '01')}{text('shelf','Prateleira',state.locations[state.warehouses[0]?.id]?.[product?.id || '']?.shelf || '01')}{!editor.id && text('qty','Saldo inicial','0',true,'number')}</>}
      {editor.type === 'user' && <>{text('name','Nome',account?.name)}{text('username','CPF',account?.username)}<label className="field company-wide">{editor.id ? 'Nova senha (opcional)' : 'Senha'}<input className="input" type="password" name="password" autoComplete="new-password" minLength={8} required={!editor.id} /></label><input type="hidden" name="role" value="ops" /></>}
      {['entry','stockout','transfer'].includes(editor.type) && <><input type="hidden" name="kind" value={editor.type} /><label className="field company-wide">Produto<select name="part" required>{state.parts.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label className="field">{editor.type === 'entry' ? 'Estoque de destino' : 'Estoque de origem'}<select name={editor.type === 'transfer' ? 'from' : 'warehouse'} required>{warehouseOptions}</select></label>{editor.type === 'transfer' && <label className="field">Estoque de destino<select name="to" required defaultValue={state.warehouses[1]?.id}>{warehouseOptions}</select></label>}<label className="field">Quantidade (unidades inteiras)<input className="input" name="qty" type="number" min={1} step={1} required defaultValue={1} /></label>{editor.type !== 'stockout' && <>{text('corridor','Corredor no destino','01')}{text('shelf','Prateleira no destino','01')}</>}<label className="field company-wide">Motivo<input className="input" name="note" placeholder={editor.type === 'stockout' ? 'Ex.: venda, consumo interno ou perda' : 'Ex.: recebimento de mercadoria'} required /></label></>}
      </div><div className="modal-footer"><button className="button secondary" type="button" disabled={busy} onClick={() => setEditor(null)}>Cancelar</button><button className="button" disabled={busy}>{busy ? 'Salvando...' : 'Salvar registro'}</button></div></form></section></div>}
    <RestockOrderModal open={restockOpen} state={state} onClose={() => setRestockOpen(false)} />
    <ProductQrModal open={qrPartId !== null} partId={qrPartId} state={state} onClose={() => setQrPartId(null)} onQuickWithdraw={pid => open('stockout', pid)} />
    <BarcodeScannerModal open={scannerOpen} quickParts={state.parts} onClose={() => setScannerOpen(false)} onDetected={code => { setQuery(code); setNotice(`Código lido: ${code}`); }} />
    {requirement && <RequirementDialog requirement={requirement} close={() => setRequirement(null)} />}
    <footer className="company-footer">
      <div>{name} · Administrador da empresa · GRIDSTOCK</div>
      <LegalFooterLinks compact />
    </footer>
  </main>;
}
