'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { defaultConfig, businessPreset, businessLabels, type BusinessType } from '@/lib/companyConfig';
import type { Company } from '@/lib/companies';
const KEY = 'gridstock-master-token';
const blank = { id: '', name: '', slug: '', tagline: '', color: '#285d48', active: true, username: '', password: '', adminName: '', config: { ...defaultConfig } };
export default function CompanyAdmin() {
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [companies, setCompanies] = useState<(Company & { usage?: { users: number; products: number; warehouses: number } })[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<{ id: number; companyName: string; action: string; ts: number }[]>([]);
  const [revokeId, setRevokeId] = useState('');
  const [resetId, setResetId] = useState('');
  const [deleteId, setDeleteId] = useState('');
  async function request(url: string, method: string, body?: unknown, credential = token) {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential}` }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 403) { localStorage.removeItem(KEY); setToken(''); }
      throw new Error(data.error || 'Não foi possível concluir.');
    }
    return data;
  }
  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (!saved) { setReady(true); return; }
    request('/api/admin/companies', 'GET', undefined, saved).then(data => { setCompanies(data.companies); setHistory(data.history || []); setToken(saved); }).catch(() => localStorage.removeItem(KEY)).finally(() => setReady(true));
  // Restore the dedicated administrator session once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const values = new FormData(event.currentTarget);
    try {
      const data = await request('/api/admin/login', 'POST', { username: values.get('username'), password: values.get('password') });
      const list = await request('/api/admin/companies', 'GET', undefined, data.token);
      localStorage.setItem(KEY, data.token); setToken(data.token); setCompanies(list.companies); setHistory(list.history || []);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = await request('/api/admin/companies', 'POST', form);
      setCompanies(data.companies); setHistory(data.history || []); setEditing(false); setForm(blank);
      setNotice('Empresa salva. Os links de acesso estão disponíveis no cartão.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function revokeSessions() {
    setBusy(true); setError('');
    try { const data = await request('/api/admin/companies', 'PATCH', { id: revokeId, action: 'revokeSessions' }); setCompanies(data.companies); setHistory(data.history); setRevokeId(''); setNotice('Sessões encerradas. A equipe deverá entrar novamente.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function resetCompany() {
    setBusy(true); setError('');
    try { const data = await request('/api/admin/companies', 'PATCH', { id: resetId, action: 'resetCompany' }); setCompanies(data.companies); setHistory(data.history); setResetId(''); setNotice('Banco de dados da empresa zerado com sucesso.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function removeCompany() {
    setBusy(true); setError('');
    try { const data = await request('/api/admin/companies', 'PATCH', { id: deleteId, action: 'deleteCompany' }); setCompanies(data.companies); setHistory(data.history); setDeleteId(''); setNotice('Empresa excluída da plataforma.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget; const values = new FormData(target); setBusy(true); setError(''); setNotice('');
    try { await request('/api/admin/login', 'PATCH', { currentPassword: values.get('currentPassword'), newPassword: values.get('newPassword') }); target.reset(); setNotice('Senha da administração atualizada. Outras sessões foram encerradas.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await request('/api/admin/login', 'DELETE'); localStorage.removeItem(KEY); setToken(''); setCompanies([]); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (!ready) return <main className="company-admin"><p role="status">Carregando administração...</p></main>;
  if (!token) return <main className="master-login">
    <section className="master-intro"><img src="/gridstock-mark.svg" alt="" width="56" height="56" /><span className="eyebrow">GRIDSTOCK · ADMINISTRAÇÃO</span><h1>Um sistema.<br /><em>Muitas empresas.</em></h1><p>Organize seus clientes, personalize cada operação e gerencie os acessos em um só lugar.</p><a href="/">← Voltar ao sistema</a></section>
    <form className="master-login-form" onSubmit={login}><span className="page-eyebrow">ACESSO EXCLUSIVO</span><h2>Administrador da plataforma</h2><p className="muted">Entre com a conta do administrador principal do GRIDSTOCK.</p>{error && <p className="error" role="alert">{error}</p>}
      <label className="field">Usuário<input className="input" name="username" autoComplete="username" required /></label>
      <label className="field">Senha<input className="input" name="password" type="password" autoComplete="current-password" required /></label>
      <button className="button full" disabled={busy}>{busy ? 'Entrando...' : 'Entrar na administração'}</button>
    </form></main>;
  const filtered = companies.filter(c => `${c.name} ${c.slug}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="company-admin">
    <header className="company-top"><a href="/" className="brand"><img src="/gridstock-mark.svg" width="36" height="36" alt="" />GRIDSTOCK</a><span>Administrador da plataforma</span><button className="button secondary" onClick={logout} disabled={busy}>Sair</button></header>
    <section className="company-hero"><div><span className="page-eyebrow">SEU PORTFÓLIO DE CLIENTES</span><h1>Cada empresa, do seu jeito.</h1><p>Uma operação independente para cada cliente. Uma gestão central para você.</p></div><button className="button" onClick={() => { setForm(blank); setEditing(true); setError(''); setNotice(''); }}>+ Cadastrar empresa</button></section>
    <section className="company-permission-note"><strong>Seu acesso · Administrador da plataforma</strong><p>Você controla empresas, módulos, limites, identidade e acesso. O administrador de cada empresa gerencia apenas seus produtos, estoques, movimentações e usuários. Ele não pode alterar os módulos contratados nem acessar outras empresas.</p></section>
    <div className="company-metrics"><div><span>Empresas cadastradas</span><strong>{companies.length}</strong></div><div><span>Operações ativas</span><strong>{companies.filter(c => c.active).length}</strong></div><div><span>Acessos pausados</span><strong>{companies.filter(c => !c.active).length}</strong></div></div>
    {notice && <p className="company-notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    {revokeId && <section className="company-notice" role="alert"><p>Encerrar todas as sessões de {companies.find(c => c.id === revokeId)?.name}? Os usuários precisarão entrar novamente.</p><button className="button" disabled={busy} onClick={revokeSessions}>Encerrar sessões</button> <button className="button secondary" disabled={busy} onClick={() => setRevokeId('')}>Cancelar</button></section>}
    {resetId && <section className="company-notice" role="alert"><p>Tem certeza de que deseja zerar o banco de dados de <strong>{companies.find(c => c.id === resetId)?.name}</strong>? Estoques, produtos, técnicos e movimentações serão limpos (os administradores da empresa serão mantidos).</p><button className="button danger" disabled={busy} onClick={resetCompany}>Sim, zerar banco</button> <button className="button secondary" disabled={busy} onClick={() => setResetId('')}>Cancelar</button></section>}
    {deleteId && <section className="company-notice" role="alert"><p>Tem certeza de que deseja excluir permanentemente a empresa <strong>{companies.find(c => c.id === deleteId)?.name}</strong> e todos os dados dela?</p><button className="button danger" disabled={busy} onClick={removeCompany}>Sim, excluir empresa</button> <button className="button secondary" disabled={busy} onClick={() => setDeleteId('')}>Cancelar</button></section>}
    {editing && <section className="company-editor" aria-labelledby="editor-title"><div className="company-section-title"><h2 id="editor-title">{form.id ? 'Personalizar empresa' : 'Nova empresa'}</h2><button type="button" className="button secondary" disabled={busy} onClick={() => { setEditing(false); setError(''); }}>Cancelar</button></div>
      <form onSubmit={save} className="company-form">
        <label className="field">Nome da empresa<input className="input" maxLength={80} value={form.name} required onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="field">Endereço de acesso<input className="input" placeholder="exemplo-telecom" pattern="[a-z0-9][a-z0-9-]{2,39}" value={form.slug} disabled={!!form.id} required onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/^\/empresa\//, '').replace(/\/$/, '') })} /><small>Digite apenas o identificador, por exemplo: minha-empresa. Link: /empresa/{form.slug || 'nome-da-empresa'}</small></label>
        <fieldset className="company-wide company-module-panel"><legend>Perfil e módulos da empresa</legend>
          <p>O perfil sugere uma configuração inicial. Você pode ajustar os módulos de cada cliente, independentemente do ramo.</p>
          <label className="field">Perfil da operação<select value={form.config.businessType} onChange={e => setForm({ ...form, config: { ...form.config, ...businessPreset(e.target.value as BusinessType), maxUsers: form.config.maxUsers, maxWarehouses: form.config.maxWarehouses } })}>{Object.entries(businessLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
          <div className="company-module-grid">{([
            ['fieldService', 'Equipe em campo', 'Técnicos, estoque pessoal, rotas e atendimentos.'],
            ['stockOut', 'Saídas de estoque', 'Baixas por venda, consumo, perda ou outro motivo.'],
            ['transfers', 'Transferências', 'Movimente produtos entre os estoques da empresa.'],
          ] as const).map(([key, title, detail]) => <label className="company-module" key={key}><input type="checkbox" checked={form.config[key]} onChange={e => setForm({ ...form, config: { ...form.config, [key]: e.target.checked } })} /><span><strong>{title}</strong><small>{detail}</small></span></label>)}</div>
          <div className="company-permission-note"><strong>Sempre incluído</strong><p>Produtos, estoques, entradas, inventário, histórico e usuários da própria empresa.</p></div>
          <div className="company-form"><label className="field">Limite de usuários<input className="input" type="number" min={1} max={10000} required value={form.config.maxUsers} onChange={e => setForm({ ...form, config: { ...form.config, maxUsers: Number(e.target.value) } })} /></label><label className="field">Limite de estoques<input className="input" type="number" min={1} max={10000} required value={form.config.maxWarehouses} onChange={e => setForm({ ...form, config: { ...form.config, maxWarehouses: Number(e.target.value) } })} /></label></div>
        </fieldset>
        <label className="field company-wide">Mensagem de boas-vindas<input className="input" maxLength={160} placeholder="Uma mensagem para a equipe desta empresa" value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} /></label>
        <label className="field">Cor principal<input type="color" className="input company-color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></label>
        <div className="company-brand-preview" style={{ borderColor: form.color }}><span className="eyebrow">PRÉVIA DA IDENTIDADE</span><strong style={{ color: form.color }}>{form.name || 'Sua empresa'}</strong><small>{form.tagline || 'Sua operação em movimento.'}</small></div>
        {!form.id ? <><h3 className="company-wide">Primeiro acesso do responsável</h3><label className="field">Nome do responsável<input className="input" value={form.adminName} required onChange={e => setForm({ ...form, adminName: e.target.value })} /></label><label className="field">Usuário<input className="input" autoComplete="off" minLength={3} required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label><label className="field company-wide">Senha inicial<input type="password" className="input" autoComplete="new-password" minLength={8} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small>O responsável poderá cadastrar a equipe dentro da empresa.</small></label></> : <label className="company-wide"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Empresa ativa<small className="muted"> · Ao pausar, todos os acessos desta empresa serão bloqueados e as sessões encerradas.</small></label>}
        <div className="company-wide"><button className="button" disabled={busy}>{busy ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Criar empresa e acesso'}</button></div>
      </form></section>}
    <section><div className="company-section-title"><h2>Suas empresas</h2><input className="input company-search" type="search" aria-label="Buscar empresa" placeholder="Buscar por nome ou endereço" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <div className="company-grid">{filtered.map(company => <article className="company-card" key={company.id}><div className="company-card-top"><span className="company-monogram" style={{ background: company.color }}>{company.name.slice(0, 2).toUpperCase()}</span><span className={`company-status ${company.active ? '' : 'paused'}`}>{company.active ? 'Ativa' : 'Pausada'}</span></div><h3>{company.name}</h3><p>{company.tagline || 'Gestão de estoque e equipe em campo.'}</p><span className="company-status">{businessLabels[company.config.businessType]}</span><p className="small">{company.config.fieldService ? 'Equipe em campo habilitada' : 'Operação de estoque'} · {company.config.stockOut ? 'Saídas habilitadas' : 'Saídas bloqueadas'} · {company.config.transfers ? 'Transferências habilitadas' : 'Transferências bloqueadas'}</p><code>/empresa/{company.slug}</code><div className="company-usage"><span>Usuários <strong>{company.usage?.users || 0}/{company.config.maxUsers}</strong></span><span>Estoques <strong>{company.usage?.warehouses || 0}/{company.config.maxWarehouses}</strong></span><span>Produtos <strong>{company.usage?.products || 0}</strong></span></div><div className="company-links">{company.active && <><a href={`/empresa/${company.slug}`} target="_blank" rel="noreferrer">Acesso operacional ↗</a>{company.config.fieldService && <a href={`/empresa/${company.slug}/tecnico`} target="_blank" rel="noreferrer">Acesso do técnico ↗</a>}</>}</div><button className="button secondary full" onClick={() => { setForm({ ...blank, ...company }); setEditing(true); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Configurar empresa</button><div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}><button className="text-link" disabled={busy} onClick={() => setRevokeId(company.id)}>Encerrar sessões</button><button className="text-link" disabled={busy} onClick={() => setResetId(company.id)}>Zerar banco</button><button className="text-link danger" disabled={busy} onClick={() => setDeleteId(company.id)}>Excluir empresa</button></div></article>)}</div>
      {!filtered.length && <div className="company-empty"><h3>{companies.length ? 'Nenhuma empresa encontrada' : 'Seu próximo cliente começa aqui'}</h3><p>{companies.length ? 'Tente outro nome na busca.' : 'Cadastre uma empresa para criar um ambiente exclusivo para a equipe dela.'}</p></div>}
    </section><section className="company-audit"><h2>Atividade da plataforma</h2><p className="muted">Últimas 30 ações administrativas</p>{history.length ? <ul>{history.map(item => <li key={item.id}><strong>{item.action} · {item.companyName}</strong><time>{new Date(item.ts).toLocaleString('pt-BR')}</time></li>)}</ul> : <p>Nenhuma ação registrada ainda.</p>}</section><details className="company-account"><summary>Segurança da administração · Alterar minha senha</summary><form className="company-form" onSubmit={updatePassword}><label className="field">Senha atual<input className="input" type="password" name="currentPassword" autoComplete="current-password" required /></label><label className="field">Nova senha<input className="input" type="password" name="newPassword" autoComplete="new-password" minLength={10} required /></label><div className="company-wide"><button className="button" disabled={busy}>Atualizar senha</button></div></form></details><footer className="company-footer">GRIDSTOCK · Gestão multiempresa</footer>
  </main>;
}
