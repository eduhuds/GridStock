import GridStockApp from '@/components/GridStockApp';
import { findCompany } from '@/lib/companies';
import { pullPlatformFromSupabase } from '@/lib/supabaseStore';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await pullPlatformFromSupabase();
  const company = findCompany(slug);
  if (!company?.active) notFound();
  return <GridStockApp company={company} />;
}
