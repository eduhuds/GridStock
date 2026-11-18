'use client';
import type { GridStockState } from '@/lib/domain';
import { emptyMovementFilter, type MovementFilter } from '@/lib/movementFilters';
export function HistoryFilters({value, onChange, state}: {value: MovementFilter; onChange: (v: MovementFilter) => void; state: GridStockState}) {
  const invalid = !!(value.from && value.to && value.from > value.to);
  return <div className="operation-filters"><div className="operation-filter-fields">
    <label>Data inicial<input className="input" type="date" value={value.from} max={value.to || undefined} onChange={e => onChange({...value, from:e.target.value})} /></label>
    <label>Data final<input className="input" type="date" value={value.to} min={value.from || undefined} onChange={e => onChange({...value, to:e.target.value})} /></label>
    <label>Estoque<select value={value.warehouse} onChange={e => onChange({...value, warehouse:e.target.value})}><option value="">Todos os estoques</option>{state.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
    <label>Responsável pelo registro<select value={value.operator} onChange={e => onChange({...value, operator:e.target.value})}><option value="">Todos os responsáveis</option>{[...new Set(state.movements.map(m => m.operator).filter((v): v is string => !!v))].sort().map(name => <option key={name} value={name}>{name}</option>)}</select></label>
    <button className="button secondary" type="button" disabled={!Object.values(value).some(Boolean)} onClick={() => onChange({...emptyMovementFilter})}>Limpar período e responsáveis</button>
  </div><p className={invalid ? 'error' : 'muted small'} role={invalid ? 'alert' : undefined}>{invalid ? 'A data final deve ser igual ou posterior à data inicial.' : 'Datas no horário de Fortaleza. O estoque considera origem e destino das transferências.'}</p></div>;
}
export function SetupChecklist({state, warehouse, product, entry}: {state:GridStockState; warehouse:()=>void; product:()=>void; entry:()=>void}) {
  const hasW = state.warehouses.length > 0, hasP = state.parts.length > 0;
  const stocked = Object.values(state.stock).some(items => Object.values(items).some(q => q > 0)) || state.movements.some(m => ['entry','stockout','withdraw','use','return','transfer'].includes(m.kind));
  if (hasW && hasP && stocked) return null;
  const steps = [
    {done:hasW, title:'Cadastre seu estoque', text:'Defina onde os produtos serão armazenados.', action:warehouse, label:'Cadastrar estoque', enabled:true},
    {done:hasP, title:'Cadastre os produtos', text:hasW ? 'Informe código, categoria e endereço de cada produto.' : 'Primeiro, cadastre um estoque para receber os produtos.', action:product, label:'Cadastrar produto', enabled:hasW},
    {done:stocked, title:'Registre o primeiro saldo', text:hasP ? 'Informe o saldo inicial no cadastro ou registre uma entrada.' : 'Cadastre um produto para liberar a primeira entrada.', action:entry, label:'Registrar entrada', enabled:hasW && hasP},
  ];
  return <section className="setup-panel operation-setup" aria-label="Primeiros passos da operação"><div className="setup-head"><div><span className="page-eyebrow">COMECE POR AQUI</span><h2>Prepare sua operação</h2><p>{steps.filter(s => s.done).length} de 3 etapas concluídas. Siga os passos para começar a movimentar seu estoque.</p></div></div><div className="setup-grid">{steps.map((s,i) => <div key={s.title} className={`setup-step ${s.done ? 'done' : ''}`}><div><div className="setup-step-top"><span>PASSO {i+1}</span><span className={`badge ${s.done ? 'green' : 'amber'}`}>{s.done ? 'Concluído' : 'Pendente'}</span></div><h3>{s.title}</h3><p>{s.text}</p></div><button type="button" className={`button ${s.done ? 'secondary' : ''}`} disabled={!s.enabled} onClick={s.action}>{s.label}</button></div>)}</div></section>;
}
export type Requirement = { message:string; label:string; action:()=>void };
export function RequirementDialog({requirement, close}: {requirement:Requirement; close:()=>void}) {
 return <div className="modal-overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="operation-requirement"><div className="modal-header"><h2 id="operation-requirement">Antes de continuar</h2></div><div className="modal-body"><p>{requirement.message}</p></div><div className="modal-footer"><button className="button secondary" autoFocus onClick={close}>Voltar</button><button className="button" onClick={() => {close();requirement.action();}}>{requirement.label}</button></div></section></div>;
}
