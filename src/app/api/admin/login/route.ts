import { masterLogin, masterLogout, changeMasterPassword } from '@/lib/companies';
export async function POST(req: Request) {
  try { const body = await req.json(); return Response.json(masterLogin(body.username, body.password)); }
  catch { return Response.json({ error: 'Credenciais inválidas ou sem permissão de administrador geral.' }, { status: 401 }); }
}
export async function DELETE(req: Request) { masterLogout(req); return Response.json({ ok: true }); }
export async function PATCH(req: Request) {
  try { const body = await req.json(); changeMasterPassword(req, body.currentPassword, body.newPassword); return Response.json({ ok: true }); }
  catch (e) { return Response.json({ error: e instanceof Error ? e.message : 'Não foi possível alterar a senha.' }, { status: 400 }); }
}
