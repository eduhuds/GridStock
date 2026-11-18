import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest, configForRequest } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { stateForUser, getUserFromRequest, listUsers, loadState, listCompanyAudit } from '@/lib/db';
import { ensureSupabaseSynced, pullPlatformFromSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handleGET(req: Request) {
  try {
    // secureRoute resolves the HttpOnly session cookie into this header.
    // Anonymous visitors do not need a remote database synchronization.
    if (!req.headers.get('authorization')?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }
    const state = loadState(db);
    const users = user.role === 'ops' ? listUsers(db) : [];
    const audit = user.role === 'ops' ? listCompanyAudit(db, state) : [];
    return NextResponse.json({ user, state: stateForUser(state, user), users, audit, config: configForRequest(req) });
  } catch { return NextResponse.json({ error: 'Empresa indisponível ou sessão inválida.' }, { status: 401 }); }
}

export const GET = secureRoute(handleGET);
