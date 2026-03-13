'use client';
import { useState, useEffect } from 'react';
import { Calendar, UserCheck, UserX, Search, Save, ChevronDown } from 'lucide-react';
import { attendanceApi, studentsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Student { id: string; name: string; admissionNumber: string; rollNumber?: string; }
interface Class { id: string; name: string; sections?: Section[]; }
interface Section { id: string; section: string; classId: string; }
interface AttendanceRecord { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY'; remark?: string; }

export default function AttendancePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingData, setExistingData] = useState<any[]>([]);

  useEffect(() => {
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  const handleClassChange = async (cid: string) => {
    setClassId(cid); setSectionId(''); setStudents([]); setAttendance({});
    if (cid) {
      const r = await studentsApi.getSections(cid).catch(() => ({ data: { data: [] } }));
      setSections(r.data.data || []);
    }
  };

  const loadStudents = async () => {
    if (!classId) return toast.error('Please select a class');
    setLoading(true);
    try {
      const [studRes, attRes] = await Promise.all([
        studentsApi.getAll({ classId, sectionId: sectionId || undefined, limit: 100 }),
        attendanceApi.getByDate({ classId, sectionId: sectionId || undefined, date }),
      ]);
      const studs = studRes.data.data.students || [];
      setStudents(studs);

      const existing = attRes.data.data || [];
      setExistingData(existing);

      const map: Record<string, AttendanceRecord> = {};
      studs.forEach((s: Student) => {
        const found = existing.find((a: any) => a.studentId === s.id);
        map[s.id] = found ? { studentId: s.id, status: found.status, remark: found.remark } : { studentId: s.id, status: 'PRESENT' };
      });
      setAttendance(map);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    const map: Record<string, AttendanceRecord> = {};
    students.forEach(s => { map[s.id] = { studentId: s.id, status }; });
    setAttendance(map);
  };

  const toggle = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status: prev[studentId]?.status === 'PRESENT' ? 'ABSENT' : 'PRESENT' },
    }));
  };

  const saveAttendance = async () => {
    if (!students.length) return;
    setSaving(true);
    try {
      await attendanceApi.mark({
        date, classId, sectionId: sectionId || undefined,
        records: Object.values(attendance),
      });
      toast.success('Attendance saved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally { setSaving(false); }
  };

  const presentCount = Object.values(attendance).filter(a => a.status === 'PRESENT').length;
  const absentCount = Object.values(attendance).filter(a => a.status === 'ABSENT').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Attendance</h1>
          <p className="text-white/40 text-sm mt-0.5">Mark daily attendance</p>
        </div>
        {students.length > 0 && (
          <button onClick={saveAttendance} disabled={saving} className="btn-gold disabled:opacity-50">
            {saving ? <><div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Attendance</>}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="navy-card rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">Class</label>
          <select value={classId} onChange={e => handleClassChange(e.target.value)} className="form-input">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Section</label>
          <select value={sectionId} onChange={e => setSectionId(e.target.value)} className="form-input" disabled={!sections.length}>
            <option value="">All Sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.section}</option>)}
          </select>
        </div>
        <button onClick={loadStudents} className="btn-gold" disabled={!classId}>
          <Search className="w-4 h-4" /> Load Students
        </button>
      </div>

      {/* Stats */}
      {students.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card p-4 text-center">
            <p className="text-white/40 text-xs mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{students.length}</p>
          </div>
          <div className="stat-card p-4 text-center">
            <p className="text-green-400 text-xs mb-1">Present</p>
            <p className="text-2xl font-bold text-green-400">{presentCount}</p>
          </div>
          <div className="stat-card p-4 text-center">
            <p className="text-red-400 text-xs mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-400">{absentCount}</p>
          </div>
        </div>
      )}

      {/* Attendance list */}
      {students.length > 0 && (
        <div className="navy-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <p className="text-white/60 text-sm font-medium">Students — {formatDate(date)}</p>
            <div className="flex gap-2">
              <button onClick={() => markAll('PRESENT')} className="btn-outline py-1.5 text-xs text-green-400 border-green-500/20 hover:bg-green-500/10">
                <UserCheck className="w-3.5 h-3.5" /> All Present
              </button>
              <button onClick={() => markAll('ABSENT')} className="btn-outline py-1.5 text-xs text-red-400 border-red-500/20 hover:bg-red-500/10">
                <UserX className="w-3.5 h-3.5" /> All Absent
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                  <div className="flex-1 h-4 bg-white/5 rounded animate-pulse" />
                  <div className="w-24 h-8 bg-white/5 rounded animate-pulse" />
                </div>
              ))
            ) : students.map((s, i) => {
              const status = attendance[s.id]?.status || 'PRESENT';
              return (
                <div key={s.id} className={`flex items-center gap-4 p-4 transition-colors ${status === 'ABSENT' ? 'bg-red-500/3' : ''}`}>
                  <span className="text-white/20 text-xs w-6 text-right">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500 text-xs font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white/80 text-sm font-medium">{s.name}</p>
                    <p className="text-white/30 text-xs">{s.admissionNumber}{s.rollNumber ? ` · Roll ${s.rollNumber}` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    {(['PRESENT', 'ABSENT', 'LATE'] as const).map(st => (
                      <button key={st} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: { ...prev[s.id], status: st } }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          status === st
                            ? st === 'PRESENT' ? 'bg-green-500 text-white' : st === 'ABSENT' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-navy-900'
                            : 'bg-white/5 text-white/30 hover:bg-white/10'
                        }`}>
                        {st.charAt(0) + st.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="navy-card rounded-xl p-12 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/40">Select a class and date to mark attendance</p>
        </div>
      )}
    </div>
  );
}
