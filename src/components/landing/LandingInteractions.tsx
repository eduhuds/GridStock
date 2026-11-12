'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { WHATSAPP_URL } from './config';
import s from './landing.module.css';

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.reduceMotion !== 'true') {
        animation = element.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      }
      observer.disconnect();
    }, { threshold: 0.08 });
    observer.observe(element);
    return () => { observer.disconnect(); animation?.cancel(); };
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  return <header className={s.header}>
    <Link href="/" className={s.brand} aria-label="GridStock, início"><img src="/gridstock-mark.svg" width="34" height="34" alt="" />gridstock<span className={s.brandPeriod}>.</span></Link>
    <nav className={s.desktopNav} aria-label="Menu principal"><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><a href="#duvidas">Dúvidas</a></nav>
    <div className={s.headerActions}><Link href="/login" className={s.loginLink} prefetch={false}>Entrar <Icon name="arrow" /></Link><a className={s.headerCta} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Solicitar acesso <Icon name="arrow" /></a><button ref={toggleRef} type="button" className={s.menuButton} aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></button></div>
    <nav id="landing-mobile-menu" className={s.mobileNav} aria-label="Menu móvel" hidden={!open}><a href="#recursos" onClick={() => setOpen(false)}>Recursos</a><a href="#como-funciona" onClick={() => setOpen(false)}>Como funciona</a><a href="#duvidas" onClick={() => setOpen(false)}>Dúvidas</a><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Solicitar acesso pelo WhatsApp <Icon name="arrow" /></a></nav>
  </header>;
}

function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number, total: number, select: (index: number) => void) {
  let next: number;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % total;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + total - 1) % total;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = total - 1;
  else return;
  event.preventDefault();
  const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  select(next);
  tabs?.[next]?.focus();
}

const previewTabs = [
  { label: 'Visão geral', icon: 'grid' },
  { label: 'Equipe em campo', icon: 'users' },
  { label: 'Movimentações', icon: 'arrows' },
];

export function ProductPreview() {
  const [active, setActive] = useState(0);
  return <div className={s.previewWrap}>
    <div className={s.previewChrome}><span className={s.chromeDots}><i /><i /><i /></span><span><Icon name="shield" /> Seu espaço de trabalho</span><span className={s.previewLabel}>DEMONSTRAÇÃO ILUSTRATIVA</span></div>
    <div className={s.previewApp}>
      <div className={s.previewSidebar} aria-hidden="true"><div className={s.previewBrand}><img src="/gridstock-mark.svg" width="25" height="25" alt="" />gridstock.</div><div className={s.previewWorkspace}><span>O</span><div>Minha operação<small>Controle operacional</small></div><Icon name="down" /></div><small className={s.previewMenuLabel}>ESPAÇO DE TRABALHO</small>{[['grid', 'Visão geral'], ['box', 'Estoques'], ['users', 'Equipe em campo'], ['arrows', 'Movimentações']].map(([icon, name], i) => <div className={`${s.previewNavItem} ${i === [0, 2, 3][active] ? s.previewNavActive : ''}`} key={name}><Icon name={icon} />{name}</div>)}<div className={s.previewSidebarBottom}><span className={s.liveDot} /> Estoque em movimento.</div></div>
      <div className={s.previewContent}>
        <div className={s.previewTop}><span>Workspace <span>/</span> <strong>{previewTabs[active].label}</strong></span><div><Icon name="bell" /><span className={s.previewAvatar}>OP</span></div></div>
        <div className={s.previewMain}>
          <div className={s.previewHeading}><div><h2>{active === 0 ? 'Sua operação, em um olhar.' : active === 1 ? 'Cada técnico. Cada peça.' : 'O caminho fica registrado.'}</h2><p>{active === 0 ? 'Da base ao campo, tudo conectado.' : active === 1 ? 'Materiais sob responsabilidade da equipe.' : 'Retiradas, utilizações e devoluções em um histórico.'}</p></div><span className={s.previewDate}><Icon name="calendar" /> Hoje</span></div>
          <div className={s.previewMetrics}>{[['Total em estoque', '1.248', 'Entre bases e técnicos', 'box'], ['Nas bases', '1.086', 'Em 3 almoxarifados', 'grid'], ['Com a equipe', '162', 'Distribuídas entre 8 técnicos', 'users'], ['Atenção ao estoque', '03', 'Produtos abaixo do mínimo', 'alert']].map(([label, value, note, icon], i) => <div className={`${s.previewMetric} ${i === 0 ? s.metricFeatured : ''}`} key={label}><span>{label}<Icon name={icon} /></span><strong>{value}</strong><small>{note}</small></div>)}</div>
          <div role="tablist" aria-label="Explore a demonstração" className={s.previewTabs}>{previewTabs.map(({ label, icon }, i) => <button type="button" key={label} id={`preview-tab-${i}`} role="tab" aria-selected={active === i} aria-controls="preview-panel" tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)} onKeyDown={event => moveTab(event, i, previewTabs.length, setActive)}><Icon name={icon} />{label}</button>)}</div>
          <div id="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${active}`} tabIndex={0} className={s.previewPanel}>
            {active === 0 ? <div className={s.previewOverview} key="overview"><div className={s.previewChart}><div className={s.previewCardTitle}>Distribuição do estoque <Icon name="box" /></div><div className={s.distribution}><div className={s.donut}><div><strong>1.248</strong><span>peças em estoque</span></div></div><div className={s.chartLegend}>{[['Base central', '684', '#285d48'], ['Base norte', '248', '#9fb982'], ['Base sul', '154', '#d5ef87'], ['Com técnicos', '162', '#dfb780']].map(([label, count, color]) => <div key={label}><i style={{ background: color }} /><span>{label}</span><strong>{count}</strong></div>)}</div></div></div><div className={s.previewActivity}><div className={s.previewCardTitle}>Últimas movimentações <Icon name="clock" /></div>{[['box', 'Retirada de material', 'Equipe de instalação · 12 peças', '09:41'], ['pin', 'Utilização em campo', 'Equipe de manutenção · 4 peças', '09:28'], ['reset', 'Devolução na base', 'Equipe de instalação · 2 peças', '09:12']].map(([icon, title, detail, time]) => <div className={s.previewActivityRow} key={title}><span><Icon name={icon} /></span><div><strong>{title}</strong><small>{detail}</small></div><time>{time}</time></div>)}</div></div> : active === 1 ? <div className={s.demoTeamGrid} key="team">{[['AL', 'Alex Lima', 'Instalação', '24', 'mint'], ['CM', 'Camila Melo', 'Manutenção', '18', 'peach'], ['RS', 'Rafael Silva', 'Assistência', '32', 'blue']].map(([initials, name, role, qty, color]) => <div className={s.demoTeamCard} key={name}><span className={s.teamAvatar} data-color={color}>{initials}</span><strong>{name}</strong><small>{role}</small><div><strong>{qty}</strong> peças na carga</div><span className={s.teamStatus}><i /> Em rota</span></div>)}</div> : <div className={s.demoTable} key="movements"><div className={s.demoTableHeader}><span>Movimentação</span><span>Material</span><span>Quantidade</span><span>Local</span></div>{[['Retirada', 'Conector óptico', '12 un.', 'Base central → Técnico'], ['Utilização', 'Cabo de rede', '4 un.', 'Atendimento em campo'], ['Devolução', 'Roteador', '2 un.', 'Técnico → Base central']].map(row => <div key={row[0]}>{row.map((cell, i) => <span key={cell}>{i === 0 ? <span className={s.movementType}>{cell}</span> : cell}</span>)}</div>)}</div>}
          </div>
          <div className={s.previewBottom}><span><span className={s.liveDot} /> Visibilidade em cada etapa</span><span>Dados fictícios para demonstração</span></div>
        </div>
      </div>
    </div>
    <div className={s.previewCaption}><Icon name="arrows" /> Explore as abas e conheça o fluxo do GridStock.</div>
  </div>;
}

const steps = [
  { title: 'Organize a base', short: 'Na base', icon: 'box', text: 'Cadastre o material, a quantidade e o endereço físico. A próxima retirada começa com o estoque organizado.', base: 120, tech: 0, used: 0, event: 'Entrada registrada', detail: '120 conectores · Corredor A, prateleira 03', note: 'Você sabe o que tem e onde encontrar.' },
  { title: 'Abasteça a equipe', short: 'Com o técnico', icon: 'van', text: 'Registre a retirada: o saldo sai da base e passa para a carga do técnico responsável.', base: 100, tech: 20, used: 0, event: 'Retirada registrada', detail: '20 conectores · Base central → Técnico', note: 'Saiu da prateleira. Continua no seu radar.' },
  { title: 'Acompanhe o uso', short: 'Em campo', icon: 'pin', text: 'O técnico registra a utilização no celular. O histórico reúne a quantidade, o responsável e o local informado.', base: 100, tech: 12, used: 8, event: 'Utilização registrada', detail: '8 conectores · Atendimento em campo', note: 'O material aplicado também tem história.' },
  { title: 'Feche o ciclo', short: 'De volta à base', icon: 'reset', text: 'O que não foi utilizado pode voltar à base. A devolução recompõe o saldo e fica registrada para conferência.', base: 112, tech: 0, used: 8, event: 'Devolução registrada', detail: '12 conectores · Técnico → Base central', note: 'Sobrou na rota? Volta para o estoque.' },
];

export function Workflow() {
  const [selected, setSelected] = useState(0);
  const step = steps[selected];
  return <div className={s.workflow}>
    <div className={s.workflowTabs} role="tablist" aria-label="Etapas do material">{steps.map((item, i) => <button type="button" key={item.title} role="tab" id={`flow-tab-${i}`} aria-controls="flow-panel" aria-selected={selected === i} tabIndex={selected === i ? 0 : -1} onClick={() => setSelected(i)} onKeyDown={event => moveTab(event, i, steps.length, setSelected)}><span className={s.workflowNumber}>0{i + 1}</span><strong>{item.title}</strong><Icon name="arrow" /></button>)}</div>
    <div className={s.workflowPanel} role="tabpanel" id="flow-panel" aria-labelledby={`flow-tab-${selected}`} tabIndex={0}>
      <div className={s.flowDescription} key={`copy-${selected}`}><span className={s.featureLabel}>ETAPA 0{selected + 1} / 04</span><h3>{step.note}</h3><p>{step.text}</p><span className={s.flowHint}><Icon name="arrows" /> Selecione as etapas para acompanhar.</span></div>
      <div className={s.flowVisual}>
        <div className={s.flowVisualHeader}><span><Icon name="box" /> Conector óptico</span><small>EXEMPLO ILUSTRATIVO</small></div>
        <div className={s.flowNodes}>{[['Na base', step.base, 'box'], ['Com o técnico', step.tech, 'users'], ['Utilizadas', step.used, 'check']].map(([label, value, icon], i) => <div className={s.flowNode} data-active={selected === 0 || selected === 3 ? i === 0 : selected === 1 ? i === 1 : i === 2} key={label}><span><Icon name={String(icon)} /></span><strong key={value}>{value}</strong><small>{label}</small></div>)}</div>
        <div className={s.flowEvent} key={`event-${selected}`}><span><Icon name={step.icon} /></span><div><strong>{step.event}</strong><small>{step.detail}</small></div><Icon name="check" /></div>
        <div className={s.flowProgress} style={{ '--progress': `${(selected + 1) * 25}%` } as CSSProperties}><i /></div>
      </div>
    </div>
  </div>;
}
