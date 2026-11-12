export type FinanceEntry = {
  id: string; companyId: string; companyName: string; kind: 'income' | 'expense';
  description: string; amountCents: number; dueDate: string; paidDate: string;
  status: 'pending' | 'paid' | 'cancelled'; createdAt: number;
};
export function validFinanceDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateFinanceInput(input: Record<string, unknown>) {
  const kind = input.kind;
  const status = input.status;
  const description = String(input.description || '').trim();
  if (kind !== 'income' && kind !== 'expense') throw new Error('Tipo de lançamento inválido.');
  if (!['pending', 'paid', 'cancelled'].includes(String(status))) throw new Error('Situação inválida.');
  if (!description || description.length > 160) throw new Error('Descreva o lançamento em até 160 caracteres.');
  if (!Number.isSafeInteger(input.amountCents) || Number(input.amountCents) <= 0 || Number(input.amountCents) > 100_000_000_000) throw new Error('Informe um valor positivo de até R$ 1 bilhão.');
  if (!validFinanceDate(input.dueDate)) throw new Error('Informe uma data de vencimento válida.');
  if (status === 'paid' && !validFinanceDate(input.paidDate)) throw new Error('Informe a data de recebimento ou pagamento.');
  if (status === 'paid' && String(input.paidDate) > new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date())) throw new Error('A data de pagamento não pode estar no futuro.');
  return { kind: kind as FinanceEntry['kind'], status: status as FinanceEntry['status'], description, amountCents: Number(input.amountCents), dueDate: input.dueDate, paidDate: status === 'paid' ? String(input.paidDate) : '' };
}
export function summarizeFinance(entries: FinanceEntry[], from: string, to: string, today: string) {
  let received = 0, expenses = 0, receivable = 0, payable = 0, overdue = 0;
  const byDate = new Map<string, { date: string; income: number; expense: number }>();
  for (const entry of entries) {
    if (entry.status === 'cancelled') continue;
    const date = entry.status === 'paid' ? entry.paidDate : entry.dueDate;
    if (date < from || date > to) continue;
    if (entry.status === 'paid') {
      const day = byDate.get(date) || { date, income: 0, expense: 0 };
      if (entry.kind === 'income') { received += entry.amountCents; day.income += entry.amountCents; }
      else { expenses += entry.amountCents; day.expense += entry.amountCents; }
      byDate.set(date, day);
    } else if (entry.kind === 'income') { receivable += entry.amountCents; if (entry.dueDate < today) overdue += entry.amountCents; }
    else payable += entry.amountCents;
  }
  return { received, expenses, result: received - expenses, receivable, payable, overdue, days: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

const DAY = 86400000;
export function financePeriod(preset: 'today' | 'month' | '30days', today: string) {
  const from = preset === 'today' ? today : preset === 'month' ? `${today.slice(0, 7)}-01` : new Date(Date.parse(today) - 29 * DAY).toISOString().slice(0, 10);
  return { from, to: today };
}
export function previousFinancePeriod(from: string, to: string) {
  if (!validFinanceDate(from) || !validFinanceDate(to) || from > to) return null;
  const length = Date.parse(to) - Date.parse(from) + DAY;
  return { from: new Date(Date.parse(from) - length).toISOString().slice(0, 10), to: new Date(Date.parse(from) - DAY).toISOString().slice(0, 10) };
}
export function financeTimeline(days: { date: string; income: number; expense: number }[], from: string, to: string) {
  if (!validFinanceDate(from) || !validFinanceDate(to) || from > to || Date.parse(to) - Date.parse(from) >= 366 * DAY) return [];
  const indexed = new Map(days.map(day => [day.date, day]));
  const result = [];
  for (let timestamp = Date.parse(from); timestamp <= Date.parse(to); timestamp += DAY) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    result.push(indexed.get(date) || { date, income: 0, expense: 0 });
  }
  return result;
}
export function filterFinanceEntries(entries: FinanceEntry[], from: string, to: string, query: string, status: string, kind: string, today: string) {
  const needle = query.trim().toLocaleLowerCase('pt-BR');
  return entries.filter(entry => {
    const date = entry.status === 'paid' ? entry.paidDate : entry.dueDate;
    return date >= from && date <= to && (kind === 'all' || entry.kind === kind)
      && (status === 'all' || (status === 'overdue' ? entry.status === 'pending' && entry.dueDate < today : entry.status === status))
      && `${entry.companyName} ${entry.description}`.toLocaleLowerCase('pt-BR').includes(needle);
  }).sort((a, b) => (b.status === 'paid' ? b.paidDate : b.dueDate).localeCompare(a.status === 'paid' ? a.paidDate : a.dueDate) || b.createdAt - a.createdAt);
}
