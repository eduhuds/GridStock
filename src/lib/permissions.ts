export const permissionLabels = {
  stock: 'Consultar produtos e estoques', history: 'Consultar movimentações', team: 'Consultar estoques dos técnicos', audit: 'Consultar auditoria',
  products: 'Gerenciar produtos (cadastro, edição e exclusão)', warehouses: 'Gerenciar estoques (cadastro, edição e exclusão)', technicians: 'Gerenciar cadastros de técnicos',
  entry: 'Registrar entradas', stockout: 'Registrar saídas de estoque', transfer: 'Transferir entre estoques', withdraw: 'Entregar / retirar peças',
  use: 'Informar utilização', return: 'Devolver peças', count: 'Ajustar saldos', departure: 'Declarar saída do dia', export: 'Exportar relatórios',
} as const;
export type Permission = keyof typeof permissionLabels;
export type AccessPolicy = { companyAdmin: boolean; permissions: Permission[] };
export type AccessUser = { role: 'ops' | 'tech'; companyAdmin?: boolean; permissions?: Permission[] };
export const techPermissions: Permission[] = ['stock','history','withdraw','use','return','count','departure'];
export function defaultPermissions(role: 'ops' | 'tech'): Permission[] {
  return role === 'tech' ? ['stock','history','withdraw','use','return','departure'] : ['stock','history','team','entry','stockout','transfer','withdraw','use','return','departure'];
}
export function can(user: AccessUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === 'tech' && !techPermissions.includes(permission)) return false;
  return (user.role === 'ops' && user.companyAdmin === true) || user.permissions?.includes(permission) === true;
}
export function movementPermission(kind: unknown): Permission | null {
  return ['entry','stockout','transfer','withdraw','use','return','count','departure'].includes(String(kind)) ? kind as Permission : null;
}
export function parsePolicy(value: unknown, role: 'ops' | 'tech'): AccessPolicy {
  const input = value as AccessPolicy;
  if (!input || typeof input.companyAdmin !== 'boolean' || !Array.isArray(input.permissions) || input.permissions.some(p => typeof p !== 'string' || !Object.prototype.hasOwnProperty.call(permissionLabels,p))) throw new Error('Permissões inválidas.');
  if (role === 'tech' && (input.companyAdmin || input.permissions.some(p => !techPermissions.includes(p)))) throw new Error('Técnicos só podem receber permissões sobre o próprio estoque.');
  return { companyAdmin: input.companyAdmin, permissions: [...new Set(input.permissions)] };
}
