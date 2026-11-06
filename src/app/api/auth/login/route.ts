import { authenticateCompanyFallback, configForRequest, databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { authenticate, stateForUser, listUsers, loadState } from '@/lib/db';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase, pushPlatformToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function respondWithCompanyMatches(matches: ReturnType<typeof authenticateCompanyFallback>) {
  if (matches.length === 1) {
    const companyMatch = matches[0];
    await pushAllToSupabase(companyMatch.db);
    const cState = loadState(companyMatch.db);
    const cUsers = companyMatch.user.role === 'ops' ? listUsers(companyMatch.db) : [];
    return NextResponse.json({
      token: companyMatch.token,
      user: companyMatch.user,
      state: stateForUser(cState, companyMatch.user),
      users: cUsers,
      config: companyMatch.company.config,
      companySlug: companyMatch.company.slug,
    });
  }
  await pushPlatformToSupabase();
  return NextResponse.json({
    companyChoices: matches.map(m => ({
      slug: m.company.slug,
      name: m.company.name,
      color: m.company.color,
      token: m.token,
    })),
  });
}

export async function POST(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const body = await req.json();
    const hasCompanyHeader = req.headers.get('x-gridstock-company') !== null;
    enforceCompanyAction(req, 'login', body);
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);

    try {
      const { token, user } = authenticate(body.username, body.password, db);
      enforceCompanyAction(req, 'login', { role: user.role });
      if (body.role && body.role !== user.role) {
        if (!hasCompanyHeader) {
          db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
          const matches = authenticateCompanyFallback(body.username, body.password, body.role);
          if (matches.length > 0) {
            return respondWithCompanyMatches(matches);
          }
        }
        return NextResponse.json({ error: 'Use a página de acesso correspondente ao seu perfil.' }, { status: 403 });
      }
      await pushAllToSupabase(db);
      const state = loadState(db);
      const users = user.role === 'ops' ? listUsers(db) : [];
      return NextResponse.json({ token, user, state: stateForUser(state, user), users, config: configForRequest(req) });
    } catch (authErr) {
      if (!hasCompanyHeader) {
        const matches = authenticateCompanyFallback(body.username, body.password, body.role);
        if (matches.length > 0) {
          return respondWithCompanyMatches(matches);
        }
      }
      throw authErr;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao autenticar.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
