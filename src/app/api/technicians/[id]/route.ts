import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, listUsers, loadState, saveState, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
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
    const targetTech = state.technicians.find(t => t.id === decodedId);
    deleteTechnician(state, decodedId);

    const linkedUser = db.prepare('SELECT id FROM users WHERE technician_id = ?').get(decodedId) as { id: string } | undefined;
    if (linkedUser) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(linkedUser.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(linkedUser.id);
    }
    saveState(db, state);
    recordCompanyAudit(db, {
      actorName: user.name,
      actorUsername: user.username,
      actorRole: user.role,
      category: 'technician',
      action: 'Técnico excluído',
      target: targetTech ? `${targetTech.name} (${targetTech.vehicle})` : decodedId,
      detail: 'Cadastro de campo e credencial vinculada removidos',
    });
    await pushAllToSupabase(db);
    return NextResponse.json({ state, users: listUsers(db), audit: listCompanyAudit(db, state) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir técnico.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const DELETE = secureRoute(handleDELETE);
