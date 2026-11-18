import type { Metadata } from 'next';
import CompanyAdmin from '@/components/CompanyAdmin';
export const metadata: Metadata = { title: 'Administração · GridStock', robots: { index: false, follow: false } };
export default function AdministrationPage() { return <CompanyAdmin />; }
