import { NextResponse } from 'next/server';
import { getDb, getUserFromRequest, loadState, saveState } from '@/lib/db';
import { deleteWarehouse } from '@/lib/domain';
import { ensureSupabaseSynced, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'ops') return NextResponse.json({ error: 'Acesso restrito ao Controle Operacional.' }, { status: 403 });

    const { id } = await context.params;
    const state = loadState(db);
    deleteWarehouse(state, decodeURIComponent(id));
    saveState(db, state);
    await pushAllToSupabase(db);
    return NextResponse.json({ state });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir estoque.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
