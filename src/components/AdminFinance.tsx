'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { summarizeFinance, financePeriod, previousFinancePeriod, financeTimeline, filterFinanceEntries, type FinanceEntry } from '@/lib/finance';
import type { AdminCompany } from '@/lib/adminOverview';
import BrandLoading from './BrandLoading';
import AdminFinanceChart from './AdminFinanceChart';
import { Icon } from './icons';
import { downloadAdminCsv } from '@/lib/adminExport';

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const todayLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
const dateLabel = (date: string) => date.split('-').reverse().join('/');
const blankEntry = () => ({ id: '', companyId: '', kind: 'income', description: '', amount: '', dueDate: todayLocal(), paidDate: todayLocal(), status: 'pending' });

export default function AdminFinance({ companies, onSessionExpired }: { companies: AdminCompany[]; onSessionExpired: () => void }) {
  const today = todayLocal();
  const [from, setFrom] = useState(today.slice(0, 7) + '-01');
  const [to, setTo] = useState(today);
  const [preset, setPreset] = useState('month');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [kind, setKind] = useState('all');
  const [company, setCompany] = useState('all');
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const editorRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (editing) editorRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }, [editing]);
  const [form, setForm] = useState(blankEntry);
  const [page, setPage] = useState(1);
  const validPeriod = !!from && !!to && from <= to && Date.parse(to) - Date.parse(from) < 366 * 86400000;
  const scoped = useMemo(() => entries.filter(e => company === 'all' || e.companyId === company), [entries, company]);
  const summary = useMemo(() => summarizeFinance(scoped, from, to, today), [scoped, from, to, today]);
  const timeline = useMemo(() => financeTimeline(summary.days, from, to), [summary.days, from, to]);
  const previous = previousFinancePeriod(from, to);
  const previousSummary = useMemo(() => previous ? summarizeFinance(scoped, previous.from, previous.to, today) : null, [scoped, previous?.from, previous?.to, today]);
  const filtered = useMemo(() => filterFinanceEntries(scoped, from, to, query, status, kind, today), [scoped, from, to, query, status, kind, today]);
  const ranking = useMemo(() => {
    const rows = new Map<string, { name: string; amount: number }>();
    for (const entry of scoped) if (entry.status === 'paid' && entry.kind === 'income' && entry.paidDate >= from && entry.paidDate <= to) {
      const row = rows.get(entry.companyId) || { name: entry.companyName, amount: 0 };
      row.amount += entry.amountCents; rows.set(entry.companyId, row);
    }
    return [...rows.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [scoped, from, to]);
  const pending = useMemo(() => scoped.filter(entry => entry.status === 'pending' && entry.dueDate >= from && entry.dueDate <= to).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5), [scoped, from, to]);
  function choosePeriod(value: 'today' | 'month' | '30days') { const period = financePeriod(value, today); setFrom(period.from); setTo(period.to); setPreset(value); setPage(1); }
  function comparison(value: number, old: number) { return old > 0 ? `${value >= old ? '+' : ''}${((value - old) / old * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs. período anterior` : value > 0 ? 'Sem recebimentos na base anterior' : 'Sem variação no período'; }
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const visiblePage = Math.min(page, pages);
  async function load(signal?: AbortSignal) {
    const response = await fetch('/api/admin/finance', { signal });
    if (response.status === 403) { onSessionExpired(); throw new Error('Sessão expirada. Entre novamente.'); }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível consultar o financeiro.');
    setEntries(data.entries);
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // Load once per admin session; section changes preserve filters and drafts.
    // Unmounting the admin cancels any request still in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    const amount = form.amount.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) { setError('Use um valor como 149,90, sem separador de milhar.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/admin/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amountCents: Math.round(Number(amount) * 100) }) });
      if (response.status === 403) onSessionExpired();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');
      setEntries(data.entries); setEditing(false); setForm(blankEntry());
      setNotice(data.persistenceWarning || 'Lançamento salvo. O painel considera as datas e a situação informadas.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function edit(entry: FinanceEntry) { setForm({ ...entry, amount: (entry.amountCents / 100).toFixed(2).replace('.', ','), paidDate: entry.paidDate || today }); setEditing(true); setError(''); }
  function exportCsv() {
    const rows = [['Empresa', 'Descrição', 'Tipo', 'Valor (BRL)', 'Vencimento', 'Pagamento', 'Situação'], ...filtered.map(e => [e.companyName, e.description, e.kind === 'income' ? 'Receita' : 'Despesa', (e.amountCents / 100).toFixed(2), e.dueDate, e.paidDate, e.status])];
    downloadAdminCsv(`financeiro-${from}-${to}.csv`, rows);
  }
  if (loading) return <BrandLoading compact message="Consultando o financeiro…" />;
  return <section className="admin-finance">
    <div className="admin-finance-heading finance-toolbar"><div className="finance-presets" aria-label="Período financeiro">{([['today', 'Hoje'], ['month', 'Este mês'], ['30days', 'Últimos 30 dias']] as const).map(([id, label]) => <button key={id} aria-pressed={preset === id} onClick={() => choosePeriod(id)}>{label}</button>)}<button aria-pressed={preset === 'custom'} onClick={() => { setPreset('custom'); document.getElementById('finance-from')?.focus(); }}>Personalizar</button></div><button className="button" onClick={() => { setForm(blankEntry()); setEditing(true); setError(''); }}><Icon name="plus" /> Novo lançamento</button></div>
    <p className="finance-context">Lançamentos manuais · valores em reais · atualizado ao abrir ou ao clicar em Atualizar.</p>
    <div className="admin-filters"><label className="field">De<input className="input" id="finance-from" type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset('custom'); setPage(1); }} /></label><label className="field">Até<input className="input" type="date" value={to} onChange={e => { setTo(e.target.value); setPreset('custom'); setPage(1); }} /></label><label className="field">Empresa<select value={company} onChange={e => { setCompany(e.target.value); setPage(1); }}><option value="all">Toda a plataforma</option><option value="">Custos e receitas gerais</option>{[...new Map([...companies.map(c => [c.id, c.name] as const), ...entries.filter(e => e.companyId && !companies.some(c => c.id === e.companyId)).map(e => [e.companyId, `${e.companyName} (excluída)`] as const)]).entries()].map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label><button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>Atualizar</button></div>
    {!validPeriod && <p role="alert" className="error">Selecione um período válido, de até 366 dias, com início anterior ou igual ao fim.</p>}
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="company-notice" role="status">{notice}</p>}
    {editing && <form ref={editorRef} className="company-editor company-form finance-editor" onSubmit={save}><h3 className="company-wide">{form.id ? 'Editar lançamento' : 'Novo lançamento'}</h3><label className="field">Tipo<select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}><option value="income">Receita</option><option value="expense">Despesa</option></select></label><label className="field">Empresa<select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}><option value="">Plataforma</option>{form.companyId && !companies.some(c => c.id === form.companyId) && <option value={form.companyId}>Empresa excluída (vínculo preservado)</option>}{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field company-wide">Descrição<input className="input" maxLength={160} required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mensalidade, hospedagem, serviço…" /></label><label className="field">Valor em reais<input className="input" inputMode="decimal" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="149,90" /></label><label className="field">Vencimento<input className="input" type="date" required value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></label><label className="field">Situação<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pending">Pendente</option><option value="paid">Pago / recebido</option><option value="cancelled">Cancelado</option></select></label>{form.status === 'paid' && <label className="field">Data do pagamento / recebimento<input className="input" type="date" required max={today} value={form.paidDate} onChange={e => setForm({ ...form, paidDate: e.target.value })} /></label>}<div className="company-wide admin-form-actions"><button className="button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar lançamento'}</button><button type="button" className="button secondary" disabled={busy} onClick={() => setEditing(false)}>Cancelar edição</button></div></form>}
    {validPeriod && <><div className="finance-metrics">{[['Receita recebida', summary.received, comparison(summary.received, previousSummary?.received || 0)], ['Despesas pagas', summary.expenses, `${money(summary.expenses - (previousSummary?.expenses || 0))} de diferença no período`], ['Resultado de caixa', summary.result, `${money(summary.result - (previousSummary?.result || 0))} vs. período anterior`], ['A receber', summary.receivable, `${money(summary.overdue)} em atraso`]].map(([label, value, detail], i) => <article className={i === 2 ? 'finance-metric featured' : 'finance-metric'} key={label}><span>{label}</span><strong>{money(Number(value))}</strong><small>{detail}</small></article>)}</div>
    <div className="finance-chart admin-insight-panel"><div className="admin-finance-heading"><div><h3>Evolução dos recebimentos</h3><p>{dateLabel(from)} a {dateLabel(to)} · por data de pagamento</p></div><span className="finance-payable">A pagar no período: <strong>{money(summary.payable)}</strong></span></div>
      {summary.days.length ? <AdminFinanceChart days={timeline} /> : <div className="finance-no-data"><Icon name="arrows" /><strong>A evolução começa no primeiro lançamento pago.</strong><p>Registre receitas e despesas reais para acompanhar o resultado.</p></div>}
      <p className="finance-comparison">Comparação: {previous && `${dateLabel(previous.from)} a ${dateLabel(previous.to)}`} · mesma quantidade de dias.</p><p className="finance-legend"><span>● Receitas</span><span>● Despesas</span></p><p className="muted">Resultado de caixa baseado nos lançamentos informados. Registre também taxas, impostos e outros custos para refletir suas saídas. Não é uma apuração contábil de lucro.</p></div>
    <div className="finance-breakdowns"><section className="admin-insight-panel"><div className="admin-panel-heading"><Icon name="box" /><div><h2>De onde vem a receita</h2><p>Os cinco maiores recebimentos por empresa no período.</p></div></div>{ranking.length ? <ol className="finance-ranking">{ranking.map((row, i) => <li key={row.name + i}><span>{String(i + 1).padStart(2, '0')}</span><div><strong>{row.name}</strong><progress value={row.amount} max={summary.received} aria-label={`Participação de ${row.name} na receita`} /></div><strong>{money(row.amount)}</strong></li>)}</ol> : <p>Ainda não há receita recebida neste período.</p>}</section><section className="admin-insight-panel"><div className="admin-panel-heading"><Icon name="calendar" /><div><h2>Na sua agenda</h2><p>Até cinco pendências por vencimento dentro do período.</p></div></div>{pending.length ? <ul className="finance-pending">{pending.map(entry => <li key={entry.id}><span className={entry.dueDate < today ? 'finance-overdue' : ''}>{dateLabel(entry.dueDate).slice(0, 5)}</span><div><strong>{entry.description}</strong><small>{entry.companyName} · {entry.kind === 'income' ? 'A receber' : 'A pagar'}{entry.dueDate < today ? ' · Em atraso' : ''}</small></div><button className="text-link" onClick={() => edit(entry)} aria-label={`Editar ${entry.description}`}>{money(entry.amountCents)}</button></li>)}</ul> : <p>Nenhuma pendência no período selecionado.</p>}</section></div>
    <div className="admin-finance-heading"><h3>Lançamentos do período ({filtered.length})</h3><button className="button secondary" disabled={!filtered.length} onClick={exportCsv}>Exportar CSV</button></div><div className="admin-filters finance-entry-filters"><label className="field">Buscar lançamento<input className="input" type="search" value={query} placeholder="Descrição ou empresa" onChange={e => { setQuery(e.target.value); setPage(1); }} /></label><label className="field">Tipo de lançamento<select value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="all">Receitas e despesas</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></label><label className="field">Situação do lançamento<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="all">Todas as situações</option><option value="paid">Pago / recebido</option><option value="pending">Pendente</option><option value="overdue">Em atraso</option><option value="cancelled">Cancelado</option></select></label></div><p className="finance-context">Filtros abaixo afetam a lista e o CSV. Indicadores e gráficos mantêm o período e a empresa selecionados.</p><div className="table-wrap"><table><thead><tr><th>Empresa / descrição</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{filtered.slice((visiblePage - 1) * 20, visiblePage * 20).map(entry => <tr key={entry.id}><td><strong>{entry.companyName}</strong><span className="cell-sub">{entry.description}</span></td><td>{entry.kind === 'income' ? 'Receita' : 'Despesa'}</td><td>{money(entry.amountCents)}</td><td>{dateLabel(entry.dueDate)}</td><td>{entry.paidDate ? dateLabel(entry.paidDate) : '—'}</td><td><span className={`finance-status ${entry.status}`}>{entry.status === 'paid' ? 'Pago' : entry.status === 'cancelled' ? 'Cancelado' : entry.dueDate < today ? 'Em atraso' : 'Pendente'}</span></td><td><button className="text-link" onClick={() => edit(entry)}>Editar</button></td></tr>)}</tbody></table></div>{!filtered.length && <p className="admin-empty-note">Nenhum lançamento neste período.</p>}{pages > 1 && <nav className="admin-pagination" aria-label="Páginas financeiras"><button className="button secondary" disabled={visiblePage === 1} onClick={() => setPage(visiblePage - 1)}>Anterior</button><span>{visiblePage} / {pages}</span><button className="button secondary" disabled={visiblePage === pages} onClick={() => setPage(visiblePage + 1)}>Próxima</button></nav>}</>}
  </section>;
}
