import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, loadState, saveState } from '@/lib/db';
import { deleteProduct } from '@/lib/domain';
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
    const state = loadState(db);
    deleteProduct(state, decodeURIComponent(id));
    saveState(db, state);
    await pushAllToSupabase(db);
    return NextResponse.json({ state });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir produto.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const DELETE = secureRoute(handleDELETE);
