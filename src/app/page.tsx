import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import LandingPage from '@/components/landing/LandingPage';

const manrope = Manrope({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'GridStock — Controle de estoque, da base ao campo',
  description: 'Saiba o que está no almoxarifado, com cada técnico e o que foi usado em campo. Conheça o GridStock e solicite o acesso da sua empresa pelo WhatsApp.',
  openGraph: {
    title: 'GridStock — Cada peça no seu radar.',
    description: 'Gestão de estoque para operações com equipes em campo. Conecte almoxarifados, técnicos e histórico de movimentações.',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function HomePage() {
  return <div className={manrope.className}><LandingPage /></div>;
}
