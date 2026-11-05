'use client';

import { useState } from 'react';
import type { GridStockState } from '@/lib/domain';
import { total } from '@/lib/domain';
import { dailyStockActivity } from '@/lib/dashboard';

const number = (value: number) => value.toLocaleString('pt-BR');

export default function DashboardCharts({ state, onOpenStock }: {
  state: GridStockState;
  onOpenStock: () => void;
}) {
  const [period, setPeriod] = useState(7);
  const days = dailyStockActivity(state.movements, period);
  const withdrawn = days.reduce((sum, day) => sum + day.withdrawn, 0);
  const used = days.reduce((sum, day) => sum + day.used, 0);
  const maximum = Math.max(4, ...days.flatMap(day => [day.withdrawn, day.used]));
  const ceiling = Math.ceil(maximum / 4) * 4;
  const points = (key: 'withdrawn' | 'used') => days.map((day, index) =>
    `${(index / (days.length - 1)) * 600},${180 - (day[key] / ceiling) * 180}`
  ).join(' ');
  const baseStock = state.warehouses.reduce((sum, warehouse) => sum + total(state, warehouse.id), 0);
  const fieldStock = state.technicians.reduce((sum, technician) => sum + total(state, technician.id), 0);
  const stock = baseStock + fieldStock;
  const basePercent = stock ? Math.round(baseStock / stock * 100) : 0;
  const active = state.technicians.filter(technician => ['working', 'route'].includes(technician.status)).length;

  return (
    <div className="dashboard-charts">
      <section className="panel dashboard-trend" aria-labelledby="activity-heading">
        <div className="panel-head">
          <div>
            <span className="page-eyebrow">FLUXO DE PEÇAS</span>
            <h2 id="activity-heading">Movimentação ao longo dos dias</h2>
            <p>Unidades retiradas da base e utilizadas em atendimento</p>
          </div>
          <div className="dashboard-period" role="group" aria-label="Período do gráfico">
            {[7, 30].map(value => (
              <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>
                {value} dias
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-chart-totals" aria-live="polite">
          <div><span><i className="chart-key withdrawn" />Retiradas da base</span><strong>{number(withdrawn)} <small>un.</small></strong></div>
          <div><span><i className="chart-key used" />Utilizadas</span><strong>{number(used)} <small>un.</small></strong></div>
          <span className="dashboard-period-caption">Últimos {period} dias<br />incluindo hoje</span>
        </div>
        <div className="dashboard-plot">
          <div className="dashboard-axis" aria-hidden="true">
            {[ceiling, ceiling * .75, ceiling * .5, ceiling * .25, 0].map(value => <span key={value}>{number(value)}</span>)}
          </div>
          <div className="dashboard-plot-area">
            <svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-labelledby="activity-title activity-description">
              <title id="activity-title">Retiradas e utilizações nos últimos {period} dias</title>
              <desc id="activity-description">{number(withdrawn)} unidades retiradas e {number(used)} utilizadas. Os valores diários estão disponíveis logo abaixo do gráfico.</desc>
              {[0, 45, 90, 135, 180].map(y => <line key={y} x1="0" x2="600" y1={y} y2={y} className="dashboard-gridline" />)}
              <polygon points={`0,180 ${points('withdrawn')} 600,180`} className="dashboard-area" />
              <polyline points={points('withdrawn')} className="dashboard-line withdrawn" />
              <polyline points={points('used')} className="dashboard-line used" />
            </svg>
            {withdrawn + used === 0 && <div className="dashboard-chart-empty">Nenhuma retirada ou utilização neste período</div>}
            <div className="dashboard-dates" aria-hidden="true">
              <span>{days[0].label}</span><span>{days[Math.floor(period / 2)].label}</span><span>Hoje · {days[period - 1].label}</span>
            </div>
          </div>
        </div>
        <details className="dashboard-chart-data">
          <summary>Ver valores por dia <span>Horário de Fortaleza</span></summary>
          <div className="dashboard-day-list">
            {days.map(day => <div key={day.date}><strong>{day.label}</strong><span>{number(day.withdrawn)} retiradas</span><span>{number(day.used)} utilizadas</span></div>)}
          </div>
        </details>
      </section>
      <section className="panel dashboard-balance" aria-labelledby="balance-heading">
        <div className="panel-head"><div><span className="page-eyebrow">POSIÇÃO ATUAL</span><h2 id="balance-heading">Estoque em distribuição</h2><p>Saldo disponível nas bases e com a equipe</p></div></div>
        <div className="dashboard-ring" role="img" aria-label={`${number(baseStock)} unidades nas bases e ${number(fieldStock)} em campo`}>
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle cx="90" cy="90" r="70" className="dashboard-ring-track" />
            {stock > 0 && <>
              <circle cx="90" cy="90" r="70" className="dashboard-ring-field" />
              <circle cx="90" cy="90" r="70" className="dashboard-ring-base" pathLength="100" strokeDasharray={`${baseStock / stock * 100} 100`} />
            </>}
          </svg>
          <div aria-hidden="true"><strong>{number(stock)}</strong><span>unidades disponíveis</span></div>
        </div>
        <div className="dashboard-balance-legend">
          <div><span><i className="chart-key used" />Nas bases</span><strong>{number(baseStock)}</strong><small>{basePercent}%</small></div>
          <div><span><i className="chart-key withdrawn" />Em campo</span><strong>{number(fieldStock)}</strong><small>{stock ? 100 - basePercent : 0}%</small></div>
        </div>
        <div className="dashboard-balance-footer"><span>{active} de {state.technicians.length} técnicos em campo</span><button className="text-link" onClick={onOpenStock}>Ver inventário →</button></div>
      </section>
    </div>
  );
}
