import { refreshAccessPolicy, persistAccessPolicy } from '@/lib/accessPolicySync';
import { can } from '@/lib/permissions';
import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { stateForUser, getUserFromRequest, listUsers, loadState, saveState, syncTechnicianUser, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
import { saveTechnician } from '@/lib/domain';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handlePOST(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    await refreshAccessPolicy(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (!can(user, 'technicians')) return NextResponse.json({ error: 'Seu acesso não permite esta ação. Solicite autorização ao administrador.' }, { status: 403 });

    const body = await req.json();
    if (!user.companyAdmin && (body.username || body.password)) return NextResponse.json({error:'Somente o administrador pode definir credenciais.'},{status:403});
    if (Array.isArray(body.load) && body.load.length && !can(user,'withdraw')) return NextResponse.json({error:'A carga inicial exige permissão de retirada.'},{status:403});
    if (Array.isArray(body.newParts) && body.newParts.length && (!can(user,'products') || !can(user,'entry') || !can(user,'withdraw'))) return NextResponse.json({error:'O cadastro de peças e carga inicial exige permissões de produto, entrada e retirada.'},{status:403});
    const isEdit = Boolean(body.id);
    enforceCompanyAction(req, 'technicians', body);
    body.operator = user.name;
    const state = loadState(db);
    const technician = saveTechnician(state, body);
    if (body.username !== undefined && (body.username || body.password)) {
      syncTechnicianUser(technician, body.username, body.password, db);
    }
    saveState(db, state);
    recordCompanyAudit(db, {
      actorName: user.name,
      actorUsername: user.username,
      actorRole: user.role,
      category: 'technician',
      action: isEdit ? 'Técnico atualizado' : 'Técnico cadastrado',
      target: `${technician.name} (${technician.vehicle})`,
      detail: `Região: ${technician.region} · Status: ${technician.status}`,
    });
    await persistAccessPolicy(db);
    await pushAllToSupabase(db);
    return NextResponse.json({ technician, state: stateForUser(state, user), users: user.companyAdmin ? listUsers(db) : [], audit: can(user,'audit') ? listCompanyAudit(db, state) : [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar técnico.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const POST = secureRoute(handlePOST);
