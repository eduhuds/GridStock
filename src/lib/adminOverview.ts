import type { Company } from './companies';

export type AdminCompany = Company & { usage?: {
  users: number; products: number; warehouses: number;
  sessions?: number; movements?: number; lastActivityAt?: number | null;
} };
export type PlatformAudit = { id: number; companyId: string; companyName: string; action: string; detail: string; ts: number };

export function capacityAlerts(company: AdminCompany) {
  if (!company.active) return [];
  return ([['users', 'usuários', company.config.maxUsers], ['warehouses', 'estoques', company.config.maxWarehouses]] as const)
    .filter(([key, , limit]) => (company.usage?.[key] || 0) >= limit * .8)
    .map(([key, label, limit]) => ({ key, label, used: company.usage?.[key] || 0, limit }));
}

export function filterAdminCompanies(companies: AdminCompany[], query: string, status: string, profile: string, sort: string) {
  const needle = query.trim().toLocaleLowerCase('pt-BR');
  return companies.filter(company =>
    `${company.name} ${company.slug}`.toLocaleLowerCase('pt-BR').includes(needle) &&
    (status === 'all' || (status === 'active' && company.active) || (status === 'paused' && !company.active) || (status === 'capacity' && capacityAlerts(company).length > 0) || (status === 'onboarding' && company.active && (!company.usage?.products || !company.usage?.warehouses))) &&
    (profile === 'all' || company.config.businessType === profile)
  ).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'pt-BR') : sort === 'activity' ? (b.usage?.lastActivityAt || 0) - (a.usage?.lastActivityAt || 0) : b.createdAt - a.createdAt);
}
