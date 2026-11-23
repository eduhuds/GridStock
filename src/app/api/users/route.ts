import { refreshAccessPolicy, persistAccessPolicy } from '@/lib/accessPolicySync';
import { can } from '@/lib/permissions';
import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getDb, getUserFromRequest, listUsers, saveUser, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
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

    const body = await req.json();
    const isSelfUpdate = Boolean(body.id && String(body.id) === user.id);
    const isEdit = Boolean(body.id);
    if (!user.companyAdmin && !isSelfUpdate) {
      return NextResponse.json({ error: 'Seu acesso não permite esta ação. Solicite autorização ao administrador.' }, { status: 403 });
    }
    if (isSelfUpdate) {
      body.role = user.role; body.technicianId = user.technicianId;
      // Own profile never changes access rights. Admins edit other accounts instead.
      delete body.access;
    }

    enforceCompanyAction(req, 'users', body);
    if (db === getDb() && body.id === (process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin') && (user.id !== body.id || body.role === 'tech')) return NextResponse.json({ error: 'A conta do administrador geral é protegida.' }, { status: 403 });
    if (body.role === 'tech' && !db.prepare('SELECT id FROM technicians WHERE id=?').get(String(body.technicianId||''))) return NextResponse.json({error:'Selecione um técnico desta empresa.'},{status:400});
    const saved = saveUser(body, db);
    if (isSelfUpdate) {
      const auth = req.headers.get('authorization') || '';
      const currentToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
      if (currentToken) {
        const now = Date.now();
        db.prepare('INSERT OR IGNORE INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
          currentToken,
          user.id,
          now,
          now + 1000 * 60 * 60 * 24 * 30
        );
      }
    }
    recordCompanyAudit(db, {
      actorName: isSelfUpdate ? saved.name : user.name,
      actorUsername: isSelfUpdate ? saved.username : user.username,
      actorRole: user.role,
      category: 'user',
      action: isSelfUpdate ? 'Perfil próprio atualizado' : isEdit ? 'Usuário editado' : 'Usuário cadastrado',
      target: `${saved.name} (@${saved.username})`,
      detail: `Perfil: ${saved.role === 'ops' ? 'Controle Operacional' : 'Técnico em campo'}${body.password ? ' · Senha redefinida' : ''} · ${saved.companyAdmin ? 'Administrador da empresa' : 'Permissões: ' + (saved.permissions || []).join(', ')}`,
    });
    await persistAccessPolicy(db);
    await pushAllToSupabase(db);
    return NextResponse.json({
      savedUser: saved,
      user: isSelfUpdate ? saved : undefined,
      users: user.companyAdmin ? listUsers(db) : undefined,
      audit: can(user, 'audit') ? listCompanyAudit(db) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar usuário.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const POST = secureRoute(handlePOST);
