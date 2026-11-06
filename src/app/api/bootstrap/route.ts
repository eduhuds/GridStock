import { databaseForRequest, configForRequest } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { stateForUser, getUserFromRequest, listUsers, loadState } from '@/lib/db';
import { ensureSupabaseSynced, pullPlatformFromSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }
    const state = loadState(db);
    const users = user.role === 'ops' ? listUsers(db) : [];
    return NextResponse.json({ user, state: stateForUser(state, user), users, config: configForRequest(req) });
  } catch { return NextResponse.json({ error: 'Empresa indisponível ou sessão inválida.' }, { status: 401 }); }
}
