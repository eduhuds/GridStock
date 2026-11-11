'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Icon } from './icons';

export type LegalTab = 'privacy' | 'terms' | 'cookies' | 'accessibility';

const COOKIE_CONSENT_KEY = 'gridstock-cookie-consent-v1';
const A11Y_FONT_KEY = 'gridstock-a11y-font-scale';
const A11Y_CONTRAST_KEY = 'gridstock-a11y-high-contrast';
const A11Y_MOTION_KEY = 'gridstock-a11y-reduce-motion';
const A11Y_FOCUS_KEY = 'gridstock-a11y-strong-focus';

export function openLegalHub(tab: LegalTab = 'privacy') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<LegalTab>('gridstock:open-legal', { detail: tab }));
  }
}

export default function LegalAccessibilityHub() {
  const [openTab, setOpenTab] = useState<LegalTab | null>(null);
  const [cookieAccepted, setCookieAccepted] = useState<boolean>(true);
  const [fontScale, setFontScale] = useState<'100' | '110' | '120'>('100');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [strongFocus, setStrongFocus] = useState<boolean>(true);
  const modalRef = useRef<HTMLElement | null>(null);

  const applyA11yAttributes = useCallback(
    (
      scale: '100' | '110' | '120',
      contrast: boolean,
      motion: boolean,
      focus: boolean
    ) => {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      root.style.fontSize = scale === '120' ? '16.8px' : scale === '110' ? '15.4px' : '14px';
      if (contrast) root.setAttribute('data-contrast', 'high');
      else root.removeAttribute('data-contrast');

      if (motion) root.setAttribute('data-reduce-motion', 'true');
      else root.removeAttribute('data-reduce-motion');

      if (focus) root.setAttribute('data-focus-ring', 'strong');
      else root.removeAttribute('data-focus-ring');
    },
    []
  );

  useEffect(() => {
    try {
      const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      setCookieAccepted(savedConsent === 'accepted');

      const savedScale = (localStorage.getItem(A11Y_FONT_KEY) as '100' | '110' | '120') || '100';
      const savedContrast = localStorage.getItem(A11Y_CONTRAST_KEY) === 'true';
      const savedMotion = localStorage.getItem(A11Y_MOTION_KEY) === 'true';
      const savedFocus = localStorage.getItem(A11Y_FOCUS_KEY) !== 'false';

      setFontScale(savedScale);
      setHighContrast(savedContrast);
      setReduceMotion(savedMotion);
      setStrongFocus(savedFocus);
      applyA11yAttributes(savedScale, savedContrast, savedMotion, savedFocus);
    } catch {}
  }, [applyA11yAttributes]);

  useEffect(() => {
    const onOpenEvent = (ev: Event) => {
      const custom = ev as CustomEvent<LegalTab>;
      setOpenTab(custom.detail || 'privacy');
    };
    window.addEventListener('gridstock:open-legal', onOpenEvent);
    return () => window.removeEventListener('gridstock:open-legal', onOpenEvent);
  }, []);

  // Global keyboard shortcuts & modal Escape / Tab focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (openTab) {
          e.preventDefault();
          setOpenTab(null);
          return;
        }
        // Close any open modal in the application via its close button
        const closeBtn = document.querySelector<HTMLButtonElement>('.modal-overlay .modal-close');
        if (closeBtn) {
          e.preventDefault();
          closeBtn.click();
          return;
        }
      }

      // Focus trap when a modal dialog is open
      if (e.key === 'Tab') {
        const activeModal = document.querySelector<HTMLElement>('.modal-overlay .modal');
        if (activeModal) {
          const focusables = Array.from(
            activeModal.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter(el => el.offsetParent !== null);
          if (focusables.length > 0) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      }

      // Alt + A: Open Accessibility & Keyboard Shortcuts
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setOpenTab(prev => (prev === 'accessibility' ? null : 'accessibility'));
        return;
      }

      // Alt + P: Open Privacy Policy
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setOpenTab('privacy');
        return;
      }

      // Alt + Q: Open QR Quick Withdraw Scanner
      if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('gridstock:open-qr-withdraw'));
        return;
      }

      if (inInput) return;

      // "/" or Alt + B: Focus search input
      if (e.key === '/' || (e.altKey && e.key.toLowerCase() === 'b')) {
        const searchInput = document.querySelector<HTMLInputElement>(
          '.search input, input.company-search, input[aria-label*="Buscar"]'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }

      // Alt + 1..6: Quick sidebar navigation
      if (e.altKey && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const navButtons = Array.from(
          document.querySelectorAll<HTMLButtonElement>('.sidebar .nav-button, .stock-navigation .button')
        );
        const idx = Number(e.key) - 1;
        if (navButtons[idx]) {
          e.preventDefault();
          navButtons[idx].click();
          navButtons[idx].focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTab]);

  const handleAcceptCookies = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    } catch {}
    setCookieAccepted(true);
    if (openTab === 'cookies') setOpenTab(null);
  };

  const updateFontScale = (next: '100' | '110' | '120') => {
    setFontScale(next);
    try {
      localStorage.setItem(A11Y_FONT_KEY, next);
    } catch {}
    applyA11yAttributes(next, highContrast, reduceMotion, strongFocus);
  };

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    try {
      localStorage.setItem(A11Y_CONTRAST_KEY, String(next));
    } catch {}
    applyA11yAttributes(fontScale, next, reduceMotion, strongFocus);
  };

  const toggleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    try {
      localStorage.setItem(A11Y_MOTION_KEY, String(next));
    } catch {}
    applyA11yAttributes(fontScale, highContrast, next, strongFocus);
  };

  const toggleStrongFocus = () => {
    const next = !strongFocus;
    setStrongFocus(next);
    try {
      localStorage.setItem(A11Y_FOCUS_KEY, String(next));
    } catch {}
    applyA11yAttributes(fontScale, highContrast, reduceMotion, next);
  };

  return (
    <>
      {!cookieAccepted && (
        <aside
          className="cookie-banner"
          role="region"
          aria-label="Aviso sobre cookies e proteção de dados"
        >
          <div className="cookie-banner-content">
            <div className="cookie-banner-icon" aria-hidden="true">
              <Icon name="shield" />
            </div>
            <div className="cookie-banner-text">
              <strong>Privacidade por Padrão · Apenas Dados e Cookies Necessários (LGPD)</strong>
              <p>
                O GRIDSTOCK utiliza exclusivamente cookies técnicos estritamente necessários (sessão autenticada{' '}
                <code>HttpOnly</code> e preferências de tema/acessibilidade). Não utilizamos cookies de anúncios,
                rastreamento comportamental ou compartilhamento com terceiros.
              </p>
            </div>
            <div className="cookie-banner-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setOpenTab('privacy')}
              >
                Política de Privacidade
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setOpenTab('terms')}
              >
                Termos de Uso
              </button>
              <button
                type="button"
                className="button"
                onClick={handleAcceptCookies}
              >
                <Icon name="check" /> Entendi (Apenas necessários)
              </button>
            </div>
          </div>
        </aside>
      )}

      {openTab && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={e => {
            if (e.target === e.currentTarget) setOpenTab(null);
          }}
        >
          <section
            ref={modalRef}
            className="modal wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-hub-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: 'var(--green)' }}>
                  TRANSPARÊNCIA, LGPD E ACESSIBILIDADE DIGITAL
                </span>
                <h2 id="legal-hub-title">
                  {openTab === 'privacy' && 'Política de Privacidade e Proteção de Dados (LGPD)'}
                  {openTab === 'terms' && 'Termos de Serviço e Uso Operacional'}
                  {openTab === 'cookies' && 'Aviso de Cookies · Somente Dados Necessários'}
                  {openTab === 'accessibility' && 'Acessibilidade e Navegação por Teclado'}
                </h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setOpenTab(null)}
                aria-label="Fechar janela (Esc)"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-tabs" role="tablist" aria-label="Seções legais e de acessibilidade">
                <button
                  type="button"
                  role="tab"
                  aria-selected={openTab === 'privacy'}
                  className={openTab === 'privacy' ? 'active' : ''}
                  onClick={() => setOpenTab('privacy')}
                >
                  Privacidade (LGPD)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={openTab === 'terms'}
                  className={openTab === 'terms' ? 'active' : ''}
                  onClick={() => setOpenTab('terms')}
                >
                  Termos de Serviço
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={openTab === 'cookies'}
                  className={openTab === 'cookies' ? 'active' : ''}
                  onClick={() => setOpenTab('cookies')}
                >
                  Cookies e Dados Mínimos
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={openTab === 'accessibility'}
                  className={openTab === 'accessibility' ? 'active' : ''}
                  onClick={() => setOpenTab('accessibility')}
                >
                  Acessibilidade e Teclado
                </button>
              </div>

              {openTab === 'privacy' && (
                <div className="legal-doc-section">
                  <div className="stock-note" style={{ marginBottom: 16 }}>
                    <Icon name="shield" />
                    <div>
                      <strong>Princípio da Necessidade e Minimização de Dados (Art. 6º, III da LGPD)</strong>
                      <div className="small">
                        Coletamos exclusivamente os dados estritamente necessários para autenticar operadores,
                        auditar movimentações de peças e manter o controle de estoque.
                      </div>
                    </div>
                  </div>

                  <h3>1. Quais dados são tratados e por quê (Só Dados Necessários)</h3>
                  <ul className="legal-list">
                    <li>
                      <strong>Identificação Operacional (Nome e CPF):</strong> utilizados exclusivamente para
                      autenticação individual sem duplicidade entre empresas, vínculo de responsabilidade sobre o
                      estoque pessoal e registro de auditoria das movimentações realizadas.
                    </li>
                    <li>
                      <strong>Credenciais de Segurança:</strong> as senhas nunca são armazenadas em texto puro; são
                      protegidas com derivação criptográfica forte (<code>scrypt</code> com salt aleatório de 16 bytes).
                    </li>
                    <li>
                      <strong>Localização de Aplicação de Peça (Opcional / Sob Ação do Técnico):</strong> capturada
                      apenas no momento em que o técnico registra a utilização de uma peça em Ordem de Serviço (OS),
                      para comprovação do endereço de instalação junto à operação. Não há rastreamento em segundo
                      plano.
                    </li>
                    <li>
                      <strong>Registros de Inventário:</strong> códigos SKU, lotes/números de série, saldos e
                      comprovantes de OS estritamente vinculados à operação da empresa contratante.
                    </li>
                  </ul>

                  <h3>2. Isolamento Multi-Empresa e Segurança</h3>
                  <p>
                    Cada empresa cadastrada opera em base lógica isolada. Sessões são protegidas por cookies{' '}
                    <code>HttpOnly</code>, <code>Secure</code> e <code>SameSite=Strict</code>, com bloqueio automático
                    contra tentativas excessivas de login (Rate Limiting) e proteção contra requisições cruzadas (CSRF).
                  </p>

                  <h3>3. Direitos do Titular (Art. 18 da LGPD)</h3>
                  <p>
                    O usuário pode a qualquer momento consultar e atualizar seu nome, CPF e senha diretamente em{' '}
                    <strong>Minha Conta e Perfil</strong>, bem como solicitar ao administrador da sua empresa a
                    correção, portabilidade (exportação CSV) ou exclusão de sua conta quando não houver pendências
                    físicas de estoque.
                  </p>
                </div>
              )}

              {openTab === 'terms' && (
                <div className="legal-doc-section">
                  <h3>1. Objeto e Uso Autorizado</h3>
                  <p>
                    O <strong>GRIDSTOCK</strong> é uma plataforma corporativa de controle de almoxarifado,
                    endereçamento físico (corredor/prateleira) e gestão de estoque em posse de equipes técnicas em
                    campo. O acesso é restrito a usuários autorizados pela empresa titular da operação.
                  </p>

                  <h3>2. Responsabilidade pelas Credenciais e Registros</h3>
                  <ul className="legal-list">
                    <li>
                      O login por CPF e senha é pessoal e intransferível. Cada entrada, saída, transferência,
                      declaração de saída do dia, utilização em OS ou ajuste de contagem registra automaticamente o
                      operador responsável e o carimbo de tempo.
                    </li>
                    <li>
                      Ao alterar a senha ou CPF, todas as sessões anteriores em outros dispositivos são encerradas
                      automaticamente por segurança.
                    </li>
                  </ul>

                  <h3>3. Integridade do Inventário e Auditoria</h3>
                  <p>
                    O sistema impede saldos negativos e exige justificativa auditável em devoluções, ajustes de
                    contagem e transferências entre bases. Os dados operacionais pertencem integralmente à empresa
                    contratante, que pode exportá-los em formato aberto (<code>.CSV</code>) a qualquer momento.
                  </p>
                </div>
              )}

              {openTab === 'cookies' && (
                <div className="legal-doc-section">
                  <div className="stock-note" style={{ marginBottom: 16 }}>
                    <Icon name="check" />
                    <div>
                      <strong>Zero Cookies de Rastreamento ou Publicidade</strong>
                      <div className="small">
                        Este sistema respeita sua privacidade: nenhum dado é enviado a redes de anúncios, trackers de
                        terceiros ou ferramentas de perfilamento.
                      </div>
                    </div>
                  </div>

                  <h3>Cookies e Armazenamento Local Estritamente Necessários</h3>
                  <div className="table-wrap" style={{ border: '1px solid var(--line)', borderRadius: 10, marginTop: 10 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Identificador</th>
                          <th>Tipo</th>
                          <th>Finalidade Estritamente Necessária</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="mono">gridstock_session_*</td>
                          <td>Cookie HttpOnly</td>
                          <td>Manter a sessão autenticada do operador/técnico com segurança contra XSS/CSRF.</td>
                        </tr>
                        <tr>
                          <td className="mono">gridstock-theme</td>
                          <td>Preferência Local</td>
                          <td>Lembrar sua escolha entre Tema Claro e Tema Escuro.</td>
                        </tr>
                        <tr>
                          <td className="mono">gridstock-a11y-*</td>
                          <td>Preferência Local</td>
                          <td>Salvar suas opções de acessibilidade (tamanho da fonte, contraste e animações).</td>
                        </tr>
                        <tr>
                          <td className="mono">gridstock-cookie-consent-v1</td>
                          <td>Preferência Local</td>
                          <td>Registrar que você já visualizou o aviso de uso de cookies necessários.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {openTab === 'accessibility' && (
                <div className="legal-doc-section">
                  <p style={{ marginBottom: 14 }}>
                    Personalize a visualização do sistema e utilize os atalhos de teclado abaixo para navegar sem
                    precisar do mouse (padrão WCAG 2.1 AA).
                  </p>

                  <div className="a11y-controls-grid">
                    <div className="a11y-control-card">
                      <div>
                        <strong>Tamanho do texto</strong>
                        <small className="muted">Ajusta a escala global das fontes do sistema</small>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['100', '110', '120'] as const).map(scale => (
                          <button
                            key={scale}
                            type="button"
                            className={`button ${fontScale === scale ? '' : 'secondary'}`}
                            style={{ padding: '6px 10px', minHeight: 34, fontSize: 11 }}
                            onClick={() => updateFontScale(scale)}
                            aria-pressed={fontScale === scale}
                          >
                            {scale}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="a11y-control-card">
                      <div>
                        <strong>Modo de Alto Contraste</strong>
                        <small className="muted">Reforça bordas, textos e contraste para leitura em campo</small>
                      </div>
                      <button
                        type="button"
                        className={`button ${highContrast ? '' : 'secondary'}`}
                        style={{ padding: '6px 12px', minHeight: 34, fontSize: 11 }}
                        onClick={toggleHighContrast}
                        aria-pressed={highContrast}
                      >
                        {highContrast ? 'Ativado' : 'Ativar'}
                      </button>
                    </div>

                    <div className="a11y-control-card">
                      <div>
                        <strong>Reduzir Animações</strong>
                        <small className="muted">Desativa transições e efeitos de movimento na tela</small>
                      </div>
                      <button
                        type="button"
                        className={`button ${reduceMotion ? '' : 'secondary'}`}
                        style={{ padding: '6px 12px', minHeight: 34, fontSize: 11 }}
                        onClick={toggleReduceMotion}
                        aria-pressed={reduceMotion}
                      >
                        {reduceMotion ? 'Ativado' : 'Ativar'}
                      </button>
                    </div>

                    <div className="a11y-control-card">
                      <div>
                        <strong>Destaque de Foco do Teclado</strong>
                        <small className="muted">Exibe contorno visível ao navegar com a tecla Tab</small>
                      </div>
                      <button
                        type="button"
                        className={`button ${strongFocus ? '' : 'secondary'}`}
                        style={{ padding: '6px 12px', minHeight: 34, fontSize: 11 }}
                        onClick={toggleStrongFocus}
                        aria-pressed={strongFocus}
                      >
                        {strongFocus ? 'Ativado' : 'Ativar'}
                      </button>
                    </div>
                  </div>

                  <h3 style={{ marginTop: 20, marginBottom: 10 }}>Atalhos de Navegação por Teclado</h3>
                  <div className="table-wrap" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Tecla / Combinação</th>
                          <th>Ação no Sistema</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><kbd className="kbd-tag">Tab</kbd> / <kbd className="kbd-tag">Shift + Tab</kbd></td>
                          <td>Avança ou retrocede entre todos os botões, campos, tabelas e links (com retenção de foco dentro de modais).</td>
                        </tr>
                        <tr>
                          <td><kbd className="kbd-tag">Esc</kbd></td>
                          <td>Fecha imediatamente qualquer janela modal, leitor de QR Code ou menu rápido aberto.</td>
                        </tr>
                        <tr>
                          <td><kbd className="kbd-tag">/</kbd> ou <kbd className="kbd-tag">Alt + B</kbd></td>
                          <td>Foca diretamente no campo de busca de peças/movimentações da página atual.</td>
                        </tr>
                        <tr>
                          <td><kbd className="kbd-tag">Alt + 1</kbd> até <kbd className="kbd-tag">Alt + 6</kbd></td>
                          <td>Alterna rapidamente entre as seções do menu principal (Visão Geral, Estoques, Inventário, Produtos, Movimentações, Equipe).</td>
                        </tr>
                        <tr>
                          <td><kbd className="kbd-tag">Alt + A</kbd></td>
                          <td>Abre ou fecha este painel de Acessibilidade e Atalhos de Teclado de qualquer tela.</td>
                        </tr>
                        <tr>
                          <td><kbd className="kbd-tag">Alt + P</kbd></td>
                          <td>Abre a Política de Privacidade e Proteção de Dados (LGPD).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <span className="small muted">
                Conformidade LGPD (Lei nº 13.709/2018) · Acessibilidade WCAG 2.1 AA
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {!cookieAccepted && (
                  <button type="button" className="button" onClick={handleAcceptCookies}>
                    <Icon name="check" /> Aceitar cookies necessários
                  </button>
                )}
                <button type="button" className="button secondary" onClick={() => setOpenTab(null)}>
                  Fechar (Esc)
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function LegalFooterLinks({ compact = false }: { compact?: boolean }) {
  return (
    <nav
      className={`legal-footer-links ${compact ? 'compact' : ''}`}
      aria-label="Links de privacidade, termos, cookies e acessibilidade"
    >
      <button type="button" className="text-link" onClick={() => openLegalHub('privacy')}>
        Política de Privacidade
      </button>
      <span aria-hidden="true">·</span>
      <button type="button" className="text-link" onClick={() => openLegalHub('terms')}>
        Termos de Serviço
      </button>
      <span aria-hidden="true">·</span>
      <button type="button" className="text-link" onClick={() => openLegalHub('cookies')}>
        Cookies (Só Necessários)
      </button>
      <span aria-hidden="true">·</span>
      <button type="button" className="text-link" onClick={() => openLegalHub('accessibility')}>
        Acessibilidade e Teclado (Alt+A)
      </button>
    </nav>
  );
}
