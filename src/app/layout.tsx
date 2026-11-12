import type { Metadata, Viewport } from 'next';
import './globals.css';
import LegalAccessibilityHub from '@/components/LegalAccessibilityHub';

export const metadata: Metadata = {
  title: 'GRIDSTOCK — Estoque em movimento',
  icons: { apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] },
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
      <body>
        {children}
        <LegalAccessibilityHub />
      </body>
    </html>
  );
}

