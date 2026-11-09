/** Formatting and check digits do not prove ownership of a CPF. */
export function normalizeCpf(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!/^[\d.\-\s]+$/.test(text)) return '';
  return text.replace(/\D/g, '');
}
export function isValidCpf(value: unknown): boolean {
  const cpf = normalizeCpf(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let length = 9; length <= 10; length++) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const digit = (sum * 10) % 11 % 10;
    if (Number(cpf[length]) !== digit) return false;
  }
  return true;
}
export function requireCpf(value: unknown): string {
  if (!isValidCpf(value)) throw new Error('Informe um CPF válido com 11 dígitos.');
  return normalizeCpf(value);
}
export function maskCpf(value: unknown): string {
  const cpf = normalizeCpf(value);
  return isValidCpf(cpf) ? `***.${cpf.slice(3,6)}.${cpf.slice(6,9)}-**` : 'CPF pendente';
}
