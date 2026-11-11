import { secureRoute } from '@/lib/apiSecurity';
import { databaseForRequest, enforceCompanyAction } from '@/lib/companies';
import { NextResponse } from 'next/server';
import { stateForUser, getUserFromRequest, loadState, saveState, recordCompanyAudit, listCompanyAudit } from '@/lib/db';
import { apply } from '@/lib/domain';
import { ensureSupabaseSynced, pullPlatformFromSupabase, pushAllToSupabase } from '@/lib/supabaseStore';

export const dynamic = 'force-dynamic';

const kindActionLabel: Record<string, string> = {
  entry: 'Entrada de estoque',
  stockout: 'Saída de estoque',
  transfer: 'Transferência entre estoques',
  withdraw: 'Retirada para técnico',
  return: 'Devolução ao estoque',
  use: 'Aplicação / Uso em OS',
  count: 'Ajuste de contagem',
  departure: 'Declaração de saída do dia',
  arrival: 'Chegada no cliente',
  finish: 'Conclusão de atendimento',
};

async function handlePOST(req: Request) {
  try {
    await pullPlatformFromSupabase();
    const db = databaseForRequest(req);
    await ensureSupabaseSynced(db);
    const user = getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const body = await req.json();
    enforceCompanyAction(req, 'movements', body);
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
    const part = state.parts.find(p => p.id === movement.part);
    const wh = state.warehouses.find(w => w.id === (movement.warehouse || movement.from));
    const toWh = movement.to ? state.warehouses.find(w => w.id === movement.to) : null;
    const tech = state.technicians.find(t => t.id === movement.technician);
    const detailItems: string[] = [];
    if (movement.qty !== undefined && movement.qty !== null) detailItems.push(`Qtd: ${movement.qty} un.`);
    if (wh) detailItems.push(`Estoque: ${wh.name}${toWh ? ` → ${toWh.name}` : ''}`);
    if (tech) detailItems.push(`Técnico: ${tech.name}`);
    if (movement.order) detailItems.push(`OS: ${movement.order}`);
    if (movement.serial) detailItems.push(`Série/MAC: ${movement.serial}`);
    if (movement.note) detailItems.push(movement.note);
    recordCompanyAudit(db, {
      actorName: user.name,
      actorUsername: user.username,
      actorRole: user.role,
      category: 'movement',
      action: kindActionLabel[movement.kind] || `Movimentação (${movement.kind})`,
      target: part ? `${part.sku} · ${part.name}` : tech ? tech.name : wh ? wh.name : movement.id,
      detail: detailItems.join(' · '),
    });
    await pushAllToSupabase(db);
    return NextResponse.json({
      movement,
      state: stateForUser(state, user),
      audit: user.role === 'ops' ? listCompanyAudit(db, state) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao registrar movimentação.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const POST = secureRoute(handlePOST);
