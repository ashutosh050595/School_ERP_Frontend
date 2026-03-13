'use client';
import { useState, useEffect } from 'react';
import { Plus, Award, ChevronRight, Trash2, Edit, BookOpen } from 'lucide-react';
import { examsApi, studentsApi } from '@/lib/api';
import { fmt } from '@/lib/utils';
import { Modal, Tabs, Empty, TableSkeleton, Confirm } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ExamsPage() {
  const [tab, setTab] = useState('terms');
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header"><div><h1 className="page-title">Exams & Marks</h1><p className="page-sub">Manage exam terms, subjects and student marks</p></div></div>
      <Tabs tabs={[{key:'terms',label:'Exam Terms'},{key:'marks',label:'Enter Marks'},{key:'results',label:'Results'}]} active={tab} onChange={setTab}/>
      {tab==='terms'   && <ExamTerms/>}
      {tab==='marks'   && <MarksEntry/>}
      {tab==='results' && <ExamResults/>}
    </div>
  );
}

function ExamTerms() {
  const [terms, setTerms]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);
  const load = () => { setLoading(true); examsApi.getTerms().then(r=>setTerms(r.data.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>load(),[]);

  const deleteTerm = async () => {
    if(!deleteId) return; setDeleting(true);
    try { await examsApi.deleteTerm(deleteId); toast.success('Term deleted'); setDeleteId(null); load(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Cannot delete term with marks'); }
    finally{ setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Exam Term</button></div>
      {loading ? <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="h-36 card animate-pulse"/>)}</div>
      : terms.length===0 ? <Empty icon={Award} title="No exam terms yet" action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Create First Term</button>}/>
      : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {terms.map(t=>(
            <div key={t.id} className="card p-5 hover:shadow-card-hover transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center cursor-pointer" onClick={()=>setSelected(t)}><Award className="w-5 h-5 text-primary-600"/></div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={()=>setEditItem(t)} className="btn-icon" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                  <button onClick={()=>setDeleteId(t.id)} className="btn-icon hover:text-danger-500" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 cursor-pointer" onClick={()=>setSelected(t)}>{t.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{t.academicYear?.name||'Current year'}</p>
              <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                {t.startDate && <span>{fmt.date(t.startDate)}</span>}
                {t.endDate && <><span>→</span><span>{fmt.date(t.endDate)}</span></>}
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd  && <TermModal onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}}/>}
      {editItem && <TermModal term={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null);load();}}/>}
      {selected && <TermDetail term={selected} onClose={()=>setSelected(null)}/>}
      {deleteId && <Confirm title="Delete Exam Term" message="This will permanently delete the exam term and all associated subjects and marks." onConfirm={deleteTerm} onCancel={()=>setDeleteId(null)} loading={deleting}/>}
    </div>
  );
}

function TermDetail({ term, onClose }:any) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({name:'',code:'',maxMarks:'100',passingMarks:'33',theoryMax:'',practicalMax:''});
  const [saving, setSaving]     = useState(false);
  const load = () => examsApi.getSubjects(term.id).then(r=>setSubjects(r.data.data||[])).catch(()=>{}).finally(()=>setLoading(false));
  useEffect(()=>load(),[term.id]);
  const addSubject = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await examsApi.createSubject(term.id,{...form,maxMarks:Number(form.maxMarks),passingMarks:Number(form.passingMarks),theoryMax:form.theoryMax?Number(form.theoryMax):undefined,practicalMax:form.practicalMax?Number(form.practicalMax):undefined});
      toast.success('Subject added'); setForm({name:'',code:'',maxMarks:'100',passingMarks:'33',theoryMax:'',practicalMax:''}); setShowAdd(false); load();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };
  const deleteSubject = async (id:string) => {
    try { await examsApi.deleteSubject(id); toast.success('Deleted'); load(); }
    catch{ toast.error('Failed'); }
  };
  return (
    <Modal title={term.name} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{subjects.length} subjects</p>
          <button onClick={()=>setShowAdd(!showAdd)} className="btn-primary text-xs py-1.5"><Plus className="w-3.5 h-3.5"/>Add Subject</button>
        </div>
        {showAdd && (
          <form onSubmit={addSubject} className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="form-label">Subject Name *</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="form-input" placeholder="e.g. Mathematics"/></div>
              <div><label className="form-label">Code</label><input value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} className="form-input" placeholder="MATH"/></div>
              <div><label className="form-label">Max Marks</label><input type="number" value={form.maxMarks} onChange={e=>setForm(p=>({...p,maxMarks:e.target.value}))} className="form-input"/></div>
              <div><label className="form-label">Passing Marks</label><input type="number" value={form.passingMarks} onChange={e=>setForm(p=>({...p,passingMarks:e.target.value}))} className="form-input"/></div>
              <div><label className="form-label">Theory Max</label><input type="number" value={form.theoryMax} onChange={e=>setForm(p=>({...p,theoryMax:e.target.value}))} className="form-input" placeholder="Optional"/></div>
              <div><label className="form-label">Practical Max</label><input type="number" value={form.practicalMax} onChange={e=>setForm(p=>({...p,practicalMax:e.target.value}))} className="form-input" placeholder="Optional"/></div>
            </div>
            <div className="flex gap-2"><button type="submit" disabled={saving} className="btn-primary text-xs py-1.5">{saving?'Saving…':'Add'}</button><button type="button" onClick={()=>setShowAdd(false)} className="btn-secondary text-xs py-1.5">Cancel</button></div>
          </form>
        )}
        {loading ? <TableSkeleton rows={4} cols={4}/> : subjects.length===0 ? <p className="text-center py-8 text-slate-400 text-sm">No subjects yet</p> : (
          <table className="tbl">
            <thead><tr><th>Subject</th><th>Code</th><th>Max Marks</th><th>Pass Marks</th><th></th></tr></thead>
            <tbody>{subjects.map((s:any)=>(
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td><span className="badge badge-gray">{s.code||'—'}</span></td>
                <td>{s.maxMarks}</td>
                <td>{s.passingMarks}</td>
                <td><button onClick={()=>deleteSubject(s.id)} className="btn-icon hover:text-danger-500"><Trash2 className="w-3.5 h-3.5"/></button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}

function MarksEntry() {
  const [terms, setTerms]     = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks]       = useState<Record<string,Record<string,string>>>({});
  const [filters, setFilters]   = useState({termId:'',classId:'',sectionId:'',subjectId:''});
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const f = (k:string,v:string) => setFilters(p=>({...p,[k]:v}));

  useEffect(()=>{ examsApi.getTerms().then(r=>setTerms(r.data.data||[])).catch(()=>{}); studentsApi.getClasses().then(r=>setClasses(r.data.data||[])).catch(()=>{}); },[]);
  useEffect(()=>{ if(filters.termId) examsApi.getSubjects(filters.termId).then(r=>setSubjects(r.data.data||[])).catch(()=>{}); },[filters.termId]);
  useEffect(()=>{ if(filters.classId) studentsApi.getSections(filters.classId).then(r=>setSections(r.data.data||[])).catch(()=>{}); },[filters.classId]);

  const loadStudents = async () => {
    if(!filters.classId||!filters.termId) return toast.error('Select class and term');
    setLoading(true);
    try {
      const r = await studentsApi.getAll({classId:filters.classId,sectionId:filters.sectionId||undefined,limit:200});
      const studs = r.data.data?.students||[]; setStudents(studs);
      const m:Record<string,Record<string,string>>={};
      studs.forEach((s:any)=>{ m[s.id]={}; subjects.forEach((sub:any)=>{ m[s.id][sub.id]=''; }); });
      setMarks(m);
    } catch{ toast.error('Failed'); }
    finally{ setLoading(false); }
  };

  const saveMarks = async () => {
    setSaving(true);
    try {
      const entries:any[] = [];
      Object.entries(marks).forEach(([studentId,subs])=>{ Object.entries(subs).forEach(([subjectId,marksObtained])=>{ if(marksObtained!=='') entries.push({studentId,subjectId,marksObtained:Number(marksObtained),termId:filters.termId}); }); });
      await examsApi.enterMarks({entries});
      toast.success('Marks saved!');
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className="form-label">Exam Term</label><select value={filters.termId} onChange={e=>f('termId',e.target.value)} className="form-select w-40"><option value="">Select</option>{terms.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className="form-label">Class</label><select value={filters.classId} onChange={e=>f('classId',e.target.value)} className="form-select w-32"><option value="">Select</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="form-label">Section</label><select value={filters.sectionId} onChange={e=>f('sectionId',e.target.value)} className="form-select w-28" disabled={!sections.length}><option value="">All</option>{sections.map((s:any)=><option key={s.id} value={s.id}>{s.section}</option>)}</select></div>
        <button onClick={loadStudents} className="btn-primary" disabled={!filters.classId||!filters.termId}>Load Students</button>
        {students.length>0 && subjects.length>0 && <button onClick={saveMarks} disabled={saving} className="btn-success ml-auto">{saving?'Saving…':'Save All Marks'}</button>}
      </div>
      {students.length>0 && subjects.length>0 && (
        <div className="card overflow-auto">
          <table className="tbl">
            <thead><tr><th>Student</th>{subjects.map((s:any)=><th key={s.id}>{s.name}<br/><span className="text-xs font-normal text-slate-400">/{s.maxMarks}</span></th>)}</tr></thead>
            <tbody>{students.map((s:any)=>(
              <tr key={s.id}>
                <td><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-slate-400">{s.admissionNumber}</p></td>
                {subjects.map((sub:any)=>(
                  <td key={sub.id} className="p-2">
                    <input type="number" min={0} max={sub.maxMarks} value={marks[s.id]?.[sub.id]||''} onChange={e=>setMarks(p=>({...p,[s.id]:{...p[s.id],[sub.id]:e.target.value}}))}
                      className="form-input w-20 text-center py-1.5 text-sm" placeholder="—"/>
                  </td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}
      {!loading && students.length===0 && <div className="card p-12 text-center text-slate-400 text-sm">Select exam term, class and load students to enter marks</div>}
    </div>
  );
}

function ExamResults() {
  const [terms, setTerms]     = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [filters, setFilters] = useState({termId:'',classId:''});
  const [loading, setLoading] = useState(false);
  const f = (k:string,v:string) => setFilters(p=>({...p,[k]:v}));
  useEffect(()=>{ examsApi.getTerms().then(r=>setTerms(r.data.data||[])).catch(()=>{}); studentsApi.getClasses().then(r=>setClasses(r.data.data||[])).catch(()=>{}); },[]);
  const load = async () => {
    if(!filters.termId||!filters.classId) return toast.error('Select term and class');
    setLoading(true);
    try { const r = await examsApi.getResults(filters); setResults(r.data.data||[]); }
    catch{ toast.error('Failed'); }
    finally{ setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-3 items-end">
        <div><label className="form-label">Exam Term</label><select value={filters.termId} onChange={e=>f('termId',e.target.value)} className="form-select w-40"><option value="">Select</option>{terms.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className="form-label">Class</label><select value={filters.classId} onChange={e=>f('classId',e.target.value)} className="form-select w-36"><option value="">Select</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <button onClick={load} className="btn-primary">Get Results</button>
      </div>
      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}
      {!loading && results.length>0 && (
        <div className="card overflow-auto">
          <table className="tbl">
            <thead><tr><th>Rank</th><th>Student</th><th>Total Marks</th><th>Percentage</th><th>Grade</th><th>Result</th></tr></thead>
            <tbody>{results.map((r:any,i:number)=>(
              <tr key={i}>
                <td><span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i===0?'bg-yellow-100 text-yellow-700':i===1?'bg-slate-100 text-slate-600':i===2?'bg-orange-100 text-orange-700':'text-slate-500'}`}>{i+1}</span></td>
                <td><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-slate-400">{r.admissionNumber}</p></td>
                <td className="font-semibold">{r.totalMarks||'—'}/{r.maxMarks||'—'}</td>
                <td><span className={`font-bold ${(r.percentage||0)>=75?'text-green-600':(r.percentage||0)>=50?'text-yellow-600':'text-red-500'}`}>{r.percentage||0}%</span></td>
                <td><span className="badge badge-blue">{r.grade||'—'}</span></td>
                <td><span className={`badge ${r.passed?'badge-green':'badge-red'}`}>{r.passed?'Pass':'Fail'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {!loading && results.length===0 && <div className="card p-12 text-center text-slate-400 text-sm">Select term and class to view results</div>}
    </div>
  );
}

function TermModal({ term, onClose, onSuccess }:any) {
  const editing = !!term;
  const [form, setForm] = useState({name:term?.name||'',startDate:term?.startDate?fmt.dateInput(term.startDate):'',endDate:term?.endDate?fmt.dateInput(term.endDate):''});
  const [saving, setSaving] = useState(false);
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if(editing) await examsApi.updateTerm(term.id,form); else await examsApi.createTerm(form);
      toast.success(editing?'Updated!':'Created!'); onSuccess();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };
  return (
    <Modal title={editing?'Edit Term':'Add Exam Term'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Term Name *</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="form-input" placeholder="e.g. Unit Test 1, Half Yearly Exam"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} className="form-input"/></div>
          <div><label className="form-label">End Date</label><input type="date" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} className="form-input"/></div>
        </div>
        <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':editing?'Update':'Create'}</button></div>
      </form>
    </Modal>
  );
}
