'use client';
import { useState, useEffect, useCallback } from 'react';
import { Save, Search, UserCheck, UserX, Clock, BarChart2, Download } from 'lucide-react';
import { attendanceApi, studentsApi } from '@/lib/api';
import { fmt, statusColor } from '@/lib/utils';
import { StatCard, Tabs, Empty, Avatar, TableSkeleton, SearchInput } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

type Status = 'PRESENT'|'ABSENT'|'LATE'|'HALF_DAY';

export default function AttendancePage() {
  const [tab, setTab] = useState('mark');
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div><h1 className="page-title">Attendance</h1><p className="page-sub">Mark & review student attendance</p></div>
      </div>
      <Tabs tabs={[{key:'mark',label:'Mark Attendance'},{key:'report',label:'Report'},{key:'summary',label:'Summary'},{key:'student',label:'Student History'}]} active={tab} onChange={setTab}/>
      {tab==='mark'    && <MarkAttendance/>}
      {tab==='report'  && <AttendanceReport/>}
      {tab==='summary' && <AttendanceSummary/>}
      {tab==='student' && <StudentAttendance/>}
    </div>
  );
}

function MarkAttendance() {
  const [classes, setClasses]   = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords]   = useState<Record<string,{status:Status;remark:string}>>({});
  const [filters, setFilters]   = useState({ classId:'', sectionId:'', date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loaded, setLoaded]     = useState(false);

  useEffect(()=>{ studentsApi.getClasses().then(r=>setClasses(r.data.data||[])).catch(()=>{}); },[]);
  useEffect(()=>{
    if(filters.classId) studentsApi.getSections(filters.classId).then(r=>setSections(r.data.data||[])).catch(()=>{});
    else setSections([]);
  },[filters.classId]);

  const loadStudents = async () => {
    if (!filters.classId) return toast.error('Select a class');
    setLoading(true); setLoaded(false);
    try {
      const [sr, ar] = await Promise.all([
        studentsApi.getAll({ classId:filters.classId, sectionId:filters.sectionId||undefined, limit:200 }),
        attendanceApi.getByDate({ classId:filters.classId, sectionId:filters.sectionId||undefined, date:filters.date }),
      ]);
      const studs: any[] = sr.data.data?.students||[];
      const existing: any[] = ar.data.data||[];
      setStudents(studs);
      const map: Record<string,any> = {};
      studs.forEach(s=>{
        const found = existing.find((a:any)=>a.studentId===s.id);
        map[s.id] = found ? {status:found.status,remark:found.remark||''} : {status:'PRESENT',remark:''};
      });
      setRecords(map); setLoaded(true);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const markAll = (status:Status) => {
    const m:Record<string,any>={};
    students.forEach(s=>{m[s.id]={status,remark:records[s.id]?.remark||''};});
    setRecords(m);
  };

  const toggle = (id:string) => setRecords(p=>({...p,[id]:{...p[id],status:p[id]?.status==='PRESENT'?'ABSENT':'PRESENT'}}));
  const setStatus = (id:string,status:Status) => setRecords(p=>({...p,[id]:{...p[id],status}}));

  const save = async () => {
    setSaving(true);
    try {
      await attendanceApi.mark({ date:filters.date, classId:filters.classId, sectionId:filters.sectionId||undefined,
        records: students.map(s=>({studentId:s.id,...records[s.id]})) });
      toast.success('Attendance saved!');
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };

  const present = Object.values(records).filter(r=>r.status==='PRESENT').length;
  const absent  = Object.values(records).filter(r=>r.status==='ABSENT').length;
  const late    = Object.values(records).filter(r=>r.status==='LATE').length;

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className="form-label">Date</label><input type="date" value={filters.date} onChange={e=>setFilters(p=>({...p,date:e.target.value}))} className="form-input"/></div>
        <div><label className="form-label">Class</label><select value={filters.classId} onChange={e=>setFilters(p=>({...p,classId:e.target.value,sectionId:''}))} className="form-select w-36"><option value="">Select</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="form-label">Section</label><select value={filters.sectionId} onChange={e=>setFilters(p=>({...p,sectionId:e.target.value}))} className="form-select w-32" disabled={!sections.length}><option value="">All</option>{sections.map((s:any)=><option key={s.id} value={s.id}>{s.section}</option>)}</select></div>
        <button onClick={loadStudents} className="btn-primary" disabled={!filters.classId}><Search className="w-4 h-4"/>Load</button>
        {loaded && <button onClick={save} disabled={saving} className="btn-success ml-auto"><Save className="w-4 h-4"/>{saving?'Saving…':'Save Attendance'}</button>}
      </div>

      {loaded && students.length>0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={UserCheck} iconBg="bg-green-50" color="text-green-600" label="Present" value={present} sub={`of ${students.length}`}/>
            <StatCard icon={UserX} iconBg="bg-red-50" color="text-red-600" label="Absent" value={absent}/>
            <StatCard icon={Clock} iconBg="bg-yellow-50" color="text-yellow-600" label="Late" value={late}/>
          </div>
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <p className="font-semibold text-slate-700">{students.length} Students — {fmt.date(filters.date)}</p>
              <div className="flex gap-2">
                <button onClick={()=>markAll('PRESENT')} className="btn-success text-xs py-1.5"><UserCheck className="w-3.5 h-3.5"/>All Present</button>
                <button onClick={()=>markAll('ABSENT')} className="btn-danger text-xs py-1.5"><UserX className="w-3.5 h-3.5"/>All Absent</button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {students.map((s:any,i:number)=>{
                const st = records[s.id]?.status||'PRESENT';
                return (
                  <div key={s.id} className={`flex items-center gap-4 px-4 py-3 ${st==='ABSENT'?'bg-red-50/50':''}`}>
                    <span className="text-xs text-slate-400 w-6 text-right">{i+1}</span>
                    <Avatar name={s.name} size="sm"/>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{s.name}</p><p className="text-xs text-slate-400">{s.admissionNumber}{s.rollNumber?` · Roll ${s.rollNumber}`:''}</p></div>
                    <div className="flex gap-1.5">
                      {(['PRESENT','ABSENT','LATE','HALF_DAY'] as Status[]).map(status=>(
                        <button key={status} onClick={()=>setStatus(s.id,status)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${st===status
                            ? status==='PRESENT'?'bg-green-600 text-white':status==='ABSENT'?'bg-red-500 text-white':status==='LATE'?'bg-yellow-500 text-white':'bg-blue-500 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          {status.replace('_',' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      {!loaded && !loading && <div className="card p-12 text-center text-slate-400">Select class and date, then click Load</div>}
      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}
    </div>
  );
}

function AttendanceReport() {
  const [classes, setClasses]   = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [report, setReport]     = useState<any[]>([]);
  const [filters, setFilters]   = useState({ classId:'', sectionId:'', from:'', to:'' });
  const [loading, setLoading]   = useState(false);
  const f = (k:string,v:string) => setFilters(p=>({...p,[k]:v}));

  useEffect(()=>{ studentsApi.getClasses().then(r=>setClasses(r.data.data||[])).catch(()=>{}); },[]);
  useEffect(()=>{
    if(filters.classId) studentsApi.getSections(filters.classId).then(r=>setSections(r.data.data||[])).catch(()=>{});
  },[filters.classId]);

  const load = async () => {
    if(!filters.classId||!filters.from||!filters.to) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const r = await attendanceApi.getReport({classId:filters.classId,sectionId:filters.sectionId||undefined,from:filters.from,to:filters.to});
      setReport(r.data.data||[]);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className="form-label">From</label><input type="date" value={filters.from} onChange={e=>f('from',e.target.value)} className="form-input"/></div>
        <div><label className="form-label">To</label><input type="date" value={filters.to} onChange={e=>f('to',e.target.value)} className="form-input"/></div>
        <div><label className="form-label">Class</label><select value={filters.classId} onChange={e=>f('classId',e.target.value)} className="form-select w-36"><option value="">Select</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="form-label">Section</label><select value={filters.sectionId} onChange={e=>f('sectionId',e.target.value)} className="form-select w-28" disabled={!sections.length}><option value="">All</option>{sections.map((s:any)=><option key={s.id} value={s.id}>{s.section}</option>)}</select></div>
        <button onClick={load} className="btn-primary"><BarChart2 className="w-4 h-4"/>Generate</button>
      </div>
      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}
      {!loading && report.length>0 && (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Student</th><th>Present</th><th>Absent</th><th>Late</th><th>Total Days</th><th>%</th></tr></thead>
            <tbody>
              {report.map((r:any)=>{
                const pct = r.totalDays>0?Math.round(r.present/r.totalDays*100):0;
                return (
                  <tr key={r.studentId}>
                    <td><div className="flex items-center gap-2"><Avatar name={r.name} size="sm"/><div><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-slate-400">{r.admissionNumber}</p></div></div></td>
                    <td><span className="badge badge-green">{r.present}</span></td>
                    <td><span className="badge badge-red">{r.absent}</span></td>
                    <td><span className="badge badge-yellow">{r.late||0}</span></td>
                    <td>{r.totalDays}</td>
                    <td><div className="flex items-center gap-2"><div className="flex-1 bg-slate-200 rounded-full h-1.5 w-16"><div className={`h-1.5 rounded-full ${pct>=75?'bg-green-500':pct>=60?'bg-yellow-500':'bg-red-500'}`} style={{width:`${pct}%`}}/></div><span className="text-xs font-semibold">{pct}%</span></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && report.length===0 && <div className="card p-12 text-center text-slate-400">Select filters and click Generate</div>}
    </div>
  );
}

function StudentAttendance() {
  const [admNo, setAdmNo]   = useState('');
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if(!admNo) return toast.error('Enter admission number');
    setLoading(true);
    try {
      const r = await attendanceApi.getStudent(admNo, { from:from||undefined, to:to||undefined });
      const d = r.data.data;
      setRecords(Array.isArray(d) ? d : d?.records || []);
      setSummary(Array.isArray(d) ? null : d?.summary || null);
    } catch { toast.error('Student not found or no records'); }
    finally { setLoading(false); }
  };

  const present = records.filter(r=>r.status==='PRESENT').length;
  const absent  = records.filter(r=>r.status==='ABSENT').length;
  const late    = records.filter(r=>r.status==='LATE').length;
  const pct     = records.length > 0 ? Math.round(present / records.length * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className="form-label">Admission Number</label><input value={admNo} onChange={e=>setAdmNo(e.target.value)} className="form-input" placeholder="e.g. 2025001"/></div>
        <div><label className="form-label">From (optional)</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="form-input"/></div>
        <div><label className="form-label">To (optional)</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="form-input"/></div>
        <button onClick={load} className="btn-primary" disabled={!admNo}><Search className="w-4 h-4"/>View History</button>
      </div>

      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}

      {!loading && records.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={UserCheck} iconBg="bg-green-50" color="text-green-600" label="Present" value={present}/>
            <StatCard icon={UserX} iconBg="bg-red-50" color="text-red-600" label="Absent" value={absent}/>
            <StatCard icon={Clock} iconBg="bg-yellow-50" color="text-yellow-600" label="Late" value={late}/>
            <StatCard icon={BarChart2} iconBg="bg-blue-50" color="text-blue-600" label="Attendance %" value={`${pct}%`}/>
          </div>
          <div className="card overflow-hidden">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Status</th><th>Remark</th></tr></thead>
              <tbody>
                {records.map((r:any, i:number) => (
                  <tr key={i}>
                    <td className="font-medium">{r.date ? fmt.date(r.date) : '—'}</td>
                    <td><span className={`badge ${r.status==='PRESENT'?'badge-green':r.status==='ABSENT'?'badge-red':r.status==='LATE'?'badge-yellow':'badge-blue'}`}>{r.status}</span></td>
                    <td className="text-sm text-slate-500">{r.remark||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!loading && records.length === 0 && admNo && <div className="card p-12 text-center text-slate-400">No records found. Enter admission number and click View History.</div>}
      {!loading && !admNo && <div className="card p-12 text-center text-slate-400">Enter a student admission number to view their attendance history.</div>}
    </div>
  );
}
  const [summary, setSummary] = useState<any>(null);
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await attendanceApi.getSummary({date}); setSummary(r.data.data); }
    catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const chartData = summary?.byClass?.map((c:any)=>({name:c.className,present:c.present,absent:c.absent})) || [];

  return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-3 items-end">
        <div><label className="form-label">Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="form-input"/></div>
        <button onClick={load} className="btn-primary">Load Summary</button>
      </div>
      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}
      {summary && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={UserCheck} iconBg="bg-green-50" color="text-green-600" label="Present" value={summary.totalPresent||0}/>
            <StatCard icon={UserX} iconBg="bg-red-50" color="text-red-600" label="Absent" value={summary.totalAbsent||0}/>
            <StatCard icon={BarChart2} iconBg="bg-blue-50" color="text-blue-600" label="Attendance %" value={`${summary.percentage||0}%`}/>
          </div>
          {chartData.length>0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-700 mb-4">Class-wise Attendance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Bar dataKey="present" fill="#22c55e" name="Present" radius={[3,3,0,0]}/><Bar dataKey="absent" fill="#f87171" name="Absent" radius={[3,3,0,0]}/></BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
