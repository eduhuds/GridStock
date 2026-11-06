import { databaseForRequest } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { logoutRequest } from '@/lib/db';
import { pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const db = databaseForRequest(req);
    logoutRequest(req, db);
    await pushAllToSupabase(db);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Empresa indisponível ou sessão inválida.' }, { status: 401 }); }
}
