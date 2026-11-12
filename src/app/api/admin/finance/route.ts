import { secureRoute } from '@/lib/apiSecurity';
import { requireMaster } from '@/lib/companies';
import { listFinanceEntries, saveFinanceEntry } from '@/lib/platformFinance';
import { pullPlatformFromSupabase, pushPlatformToSupabase } from '@/lib/supabaseStore';

async function handle(req: Request) {
  await pullPlatformFromSupabase();
  try { requireMaster(req); } catch { return Response.json({ error: 'Acesso exclusivo da administração.' }, { status: 403 }); }
  if (req.method === 'POST') {
    try { saveFinanceEntry(req, await req.json()); }
    catch (e) { return Response.json({ error: e instanceof Error ? e.message : 'Dados inválidos.' }, { status: 400 }); }
    const remoteSynced = await pushPlatformToSupabase(undefined, { registryOnly: true });
    return Response.json({ entries: listFinanceEntries(req), persistenceWarning: process.env.GRIDSTOCK_STORAGE_MODE !== 'local' && process.env.NEXT_PUBLIC_SUPABASE_URL && !remoteSynced ? 'Salvo localmente, mas a cópia remota não foi atualizada. Confira a conexão antes de encerrar o servidor.' : null });
  }
  return Response.json({ entries: listFinanceEntries(req) });
}
export const GET = secureRoute(handle);
export const POST = secureRoute(handle);
