'use client';

import React, { useMemo } from 'react';
import { total, type GridStockState } from '@/lib/domain';

interface TeamAnalyticsPanelProps {
  state: GridStockState;
}

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function TeamAnalyticsPanel({ state }: TeamAnalyticsPanelProps) {
  const rows = useMemo(() => {
    const partCostMap = new Map(state.parts.map(p => [p.id, p.unitCost || 0]));
    return state.technicians.map(t => {
      let withdrawn = 0;
      let used = 0;
      let returned = 0;
      let countAdjustDelta = 0;
      let usedCost = 0;
      const osSet = new Set<string>();

      for (const m of state.movements) {
        if (m.technician !== t.id) continue;
        const qty = m.qty || 0;
        const cost = m.part ? partCostMap.get(m.part) || 0 : 0;
        if (m.kind === 'withdraw') withdrawn += qty;
        else if (m.kind === 'use') {
          used += qty;
          usedCost += qty * cost;
          if (m.order) osSet.add(m.order);
        } else if (m.kind === 'return') returned += qty;
        else if (m.kind === 'count') countAdjustDelta += m.delta || 0;
        if (m.order && (m.kind === 'arrival' || m.kind === 'finish')) {
          osSet.add(m.order);
        }
      }

      const vehicleBalance = total(state, t.id);
      const accounted = used + returned + vehicleBalance;
      const utilizationRate = withdrawn > 0 ? Math.min(100, Math.round((used / Math.max(1, withdrawn)) * 100)) : used > 0 ? 100 : 0;

      return {
        tech: t,
        withdrawn,
        used,
        returned,
        vehicleBalance,
        countAdjustDelta,
        osCount: osSet.size,
        usedCost,
        accounted,
        utilizationRate,
      };
    });
  }, [state]);

  if (state.technicians.length === 0) return null;

  return (
    <section className="panel" style={{ marginTop: 22 }}>
      <div className="panel-head">
        <div>
          <h2>Relatório de Consumo e Retorno por Técnico</h2>
          <p>
            Comparativo entre peças retiradas na base, aplicadas em Ordens de Serviço (OS), devolvidas e divergências de inventário.
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Técnico / Veículo</th>
              <th>OS Atendidas</th>
              <th>Retiradas</th>
              <th>Usadas em OS</th>
              <th>Devolvidas</th>
              <th>No Veículo</th>
              <th>Ajustes Contagem</th>
              <th>Custo Aplicado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.tech.id}>
                <td>
                  <strong>{r.tech.name}</strong>
                  <span className="cell-sub">
                    {r.tech.vehicle} · {r.tech.region}
                  </span>
                </td>
                <td className="mono">
                  <strong>{r.osCount}</strong> OS
                </td>
                <td className="mono">{r.withdrawn} un.</td>
                <td>
                  <span className="badge green">{r.used} un.</span>
                </td>
                <td className="mono">{r.returned} un.</td>
                <td className="mono">
                  <strong>{r.vehicleBalance} un.</strong>
                </td>
                <td>
                  {r.countAdjustDelta === 0 ? (
                    <span className="muted small">Sem divergência</span>
                  ) : (
                    <span className={`badge ${r.countAdjustDelta < 0 ? 'amber' : 'blue'}`}>
                      {r.countAdjustDelta > 0 ? `+${r.countAdjustDelta}` : r.countAdjustDelta} un.
                    </span>
                  )}
                </td>
                <td className="mono">{r.usedCost > 0 ? <strong>{currencyFmt.format(r.usedCost)}</strong> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
