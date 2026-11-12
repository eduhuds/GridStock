import { secureRoute } from '@/lib/apiSecurity';
import { masterLogin, convertMasterToCpf, masterLogout, changeMasterPassword, updateMasterUsername, requireMaster } from '@/lib/companies';
import { getDb } from '@/lib/db';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushPlatformToSupabase } from '@/lib/supabaseStore';

async function handlePOST(req: Request) {
  try {
    await ensureSupabaseSynced(getDb());
    await pullPlatformFromSupabase();
    const body = await req.json();
    const res = body.action === 'convertToCpf' ? convertMasterToCpf(body.legacyUsername, body.password, body.cpf) : masterLogin(body.cpf ?? body.username, body.password);
    await pushPlatformToSupabase(undefined, { registryOnly: true });
    return Response.json(res);
  } catch {
    return Response.json({ error: 'Credenciais inválidas ou sem permissão de administrador geral.' }, { status: 401 });
  }
}

async function handleDELETE(req: Request) {
  await pullPlatformFromSupabase();
  masterLogout(req);
  await pushPlatformToSupabase(undefined, { registryOnly: true });
  return Response.json({ ok: true });
}

async function handlePATCH(req: Request) {
  try {
    await pullPlatformFromSupabase();
    try { requireMaster(req); } catch { return Response.json({ error: 'Acesso exclusivo do administrador da plataforma.' }, { status: 403 }); }
    const body = await req.json();
    if (body.action === 'updateUsername') {
      const administrator = updateMasterUsername(req, body.cpf ?? body.username, body.currentPassword);
      await pushPlatformToSupabase(undefined, { registryOnly: true });
      return Response.json({ administrator });
    }
    changeMasterPassword(req, body.currentPassword, body.newPassword);
    await pushPlatformToSupabase(undefined, { registryOnly: true });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Não foi possível alterar a senha.' }, { status: 400 });
  }
}

export const POST = secureRoute(handlePOST);
export const DELETE = secureRoute(handleDELETE);
export const PATCH = secureRoute(handlePATCH);
