'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit, UserX, UserCheck, Key, Users } from 'lucide-react';
import { staffApi } from '@/lib/api';
import { ROLES, roleColor } from '@/lib/utils';
import { Modal, Empty, TableSkeleton, Pagination, SearchInput, Avatar, StatCard } from '@/components/ui';
import toast from 'react-hot-toast';

export default function StaffPage() {
  const [staff, setStaff]   = useState<any[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const LIMIT = 15;

  const load = useCallback(async()=>{
    setLoading(true);
    try { const r = await staffApi.getAll({page,limit:LIMIT,search:search||undefined,role:roleFilter||undefined}); const d=r.data.data; setStaff(d?.users||d||[]); setTotal(d?.total||0); }
    catch{ toast.error('Failed'); } finally{ setLoading(false); }
  },[page,search,roleFilter]);
  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (id:string, isActive:boolean) => {
    try { if(isActive) await staffApi.deactivate(id); else await staffApi.activate(id); toast.success(isActive?'Deactivated':'Activated'); load(); }
    catch{ toast.error('Failed'); }
  };

  const resetPassword = async (id:string) => {
    const pw = window.prompt('New password:'); if(!pw||pw.length<6) return pw!==null?toast.error('Min 6 chars'):undefined;
    try { await staffApi.resetPassword(id,{password:pw}); toast.success('Password reset!'); }
    catch{ toast.error('Failed'); }
  };

  const roleCounts = ROLES.map(r=>({ role:r, count:staff.filter((s:any)=>s.role===r).length }));

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div><h1 className="page-title">Staff & Users</h1><p className="page-sub">{total} staff members</p></div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Staff</button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={v=>{setSearch(v);setPage(1);}} placeholder="Search by name or email…"/>
        <select value={roleFilter} onChange={e=>{setRoleFilter(e.target.value);setPage(1);}} className="form-select w-40">
          <option value="">All Roles</option>
          {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Staff Member</th><th>Email</th><th>Role</th><th>Subject</th><th>Classes</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <TableSkeleton rows={8} cols={7}/> : staff.length===0 ? (
              <tr><td colSpan={7}><Empty icon={Users} title="No staff found" action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Staff</button>}/></td></tr>
            ) : staff.map((s:any)=>(
              <tr key={s.id}>
                <td><div className="flex items-center gap-2.5"><Avatar name={s.name} size="sm"/><div><p className="font-medium text-sm">{s.name}</p></div></div></td>
                <td className="text-sm text-slate-500">{s.email}</td>
                <td><span className={`badge ${roleColor(s.role)}`}>{s.role}</span></td>
                <td className="text-sm text-slate-500">{s.teacher?.subject||'—'}</td>
                <td className="text-sm text-slate-500">{s.teacher?.classTeacherOf?.name||'—'}</td>
                <td><span className={`badge ${s.isActive!==false?'badge-green':'badge-red'}`}>{s.isActive!==false?'Active':'Inactive'}</span></td>
                <td><div className="flex gap-1">
                  <button onClick={()=>setViewItem(s)} className="btn-icon" title="View"><Eye className="w-3.5 h-3.5"/></button>
                  <button onClick={()=>setEditItem(s)} className="btn-icon" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                  <button onClick={()=>resetPassword(s.id)} className="btn-icon" title="Reset Password"><Key className="w-3.5 h-3.5"/></button>
                  <button onClick={()=>toggleStatus(s.id,s.isActive!==false)} className={`btn-icon ${s.isActive!==false?'hover:text-red-500':'hover:text-green-500'}`} title={s.isActive!==false?'Deactivate':'Activate'}>{s.isActive!==false?<UserX className="w-3.5 h-3.5"/>:<UserCheck className="w-3.5 h-3.5"/>}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} limit={LIMIT} onChange={setPage}/>
      </div>

      {showAdd   && <StaffForm onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}}/>}
      {editItem  && <StaffForm staff={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null);load();}}/>}
      {viewItem  && <StaffDetail staff={viewItem} onClose={()=>setViewItem(null)}/>}
    </div>
  );
}

function StaffForm({ staff, onClose, onSuccess }:any) {
  const editing = !!staff;
  const [form, setForm] = useState({name:staff?.name||'',email:staff?.email||'',password:'',role:staff?.role||'TEACHER',phone:staff?.teacher?.phone||'',address:staff?.teacher?.address||'',qualification:staff?.teacher?.qualification||'',subject:staff?.teacher?.subject||'',employeeId:staff?.teacher?.employeeId||'',joiningDate:staff?.teacher?.joiningDate?staff.teacher.joiningDate.split('T')[0]:'',salary:staff?.teacher?.salary||''});
  const [saving, setSaving] = useState(false);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body:any = {name:form.name,email:form.email,role:form.role};
      if(!editing) body.password=form.password;
      if(['TEACHER','LIBRARIAN','ACCOUNTANT'].includes(form.role)) body.teacher={phone:form.phone||undefined,address:form.address||undefined,qualification:form.qualification||undefined,subject:form.subject||undefined,employeeId:form.employeeId||undefined,joiningDate:form.joiningDate||undefined,salary:form.salary?Number(form.salary):undefined};
      if(editing) await staffApi.update(staff.id,body); else await staffApi.create(body);
      toast.success(editing?'Updated!':'Staff added!'); onSuccess();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title={editing?`Edit — ${staff.name}`:'Add Staff Member'} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Full Name *</label><input required value={form.name} onChange={e=>f('name',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Email *</label><input required type="email" value={form.email} onChange={e=>f('email',e.target.value)} className="form-input"/></div>
          {!editing && <div><label className="form-label">Password *</label><input required type="password" value={form.password} onChange={e=>f('password',e.target.value)} className="form-input" placeholder="Min 6 chars"/></div>}
          <div><label className="form-label">Role *</label><select required value={form.role} onChange={e=>f('role',e.target.value)} className="form-select">{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
        </div>
        {['TEACHER','LIBRARIAN','ACCOUNTANT'].includes(form.role) && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Phone</label><input value={form.phone} onChange={e=>f('phone',e.target.value)} className="form-input"/></div>
            <div><label className="form-label">Employee ID</label><input value={form.employeeId} onChange={e=>f('employeeId',e.target.value)} className="form-input"/></div>
            <div><label className="form-label">Qualification</label><input value={form.qualification} onChange={e=>f('qualification',e.target.value)} className="form-input" placeholder="e.g. B.Ed, M.Sc"/></div>
            <div><label className="form-label">Subject</label><input value={form.subject} onChange={e=>f('subject',e.target.value)} className="form-input" placeholder="Main subject"/></div>
            <div><label className="form-label">Joining Date</label><input type="date" value={form.joiningDate} onChange={e=>f('joiningDate',e.target.value)} className="form-input"/></div>
            <div><label className="form-label">Salary (₹)</label><input type="number" value={form.salary} onChange={e=>f('salary',e.target.value)} className="form-input"/></div>
            <div className="col-span-2"><label className="form-label">Address</label><input value={form.address} onChange={e=>f('address',e.target.value)} className="form-input"/></div>
          </div>
        )}
        <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':editing?'Update':'Add Staff'}</button></div>
      </form>
    </Modal>
  );
}

function StaffDetail({ staff: s, onClose }:any) {
  return (
    <Modal title="Staff Profile" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl"><Avatar name={s.name} size="lg"/><div><h3 className="font-bold text-lg">{s.name}</h3><span className={`badge mt-1 ${roleColor(s.role)}`}>{s.role}</span></div></div>
        <div className="space-y-2 text-sm">
          {[['Email',s.email],['Phone',s.teacher?.phone||'—'],['Employee ID',s.teacher?.employeeId||'—'],['Qualification',s.teacher?.qualification||'—'],['Subject',s.teacher?.subject||'—'],['Salary',s.teacher?.salary?`₹${s.teacher.salary}`:'—'],['Status',s.isActive!==false?'Active':'Inactive']].map(([k,v])=>(
            <div key={k} className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-400">{k}</span><span className="font-medium text-slate-700">{v}</span></div>
          ))}
        </div>
        <button onClick={onClose} className="btn-secondary w-full justify-center">Close</button>
      </div>
    </Modal>
  );
}
