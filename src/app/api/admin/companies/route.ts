import { platformOverview, revokeCompanySessions, requireMaster, saveCompany } from '@/lib/companies';
import { pullPlatformFromSupabase, pushPlatformToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await pullPlatformFromSupabase();
    requireMaster(req);
    return Response.json(platformOverview());
  } catch {
    return Response.json({ error: 'Entre com sua conta de administrador geral.' }, { status: 403 });
  }
}

export async function POST(req: Request) {
  await pullPlatformFromSupabase();
  try {
    requireMaster(req);
  } catch {
    return Response.json({ error: 'Acesso restrito.' }, { status: 403 });
  }
  try {
    const company = saveCompany(await req.json());
    await pushPlatformToSupabase(company.id);
    return Response.json({ company, ...platformOverview() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Não foi possível salvar.' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  await pullPlatformFromSupabase();
  try {
    requireMaster(req);
  } catch {
    return Response.json({ error: 'Acesso restrito.' }, { status: 403 });
  }
  try {
    const body = await req.json();
    if (body.action !== 'revokeSessions') throw new Error('Ação inválida.');
    revokeCompanySessions(String(body.id));
    await pushPlatformToSupabase(String(body.id));
    return Response.json(platformOverview());
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Falha na ação.' }, { status: 400 });
  }
}
