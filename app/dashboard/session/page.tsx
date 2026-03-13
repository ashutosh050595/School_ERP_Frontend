'use client';
import { useState, useEffect } from 'react';
import { Plus, BookOpen, CheckCircle, ArrowRight, Settings, Edit } from 'lucide-react';
import { sessionApi } from '@/lib/api';
import { fmt } from '@/lib/utils';
import { Modal, Tabs, Empty, TableSkeleton } from '@/components/ui';
import toast from 'react-hot-toast';

export default function SessionPage() {
  const [tab, setTab] = useState('years');
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="page-header"><div><h1 className="page-title">Session & Years</h1><p className="page-sub">Manage academic years and session configuration</p></div></div>
      <Tabs tabs={[{key:'years',label:'Academic Years'},{key:'config',label:'Session Config'},{key:'promotion',label:'Student Promotion'}]} active={tab} onChange={setTab}/>
      {tab==='years'     && <AcademicYears/>}
      {tab==='config'    && <SessionConfig/>}
      {tab==='promotion' && <StudentPromotion/>}
    </div>
  );
}

function AcademicYears() {
  const [years, setYears]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const load = () => { setLoading(true); sessionApi.getYears().then(r=>setYears(r.data.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>load(),[]);

  const setCurrent = async (id:string) => {
    try { await sessionApi.setCurrentYear(id); toast.success('Current year updated!'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Academic Year</button></div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-16 card animate-pulse"/>)}</div>
      : years.length===0 ? <Empty icon={BookOpen} title="No academic years" action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Year</button>}/>
      : (
        <div className="space-y-3">
          {years.map((y:any)=>(
            <div key={y.id} className={`card p-4 flex items-center gap-4 ${y.isCurrent?'border-primary-300 bg-primary-50/30':''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2"><p className="font-bold text-slate-800">{y.name}</p>{y.isCurrent&&<span className="badge badge-green">Current</span>}</div>
                <p className="text-sm text-slate-500 mt-0.5">{y.startDate?fmt.date(y.startDate):''} – {y.endDate?fmt.date(y.endDate):''}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setEditItem(y)} className="btn-icon" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                {!y.isCurrent && <button onClick={()=>setCurrent(y.id)} className="btn-secondary text-xs py-1.5"><CheckCircle className="w-3.5 h-3.5"/>Set Current</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd  && <YearModal onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}}/>}
      {editItem && <YearModal year={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null);load();}}/>}
    </div>
  );
}

function SessionConfig() {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(()=>{ sessionApi.getConfig().then(r=>setConfig(r.data.data||{})).catch(()=>{}).finally(()=>setLoading(false)); },[]);

  const save = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await sessionApi.saveConfig(config); toast.success('Config saved!'); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };

  if(loading) return <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>;

  const f=(k:string,v:any)=>setConfig((p:any)=>({...p,[k]:v}));
  return (
    <form onSubmit={save} className="card p-6 space-y-5 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">School Name</label><input value={config.schoolName||''} onChange={e=>f('schoolName',e.target.value)} className="form-input"/></div>
        <div><label className="form-label">CBSE Affiliation No.</label><input value={config.cbseAffiliationNo||''} onChange={e=>f('cbseAffiliationNo',e.target.value)} className="form-input"/></div>
        <div><label className="form-label">Working Days/Week</label><input type="number" value={config.workingDaysPerWeek||6} onChange={e=>f('workingDaysPerWeek',Number(e.target.value))} className="form-input"/></div>
        <div><label className="form-label">Min Attendance %</label><input type="number" value={config.minAttendancePercent||75} onChange={e=>f('minAttendancePercent',Number(e.target.value))} className="form-input"/></div>
        <div><label className="form-label">Passing Marks %</label><input type="number" value={config.passingMarksPercent||33} onChange={e=>f('passingMarksPercent',Number(e.target.value))} className="form-input"/></div>
        <div><label className="form-label">Late Fine (₹/day)</label><input type="number" value={config.lateFinePerDay||0} onChange={e=>f('lateFinePerDay',Number(e.target.value))} className="form-input"/></div>
      </div>
      <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Configuration'}</button>
    </form>
  );
}

function StudentPromotion() {
  const [years, setYears]       = useState<any[]>([]);
  const [fromYear, setFromYear] = useState('');
  const [preview, setPreview]   = useState<any>(null);
  const [draft, setDraft]       = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rolling, setRolling]   = useState(false);

  useEffect(()=>{ sessionApi.getYears().then(r=>setYears(r.data.data||[])).catch(()=>{}); },[]);

  const loadPreview = async () => {
    if(!fromYear) return toast.error('Select year');
    setLoading(true); setDraft(null);
    try { const r = await sessionApi.previewPromotion(fromYear); setPreview(r.data.data); }
    catch{ toast.error('Failed'); } finally{ setLoading(false); }
  };

  const createDraft = async () => {
    setLoading(true);
    try { const r = await sessionApi.draftPromotion({fromYearId:fromYear}); setDraft(r.data.data); toast.success('Draft created'); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setLoading(false); }
  };

  const confirm = async () => {
    if(!window.confirm('This will promote all eligible students. Are you sure?')) return;
    setConfirming(true);
    try { await sessionApi.confirmPromotion({fromYearId:fromYear, draftId:draft?.id}); toast.success('Students promoted!'); setPreview(null); setDraft(null); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setConfirming(false); }
  };

  const rollback = async () => {
    if(!draft?.id) return toast.error('No draft to rollback');
    if(!window.confirm('Rollback will undo the draft promotion. Continue?')) return;
    setRolling(true);
    try { await sessionApi.rollbackPromotion({draftId:draft.id}); toast.success('Rolled back!'); setDraft(null); setPreview(null); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setRolling(false); }
  };

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4 max-w-lg">
        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <Settings className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"/>
          <p className="text-sm text-yellow-700">Student promotion moves all eligible students to the next class. Use Draft → Review → Confirm workflow for safety.</p>
        </div>
        <div><label className="form-label">From Academic Year</label><select value={fromYear} onChange={e=>setFromYear(e.target.value)} className="form-select"><option value="">Select year</option>{years.map((y:any)=><option key={y.id} value={y.id}>{y.name}</option>)}</select></div>
        <button onClick={loadPreview} disabled={!fromYear||loading} className="btn-primary w-full justify-center">{loading?'Loading…':'Preview Promotion'}</button>
      </div>

      {preview && !draft && (
        <div className="card p-5 space-y-4 max-w-lg">
          <h3 className="font-bold text-slate-800">Promotion Preview</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-xl"><p className="text-2xl font-bold text-blue-600">{preview.totalStudents||0}</p><p className="text-xs text-slate-500">Total</p></div>
            <div className="p-3 bg-green-50 rounded-xl"><p className="text-2xl font-bold text-green-600">{preview.eligible||0}</p><p className="text-xs text-slate-500">Eligible</p></div>
            <div className="p-3 bg-red-50 rounded-xl"><p className="text-2xl font-bold text-red-600">{preview.notEligible||0}</p><p className="text-xs text-slate-500">Not Eligible</p></div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>{setPreview(null);}} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={createDraft} disabled={loading} className="btn-primary flex-1 justify-center">{loading?'Creating…':'Create Draft'}</button>
          </div>
        </div>
      )}

      {draft && (
        <div className="card p-5 space-y-4 max-w-lg border-2 border-yellow-300">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"/><h3 className="font-bold text-slate-800">Draft Ready — ID: <span className="font-mono text-sm">{draft.id}</span></h3></div>
          <p className="text-sm text-slate-500">Review the draft and confirm to finalize, or rollback to cancel.</p>
          <div className="flex gap-3">
            <button onClick={rollback} disabled={rolling} className="btn-danger flex-1 justify-center">{rolling?'Rolling back…':'Rollback Draft'}</button>
            <button onClick={confirm} disabled={confirming} className="btn-success flex-1 justify-center"><ArrowRight className="w-4 h-4"/>{confirming?'Promoting…':'Confirm Promotion'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function YearModal({ year, onClose, onSuccess }:any) {
  const editing = !!year;
  const [form, setForm] = useState({name:year?.name||'',startDate:year?.startDate?year.startDate.split('T')[0]:'',endDate:year?.endDate?year.endDate.split('T')[0]:'',isCurrent:year?.isCurrent||false});
  const [saving, setSaving] = useState(false);
  const f=(k:string,v:any)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if(editing) await sessionApi.updateYear(year.id, form);
      else await sessionApi.createYear(form);
      toast.success(editing?'Year updated!':'Year created!'); onSuccess();
    }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title={editing?'Edit Academic Year':'Add Academic Year'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Year Name *</label><input required value={form.name} onChange={e=>f('name',e.target.value)} className="form-input" placeholder="e.g. 2025-2026"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Start Date</label><input type="date" value={form.startDate} onChange={e=>f('startDate',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">End Date</label><input type="date" value={form.endDate} onChange={e=>f('endDate',e.target.value)} className="form-input"/></div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isCurrent} onChange={e=>f('isCurrent',e.target.checked)} className="rounded"/><span className="text-sm text-slate-600">Set as current year</span></label>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':editing?'Update':'Create'}</button></div>
      </form>
    </Modal>
  );
}
