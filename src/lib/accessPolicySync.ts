import type { DatabaseSync } from 'node:sqlite';
import { companyIdForDatabase } from './companies';
import { policies, writePolicies } from './accessPolicy';
import { getSupabaseAdminClient } from './supabaseStore';
import type { AccessPolicy } from './permissions';
// Separate from inventory snapshots: a stale inventory writer cannot restore revoked grants.
const PREFIX = '__access_policy__:';
const versions = new WeakMap<DatabaseSync, string | null>();
export async function refreshAccessPolicy(db: DatabaseSync) {
  const client = getSupabaseAdminClient();
  if (!client) return;
  const key = PREFIX + (companyIdForDatabase(db) || 'root');
  const {data,error} = await client.from('app_meta').select('value').eq('key',key).maybeSingle();
  if (error) throw new Error('Não foi possível verificar suas permissões. Tente novamente.');
  const value = data ? String(data.value) : null;
  if (value !== null) {
    const parsed = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Configuração de acesso inválida.');
    writePolicies(db,parsed as Record<string,AccessPolicy>);
  }
  versions.set(db,value);
}
export async function persistAccessPolicy(db: DatabaseSync) {
  const client = getSupabaseAdminClient();
  if (!client) return;
  if (!versions.has(db)) throw new Error('Atualize a tela antes de alterar permissões.');
  const key = PREFIX + (companyIdForDatabase(db) || 'root');
  const expected = versions.get(db)!;
  const value = JSON.stringify(policies(db));
  if (value === expected) return;
  if (expected === null) {
    const {error} = await client.from('app_meta').insert({key,value});
    if (error) throw new Error('Não foi possível salvar os acessos. Atualize a tela e tente novamente.');
  } else {
    const {data,error} = await client.from('app_meta').update({value}).eq('key',key).eq('value',expected).select('key');
    if (error || !data?.length) throw new Error('Os acessos mudaram em outra sessão ou não puderam ser salvos. Atualize a tela e tente novamente.');
  }
  versions.set(db,value);
}
