import { secureRoute } from '@/lib/apiSecurity';
import { authenticate, saveUser } from '@/lib/db';
import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { requireCpf } from '@/lib/cpf';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';
async function handlePOST(req: Request) {
  try {
    const body = await req.json();
    const cpf = requireCpf(body.cpf);
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const { token, user } = authenticate(body.legacyUsername, body.password, db, true);
    // Legacy credentials authorize this conversion only; they never leave a session behind.
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    enforceCompanyAction(req, 'login', { role: user.role });
    saveUser({ ...user, cpf }, db);
    await pushAllToSupabase(db);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Não foi possível converter. Confira o login e a senha atuais, use um CPF válido e ainda não cadastrado, e abra o link da sua empresa.' }, { status: 400 });
  }
}

export const POST = secureRoute(handlePOST);
