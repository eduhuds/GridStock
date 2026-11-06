export type BusinessType = 'field' | 'retail' | 'general';
export interface CompanyConfig {
  businessType: BusinessType;
  fieldService: boolean;
  stockOut: boolean;
  transfers: boolean;
  maxUsers: number;
  maxWarehouses: number;
}
export const businessLabels: Record<BusinessType, string> = {
  field: 'Serviços em campo', retail: 'Comércio', general: 'Estoque geral',
};
export const defaultConfig: CompanyConfig = { businessType: 'field', fieldService: true, stockOut: true, transfers: true, maxUsers: 100, maxWarehouses: 100 };
export function businessPreset(type: BusinessType): CompanyConfig {
  return { ...defaultConfig, businessType: type, fieldService: type === 'field' };
}
export function parseCompanyConfig(input: unknown, fallback = defaultConfig): CompanyConfig {
  if (input === undefined) return { ...fallback };
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Configuração de empresa inválida.');
  const next = { ...fallback, ...input } as CompanyConfig;
  if (!['field', 'retail', 'general'].includes(next.businessType)) throw new Error('Selecione um perfil válido.');
  for (const key of ['fieldService', 'stockOut', 'transfers'] as const) if (typeof next[key] !== 'boolean') throw new Error('Módulo inválido.');
  for (const key of ['maxUsers', 'maxWarehouses'] as const) if (!Number.isSafeInteger(next[key]) || next[key] < 1 || next[key] > 10000) throw new Error('Os limites devem ser números inteiros entre 1 e 10.000.');
  return Object.fromEntries(Object.keys(defaultConfig).map(key => [key, next[key as keyof CompanyConfig]])) as unknown as CompanyConfig;
}
