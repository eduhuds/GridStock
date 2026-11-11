'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

interface BarcodeScannerModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  quickParts?: Array<{ id: string; sku: string; name: string }>;
  onClose: () => void;
  onDetected: (code: string) => void;
}

export default function BarcodeScannerModal({
  open,
  title = 'Leitor de Código de Barras / QR Code',
  subtitle = 'Aponte a câmera para o QR Code da peça para enviar ao técnico.',
  quickParts,
  onClose,
  onDetected,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) {
      setManualCode('');
      setCameraError('');
      setScanning(false);
      return;
    }

    let active = true;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function startCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Câmera indisponível neste navegador. Digite ou use leitor USB abaixo.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setScanning(true);

        const BarcodeDetectorCtor = (window as unknown as {
          BarcodeDetector?: new (opts?: { formats?: string[] }) => {
            detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
          };
        }).BarcodeDetector;

        if (BarcodeDetectorCtor) {
          const detector = new BarcodeDetectorCtor({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'itf', 'data_matrix'],
          });
          timer = setInterval(async () => {
            if (!active || !videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const results = await detector.detect(videoRef.current);
              const found = results.find(r => r.rawValue && r.rawValue.trim());
              if (found?.rawValue) {
                const val = found.rawValue.trim();
                onDetected(val);
                onClose();
              }
            } catch {}
          }, 300);
        } else {
          setCameraError('Visualização da câmera ativa. Caso a leitura automática não dispare neste navegador, confirme o código abaixo.');
        }
      } catch {
        if (active) {
          setCameraError('Não foi possível acessar a câmera. Permita o acesso ou informe o código manualmente abaixo.');
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [open, onDetected, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 9999 }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar leitor">
            <Icon name="close" />
          </button>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            const cleaned = manualCode.trim();
            if (!cleaned) return;
            onDetected(cleaned);
            onClose();
          }}
        >
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#0b1411',
                border: '1px solid var(--line)',
                aspectRatio: '16 / 10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '18% 14%',
                  border: '2px dashed rgba(52, 211, 153, 0.85)',
                  borderRadius: 12,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.32)',
                  pointerEvents: 'none',
                }}
              />
              {!scanning && !cameraError && (
                <span style={{ position: 'absolute', color: '#e9f2ee', fontSize: '0.85rem' }}>
                  Iniciando câmera...
                </span>
              )}
            </div>

            {cameraError && (
              <div className="form-note" style={{ fontSize: '0.82rem' }}>
                {cameraError}
              </div>
            )}

            <div className="field" style={{ marginBottom: quickParts && quickParts.length > 0 ? 6 : undefined }}>
              <label htmlFor="scanner-manual-input">Código QR lido ou digitado (compatível com câmera e leitor USB / Bluetooth)</label>
              <input
                id="scanner-manual-input"
                className="input"
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Aponte o leitor para o QR Code ou digite o SKU (ex.: CON-SC-APC)"
                autoFocus
              />
            </div>

            {quickParts && quickParts.length > 0 && (
              <div>
                <small className="muted" style={{ display: 'block', marginBottom: 6, fontSize: 11 }}>
                  Seleção rápida de QR Code do catálogo:
                </small>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 110, overflowY: 'auto' }}>
                  {quickParts.map(pt => (
                    <button
                      key={pt.id}
                      type="button"
                      className="button secondary"
                      style={{ padding: '5px 10px', fontSize: 11, minHeight: 30 }}
                      onClick={() => {
                        onDetected(pt.sku);
                        onClose();
                      }}
                    >
                      <Icon name="qr" /> {pt.sku} · {pt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="button secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button" type="submit" disabled={!manualCode.trim()}>
              <Icon name="check" /> Usar código
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
