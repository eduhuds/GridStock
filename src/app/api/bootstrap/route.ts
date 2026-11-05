import { NextResponse } from 'next/server';
import { stateForUser, getDb, getUserFromRequest, listUsers, loadState } from '@/lib/db';
import { ensureSupabaseSynced } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const db = getDb();
  await ensureSupabaseSynced(db);
  const user = getUserFromRequest(req, db);
  if (!user) {
    return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
  }
  const state = loadState(db);
  const users = user.role === 'ops' ? listUsers(db) : [];
  return NextResponse.json({ user, state: stateForUser(state, user), users });
}
