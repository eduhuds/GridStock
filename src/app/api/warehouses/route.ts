import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, loadState, saveState } from '@/lib/db';
import { saveWarehouse } from '@/lib/domain';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'ops') return NextResponse.json({ error: 'Acesso restrito ao Controle Operacional.' }, { status: 403 });

    const body = await req.json();
    enforceCompanyAction(req, 'warehouses', body);
    const state = loadState(db);
    const warehouse = saveWarehouse(state, body);
    saveState(db, state);
    await pushAllToSupabase(db);
    return NextResponse.json({ warehouse, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar estoque.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
