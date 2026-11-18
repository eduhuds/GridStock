'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { defaultConfig, businessPreset, businessLabels, type BusinessType } from '@/lib/companyConfig';
import { capacityAlerts, filterAdminCompanies, type AdminCompany, type PlatformAudit } from '@/lib/adminOverview';
import AdminInsights from './AdminInsights';
import AdminShell from './AdminShell';
import { downloadAdminCsv } from '@/lib/adminExport';
import BrandLoading from './BrandLoading';
import dynamic from 'next/dynamic';
const AdminFinance = dynamic(() => import('./AdminFinance'), { loading: () => <BrandLoading compact /> });
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
const KEY = 'gridstock-master-token';
const blank = { id: '', name: '', slug: '', tagline: '', color: '#285d48', active: true, username: '', password: '', adminName: '', config: { ...defaultConfig } };
export default function CompanyAdmin() {
  const [section, setSection] = useState<'overview' | 'companies' | 'finance' | 'activity' | 'account'>('overview');
  const [financeVisited, setFinanceVisited] = useState(false);
  const [administrator, setAdministrator] = useState<{ username: string; role: string } | null>(null);
  const [auditQuery, setAuditQuery] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [convertingCpf, setConvertingCpf] = useState(false);
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<PlatformAudit[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [companyPage, setCompanyPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const filtered = useMemo(() => filterAdminCompanies(companies, query, statusFilter, profileFilter, sort), [companies, query, statusFilter, profileFilter, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const visiblePage = Math.min(companyPage, pages);
  const visibleCompanies = filtered.slice((visiblePage - 1) * 12, visiblePage * 12);
  const filteredHistory = useMemo(() => history.filter(item => `${item.action} ${item.companyName} ${item.detail || ''}`.toLocaleLowerCase('pt-BR').includes(auditQuery.trim().toLocaleLowerCase('pt-BR'))), [history, auditQuery]);
  const historyPages = Math.max(1, Math.ceil(filteredHistory.length / 20));
  const visibleHistoryPage = Math.min(historyPage, historyPages);
  const totals = useMemo(() => companies.reduce((sum, c) => ({ users: sum.users + (c.usage?.users || 0), products: sum.products + (c.usage?.products || 0), warehouses: sum.warehouses + (c.usage?.warehouses || 0) }), { users: 0, products: 0, warehouses: 0 }), [companies]);
  function configure(company: AdminCompany) { setForm({ ...blank, ...company }); setEditing(true); setSection('companies'); setError(''); window.scrollTo({ top: 0, behavior: 'instant' }); }
  async function copyAccess(slug: string) {
    const url = `${window.location.origin}/empresa/${slug}`;
    try { await navigator.clipboard.writeText(url); setNotice('Link operacional copiado.'); }
    catch { setNotice(`Link operacional: ${url}`); }
  }

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
    const saved = localStorage.getItem(KEY) === 'cookie' ? 'cookie' : '';
    if (!saved) localStorage.removeItem(KEY);
    if (!saved) { setReady(true); return; }
    request('/api/admin/companies', 'GET', undefined, saved).then(data => { setCompanies(data.companies); if (data.administrator) setAdministrator(data.administrator); setUpdatedAt(new Date()); setHistory(data.history || []); setToken(saved); }).catch(() => localStorage.removeItem(KEY)).finally(() => setReady(true));
  // Restore the dedicated administrator session once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const values = new FormData(event.currentTarget);
    try {
      const data = await request('/api/admin/login', 'POST', { cpf: values.get('cpf'), password: values.get('password'), ...(convertingCpf ? { action: 'convertToCpf', legacyUsername: values.get('legacyUsername') } : {}) });
      const list = await request('/api/admin/companies', 'GET', undefined, data.token);
      localStorage.setItem(KEY, data.token); setToken(data.token); setCompanies(list.companies); setAdministrator(list.administrator); setUpdatedAt(new Date()); setHistory(list.history || []);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = await request('/api/admin/companies', 'POST', form);
      setCompanies(data.companies); if (data.administrator) setAdministrator(data.administrator); setUpdatedAt(new Date()); setHistory(data.history || []); setEditing(false); setForm(blank);
      setNotice('Empresa salva. Os links de acesso estão disponíveis no cartão.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function revokeSessions() {
    setBusy(true); setError('');
    try { const data = await request('/api/admin/companies', 'PATCH', { id: revokeId, action: 'revokeSessions' }); setCompanies(data.companies); if (data.administrator) setAdministrator(data.administrator); setUpdatedAt(new Date()); setHistory(data.history); setRevokeId(''); setNotice('Sessões encerradas. A equipe deverá entrar novamente.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function resetCompany() {
    setBusy(true); setError('');
    try { const data = await request('/api/admin/companies', 'PATCH', { id: resetId, action: 'resetCompany' }); setCompanies(data.companies); if (data.administrator) setAdministrator(data.administrator); setUpdatedAt(new Date()); setHistory(data.history); setResetId(''); setNotice('Banco de dados da empresa zerado com sucesso.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function removeCompany() {
    setBusy(true); setError('');
    try { const data = await request('/api/admin/companies', 'PATCH', { id: deleteId, action: 'deleteCompany' }); setCompanies(data.companies); if (data.administrator) setAdministrator(data.administrator); setUpdatedAt(new Date()); setHistory(data.history); setDeleteId(''); setNotice('Empresa excluída da plataforma.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget; const values = new FormData(target); setBusy(true); setError(''); setNotice('');
    try { await request('/api/admin/login', 'PATCH', { currentPassword: values.get('currentPassword'), newPassword: values.get('newPassword') }); target.reset(); setNotice('Senha da administração atualizada. Outras sessões foram encerradas.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function refresh() {
    setBusy(true); setError('');
    try { const data = await request('/api/admin/companies', 'GET'); setCompanies(data.companies); setHistory(data.history || []); setAdministrator(data.administrator); setUpdatedAt(new Date()); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function updateUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget; const values = new FormData(target); setBusy(true); setError(''); setNotice('');
    try { const data = await request('/api/admin/login', 'PATCH', { action: 'updateUsername', username: values.get('username'), currentPassword: values.get('currentPassword') }); setAdministrator(data.administrator); target.reset(); setNotice('Identificação atualizada. Use o novo acesso no próximo login.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function navigate(next: typeof section) { if (next === 'finance') setFinanceVisited(true); setSection(next); setRevokeId(''); setResetId(''); setDeleteId(''); setError(''); setNotice(''); }
  async function logout() {
    setBusy(true);
    try { await request('/api/admin/login', 'DELETE'); localStorage.removeItem(KEY); setToken(''); setFinanceVisited(false); setCompanies([]); setAdministrator(null); setSection('overview'); setEditing(false); setHistory([]); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (!ready) return <BrandLoading message="Preparando sua central de administração…" />;
  if (!token) return <main className="master-login">
    <section className="master-intro"><img src="/gridstock-mark.svg" alt="" width="56" height="56" /><span className="eyebrow">GRIDSTOCK · ADMINISTRAÇÃO</span><h1>Um sistema.<br /><em>Muitas empresas.</em></h1><p>Organize seus clientes, personalize cada operação e gerencie os acessos em um só lugar.</p><Link href="/login">← Voltar ao sistema</Link></section>
    <form className="master-login-form" onSubmit={login}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="page-eyebrow" style={{ marginBottom: 0 }}>ACESSO EXCLUSIVO</span><ThemeToggle showLabel /></div><h2>Central de Administração</h2><p className="muted">Acesso dedicado à administração da plataforma e das empresas.</p>{error && <p className="error" role="alert">{error}</p>}
      {convertingCpf && <label className="field">Login anterior<input className="input" name="legacyUsername" autoComplete="username" required /><small>Confirme sua senha atual e cadastre seu CPF verdadeiro. Nenhum dado será apagado.</small></label>}
      <label className="field">Usuário ou CPF<input className="input" name="cpf" maxLength={40} placeholder="Seu usuário de administrador" autoComplete="username" required /></label>
      <label className="field">Senha<input className="input" name="password" type="password" autoComplete="current-password" required /></label>
      <button className="button full" disabled={busy}>{busy ? 'Entrando...' : convertingCpf ? 'Cadastrar CPF e entrar' : 'Entrar na central'}</button><button className="text-link" type="button" onClick={() => { setConvertingCpf(!convertingCpf); setError(''); }}>{convertingCpf ? 'Já tenho CPF cadastrado' : 'Primeiro acesso por CPF? Converter conta antiga'}</button>
    </form></main>;
  return <AdminShell section={section} navigate={navigate} username={administrator?.username || 'Administrador'} companies={companies} configure={configure} createCompany={() => { navigate('companies'); setForm(blank); setEditing(true); window.scrollTo({ top: 0, behavior: 'instant' }); }} refresh={refresh} logout={logout} busy={busy} updatedAt={updatedAt}>
    <section className="company-hero"><div><span className="page-eyebrow">CONTROLE DA PLATAFORMA</span><h1>{({overview: 'Sua central de controle.', companies: 'Empresas e módulos', finance: 'Seu negócio, em números.', activity: 'Histórico de ações', account: 'Minha conta de administrador'})[section]}</h1><p>{({overview: 'Um olhar sobre seus clientes, sua operação e o que precisa de atenção.', companies: 'Cada cliente com os módulos, limites e a identidade que precisa.', finance: 'Acompanhe o que entrou, o que saiu e o que está por vir.', activity: 'Rastreie as mudanças feitas na administração da plataforma.', account: 'Gerencie sua identificação e mantenha seu acesso atualizado.'})[section]}</p></div>{section !== 'finance' && <button className="button" onClick={() => { setSection('companies'); setForm(blank); setEditing(true); setError(''); setNotice(''); }}>+ Cadastrar empresa</button>}</section>
    {financeVisited && <div hidden={section !== 'finance'} className={section === 'finance' ? 'page-transition' : undefined}><AdminFinance companies={companies} onSessionExpired={() => { setToken(''); localStorage.removeItem(KEY); }} /></div>}
    <div key={section} className="page-transition">
    {section === 'overview' && <>
    <section className="company-permission-note"><strong>Seu acesso · Administrador da plataforma</strong><p>Você controla empresas, módulos, limites, identidade e acesso. O administrador de cada empresa gerencia apenas seus produtos, estoques, movimentações e usuários. Ele não pode alterar os módulos contratados nem acessar outras empresas.</p></section>
    <div className="company-metrics"><div><span>Empresas cadastradas</span><strong>{companies.length}</strong></div><div><span>Operações ativas</span><strong>{companies.filter(c => c.active).length}</strong></div><div><span>Acessos pausados</span><strong>{companies.filter(c => !c.active).length}</strong></div></div>
    <div className="company-metrics"><div><span>Usuários das empresas</span><strong>{totals.users}</strong></div><div><span>Estoques cadastrados</span><strong>{totals.warehouses}</strong></div><div><span>Produtos cadastrados</span><strong>{totals.products}</strong></div></div>
    <AdminInsights companies={companies} onConfigure={configure} />
    <div className="admin-shortcuts"><button onClick={() => navigate('companies')}><strong>Gerenciar empresas</strong><span>Cadastros, módulos, limites, identidade e manutenção →</span></button><button onClick={() => navigate('activity')}><strong>Acompanhar alterações</strong><span>Consulte as ações administrativas registradas →</span></button><button onClick={() => navigate('account')}><strong>Configurar meu acesso</strong><span>Consulte seu perfil e altere seu usuário ou senha →</span></button></div>
    <section className="company-permission-note"><strong>Configuração para diferentes ramos</strong><p>{companies.filter(c => c.config.fieldService).length} empresas com equipe em campo · {companies.filter(c => c.config.stockOut).length} com saídas de estoque · {companies.filter(c => c.config.transfers).length} com transferências. Ajuste os módulos individualmente em Empresas e módulos.</p></section>
    </>}
    {notice && <p className="company-notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    {revokeId && <section className="company-notice" role="alert"><p>Encerrar todas as sessões de {companies.find(c => c.id === revokeId)?.name}? Os usuários precisarão entrar novamente.</p><button className="button" disabled={busy} onClick={revokeSessions}>Encerrar sessões</button> <button className="button secondary" disabled={busy} onClick={() => setRevokeId('')}>Cancelar</button></section>}
    {resetId && <section className="company-notice" role="alert"><p>Tem certeza de que deseja zerar o banco de dados de <strong>{companies.find(c => c.id === resetId)?.name}</strong>? Estoques, produtos, técnicos e movimentações serão limpos (os administradores da empresa serão mantidos).</p><button className="button danger" disabled={busy} onClick={resetCompany}>Sim, zerar banco</button> <button className="button secondary" disabled={busy} onClick={() => setResetId('')}>Cancelar</button></section>}
    {deleteId && <section className="company-notice" role="alert"><p>Tem certeza de que deseja excluir permanentemente a empresa <strong>{companies.find(c => c.id === deleteId)?.name}</strong> e todos os dados dela?</p><button className="button danger" disabled={busy} onClick={removeCompany}>Sim, excluir empresa</button> <button className="button secondary" disabled={busy} onClick={() => setDeleteId('')}>Cancelar</button></section>}
    {section === 'companies' && editing && <section className="company-editor" aria-labelledby="editor-title"><div className="company-section-title"><h2 id="editor-title">{form.id ? 'Personalizar empresa' : 'Nova empresa'}</h2><button type="button" className="button secondary" disabled={busy} onClick={() => { setEditing(false); setError(''); }}>Cancelar</button></div>
      <form onSubmit={save} className="company-form">
        <label className="field">Nome da empresa<input className="input" maxLength={80} value={form.name} required onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="field">Endereço de acesso<input className="input" placeholder="exemplo-telecom" pattern="[a-z0-9][a-z0-9-]{2,39}" value={form.slug} disabled={!!form.id} required onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/^\/empresa\//, '').replace(/\/$/, '') })} /><small>Digite apenas o identificador, por exemplo: minha-empresa. Link: /empresa/{form.slug || 'nome-da-empresa'}</small></label>
        <fieldset className="company-wide company-module-panel"><legend>Perfil e módulos da empresa</legend>
          {companies.length > 0 && <label className="field">Usar módulos e limites de outra empresa<select defaultValue="" onChange={e => { const source = companies.find(c => c.id === e.target.value); if (source) setForm({ ...form, config: { ...source.config } }); e.target.value = ''; }}><option value="">Selecionar configuração existente</option>{companies.filter(c => c.id !== form.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><small>Copia apenas módulos, perfil e limites. Dados, acessos e identidade continuam separados.</small></label>}
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
        {!form.id ? <><h3 className="company-wide">Primeiro acesso do responsável</h3><label className="field">Nome do responsável<input className="input" value={form.adminName} required onChange={e => setForm({ ...form, adminName: e.target.value })} /></label><label className="field">CPF do responsável<input className="input" autoComplete="off" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label><label className="field company-wide">Senha inicial<input type="password" className="input" autoComplete="new-password" minLength={8} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small>O responsável poderá cadastrar a equipe dentro da empresa.</small></label></> : <label className="company-wide"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Empresa ativa<small className="muted"> · Ao pausar, todos os acessos desta empresa serão bloqueados e as sessões encerradas.</small></label>}
        <div className="company-wide"><button className="button" disabled={busy}>{busy ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Criar empresa e acesso'}</button></div>
      </form></section>}
    {section === 'companies' && <section><div className="company-section-title"><h2>Suas empresas</h2><button className="button secondary" disabled={!filtered.length} onClick={() => downloadAdminCsv('empresas-gridstock.csv', [['Empresa', 'Endereço', 'Situação', 'Perfil', 'Usuários', 'Limite de usuários', 'Estoques', 'Limite de estoques', 'Produtos'], ...filtered.map(company => [company.name, `/empresa/${company.slug}`, company.active ? 'Ativa' : 'Pausada', businessLabels[company.config.businessType], company.usage?.users || 0, company.config.maxUsers, company.usage?.warehouses || 0, company.config.maxWarehouses, company.usage?.products || 0])])}>Exportar empresas</button><input className="input company-search" type="search" aria-label="Buscar empresa" placeholder="Buscar por nome ou endereço" value={query} onChange={e => { setQuery(e.target.value); setCompanyPage(1); }} /></div>
      <div className="admin-filters">
        <label className="field">Situação<select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCompanyPage(1); }}><option value="all">Todas as empresas</option><option value="active">Ativas</option><option value="paused">Pausadas</option><option value="capacity">Próximas do limite</option><option value="onboarding">Cadastro inicial pendente</option></select></label>
        <label className="field">Perfil<select value={profileFilter} onChange={e => { setProfileFilter(e.target.value); setCompanyPage(1); }}><option value="all">Todos os perfis</option>{Object.entries(businessLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="field">Ordenar por<select value={sort} onChange={e => { setSort(e.target.value); setCompanyPage(1); }}><option value="recent">Cadastro mais recente</option><option value="name">Nome da empresa</option><option value="activity">Última movimentação</option></select></label>
        <button className="button secondary" onClick={() => { setQuery(''); setStatusFilter('all'); setProfileFilter('all'); setSort('recent'); setCompanyPage(1); }}>Limpar filtros</button>
      </div>
      <p className="muted" role="status">{filtered.length} empresas encontradas · página {visiblePage} de {pages}</p>
      <div className="company-grid">{visibleCompanies.map(company => <article className="company-card" key={company.id}><div className="company-card-top"><span className="company-monogram" style={{ background: company.color }}>{company.name.slice(0, 2).toUpperCase()}</span><span className={`company-status ${company.active ? '' : 'paused'}`}>{company.active ? 'Ativa' : 'Pausada'}</span></div><h3>{company.name}</h3><p>{company.tagline || 'Gestão de estoque e equipe em campo.'}</p><span className="company-status">{businessLabels[company.config.businessType]}</span><p className="small">{company.config.fieldService ? 'Equipe em campo habilitada' : 'Operação de estoque'} · {company.config.stockOut ? 'Saídas habilitadas' : 'Saídas bloqueadas'} · {company.config.transfers ? 'Transferências habilitadas' : 'Transferências bloqueadas'}</p><code>/empresa/{company.slug}</code><div className="company-usage"><span>Usuários <strong>{company.usage?.users || 0}/{company.config.maxUsers}</strong></span><span>Estoques <strong>{company.usage?.warehouses || 0}/{company.config.maxWarehouses}</strong></span><span>Produtos <strong>{company.usage?.products || 0}</strong></span></div><div className="admin-company-details"><span>Cadastro: {new Date(company.createdAt).toLocaleDateString('pt-BR')}</span><span>Última movimentação: {company.usage?.lastActivityAt ? new Date(company.usage.lastActivityAt).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' }) : 'Nenhuma registrada'}</span><span>{company.usage?.sessions || 0} sessões válidas</span>{capacityAlerts(company).map(alert => <strong key={alert.key} className="admin-capacity-warning">{alert.label}: {alert.used}/{alert.limit} · {alert.used >= alert.limit ? 'Limite atingido' : 'Próximo do limite'}</strong>)}</div><button className="text-link" onClick={() => copyAccess(company.slug)}>Copiar link operacional</button><div className="company-links">{company.active && <><a href={`/empresa/${company.slug}`} target="_blank" rel="noreferrer">Acesso operacional ↗</a>{company.config.fieldService && <a href={`/empresa/${company.slug}/tecnico`} target="_blank" rel="noreferrer">Acesso do técnico ↗</a>}</>}</div><button className="button secondary full" onClick={() => configure(company)}>Configurar empresa</button><div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}><button className="text-link" disabled={busy} onClick={() => setRevokeId(company.id)}>Encerrar sessões</button><button className="text-link" disabled={busy} onClick={() => setResetId(company.id)}>Zerar banco</button><button className="text-link danger" disabled={busy} onClick={() => setDeleteId(company.id)}>Excluir empresa</button></div></article>)}</div>
      {!filtered.length && <div className="company-empty"><h3>{companies.length ? 'Nenhuma empresa encontrada' : 'Seu próximo cliente começa aqui'}</h3><p>{companies.length ? 'Tente outro nome ou limpe os filtros.' : 'Cadastre uma empresa para criar um ambiente exclusivo para a equipe dela.'}</p></div>}
      {pages > 1 && <nav className="admin-pagination" aria-label="Páginas de empresas"><button className="button secondary" disabled={visiblePage === 1} onClick={() => setCompanyPage(visiblePage - 1)}>Anterior</button><span>{visiblePage} / {pages}</span><button className="button secondary" disabled={visiblePage === pages} onClick={() => setCompanyPage(visiblePage + 1)}>Próxima</button></nav>}
    </section>}
    {section === 'activity' && <section className="company-audit"><h2>Atividade da plataforma</h2><p className="muted">Até 200 ações administrativas mais recentes · horários de Fortaleza</p><input className="input admin-audit-search" type="search" aria-label="Buscar ação administrativa" placeholder="Buscar por empresa, ação ou detalhe" value={auditQuery} onChange={e => { setAuditQuery(e.target.value); setHistoryPage(1); }} />
      {filteredHistory.length ? <ul>{filteredHistory.slice((visibleHistoryPage - 1) * 20, visibleHistoryPage * 20).map(item => <li key={item.id}><div><strong>{item.action} · {item.companyName}</strong>{item.detail && <p className="muted">{item.detail}</p>}</div><time dateTime={new Date(item.ts).toISOString()}>{new Date(item.ts).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}</time></li>)}</ul> : <p>Nenhuma ação encontrada neste histórico.</p>}
      {historyPages > 1 && <nav className="admin-pagination" aria-label="Páginas do histórico"><button className="button secondary" disabled={visibleHistoryPage === 1} onClick={() => setHistoryPage(visibleHistoryPage - 1)}>Anterior</button><span>{visibleHistoryPage} / {historyPages}</span><button className="button secondary" disabled={visibleHistoryPage === historyPages} onClick={() => setHistoryPage(visibleHistoryPage + 1)}>Próxima</button></nav>}
    </section>}
    {section === 'account' && <section className="admin-account-panel"><h2>Seu acesso de administrador</h2><p className="muted">Identificação de acesso: <strong>{administrator?.username}</strong> · Administrador da plataforma</p><p>Este perfil administra o sistema e todas as empresas. Os usuários cadastrados dentro de uma empresa têm acesso somente à operação dela.</p><h3>Atualizar meu acesso</h3><form className="company-form" onSubmit={updateUsername}><label className="field">Usuário ou CPF<input key={administrator?.username} className="input" name="username" defaultValue={administrator?.username} maxLength={40} autoComplete="username" required /></label><label className="field">Confirme sua senha atual<input className="input" type="password" name="currentPassword" autoComplete="current-password" required /></label><div className="company-wide"><button className="button" disabled={busy}>Salvar identificação</button></div></form><h3>Alterar minha senha</h3><form className="company-form" onSubmit={updatePassword}><label className="field">Senha atual<input className="input" type="password" name="currentPassword" autoComplete="current-password" required /></label><label className="field">Nova senha<input className="input" type="password" name="newPassword" autoComplete="new-password" minLength={10} required /></label><div className="company-wide"><button className="button" disabled={busy}>Atualizar senha</button></div></form></section>}</div>
  </AdminShell>;
}
