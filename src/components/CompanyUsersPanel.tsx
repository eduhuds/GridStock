'use client';
import { useState } from 'react';
import type { UserAccount } from '@/lib/db';
import { defaultPermissions, permissionLabels, techPermissions, type Permission } from '@/lib/permissions';

type Props = {
  users: UserAccount[]; currentUser: UserAccount;
  technicians: {id:string;name:string}[]; fieldService: boolean;
  api: (method: string, path: string, body?: any) => Promise<any>;
  onSaved: (payload: any) => void;
};
export default function CompanyUsersPanel({users,currentUser,technicians,fieldService,api,onSaved}: Props) {
  const [editing,setEditing]=useState<UserAccount|null>(null);
  const [creating,setCreating]=useState(false);
  const [profile,setProfile]=useState('ops');
  const [permissions,setPermissions]=useState<Permission[]>(defaultPermissions('ops'));
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [removing,setRemoving]=useState<UserAccount|null>(null);
  const self=editing?.id===currentUser.id;
  function edit(user:UserAccount|null) {
    setEditing(user);setCreating(!user);setError('');setMessage('');
    setProfile(user?.companyAdmin?'admin':user?.role==='tech'?'tech':'ops');
    setPermissions(user?.permissions||defaultPermissions('ops'));
  }
  const fieldKeys:Permission[]=['team','technicians','withdraw','use','return','count','departure'];
  const options=(Object.keys(permissionLabels) as Permission[]).filter(p=> (profile!=='tech'||techPermissions.includes(p)) && (fieldService||!fieldKeys.includes(p)));
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    const data=Object.fromEntries(new FormData(event.currentTarget));
    try {
      const res=await api('POST','/api/users',{...data,...(editing?{id:editing.id}:{}),role:profile==='tech'?'tech':'ops',access:{companyAdmin:profile==='admin',permissions}});
      onSaved(res);setEditing(null);setCreating(false);setMessage('Acesso salvo. As novas permissões valem nas próximas operações.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}
  }
  if(!currentUser.companyAdmin)return <p role="status">Somente o administrador da empresa gerencia acessos.</p>;
  return <section className="access-manager">
    <div className="panel-head"><div><h2>Equipe e permissões</h2><p>Defina o que cada pessoa pode consultar e alterar nesta empresa.</p></div><button className="button" onClick={()=>edit(null)} disabled={busy}>Adicionar usuário</button></div>
    {message&&<p className="notice" role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}
    <div className="access-user-list">{users.map(u=><article key={u.id}><div><strong>{u.name}</strong><small>{u.companyAdmin?'Administrador da empresa':u.role==='tech'?'Técnico · somente o próprio estoque':'Operacional · permissões personalizadas'}{u.id===currentUser.id?' · Você':''}</small></div><button className="button secondary" disabled={busy} onClick={()=>edit(u)}>Editar acesso</button>{u.id!==currentUser.id&&<button className="text-link" disabled={busy} onClick={()=>{setRemoving(u);setError('');}}>Remover</button>}</article>)}</div>
    {removing&&<div className="access-confirm" role="alert"><p>Remover o acesso de <strong>{removing.name}</strong>? As sessões dessa pessoa serão encerradas.</p><button className="button secondary" disabled={busy} onClick={()=>setRemoving(null)}>Cancelar</button><button className="button danger" disabled={busy} onClick={async()=>{setBusy(true);try{onSaved(await api('DELETE',`/api/users/${encodeURIComponent(removing.id)}`));setRemoving(null);setMessage('Acesso removido.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Confirmar remoção</button></div>}
    {(editing||creating)&&<form key={editing?.id||'new'} onSubmit={save} className="access-form">
      <h3>{editing?'Editar acesso':'Novo acesso'}</h3>
      <div className="form-grid"><label className="field">Nome<input className="input" name="name" defaultValue={editing?.name} maxLength={80} required /></label><label className="field">CPF<input className="input" name="username" inputMode="numeric" maxLength={14} defaultValue={editing?.username} required /></label></div>
      <div className="form-grid"><label className="field">{editing?'Nova senha (opcional)':'Senha inicial'}<input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required={!editing}/></label><label className="field">Perfil<select value={profile} disabled={self||busy} onChange={e=>{const v=e.target.value;setProfile(v);setPermissions(v==='readonly'?['stock','history']:defaultPermissions(v==='tech'?'tech':'ops'));}}><option value="admin">Administrador da empresa</option><option value="ops">Operacional personalizado</option><option value="readonly">Somente consulta</option>{fieldService&&<option value="tech" disabled={!technicians.length}>Técnico</option>}</select></label></div>
      {profile==='tech'&&<label className="field">Técnico vinculado<select name="technicianId" defaultValue={editing?.technicianId||''} required disabled={self}><option value="">Selecione</option>{technicians.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
      {self&&<p className="small muted">Você pode editar seus dados. Suas próprias permissões são protegidas contra alteração.</p>}
      {profile==='admin'?<p className="access-note">Acesso completo à empresa, incluindo gerenciamento de usuários. Não concede acesso à administração da plataforma ou a outras empresas.</p>:<fieldset disabled={self||busy||profile==='readonly'}><legend>Permissões deste usuário</legend><p className="small muted">Ajustar saldo é independente de retirar, devolver ou registrar uso. Consultar um técnico não autoriza alterações.</p><div className="access-permissions">{options.map(p=><label key={p}><input type="checkbox" checked={permissions.includes(p)} onChange={e=>setPermissions(previous=>e.target.checked?[...previous,p]:previous.filter(k=>k!==p))}/><span>{permissionLabels[p]}</span></label>)}</div></fieldset>}
      <div className="access-actions"><button className="button secondary" type="button" disabled={busy} onClick={()=>{setEditing(null);setCreating(false);}}>Cancelar</button><button className="button" disabled={busy}>{busy?'Salvando…':'Salvar acesso'}</button></div>
    </form>}
  </section>;
}
