'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AdminCompany } from '@/lib/adminOverview';
import { Icon } from './icons';
import ThemeToggle from './ThemeToggle';
import styles from './AdminShell.module.css';

export const adminSections = [
  { id: 'overview', label: 'Visão geral', icon: 'grid' },
  { id: 'companies', label: 'Empresas e módulos', icon: 'box' },
  { id: 'finance', label: 'Financeiro', icon: 'arrows' },
  { id: 'activity', label: 'Histórico de ações', icon: 'clock' },
  { id: 'account', label: 'Minha conta', icon: 'shield' },
] as const;
export type AdminSection = typeof adminSections[number]['id'];

type Props = { section: AdminSection; navigate: (section: AdminSection) => void; username: string; companies: AdminCompany[]; configure: (company: AdminCompany) => void; createCompany: () => void; refresh: () => void; logout: () => void; busy: boolean; updatedAt: Date | null; children: ReactNode };
export default function AdminShell({ section, navigate, username, companies, configure, createCompany, refresh, logout, busy, updatedAt, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const search = useRef<HTMLDialogElement>(null);
  const mobile = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLElement>(null);
  const current = adminSections.find(item => item.id === section)!;
  const results = companies.filter(c => `${c.name} ${c.slug}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim())).slice(0, 6);
  function openSearch() { setQuery(''); search.current?.showModal(); }
  function go(next: AdminSection) { mobile.current?.close(); search.current?.close(); navigate(next); window.scrollTo({ top: 0, behavior: 'instant' }); requestAnimationFrame(() => content.current?.focus({ preventScroll: true })); }
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (search.current?.open) search.current.close(); else openSearch(); }
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  const navigation = <nav aria-label="Seções da administração">{adminSections.map(item => <button key={item.id} title={item.label} aria-current={section === item.id ? 'page' : undefined} onClick={() => go(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'companies' && <small>{companies.length}</small>}</button>)}</nav>;
  return <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
    <a className={styles.skip} href="#admin-content">Pular para conteúdo</a>
    <aside className={styles.sidebar}>
      <a className={styles.brand} href="/administracao" aria-label="GridStock administração"><img src="/gridstock-mark.svg" width="34" height="34" alt="" /><span>gridstock<span>.</span><small>ADMINISTRAÇÃO</small></span></a>
      <button className={styles.collapse} onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'}><Icon name="menu" /><span>Recolher menu</span></button>
      {navigation}
      <div className={styles.sideNote}><span>FEITO PARA CADA EMPRESA</span><strong>Seu sistema.<br />Muitas possibilidades.</strong><p>Módulos e identidade que acompanham cada operação.</p><button onClick={createCompany}>Adicionar empresa <Icon name="plus" /></button></div>
      <div className={styles.profile}><span className={styles.avatar}>{username.slice(0, 2).toUpperCase()}</span><div><strong>{username}</strong><small>Administrador</small></div><button title="Sair" aria-label="Sair da administração" onClick={logout} disabled={busy}><Icon name="logout" /></button></div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <button className={styles.mobileToggle} aria-label="Abrir menu da administração" onClick={() => mobile.current?.showModal()}><Icon name="menu" /></button>
        <div className={styles.breadcrumb}>Administração <span>/</span> <strong>{current.label}</strong></div>
        <button className={styles.searchButton} onClick={openSearch}><Icon name="search" /><span>Buscar empresa ou página</span><kbd>⌘ / Ctrl K</kbd></button>
        <ThemeToggle />
        <button className={styles.refresh} aria-label="Atualizar dados da plataforma" title={updatedAt ? `Consultado às ${updatedAt.toLocaleTimeString('pt-BR')}` : 'Atualizar dados'} disabled={busy} onClick={refresh}><Icon name="reset" /></button>
      </header>
      <main id="admin-content" ref={content} tabIndex={-1} className={styles.content}>{children}<footer className={styles.footer}><span>gridstock. <span>Central de Administração</span></span><span>{updatedAt && `Consultado às ${updatedAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' })}`}</span></footer></main>
    </div>
    <dialog ref={mobile} className={styles.mobileDialog} aria-label="Menu da administração" onClick={e => { if (e.target === e.currentTarget) mobile.current?.close(); }}><div className={styles.dialogHeading}><strong>GridStock · Admin</strong><button aria-label="Fechar menu" onClick={() => mobile.current?.close()}><Icon name="close" /></button></div>{navigation}<button className="button secondary full" onClick={() => { mobile.current?.close(); logout(); }} disabled={busy}>Sair da administração</button></dialog>
    <dialog ref={search} className={styles.command} aria-label="Busca rápida da administração" onClick={e => { if (e.target === e.currentTarget) search.current?.close(); }}>
      <div className={styles.commandInput}><Icon name="search" /><input autoFocus aria-label="Buscar páginas e empresas" placeholder="O que você quer encontrar?" value={query} onChange={e => setQuery(e.target.value)} /><button onClick={() => search.current?.close()} aria-label="Fechar busca"><kbd>Esc</kbd></button></div>
      <div className={styles.commandResults}><small>PÁGINAS E AÇÕES</small>{adminSections.filter(item => item.label.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim())).map(item => <button key={item.id} onClick={() => go(item.id)}><Icon name={item.icon} /><span>{item.label}</span><Icon name="arrow" /></button>)}{!query && <button onClick={() => { search.current?.close(); createCompany(); }}><Icon name="plus" /><span>Cadastrar empresa</span><Icon name="arrow" /></button>}
      <small>EMPRESAS · {query ? 'RESULTADOS' : 'ACESSO RÁPIDO'}</small>{results.map(company => <button key={company.id} onClick={() => { search.current?.close(); configure(company); }}><span className={styles.companyDot} style={{ background: company.color }} /><span>{company.name}<small>/empresa/{company.slug}</small></span><Icon name="chevron" /></button>)}{!results.length && <p>Nenhuma empresa encontrada.</p>}</div><div className={styles.commandFooter}>Tab para navegar · Enter para abrir · Esc para fechar</div>
    </dialog>
  </div>;
}
