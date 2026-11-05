import { NextResponse } from 'next/server';
import { authenticate, stateForUser, getDb, listUsers, loadState } from '@/lib/db';
import { ensureSupabaseSynced, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();
    await ensureSupabaseSynced(db);
    const { token, user } = authenticate(body.username, body.password, db);
    if (body.role && body.role !== user.role) {
      return NextResponse.json({ error: 'Use a página de acesso correspondente ao seu perfil.' }, { status: 403 });
    }
    await pushAllToSupabase(db);
    const state = loadState(db);
    const users = user.role === 'ops' ? listUsers(db) : [];
    return NextResponse.json({ token, user, state: stateForUser(state, user), users });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao autenticar.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
