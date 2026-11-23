import { policies, writePolicies } from '@/lib/accessPolicy';
import { refreshAccessPolicy, persistAccessPolicy } from '@/lib/accessPolicySync';
import { can } from '@/lib/permissions';
import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { stateForUser, getUserFromRequest, listUsers, loadState, saveState, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
import { deleteTechnician } from '@/lib/domain';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handleDELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await pullPlatformFromSupabase();
    enforceCompanyAction(req, 'technicians');
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    await refreshAccessPolicy(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (!can(user, 'technicians')) return NextResponse.json({ error: 'Seu acesso não permite esta ação. Solicite autorização ao administrador.' }, { status: 403 });

    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);
    const state = loadState(db);
    const targetTech = state.technicians.find(t => t.id === decodedId);


    const linkedUser = db.prepare('SELECT id FROM users WHERE technician_id = ?').get(decodedId) as { id: string } | undefined;
    if (linkedUser && !user.companyAdmin) return NextResponse.json({error:'Somente o administrador pode remover um técnico com acesso ao sistema.'},{status:403});
    deleteTechnician(state, decodedId);
    if (linkedUser) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(linkedUser.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(linkedUser.id);
      const access = policies(db); delete access[linkedUser.id]; writePolicies(db,access);
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
    await persistAccessPolicy(db);
    await pushAllToSupabase(db);
    return NextResponse.json({ state: stateForUser(state, user), users: user.companyAdmin ? listUsers(db) : [], audit: can(user,'audit') ? listCompanyAudit(db, state) : [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir técnico.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const DELETE = secureRoute(handleDELETE);
