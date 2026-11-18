'use client';
import { businessLabels } from '@/lib/companyConfig';
import { capacityAlerts, type AdminCompany } from '@/lib/adminOverview';
import { Icon } from './icons';

export default function AdminInsights({ companies, onConfigure }: { companies: AdminCompany[]; onConfigure: (company: AdminCompany) => void }) {
  const alerts = companies.flatMap(company => capacityAlerts(company).map(alert => ({ company, ...alert })));
  const pending = companies.filter(c => c.active && (!c.usage?.products || !c.usage?.warehouses));
  const sessions = companies.reduce((sum, c) => sum + (c.usage?.sessions || 0), 0);
  const movements = companies.reduce((sum, c) => sum + (c.usage?.movements || 0), 0);
  return <div className="admin-insights">
    <section className="admin-insight-panel"><div className="admin-panel-heading"><Icon name="alert" /><div><h2>Atenção aos limites</h2><p>Empresas ativas com 80% ou mais da capacidade configurada.</p></div></div>
      {alerts.length ? <ul className="admin-alert-list">{alerts.slice(0, 8).map(item => <li key={`${item.company.id}-${item.key}`}><div><strong>{item.company.name}</strong><span>{item.used} de {item.limit} {item.label}{item.used >= item.limit ? ' · Limite atingido' : ''}</span><progress value={Math.min(item.used, item.limit)} max={item.limit} aria-label={`${item.label} de ${item.company.name}`} /></div><button className="text-link" onClick={() => onConfigure(item.company)}>Ajustar</button></li>)}</ul> : <p className="admin-empty-note">Nenhuma empresa ativa está próxima dos limites.</p>}
      {alerts.length > 8 && <p className="muted">Mais {alerts.length - 8} alertas. Use o filtro “Próximas do limite” em Empresas e módulos.</p>}
    </section>
    <section className="admin-insight-panel"><div className="admin-panel-heading"><Icon name="grid" /><div><h2>Uso da plataforma</h2><p>Dados agregados das empresas, sem expor suas credenciais.</p></div></div><div className="admin-usage-summary"><div><strong>{sessions.toLocaleString('pt-BR')}</strong><span>Sessões válidas</span></div><div><strong>{movements.toLocaleString('pt-BR')}</strong><span>Movimentações registradas</span></div></div><p className="muted">Sessões válidas não significam pessoas online neste momento.</p>
      <div className="admin-profile-list">{Object.entries(businessLabels).map(([key, label]) => <div key={key}><span>{label}</span><strong>{companies.filter(c => c.config.businessType === key).length}</strong></div>)}</div>
    </section>
    <section className="admin-insight-panel admin-insight-wide"><div className="admin-panel-heading"><Icon name="box" /><div><h2>Primeiros passos dos clientes</h2><p>Empresas ativas que ainda precisam cadastrar produtos ou estoques.</p></div></div>
      {pending.length ? <div className="admin-onboarding-list">{pending.slice(0, 6).map(company => <button key={company.id} onClick={() => onConfigure(company)}><strong>{company.name}</strong><span>{!company.usage?.warehouses ? 'Cadastrar primeiro estoque' : 'Estoque cadastrado'} · {!company.usage?.products ? 'Cadastrar primeiro produto' : 'Produtos cadastrados'}</span></button>)}</div> : <p className="admin-empty-note">Todas as empresas ativas já têm produtos e estoques cadastrados.</p>}
      {pending.length > 6 && <p className="muted">{pending.length} empresas ainda estão nos primeiros cadastros.</p>}
    </section>
  </div>;
}
