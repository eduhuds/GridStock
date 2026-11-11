import { secureRoute } from '@/lib/apiSecurity';
import { requireCpf } from '@/lib/cpf';
import { authenticateCompanyFallback, configForRequest, databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { authenticate, stateForUser, listUsers, loadState, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function respondWithCompanyMatches(matches: ReturnType<typeof authenticateCompanyFallback>) {
  if (matches.length === 1) {
    const companyMatch = matches[0];
    recordCompanyAudit(companyMatch.db, {
      actorName: companyMatch.user.name,
      actorUsername: companyMatch.user.username,
      actorRole: companyMatch.user.role,
      category: 'auth',
      action: 'Login realizado',
      target: companyMatch.user.name,
      detail: `Sessão autenticada (${companyMatch.user.role === 'ops' ? 'Controle Operacional' : 'Técnico em campo'})`,
    });
    await pushAllToSupabase(companyMatch.db);
    const cState = loadState(companyMatch.db);
    const cUsers = companyMatch.user.role === 'ops' ? listUsers(companyMatch.db) : [];
    const cAudit = companyMatch.user.role === 'ops' ? listCompanyAudit(companyMatch.db, cState) : [];
    return NextResponse.json({
      token: companyMatch.token,
      user: companyMatch.user,
      state: stateForUser(cState, companyMatch.user),
      users: cUsers,
      audit: cAudit,
      config: companyMatch.company.config,
      companySlug: companyMatch.company.slug,
    });
  }
  return NextResponse.json({ error: 'CPF ou senha inválidos.' }, { status: 401 });
}

async function handlePOST(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const body = await req.json();
    body.username = requireCpf(body.cpf ?? body.username);
    const hasCompanyHeader = req.headers.get('x-gridstock-company') !== null;
    enforceCompanyAction(req, 'login', body);
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);

    try {
      const { token, user } = authenticate(body.username, body.password, db);
      try { enforceCompanyAction(req, 'login', { role: user.role }); }
      catch (error) { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); throw error; }
      if (body.role && body.role !== user.role) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        if (!hasCompanyHeader) {
          db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
          const matches = authenticateCompanyFallback(body.username, body.password, body.role);
          if (matches.length > 0) {
            return respondWithCompanyMatches(matches);
          }
        }
        return NextResponse.json({ error: 'Use a página de acesso correspondente ao seu perfil.' }, { status: 403 });
      }
      recordCompanyAudit(db, {
        actorName: user.name,
        actorUsername: user.username,
        actorRole: user.role,
        category: 'auth',
        action: 'Login realizado',
        target: user.name,
        detail: `Sessão autenticada (${user.role === 'ops' ? 'Controle Operacional' : 'Técnico em campo'})`,
      });
      await pushAllToSupabase(db);
      const state = loadState(db);
      const users = user.role === 'ops' ? listUsers(db) : [];
      const audit = user.role === 'ops' ? listCompanyAudit(db, state) : [];
      return NextResponse.json({ token, user, state: stateForUser(state, user), users, audit, config: configForRequest(req) });
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

export const POST = secureRoute(handlePOST);
