'use client';
import { useState, useEffect } from 'react';
import { Plus, Award, Trash2, Edit, AlertCircle } from 'lucide-react';
import { examsApi, studentsApi, api } from '@/lib/api';
import { fmt } from '@/lib/utils';
import { Modal, Tabs, Empty, TableSkeleton, Confirm } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ExamsPage() {
  const [tab, setTab] = useState('terms');
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div><h1 className="page-title">Exams & Marks</h1><p className="page-sub">Manage exam terms, subjects and student marks</p></div>
      </div>
      <Tabs tabs={[{key:'terms',label:'Exam Terms'},{key:'marks',label:'Enter Marks'},{key:'results',label:'Results'}]} active={tab} onChange={setTab}/>
      {tab==='terms'   && <ExamTerms/>}
      {tab==='marks'   && <MarksEntry/>}
      {tab==='results' && <ExamResults/>}
    </div>
  );
}

// ─── Exam Terms ──────────────────────────────────────────────────
function ExamTerms() {
  const [terms,    setTerms]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    examsApi.getTerms()
      .then(r => setTerms(r.data.data || []))
      .catch(() => toast.error('Failed to load terms'))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []);

  const deleteTerm = async () => {
    if (!deleteId) return; setDeleting(true);
    try { await examsApi.deleteTerm(deleteId); toast.success('Term deleted'); setDeleteId(null); load(); }
    catch(err:any) { toast.error(err.response?.data?.message || 'Cannot delete term with marks'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Exam Term</button>
      </div>
      {loading ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_,i) => <div key={i} className="h-36 card animate-pulse"/>)}</div>
      ) : terms.length === 0 ? (
        <Empty icon={Award} title="No exam terms yet" action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Create First Term</button>}/>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {terms.map(t => (
            <div key={t.id} className="card p-5 hover:shadow-card-hover transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center cursor-pointer" onClick={() => setSelected(t)}>
                  <Award className="w-5 h-5 text-primary-600"/>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditItem(t)} className="btn-icon"><Edit className="w-3.5 h-3.5"/></button>
                  <button onClick={() => setDeleteId(t.id)} className="btn-icon hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 cursor-pointer" onClick={() => setSelected(t)}>{t.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{t.academicYear?.name || '—'}</p>
              <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                {t.startDate && <span>{fmt.date(t.startDate)}</span>}
                {t.endDate   && <><span>→</span><span>{fmt.date(t.endDate)}</span></>}
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd  && <TermModal onClose={() => setShowAdd(false)}  onSuccess={() => { setShowAdd(false);  load(); }}/>}
      {editItem && <TermModal term={editItem} onClose={() => setEditItem(null)} onSuccess={() => { setEditItem(null); load(); }}/>}
      {selected && <TermDetail term={selected} onClose={() => setSelected(null)}/>}
      {deleteId && <Confirm title="Delete Exam Term" message="This will permanently delete the exam term and all associated subjects and marks." onConfirm={deleteTerm} onCancel={() => setDeleteId(null)} loading={deleting}/>}
    </div>
  );
}

// ─── Term Modal — fixed: academicYearId required ─────────────────
function TermModal({ term, onClose, onSuccess }: any) {
  const editing = !!term;
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [yearsLoading,  setYearsLoading]  = useState(true);
  const [form, setForm] = useState({
    name:           term?.name       || '',
    academicYearId: term?.academicYearId || term?.academicYear?.id || '',
    startDate:      term?.startDate  ? fmt.dateInput(term.startDate) : '',
    endDate:        term?.endDate    ? fmt.dateInput(term.endDate)   : '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    api.get('/admissions/academic-years')
      .then(r => {
        const years = r.data.data || [];
        setAcademicYears(years);
        // Auto-select current year if not editing
        if (!editing && !form.academicYearId) {
          const current = years.find((y:any) => y.isCurrent) || years[0];
          if (current) setForm(p => ({ ...p, academicYearId: current.id }));
        }
      })
      .catch(() => {})
      .finally(() => setYearsLoading(false));
  }, []); // eslint-disable-line

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())      return setError('Term name is required.');
    if (!form.academicYearId)   return setError('Please select an academic year.');
    if (!form.startDate)        return setError('Start date is required.');
    if (!form.endDate)          return setError('End date is required.');
    if (form.startDate >= form.endDate) return setError('End date must be after start date.');

    setSaving(true);
    try {
      // Send exactly what backend createTermSchema expects:
      // { name, academicYearId, startDate, endDate }
      const body = {
        name:           form.name.trim(),
        academicYearId: form.academicYearId,
        startDate:      form.startDate,
        endDate:        form.endDate,
      };
      if (editing) await examsApi.updateTerm(term.id, body);
      else         await examsApi.createTerm(body);
      toast.success(editing ? 'Term updated!' : 'Exam term created!');
      onSuccess();
    } catch(err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || (err.response?.data?.errors as any[])?.[0]?.message || 'Failed';
      setError(msg);
    } finally { setSaving(false); }
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Modal title={editing ? 'Edit Exam Term' : 'Add Exam Term'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">

        {/* Academic Year */}
        <div>
          <label className="form-label">Academic Year *</label>
          {yearsLoading ? (
            <div className="form-input text-slate-400 text-sm">Loading…</div>
          ) : academicYears.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              No academic years found. Create one in{' '}
              <a href="/dashboard/session" className="font-semibold underline">Session & Years</a> first.
            </div>
          ) : (
            <select value={form.academicYearId} onChange={e => f('academicYearId', e.target.value)} className="form-select" required>
              <option value="">Select academic year</option>
              {academicYears.map((y:any) => (
                <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (Current)' : ''}</option>
              ))}
            </select>
          )}
        </div>

        {/* Term Name */}
        <div>
          <label className="form-label">Term Name *</label>
          <input required value={form.name} onChange={e => f('name', e.target.value)} className="form-input" placeholder="e.g. Unit Test 1, Half Yearly, Annual Exam"/>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Start Date *</label>
            <input type="date" required value={form.startDate} onChange={e => f('startDate', e.target.value)} className="form-input"/>
          </div>
          <div>
            <label className="form-label">End Date *</label>
            <input type="date" required value={form.endDate} onChange={e => f('endDate', e.target.value)} className="form-input"/>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving || academicYears.length === 0} className="btn-primary flex-1 justify-center">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving…</> : editing ? 'Update' : 'Create Term'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Term Detail — fixed: correct field names for createSubject ───
function TermDetail({ term, onClose }: any) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [classes,  setClasses]  = useState<any[]>([]);
  // Backend createSubjectSchema: { termId, subjectName, classId, maxMarks, passMarks, examDate }
  const [form, setForm] = useState({ subjectName:'', classId:'', maxMarks:'100', passMarks:'35', examDate:'' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    examsApi.getSubjects(term.id).then(r => setSubjects(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, [term.id]); // eslint-disable-line

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      // Backend expects: { termId, subjectName, classId, maxMarks, passMarks, examDate? }
      await examsApi.createSubject(term.id, {
        termId:      term.id,
        subjectName: form.subjectName,
        classId:     form.classId,
        maxMarks:    Number(form.maxMarks),
        passMarks:   Number(form.passMarks),
        examDate:    form.examDate || undefined,
      });
      toast.success('Subject added');
      setForm({ subjectName:'', classId: form.classId, maxMarks:'100', passMarks:'35', examDate:'' });
      setShowAdd(false);
      load();
    } catch(err: any) { toast.error(err.response?.data?.message || 'Failed to add subject'); }
    finally { setSaving(false); }
  };

  const deleteSubject = async (id: string) => {
    try { await examsApi.deleteSubject(id); toast.success('Subject deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <Modal title={term.name} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{subjects.length} subjects · {term.academicYear?.name}</p>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs py-1.5"><Plus className="w-3.5 h-3.5"/>Add Subject</button>
        </div>

        {showAdd && (
          <form onSubmit={addSubject} className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="form-label">Subject Name *</label>
                <input required value={form.subjectName} onChange={e => setForm(p => ({...p, subjectName: e.target.value}))} className="form-input" placeholder="e.g. Mathematics, Science"/>
              </div>
              <div className="col-span-2">
                <label className="form-label">Class *</label>
                <select required value={form.classId} onChange={e => setForm(p => ({...p, classId: e.target.value}))} className="form-select">
                  <option value="">Select class</option>
                  {classes.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Max Marks</label>
                <input type="number" min={1} value={form.maxMarks} onChange={e => setForm(p => ({...p, maxMarks: e.target.value}))} className="form-input"/>
              </div>
              <div>
                <label className="form-label">Pass Marks</label>
                <input type="number" min={0} value={form.passMarks} onChange={e => setForm(p => ({...p, passMarks: e.target.value}))} className="form-input"/>
              </div>
              <div className="col-span-2">
                <label className="form-label">Exam Date (optional)</label>
                <input type="date" value={form.examDate} onChange={e => setForm(p => ({...p, examDate: e.target.value}))} className="form-input"/>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5">{saving ? 'Saving…' : 'Add Subject'}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
            </div>
          </form>
        )}

        {loading ? <TableSkeleton rows={4} cols={4}/> : subjects.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm">No subjects yet. Add subjects using the button above.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Subject</th><th>Class</th><th>Max Marks</th><th>Pass Marks</th><th>Exam Date</th><th></th></tr></thead>
            <tbody>{subjects.map((s:any) => (
              <tr key={s.id}>
                <td className="font-medium">{s.subjectName || s.name}</td>
                <td>{s.class?.name || '—'}</td>
                <td>{s.maxMarks}</td>
                <td>{s.passMarks}</td>
                <td className="text-slate-400 text-xs">{s.examDate ? fmt.date(s.examDate) : '—'}</td>
                <td><button onClick={() => deleteSubject(s.id)} className="btn-icon hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}

// ─── Marks Entry ─────────────────────────────────────────────────
function MarksEntry() {
  const [terms,    setTerms]    = useState<any[]>([]);
  const [classes,  setClasses]  = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [marks,    setMarks]    = useState<Record<string, Record<string, string>>>({});
  const [filters,  setFilters]  = useState({ termId:'', classId:'' });
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const f = (k:string, v:string) => setFilters(p => ({...p, [k]:v}));

  useEffect(() => {
    examsApi.getTerms().then(r => setTerms(r.data.data || [])).catch(() => {});
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (filters.termId && filters.classId) {
      examsApi.getSubjects(filters.termId).then(r => {
        const subs: any[] = (r.data.data || []).filter((s:any) => s.classId === filters.classId || s.class?.id === filters.classId);
        setSubjects(subs);
      }).catch(() => {});
    } else {
      setSubjects([]);
    }
  }, [filters.termId, filters.classId]);

  const loadStudents = async () => {
    if (!filters.classId || !filters.termId) return toast.error('Select class and term');
    setLoading(true);
    try {
      const r = await studentsApi.getAll({ classId: filters.classId, limit: 200 });
      const studs: any[] = Array.isArray(r.data.data) ? r.data.data : r.data.data?.students || [];
      setStudents(studs);
      const m: Record<string, Record<string, string>> = {};
      studs.forEach((s:any) => { m[s.id] = {}; subjects.forEach((sub:any) => { m[s.id][sub.id] = ''; }); });
      setMarks(m);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const saveMarks = async () => {
    setSaving(true);
    try {
      // Backend enterMarksSchema: { subjectId, marks: [{studentId, marksObtained, isAbsent?}] }
      // Must group by subjectId and send one request per subject
      const bySubject: Record<string, {studentId:string; marksObtained:number}[]> = {};
      Object.entries(marks).forEach(([studentId, subs]) => {
        Object.entries(subs).forEach(([subjectId, val]) => {
          if (val === '') return;
          if (!bySubject[subjectId]) bySubject[subjectId] = [];
          bySubject[subjectId].push({ studentId, marksObtained: Number(val) });
        });
      });
      const requests = Object.entries(bySubject).map(([subjectId, marksList]) =>
        examsApi.enterMarks({ subjectId, marks: marksList })
      );
      await Promise.all(requests);
      toast.success('Marks saved successfully!');
    } catch(err:any) { toast.error(err.response?.data?.message || 'Failed to save marks'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label">Exam Term</label>
          <select value={filters.termId} onChange={e => f('termId', e.target.value)} className="form-select w-44">
            <option value="">Select term</option>
            {terms.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Class</label>
          <select value={filters.classId} onChange={e => f('classId', e.target.value)} className="form-select w-36">
            <option value="">Select class</option>
            {classes.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={loadStudents} className="btn-primary" disabled={!filters.classId || !filters.termId}>Load Students</button>
        {students.length > 0 && subjects.length > 0 && (
          <button onClick={saveMarks} disabled={saving} className="btn-primary ml-auto bg-green-600 hover:bg-green-700 focus:ring-green-500">
            {saving ? 'Saving…' : 'Save All Marks'}
          </button>
        )}
      </div>

      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}

      {!loading && students.length > 0 && subjects.length === 0 && (
        <div className="card p-6 text-center text-amber-600 text-sm">
          No subjects found for this class &amp; term. Add subjects first in the Exam Terms tab.
        </div>
      )}

      {!loading && students.length > 0 && subjects.length > 0 && (
        <div className="card overflow-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Student</th>
                {subjects.map((s:any) => (
                  <th key={s.id}>{s.subjectName || s.name}<br/><span className="text-xs font-normal text-slate-400">/{s.maxMarks}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s:any) => (
                <tr key={s.id}>
                  <td>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.admissionNumber}</p>
                  </td>
                  {subjects.map((sub:any) => (
                    <td key={sub.id} className="p-2">
                      <input type="number" min={0} max={sub.maxMarks}
                        value={marks[s.id]?.[sub.id] || ''}
                        onChange={e => setMarks(p => ({...p, [s.id]: {...p[s.id], [sub.id]: e.target.value}}))}
                        className="form-input w-20 text-center py-1.5 text-sm" placeholder="—"/>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="card p-12 text-center text-slate-400 text-sm">Select exam term and class, then click Load Students</div>
      )}
    </div>
  );
}

// ─── Exam Results ────────────────────────────────────────────────
function ExamResults() {
  const [terms,   setTerms]   = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [filters, setFilters] = useState({ termId:'', classId:'' });
  const [loading, setLoading] = useState(false);
  const f = (k:string, v:string) => setFilters(p => ({...p, [k]:v}));

  useEffect(() => {
    examsApi.getTerms().then(r => setTerms(r.data.data || [])).catch(() => {});
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  const load = async () => {
    if (!filters.termId || !filters.classId) return toast.error('Select term and class');
    setLoading(true);
    try { const r = await examsApi.getResults(filters); setResults(r.data.data || []); }
    catch { toast.error('Failed to load results'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-3 items-end">
        <div>
          <label className="form-label">Exam Term</label>
          <select value={filters.termId} onChange={e => f('termId', e.target.value)} className="form-select w-44">
            <option value="">Select term</option>
            {terms.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Class</label>
          <select value={filters.classId} onChange={e => f('classId', e.target.value)} className="form-select w-36">
            <option value="">Select class</option>
            {classes.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={load} className="btn-primary">Get Results</button>
      </div>

      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}

      {!loading && results.length > 0 && (
        <div className="card overflow-auto">
          <table className="tbl">
            <thead>
              <tr><th>Rank</th><th>Student</th><th>Total Marks</th><th>Percentage</th><th>Grade</th><th>Result</th></tr>
            </thead>
            <tbody>
              {results.map((r:any, i:number) => (
                <tr key={i}>
                  <td>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i===0?'bg-yellow-100 text-yellow-700':i===1?'bg-slate-100 text-slate-600':i===2?'bg-orange-100 text-orange-700':'text-slate-500'}`}>{i+1}</span>
                  </td>
                  <td><p className="font-medium text-sm">{r.name || r.student?.name}</p><p className="text-xs text-slate-400">{r.admissionNumber || r.student?.admissionNumber}</p></td>
                  <td className="font-semibold">{r.totalMarks ?? '—'}/{r.maxMarks ?? r.totalMaxMarks ?? '—'}</td>
                  <td><span className={`font-bold ${(r.percentage||0)>=75?'text-green-600':(r.percentage||0)>=50?'text-yellow-600':'text-red-500'}`}>{r.percentage || 0}%</span></td>
                  <td><span className="badge badge-blue">{r.grade || r.overallGrade || '—'}</span></td>
                  <td><span className={`badge ${r.passed?'badge-green':'badge-red'}`}>{r.passed ? 'Pass' : 'Fail'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="card p-12 text-center text-slate-400 text-sm">Select term and class to view results</div>
      )}
    </div>
  );
}
