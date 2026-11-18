import type { Movement } from './domain';
export interface MovementFilter { from: string; to: string; warehouse: string; operator: string }
export const emptyMovementFilter: MovementFilter = { from: '', to: '', warehouse: '', operator: '' };
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' });
export function matchesMovementFilter(m: Movement, f: MovementFilter): boolean {
  if (f.from && f.to && f.from > f.to) return false;
  if (f.from || f.to) {
    if (!Number.isFinite(m.ts)) return false;
    const day = dayFormat.format(m.ts);
    if (f.from && day < f.from || f.to && day > f.to) return false;
  }
  return (!f.warehouse || [m.warehouse, m.from, m.to].includes(f.warehouse)) && (!f.operator || m.operator === f.operator);
}
