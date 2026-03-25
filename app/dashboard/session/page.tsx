'use client';
import { useState, useEffect } from 'react';
import { Plus, BookOpen, CheckCircle, ArrowRight, Settings, Edit, AlertCircle, Info } from 'lucide-react';
import { sessionApi } from '@/lib/api';
import { fmt } from '@/lib/utils';
import { Modal, Tabs, Empty } from '@/components/ui';
import toast from 'react-hot-toast';

export default function SessionPage() {
  const [tab, setTab] = useState('years');
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="page-header">
        <div><h1 className="page-title">Session & Years</h1><p className="page-sub">Manage academic years, session configuration and student promotion</p></div>
      </div>
      <Tabs tabs={[{key:'years',label:'Academic Years'},{key:'config',label:'Session Config'},{key:'promotion',label:'Student Promotion'}]} active={tab} onChange={setTab}/>
      {tab==='years'     && <AcademicYears/>}
      {tab==='config'    && <SessionConfig/>}
      {tab==='promotion' && <StudentPromotion/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Academic Years
// ─────────────────────────────────────────────────────────────────
function AcademicYears() {
  const [years,    setYears]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [setting,  setSetting]  = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    sessionApi.getYears()
      .then(r => setYears(r.data.data || []))
      .catch(() => toast.error('Failed to load academic years'))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []);

  const setCurrent = async (id: string) => {
    setSetting(id);
    try {
      await sessionApi.setCurrentYear(id);
      toast.success('Current year updated!');
      load();
    } catch(err:any) {
      toast.error(err.response?.data?.message || 'Failed to set current year');
    } finally {
      setSetting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Academic Year</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_,i)=><div key={i} className="h-16 card animate-pulse"/>)}</div>
      ) : years.length === 0 ? (
        <Empty icon={BookOpen} title="No academic years added yet"
          sub="Start by adding the current academic year e.g. 2025-2026"
          action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Year</button>}/>
      ) : (
        <div className="space-y-3">
          {years.map((y:any) => (
            <div key={y.id} className={`card p-4 flex items-center gap-4 transition-all ${y.isCurrent ? 'border-primary-300 bg-primary-50/30 shadow-sm' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-primary-600"/>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800">{y.name}</p>
                  {y.isCurrent && <span className="badge badge-green">Current</span>}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {y.startDate ? fmt.date(y.startDate) : 'Start not set'}
                  {' – '}
                  {y.endDate   ? fmt.date(y.endDate)   : 'End not set'}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={()=>setEditItem(y)} className="btn-icon" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                {!y.isCurrent && (
                  <button
                    onClick={() => setCurrent(y.id)}
                    disabled={setting === y.id}
                    className="btn-secondary text-xs py-1.5 disabled:opacity-50"
                  >
                    {setting === y.id
                      ? <><div className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"/>Setting…</>
                      : <><CheckCircle className="w-3.5 h-3.5"/>Set Current</>
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd  && <YearModal onClose={()=>setShowAdd(false)}  onSuccess={()=>{setShowAdd(false); load();}}/>}
      {editItem && <YearModal year={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null); load();}}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// YearModal — does NOT send isCurrent in body (causes validation error)
// isCurrent is set separately via the set-current endpoint
// ─────────────────────────────────────────────────────────────────
function YearModal({ year, onClose, onSuccess }: any) {
  const editing = !!year;
  const [form, setForm] = useState({
    name:      year?.name       || '',
    startDate: year?.startDate  ? year.startDate.split('T')[0]  : '',
    endDate:   year?.endDate    ? year.endDate.split('T')[0]    : '',
  });
  const [setAsCurrent, setSetAsCurrent] = useState(year?.isCurrent || false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.name.trim()) e.name = 'Year name is required';
    if (form.startDate && form.endDate && form.startDate >= form.endDate)
      e.endDate = 'End date must be after start date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      // Only send name and dates — NOT isCurrent (causes validation error)
      const body: any = { name: form.name.trim() };
      if (form.startDate) body.startDate = form.startDate;
      if (form.endDate)   body.endDate   = form.endDate;

      let savedId = year?.id;
      if (editing) {
        await sessionApi.updateYear(year.id, body);
      } else {
        const r = await sessionApi.createYear(body);
        savedId = r.data.data?.id || r.data?.id;
      }

      // If "Set as current" checked — call set-current separately
      if (setAsCurrent && savedId && !year?.isCurrent) {
        await sessionApi.setCurrentYear(savedId);
      }

      toast.success(editing ? 'Year updated!' : 'Year created!');
      onSuccess();
    } catch(err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save';
      toast.error(msg);
      // Show inline validation errors if returned by backend
      if (err.response?.data?.errors) {
        const be: Record<string,string> = {};
        (err.response.data.errors as any[]).forEach(e => { if(e.field) be[e.field] = e.message; });
        if (Object.keys(be).length) setErrors(be);
      }
    } finally {
      setSaving(false);
    }
  };

  const f = (k: string, v: any) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => { const n={...p}; delete n[k]; return n; });
  };

  return (
    <Modal title={editing ? 'Edit Academic Year' : 'Add Academic Year'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="form-label">Year Name *</label>
          <input
            required
            value={form.name}
            onChange={e => f('name', e.target.value)}
            className={`form-input ${errors.name ? 'border-red-400' : ''}`}
            placeholder="e.g. 2025-2026"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Start Date</label>
            <input type="date" value={form.startDate} onChange={e=>f('startDate',e.target.value)} className="form-input"/>
          </div>
          <div>
            <label className="form-label">End Date</label>
            <input type="date" value={form.endDate} onChange={e=>f('endDate',e.target.value)} className={`form-input ${errors.endDate ? 'border-red-400' : ''}`}/>
            {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
          </div>
        </div>
        {!year?.isCurrent && (
          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-primary-300 transition-colors">
            <input type="checkbox" checked={setAsCurrent} onChange={e=>setSetAsCurrent(e.target.checked)} className="rounded text-primary-600"/>
            <span className="text-sm text-slate-600">Set as current academic year</span>
          </label>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving…</> : editing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// Session Config — shows what is actually returned by the API
// ─────────────────────────────────────────────────────────────────
function SessionConfig() {
  const [config,   setConfig]  = useState<any>(null);
  const [loading,  setLoading] = useState(true);
  const [saving,   setSaving]  = useState(false);
  const [rawKeys,  setRawKeys] = useState<string[]>([]);

  useEffect(() => {
    sessionApi.getConfig()
      .then(r => {
        const d = r.data.data || r.data || {};
        setConfig(d);
        setRawKeys(Object.keys(d));
      })
      .catch(() => {
        // API might not exist — show empty form
        setConfig({});
        setRawKeys([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Send only the keys that came from the server (avoid extra fields)
      const payload: any = {};
      if (rawKeys.length > 0) {
        rawKeys.forEach(k => { payload[k] = config[k]; });
      } else {
        // If API returned nothing, send the form values as-is
        Object.assign(payload, config);
      }
      await sessionApi.saveConfig(payload);
      toast.success('Configuration saved!');
    } catch(err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Save failed';
      const detail = err.response?.data?.errors
        ? ' — ' + (err.response.data.errors as any[]).map((e:any) => `${e.field}: ${e.message}`).join(', ')
        : '';
      toast.error(msg + detail);
    } finally {
      setSaving(false);
    }
  };

  const f = (k: string, v: any) => setConfig((p:any) => ({ ...p, [k]: v }));

  if (loading) return <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>;

  return (
    <form onSubmit={save} className="space-y-5 max-w-2xl">
      {/* Info banner */}
      <div className="card p-3 flex items-start gap-3 bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-blue-700">These settings apply school-wide. Fields shown are determined by what your backend configuration supports.</p>
      </div>

      <div className="card p-6 space-y-5">
        <h3 className="font-semibold text-slate-700 border-b border-slate-100 pb-3">School Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">School Name</label>
            <input value={config?.schoolName||config?.school_name||''} onChange={e=>f('schoolName',e.target.value)} className="form-input" placeholder="Sacred Heart School"/>
          </div>
          <div>
            <label className="form-label">CBSE Affiliation No.</label>
            <input value={config?.cbseAffiliationNo||config?.affiliationNo||config?.affiliation_no||''} onChange={e=>f('cbseAffiliationNo',e.target.value)} className="form-input" placeholder="e.g. 3420001"/>
          </div>
          <div>
            <label className="form-label">School Code</label>
            <input value={config?.schoolCode||config?.school_code||''} onChange={e=>f('schoolCode',e.target.value)} className="form-input" placeholder="e.g. 10001"/>
          </div>
          <div>
            <label className="form-label">Board</label>
            <select value={config?.board||'CBSE'} onChange={e=>f('board',e.target.value)} className="form-select">
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="STATE">State Board</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <h3 className="font-semibold text-slate-700 border-b border-slate-100 pb-3">Academic Rules</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Working Days / Week</label>
            <input type="number" min={1} max={7}
              value={config?.workingDaysPerWeek||config?.working_days_per_week||6}
              onChange={e=>f('workingDaysPerWeek',Number(e.target.value))} className="form-input"/>
          </div>
          <div>
            <label className="form-label">Min. Attendance % Required</label>
            <input type="number" min={0} max={100}
              value={config?.minAttendancePercent||config?.min_attendance_percent||75}
              onChange={e=>f('minAttendancePercent',Number(e.target.value))} className="form-input"/>
          </div>
          <div>
            <label className="form-label">Passing Marks %</label>
            <input type="number" min={0} max={100}
              value={config?.passingMarksPercent||config?.passing_marks_percent||33}
              onChange={e=>f('passingMarksPercent',Number(e.target.value))} className="form-input"/>
          </div>
          <div>
            <label className="form-label">Late Fee Fine (₹ / day)</label>
            <input type="number" min={0}
              value={config?.lateFinePerDay||config?.late_fine_per_day||0}
              onChange={e=>f('lateFinePerDay',Number(e.target.value))} className="form-input"/>
          </div>
        </div>
      </div>

      {/* Show any extra keys that came from the API but aren't in our form */}
      {rawKeys.filter(k => !['schoolName','cbseAffiliationNo','schoolCode','board','workingDaysPerWeek','minAttendancePercent','passingMarksPercent','lateFinePerDay','id','createdAt','updatedAt','school_name','affiliation_no','school_code','working_days_per_week','min_attendance_percent','passing_marks_percent','late_fine_per_day'].includes(k)).length > 0 && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-700 border-b border-slate-100 pb-3">Additional Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            {rawKeys.filter(k => !['schoolName','cbseAffiliationNo','schoolCode','board','workingDaysPerWeek','minAttendancePercent','passingMarksPercent','lateFinePerDay','id','createdAt','updatedAt','school_name','affiliation_no','school_code','working_days_per_week','min_attendance_percent','passing_marks_percent','late_fine_per_day'].includes(k)).map(k => (
              <div key={k}>
                <label className="form-label">{k.replace(/([A-Z])/g,' $1').replace(/_/g,' ').trim()}</label>
                <input value={config[k]||''} onChange={e=>f(k,e.target.value)} className="form-input"/>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="submit" disabled={saving} className="btn-primary px-8">
        {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving…</> : 'Save Configuration'}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────
// Student Promotion
// ─────────────────────────────────────────────────────────────────
function StudentPromotion() {
  const [years,     setYears]     = useState<any[]>([]);
  const [fromYear,  setFromYear]  = useState('');
  const [preview,   setPreview]   = useState<any>(null);
  const [draft,     setDraft]     = useState<any>(null);
  const [loading,   setLoading]   = useState(false);
  const [confirming,setConfirming]= useState(false);
  const [rolling,   setRolling]   = useState(false);

  useEffect(() => { sessionApi.getYears().then(r=>setYears(r.data.data||[])).catch(()=>{}); }, []);

  const loadPreview = async () => {
    if (!fromYear) return toast.error('Select a year first');
    setLoading(true); setDraft(null); setPreview(null);
    try { const r = await sessionApi.previewPromotion(fromYear); setPreview(r.data.data); }
    catch(err:any) { toast.error(err.response?.data?.message || 'Preview failed'); }
    finally { setLoading(false); }
  };

  const createDraft = async () => {
    setLoading(true);
    try {
      const r = await sessionApi.draftPromotion({ fromYearId: fromYear });
      setDraft(r.data.data);
      toast.success('Draft created — review and confirm');
    } catch(err:any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const confirm = async () => {
    if (!window.confirm('This will permanently promote all eligible students to the next class. Continue?')) return;
    setConfirming(true);
    try {
      await sessionApi.confirmPromotion({ fromYearId: fromYear, draftId: draft?.id });
      toast.success('Students promoted successfully!');
      setPreview(null); setDraft(null); setFromYear('');
    } catch(err:any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setConfirming(false); }
  };

  const rollback = async () => {
    if (!draft?.id) return toast.error('No draft to rollback');
    if (!window.confirm('This will undo the draft promotion. Continue?')) return;
    setRolling(true);
    try {
      await sessionApi.rollbackPromotion({ draftId: draft.id });
      toast.success('Rolled back!');
      setDraft(null); setPreview(null);
    } catch(err:any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setRolling(false); }
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="card p-4 flex items-start gap-3 bg-yellow-50 border-yellow-200">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"/>
        <div className="text-sm text-yellow-700">
          <p className="font-semibold">Use Draft → Review → Confirm workflow</p>
          <p className="mt-0.5 text-xs">Preview shows eligible students before you commit. A draft can be rolled back if needed.</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="form-label">From Academic Year *</label>
          <select value={fromYear} onChange={e=>setFromYear(e.target.value)} className="form-select">
            <option value="">Select year to promote from</option>
            {years.map((y:any) => <option key={y.id} value={y.id}>{y.name}{y.isCurrent?' (Current)':''}</option>)}
          </select>
        </div>
        <button onClick={loadPreview} disabled={!fromYear||loading} className="btn-primary w-full justify-center">
          {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Loading…</> : 'Preview Promotion'}
        </button>
      </div>

      {preview && !draft && (
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-slate-800">Promotion Preview</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-blue-50 rounded-xl"><p className="text-2xl font-bold text-blue-600">{preview.totalStudents||preview.total||0}</p><p className="text-xs text-slate-500 mt-0.5">Total</p></div>
            <div className="p-3 bg-green-50 rounded-xl"><p className="text-2xl font-bold text-green-600">{preview.eligible||preview.eligibleCount||0}</p><p className="text-xs text-slate-500 mt-0.5">Eligible</p></div>
            <div className="p-3 bg-red-50 rounded-xl"><p className="text-2xl font-bold text-red-600">{preview.notEligible||preview.ineligibleCount||0}</p><p className="text-xs text-slate-500 mt-0.5">Not Eligible</p></div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setPreview(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={createDraft} disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Creating…' : 'Create Draft'}
            </button>
          </div>
        </div>
      )}

      {draft && (
        <div className="card p-5 space-y-4 border-2 border-yellow-300 bg-yellow-50/30">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse"/>
            <h3 className="font-bold text-slate-800">Draft Ready</h3>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{draft.id}</span>
          </div>
          <p className="text-sm text-slate-500">Review the draft and confirm to finalize, or rollback to cancel.</p>
          <div className="flex gap-3">
            <button onClick={rollback} disabled={rolling}
              className="flex-1 btn-secondary border-red-200 text-red-600 hover:bg-red-50 justify-center">
              {rolling ? 'Rolling back…' : 'Rollback Draft'}
            </button>
            <button onClick={confirm} disabled={confirming}
              className="flex-1 btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500 justify-center">
              <ArrowRight className="w-4 h-4"/>
              {confirming ? 'Promoting…' : 'Confirm Promotion'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
