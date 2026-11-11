import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, loadState, saveState, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
import { deleteWarehouse } from '@/lib/domain';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handleDELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'ops') return NextResponse.json({ error: 'Acesso restrito ao Controle Operacional.' }, { status: 403 });

    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);
    const state = loadState(db);
    const targetWh = state.warehouses.find(w => w.id === decodedId);
    deleteWarehouse(state, decodedId);
    saveState(db, state);
    recordCompanyAudit(db, {
      actorName: user.name,
      actorUsername: user.username,
      actorRole: user.role,
      category: 'warehouse',
      action: 'Estoque excluído',
      target: targetWh ? `${targetWh.name} (${targetWh.code})` : decodedId,
      detail: 'Base física removida (saldo zerado)',
    });
    await pushAllToSupabase(db);
    return NextResponse.json({ state, audit: listCompanyAudit(db, state) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir estoque.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const DELETE = secureRoute(handleDELETE);
