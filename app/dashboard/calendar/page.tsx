'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar as CalIcon } from 'lucide-react';
import { calendarApi } from '@/lib/api';
import { fmt } from '@/lib/utils';
import { Empty, TableSkeleton, Modal } from '@/components/ui';
import toast from 'react-hot-toast';

export default function CalendarPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [year, setYear]       = useState(new Date().getFullYear());
  const [month, setMonth]     = useState(new Date().getMonth()+1);

  const load = async () => {
    setLoading(true);
    try { const r = await calendarApi.getAll({year,month}); setEntries(r.data.data||[]); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };
  useEffect(() => {
  load();
}, [year, month]);

  const deleteEntry = async (id:string) => {
    try { await calendarApi.deleteEntry(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="page-header">
        <div><h1 className="page-title">Academic Calendar</h1><p className="page-sub">Manage holidays and working days</p></div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Entry</button>
      </div>
      <div className="card p-4 flex gap-3 items-end">
        <div><label className="form-label">Month</label><select value={month} onChange={e=>setMonth(Number(e.target.value))} className="form-select w-36">{['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
        <div><label className="form-label">Year</label><input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="form-input w-28"/></div>
        <button onClick={load} className="btn-secondary">Filter</button>
      </div>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Title</th><th>Type</th><th>Description</th><th></th></tr></thead>
          <tbody>
            {loading ? <TableSkeleton rows={6} cols={5}/> : entries.length===0 ? (
              <tr><td colSpan={5}><Empty icon={CalIcon} title="No entries for this month" action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Entry</button>}/></td></tr>
            ) : entries.map((e:any)=>(
              <tr key={e.id}>
                <td className="font-medium">{e.date?fmt.date(e.date):'—'}</td>
                <td className="font-medium text-sm">{e.title||e.name||'—'}</td>
                <td><span className={`badge ${e.type==='HOLIDAY'?'badge-red':e.type==='WORKING_DAY'?'badge-green':'badge-blue'}`}>{e.type||'—'}</span></td>
                <td className="text-sm text-slate-500 max-w-[200px] truncate">{e.description||'—'}</td>
                <td><button onClick={()=>deleteEntry(e.id)} className="btn-icon hover:text-danger-500"><Trash2 className="w-3.5 h-3.5"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <AddCalendarModal onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}}/>}
    </div>
  );
}

function AddCalendarModal({ onClose, onSuccess }:any) {
  const [form, setForm] = useState({date:'',title:'',type:'HOLIDAY',description:''});
  const [saving, setSaving] = useState(false);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if(form.type==='HOLIDAY') await calendarApi.addHoliday(form); else await calendarApi.addWorkingDay(form);
      toast.success('Added!'); onSuccess();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title="Add Calendar Entry" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Date *</label><input required type="date" value={form.date} onChange={e=>f('date',e.target.value)} className="form-input"/></div>
        <div><label className="form-label">Title *</label><input required value={form.title} onChange={e=>f('title',e.target.value)} className="form-input" placeholder="e.g. Diwali, Republic Day"/></div>
        <div><label className="form-label">Type</label><select value={form.type} onChange={e=>f('type',e.target.value)} className="form-select">{['HOLIDAY','WORKING_DAY','EVENT'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}</select></div>
        <div><label className="form-label">Description</label><input value={form.description} onChange={e=>f('description',e.target.value)} className="form-input" placeholder="Optional"/></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':'Add'}</button></div>
      </form>
    </Modal>
  );
}
