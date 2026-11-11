import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, listUsers, loadState, saveState, syncTechnicianUser, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
import { emptyState, seed } from '@/lib/domain';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handlePOST(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'ops') return NextResponse.json({ error: 'Acesso restrito ao Controle Operacional.' }, { status: 403 });

    const body = await req.json();
    if (!['seed', 'empty'].includes(body.mode)) return NextResponse.json({ error: 'Modo inválido.' }, { status: 400 });
    enforceCompanyAction(req, 'reset', body);
    const nextState = body.mode === 'seed' ? seed() : emptyState();
    saveState(db, nextState);

    if (body.mode === 'empty') {
      const techUsers = db.prepare("SELECT id FROM users WHERE role = 'tech'").all() as { id: string }[];
      for (const tu of techUsers) {
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(tu.id);
      }
      db.exec("DELETE FROM users WHERE role = 'tech'");
    } else if (body.mode === 'seed' && process.env.GRIDSTOCK_SEED_TECH_PASSWORD) {
      for (const t of nextState.technicians) {
        const login = t.name
          .split(' ')[0]
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        try {
          syncTechnicianUser(t, login, process.env.GRIDSTOCK_SEED_TECH_PASSWORD, db);
        } catch {}
      }
    }

    recordCompanyAudit(db, {
      actorName: user.name,
      actorUsername: user.username,
      actorRole: user.role,
      category: 'system',
      action: body.mode === 'seed' ? 'Base de exemplo carregada' : 'Banco de dados zerado (teste)',
      target: 'Banco de dados da empresa',
      detail:
        body.mode === 'seed'
          ? 'Estoques, produtos e técnicos de demonstração restaurados'
          : 'Estoques, produtos, técnicos e movimentações foram limpos',
    });

    await pushAllToSupabase(db);
    const finalState = loadState(db);
    return NextResponse.json({ state: finalState, users: listUsers(db), audit: listCompanyAudit(db, finalState) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao redefinir banco de dados.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const POST = secureRoute(handlePOST);
