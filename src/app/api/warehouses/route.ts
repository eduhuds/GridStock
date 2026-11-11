import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, loadState, saveState, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
import { saveWarehouse } from '@/lib/domain';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handlePOST(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'ops') return NextResponse.json({ error: 'Acesso restrito ao Controle Operacional.' }, { status: 403 });

    const body = await req.json();
    enforceCompanyAction(req, 'warehouses', body);
    const isEdit = Boolean(body.id);
    const state = loadState(db);
    const warehouse = saveWarehouse(state, body);
    saveState(db, state);
    recordCompanyAudit(db, {
      actorName: user.name,
      actorUsername: user.username,
      actorRole: user.role,
      category: 'warehouse',
      action: isEdit ? 'Estoque editado' : 'Estoque cadastrado',
      target: `${warehouse.name} (${warehouse.code})`,
      detail: `Cidade: ${warehouse.city} · Responsável: ${warehouse.responsible}`,
    });
    await pushAllToSupabase(db);
    return NextResponse.json({ warehouse, state, audit: listCompanyAudit(db, state) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar estoque.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const POST = secureRoute(handlePOST);
