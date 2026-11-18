import { secureRoute } from '@/lib/apiSecurity';
import { platformOverview, revokeCompanySessions, resetCompanyData, deleteCompany, requireMaster, saveCompany } from '@/lib/companies';
import { deleteCompanyFromSupabase, pullPlatformFromSupabase, pushPlatformToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handleGET(req: Request) {
  try {
    await pullPlatformFromSupabase();
    requireMaster(req);
    const overview = platformOverview(req);
    return Response.json(overview);
  } catch {
    return Response.json({ error: 'Entre com sua conta de administrador geral.' }, { status: 403 });
  }
}

async function handlePOST(req: Request) {
  await pullPlatformFromSupabase();
  try {
    requireMaster(req);
  } catch {
    return Response.json({ error: 'Acesso restrito.' }, { status: 403 });
  }
  try {
    const company = saveCompany(await req.json());
    await pushPlatformToSupabase(company.id);
    return Response.json({ company, ...platformOverview(req) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Não foi possível salvar.' }, { status: 400 });
  }
}

async function handlePATCH(req: Request) {
  await pullPlatformFromSupabase();
  try {
    requireMaster(req);
  } catch {
    return Response.json({ error: 'Acesso restrito.' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const companyId = String(body.id || '');
    if (body.action === 'revokeSessions') {
      revokeCompanySessions(companyId);
      await pushPlatformToSupabase(companyId);
    } else if (body.action === 'resetCompany') {
      resetCompanyData(companyId);
      await pushPlatformToSupabase(companyId);
    } else if (body.action === 'deleteCompany') {
      deleteCompany(companyId);
      await deleteCompanyFromSupabase(companyId);
    } else {
      throw new Error('Ação inválida.');
    }
    return Response.json(platformOverview(req));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Falha na ação.' }, { status: 400 });
  }
}

export const GET = secureRoute(handleGET);
export const POST = secureRoute(handlePOST);
export const PATCH = secureRoute(handlePATCH);
