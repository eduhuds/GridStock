import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, listUsers, loadState, saveState } from '@/lib/db';
import { deleteTechnician } from '@/lib/domain';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handleDELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await pullPlatformFromSupabase();
    enforceCompanyAction(req, 'technicians');
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'ops') return NextResponse.json({ error: 'Acesso restrito ao Controle Operacional.' }, { status: 403 });

    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);
    const state = loadState(db);
    deleteTechnician(state, decodedId);

    const linkedUser = db.prepare('SELECT id FROM users WHERE technician_id = ?').get(decodedId) as { id: string } | undefined;
    if (linkedUser) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(linkedUser.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(linkedUser.id);
    }
    saveState(db, state);
    await pushAllToSupabase(db);
    return NextResponse.json({ state, users: listUsers(db) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir técnico.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const DELETE = secureRoute(handleDELETE);
