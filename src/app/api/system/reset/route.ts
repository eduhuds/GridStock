import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, listUsers, loadState, saveState, syncTechnicianUser } from '@/lib/db';
import { emptyState, seed } from '@/lib/domain';
import { ensureSupabaseSynced, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'ops') return NextResponse.json({ error: 'Acesso restrito ao Controle Operacional.' }, { status: 403 });

    const body = await req.json();
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

    await pushAllToSupabase(db);
    return NextResponse.json({ state: loadState(db), users: listUsers(db) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao redefinir banco de dados.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
