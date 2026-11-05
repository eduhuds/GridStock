import { NextResponse } from 'next/server';
import { stateForUser, getDb, getUserFromRequest, loadState, saveState } from '@/lib/db';
import { apply } from '@/lib/domain';
import { ensureSupabaseSynced, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const db = getDb();
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const body = await req.json();
    if (user.role === 'tech') {
      if (!user.technicianId || !['withdraw', 'return', 'use', 'count', 'arrival', 'finish', 'departure'].includes(body.kind)) {
        return NextResponse.json({ error: 'Apenas o Controle Operacional pode realizar esta operação.' }, { status: 403 });
      }
      body.technician = user.technicianId;
    }
    body.operator = user.name;
    const state = loadState(db);
    const movement = apply(state, body);
    saveState(db, state);
    await pushAllToSupabase(db);
    return NextResponse.json({ movement, state: stateForUser(state, user) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao registrar movimentação.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
