import { refreshAccessPolicy, persistAccessPolicy } from '@/lib/accessPolicySync';
import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { deleteUser, getUserFromRequest, listUsers, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handleDELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    await refreshAccessPolicy(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (!user.companyAdmin) return NextResponse.json({ error: 'Seu acesso não permite esta ação. Solicite autorização ao administrador.' }, { status: 403 });

    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);
    const targetUser = listUsers(db).find(u => u.id === decodedId);
    deleteUser(decodedId, user.id, db);
    recordCompanyAudit(db, {
      actorName: user.name,
      actorUsername: user.username,
      actorRole: user.role,
      category: 'user',
      action: 'Usuário removido',
      target: targetUser ? `${targetUser.name} (@${targetUser.username})` : decodedId,
      detail: 'Acesso e sessões revogados',
    });
    await persistAccessPolicy(db);
    await pushAllToSupabase(db);
    return NextResponse.json({ users: user.companyAdmin ? listUsers(db) : [], audit: listCompanyAudit(db) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao remover usuário.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const DELETE = secureRoute(handleDELETE);
