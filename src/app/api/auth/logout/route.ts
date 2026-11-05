import { NextResponse } from 'next/server';
import { getDb, logoutRequest } from '@/lib/db';
import { pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const db = getDb();
  logoutRequest(req, db);
  await pushAllToSupabase(db);
  return NextResponse.json({ ok: true });
}
