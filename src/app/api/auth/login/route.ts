import { configForRequest, databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { authenticate, stateForUser, listUsers, loadState } from '@/lib/db';
import { ensureSupabaseSynced, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    enforceCompanyAction(req, 'login', body);
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const { token, user } = authenticate(body.username, body.password, db);
    enforceCompanyAction(req, 'login', { role: user.role });
    if (body.role && body.role !== user.role) {
      return NextResponse.json({ error: 'Use a página de acesso correspondente ao seu perfil.' }, { status: 403 });
    }
    await pushAllToSupabase(db);
    const state = loadState(db);
    const users = user.role === 'ops' ? listUsers(db) : [];
    return NextResponse.json({ token, user, state: stateForUser(state, user), users, config: configForRequest(req) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao autenticar.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
