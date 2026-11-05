import type { Movement } from './domain';

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' });
const labelFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit',
});

export function dailyStockActivity(movements: Movement[], days: number, now = Date.now()) {
  const today = new Date(`${dayFormatter.format(now)}T12:00:00Z`);
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - days + index + 1);
    return { date: dayFormatter.format(date), label: labelFormatter.format(date), withdrawn: 0, used: 0 };
  });
  const byDate = new Map(buckets.map(day => [day.date, day]));
  for (const movement of movements) {
    if (movement.ts > now || !Number.isFinite(movement.ts)) continue;
    if (movement.kind !== 'withdraw' && movement.kind !== 'use') continue;
    const day = byDate.get(dayFormatter.format(movement.ts));
    if (!day) continue;
    if (movement.kind === 'withdraw') day.withdrawn += movement.qty || 0;
    else day.used += movement.qty || 0;
  }
  return buckets;
}
