import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GRIDSTOCK — Estoque em movimento',
  description: 'GRIDSTOCK: gestão operacional de estoques, endereçamento físico, movimentações e equipes técnicas em campo.',
};

export const viewport: Viewport = {
  themeColor: '#152d26',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

