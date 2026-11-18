import { useId } from 'react';
import type { financeTimeline } from '@/lib/finance';
const money = (value: number) => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export default function AdminFinanceChart({ days }: { days: ReturnType<typeof financeTimeline> }) {
  const gradient = useId();
  const maximum = Math.max(100, ...days.flatMap(day => [day.income, day.expense]));
  const x = (index: number) => 68 + index / Math.max(1, days.length - 1) * 714;
  const y = (value: number) => 208 - value / maximum * 166;
  const points = (key: 'income' | 'expense') => days.map((day, index) => `${x(index)},${y(day[key])}`).join(' ');
  const ticks = [...new Set([0, Math.floor((days.length - 1) / 3), Math.floor((days.length - 1) * 2 / 3), days.length - 1])].filter(i => i >= 0);
  return <div className="finance-trend"><svg viewBox="0 0 810 250" role="img" aria-label="Receitas e despesas por dia. Dias sem pagamentos aparecem com valor zero.">
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a9cb70" stopOpacity=".4" /><stop offset="100%" stopColor="#a9cb70" stopOpacity=".02" /></linearGradient></defs>
    {[0, .5, 1].map(ratio => <g key={ratio}><line x1="68" x2="782" y1={y(maximum * ratio)} y2={y(maximum * ratio)} stroke="currentColor" strokeOpacity=".12" strokeDasharray="3 5" /><text x="55" y={y(maximum * ratio) + 4} textAnchor="end">{money(maximum * ratio)}</text></g>)}
    {days.length > 0 && <><polygon points={`68,208 ${points('income')} ${x(days.length - 1)},208`} fill={`url(#${gradient})`} stroke="none" /><polyline points={points('income')} fill="none" stroke="#7c9f4a" strokeWidth="2.5" /><polyline points={points('expense')} fill="none" stroke="#c09a66" strokeWidth="2" strokeDasharray="5 4" /></>}
    {days.map((day, index) => <g key={day.date}><title>{day.date.split('-').reverse().join('/')}: receitas {money(day.income)}, despesas {money(day.expense)}</title>{day.income > 0 && <circle cx={x(index)} cy={y(day.income)} r={days.length > 60 ? 2 : 3.5} fill="#7c9f4a" stroke="none" />}{day.expense > 0 && <circle cx={x(index)} cy={y(day.expense)} r={days.length > 60 ? 2 : 3} fill="#c09a66" stroke="none" />}</g>)}
    {ticks.map(index => <text key={index} x={x(index)} y="237" textAnchor="middle">{days[index].date.slice(8)}/{days[index].date.slice(5, 7)}</text>)}
  </svg></div>;
}
