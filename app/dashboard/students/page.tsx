'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2, GraduationCap, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { studentsApi } from '@/lib/api';
import { formatDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Student {
  id: string; name: string; admissionNumber: string; rollNumber?: string;
  dob?: string; gender?: string; phone?: string; address?: string;
  photo?: string; isActive?: boolean;
  class?: { id: string; name: string };
  section?: { id: string; section: string };
  parent?: { fatherName?: string; motherName?: string; primaryPhone?: string };
}

interface Class { id: string; name: string; sections?: Section[]; }
interface Section { id: string; section: string; classId: string; }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState<Student | null>(null);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentsApi.getAll({ page, limit, search, classId: classFilter || undefined });
      setStudents(res.data.data.students || []);
      setTotal(res.data.data.total || 0);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  }, [page, search, classFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Students</h1>
          <p className="text-white/40 text-sm mt-0.5">{total} students enrolled</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold">
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="navy-card rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or admission number..."
            className="form-input pl-9" />
        </div>
        <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1); }}
          className="form-input w-auto">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="navy-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th><th>Admission No.</th><th>Class</th>
                <th>Gender</th><th>Parent</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="h-8 bg-white/5 rounded animate-pulse" /></td></tr>
                ))
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-white/30">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No students found
                </td></tr>
              ) : students.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500 text-xs font-semibold flex-shrink-0">
                        {s.photo ? <img src={s.photo} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(s.name)}
                      </div>
                      <span className="text-white/80 font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs text-gold-500/80">{s.admissionNumber}</span></td>
                  <td>{s.class?.name ? `${s.class.name}${s.section?.section ? '-' + s.section.section : ''}` : '—'}</td>
                  <td>{s.gender || '—'}</td>
                  <td className="text-white/40">{s.parent?.fatherName || '—'}</td>
                  <td>
                    <span className={`badge ${s.isActive !== false ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {s.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowView(s)} className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-white/30 text-xs">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="btn-outline py-1.5 px-2 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="btn-outline py-1.5 px-2 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAdd && <AddStudentModal classes={classes} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load(); }} />}

      {/* View Student Modal */}
      {showView && <ViewStudentModal student={showView} onClose={() => setShowView(null)} />}
    </div>
  );
}

function AddStudentModal({ classes, onClose, onSuccess }: { classes: Class[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ name: '', admissionNumber: '', dob: '', gender: 'MALE', phone: '', address: '', classId: '', sectionId: '', fatherName: '', motherName: '', parentPhone: '', religion: '', category: 'GENERAL', bloodGroup: '' });
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  const handleClassChange = async (classId: string) => {
    setForm((f: any) => ({ ...f, classId, sectionId: '' }));
    if (classId) {
      try {
        const r = await studentsApi.getSections(classId);
        setSections(r.data.data || []);
      } catch {}
    } else setSections([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await studentsApi.create({
        name: form.name, admissionNumber: form.admissionNumber, dob: form.dob,
        gender: form.gender, phone: form.phone, address: form.address,
        classId: form.classId, sectionId: form.sectionId || undefined,
        religion: form.religion, category: form.category, bloodGroup: form.bloodGroup || undefined,
        parent: { fatherName: form.fatherName, motherName: form.motherName, primaryPhone: form.parentPhone },
      });
      toast.success('Student admitted successfully!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally { setLoading(false); }
  };

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-white">Admit New Student</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Full Name *</label>
              <input required value={form.name} onChange={e => f('name', e.target.value)} className="form-input" placeholder="Student's full name" />
            </div>
            <div>
              <label className="form-label">Admission Number *</label>
              <input required value={form.admissionNumber} onChange={e => f('admissionNumber', e.target.value)} className="form-input" placeholder="e.g. 2025001" />
            </div>
            <div>
              <label className="form-label">Date of Birth</label>
              <input type="date" value={form.dob} onChange={e => f('dob', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Gender *</label>
              <select required value={form.gender} onChange={e => f('gender', e.target.value)} className="form-input">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Class *</label>
              <select required value={form.classId} onChange={e => handleClassChange(e.target.value)} className="form-input">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Section</label>
              <select value={form.sectionId} onChange={e => f('sectionId', e.target.value)} className="form-input" disabled={!sections.length}>
                <option value="">Select Section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.section}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Category</label>
              <select value={form.category} onChange={e => f('category', e.target.value)} className="form-input">
                {['GENERAL','OBC','SC','ST','EWS'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Blood Group</label>
              <select value={form.bloodGroup} onChange={e => f('bloodGroup', e.target.value)} className="form-input">
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Address</label>
              <input value={form.address} onChange={e => f('address', e.target.value)} className="form-input" placeholder="Full address" />
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Parent/Guardian Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Father's Name</label>
                <input value={form.fatherName} onChange={e => f('fatherName', e.target.value)} className="form-input" placeholder="Father's name" />
              </div>
              <div>
                <label className="form-label">Mother's Name</label>
                <input value={form.motherName} onChange={e => f('motherName', e.target.value)} className="form-input" placeholder="Mother's name" />
              </div>
              <div>
                <label className="form-label">Parent Phone *</label>
                <input required value={form.parentPhone} onChange={e => f('parentPhone', e.target.value)} className="form-input" placeholder="10-digit mobile" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-gold flex-1 justify-center disabled:opacity-50">
              {loading ? <><div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />Saving...</> : 'Admit Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewStudentModal({ student, onClose }: { student: Student; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-white">Student Profile</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500 text-xl font-bold">
              {getInitials(student.name)}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{student.name}</h3>
              <p className="text-gold-500 text-sm font-mono">{student.admissionNumber}</p>
              <p className="text-white/40 text-xs mt-0.5">{student.class?.name}{student.section ? ' - ' + student.section.section : ''}</p>
            </div>
          </div>
          <div className="space-y-2.5 text-sm">
            {[
              ['Gender', student.gender],
              ['Date of Birth', student.dob ? formatDate(student.dob) : '—'],
              ['Father', student.parent?.fatherName || '—'],
              ['Mother', student.parent?.motherName || '—'],
              ['Parent Phone', student.parent?.primaryPhone || '—'],
              ['Address', student.address || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-white/40">{label}</span>
                <span className="text-white/80 text-right max-w-[200px]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
