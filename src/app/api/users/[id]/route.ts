import { NextResponse } from 'next/server';
import { deleteUser, getDb, getUserFromRequest, listUsers } from '@/lib/db';
import { ensureSupabaseSynced, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'ops') return NextResponse.json({ error: 'Acesso restrito ao Controle Operacional.' }, { status: 403 });

    const { id } = await context.params;
    deleteUser(decodeURIComponent(id), user.id, db);
    await pushAllToSupabase(db);
    return NextResponse.json({ users: listUsers(db) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao remover usuário.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
