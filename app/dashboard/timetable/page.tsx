'use client';
import { useState, useEffect } from 'react';
import { Plus, Clock, Trash2 } from 'lucide-react';
import { timetableApi, studentsApi, staffApi } from '@/lib/api';
import { DAYS } from '@/lib/utils';
import { Modal, Tabs, Empty, TableSkeleton } from '@/components/ui';
import toast from 'react-hot-toast';

export default function TimetablePage() {
  const [tab, setTab] = useState('view');
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header"><div><h1 className="page-title">Timetable</h1><p className="page-sub">Manage class schedules and periods</p></div></div>
      <Tabs tabs={[{key:'view',label:'View Timetable'},{key:'periods',label:'Manage Periods'},{key:'bulk',label:'Bulk Import'}]} active={tab} onChange={setTab}/>
      {tab==='view'    && <TimetableView/>}
      {tab==='periods' && <PeriodsManager/>}
      {tab==='bulk'    && <BulkSlots/>}
    </div>
  );
}

function TimetableView() {
  const [classes, setClasses]   = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [periods, setPeriods]   = useState<any[]>([]);
  const [slots, setSlots]       = useState<any[]>([]);
  const [filters, setFilters]   = useState({classId:'',sectionId:''});
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [staff, setStaff]       = useState<any[]>([]);

  useEffect(()=>{ studentsApi.getClasses().then(r=>setClasses(r.data.data||[])).catch(()=>{}); timetableApi.getPeriods().then(r=>setPeriods(r.data.data||[])).catch(()=>{}); staffApi.getAll({limit:100}).then(r=>setStaff(r.data.data?.users||r.data.data||[])).catch(()=>{}); },[]);
  useEffect(()=>{ if(filters.classId) studentsApi.getSections(filters.classId).then(r=>setSections(r.data.data||[])).catch(()=>{}); },[filters.classId]);

  const loadSlots = async () => {
    if(!filters.classId) return toast.error('Select class');
    setLoading(true);
    try { const r = await timetableApi.getSlots({classId:filters.classId,sectionId:filters.sectionId||undefined}); setSlots(r.data.data||[]); }
    catch{ toast.error('Failed'); } finally{ setLoading(false); }
  };

  const deleteSlot = async (id:string) => {
    try { await timetableApi.deleteSlot(id); toast.success('Removed'); loadSlots(); }
    catch{ toast.error('Failed'); }
  };

  // Build grid: days x periods
  const grid: Record<string,Record<string,any>> = {};
  DAYS.forEach(d=>{ grid[d]={}; periods.forEach(p=>{ grid[d][p.id]=null; }); });
  slots.forEach(s=>{ if(grid[s.day]&&s.periodId) grid[s.day][s.periodId]=s; });

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className="form-label">Class</label><select value={filters.classId} onChange={e=>setFilters(p=>({...p,classId:e.target.value,sectionId:''}))} className="form-select w-36"><option value="">Select</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="form-label">Section</label><select value={filters.sectionId} onChange={e=>setFilters(p=>({...p,sectionId:e.target.value}))} className="form-select w-28" disabled={!sections.length}><option value="">All</option>{sections.map((s:any)=><option key={s.id} value={s.id}>{s.section}</option>)}</select></div>
        <button onClick={loadSlots} className="btn-primary">View</button>
        {slots.length>0 && <button onClick={()=>setShowAdd(true)} className="btn-secondary ml-auto"><Plus className="w-4 h-4"/>Add Slot</button>}
      </div>

      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}

      {!loading && slots.length===0 && filters.classId && <div className="card p-8 text-center"><Empty icon={Clock} title="No timetable set" sub="Add slots to create timetable" action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Slot</button>}/></div>}

      {!loading && periods.length>0 && slots.length>0 && (
        <div className="card overflow-auto">
          <table className="tbl">
            <thead><tr><th>Day</th>{periods.map((p:any)=><th key={p.id}>{p.name}<br/><span className="text-xs font-normal text-slate-400">{p.startTime}–{p.endTime}</span></th>)}</tr></thead>
            <tbody>{DAYS.map(day=>(
              <tr key={day}>
                <td className="font-semibold text-slate-700 bg-slate-50 w-24">{day.charAt(0)+day.slice(1).toLowerCase()}</td>
                {periods.map((p:any)=>{
                  const s = grid[day]?.[p.id];
                  return (
                    <td key={p.id} className="p-2 min-w-[120px]">
                      {s ? (
                        <div className="bg-primary-50 border border-primary-100 rounded-lg p-2 relative group">
                          <p className="text-xs font-semibold text-primary-700">{s.subject}</p>
                          <p className="text-xs text-slate-500">{s.teacher?.name||'—'}</p>
                          <button onClick={()=>deleteSlot(s.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 btn-icon w-5 h-5 hover:text-danger-500"><Trash2 className="w-3 h-3"/></button>
                        </div>
                      ) : <div className="h-12 rounded-lg border border-dashed border-slate-200"/>}
                    </td>
                  );
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {showAdd && <AddSlotModal periods={periods} staff={staff} classId={filters.classId} sectionId={filters.sectionId} onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);loadSlots();}}/>}
    </div>
  );
}

function PeriodsManager() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({name:'',startTime:'',endTime:'',isBreak:false});
  const [saving, setSaving]   = useState(false);
  const load = () => { setLoading(true); timetableApi.getPeriods().then(r=>setPeriods(r.data.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>load(),[]);
  const addPeriod = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await timetableApi.createPeriod(form); toast.success('Period created'); setForm({name:'',startTime:'',endTime:'',isBreak:false}); setShowAdd(false); load(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  const deletePeriod = async (id:string) => {
    try { await timetableApi.deletePeriod(id); toast.success('Deleted'); load(); }
    catch{ toast.error('Failed'); }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Period</button></div>
      {showAdd && (
        <form onSubmit={addPeriod} className="card p-4 flex flex-wrap gap-3 items-end">
          <div><label className="form-label">Period Name *</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="form-input" placeholder="e.g. Period 1"/></div>
          <div><label className="form-label">Start Time</label><input type="time" value={form.startTime} onChange={e=>setForm(p=>({...p,startTime:e.target.value}))} className="form-input"/></div>
          <div><label className="form-label">End Time</label><input type="time" value={form.endTime} onChange={e=>setForm(p=>({...p,endTime:e.target.value}))} className="form-input"/></div>
          <label className="flex items-center gap-2 cursor-pointer mb-0.5"><input type="checkbox" checked={form.isBreak} onChange={e=>setForm(p=>({...p,isBreak:e.target.checked}))} className="rounded"/><span className="text-sm text-slate-600">Break/Recess</span></label>
          <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Create'}</button>
          <button type="button" onClick={()=>setShowAdd(false)} className="btn-secondary">Cancel</button>
        </form>
      )}
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>#</th><th>Name</th><th>Start</th><th>End</th><th>Type</th><th></th></tr></thead>
          <tbody>
            {loading ? <TableSkeleton rows={5} cols={6}/> : periods.length===0 ? (
              <tr><td colSpan={6}><Empty icon={Clock} title="No periods" sub="Add periods to build timetable"/></td></tr>
            ) : periods.map((p:any,i:number)=>(
              <tr key={p.id}>
                <td className="text-slate-400">{i+1}</td>
                <td className="font-medium">{p.name}</td>
                <td className="text-sm">{p.startTime||'—'}</td>
                <td className="text-sm">{p.endTime||'—'}</td>
                <td>{p.isBreak?<span className="badge badge-yellow">Break</span>:<span className="badge badge-blue">Class</span>}</td>
                <td><button onClick={()=>deletePeriod(p.id)} className="btn-icon hover:text-danger-500"><Trash2 className="w-3.5 h-3.5"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddSlotModal({ periods, staff, classId, sectionId, onClose, onSuccess }:any) {
  const [form, setForm] = useState({day:'MONDAY',periodId:'',subject:'',teacherId:'',room:''});
  const [saving, setSaving] = useState(false);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await timetableApi.createSlot({...form,classId,sectionId:sectionId||undefined,teacherId:form.teacherId||undefined,room:form.room||undefined}); toast.success('Slot added!'); onSuccess(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title="Add Timetable Slot" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Day</label><select value={form.day} onChange={e=>f('day',e.target.value)} className="form-select">{DAYS.map(d=><option key={d} value={d}>{d.charAt(0)+d.slice(1).toLowerCase()}</option>)}</select></div>
        <div><label className="form-label">Period</label><select required value={form.periodId} onChange={e=>f('periodId',e.target.value)} className="form-select"><option value="">Select</option>{periods.map((p:any)=><option key={p.id} value={p.id}>{p.name} ({p.startTime}–{p.endTime})</option>)}</select></div>
        <div><label className="form-label">Subject *</label><input required value={form.subject} onChange={e=>f('subject',e.target.value)} className="form-input" placeholder="Subject name"/></div>
        <div><label className="form-label">Teacher</label><select value={form.teacherId} onChange={e=>f('teacherId',e.target.value)} className="form-select"><option value="">Select</option>{staff.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="form-label">Room</label><input value={form.room} onChange={e=>f('room',e.target.value)} className="form-input" placeholder="e.g. Room 101"/></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':'Add Slot'}</button></div>
      </form>
    </Modal>
  );
}

function BulkSlots() {
  const [classes, setClasses]   = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [periods, setPeriods]   = useState<any[]>([]);
  const [staff, setStaff]       = useState<any[]>([]);
  const [classId, setClassId]   = useState('');
  const [sectionId, setSectionId] = useState('');
  const [rows, setRows] = useState<any[]>([{day:'MONDAY',periodId:'',subject:'',teacherId:'',room:''}]);
  const [saving, setSaving]     = useState(false);

  useEffect(()=>{ studentsApi.getClasses().then(r=>setClasses(r.data.data||[])).catch(()=>{}); timetableApi.getPeriods().then(r=>setPeriods(r.data.data||[])).catch(()=>{}); staffApi.getAll({limit:100}).then(r=>setStaff(r.data.data?.users||r.data.data||[])).catch(()=>{}); },[]);
  useEffect(()=>{ if(classId) studentsApi.getSections(classId).then(r=>setSections(r.data.data||[])).catch(()=>{}); },[classId]);

  const updateRow = (i:number, k:string, v:string) => setRows(p=>p.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const addRow    = () => setRows(p=>[...p,{day:'MONDAY',periodId:'',subject:'',teacherId:'',room:''}]);
  const removeRow = (i:number) => setRows(p=>p.filter((_,idx)=>idx!==i));

  const submit = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!classId) return toast.error('Select a class');
    const valid = rows.filter(r=>r.periodId&&r.subject);
    if(!valid.length) return toast.error('Add at least one complete slot');
    setSaving(true);
    try {
      await timetableApi.bulkCreateSlots({ classId, sectionId:sectionId||undefined, slots: valid.map(r=>({...r,teacherId:r.teacherId||undefined,room:r.room||undefined})) });
      toast.success(`${valid.length} slots created!`);
      setRows([{day:'MONDAY',periodId:'',subject:'',teacherId:'',room:''}]);
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className="form-label">Class *</label><select value={classId} onChange={e=>{setClassId(e.target.value);setSectionId('');}} className="form-select w-36"><option value="">Select</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="form-label">Section</label><select value={sectionId} onChange={e=>setSectionId(e.target.value)} className="form-select w-28" disabled={!sections.length}><option value="">All</option>{sections.map((s:any)=><option key={s.id} value={s.id}>{s.section}</option>)}</select></div>
      </div>
      <form onSubmit={submit} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Day</th><th>Period</th><th>Subject *</th><th>Teacher</th><th>Room</th><th></th></tr></thead>
            <tbody>
              {rows.map((row,i)=>(
                <tr key={i}>
                  <td className="p-1.5"><select value={row.day} onChange={e=>updateRow(i,'day',e.target.value)} className="form-select text-xs">{DAYS.map(d=><option key={d} value={d}>{d.charAt(0)+d.slice(1).toLowerCase()}</option>)}</select></td>
                  <td className="p-1.5"><select value={row.periodId} onChange={e=>updateRow(i,'periodId',e.target.value)} className="form-select text-xs w-36"><option value="">Select</option>{periods.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                  <td className="p-1.5"><input value={row.subject} onChange={e=>updateRow(i,'subject',e.target.value)} className="form-input text-xs" placeholder="Subject"/></td>
                  <td className="p-1.5"><select value={row.teacherId} onChange={e=>updateRow(i,'teacherId',e.target.value)} className="form-select text-xs w-36"><option value="">Select</option>{staff.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></td>
                  <td className="p-1.5"><input value={row.room} onChange={e=>updateRow(i,'room',e.target.value)} className="form-input text-xs w-24" placeholder="Room"/></td>
                  <td className="p-1.5"><button type="button" onClick={()=>removeRow(i)} className="btn-icon hover:text-danger-500" disabled={rows.length===1}><Trash2 className="w-3.5 h-3.5"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 p-3 border-t border-slate-100">
          <button type="button" onClick={addRow} className="btn-ghost text-xs"><Plus className="w-3.5 h-3.5"/>Add Row</button>
          <button type="submit" disabled={saving||!classId} className="btn-primary ml-auto">{saving?'Creating…':'Create All Slots'}</button>
        </div>
      </form>
    </div>
  );
}
