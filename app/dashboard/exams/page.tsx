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
        { key:'terms',   label:'Exam Terms'   },
        { key:'marks',   label:'Enter Marks'  },
        { key:'view',    label:'View / Update' },
        { key:'results', label:'Results'      },
      ]} active={tab} onChange={setTab}/>
      {tab === 'terms'   && <ExamTerms/>}
      {tab === 'marks'   && <MarksEntry/>}
      {tab === 'view'    && <ViewUpdateMarks/>}
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
  const [selectedComps, setSelectedComps] = useState<string[]>(['PT','NB','SE','MAIN']);

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
            termId:       term.id,
            subjectName:  row.name.trim(),
            classId:      sel.classId,
            components:   selectedComps,
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 space-y-2">
              <p><span className="font-bold">Pattern:</span> PT (20→10) + Notebook (5) + Sub. Enrichment (5) + {term.termNumber === 2 ? 'Annual' : 'Mid Term'} (80) = <span className="font-bold">100 marks</span></p>
              <p className="text-blue-600">Select which components to include for this term:</p>
              <div className="flex flex-wrap gap-3">
                {(['PT','NB','SE','MAIN'] as const).map(c => (
                  <label key={c} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border-2 cursor-pointer text-xs font-semibold transition-all ${selectedComps.includes(c)?'border-blue-500 bg-blue-600 text-white':'border-blue-300 text-blue-700 bg-white'}`}>
                    <input type="checkbox" checked={selectedComps.includes(c)}
                      onChange={() => setSelectedComps(p => p.includes(c) ? p.filter(x=>x!==c) : [...p,c])}
                      className="hidden"/>
                    {c==='PT'?'PT (20→10)':c==='NB'?'Notebook (5)':c==='SE'?'Sub.Enrich (5)':term.termNumber===2?'Annual (80)':'Mid Term (80)'}
                  </label>
                ))}
              </div>
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
  // marks[studentId][subjectId] = value — used for save (API needs ID)
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({});
  // marksByName[studentId][subjectName] = value — used for DISPLAY (immune to ID mismatch)
  const [marksByName, setMarksByName] = useState<Record<string, Record<string, string>>>({}); 
  const [filters, setFilters] = useState({ termId: '', classId: '', sectionId: '', baseSubject: '', examType: 'FULL' }); // examType: PT | FULL
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

  // Active subjects filtered by examType
  const activeSubjects: any[] = subjects.filter((s: any) => {
    const parts = s.subjectName.split('|');
    const base  = parts[0];
    const comp  = parts[1] || 'MAIN';
    const matchClass   = !filters.classId || s.classId === filters.classId;
    const matchBase    = !filters.baseSubject || filters.baseSubject === 'ALL' || base === filters.baseSubject;
    const matchExamType = filters.examType === 'PT' ? comp === 'PT' : true;
    return matchClass && matchBase && matchExamType;
  });

  useEffect(() => {
    examsApi.getTerms().then(r => setTerms(r.data.data || [])).catch(() => {});
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setSubjects([]); setStudents([]); setMarks({}); setMarksByName({}); setBulkErrors([]);
    if (filters.termId) {
      examsApi.getSubjects(filters.termId).then(r => setSubjects(r.data.data || [])).catch(() => {});
      // Auto-select examType based on term name: if term name contains "PT" or "Periodic" → PT mode
      const term = terms.find((t: any) => t.id === filters.termId);
      if (term) {
        const n = (term.name || '').toLowerCase();
        const isPT = n.includes('periodic') || n.includes(' pt') || n.startsWith('pt') || n.endsWith(' pt');
        setFilters(p => ({ ...p, examType: isPT ? 'PT' : 'FULL' }));
      }
    }
  }, [filters.termId, terms]);

  useEffect(() => {
    setSections([]); setStudents([]); setMarks({}); setMarksByName({}); setBulkErrors([]);
    if (filters.classId) studentsApi.getSections(filters.classId).then(r => setSections(r.data.data || [])).catch(() => {});
  }, [filters.classId]);

  useEffect(() => { setStudents([]); setMarks({}); setMarksByName({}); setBulkErrors([]); }, [filters.sectionId, filters.baseSubject]);

  // Build marksByName from a marks-by-ID map + subjects array
  // marksByName[studentId][subjectName] = value
  const buildMarksByName = (
    marksById: Record<string, Record<string, string>>,
    subjectList: any[]
  ): Record<string, Record<string, string>> => {
    const byId: Record<string, string> = {}; // subjectId → subjectName
    subjectList.forEach((sub: any) => { byId[sub.id] = sub.subjectName; });
    const result: Record<string, Record<string, string>> = {};
    Object.entries(marksById).forEach(([studentId, subMap]) => {
      result[studentId] = {};
      Object.entries(subMap).forEach(([subId, val]) => {
        const name = byId[subId];
        if (name) result[studentId][name] = val;
      });
    });
    return result;
  };

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
      // Initialize marks with ALL subjects for this term+class (not just visible activeSubjects)
      // so upload works correctly regardless of current examType filter.
      const allClassSubjects = subjects.filter(
        (s: any) => !filters.classId || s.classId === filters.classId
      );
      const m: Record<string, Record<string, string>> = {};
      studs.forEach((s: any) => {
        m[s.id] = {};
        allClassSubjects.forEach((sub: any) => { m[s.id][sub.id] = ''; });
      });
      setMarks(m);
      setMarksByName(buildMarksByName(m, allClassSubjects));
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const setMark = (sid: string, subId: string, subjectName: string, val: string) => {
    setMarks(p => ({ ...p, [sid]: { ...p[sid], [subId]: val } }));
    setMarksByName(p => ({ ...p, [sid]: { ...p[sid], [subjectName]: val } }));
  };

  const saveMarks = async () => {
    setSaving(true);
    try {
      // Build payload: one entry per subject with all student marks
      const bySubject: Record<string, Array<{ studentId: string; marksObtained: number }>> = {};
      students.forEach((s: any) => {
        const studentMarks = marks[s.id] || {};
        Object.entries(studentMarks).forEach(([subId, val]) => {
          if (val !== '' && val !== undefined && val !== null) {
            if (!bySubject[subId]) bySubject[subId] = [];
            bySubject[subId].push({ studentId: s.id, marksObtained: Number(val) });
          }
        });
      });
      const payloads = Object.entries(bySubject).map(([subjectId, m]) => ({ subjectId, marks: m }));
      if (payloads.length === 0) { setSaving(false); return toast.error('No marks entered'); }

      // ── Sequential save to avoid DB connection pool exhaustion (500 errors) ──
      // Fire requests one at a time instead of all simultaneously.
      let saved = 0;
      let failed = 0;
      for (const payload of payloads) {
        try {
          await examsApi.enterMarks(payload);
          saved++;
        } catch {
          failed++;
        }
      }

      if (failed === 0) {
        toast.success(`All marks saved! (${saved} subject groups)`);
      } else if (saved > 0) {
        toast.error(`${saved} saved, ${failed} failed — try again for the failed ones`);
      } else {
        toast.error('Save failed — check your connection and try again');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save marks');
    } finally { setSaving(false); }
  };

  // ── Template download — multi-sheet format matching school Excel standard ──
  const downloadTemplate = async () => {
    if (students.length === 0) return toast.error('Load students first');
    const XLSX = await import('xlsx');

    const term       = terms.find((t: any) => t.id === filters.termId);
    const cls        = classes.find((c: any) => c.id === filters.classId);
    const termNum    = term?.termNumber ?? 1;
    const mainLabel  = termNum === 2 ? 'Annual' : 'MidTerm';
    const termSuffix = `Term${termNum}`;
    const isPTOnly   = filters.examType === 'PT';

    const bases = Array.from(new Set(activeSubjects.map((s: any) => s.subjectName.split('|')[0]))).sort();

    // ── Fetch existing saved marks to pre-fill the template ──────────────
    let existingResults: any[] = [];
    try {
      const r = await examsApi.getResults({ termId: filters.termId, classId: filters.classId });
      existingResults = r.data.data || [];
    } catch { /* no saved marks yet — template will be blank */ }

    // Map: admissionNumber → SubjectResult[]
    const savedMap = new Map<string, Record<string, Record<string, number>>>();
    existingResults.forEach((studentRes: any) => {
      const admNo = students.find((s: any) => s.id === studentRes.studentId)?.admissionNumber
                 || studentRes.admissionNumber;
      if (!admNo) return;
      const subMap: Record<string, Record<string, number>> = {};
      (studentRes.subjects || []).forEach((sub: any) => {
        subMap[sub.subjectName] = {
          PT:   sub.ptObtained   ?? 0,
          NB:   sub.nbObtained   ?? 0,
          SE:   sub.seObtained   ?? 0,
          MAIN: sub.mainObtained ?? 0,
        };
      });
      savedMap.set(String(admNo).trim(), subMap);
    });

    // Helper: get pre-filled value for a student+subject+component
    const prefill = (student: any, base: string, comp: string): any => {
      const admNo = String(student.admissionNumber).trim();
      const val   = savedMap.get(admNo)?.[base]?.[comp];
      if (val === undefined || val === 0) return '';
      return val;
    };

    const headerRow = (maxLabel: (base: string) => string) =>
      ['ROLLNo', 'NAME', 'FNAME', 'CLROLL', ...bases.map(maxLabel)];

    const buildRows = (comp: string) =>
      students.map((s: any) => [
        s.admissionNumber,
        s.name,
        s.fatherName || s.parentName || '',
        s.rollNumber || '',
        ...bases.map(base => prefill(s, base, comp)),
      ]);

    const colWidths = [{ wch: 18 }, { wch: 28 }, { wch: 28 }, { wch: 8 }, ...bases.map(() => ({ wch: 14 }))];
    const wb = XLSX.utils.book_new();

    if (isPTOnly) {
      const data = [headerRow(base => `${base}(MAX-20)`), ...buildRows('PT')];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, `Pre-${mainLabel}${termSuffix}`);
    } else {
      const existingComps = new Set(activeSubjects.map((s: any) => s.subjectName.split('|')[1] || 'MAIN'));
      const allSheets = [
        { comp: 'PT',   name: `Pre-${mainLabel}${termSuffix}`, label: (b: string) => `${b}(MAX-20)` },
        { comp: 'NB',   name: `NoteBook${termSuffix}`,         label: (b: string) => `${b}(MAX-5)`  },
        { comp: 'SE',   name: `SubEnrichment${termSuffix}`,    label: (b: string) => `${b}(MAX-5)`  },
        { comp: 'MAIN', name: `${mainLabel}${termSuffix}`,     label: (b: string) => `${b}(${mainLabel}-80)` },
      ];
      allSheets.filter(sh => existingComps.has(sh.comp)).forEach(sh => {
        const data = [headerRow(sh.label), ...buildRows(sh.comp)];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, sh.name);
      });
    }

    const hasPrefilled = existingResults.length > 0;
    const fileName = `${cls?.name || 'Class'}_${termSuffix}${isPTOnly ? '_PT' : ''}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(hasPrefilled
      ? 'Template downloaded with pre-filled marks — update and re-upload'
      : 'Template downloaded — fill marks and upload');
  };

  // ── Bulk upload ──────────────────────────────────────────────────────────────
  const uploadBulkMarks = async (file: File) => {
    if (students.length === 0) return toast.error('Load students first');

    const XLSX = await import('xlsx');
    const ab   = await file.arrayBuffer();
    const wb   = XLSX.read(ab);

    // ── All subjects for this term+class (ALL 4 components, ignore examType filter) ──
    const allSubjects = subjects.filter(
      (s: any) => !filters.classId || s.classId === filters.classId
    );

    // Build lookup maps keyed by subjectName for O(1) access
    // subjectName format in DB: "Hindi|PT", "Hindi|NB", "Hindi|SE", "Hindi|MAIN"
    const subByName     = new Map<string, any>();  // exact
    const subByNameLow  = new Map<string, any>();  // lowercase key
    allSubjects.forEach((s: any) => {
      subByName.set(s.subjectName, s);
      subByNameLow.set(s.subjectName.toLowerCase(), s);
    });

    // Helper: find subject by base name + component code with multiple fallbacks
    const findSub = (base: string, comp: string): any => {
      const key      = base + '|' + comp;
      const keyLow   = key.toLowerCase();
      // 1. Exact match
      if (subByName.has(key))    return subByName.get(key);
      // 2. Case-insensitive
      if (subByNameLow.has(keyLow)) return subByNameLow.get(keyLow);
      // 3. Normalize: strip extra spaces, then try again
      const normBase = base.replace(/\s+/g, ' ').trim();
      const normKey  = normBase + '|' + comp;
      if (subByName.has(normKey))    return subByName.get(normKey);
      if (subByNameLow.has(normKey.toLowerCase())) return subByNameLow.get(normKey.toLowerCase());
      // 4. Partial: DB subject base starts with Excel base (e.g. "English" vs "ENG")
      for (const [storedName, sub] of subByName) {
        const [storedBase, storedComp] = storedName.split('|');
        if (storedComp !== comp) continue;
        const sb = storedBase.toLowerCase();
        const eb = base.toLowerCase();
        if (sb.startsWith(eb) || eb.startsWith(sb)) return sub;
      }
      return null;
    };

    // Map admission number → student (for data row lookup)
    const admMap = new Map(students.map((s: any) => [String(s.admissionNumber).trim(), s]));

    // ── Detect component from sheet name ────────────────────────────────────────
    const detectComp = (name: string): string => {
      const n = name.toLowerCase();
      if (n.startsWith('pre') || n.includes('periodic') || n.includes('premia'))  return 'PT';
      if (n.includes('notebook') || n.includes('note book'))                       return 'NB';
      if (n.includes('enrichment') || n.includes('enrich'))                        return 'SE';
      if (n.includes('annual') || n.includes('midterm') || n.includes('mid term')) return 'MAIN';
      if (n.includes('main') || n.includes('term exam') || n.includes('terminal')) return 'MAIN';
      // 'mid' alone can falsely match 'midterm' inside other words — check last
      if (/\bmid\b/.test(n))                                                      return 'MAIN';
      if (n.includes('term'))                                                       return 'MAIN';
      return 'PT'; // fallback
    };

    const SKIP_SHEETS = /coscholastic|working.day|attendance|activity|co.scholastic/i;

    // ── Initialise newMarks with ALL subject IDs so table can render everything ──
    const newMarks: Record<string, Record<string, string>> = {};
    students.forEach((s: any) => {
      newMarks[s.id] = {};
      allSubjects.forEach((sub: any) => { newMarks[s.id][sub.id] = ''; });
    });

    const errors: any[]  = [];
    let   totalLoaded    = 0;
    const sheetReport: string[] = [];

    // ── DEBUG: log DB subjects once ─────────────────────────────────────────────
    console.group('%c📊 Bulk Marks Upload', 'font-size:14px;font-weight:bold;color:#2563eb');
    console.log('DB subjects for this class:', allSubjects.map((s: any) => s.subjectName));
    console.log('Sheets in file:', wb.SheetNames);

    // ── Process each sheet ──────────────────────────────────────────────────────
    wb.SheetNames.forEach((sheetName: string) => {
      if (SKIP_SHEETS.test(sheetName)) {
        console.log(`⏭ Skip "${sheetName}" (co-scholastic / working days)`);
        return;
      }

      const compCode = detectComp(sheetName);
      console.group(`📄 Sheet: "${sheetName}" → component: ${compCode}`);

      if (filters.examType === 'PT' && compCode !== 'PT') {
        console.log('⏭ Skipped (PT-only mode active)');
        console.groupEnd();
        return;
      }

      const ws   = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rows.length < 2) {
        console.warn('⚠ Sheet has fewer than 2 rows — skipping');
        console.groupEnd();
        return;
      }

      const header = rows[0] as any[];
      console.log('Header row:', header);

      // ── Build subject column map ──────────────────────────────────────────────
      const subjectCols: Array<{ idx: number; base: string; max: number; subId: string; subName: string }> = [];
      let skippedCols = 0;

      header.forEach((h: any, ci: number) => {
        if (ci < 4) return;                              // skip id columns
        const colStr = String(h ?? '').trim();
        if (!colStr) return;

        // Extract base name: everything before the first '(' or '['
        const base = colStr.split('(')[0].split('[')[0].trim();
        if (!base) return;

        // Extract max from header number, e.g. "(MAX-20)" → 20, "(80)" → 80
        const digits = colStr.match(/\d+/g);
        const maxFromHeader = digits ? parseInt(digits[digits.length - 1], 10) : null;
        const defaultMax    = compCode === 'PT' ? 20 : compCode === 'MAIN' ? 80 : 5;
        const max           = (maxFromHeader && maxFromHeader > 0) ? maxFromHeader : defaultMax;

        const sub = findSub(base, compCode);
        if (!sub) {
          console.warn(`  ✗ ci=${ci} col="${colStr}" base="${base}" → NO MATCH for "${base}|${compCode}" in DB`);
          skippedCols++;
          errors.push({
            row: '—', sheet: sheetName, admNo: '—', name: '—', col: base, marks: '—',
            issue: `Column "${base}" in sheet "${sheetName}": no subject named "${base}" found in DB for component ${compCode}. ` +
                   `DB has: [${allSubjects.filter((s:any)=>s.subjectName.endsWith('|'+compCode)).map((s:any)=>s.subjectName.split('|')[0]).join(', ')}]`,
          });
          return;
        }
        console.log(`  ✓ ci=${ci} col="${colStr}" → matched DB subject "${sub.subjectName}" (id:${sub.id.slice(0,8)}…) max=${max}`);
        subjectCols.push({ idx: ci, base, max, subId: sub.id, subName: sub.subjectName });
      });

      if (subjectCols.length === 0) {
        console.warn('⚠ No subject columns matched — sheet skipped entirely');
        console.warn('  DB subjects for comp', compCode, ':', allSubjects.filter((s:any)=>s.subjectName.endsWith('|'+compCode)).map((s:any)=>s.subjectName));
        console.groupEnd();
        return;
      }

      // ── Process data rows ─────────────────────────────────────────────────────
      const dataRows = rows.slice(1).filter((r: any[]) =>
        r[0] !== '' && r[0] != null && r[0] !== undefined && String(r[0]).trim() !== ''
      );

      let sheetLoaded = 0;
      let notFoundStudents = 0;

      dataRows.forEach((row: any[], ri: number) => {
        const admNo  = String(row[0] ?? '').trim();
        const student = admMap.get(admNo);
        if (!student) {
          if (admNo) notFoundStudents++;
          return;
        }

        subjectCols.forEach(({ idx, base, max, subId }) => {
          const cell = row[idx];
          const raw  = String(cell ?? '').trim();
          if (raw === '' || raw === '-' || raw === 'AB' || raw === 'abs') return;

          const val = Number(raw);
          if (isNaN(val)) {
            errors.push({ row: ri + 2, sheet: sheetName, admNo, name: student.name, col: base, marks: raw, issue: 'Not a number' });
            return;
          }
          if (val < 0) {
            errors.push({ row: ri + 2, sheet: sheetName, admNo, name: student.name, col: base, marks: val, issue: 'Negative marks' });
            return;
          }
          if (val > max) {
            errors.push({ row: ri + 2, sheet: sheetName, admNo, name: student.name, col: base, marks: val, issue: `Exceeds max ${max}` });
            return;
          }
          newMarks[student.id][subId] = String(val);
          sheetLoaded++;
        });
      });

      if (notFoundStudents > 0) {
        console.warn(`  ⚠ ${notFoundStudents} admission numbers not found in loaded students`);
      }
      console.log(`  ✅ Loaded ${sheetLoaded} marks from ${dataRows.length} rows (${skippedCols} cols skipped)`);
      console.groupEnd();

      totalLoaded += sheetLoaded;
      sheetReport.push(`${sheetName}(${compCode}):${sheetLoaded}`);
    });

    // ── Final summary ────────────────────────────────────────────────────────────
    const loadedByComp: Record<string, number> = {};
    students.forEach((s: any) => {
      allSubjects.forEach((sub: any) => {
        const comp = sub.subjectName.split('|')[1] || 'MAIN';
        const val  = newMarks[s.id]?.[sub.id];
        if (val && val !== '') loadedByComp[comp] = (loadedByComp[comp] || 0) + 1;
      });
    });
    console.log('📈 Marks loaded by component:', loadedByComp);
    console.log('📈 Total:', totalLoaded, '| Errors:', errors.length);
    console.groupEnd();

    setBulkErrors(errors);
    setMarks(newMarks);
    // Build and set marksByName so table renders immediately using stable string keys
    const newMarksByName: Record<string, Record<string, string>> = {};
    students.forEach((s: any) => {
      newMarksByName[s.id] = {};
      allSubjects.forEach((sub: any) => {
        const val = newMarks[s.id]?.[sub.id];
        if (val !== undefined) newMarksByName[s.id][sub.subjectName] = val;
      });
    });
    setMarksByName(newMarksByName);

    const configErrors = errors.filter(e => e.row === '—').length;
    if (totalLoaded === 0 && configErrors > 0) {
      toast.error('Subject names in Excel do not match DB — open browser console (F12) for details', { duration: 10000 });
    } else if (errors.length > 0) {
      toast.error(`${errors.length} issue(s) — ${totalLoaded} marks loaded. Check table below.`, { duration: 5000 });
    } else {
      toast.success(`${totalLoaded} marks loaded (${sheetReport.join(', ')}) — click Save`);
    }

    if (bulkRef.current) bulkRef.current.value = '';
  };

  // All subjects for this term+class — used for TABLE DISPLAY (shows all 4 components always)
  const allClassSubjects = subjects.filter(
    (s: any) => !filters.classId || s.classId === filters.classId
  );

  const filledCount = students.filter((s: any) => {
    const m = marksByName[s.id] || {};
    return Object.values(m).some(v => v !== '' && v !== undefined);
  }).length;

  // Base names from ALL subjects (not filtered by examType) so table always shows all bases
  const activeBases = Array.from(new Set(allClassSubjects.map((s: any) => s.subjectName.split('|')[0]))).sort();

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
        {/* ── Exam Mode Selector ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="form-label">Exam Mode</label>
          <div className="flex gap-1.5">
            {/* PT button */}
            <button
              type="button"
              onClick={() => { setFilters(p => ({ ...p, examType: 'PT' })); setStudents([]); setMarks({}); setMarksByName({}); }}
              className={
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ' +
                (filters.examType === 'PT'
                  ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600')
              }
            >
              <span className="text-sm">📝</span>
              <span>Periodic Test</span>
              <div className="flex gap-0.5 mt-0.5">
                <span className={
                  'px-1 py-0 rounded text-[9px] font-bold ' +
                  (filters.examType === 'PT' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400')
                }>PT</span>
              </div>
            </button>
            {/* FULL button */}
            <button
              type="button"
              onClick={() => { setFilters(p => ({ ...p, examType: 'FULL' })); setStudents([]); setMarks({}); setMarksByName({}); }}
              className={
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ' +
                (filters.examType === 'FULL'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-primary-300 hover:text-primary-600')
              }
            >
              <span className="text-sm">📋</span>
              <span>Full Term</span>
              <div className="flex gap-0.5 mt-0.5">
                {['PT','NB','SE','Main'].map(c => (
                  <span key={c} className={
                    'px-1 py-0 rounded text-[9px] font-bold ' +
                    (filters.examType === 'FULL' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400')
                  }>{c}</span>
                ))}
              </div>
            </button>
          </div>
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

      {/* ── Active components indicator ─────────────────────────────────── */}
      {filters.termId && filters.classId && (
        <div className={
          'flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ' +
          (filters.examType === 'PT'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-primary-50 border-primary-200')
        }>
          <span className={
            'font-semibold text-xs uppercase tracking-wide ' +
            (filters.examType === 'PT' ? 'text-amber-600' : 'text-primary-600')
          }>
            {filters.examType === 'PT' ? '📝 Periodic Test Mode' : '📋 Full Term Mode'}
          </span>
          <span className="text-slate-400 text-xs">Active components:</span>
          {filters.examType === 'PT' ? (
            <>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold">
                PT <span className="opacity-75 font-normal">(enter /20 → saved as /10)</span>
              </span>
              <span className="text-xs text-amber-600 ml-auto">Only Periodic Test marks will be entered and uploaded</span>
            </>
          ) : (
            <>
              {[
                { code: 'PT',   label: 'PT /20→10',  color: 'bg-violet-500' },
                { code: 'NB',   label: 'Notebook /5', color: 'bg-blue-500'   },
                { code: 'SE',   label: 'Sub.Enrich /5',color: 'bg-teal-500'  },
                { code: 'MAIN', label: (terms.find((t:any)=>t.id===filters.termId)?.termNumber===2?'Annual':'Mid Term') + ' /80', color: 'bg-primary-600' },
              ].map(c => (
                <span key={c.code} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${c.color} text-white text-xs font-bold`}>
                  {c.code} <span className="opacity-80 font-normal text-[10px]">{c.label.split('/')[1] ? '/' + c.label.split('/')[1] : ''}</span>
                </span>
              ))}
              <span className="text-xs text-primary-600 ml-auto">= 100 marks per subject</span>
            </>
          )}
        </div>
      )}

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
                    const found = allClassSubjects.find((s: any) => s.subjectName === `${base}|${comp.code}`);
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
                // Read from marksByName (stable string keys) — immune to subject-ID mismatch
                const sMarks = marksByName[s.id] || {};
                const anyOver = activeBases.some(base =>
                  COMPONENTS.some(comp => {
                    const subName = `${base}|${comp.code}`;
                    const v = sMarks[subName];
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
                        const subName    = `${base}|${comp.code}`;
                        // Check if this subject exists in DB at all
                        const subExists  = !!allClassSubjects.find((x: any) => x.subjectName === subName);
                        if (!subExists) return <td key={subName} className="text-center text-slate-200 border-l border-slate-100">—</td>;
                        const isEditable = !!activeSubjects.find((x: any) => x.subjectName === subName);
                        // Read value directly by name — no UUID lookup
                        const val  = sMarks[subName] ?? '';
                        const over = val !== '' && Number(val) > comp.max;
                        tabIdx++;
                        // For onChange we need the sub ID — look it up only when user types
                        return (
                          <td key={subName} className="p-1 border-l border-slate-100">
                            <input
                              type="number" min={0} max={comp.max}
                              value={val}
                              onChange={e => {
                                if (!isEditable) return;
                                const sub = allClassSubjects.find((x: any) => x.subjectName === subName);
                                if (sub) setMark(s.id, sub.id, subName, e.target.value);
                              }}
                              readOnly={!isEditable}
                              tabIndex={isEditable ? tabIdx : -1}
                              placeholder="—"
                              className={
                                'form-input text-center py-1 text-sm w-full ' +
                                (over ? 'border-red-400 bg-red-50 ' : '') +
                                (!isEditable && val ? 'bg-slate-50 text-slate-500 cursor-default ' : '') +
                                (!isEditable && !val ? 'bg-slate-50 text-slate-300 cursor-default ' : '')
                              }
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

// ─────────────────────────────────────────────────────────
// View / Update Marks
// ─────────────────────────────────────────────────────────
function ViewUpdateMarks() {
  const [terms,    setTerms]    = useState<any[]>([]);
  const [classes,  setClasses]  = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]); // raw ExamSubject records for this term+class
  const [students, setStudents] = useState<any[]>([]);
  const [filters,  setFilters]  = useState({ termId: '', classId: '', sectionId: '', subjectFilter: 'ALL' });
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);

  // marks[studentId][subjectName] = string value (by name — immune to ID mismatch)
  const [editMarks, setEditMarks] = useState<Record<string, Record<string, string>>>({});

  const f = (k: string, v: string) => setFilters(p => ({ ...p, [k]: v }));

  useEffect(() => {
    examsApi.getTerms().then(r => setTerms(r.data.data || [])).catch(() => {});
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setSections([]); setStudents([]); setSubjects([]); setEditMarks({}); setDirty(false);
    if (filters.classId) studentsApi.getSections(filters.classId).then(r => setSections(r.data.data || [])).catch(() => {});
  }, [filters.classId]);

  useEffect(() => {
    setStudents([]); setSubjects([]); setEditMarks({}); setDirty(false);
  }, [filters.termId, filters.sectionId]);

  const term      = terms.find((t: any) => t.id === filters.termId);
  const mainLabel = (term?.termNumber ?? 1) === 2 ? 'Annual' : 'Mid Term';

  // All base subject names available for this term+class
  const baseNames: string[] = Array.from(
    new Set(subjects.filter((s: any) => !filters.classId || s.classId === filters.classId)
              .map((s: any) => s.subjectName.split('|')[0]))
  ).sort();

  // Subjects visible given the subject filter
  const visibleBases = filters.subjectFilter === 'ALL' ? baseNames : baseNames.filter(b => b === filters.subjectFilter);

  const load = async () => {
    if (!filters.termId || !filters.classId) return toast.error('Select term and class');
    setLoading(true);
    try {
      const [subjR, resultR, studR] = await Promise.all([
        examsApi.getSubjects(filters.termId),
        examsApi.getResults({ termId: filters.termId, classId: filters.classId }),
        studentsApi.getAll({ classId: filters.classId, classSectionId: filters.sectionId || undefined, limit: 500 }),
      ]);

      const allSubjs: any[] = subjR.data.data || [];
      setSubjects(allSubjs);

      const results: any[] = resultR.data.data || [];
      const studs: any[]   = (Array.isArray(studR.data.data) ? studR.data.data : [])
        .sort((a: any, b: any) => parseInt(a.rollNumber || '9999') - parseInt(b.rollNumber || '9999'));
      setStudents(studs);

      // Pre-fill editMarks from result data
      // IMPORTANT: backend returns 0 (not null) when no mark record exists (uses ?? 0 default).
      // We only pre-fill a cell when the value is > 0 so unenterd cells stay blank.
      // Legitimately-entered 0 marks will also show blank (acceptable edge case).
      const m: Record<string, Record<string, string>> = {};
      studs.forEach((s: any) => {
        m[s.id] = {};
        const res = results.find((r: any) => r.studentId === s.id);
        if (res) {
          (res.subjects || []).forEach((sub: any) => {
            // Only store non-zero values — 0 means "not entered" in this API
            if (sub.ptObtained   > 0) m[s.id][`${sub.subjectName}|PT`]   = String(sub.ptObtained);
            if (sub.nbObtained   > 0) m[s.id][`${sub.subjectName}|NB`]   = String(sub.nbObtained);
            if (sub.seObtained   > 0) m[s.id][`${sub.subjectName}|SE`]   = String(sub.seObtained);
            if (sub.mainObtained > 0) m[s.id][`${sub.subjectName}|MAIN`] = String(sub.mainObtained);
          });
        }
      });
      setEditMarks(m);
      setDirty(false);
      toast.success(`Loaded ${studs.length} students`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  const setCell = (studentId: string, subjectName: string, val: string) => {
    setEditMarks(p => ({ ...p, [studentId]: { ...p[studentId], [subjectName]: val } }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    // Build bySubjectId: subjectId → [{studentId, marksObtained}]
    // Need to resolve subjectName → subjectId from subjects array
    const bySubId: Record<string, Array<{ studentId: string; marksObtained: number }>> = {};

    students.forEach((s: any) => {
      const sMarks = editMarks[s.id] || {};
      Object.entries(sMarks).forEach(([subjectName, val]) => {
        if (val === '' || val === undefined || val === null || String(val).trim() === '') return;
        const sub = subjects.find((x: any) => x.subjectName === subjectName && (!filters.classId || x.classId === filters.classId));
        if (!sub) return;
        if (!bySubId[sub.id]) bySubId[sub.id] = [];
        bySubId[sub.id].push({ studentId: s.id, marksObtained: Number(val) });
      });
    });

    const payloads = Object.entries(bySubId).map(([subjectId, marks]) => ({ subjectId, marks }));
    if (payloads.length === 0) { setSaving(false); return toast.error('No marks to save'); }

    let saved = 0, failed = 0;
    for (const payload of payloads) {
      try { await examsApi.enterMarks(payload); saved++; }
      catch { failed++; }
    }
    setSaving(false);
    setDirty(false);
    if (failed === 0) toast.success(`${saved} subject groups saved!`);
    else toast.error(`${saved} saved, ${failed} failed`);
  };

  const changedCount = students.filter((s: any) => {
    const m = editMarks[s.id] || {};
    return Object.values(m).some((v: any) => v !== '' && v !== undefined && v !== null && String(v).trim() !== '');
  }).length;

  return (
    <div className="space-y-4">
      {/* ── Filter bar ─────────────────────────────────────────────── */}
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
        <button onClick={load} disabled={!filters.termId || !filters.classId || loading} className="btn-primary">
          {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Loading…</> : 'Load Marks'}
        </button>

        {/* Subject filter — appears after load */}
        {baseNames.length > 0 && (
          <div className="ml-2">
            <label className="form-label">Subject</label>
            <select value={filters.subjectFilter} onChange={e => f('subjectFilter', e.target.value)} className="form-select w-48">
              <option value="ALL">All Subjects</option>
              {baseNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}

        {/* Save button — right side */}
        {students.length > 0 && (
          <button
            onClick={save}
            disabled={saving || !dirty}
            className={'ml-auto btn-primary ' + (dirty ? 'bg-emerald-600 hover:bg-emerald-700' : 'opacity-50 cursor-not-allowed')}
          >
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving…</>
              : <><Save className="w-4 h-4"/>{dirty ? `Save Changes (${changedCount} students)` : 'No changes'}</>
            }
          </button>
        )}
      </div>

      {/* ── Empty / loading state ───────────────────────────────────── */}
      {loading && (
        <div className="card p-10 text-center">
          <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/>
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="card p-12 text-center text-slate-400 text-sm">
          Select term, class and click Load Marks
        </div>
      )}

      {/* ── Marks table ────────────────────────────────────────────── */}
      {!loading && students.length > 0 && (
        <div className="card overflow-auto">
          <table className="tbl" style={{ minWidth: '700px' }}>
            <thead>
              {/* Row 1: Subject group headers */}
              <tr>
                <th rowSpan={2} className="w-8 text-center">#</th>
                <th rowSpan={2}>Student</th>
                <th rowSpan={2} className="w-14 text-center">Roll</th>
                {visibleBases.map(base => (
                  <th key={base} colSpan={4} className="text-center border-l-2 border-slate-300 bg-primary-50 text-primary-700 font-bold">
                    {base}
                  </th>
                ))}
              </tr>
              {/* Row 2: PT / NB / SE / MAIN sub-headers */}
              <tr>
                {visibleBases.map(base => (
                  ['PT','NB','SE','MAIN'].map(comp => {
                    const maxLabel = comp === 'PT' ? '/20' : comp === 'MAIN' ? '/80' : '/5';
                    const compLabel = comp === 'MAIN' ? mainLabel : comp;
                    return (
                      <th key={`${base}|${comp}`} className="text-center border-l border-slate-200 text-xs font-semibold whitespace-nowrap py-1.5">
                        <div className="font-bold">{compLabel}</div>
                        <div className="text-slate-400 font-normal text-[10px]">{maxLabel}</div>
                      </th>
                    );
                  })
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s: any, si: number) => {
                const sMarks = editMarks[s.id] || {};
                const hasAny = Object.values(sMarks).some(v => v !== '');
                return (
                  <tr key={s.id} className={hasAny ? '' : 'bg-slate-50/50'}>
                    <td className="text-xs text-slate-400 text-center">{si + 1}</td>
                    <td>
                      <p className="font-medium text-sm leading-tight">{s.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{s.admissionNumber}</p>
                    </td>
                    <td className="text-sm text-center text-slate-500">{s.rollNumber || '—'}</td>

                    {visibleBases.map(base =>
                      (['PT','NB','SE','MAIN'] as const).map(comp => {
                        const subjectName = `${base}|${comp}`;
                        const max = comp === 'PT' ? 20 : comp === 'MAIN' ? 80 : 5;
                        const val = sMarks[subjectName] ?? '';
                        const over = val !== '' && Number(val) > max;
                        const empty = val === '';
                        return (
                          <td key={subjectName} className={`p-1 border-l border-slate-100 ${comp === 'PT' ? 'border-l-slate-200' : ''}`}>
                            <input
                              type="number"
                              min={0}
                              max={max}
                              value={val}
                              placeholder="—"
                              onChange={e => setCell(s.id, subjectName, e.target.value)}
                              className={
                                'form-input text-center py-1 text-sm w-full min-w-[52px] ' +
                                (over  ? 'border-red-400 bg-red-50 text-red-700 ' : '') +
                                (empty ? 'bg-slate-50 text-slate-300 ' : 'bg-white text-slate-800 font-medium ')
                              }
                            />
                            {over && <p className="text-[10px] text-red-500 text-center">max {max}</p>}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer summary */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {students.length} students · {visibleBases.length} subject{visibleBases.length !== 1 ? 's' : ''} shown
              {filters.subjectFilter !== 'ALL' && <span className="ml-2 badge badge-blue">{filters.subjectFilter}</span>}
            </p>
            {dirty && (
              <button onClick={save} disabled={saving} className="btn-primary text-sm py-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Save className="w-3.5 h-3.5"/>Save Changes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
