'use client';

import React, { useMemo, useState } from 'react';
import type { GridStockState } from '@/lib/domain';
import { Icon } from './icons';

interface RestockOrderModalProps {
  open: boolean;
  state: GridStockState;
  onClose: () => void;
}

interface RestockLine {
  partId: string;
  sku: string;
  name: string;
  category: string;
  supplier: string;
  warehouseName: string;
  warehouseCode: string;
  currentQty: number;
  baseMin: number;
  suggestedQty: number;
  unitCost: number;
  subtotal: number;
}

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RestockOrderModal({ open, state, onClose }: RestockOrderModalProps) {
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [copied, setCopied] = useState(false);

  const lines = useMemo<RestockLine[]>(() => {
    const items: RestockLine[] = [];
    for (const w of state.warehouses) {
      const balances = state.stock[w.id] || {};
      const locs = state.locations[w.id] || {};
      for (const p of state.parts) {
        if (!locs[p.id] && state.warehouses.length > 1) continue;
        const currentQty = balances[p.id] || 0;
        if (currentQty < p.baseMin) {
          const target = Math.max(p.baseMin * 2, p.baseMin + 5);
          const suggestedQty = Math.max(1, target - currentQty);
          const unitCost = p.unitCost || 0;
          items.push({
            partId: `${w.id}-${p.id}`,
            sku: p.sku,
            name: p.name,
            category: p.category,
            supplier: p.supplier || 'Fornecedor geral',
            warehouseName: w.name,
            warehouseCode: w.code,
            currentQty,
            baseMin: p.baseMin,
            suggestedQty,
            unitCost,
            subtotal: suggestedQty * unitCost,
          });
        }
      }
    }
    return items;
  }, [state]);

  const suppliers = useMemo(
    () => Array.from(new Set(lines.map(l => l.supplier))).sort(),
    [lines]
  );

  const filteredLines = useMemo(
    () => lines.filter(l => supplierFilter === 'all' || l.supplier === supplierFilter),
    [lines, supplierFilter]
  );

  const totalEstimated = useMemo(
    () => filteredLines.reduce((acc, l) => acc + l.subtotal, 0),
    [filteredLines]
  );

  if (!open) return null;

  function buildOrderText() {
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const header = `*PEDIDO DE REPOSIÇÃO DE ESTOQUE — GRIDSTOCK (${dateStr})*`;
    const body = filteredLines
      .map(
        (l, idx) =>
          `${idx + 1}. *${l.sku}* · ${l.name} (${l.warehouseCode})\n   Saldo: ${l.currentQty} un. | Mín: ${l.baseMin} un. | *Comprar: ${l.suggestedQty} un.*${
            l.unitCost > 0 ? ` (${currencyFmt.format(l.subtotal)})` : ''
          } · Forn.: ${l.supplier}`
      )
      .join('\n\n');
    const footer =
      totalEstimated > 0
        ? `\n\n*Total estimado do pedido: ${currencyFmt.format(totalEstimated)}*`
        : '';
    return `${header}\n\n${body}${footer}`;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildOrderText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 9998 }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal wide" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h2>Pedido de Reposição Automático</h2>
            <p>Itens com saldo abaixo do mínimo nas bases operacionais e sugestão de compra para cobertura segura.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body">
          <div className="toolbar" style={{ marginBottom: 14, padding: 0 }}>
            <div className="small muted">
              Filtre por fornecedor para copiar ou imprimir a cotação separada.
            </div>
            <select
              aria-label="Filtrar por fornecedor"
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
            >
              <option value="all">Todos os fornecedores</option>
              {suppliers.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {filteredLines.length === 0 ? (
            <div className="empty">
              <Icon name="check" />
              <div>Nenhum item abaixo do estoque mínimo</div>
              <p>Todas as bases estão abastecidas acima do limite de segurança configurado.</p>
            </div>
          ) : (
            <>
              <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Base</th>
                      <th>Fornecedor</th>
                      <th>Saldo / Mín.</th>
                      <th>Sugestão Compra</th>
                      <th>Custo Unit.</th>
                      <th>Subtotal Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.map(line => (
                      <tr key={line.partId}>
                        <td>
                          <strong>{line.name}</strong>
                          <span className="cell-sub">{line.sku} · {line.category}</span>
                        </td>
                        <td>
                          <strong>{line.warehouseName}</strong>
                          <span className="cell-sub">{line.warehouseCode}</span>
                        </td>
                        <td>{line.supplier}</td>
                        <td>
                          <span className="badge amber">{line.currentQty} un.</span> / {line.baseMin} un.
                        </td>
                        <td>
                          <span className="badge green">+{line.suggestedQty} un.</span>
                        </td>
                        <td className="mono">{line.unitCost > 0 ? currencyFmt.format(line.unitCost) : '—'}</td>
                        <td className="mono">
                          <strong>{line.subtotal > 0 ? currencyFmt.format(line.subtotal) : '—'}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="balance-preview" style={{ marginTop: 14 }}>
                <span>
                  Itens na cotação: <strong>{filteredLines.length}</strong>
                </span>
                <span>
                  Total estimado:{' '}
                  <strong>
                    {totalEstimated > 0 ? currencyFmt.format(totalEstimated) : 'Informe o custo unitário nos produtos'}
                  </strong>
                </span>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="button secondary" type="button" onClick={onClose}>
            Fechar
          </button>
          {filteredLines.length > 0 && (
            <>
              <button className="button secondary" type="button" onClick={() => window.print()}>
                <Icon name="download" /> Imprimir / Salvar PDF
              </button>
              <button className="button" type="button" onClick={handleCopy}>
                <Icon name="check" /> {copied ? 'Copiado para área de transferência!' : 'Copiar pedido para WhatsApp'}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
