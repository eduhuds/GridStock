import type { DatabaseSync } from 'node:sqlite';
import { defaultPermissions, parsePolicy, type AccessPolicy } from './permissions';
export const ACCESS_KEY = 'company_access_v1';
type Row = {id:string; role:'ops'|'tech'};
export function policies(db: DatabaseSync): Record<string, AccessPolicy> {
  const saved = db.prepare('SELECT value FROM app_meta WHERE key=?').get(ACCESS_KEY) as {value:string}|undefined;
  if (saved) return JSON.parse(saved.value);
  // Only the original operational account becomes administrator on first upgrade.
  const rows = db.prepare('SELECT id,role FROM users ORDER BY created_at,id').all() as Row[];
  const owner = rows.find(r=>r.role==='ops')?.id;
  return Object.fromEntries(rows.map(r=>[r.id,{companyAdmin:r.id===owner, permissions:defaultPermissions(r.role)}]));
}
export function policyFor(db:DatabaseSync, row:Row):AccessPolicy {
  const policy = policies(db)[row.id];
  return policy ? parsePolicy(policy,row.role) : {companyAdmin:false,permissions:[]};
}
export function writePolicies(db:DatabaseSync, value:Record<string,AccessPolicy>) {
  db.prepare('INSERT OR REPLACE INTO app_meta(key,value) VALUES (?,?)').run(ACCESS_KEY,JSON.stringify(value));
}
export function protectLastAdmin(db:DatabaseSync,id:string,nextAdmin:boolean) {
  const map=policies(db);
  if(map[id]?.companyAdmin && !nextAdmin && !Object.entries(map).some(([key,p])=>key!==id && p.companyAdmin && db.prepare("SELECT id FROM users WHERE id=? AND role='ops'").get(key))) throw new Error('Mantenha pelo menos um administrador da empresa.');
}
