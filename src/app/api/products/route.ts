import { refreshAccessPolicy } from '@/lib/accessPolicySync';
import { can } from '@/lib/permissions';
import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { stateForUser, getUserFromRequest, loadState, saveState, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
import { saveProduct } from '@/lib/domain';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handlePOST(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    await refreshAccessPolicy(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (!can(user, 'products')) return NextResponse.json({ error: 'Seu acesso não permite esta ação. Solicite autorização ao administrador.' }, { status: 403 });

    const body = await req.json();
    if (!body.id && Number(body.qty)>0 && !can(user,'entry')) return NextResponse.json({error:'Saldo inicial exige permissão de entrada de estoque.'},{status:403});
    const isEdit = Boolean(body.id);
    body.operator = user.name;
    const state = loadState(db);
    const product = saveProduct(state, body);
    saveState(db, state);
    recordCompanyAudit(db, {
      actorName: user.name,
      actorUsername: user.username,
      actorRole: user.role,
      category: 'product',
      action: isEdit ? 'Produto editado' : 'Produto cadastrado',
      target: `${product.sku} · ${product.name}`,
      detail: `Categoria: ${product.category} · Mínimo base: ${product.baseMin}${!isEdit && body.qty ? ` · Saldo inicial: ${body.qty} un.` : ''}`,
    });
    await pushAllToSupabase(db);
    return NextResponse.json({ product, state: stateForUser(state, user), audit: can(user,'audit') ? listCompanyAudit(db, state) : [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar produto.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const POST = secureRoute(handlePOST);
