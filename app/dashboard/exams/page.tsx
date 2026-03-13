'use client';
import { useState, useEffect } from 'react';
import { Plus, BookOpen, Award, ChevronRight, X, Search } from 'lucide-react';
import { examsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ExamTerm { id: string; name: string; startDate: string; endDate: string; academicYear?: { name: string }; subjects?: any[]; }

export default function ExamsPage() {
  const [terms, setTerms] = useState<ExamTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<ExamTerm | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await examsApi.getTerms();
      setTerms(r.data.data || []);
    } catch { toast.error('Failed to load exam terms'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Exams & Marks</h1>
          <p className="text-white/40 text-sm mt-0.5">Manage exam terms, subjects & marks</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold">
          <Plus className="w-4 h-4" /> Add Exam Term
        </button>
      </div>

      {/* Exam terms grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 navy-card rounded-xl animate-pulse" />)}
        </div>
      ) : terms.length === 0 ? (
        <div className="navy-card rounded-xl p-16 text-center">
          <Award className="w-12 h-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 mb-2">No exam terms yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-gold mx-auto">Create First Exam Term</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {terms.map(term => (
            <div key={term.id} className="stat-card p-5 cursor-pointer hover:border-gold-500/30 transition-all group" onClick={() => setSelected(term)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-gold-500" />
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-gold-500 transition-colors" />
              </div>
              <h3 className="text-white font-semibold">{term.name}</h3>
              <p className="text-white/30 text-xs mt-1">{term.academicYear?.name}</p>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-white/30">
                <span>{formatDate(term.startDate)}</span>
                <span>—</span>
                <span>{formatDate(term.endDate)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <ExamTermDetail term={selected} onClose={() => setSelected(null)} />}
      {showAdd && <AddTermModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function ExamTermDetail({ term, onClose }: { term: ExamTerm; onClose: () => void }) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', maxMarks: '100', passingMarks: '33' });

  useEffect(() => {
    examsApi.getSubjects(term.id).then(r => setSubjects(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [term.id]);

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await examsApi.createSubject(term.id, { ...subjectForm, maxMarks: Number(subjectForm.maxMarks), passingMarks: Number(subjectForm.passingMarks) });
      toast.success('Subject added!');
      const r = await examsApi.getSubjects(term.id);
      setSubjects(r.data.data || []);
      setShowAddSubject(false);
      setSubjectForm({ name: '', code: '', maxMarks: '100', passingMarks: '33' });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="font-display text-lg font-bold text-white">{term.name}</h2>
            <p className="text-white/30 text-xs">{formatDate(term.startDate)} — {formatDate(term.endDate)}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-white/40" /></button>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/60 text-sm font-medium">Subjects ({subjects.length})</p>
            <button onClick={() => setShowAddSubject(!showAddSubject)} className="btn-outline text-xs py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </button>
          </div>

          {showAddSubject && (
            <form onSubmit={addSubject} className="bg-navy-900 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label text-xs">Subject Name *</label>
                  <input required value={subjectForm.name} onChange={e => setSubjectForm(p => ({...p, name: e.target.value}))} className="form-input" placeholder="e.g. Mathematics" /></div>
                <div><label className="form-label text-xs">Code</label>
                  <input value={subjectForm.code} onChange={e => setSubjectForm(p => ({...p, code: e.target.value}))} className="form-input" placeholder="e.g. MATH" /></div>
                <div><label className="form-label text-xs">Max Marks</label>
                  <input type="number" value={subjectForm.maxMarks} onChange={e => setSubjectForm(p => ({...p, maxMarks: e.target.value}))} className="form-input" /></div>
                <div><label className="form-label text-xs">Passing Marks</label>
                  <input type="number" value={subjectForm.passingMarks} onChange={e => setSubjectForm(p => ({...p, passingMarks: e.target.value}))} className="form-input" /></div>
              </div>
              <button type="submit" className="btn-gold text-xs py-2 w-full justify-center">Add Subject</button>
            </form>
          )}

          {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
          : subjects.length === 0 ? <p className="text-center py-8 text-white/30 text-sm">No subjects yet</p>
          : (
            <div className="space-y-2">
              {subjects.map((s: any, i: number) => (
                <div key={s.id || i} className="flex items-center justify-between p-3 bg-white/3 rounded-lg">
                  <div><p className="text-white/80 text-sm">{s.name}</p><p className="text-white/30 text-xs">{s.code}</p></div>
                  <div className="text-right"><p className="text-white/60 text-sm">{s.maxMarks} marks</p><p className="text-white/30 text-xs">Pass: {s.passingMarks}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddTermModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await examsApi.createTerm(form);
      toast.success('Exam term created!'); onSuccess();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-white">Add Exam Term</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-white/40" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="form-label">Term Name *</label><input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="form-input" placeholder="e.g. Unit Test 1, Half Yearly" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Start Date</label><input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} className="form-input" /></div>
            <div><label className="form-label">End Date</label><input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} className="form-input" /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold flex-1 justify-center">{saving ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
