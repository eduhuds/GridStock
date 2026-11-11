'use client';

import React, { useMemo } from 'react';
import type { GridStockState, Part } from '@/lib/domain';
import { generateQrMatrix, generateQrSvgPath } from '@/lib/qrcode';
import { Icon } from './icons';

interface ProductQrModalProps {
  open: boolean;
  partId: string | 'all' | null;
  state: GridStockState;
  onClose: () => void;
  onQuickWithdraw: (partId: string) => void;
}

export function QrCodeSvg({ value, size = 160 }: { value: string; size?: number }) {
  const { matrixSize, path } = useMemo(() => {
    const matrix = generateQrMatrix(value);
    const res = generateQrSvgPath(matrix);
    return { matrixSize: res.size, path: res.path };
  }, [value]);

  const pad = 2;
  const viewBoxSize = matrixSize + pad * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-${pad} -${pad} ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      style={{
        background: '#ffffff',
        borderRadius: 10,
        border: '1px solid #dfe5d8',
        display: 'block',
      }}
      role="img"
      aria-label={`QR Code ${value}`}
    >
      <rect x={-pad} y={-pad} width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
      <path d={path} fill="#152d26" />
    </svg>
  );
}

export default function ProductQrModal({
  open,
  partId,
  state,
  onClose,
  onQuickWithdraw,
}: ProductQrModalProps) {
  if (!open || !partId) return null;

  const isAll = partId === 'all';
  const targetParts: Part[] = isAll
    ? state.parts
    : state.parts.filter(p => p.id === partId);

  if (targetParts.length === 0) return null;

  const singlePart = !isAll ? targetParts[0] : null;

  const getAddressSummary = (p: Part) => {
    const slots = state.warehouses
      .map(w => {
        const s = state.locations[w.id]?.[p.id];
        const qty = state.stock[w.id]?.[p.id] ?? 0;
        if (!s) return null;
        return `${w.name} (${w.code}): C${s.corridor}/P${s.shelf} (${qty} ${p.unit})`;
      })
      .filter(Boolean);
    return slots.length > 0 ? slots.join(' · ') : 'Sem endereçamento fixo';
  };

  const handleDownloadPng = (p: Part) => {
    const matrix = generateQrMatrix(p.sku);
    const n = matrix.length;
    const scale = 8;
    const quiet = 3;
    const qrPx = (n + quiet * 2) * scale;
    const width = Math.max(qrPx + 48, 320);
    const height = qrPx + 128;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#d4ded0';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    const offsetX = Math.floor((width - qrPx) / 2);
    const offsetY = 20;

    ctx.fillStyle = '#152d26';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(
            offsetX + (c + quiet) * scale,
            offsetY + (r + quiet) * scale,
            scale,
            scale
          );
        }
      }
    }

    ctx.fillStyle = '#152d26';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.sku, width / 2, offsetY + qrPx + 24);

    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillStyle = '#285d48';
    ctx.fillText(p.name.slice(0, 34), width / 2, offsetY + qrPx + 46);

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#65746b';
    ctx.fillText(getAddressSummary(p).slice(0, 44), width / 2, offsetY + qrPx + 66);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-etiqueta-${p.sku.toLowerCase()}.png`;
    a.click();
  };

  const handlePrintLabels = (partsToPrint: Part[]) => {
    const win = window.open('', '_blank', 'width=840,height=680');
    if (!win) return;

    const cardsHtml = partsToPrint
      .map(p => {
        const matrix = generateQrMatrix(p.sku);
        const { size, path } = generateQrSvgPath(matrix);
        const pad = 2;
        const vb = size + pad * 2;
        const addr = getAddressSummary(p);
        return `
          <div class="label-card">
            <svg width="136" height="136" viewBox="-${pad} -${pad} ${vb} ${vb}" shape-rendering="crispEdges">
              <rect x="-${pad}" y="-${pad}" width="${vb}" height="${vb}" fill="#fff" />
              <path d="${path}" fill="#152d26" />
            </svg>
            <div class="label-meta">
              <span class="eyebrow">GRIDSTOCK · RETIRADA RÁPIDA</span>
              <strong>${p.name}</strong>
              <code>${p.sku}</code>
              <small>${p.category} · ${addr}</small>
            </div>
          </div>
        `;
      })
      .join('');

    win.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Etiquetas QR Code · GRIDSTOCK</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
              margin: 0;
              padding: 24px;
              color: #152d26;
              background: #fff;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
              gap: 16px;
            }
            .label-card {
              border: 1.5px dashed #8da396;
              border-radius: 12px;
              padding: 14px;
              display: flex;
              align-items: center;
              gap: 14px;
              page-break-inside: avoid;
            }
            .label-meta {
              display: flex;
              flex-direction: column;
              gap: 4px;
              min-width: 0;
            }
            .eyebrow {
              font-size: 8px;
              font-weight: 700;
              letter-spacing: 1px;
              color: #285d48;
            }
            strong {
              font-size: 13px;
              line-height: 1.3;
            }
            code {
              display: inline-block;
              font-size: 12px;
              font-weight: 700;
              background: #edf3eb;
              padding: 2px 6px;
              border-radius: 4px;
              width: fit-content;
            }
            small {
              font-size: 10px;
              color: #5b6d62;
              line-height: 1.35;
            }
          </style>
        </head>
        <body>
          <div class="grid">${cardsHtml}</div>
          <script>
            window.onload = function () {
              setTimeout(function () { window.print(); }, 250);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 9998 }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${isAll ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="qr-modal-title">
              {singlePart ? `QR Code · ${singlePart.name}` : 'Etiquetas QR Code de Produtos'}
            </h2>
            <p>
              Aponte a câmera no leitor de Retirada Rápida para enviar esta peça direto para o técnico em campo.
            </p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar janela">
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body">
          {singlePart ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 14,
                padding: '20px',
                borderRadius: 16,
                background: 'var(--soft)',
                border: '1px solid var(--line)',
              }}
            >
              <QrCodeSvg value={singlePart.sku} size={188} />
              <div>
                <span className="eyebrow" style={{ color: 'var(--green)' }}>
                  CÓDIGO QR DO PRODUTO
                </span>
                <h3 style={{ fontSize: 18, marginTop: 4 }}>{singlePart.name}</h3>
                <div
                  className="mono"
                  style={{
                    display: 'inline-block',
                    marginTop: 6,
                    padding: '4px 12px',
                    borderRadius: 6,
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {singlePart.sku}
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>
                  {singlePart.category} · {getAddressSummary(singlePart)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => handleDownloadPng(singlePart)}
                >
                  <Icon name="download" /> Baixar etiqueta (.PNG)
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => handlePrintLabels([singlePart])}
                >
                  <Icon name="file" /> Imprimir etiqueta QR
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
                gap: 14,
                maxHeight: '58vh',
                overflowY: 'auto',
                padding: 2,
              }}
            >
              {targetParts.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 10,
                    padding: 16,
                    borderRadius: 14,
                    background: 'var(--soft)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <QrCodeSvg value={p.sku} size={124} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 13 }}>{p.name}</strong>
                    <span className="mono small muted">{p.sku} · {p.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, width: '100%', marginTop: 'auto' }}>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ flex: 1, padding: '7px 10px', fontSize: 11, minHeight: 32 }}
                      onClick={() => handlePrintLabels([p])}
                    >
                      Imprimir
                    </button>
                    <button
                      type="button"
                      className="button"
                      style={{ flex: 1, padding: '7px 10px', fontSize: 11, minHeight: 32 }}
                      onClick={() => {
                        onClose();
                        onQuickWithdraw(p.id);
                      }}
                    >
                      <Icon name="out" /> Retirar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="button secondary" onClick={onClose}>
            Fechar
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isAll && (
              <button
                type="button"
                className="button"
                onClick={() => handlePrintLabels(targetParts)}
              >
                <Icon name="file" /> Imprimir todas as etiquetas ({targetParts.length})
              </button>
            )}
            {singlePart && (
              <button
                type="button"
                className="button"
                onClick={() => {
                  onClose();
                  onQuickWithdraw(singlePart.id);
                }}
              >
                <Icon name="out" /> Enviar para técnico (Retirada)
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

