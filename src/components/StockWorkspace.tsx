'use client';
import { useState, useRef, type FormEvent } from 'react';
import type { GridStockState, Movement } from '@/lib/domain';
import type { UserAccount } from '@/lib/db';
import { businessLabels, type CompanyConfig } from '@/lib/companyConfig';
import { parseXlsxBytes } from '@/lib/xlsx';
type Payload = { state?: GridStockState; users?: UserAccount[] };
type Editor = { type: 'warehouse' | 'product' | 'entry' | 'stockout' | 'transfer' | 'user'; id?: string } | null;
const labels: Record<string, string> = { entry: 'Entrada', stockout: 'Saída', transfer: 'Transferência', withdraw: 'Retirada', return: 'Devolução', use: 'Utilização', count: 'Ajuste', departure: 'Saída do dia', arrival: 'Chegada', finish: 'Conclusão' };
export default function StockWorkspace({ state, users, user, name, config, api, update, logout }: {
  state: GridStockState; users: UserAccount[]; user: UserAccount; name: string; config: CompanyConfig;
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
  const [confirmReset, setConfirmReset] = useState(false);
  const xlsxInputRef = useRef<HTMLInputElement | null>(null);
  const total = state.warehouses.reduce((sum, w) => sum + Object.values(state.stock[w.id] || {}).reduce((a, b) => a + b, 0), 0);
  const low = state.warehouses.flatMap(w => state.parts.filter(p => (state.stock[w.id]?.[p.id] || 0) < p.baseMin).map(p => ({ w, p, qty: state.stock[w.id]?.[p.id] || 0 })));
  function open(type: NonNullable<Editor>['type'], id?: string) { setError(''); setNotice(''); setEditor({ type, id }); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor) return; setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...values, ...(editor.id ? { id: editor.id } : {}) };
    const endpoint = editor.type === 'warehouse' ? '/api/warehouses' : editor.type === 'product' ? '/api/products' : editor.type === 'user' ? '/api/users' : '/api/movements';
    try { const data = await api('POST', endpoint, body); update({ state: data.state, users: data.users }); setEditor(null); setNotice('Registro salvo com sucesso.'); }
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
      if (latest) update({ state: latest.state, users: latest.users });
      setEditor(null);
      setNotice(`${count} produto(s) importado(s) via .xlsx com sucesso.`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); if (xlsxInputRef.current) xlsxInputRef.current.value = ''; }
  }
  async function handleResetDb() {
    setBusy(true); setError('');
    try {
      const data = await api('POST', '/api/reset', { mode: 'empty' });
      update({ state: data.state, users: data.users });
      setConfirmReset(false);
      setNotice('Banco de dados zerado com sucesso.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deletion) return; setBusy(true); setError('');
    try { const data = await api('DELETE', deletion.endpoint); update({ state: data.state, users: data.users }); setDeletion(null); setNotice('Registro excluído.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const movementRows = (rows: Movement[]) => <div className="table-wrap"><table><thead><tr><th>Quando</th><th>Tipo</th><th>Produto</th><th>Quantidade</th><th>Estoque</th><th>Motivo / Responsável</th></tr></thead><tbody>{rows.map(m => <tr key={m.id}><td>{new Date(m.ts).toLocaleString('pt-BR')}</td><td>{labels[m.kind] || m.kind}</td><td>{state.parts.find(p => p.id === m.part)?.name || '—'}</td><td>{m.qty ?? '—'}</td><td>{state.warehouses.find(w => w.id === (m.warehouse || m.from))?.name || 'Registro histórico'}{m.to ? ` → ${state.warehouses.find(w => w.id === m.to)?.name || m.to}` : ''}</td><td>{m.note || '—'}<small className="cell-sub">{m.operator}</small></td></tr>)}</tbody></table>{!rows.length && <p className="stock-empty">Nenhuma movimentação registrada.</p>}</div>;
  const warehouseOptions = state.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>);
  const product = state.parts.find(p => p.id === editor?.id);
  const warehouse = state.warehouses.find(w => w.id === editor?.id);
  const account = users.find(u => u.id === editor?.id);
  const text = (field: string, label: string, value = '', required = true, type = 'text') => <label className="field" key={field}>{label}<input className="input" name={field} defaultValue={value} required={required} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 1 : undefined} /></label>;
  return <main className="stock-workspace">
    <header className="company-top"><div className="brand"><img src="/gridstock-mark.svg" alt="" width={36} height={36} /><span>{name}</span></div><span>{user.name}<small className="cell-sub">Administrador da empresa</small></span><div style={{ display: 'flex', gap: 8 }}><button className="button danger" type="button" onClick={() => { setError(''); setConfirmReset(true); }}>Zerar banco (teste)</button><button className="button secondary" onClick={logout}>Sair</button></div></header>
    <nav className="stock-navigation" aria-label="Páginas da empresa">{Object.entries({ overview: 'Visão geral', products: 'Produtos e inventário', warehouses: 'Estoques', movements: 'Movimentações', users: 'Usuários' }).map(([key, label]) => <button className={`button ${page === key ? '' : 'secondary'}`} aria-current={page === key ? 'page' : undefined} key={key} onClick={() => { setPage(key); setQuery(''); }}>{label}</button>)}</nav>
    <section className="company-hero"><div><span className="page-eyebrow">{businessLabels[config.businessType]} · GESTÃO DE ESTOQUE</span><h1>{({ overview: 'Sua operação, organizada.', products: 'Produtos e inventário', warehouses: 'Seus estoques', movements: 'Entradas e saídas', users: 'Acessos da empresa' } as Record<string,string>)[page]}</h1><p>Produtos, saldos e movimentações de {name}.</p></div><div className="heading-actions"><button className="button secondary" disabled={!state.parts.length} onClick={() => open('entry')}>+ Entrada</button>{config.stockOut && <button className="button" disabled={!state.parts.length} onClick={() => open('stockout')}>Registrar saída</button>}{config.transfers && <button className="button secondary" disabled={state.warehouses.length < 2 || !state.parts.length} onClick={() => open('transfer')}>Transferir</button>}</div></section>
    {notice && <p className="company-notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    {page === 'overview' && <><div className="company-metrics"><div><span>Unidades em estoque</span><strong>{total.toLocaleString('pt-BR')}</strong></div><div><span>Produtos cadastrados</span><strong>{state.parts.length}</strong></div><div><span>Itens para reposição</span><strong>{low.length}</strong></div></div><div className="stock-setup"><button className="button secondary" onClick={() => open('warehouse')}>Cadastrar estoque</button><button className="button secondary" disabled={!state.warehouses.length} onClick={() => open('product')}>Cadastrar produto</button></div><section className="panel"><div className="panel-head"><h2>Reposição de estoque</h2></div>{low.length ? <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Estoque</th><th>Saldo</th><th>Mínimo</th></tr></thead><tbody>{low.map(({w,p,qty}) => <tr key={`${w.id}-${p.id}`}><td>{p.name}</td><td>{w.name}</td><td>{qty}</td><td>{p.baseMin}</td></tr>)}</tbody></table></div> : <p className="stock-empty">Nenhum produto abaixo do mínimo.</p>}</section><section className="panel"><div className="panel-head"><h2>Últimas movimentações</h2></div>{movementRows(state.movements.slice(0, 8))}</section></>}
    {page === 'products' && <section className="panel"><div className="panel-head"><input className="input company-search" aria-label="Buscar produto" placeholder="Nome, código ou categoria" value={query} onChange={e => setQuery(e.target.value)} /><button className="button" disabled={!state.warehouses.length} onClick={() => open('product')}>Cadastrar produto</button></div>{!state.warehouses.length && <p className="stock-empty">Cadastre um estoque para começar.</p>}<div className="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Mínimo</th>{state.warehouses.map(w => <th key={w.id}>{w.name}</th>)}<th>Ações</th></tr></thead><tbody>{state.parts.filter(p => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase())).map(p => <tr key={p.id}><td><strong>{p.name}</strong><small className="cell-sub">{p.sku}</small></td><td>{p.category}</td><td>{p.baseMin}</td>{state.warehouses.map(w => <td key={w.id}>{state.stock[w.id]?.[p.id] || 0}<small className="cell-sub">{state.locations[w.id]?.[p.id] ? `${state.locations[w.id][p.id].corridor} / ${state.locations[w.id][p.id].shelf}` : 'Sem endereço'}</small></td>)}<td><button className="text-link" onClick={() => open('product',p.id)}>Editar</button> · <button className="text-link" onClick={() => setDeletion({ endpoint: `/api/products/${p.id}`, name: p.name })}>Excluir</button></td></tr>)}</tbody></table></div></section>}
    {page === 'warehouses' && <><div className="company-section-title"><p>{state.warehouses.length} de {config.maxWarehouses} estoques disponíveis</p><button className="button" onClick={() => open('warehouse')}>Cadastrar estoque</button></div><div className="company-grid">{state.warehouses.map(w => <article className="company-card" key={w.id}><h2>{w.name}</h2><p>{w.code} · {w.city}<br />{w.address}<br />Responsável: {w.responsible}</p><button className="button secondary" onClick={() => open('warehouse',w.id)}>Editar estoque</button><button className="text-link" onClick={() => setDeletion({ endpoint:`/api/warehouses/${w.id}`, name:w.name })}>Excluir estoque vazio</button></article>)}</div></>}
    {page === 'movements' && <section className="panel"><div className="panel-head"><h2>Histórico da operação</h2></div>{movementRows(state.movements)}</section>}
    {page === 'users' && <section className="panel"><div className="panel-head"><div><h2>Administradores da empresa</h2><p>{users.length} de {config.maxUsers} usuários. Permissão para gerenciar esta operação.</p></div><button className="button" onClick={() => open('user')}>Cadastrar usuário</button></div><div className="table-wrap"><table><thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Ações</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.username}</td><td>{u.role === 'ops' ? 'Administrador da empresa' : 'Acesso de campo desabilitado'}</td><td>{u.role === 'ops' && <button className="text-link" onClick={() => open('user',u.id)}>Editar</button>}{u.id !== user.id && <> · <button className="text-link" onClick={() => setDeletion({ endpoint:`/api/users/${u.id}`, name:u.name })}>Excluir</button></>}</td></tr>)}</tbody></table></div><p className="stock-empty">Segmento, módulos e limites são definidos pelo administrador da plataforma.</p></section>}
    {confirmReset && <div className="modal-overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div className="modal-header"><h2 id="reset-title">Zerar banco de dados?</h2></div><div className="modal-body"><p>Remove todos os estoques, produtos e movimentações desta empresa para começar do zero.</p>{error && <p className="error" role="alert">{error}</p>}</div><div className="modal-footer"><button className="button secondary" disabled={busy} onClick={() => setConfirmReset(false)}>Cancelar</button><button className="button danger" disabled={busy} onClick={handleResetDb}>Confirmar e zerar</button></div></section></div>}
    {deletion && <div className="modal-overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="modal-header"><h2 id="delete-title">Excluir {deletion.name}?</h2></div><div className="modal-body"><p>A exclusão é definitiva. Registros com saldo e o último administrador são protegidos.</p>{error && <p className="error" role="alert">{error}</p>}</div><div className="modal-footer"><button className="button secondary" disabled={busy} onClick={() => setDeletion(null)}>Cancelar</button><button className="button" disabled={busy} onClick={remove}>Excluir</button></div></section></div>}
    {editor && <div className="modal-overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="stock-editor-title"><div className="modal-header"><h2 id="stock-editor-title">{editor.id ? 'Editar' : 'Registrar'} {({warehouse:'estoque',product:'produto',user:'usuário',entry:'entrada',stockout:'saída',transfer:'transferência'})[editor.type]}</h2><button className="button secondary" disabled={busy} onClick={() => setEditor(null)}>Fechar</button></div><form onSubmit={save}><div className="modal-body company-form">{error && <p className="error company-wide" role="alert">{error}</p>}
      {editor.type === 'warehouse' && <>{text('name','Nome',warehouse?.name)}{text('code','Código',warehouse?.code)}{text('city','Cidade',warehouse?.city)}{text('responsible','Responsável',warehouse?.responsible || user.name)}{text('address','Endereço',warehouse?.address,false)}</>}
      {editor.type === 'product' && <>{!editor.id && <div className="company-wide" style={{ background: '#f4f8f5', border: '1px solid #cfe0d6', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><div><strong style={{ display: 'block', fontSize: '0.9rem' }}>Importar planilha (.xlsx)</strong><small className="cell-sub">Cadastre vários produtos de uma vez enviando um arquivo .xlsx.</small></div><div><button type="button" className="button secondary" disabled={busy} onClick={() => xlsxInputRef.current?.click()}>{busy ? 'Importando...' : 'Importar .xlsx'}</button><input ref={xlsxInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImportXlsx(f); }} /></div></div>}{text('name','Nome',product?.name)}{text('sku','Código / SKU',product?.sku)}{text('category','Categoria',product?.category)}{text('baseMin','Estoque mínimo',String(product?.baseMin || 0),true,'number')}<input type="hidden" name="min" value={product?.min || 0} /><label className="field">Estoque para endereçamento<select name="warehouse" required>{warehouseOptions}</select></label>{text('corridor','Corredor',state.locations[state.warehouses[0]?.id]?.[product?.id || '']?.corridor || '01')}{text('shelf','Prateleira',state.locations[state.warehouses[0]?.id]?.[product?.id || '']?.shelf || '01')}{!editor.id && text('qty','Saldo inicial','0',true,'number')}</>}
      {editor.type === 'user' && <>{text('name','Nome',account?.name)}{text('username','Usuário',account?.username)}<label className="field company-wide">{editor.id ? 'Nova senha (opcional)' : 'Senha'}<input className="input" type="password" name="password" autoComplete="new-password" minLength={8} required={!editor.id} /></label><input type="hidden" name="role" value="ops" /></>}
      {['entry','stockout','transfer'].includes(editor.type) && <><input type="hidden" name="kind" value={editor.type} /><label className="field company-wide">Produto<select name="part" required>{state.parts.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label className="field">{editor.type === 'entry' ? 'Estoque de destino' : 'Estoque de origem'}<select name={editor.type === 'transfer' ? 'from' : 'warehouse'} required>{warehouseOptions}</select></label>{editor.type === 'transfer' && <label className="field">Estoque de destino<select name="to" required defaultValue={state.warehouses[1]?.id}>{warehouseOptions}</select></label>}<label className="field">Quantidade (unidades inteiras)<input className="input" name="qty" type="number" min={1} step={1} required defaultValue={1} /></label>{editor.type !== 'stockout' && <>{text('corridor','Corredor no destino','01')}{text('shelf','Prateleira no destino','01')}</>}<label className="field company-wide">Motivo<input className="input" name="note" placeholder={editor.type === 'stockout' ? 'Ex.: venda, consumo interno ou perda' : 'Ex.: recebimento de mercadoria'} required /></label></>}
      </div><div className="modal-footer"><button className="button secondary" type="button" disabled={busy} onClick={() => setEditor(null)}>Cancelar</button><button className="button" disabled={busy}>{busy ? 'Salvando...' : 'Salvar registro'}</button></div></form></section></div>}
    <footer className="company-footer">{name} · Administrador da empresa · GRIDSTOCK</footer>
  </main>;
}
