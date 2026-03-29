'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, Award, Trash2, Edit, BookOpen, Layers, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
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

// ─────────────────────────────────────────────────────────
// Exam Terms list
// ─────────────────────────────────────────────────────────
function ExamTerms() {
  const [terms, setTerms]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    examsApi.getTerms().then(r => setTerms(r.data.data || [])).catch(() => toast.error('Failed to load terms')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const deleteTerm = async () => {
    if (!deleteId) return; setDeleting(true);
    try { await examsApi.deleteTerm(deleteId); toast.success('Term deleted'); setDeleteId(null); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Cannot delete — marks may exist'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Exam Term</button>
      </div>
      {loading
        ? <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_,i) => <div key={i} className="h-36 card animate-pulse"/>)}</div>
        : terms.length === 0
          ? <Empty icon={Award} title="No exam terms yet" action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Create First Term</button>}/>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {terms.map(t => (
                <div key={t.id} className="card p-5 hover:shadow-card-hover transition-shadow group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center cursor-pointer" onClick={() => setSelected(t)}>
                      <Award className="w-5 h-5 text-primary-600"/>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditItem(t)} className="btn-icon" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                      <button onClick={() => setDeleteId(t.id)} className="btn-icon hover:text-danger-500" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 cursor-pointer" onClick={() => setSelected(t)}>{t.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{t.academicYear?.name || 'Current year'}</p>
                  <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                    {t.startDate && <span>{fmt.date(t.startDate)}</span>}
                    {t.endDate   && <><span>→</span><span>{fmt.date(t.endDate)}</span></>}
                  </div>
                </div>
              ))}
            </div>
          )
      }
      {showAdd   && <TermModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load(); }}/>}
      {editItem  && <TermModal term={editItem} onClose={() => setEditItem(null)} onSuccess={() => { setEditItem(null); load(); }}/>}
      {selected  && <TermDetail term={selected} onClose={() => setSelected(null)}/>}
      {deleteId  && <Confirm title="Delete Exam Term" message="This will permanently delete the exam term and all associated subjects and marks." onConfirm={deleteTerm} onCancel={() => setDeleteId(null)} loading={deleting}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Subject Assignment Panel (TermDetail)
// ─────────────────────────────────────────────────────────
type SubjectRow = { id: string; name: string; maxMarks: string; passMarks: string; examDate: string; };

// A "selection item" = either a whole class or a specific section
type Selection = { classId: string; className: string; sectionId?: string; sectionName?: string; };

function TermDetail({ term, onClose }: any) {
  const [tab, setTab]           = useState<'assign' | 'existing'>('assign');
  const [classes, setClasses]   = useState<any[]>([]);    // [{id, name, sections:[{id, section}]}]
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubj, setLoadingSubj] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set()); // expanded class IDs

  const mkRow = (): SubjectRow => ({ id: Math.random().toString(36).slice(2), name: '', maxMarks: '100', passMarks: '35', examDate: '' });
  const [rows, setRows]         = useState<SubjectRow[]>([mkRow()]);

  // selections: Map<key, Selection> where key = classId or classId+sectionId
  const [selections, setSelections] = useState<Map<string, Selection>>(new Map());
  const [assigning, setAssigning]   = useState(false);

  const selKey = (classId: string, sectionId?: string) => sectionId ? `${classId}__${sectionId}` : classId;

  const loadSubjects = () => {
    setLoadingSubj(true);
    examsApi.getSubjects(term.id).then(r => setSubjects(r.data.data || [])).catch(() => {}).finally(() => setLoadingSubj(false));
  };

  useEffect(() => {
    studentsApi.getClasses().then(r => {
      const cls = r.data.data || [];
      setClasses(cls);
    }).catch(() => {});
    loadSubjects();
  }, [term.id]);

  const setRow = (id: string, key: keyof SubjectRow, val: string) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [key]: val } : r));

  const toggleExpanded = (classId: string) =>
    setExpanded(p => { const n = new Set(p); n.has(classId) ? n.delete(classId) : n.add(classId); return n; });

  // Select/deselect a whole class (all sections)
  const toggleWholeClass = (cls: any) => {
    setSelections(prev => {
      const n = new Map(prev);
      const key = selKey(cls.id);
      if (n.has(key)) {
        // deselect class AND all its sections
        n.delete(key);
        (cls.sections || []).forEach((s: any) => n.delete(selKey(cls.id, s.id)));
      } else {
        // select whole class, remove any individual section selections
        n.set(key, { classId: cls.id, className: cls.name });
        (cls.sections || []).forEach((s: any) => n.delete(selKey(cls.id, s.id)));
      }
      return n;
    });
  };

  // Select/deselect a specific section
  const toggleSection = (cls: any, sec: any) => {
    setSelections(prev => {
      const n = new Map(prev);
      const wholeKey = selKey(cls.id);
      const secKey   = selKey(cls.id, sec.id);
      // If whole class was selected, deselect it and select all OTHER sections individually
      if (n.has(wholeKey)) {
        n.delete(wholeKey);
        (cls.sections || []).forEach((s: any) => {
          if (s.id !== sec.id) n.set(selKey(cls.id, s.id), { classId: cls.id, className: cls.name, sectionId: s.id, sectionName: s.section });
        });
      } else if (n.has(secKey)) {
        n.delete(secKey);
      } else {
        n.set(secKey, { classId: cls.id, className: cls.name, sectionId: sec.id, sectionName: sec.section });
      }
      return n;
    });
  };

  const selectAll = () => {
    const n = new Map<string, Selection>();
    classes.forEach((cls: any) => n.set(selKey(cls.id), { classId: cls.id, className: cls.name }));
    setSelections(n);
  };

  const clearAll = () => setSelections(new Map());

  const isWholeClassSelected  = (classId: string) => selections.has(selKey(classId));
  const isSectionSelected     = (classId: string, sectionId: string) =>
    selections.has(selKey(classId)) || selections.has(selKey(classId, sectionId));
  const isPartiallySelected   = (cls: any) =>
    !isWholeClassSelected(cls.id) && (cls.sections || []).some((s: any) => selections.has(selKey(cls.id, s.id)));

  const assign = async () => {
    const validRows = rows.filter(r => r.name.trim());
    if (validRows.length === 0)   return toast.error('Add at least one subject name');
    if (selections.size === 0)    return toast.error('Select at least one class or section');
    setAssigning(true);
    try {
      const subjects: any[] = [];
      validRows.forEach(row => {
        selections.forEach((sel) => {
          subjects.push({
            termId:      term.id,
            subjectName: row.name.trim(),
            classId:     sel.classId,
            maxMarks:    Number(row.maxMarks) || 100,
            passMarks:   Number(row.passMarks) || 35,
            ...(row.examDate ? { examDate: row.examDate } : {}),
          });
        });
      });
      const r = await examsApi.bulkCreateSubjects(subjects);
      const d = r.data.data;
      toast.success(`${d.created} subjects assigned${d.skipped > 0 ? ` · ${d.skipped} already existed` : ''}`);
      setRows([mkRow()]);
      setSelections(new Map());
      loadSubjects();
      setTab('existing');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to assign subjects'); }
    finally { setAssigning(false); }
  };

  const deleteSubject = async (id: string) => {
    try { await examsApi.deleteSubject(id); toast.success('Deleted'); loadSubjects(); }
    catch { toast.error('Cannot delete — marks may exist for this subject'); }
  };

  // Group existing subjects by class name
  const byClass = subjects.reduce((acc: any, s: any) => {
    const key = s.class?.name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const validRowCount = rows.filter(r => r.name.trim()).length;
  const totalRecords  = validRowCount * selections.size;

  // Describe selections for summary line
  const selSummary = Array.from(selections.values()).slice(0, 3).map(s =>
    s.sectionId ? `${s.className}-${s.sectionName}` : s.className
  ).join(', ') + (selections.size > 3 ? ` +${selections.size - 3} more` : '');

  return (
    <Modal title={term.name} onClose={onClose} size="xl">
      <div className="space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          <button onClick={() => setTab('assign')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab==='assign'?'bg-white shadow text-primary-600':'text-slate-500 hover:text-slate-700'}`}>
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/>Assign Subjects</span>
          </button>
          <button onClick={() => setTab('existing')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab==='existing'?'bg-white shadow text-primary-600':'text-slate-500 hover:text-slate-700'}`}>
            <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5"/>Assigned ({subjects.length})</span>
          </button>
        </div>

        {/* ── ASSIGN TAB ── */}
        {tab === 'assign' && (
          <div className="space-y-5">

            {/* Step 1: Subject rows */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Step 1 — Define Subjects</p>
                <button onClick={() => setRows(p => [...p, mkRow()])} className="btn-ghost text-xs py-1">
                  <Plus className="w-3.5 h-3.5"/>Add Row
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-8">#</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Subject Name *</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-28">Max Marks</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-28">Pass Marks</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-36">Exam Date</th>
                      <th className="w-8"/>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-xs text-slate-400">{i+1}</td>
                        <td className="px-2 py-1.5">
                          <input value={row.name} onChange={e => setRow(row.id, 'name', e.target.value)}
                            className="form-input text-sm py-1.5" placeholder="e.g. Hindi, Mathematics…"/>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={row.maxMarks} onChange={e => setRow(row.id, 'maxMarks', e.target.value)}
                            className="form-input text-sm py-1.5 w-full" min={1}/>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={row.passMarks} onChange={e => setRow(row.id, 'passMarks', e.target.value)}
                            className="form-input text-sm py-1.5 w-full" min={1}/>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="date" value={row.examDate} onChange={e => setRow(row.id, 'examDate', e.target.value)}
                            className="form-input text-sm py-1.5 w-full"/>
                        </td>
                        <td className="px-2">
                          {rows.length > 1 && (
                            <button onClick={() => setRows(p => p.filter(r => r.id !== row.id))} className="btn-icon hover:text-red-500">
                              <X className="w-3.5 h-3.5"/>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 2: Class + Section selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Step 2 — Select Classes / Sections</p>
                <div className="flex gap-2">
                  <button onClick={selectAll}  className="btn-ghost text-xs py-1">Select All</button>
                  <button onClick={clearAll}   className="btn-ghost text-xs py-1">Clear</button>
                </div>
              </div>

              {classes.length === 0
                ? <div className="border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">No classes found — create classes first</div>
                : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {classes.map((cls: any) => {
                      const hasSections = (cls.sections || []).length > 0;
                      const isOpen      = expanded.has(cls.id);
                      const wholeChecked   = isWholeClassSelected(cls.id);
                      const partialChecked = isPartiallySelected(cls);

                      return (
                        <div key={cls.id}>
                          {/* Class row */}
                          <div className={`flex items-center gap-3 px-4 py-3 ${wholeChecked ? 'bg-primary-50' : partialChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'} transition-colors`}>
                            {/* Whole-class checkbox */}
                            <input
                              type="checkbox"
                              checked={wholeChecked}
                              ref={el => { if (el) el.indeterminate = partialChecked; }}
                              onChange={() => toggleWholeClass(cls)}
                              className="w-4 h-4 accent-primary-600 flex-shrink-0"
                            />
                            <div className="flex-1">
                              <span className={`text-sm font-semibold ${wholeChecked ? 'text-primary-700' : 'text-slate-700'}`}>{cls.name}</span>
                              {wholeChecked && <span className="ml-2 text-xs text-primary-500 font-medium">All sections</span>}
                              {partialChecked && (
                                <span className="ml-2 text-xs text-blue-500 font-medium">
                                  {(cls.sections || []).filter((s: any) => isSectionSelected(cls.id, s.id)).length} of {cls.sections?.length} sections
                                </span>
                              )}
                            </div>
                            {/* Expand/collapse to pick individual sections */}
                            {hasSections && (
                              <button onClick={() => toggleExpanded(cls.id)}
                                className="btn-icon text-slate-400 hover:text-slate-600" title="Pick specific sections">
                                {isOpen ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                              </button>
                            )}
                          </div>

                          {/* Section chips (expanded) */}
                          {hasSections && isOpen && (
                            <div className="flex flex-wrap gap-2 px-12 py-3 bg-slate-50/80 border-t border-slate-100">
                              {(cls.sections || []).map((sec: any) => {
                                const secChecked = isSectionSelected(cls.id, sec.id);
                                return (
                                  <label key={sec.id}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 cursor-pointer text-xs font-semibold transition-all
                                      ${secChecked ? 'border-primary-400 bg-primary-600 text-white' : 'border-slate-300 text-slate-600 hover:border-primary-300'}`}>
                                    <input type="checkbox" checked={secChecked} onChange={() => toggleSection(cls, sec)} className="hidden"/>
                                    Section {sec.section}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>

            {/* Summary + Assign button */}
            {validRowCount > 0 && selections.size > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-green-800">
                    {validRowCount} subject{validRowCount > 1 ? 's' : ''} × {selections.size} selection{selections.size > 1 ? 's' : ''} = {totalRecords} records
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">{selSummary}</p>
                </div>
                <button onClick={assign} disabled={assigning} className="btn-primary flex-shrink-0">
                  {assigning
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Assigning…</>
                    : <><Save className="w-4 h-4"/>Assign Subjects</>
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── EXISTING TAB ── */}
        {tab === 'existing' && (
          <div className="space-y-3">
            {loadingSubj
              ? <TableSkeleton rows={4} cols={4}/>
              : subjects.length === 0
                ? (
                  <div className="text-center py-10 text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                    <p className="text-sm">No subjects assigned yet.</p>
                    <button onClick={() => setTab('assign')} className="btn-primary mt-3 text-xs py-1.5"><Plus className="w-3.5 h-3.5"/>Assign Now</button>
                  </div>
                )
                : Object.entries(byClass).map(([className, subs]: [string, any[]]) => (
                  <div key={className} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary-600"/>
                      <span className="font-semibold text-sm text-slate-700">{className}</span>
                      <span className="text-xs text-slate-400 ml-auto">{subs.length} subject{subs.length > 1 ? 's' : ''}</span>
                    </div>
                    <table className="tbl">
                      <thead><tr><th>Subject</th><th>Max Marks</th><th>Pass Marks</th><th>Exam Date</th><th></th></tr></thead>
                      <tbody>
                        {subs.map((s: any) => (
                          <tr key={s.id}>
                            <td className="font-medium">{s.subjectName}</td>
                            <td>{s.maxMarks}</td>
                            <td>{s.passMarks}</td>
                            <td className="text-sm">{s.examDate ? fmt.date(s.examDate) : '—'}</td>
                            <td><button onClick={() => deleteSubject(s.id)} className="btn-icon hover:text-danger-500"><Trash2 className="w-3.5 h-3.5"/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
            }
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// Marks Entry — single subject view with Tab navigation + bulk upload
// ─────────────────────────────────────────────────────────
function MarksEntry() {
  const [terms, setTerms]       = useState<any[]>([]);
  const [classes, setClasses]   = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks]       = useState<Record<string,string>>({});  // studentId → mark
  const [filters, setFilters]   = useState({ termId:'', classId:'', sectionId:'', subjectId:'' });
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const f = (k:string,v:string) => setFilters(p=>({...p,[k]:v}));

  // Bulk upload state
  const [bulkErrors, setBulkErrors] = useState<any[]>([]);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const activeSubject = subjects.find((s:any) => s.id === filters.subjectId);

  useEffect(() => {
    examsApi.getTerms().then(r => setTerms(r.data.data||[])).catch(()=>{});
    studentsApi.getClasses().then(r => setClasses(r.data.data||[])).catch(()=>{});
  }, []);
  useEffect(() => { if(filters.termId)  examsApi.getSubjects(filters.termId).then(r => setSubjects(r.data.data||[])).catch(()=>{}); setStudents([]); setMarks({}); }, [filters.termId]);
  useEffect(() => { if(filters.classId) studentsApi.getSections(filters.classId).then(r => setSections(r.data.data||[])).catch(()=>{}); }, [filters.classId]);
  useEffect(() => { setStudents([]); setMarks({}); setBulkErrors([]); }, [filters.subjectId]);

  const classSubjects = subjects.filter((s:any) => !filters.classId || s.classId === filters.classId);

  const loadStudents = async () => {
    if (!filters.classId || !filters.termId || !filters.subjectId) return toast.error('Select term, class and subject');
    setLoading(true);
    try {
      const r = await studentsApi.getAll({ classId:filters.classId, classSectionId:filters.sectionId||undefined, limit:200, orderBy:'rollNumber' });
      const studs = Array.isArray(r.data.data) ? r.data.data : [];
      setStudents(studs);
      const m: Record<string,string> = {};
      studs.forEach((s:any) => { m[s.id] = ''; });
      setMarks(m);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const saveMarks = async () => {
    if (!activeSubject) return;
    const entries = students
      .filter((s:any) => marks[s.id] !== '')
      .map((s:any) => ({ studentId: s.id, subjectId: activeSubject.id, marksObtained: Number(marks[s.id]), isAbsent: false }));
    if (entries.length === 0) return toast.error('No marks to save');
    setSaving(true);
    try {
      await examsApi.enterMarks({ subjectId: activeSubject.id, marks: entries });
      toast.success(`Marks saved for ${activeSubject.subjectName}!`);
    } catch(err:any) { toast.error(err.response?.data?.message||'Failed'); }
    finally { setSaving(false); }
  };

  // ── Download template ──
  const downloadTemplate = () => {
    if (!activeSubject || students.length === 0) return toast.error('Load students first');
    const XLSX = await import('xlsx');
    const wsData = [
      [`Subject: ${activeSubject.subjectName}`, `Max Marks: ${activeSubject.maxMarks}`, `Pass Marks: ${activeSubject.passMarks}`],
      ['Admission No', 'Student Name', 'Roll No', `Marks Obtained (Max: ${activeSubject.maxMarks})`],
      ...students.map((s:any) => [s.admissionNumber, s.name, s.rollNumber||'', '']),
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{wch:15},{wch:30},{wch:10},{wch:20}];
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    XLSX.writeFile(wb, `Marks_${activeSubject.subjectName}_${filters.classId}.xlsx`);
  };

  // ── Upload bulk marks ──
  const uploadBulkMarks = async (file: File) => {
    if (!activeSubject || students.length === 0) return toast.error('Load students first');
    const XLSX = await import('xlsx');
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
    // Find header row (has "Admission No")
    let headerIdx = rows.findIndex(r => r.some((c:any) => String(c).toLowerCase().includes('admission')));
    if (headerIdx === -1) headerIdx = 1;
    const dataRows = rows.slice(headerIdx + 1).filter(r => r[0]);

    const admMap = new Map(students.map((s:any) => [s.admissionNumber, s]));
    const newMarks: Record<string,string> = { ...marks };
    const errors: any[] = [];
    const maxMarks = activeSubject.maxMarks;

    dataRows.forEach((row, i) => {
      const admNo    = String(row[0]).trim();
      const markVal  = Number(row[3]);
      const student  = admMap.get(admNo);
      if (!student) { errors.push({ row: headerIdx+i+2, admNo, issue: 'Admission number not found in loaded students' }); return; }
      if (isNaN(markVal) || String(row[3]).trim() === '') return; // skip empty
      if (markVal > maxMarks) { errors.push({ row: headerIdx+i+2, admNo, name: student.name, marks: markVal, issue: `Marks ${markVal} exceeds maximum ${maxMarks}` }); return; }
      if (markVal < 0) { errors.push({ row: headerIdx+i+2, admNo, name: student.name, marks: markVal, issue: 'Marks cannot be negative' }); return; }
      newMarks[student.id] = String(markVal);
    });

    setBulkErrors(errors);
    setMarks(newMarks);
    const loaded = dataRows.length - errors.length;
    if (errors.length > 0) {
      toast.error(`${errors.length} validation error(s) found — review below`);
    } else {
      toast.success(`${loaded} student marks loaded from file — click Save to submit`);
    }
    if (bulkInputRef.current) bulkInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className="form-label">Exam Term</label>
          <select value={filters.termId} onChange={e=>{f('termId',e.target.value);}} className="form-select w-40">
            <option value="">Select</option>{terms.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><label className="form-label">Class</label>
          <select value={filters.classId} onChange={e=>f('classId',e.target.value)} className="form-select w-32">
            <option value="">Select</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="form-label">Section</label>
          <select value={filters.sectionId} onChange={e=>f('sectionId',e.target.value)} className="form-select w-28" disabled={!sections.length}>
            <option value="">All</option>{sections.map((s:any)=><option key={s.id} value={s.id}>{s.section}</option>)}
          </select></div>
        <div><label className="form-label">Subject</label>
          <select value={filters.subjectId} onChange={e=>f('subjectId',e.target.value)} className="form-select w-44" disabled={!classSubjects.length}>
            <option value="">Select Subject</option>{classSubjects.map((s:any)=><option key={s.id} value={s.id}>{s.subjectName}</option>)}
          </select></div>
        <button onClick={loadStudents} className="btn-primary" disabled={!filters.subjectId||!filters.termId||!filters.classId}>
          Load Students
        </button>
        {students.length > 0 && activeSubject && (
          <>
            <button onClick={downloadTemplate} className="btn-ghost border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm py-2 px-3">
              ⬇ Template
            </button>
            <label className="btn-ghost border border-blue-300 text-blue-600 hover:bg-blue-50 text-sm py-2 px-3 cursor-pointer">
              ⬆ Bulk Upload
              <input ref={bulkInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && uploadBulkMarks(e.target.files[0])}/>
            </label>
            <button onClick={saveMarks} disabled={saving} className="btn-success ml-auto">
              {saving ? 'Saving…' : `Save Marks — ${activeSubject.subjectName}`}
            </button>
          </>
        )}
      </div>

      {/* Validation errors from bulk upload */}
      {bulkErrors.length > 0 && (
        <div className="card border-red-200 bg-red-50 p-4 space-y-2">
          <p className="text-sm font-bold text-red-700">⚠ {bulkErrors.length} validation error(s) — these rows were NOT loaded:</p>
          <div className="overflow-auto max-h-48">
            <table className="tbl text-xs">
              <thead><tr><th>Row</th><th>Adm. No</th><th>Student</th><th>Marks</th><th>Issue</th></tr></thead>
              <tbody>{bulkErrors.map((e,i) => (
                <tr key={i} className="bg-red-50">
                  <td>{e.row}</td>
                  <td className="font-mono">{e.admNo}</td>
                  <td>{e.name||'—'}</td>
                  <td className="font-bold text-red-600">{e.marks??'—'}</td>
                  <td className="text-red-600">{e.issue}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subject info banner */}
      {activeSubject && students.length > 0 && (
        <div className="card p-3 flex items-center gap-4 bg-primary-50 border border-primary-200">
          <BookOpen className="w-5 h-5 text-primary-600 flex-shrink-0"/>
          <div className="flex-1">
            <p className="text-sm font-bold text-primary-800">{activeSubject.subjectName}</p>
            <p className="text-xs text-primary-600">Max: {activeSubject.maxMarks} · Pass: {activeSubject.passMarks} · {students.length} students</p>
          </div>
          <p className="text-xs text-primary-500">Press Tab to move between fields</p>
        </div>
      )}

      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}

      {!loading && students.length > 0 && activeSubject && (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Student</th>
                <th className="w-28">Adm. No</th>
                <th className="w-20">Roll No</th>
                <th className="w-40">Marks <span className="font-normal text-slate-400">/ {activeSubject.maxMarks}</span></th>
                <th className="w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s:any, i:number) => {
                const val     = marks[s.id] ?? '';
                const numVal  = Number(val);
                const isEmpty = val === '';
                const isOver  = !isEmpty && numVal > activeSubject.maxMarks;
                const isPassed = !isEmpty && !isOver && numVal >= activeSubject.passMarks;
                return (
                  <tr key={s.id} className={isOver ? 'bg-red-50' : ''}>
                    <td className="text-xs text-slate-400 text-right">{i+1}</td>
                    <td>
                      <p className="font-medium text-sm text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.admissionNumber}</p>
                    </td>
                    <td className="font-mono text-xs">{s.admissionNumber}</td>
                    <td className="text-sm text-slate-500">{s.rollNumber||'—'}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        max={activeSubject.maxMarks}
                        value={val}
                        onChange={e => {
                          const v = e.target.value;
                          setMarks(p => ({...p, [s.id]: v}));
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Tab') {
                            // Tab naturally moves to next input — just let it flow
                            return;
                          }
                        }}
                        className={`form-input text-center py-1.5 text-sm ${isOver ? 'border-red-400 bg-red-50 focus:ring-red-300' : ''}`}
                        placeholder="—"
                        tabIndex={i + 1}
                      />
                    </td>
                    <td>
                      {isEmpty ? <span className="text-xs text-slate-300">—</span>
                      : isOver ? <span className="badge badge-red">Exceeds max</span>
                      : isPassed ? <span className="badge badge-green">Pass</span>
                      : <span className="badge badge-red">Fail</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="card p-12 text-center text-slate-400 text-sm">Select exam term, class, subject and click Load Students</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Exam Results
// ─────────────────────────────────────────────────────────
function ExamResults() {
  const [terms, setTerms]     = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [filters, setFilters] = useState({ termId:'', classId:'' });
  const [loading, setLoading] = useState(false);
  const f = (k:string,v:string) => setFilters(p=>({...p,[k]:v}));
  useEffect(() => {
    examsApi.getTerms().then(r => setTerms(r.data.data||[])).catch(()=>{});
    studentsApi.getClasses().then(r => setClasses(r.data.data||[])).catch(()=>{});
  }, []);
  const load = async () => {
    if (!filters.termId || !filters.classId) return toast.error('Select term and class');
    setLoading(true);
    try { const r = await examsApi.getResults(filters); setResults(r.data.data||[]); }
    catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-3 items-end">
        <div><label className="form-label">Exam Term</label>
          <select value={filters.termId} onChange={e=>f('termId',e.target.value)} className="form-select w-40">
            <option value="">Select</option>{terms.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><label className="form-label">Class</label>
          <select value={filters.classId} onChange={e=>f('classId',e.target.value)} className="form-select w-36">
            <option value="">Select</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <button onClick={load} className="btn-primary">Get Results</button>
      </div>
      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}
      {!loading && results.length > 0 && (
        <div className="card overflow-auto">
          <table className="tbl">
            <thead><tr><th>Rank</th><th>Student</th><th>Total Marks</th><th>Percentage</th><th>Grade</th><th>Result</th></tr></thead>
            <tbody>{results.map((r:any,i:number) => (
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
      {!loading && results.length === 0 && <div className="card p-12 text-center text-slate-400 text-sm">Select term and class to view results</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Term Modal (create / edit)
// ─────────────────────────────────────────────────────────
function TermModal({ term, onClose, onSuccess }: any) {
  const editing = !!term;
  const [form, setForm] = useState({
    name:      term?.name || '',
    startDate: term?.startDate ? fmt.dateInput(term.startDate) : '',
    endDate:   term?.endDate   ? fmt.dateInput(term.endDate)   : '',
  });
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await examsApi.updateTerm(term.id, form);
      else         await examsApi.createTerm(form);
      toast.success(editing ? 'Updated!' : 'Created!');
      onSuccess();
    } catch (err:any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={editing ? 'Edit Term' : 'Add Exam Term'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Term Name *</label>
          <input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="form-input" placeholder="e.g. Unit Test 1, Half Yearly Exam"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Start Date</label>
            <input type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} className="form-input"/></div>
          <div><label className="form-label">End Date</label>
            <input type="date" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} className="form-input"/></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':editing?'Update':'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
