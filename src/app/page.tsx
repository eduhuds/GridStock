import GridStockApp from '@/components/GridStockApp';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const cookieStore = await cookies();
  void createClient(cookieStore);
  return <GridStockApp />;
}
