import GridStockApp from '@/components/GridStockApp';
import { findCompany } from '@/lib/companies';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = findCompany(slug);
  if (!company?.active) notFound();
  return <GridStockApp company={company} />;
}
