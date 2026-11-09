import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { logoutRequest } from '@/lib/db';
import { pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

async function handlePOST(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    logoutRequest(req, db);
    await pushAllToSupabase(db);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Empresa indisponível ou sessão inválida.' }, { status: 401 }); }
}

export const POST = secureRoute(handlePOST);
