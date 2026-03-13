'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, MessageSquare, Eye, CheckCircle, Edit } from 'lucide-react';
import { complaintsApi, studentsApi } from '@/lib/api';
import { fmt, SEVERITY, severityColor } from '@/lib/utils';
import { Modal, Tabs, Empty, TableSkeleton, Pagination, SearchInput, StatCard } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ComplaintsPage() {
  const [tab, setTab] = useState('list');
  const [types, setTypes]   = useState<any[]>([]);
  const loadTypes = () => complaintsApi.getTypes().then(r=>setTypes(r.data.data||[])).catch(()=>{});
  useEffect(() => { loadTypes(); }, []);
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header"><div><h1 className="page-title">Complaints</h1><p className="page-sub">Manage student and parent complaints</p></div></div>
      <Tabs tabs={[{key:'list',label:'All Complaints'},{key:'types',label:'Complaint Types'}]} active={tab} onChange={setTab}/>
      {tab==='list'  && <ComplaintsList types={types}/>}
      {tab==='types' && <ComplaintTypes types={types} reload={loadTypes}/>}
    </div>
  );
}

function ComplaintsList({ types }:any) {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [selected, setSelected]     = useState<any>(null);
  const LIMIT = 15;

  const load = useCallback(async() => {
    setLoading(true);
    try {
      const r = await complaintsApi.getAll({page,limit:LIMIT,search:search||undefined,status:statusFilter||undefined});
      const d = r.data.data; setComplaints(Array.isArray(d)?d:d?.complaints||[]); setTotal(d?.total||0);
    } catch{ toast.error('Failed'); } finally{ setLoading(false); }
  },[page,search,statusFilter]);
  useEffect(() => { load(); }, [load]);

  const acknowledge = async (id:string) => {
    const remarks = window.prompt('Acknowledgement remarks (optional):');
    if(remarks===null) return;
    try { await complaintsApi.acknowledge(id,{remarks}); toast.success('Acknowledged'); load(); }
    catch{ toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <SearchInput value={search} onChange={v=>{setSearch(v);setPage(1);}} placeholder="Search complaints…"/>
          <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}} className="form-select w-36">
            <option value="">All Status</option>
            {['PENDING','ACKNOWLEDGED','RESOLVED'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Complaint</button>
      </div>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Student</th><th>Type</th><th>Subject</th><th>Severity</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <TableSkeleton rows={8} cols={7}/> : complaints.length===0 ? (
              <tr><td colSpan={7}><Empty icon={MessageSquare} title="No complaints"/></td></tr>
            ) : complaints.map((c:any)=>(
              <tr key={c.id}>
                <td><p className="font-medium text-sm">{c.student?.name||'—'}</p><p className="text-xs text-slate-400">{c.student?.admissionNumber}</p></td>
                <td className="text-sm">{c.complaintType?.name||'—'}</td>
                <td className="text-sm max-w-[160px] truncate">{c.subject||'—'}</td>
                <td>{c.severity?<span className={`badge ${severityColor(c.severity)}`}>{c.severity}</span>:'—'}</td>
                <td className="text-sm">{c.createdAt?fmt.date(c.createdAt):'—'}</td>
                <td><span className={`badge ${c.status==='RESOLVED'?'badge-green':c.status==='ACKNOWLEDGED'?'badge-blue':'badge-yellow'}`}>{c.status||'PENDING'}</span></td>
                <td><div className="flex gap-1">
                  <button onClick={()=>setSelected(c)} className="btn-icon" title="View"><Eye className="w-3.5 h-3.5"/></button>
                  {c.status==='PENDING' && <button onClick={()=>acknowledge(c.id)} className="btn-icon" title="Acknowledge"><CheckCircle className="w-3.5 h-3.5 text-green-500"/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} limit={LIMIT} onChange={setPage}/>
      </div>
      {showAdd   && <AddComplaintModal types={types} onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}}/>}
      {selected  && <ComplaintDetail complaint={selected} onClose={()=>setSelected(null)} onAcknowledge={()=>{setSelected(null);load();}}/>}
    </div>
  );
}

function ComplaintTypes({ types, reload }:any) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm]       = useState({name:'',description:''});
  const [saving, setSaving]   = useState(false);

  const addType = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await complaintsApi.createType(form); toast.success('Type created'); setForm({name:'',description:''}); setShowAdd(false); reload(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Type</button></div>
      {showAdd && (
        <form onSubmit={addType} className="card p-4 flex gap-3 items-end">
          <div className="flex-1"><label className="form-label">Type Name *</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="form-input" placeholder="e.g. Bullying, Facilities"/></div>
          <div className="flex-1"><label className="form-label">Description</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="form-input" placeholder="Optional"/></div>
          <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Create'}</button>
          <button type="button" onClick={()=>setShowAdd(false)} className="btn-secondary">Cancel</button>
        </form>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {types.map((t:any)=>(
          <div key={t.id} className="card p-4 group hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between">
              <p className="font-semibold text-slate-700">{t.name}</p>
              <button onClick={()=>setEditItem(t)} className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
            </div>
            {t.description&&<p className="text-xs text-slate-400 mt-1">{t.description}</p>}
          </div>
        ))}
        {types.length===0 && <div className="col-span-4"><Empty icon={MessageSquare} title="No complaint types"/></div>}
      </div>
      {editItem && <EditTypeModal type={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null);reload();}}/>}
    </div>
  );
}

function EditTypeModal({ type, onClose, onSuccess }:any) {
  const [form, setForm] = useState({name:type.name||'',description:type.description||''});
  const [saving, setSaving] = useState(false);
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await complaintsApi.updateType(type.id, form); toast.success('Updated!'); onSuccess(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title="Edit Complaint Type" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Name *</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="form-input"/></div>
        <div><label className="form-label">Description</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="form-input"/></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':'Update'}</button></div>
      </form>
    </Modal>
  );
}

function ComplaintDetail({ complaint: c, onClose, onAcknowledge }:any) {
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving]   = useState(false);
  const acknowledge = async () => {
    setSaving(true);
    try { await complaintsApi.acknowledge(c.id,{remarks}); toast.success('Acknowledged!'); onAcknowledge(); }
    catch{ toast.error('Failed'); } finally{ setSaving(false); }
  };
  const resolve = async () => {
    setSaving(true);
    try { await complaintsApi.resolve(c.id,{remarks}); toast.success('Resolved!'); onAcknowledge(); }
    catch{ toast.error('Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title="Complaint Details" onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div><p className="font-bold text-slate-800">{c.subject||'—'}</p><p className="text-sm text-slate-500 mt-0.5">{c.complaintType?.name}</p></div>
          <span className={`badge ${c.status==='RESOLVED'?'badge-green':c.status==='ACKNOWLEDGED'?'badge-blue':'badge-yellow'}`}>{c.status||'PENDING'}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="form-label inline-block">Student</span><p>{c.student?.name||'—'} ({c.student?.admissionNumber})</p></div>
          <div><span className="form-label inline-block">Severity</span><span className={`badge ${severityColor(c.severity||'LOW')}`}>{c.severity||'LOW'}</span></div>
          <div className="col-span-2"><span className="form-label inline-block">Filed On</span><p>{c.createdAt?fmt.date(c.createdAt):'—'}</p></div>
        </div>
        {c.description && <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600">{c.description}</div>}
        {c.adminRemarks && <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700"><p className="font-semibold mb-1">Admin Remarks</p>{c.adminRemarks}</div>}
        {c.status!=='RESOLVED' && (
          <div>
            <label className="form-label">Add Remarks</label>
            <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} className="form-input" rows={3} placeholder="Remarks for student/parent…"/>
            <div className="flex gap-3 mt-3">
              {c.status==='PENDING' && <button onClick={acknowledge} disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':'Acknowledge'}</button>}
              <button onClick={resolve} disabled={saving} className="btn-success flex-1 justify-center"><CheckCircle className="w-4 h-4"/>{saving?'Saving…':'Mark Resolved'}</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AddComplaintModal({ types, onClose, onSuccess }:any) {
  const [form, setForm] = useState({admissionNumber:'',complaintTypeId:'',subject:'',description:'',severity:'MEDIUM',isAnonymous:false});
  const [student, setStudent] = useState<any>(null);
  const [finding, setFinding] = useState(false);
  const [saving, setSaving]   = useState(false);
  const f=(k:string,v:any)=>setForm(p=>({...p,[k]:v}));

  const findStudent = async () => {
    if(!form.admissionNumber) return;
    setFinding(true);
    try { const r = await studentsApi.lookup(form.admissionNumber); setStudent(r.data.data); }
    catch{ toast.error('Not found'); setStudent(null); } finally{ setFinding(false); }
  };

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); if(!student) return toast.error('Find student'); setSaving(true);
    try {
      const fd = new FormData();
      fd.append('studentId',student.id); fd.append('complaintTypeId',form.complaintTypeId);
      fd.append('subject',form.subject); fd.append('description',form.description);
      fd.append('severity',form.severity); fd.append('isAnonymous',String(form.isAnonymous));
      await complaintsApi.create(fd); toast.success('Complaint filed!'); onSuccess();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };

  return (
    <Modal title="File Complaint" onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Admission Number</label>
          <div className="flex gap-2"><input value={form.admissionNumber} onChange={e=>f('admissionNumber',e.target.value)} className="form-input flex-1"/><button type="button" onClick={findStudent} className="btn-secondary">{finding?'…':'Find'}</button></div>
          {student && <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{student.name} · {student.class?.name}</div>}
        </div>
        <div><label className="form-label">Complaint Type *</label><select required value={form.complaintTypeId} onChange={e=>f('complaintTypeId',e.target.value)} className="form-select"><option value="">Select type</option>{types.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className="form-label">Subject *</label><input required value={form.subject} onChange={e=>f('subject',e.target.value)} className="form-input" placeholder="Brief subject"/></div>
        <div><label className="form-label">Description</label><textarea value={form.description} onChange={e=>f('description',e.target.value)} className="form-input" rows={3} placeholder="Detailed description…"/></div>
        <div><label className="form-label">Severity</label><select value={form.severity} onChange={e=>f('severity',e.target.value)} className="form-select">{SEVERITY.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isAnonymous} onChange={e=>f('isAnonymous',e.target.checked)} className="rounded"/><span className="text-sm text-slate-600">File anonymously</span></label>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving||!student} className="btn-primary flex-1 justify-center">{saving?'Submitting…':'Submit Complaint'}</button></div>
      </form>
    </Modal>
  );
}
