import type { Metadata } from 'next';
import GridStockApp from '@/components/GridStockApp';

export const metadata: Metadata = {
  title: 'Entrar no GridStock',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <GridStockApp />;
}
