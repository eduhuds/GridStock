import { databaseForRequest } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, loadState, saveState } from '@/lib/db';
import { saveProduct } from '@/lib/domain';
import { ensureSupabaseSynced, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'ops') return NextResponse.json({ error: 'Acesso restrito ao Controle Operacional.' }, { status: 403 });

    const body = await req.json();
    body.operator = user.name;
    const state = loadState(db);
    const product = saveProduct(state, body);
    saveState(db, state);
    await pushAllToSupabase(db);
    return NextResponse.json({ product, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar produto.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
