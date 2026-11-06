import { masterLogin, masterLogout, changeMasterPassword } from '@/lib/companies';
import { getDb } from '@/lib/db';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushPlatformToSupabase } from '@/lib/supabaseStore';

export async function POST(req: Request) {
  try {
    await ensureSupabaseSynced(getDb());
    const body = await req.json();
    const res = masterLogin(body.username, body.password);
    await pushPlatformToSupabase();
    return Response.json(res);
  } catch {
    return Response.json({ error: 'Credenciais inválidas ou sem permissão de administrador geral.' }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  await pullPlatformFromSupabase();
  masterLogout(req);
  await pushPlatformToSupabase();
  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const body = await req.json();
    changeMasterPassword(req, body.currentPassword, body.newPassword);
    await pushPlatformToSupabase();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Não foi possível alterar a senha.' }, { status: 400 });
  }
}
