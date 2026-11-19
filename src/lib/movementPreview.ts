import type { MovementKind } from './domain';

export function movementPreview(kind: MovementKind, qty: number, base: number, personal: number) {
  const allowsZero = kind === 'count' || kind === 'departure';
  let error = '';
  if (!Number.isSafeInteger(qty) || qty < (allowsZero ? 0 : 1)) {
    error = allowsZero ? 'Informe uma quantidade inteira igual ou maior que zero.' : 'Informe uma quantidade inteira maior que zero.';
  } else if (['withdraw', 'stockout'].includes(kind) && qty > base) {
    error = base === 0 ? 'Esta peça está sem saldo no estoque selecionado.' : `A base possui apenas ${base} unidades disponíveis.`;
  } else if (['return', 'use', 'departure'].includes(kind) && qty > personal) {
    error = personal === 0
      ? `Você não tem esta peça para ${kind === 'return' ? 'devolver' : kind === 'use' ? 'utilizar' : 'levar hoje'}. Selecione outra peça ou registre uma retirada.`
      : `O técnico possui apenas ${personal} unidades disponíveis.`;
  }
  const baseAfter = kind === 'entry' || kind === 'return' ? base + qty : kind === 'withdraw' || kind === 'stockout' ? base - qty : base;
  const personalAfter = kind === 'withdraw' ? personal + qty : kind === 'use' || kind === 'return' ? personal - qty : kind === 'count' ? qty : personal;
  if (!error && (!Number.isSafeInteger(baseAfter) || !Number.isSafeInteger(personalAfter))) error = 'A quantidade ultrapassa o limite permitido.';
  return { error, baseAfter, personalAfter };
}
