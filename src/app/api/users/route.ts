import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { getDb, getUserFromRequest, listUsers, saveUser } from '@/lib/db';
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
    enforceCompanyAction(req, 'users', body);
    if (db === getDb() && body.id === (process.env.GRIDSTOCK_MASTER_USER_ID || 'u-admin') && (user.id !== body.id || body.role === 'tech')) return NextResponse.json({ error: 'A conta do administrador geral é protegida.' }, { status: 403 });
    const saved = saveUser(body, db);
    await pushAllToSupabase(db);
    return NextResponse.json({ user: saved, users: listUsers(db) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar usuário.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
