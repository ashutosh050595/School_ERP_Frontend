'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, Award, Trash2, Edit, BookOpen, Layers, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { examsApi, studentsApi, api } from '@/lib/api';
import { fmt } from '@/lib/utils';
import { Modal, Tabs, Empty, TableSkeleton, Confirm } from '@/components/ui';
import toast from 'react-hot-toast';

// Component display order for marks entry
const COMPONENTS = [
  { code: 'PT',   label: 'PT (20)',  max: 20 },
  { code: 'NB',   label: 'NB (5)',   max: 5  },
  { code: 'SE',   label: 'SE (5)',   max: 5  },
  { code: 'MAIN', label: 'Main (80)',max: 80  },
] as const;

export default function ExamsPage() {
  const [tab, setTab] = useState('terms');
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div><h1 className="page-title">Exams & Marks</h1><p className="page-sub">PT · Notebook · Subject Enrichment · Mid Term / Annual</p></div>
      </div>
      <Tabs tabs={[
        { key:'terms',   label:'Exam Terms'  },
        { key:'marks',   label:'Enter Marks' },
        { key:'results', label:'Results'     },
      ]} active={tab} onChange={setTab}/>
      {tab === 'terms'   && <ExamTerms/>}
      {tab === 'marks'   && <MarksEntry/>}
      {tab === 'results' && <ExamResults/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Exam Terms
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
    examsApi.getTerms()
      .then(r => setTerms(r.data.data || []))
      .catch(() => toast.error('Failed to load terms'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const deleteTerm = async () => {
    if (!deleteId) return;
    setDeleting(true);
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
                      <button onClick={() => setEditItem(t)} className="btn-icon"><Edit className="w-3.5 h-3.5"/></button>
                      <button onClick={() => setDeleteId(t.id)} className="btn-icon hover:text-danger-500"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 cursor-pointer" onClick={() => setSelected(t)}>{t.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${t.termNumber === 1 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      Term {t.termNumber || 1}
                    </span>
                  </div>
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
      {showAdd  && <TermModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load(); }}/>}
      {editItem && <TermModal term={editItem} onClose={() => setEditItem(null)} onSuccess={() => { setEditItem(null); load(); }}/>}
      {selected && <TermDetail term={selected} onClose={() => setSelected(null)}/>}
      {deleteId && <Confirm title="Delete Exam Term" message="This deletes the term and ALL subject marks." onConfirm={deleteTerm} onCancel={() => setDeleteId(null)} loading={deleting}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Term Detail — Subject Assignment
// ─────────────────────────────────────────────────────────
type SubjectRow = { id: string; name: string; examDate: string };
type Selection  = { classId: string; className: string; sectionId?: string; sectionName?: string };

function TermDetail({ term, onClose }: any) {
  const [tab, setTab]           = useState<'assign'|'existing'>('assign');
  const [classes, setClasses]   = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubj, setLoadingSubj] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const mkRow = (): SubjectRow => ({ id: Math.random().toString(36).slice(2), name: '', examDate: '' });
  const [rows, setRows]           = useState<SubjectRow[]>([mkRow()]);
  const [selections, setSelections] = useState<Map<string, Selection>>(new Map());
  const [assigning, setAssigning]   = useState(false);
  const [deleteBase, setDeleteBase] = useState<any|null>(null);

  const selKey = (classId: string, sectionId?: string) => sectionId ? `${classId}__${sectionId}` : classId;

  const loadSubjects = () => {
    setLoadingSubj(true);
    examsApi.getSubjects(term.id).then(r => setSubjects(r.data.data || [])).catch(() => {}).finally(() => setLoadingSubj(false));
  };

  useEffect(() => {
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
    loadSubjects();
  }, [term.id]);

  const setRow = (id: string, key: keyof SubjectRow, val: string) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [key]: val } : r));

  const toggleExpanded = (cid: string) =>
    setExpanded(p => { const n = new Set(p); n.has(cid) ? n.delete(cid) : n.add(cid); return n; });

  const toggleWholeClass = (cls: any) => {
    setSelections(prev => {
      const n = new Map(prev);
      const key = selKey(cls.id);
      if (n.has(key)) {
        n.delete(key);
        (cls.sections || []).forEach((s: any) => n.delete(selKey(cls.id, s.id)));
      } else {
        n.set(key, { classId: cls.id, className: cls.name });
        (cls.sections || []).forEach((s: any) => n.delete(selKey(cls.id, s.id)));
      }
      return n;
    });
  };

  const toggleSection = (cls: any, sec: any) => {
    setSelections(prev => {
      const n = new Map(prev);
      const wholeKey = selKey(cls.id);
      const secKey   = selKey(cls.id, sec.id);
      if (n.has(wholeKey)) {
        n.delete(wholeKey);
        (cls.sections || []).forEach((s: any) => {
          if (s.id !== sec.id) n.set(selKey(cls.id, s.id), { classId: cls.id, className: cls.name, sectionId: s.id, sectionName: s.section });
        });
      } else if (n.has(secKey)) { n.delete(secKey); }
      else { n.set(secKey, { classId: cls.id, className: cls.name, sectionId: sec.id, sectionName: sec.section }); }
      return n;
    });
  };

  const isWholeSelected = (cid: string) => selections.has(selKey(cid));
  const isSecSelected   = (cid: string, sid: string) => selections.has(selKey(cid)) || selections.has(selKey(cid, sid));
  const isPartial       = (cls: any) => !isWholeSelected(cls.id) && (cls.sections || []).some((s: any) => selections.has(selKey(cls.id, s.id)));

  const assign = async () => {
    const validRows = rows.filter(r => r.name.trim());
    if (validRows.length === 0)   return toast.error('Add at least one subject name');
    if (selections.size === 0)    return toast.error('Select at least one class or section');
    setAssigning(true);
    try {
      const subjectPayload: any[] = [];
      validRows.forEach(row => {
        selections.forEach(sel => {
          subjectPayload.push({
            termId:      term.id,
            subjectName: row.name.trim(),
            classId:     sel.classId,
            ...(row.examDate ? { examDate: row.examDate } : {}),
          });
        });
      });
      const r = await examsApi.bulkCreateSubjects(subjectPayload);
      const d = r.data.data;
      toast.success(`${d.baseSubjects || validRows.length} subjects assigned (4 components each)`);
      setRows([mkRow()]); setSelections(new Map());
      loadSubjects(); setTab('existing');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setAssigning(false); }
  };

  const doDeleteBase = async () => {
    if (!deleteBase) return;
    try {
      await api.delete('/exams/subjects/base', { data: { termId: term.id, classId: deleteBase.classId, baseName: deleteBase.name } });
      toast.success('Subject deleted');
      setDeleteBase(null);
      loadSubjects();
    } catch { toast.error('Cannot delete — marks may exist'); }
  };

  // Group subjects by class → base subject name
  const byClass: Record<string, Record<string, any[]>> = {};
  subjects.forEach((s: any) => {
    const parts     = s.subjectName.split('|');
    const base      = parts[0];
    const comp      = parts[1] || 'MAIN';
    const className = s.class?.name || 'Unknown';
    if (!byClass[className]) byClass[className] = {};
    if (!byClass[className][base]) byClass[className][base] = [];
    byClass[className][base].push({ ...s, component: comp });
  });

  const validRowCount = rows.filter(r => r.name.trim()).length;
  const baseSubjectCount = Object.values(byClass).reduce((a, b) => a + Object.keys(b).length, 0);

  return (
    <Modal title={term.name} onClose={onClose} size="xl">
      <div className="space-y-4">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          <button onClick={() => setTab('assign')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab==='assign'?'bg-white shadow text-primary-600':'text-slate-500 hover:text-slate-700'}`}>
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/>Assign Subjects</span>
          </button>
          <button onClick={() => setTab('existing')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab==='existing'?'bg-white shadow text-primary-600':'text-slate-500 hover:text-slate-700'}`}>
            <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5"/>Assigned ({baseSubjectCount} subjects)</span>
          </button>
        </div>

        {tab === 'assign' && (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              <span className="font-bold">Pattern:</span> Each subject is automatically split into 4 components:
              PT (20→10) + Notebook (5) + Subject Enrichment (5) + {term.termNumber === 2 ? 'Annual' : 'Mid Term'} (80) = <span className="font-bold">100 marks</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Step 1 — Subject Names</p>
                <button onClick={() => setRows(p => [...p, mkRow()])} className="btn-ghost text-xs py-1"><Plus className="w-3.5 h-3.5"/>Add Row</button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-8">#</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Subject Name *</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-36">Exam Date (optional)</th>
                      <th className="w-8"/>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-xs text-slate-400">{i+1}</td>
                        <td className="px-2 py-1.5">
                          <input value={row.name} onChange={e => setRow(row.id,'name',e.target.value)}
                            className="form-input text-sm py-1.5" placeholder="e.g. Hindi, Mathematics…"/>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="date" value={row.examDate} onChange={e => setRow(row.id,'examDate',e.target.value)}
                            className="form-input text-sm py-1.5 w-full"/>
                        </td>
                        <td className="px-2">
                          {rows.length > 1 && <button onClick={() => setRows(p => p.filter(r => r.id !== row.id))} className="btn-icon hover:text-red-500"><X className="w-3.5 h-3.5"/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Step 2 — Select Classes / Sections</p>
                <div className="flex gap-2">
                  <button onClick={() => setSelections(new Map(classes.map((c:any) => [c.id, { classId: c.id, className: c.name }])))} className="btn-ghost text-xs py-1">All</button>
                  <button onClick={() => setSelections(new Map())} className="btn-ghost text-xs py-1">Clear</button>
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {classes.map((cls: any) => {
                  const hasSec  = (cls.sections || []).length > 0;
                  const isOpen  = expanded.has(cls.id);
                  const whole   = isWholeSelected(cls.id);
                  const partial = isPartial(cls);
                  return (
                    <div key={cls.id}>
                      <div className={`flex items-center gap-3 px-4 py-3 ${whole ? 'bg-primary-50' : partial ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={whole}
                          ref={el => { if (el) el.indeterminate = partial && !whole; }}
                          onChange={() => toggleWholeClass(cls)} className="w-4 h-4 accent-primary-600"/>
                        <span className={`text-sm font-semibold flex-1 ${whole ? 'text-primary-700' : 'text-slate-700'}`}>
                          {cls.name}
                          {whole && <span className="ml-2 text-xs text-primary-500 font-normal">All sections</span>}
                          {partial && <span className="ml-2 text-xs text-blue-500 font-normal">Partial</span>}
                        </span>
                        {hasSec && (
                          <button onClick={() => toggleExpanded(cls.id)} className="btn-icon text-slate-400">
                            {isOpen ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                          </button>
                        )}
                      </div>
                      {hasSec && isOpen && (
                        <div className="flex flex-wrap gap-2 px-12 py-2 bg-slate-50/80 border-t border-slate-100">
                          {(cls.sections || []).map((sec: any) => {
                            const checked = isSecSelected(cls.id, sec.id);
                            return (
                              <label key={sec.id} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border-2 cursor-pointer text-xs font-semibold transition-all ${checked ? 'border-primary-400 bg-primary-600 text-white' : 'border-slate-300 text-slate-600 hover:border-primary-300'}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleSection(cls, sec)} className="hidden"/>
                                Sec {sec.section}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {validRowCount > 0 && selections.size > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-green-800">
                    {validRowCount} subject{validRowCount > 1 ? 's' : ''} × {selections.size} class{selections.size > 1 ? 'es' : ''} × 4 components = {validRowCount * selections.size * 4} records
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">PT + Notebook + Subject Enrichment + {term.termNumber === 2 ? 'Annual' : 'Mid Term'}</p>
                </div>
                <button onClick={assign} disabled={assigning} className="btn-primary flex-shrink-0">
                  {assigning ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Assigning…</> : <><Save className="w-4 h-4"/>Assign Subjects</>}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'existing' && (
          <div className="space-y-3">
            {loadingSubj ? <TableSkeleton rows={4} cols={4}/> :
             Object.keys(byClass).length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">No subjects assigned yet.</p>
                <button onClick={() => setTab('assign')} className="btn-primary mt-3 text-xs py-1.5"><Plus className="w-3.5 h-3.5"/>Assign Now</button>
              </div>
            ) : Object.entries(byClass).map(([className, baseMap]) => (
              <div key={className} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary-600"/>
                  <span className="font-semibold text-sm text-slate-700">{className}</span>
                  <span className="text-xs text-slate-400 ml-auto">{Object.keys(baseMap).length} subjects</span>
                </div>
                <table className="tbl">
                  <thead><tr><th>Subject</th><th>PT (20→10)</th><th>Notebook (5)</th><th>Sub.Enrich (5)</th><th>{term.termNumber === 2 ? 'Annual' : 'Mid Term'} (80)</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    {Object.entries(baseMap).map(([base, comps]: [string, any[]]) => {
                      const classId = comps[0]?.classId;
                      return (
                        <tr key={base}>
                          <td className="font-medium">{base}</td>
                          {['PT','NB','SE','MAIN'].map(c => {
                            const found = comps.find(x => x.component === c);
                            return <td key={c} className="text-sm text-slate-500">{found ? `Max ${found.maxMarks}` : '—'}</td>;
                          })}
                          <td className="font-semibold text-primary-700">100</td>
                          <td>
                            <button onClick={() => setDeleteBase({ name: base, classId, className })} className="btn-icon hover:text-danger-500" title="Delete subject">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
      {deleteBase && (
        <Confirm
          title="Delete Subject"
          message={`Delete "${deleteBase.name}" and all its components (PT, Notebook, Sub.Enrichment, ${term.termNumber === 2 ? 'Annual' : 'Mid Term'}) from ${deleteBase.className}? All marks will be lost.`}
          onConfirm={doDeleteBase}
          onCancel={() => setDeleteBase(null)}
          loading={false}
        />
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// Marks Entry — single sheet, roll-number sorted, component columns
// ─────────────────────────────────────────────────────────
function MarksEntry() {
  const [terms, setTerms]       = useState<any[]>([]);
  const [classes, setClasses]   = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);   // raw ExamSubject records
  const [students, setStudents] = useState<any[]>([]);
  // marks[studentId][subjectId] = value string
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({});
  const [filters, setFilters] = useState({ termId: '', classId: '', sectionId: '', baseSubject: '' });
  const [loading, setLoading]  = useState(false);
  const [saving, setSaving]    = useState(false);
  const [bulkErrors, setBulkErrors] = useState<any[]>([]);
  const bulkRef = useRef<HTMLInputElement>(null);

  const f = (k: string, v: string) => setFilters(p => ({ ...p, [k]: v }));

  // Unique base subject names for the class
  const baseNames: string[] = Array.from(
    new Set(
      subjects
        .filter((s: any) => !filters.classId || s.classId === filters.classId)
        .map((s: any) => s.subjectName.split('|')[0])
    )
  ).sort();

  // Active subjects (component records) for current filter
  const activeSubjects: any[] = subjects.filter((s: any) => {
    const base = s.subjectName.split('|')[0];
    const matchClass = !filters.classId || s.classId === filters.classId;
    const matchBase  = !filters.baseSubject || filters.baseSubject === 'ALL' || base === filters.baseSubject;
    return matchClass && matchBase;
  });

  useEffect(() => {
    examsApi.getTerms().then(r => setTerms(r.data.data || [])).catch(() => {});
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setSubjects([]); setStudents([]); setMarks({}); setBulkErrors([]);
    if (filters.termId) examsApi.getSubjects(filters.termId).then(r => setSubjects(r.data.data || [])).catch(() => {});
  }, [filters.termId]);

  useEffect(() => {
    setSections([]); setStudents([]); setMarks({}); setBulkErrors([]);
    if (filters.classId) studentsApi.getSections(filters.classId).then(r => setSections(r.data.data || [])).catch(() => {});
  }, [filters.classId]);

  useEffect(() => { setStudents([]); setMarks({}); setBulkErrors([]); }, [filters.sectionId, filters.baseSubject]);

  const loadStudents = async () => {
    if (!filters.termId || !filters.classId) return toast.error('Select term and class');
    if (activeSubjects.length === 0) return toast.error('No subjects found — assign subjects first');
    setLoading(true);
    try {
      const r = await studentsApi.getAll({ classId: filters.classId, classSectionId: filters.sectionId || undefined, limit: 500 });
      const raw: any[] = Array.isArray(r.data.data) ? r.data.data : [];
      // Sort by roll number numerically
      const studs = raw.slice().sort((a: any, b: any) => {
        const ra = parseInt(a.rollNumber || '9999', 10);
        const rb = parseInt(b.rollNumber || '9999', 10);
        return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
      });
      setStudents(studs);
      const m: Record<string, Record<string, string>> = {};
      studs.forEach((s: any) => { m[s.id] = {}; activeSubjects.forEach((sub: any) => { m[s.id][sub.id] = ''; }); });
      setMarks(m);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const setMark = (sid: string, subId: string, val: string) =>
    setMarks(p => ({ ...p, [sid]: { ...p[sid], [subId]: val } }));

  const saveMarks = async () => {
    setSaving(true);
    try {
      const bySubject: Record<string, Array<{ studentId: string; marksObtained: number }>> = {};
      students.forEach((s: any) => {
        activeSubjects.forEach((sub: any) => {
          const val = marks[s.id]?.[sub.id];
          if (val !== '' && val !== undefined) {
            if (!bySubject[sub.id]) bySubject[sub.id] = [];
            bySubject[sub.id].push({ studentId: s.id, marksObtained: Number(val) });
          }
        });
      });
      const payloads = Object.entries(bySubject).map(([subjectId, m]) => ({ subjectId, marks: m }));
      if (payloads.length === 0) { setSaving(false); return toast.error('No marks entered'); }
      await Promise.all(payloads.map(p => examsApi.enterMarks(p)));
      toast.success('All marks saved!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save marks');
    } finally { setSaving(false); }
  };

  // ── Template download — single sheet, all subjects as columns ──
  const downloadTemplate = async () => {
    if (students.length === 0) return toast.error('Load students first');
    if (activeSubjects.length === 0) return toast.error('No subjects');
    const XLSX = await import('xlsx');

    const term = terms.find((t: any) => t.id === filters.termId);
    const mainLabel = term?.termNumber === 2 ? 'Annual' : 'Mid Term';

    // Build base subjects in order
    const bases = Array.from(new Set(activeSubjects.map((s: any) => s.subjectName.split('|')[0]))).sort();

    // Header rows
    const subjectRow: any[]  = ['Roll No', 'Adm No', 'Student Name'];
    const compRow: any[]     = ['', '', ''];
    const maxRow: any[]      = ['', '', ''];
    const weightRow: any[]   = ['', '', ''];

    bases.forEach(base => {
      COMPONENTS.forEach(comp => {
        const found = activeSubjects.find((s: any) => s.subjectName === `${base}|${comp.code}`);
        subjectRow.push(base);
        compRow.push(comp.code === 'MAIN' ? mainLabel : comp.label.replace(/\s*\(\d+\)/, ''));
        maxRow.push(`Max: ${comp.max}`);
        weightRow.push(comp.code === 'PT' ? 'Weighted → 10' : '');
      });
    });

    const data: any[][] = [subjectRow, compRow, maxRow, weightRow];

    students.forEach((s: any) => {
      const row: any[] = [s.rollNumber || '', s.admissionNumber, s.name];
      bases.forEach(base => {
        COMPONENTS.forEach(() => { row.push(''); });
      });
      data.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 8 }, { wch: 14 }, { wch: 28 },
      ...Array(bases.length * COMPONENTS.length).fill({ wch: 12 }),
    ];
    // Freeze first 4 header rows + 3 id columns
    ws['!freeze'] = { xSplit: 3, ySplit: 4 };
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    const cls   = classes.find((c: any) => c.id === filters.classId)?.name || 'Class';
    const tName = term?.name || 'Term';
    XLSX.writeFile(wb, `Marks_${tName}_${cls}.xlsx`);
    toast.success('Template downloaded');
  };

  // ── Bulk upload ──
  const uploadBulkMarks = async (file: File) => {
    if (students.length === 0) return toast.error('Load students first');
    const XLSX = await import('xlsx');
    const ab   = await file.arrayBuffer();
    const wb   = XLSX.read(ab);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header rows: row with "adm" or "admission"
    let subjectRowIdx = rows.findIndex(r => r.some((c: any) => String(c).toLowerCase().includes('student') || String(c).toLowerCase().includes('adm')));
    if (subjectRowIdx === -1) subjectRowIdx = 0;
    const compRowIdx  = subjectRowIdx + 1;
    const dataStart   = subjectRowIdx + 4; // 4 header rows

    const subjectRowData = rows[subjectRowIdx] || [];
    const compRowData    = rows[compRowIdx]    || [];

    // Build column map: colIdx → { base, compCode, subjectId, max }
    const colMap: Array<{ base: string; compCode: string; subjectId: string; max: number } | null> = subjectRowData.map((_: any, ci: number) => {
      if (ci < 3) return null; // roll, adm, name cols
      const base     = String(subjectRowData[ci] || '').trim();
      const compCode = String(compRowData[ci]    || '').trim().toUpperCase();
      if (!base || !compCode) return null;
      // map "MAIN" / "MID TERM" / "ANNUAL" → MAIN
      const normalComp = ['MIDTERM','MID TERM','ANNUAL','MAIN'].some(x => compCode.includes(x)) ? 'MAIN' : compCode;
      const key = `${base}|${normalComp}`;
      const found = activeSubjects.find((s: any) => s.subjectName === key);
      if (!found) return null;
      return { base, compCode: normalComp, subjectId: found.id, max: found.maxMarks };
    });

    const admMap = new Map(students.map((s: any) => [String(s.admissionNumber).trim(), s]));
    const newMarks: Record<string, Record<string, string>> = JSON.parse(JSON.stringify(marks));
    const errors: any[] = [];

    const dataRows = rows.slice(dataStart).filter(r => r.some((c: any) => c !== '' && c !== null));
    dataRows.forEach((row: any[], ri: number) => {
      const admNo   = String(row[1] || row[0] || '').trim();
      const student = admMap.get(admNo);
      if (!student) {
        errors.push({ row: dataStart + ri + 1, admNo, name: '—', col: '—', marks: '—', issue: 'Admission number not found' });
        return;
      }
      row.forEach((cell: any, ci: number) => {
        if (ci < 3) return;
        const colInfo = colMap[ci];
        if (!colInfo) return;
        const raw = String(cell).trim();
        if (raw === '' || raw === '-') return;
        const val = Number(raw);
        if (isNaN(val)) {
          errors.push({ row: dataStart + ri + 1, admNo, name: student.name, col: `${colInfo.base}/${colInfo.compCode}`, marks: raw, issue: 'Not a number' });
          return;
        }
        if (val < 0) {
          errors.push({ row: dataStart + ri + 1, admNo, name: student.name, col: `${colInfo.base}/${colInfo.compCode}`, marks: val, issue: 'Negative marks' });
          return;
        }
        if (val > colInfo.max) {
          errors.push({ row: dataStart + ri + 1, admNo, name: student.name, col: `${colInfo.base}/${colInfo.compCode}`, marks: val, issue: `Exceeds max ${colInfo.max}` });
          return;
        }
        if (!newMarks[student.id]) newMarks[student.id] = {};
        newMarks[student.id][colInfo.subjectId] = String(val);
      });
    });

    setBulkErrors(errors);
    setMarks(newMarks);
    if (errors.length > 0) toast.error(`${errors.length} error(s) found — check table below`);
    else toast.success('Marks loaded — review and Save');
    if (bulkRef.current) bulkRef.current.value = '';
  };

  const filledCount = students.filter((s: any) =>
    activeSubjects.some((sub: any) => marks[s.id]?.[sub.id] !== '' && marks[s.id]?.[sub.id] !== undefined)
  ).length;

  // Group active subjects by base name for display
  const activeBases = Array.from(new Set(activeSubjects.map((s: any) => s.subjectName.split('|')[0]))).sort();

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label">Term</label>
          <select value={filters.termId} onChange={e => f('termId', e.target.value)} className="form-select w-40">
            <option value="">Select</option>
            {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Class</label>
          <select value={filters.classId} onChange={e => f('classId', e.target.value)} className="form-select w-32">
            <option value="">Select</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Section</label>
          <select value={filters.sectionId} onChange={e => f('sectionId', e.target.value)} className="form-select w-28" disabled={!sections.length}>
            <option value="">All</option>
            {sections.map((s: any) => <option key={s.id} value={s.id}>{s.section}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Subject</label>
          <select value={filters.baseSubject} onChange={e => f('baseSubject', e.target.value)} className="form-select w-44" disabled={!baseNames.length}>
            <option value="ALL">All Subjects</option>
            {baseNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={loadStudents} disabled={!filters.termId || !filters.classId || loading} className="btn-primary">
          {loading ? 'Loading…' : 'Load Students'}
        </button>
        {students.length > 0 && (
          <>
            <button onClick={downloadTemplate} className="btn-ghost border border-slate-300 text-slate-700 text-sm py-2 px-3">
              ⬇ Template
            </button>
            <label className="btn-ghost border border-blue-300 text-blue-600 text-sm py-2 px-3 cursor-pointer">
              ⬆ Upload
              <input ref={bulkRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => { if (e.target.files?.[0]) uploadBulkMarks(e.target.files[0]); }}/>
            </label>
            <button onClick={saveMarks} disabled={saving || filledCount === 0} className="btn-success ml-auto">
              {saving ? 'Saving…' : `Save Marks (${filledCount} students)`}
            </button>
          </>
        )}
      </div>

      {/* Validation errors */}
      {bulkErrors.length > 0 && (
        <div className="card border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-red-700">⚠ {bulkErrors.length} error(s) — rows skipped:</p>
            <button onClick={() => setBulkErrors([])} className="text-xs text-red-400 hover:text-red-600">Dismiss</button>
          </div>
          <div className="overflow-auto max-h-48 rounded border border-red-200">
            <table className="tbl text-xs">
              <thead><tr><th>Row</th><th>Adm No</th><th>Student</th><th>Column</th><th>Marks</th><th>Issue</th></tr></thead>
              <tbody>
                {bulkErrors.map((e: any, i: number) => (
                  <tr key={i}>
                    <td>{e.row}</td><td className="font-mono">{e.admNo}</td><td>{e.name}</td>
                    <td>{e.col}</td><td className="font-bold text-red-600">{e.marks}</td><td className="text-red-600">{e.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Marks table */}
      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}

      {!loading && students.length > 0 && (
        <div className="card overflow-auto">
          <table className="tbl" style={{ minWidth: '600px' }}>
            <thead>
              {/* Row 1: Subject group headers */}
              <tr>
                <th rowSpan={2} className="w-8">#</th>
                <th rowSpan={2}>Student</th>
                <th rowSpan={2} className="w-16">Roll</th>
                {activeBases.map(base => (
                  <th key={base} colSpan={COMPONENTS.length} className="text-center border-l border-slate-200 bg-primary-50 text-primary-700">
                    {base}
                  </th>
                ))}
                <th rowSpan={2} className="w-20 text-center">Status</th>
              </tr>
              {/* Row 2: Component sub-headers */}
              <tr>
                {activeBases.map(base =>
                  COMPONENTS.map(comp => {
                    const found = activeSubjects.find((s: any) => s.subjectName === `${base}|${comp.code}`);
                    return (
                      <th key={`${base}|${comp.code}`} className="text-center border-l border-slate-200 text-xs font-semibold whitespace-nowrap">
                        <div>{comp.label}</div>
                        {!found && <div className="text-red-400 text-xs">no record</div>}
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>
            <tbody>
              {students.map((s: any, si: number) => {
                let tabIdx = si * activeBases.length * COMPONENTS.length;
                const anyOver = activeBases.some(base =>
                  COMPONENTS.some(comp => {
                    const sub = activeSubjects.find((x: any) => x.subjectName === `${base}|${comp.code}`);
                    if (!sub) return false;
                    const v = marks[s.id]?.[sub.id];
                    return v !== '' && v !== undefined && Number(v) > comp.max;
                  })
                );
                return (
                  <tr key={s.id} className={anyOver ? 'bg-red-50/50' : ''}>
                    <td className="text-xs text-slate-400">{si+1}</td>
                    <td>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{s.admissionNumber}</p>
                    </td>
                    <td className="text-sm text-center text-slate-500">{s.rollNumber || '—'}</td>
                    {activeBases.map(base =>
                      COMPONENTS.map(comp => {
                        const sub  = activeSubjects.find((x: any) => x.subjectName === `${base}|${comp.code}`);
                        if (!sub) return <td key={`${base}|${comp.code}`} className="text-center text-slate-200 border-l border-slate-100">—</td>;
                        const val  = marks[s.id]?.[sub.id] ?? '';
                        const over = val !== '' && Number(val) > comp.max;
                        tabIdx++;
                        return (
                          <td key={`${base}|${comp.code}`} className="p-1 border-l border-slate-100">
                            <input
                              type="number" min={0} max={comp.max}
                              value={val}
                              onChange={e => setMark(s.id, sub.id, e.target.value)}
                              tabIndex={tabIdx}
                              placeholder="—"
                              className={'form-input text-center py-1 text-sm w-full ' + (over ? 'border-red-400 bg-red-50' : '')}
                            />
                            {over && <p className="text-xs text-red-500 text-center">max {comp.max}</p>}
                          </td>
                        );
                      })
                    )}
                    <td className="text-center">
                      {anyOver ? <span className="badge badge-red text-xs">Over</span> : <span className="badge badge-gray text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="card p-12 text-center text-slate-400 text-sm">Select term, class and click Load Students</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Exam Results — component-wise per subject + total
// ─────────────────────────────────────────────────────────
function ExamResults() {
  const [terms, setTerms]     = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [filters, setFilters] = useState({ termId: '', classId: '' });
  const [loading, setLoading] = useState(false);
  const f = (k: string, v: string) => setFilters(p => ({ ...p, [k]: v }));

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

  const subjects = results.length > 0 ? results[0].subjects || [] : [];
  const term     = terms.find((t: any) => t.id === filters.termId);
  const mainLabel = term?.termNumber === 2 ? 'Annual' : 'Mid Term';

  return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-3 items-end">
        <div>
          <label className="form-label">Exam Term</label>
          <select value={filters.termId} onChange={e => f('termId', e.target.value)} className="form-select w-40">
            <option value="">Select</option>
            {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Class</label>
          <select value={filters.classId} onChange={e => f('classId', e.target.value)} className="form-select w-36">
            <option value="">Select</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading} className="btn-primary">{loading ? 'Loading…' : 'Get Results'}</button>
      </div>

      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}

      {!loading && results.length > 0 && (
        <div className="card overflow-auto">
          <table className="tbl" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th rowSpan={2}>Rank</th>
                <th rowSpan={2}>Student</th>
                <th rowSpan={2}>Roll</th>
                {subjects.map((sub: any) => (
                  <th key={sub.subjectName} colSpan={5} className="text-center border-l border-slate-200 bg-primary-50 text-primary-700 text-xs">
                    {sub.subjectName}
                  </th>
                ))}
                <th rowSpan={2} className="text-center">Grand Total</th>
                <th rowSpan={2} className="text-center">%</th>
                <th rowSpan={2} className="text-center">Grade</th>
              </tr>
              <tr>
                {subjects.map((sub: any) => (
                  ['PT(10)', 'NB(5)', 'SE(5)', mainLabel + '(80)', 'Total'].map(h => (
                    <th key={`${sub.subjectName}|${h}`} className="text-center border-l border-slate-200 text-xs font-medium whitespace-nowrap">{h}</th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r: any) => (
                <tr key={r.studentId}>
                  <td className="text-center">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${r.rank===1?'bg-yellow-100 text-yellow-700':r.rank===2?'bg-slate-100 text-slate-600':r.rank===3?'bg-orange-100 text-orange-700':'text-slate-500'}`}>
                      {r.rank}
                    </span>
                  </td>
                  <td>
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.admissionNumber}</p>
                  </td>
                  <td className="text-center text-sm">{r.rollNumber || '—'}</td>
                  {(r.subjects || []).map((sub: any) => (
                    <>
                      <td key={`${sub.subjectName}|pt`}  className="text-center text-xs border-l border-slate-100">{sub.ptWeighted}</td>
                      <td key={`${sub.subjectName}|nb`}  className="text-center text-xs">{sub.nbObtained}</td>
                      <td key={`${sub.subjectName}|se`}  className="text-center text-xs">{sub.seObtained}</td>
                      <td key={`${sub.subjectName}|mn`}  className="text-center text-xs">{sub.mainObtained}</td>
                      <td key={`${sub.subjectName}|tot`} className="text-center text-xs font-bold">
                        <span className={sub.isPassed ? 'text-green-700' : 'text-red-600'}>{sub.total.toFixed(1)}</span>
                      </td>
                    </>
                  ))}
                  <td className="text-center font-bold">{r.grandTotal.toFixed(1)}<span className="text-slate-400 font-normal text-xs">/{r.maxGrandTotal}</span></td>
                  <td className="text-center">
                    <span className={`font-bold text-sm ${parseFloat(r.percentage) >= 75 ? 'text-green-600' : parseFloat(r.percentage) >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {parseFloat(r.percentage).toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center"><span className="badge badge-blue">{r.grade}</span></td>
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

// ─────────────────────────────────────────────────────────
// Term Modal
// ─────────────────────────────────────────────────────────
function TermModal({ term, onClose, onSuccess }: any) {
  const editing = !!term;
  const [form, setForm] = useState({
    name:       term?.name || '',
    startDate:  term?.startDate ? fmt.dateInput(term.startDate) : '',
    endDate:    term?.endDate   ? fmt.dateInput(term.endDate)   : '',
    termNumber: term?.termNumber ?? 1,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, termNumber: Number(form.termNumber) };
      if (editing) await examsApi.updateTerm(term.id, payload);
      else         await examsApi.createTerm(payload);
      toast.success(editing ? 'Updated!' : 'Created!');
      onSuccess();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={editing ? 'Edit Term' : 'Add Exam Term'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="form-label">Term Name *</label>
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="form-input" placeholder="e.g. Term 1 Exam, Half Yearly"/>
        </div>
        <div>
          <label className="form-label">Term Number</label>
          <select value={form.termNumber} onChange={e => setForm(p => ({ ...p, termNumber: Number(e.target.value) }))} className="form-select w-full">
            <option value={1}>Term 1 (Mid Term)</option>
            <option value={2}>Term 2 (Annual)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Start Date</label>
            <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="form-input"/>
          </div>
          <div>
            <label className="form-label">End Date</label>
            <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="form-input"/>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
