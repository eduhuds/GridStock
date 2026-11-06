import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getUserFromRequest, listUsers, loadState, saveState, syncTechnicianUser } from '@/lib/db';
import { saveTechnician } from '@/lib/domain';
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
    enforceCompanyAction(req, 'technicians', body);
    body.operator = user.name;
    const state = loadState(db);
    const technician = saveTechnician(state, body);
    if (body.username !== undefined) {
      syncTechnicianUser(technician, body.username, body.password, db);
    }
    saveState(db, state);
    await pushAllToSupabase(db);
    return NextResponse.json({ technician, state, users: listUsers(db) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar técnico.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
