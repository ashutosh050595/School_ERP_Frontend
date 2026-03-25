'use client';
import { useState } from 'react';
import { Globe, User, Users, CheckCircle, Upload } from 'lucide-react';
import { portalApi, studentsApi } from '@/lib/api';
import { Tabs } from '@/components/ui';
import toast from 'react-hot-toast';

export default function PortalsPage() {
  const [tab, setTab] = useState('student');
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="page-header">
        <div><h1 className="page-title">Student & Parent Portals</h1><p className="page-sub">Create portal login access for students and parents</p></div>
        <a href="/dashboard/portals/bulk" className="btn-primary"><Upload className="w-4 h-4"/>Bulk Create via Excel</a>
      </div>
      <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-200">
        <Globe className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
        <div className="text-sm text-blue-700">
          <p className="font-semibold mb-1">About Portals</p>
          <p>Student portal allows students to view their attendance, marks, fee status and complaints. Parent portal gives parents visibility into their child's academic progress. Both portals use the student's admission number as the login identifier.</p>
        </div>
      </div>
      <Tabs tabs={[{key:'student',label:'Student Portal Access'},{key:'parent',label:'Parent Portal Access'}]} active={tab} onChange={setTab}/>
      {tab==='student' && <StudentPortal/>}
      {tab==='parent'  && <ParentPortal/>}
    </div>
  );
}

function StudentPortal() {
  const [admNo, setAdmNo]     = useState('');
  const [password, setPassword] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [finding, setFinding] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState<any>(null);

  const findStudent = async () => {
    if(!admNo) return;
    setFinding(true); setStudent(null); setDone(null);
    try { const r = await studentsApi.lookup(admNo); setStudent(r.data.data); }
    catch { toast.error('Student not found'); } finally { setFinding(false); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!student) return toast.error('Find student first');
    if(password.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      const r = await portalApi.createStudentAccess({ studentId: student.id, password });
      setDone(r.data.data);
      toast.success('Student portal access created!');
      setAdmNo(''); setPassword(''); setStudent(null);
    } catch(err:any){ toast.error(err.response?.data?.message || 'Failed to create access'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><User className="w-5 h-5 text-blue-600"/></div>
          <div><p className="font-bold text-slate-800">Create Student Portal Login</p><p className="text-xs text-slate-400">Student logs in with admission number + password</p></div>
        </div>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="form-label">Admission Number *</label>
            <div className="flex gap-2">
              <input value={admNo} onChange={e=>setAdmNo(e.target.value)} className="form-input flex-1" placeholder="e.g. 2025001" onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),findStudent())}/>
              <button type="button" onClick={findStudent} className="btn-secondary">{finding ? '…' : 'Find'}</button>
            </div>
            {student && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0"/>
                <div>
                  <p className="text-sm font-semibold text-green-800">{student.name}</p>
                  <p className="text-xs text-green-600">{student.class?.name}{student.section?.section ? `-${student.section.section}` : ''} · {student.admissionNumber}</p>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="form-label">Set Password *</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="form-input" placeholder="Minimum 6 characters"/>
            <p className="text-xs text-slate-400 mt-1">Student will use their admission number as username and this password to log in.</p>
          </div>
          <button type="submit" disabled={!student || saving} className="btn-primary w-full justify-center py-3">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Creating…</> : 'Create Student Portal Access'}
          </button>
        </form>
      </div>

      {done && (
        <div className="card p-5 border-green-300 bg-green-50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600"/>
            <p className="font-bold text-green-800">Portal Access Created!</p>
          </div>
          <div className="space-y-1.5 text-sm text-green-700">
            <p><span className="font-semibold">Username:</span> {done.username || done.admissionNumber || admNo}</p>
            <p><span className="font-semibold">Student ID:</span> {done.studentId || done.id}</p>
            <p className="text-xs text-green-600 mt-2">Share the admission number and password with the student to enable portal login.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ParentPortal() {
  const [admNo, setAdmNo]       = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone]       = useState('');
  const [student, setStudent]   = useState<any>(null);
  const [finding, setFinding]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState<any>(null);

  const findStudent = async () => {
    if(!admNo) return;
    setFinding(true); setStudent(null); setDone(null);
    try { const r = await studentsApi.lookup(admNo); setStudent(r.data.data); if(r.data.data?.parent?.primaryPhone) setPhone(r.data.data.parent.primaryPhone); }
    catch { toast.error('Student not found'); } finally { setFinding(false); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!student) return toast.error('Find student first');
    if(password.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      const r = await portalApi.createParentAccess({ studentId: student.id, password, phone: phone || undefined });
      setDone(r.data.data);
      toast.success('Parent portal access created!');
      setAdmNo(''); setPassword(''); setPhone(''); setStudent(null);
    } catch(err:any){ toast.error(err.response?.data?.message || 'Failed to create access'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center"><Users className="w-5 h-5 text-purple-600"/></div>
          <div><p className="font-bold text-slate-800">Create Parent Portal Login</p><p className="text-xs text-slate-400">Parent monitors their child's progress via portal</p></div>
        </div>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="form-label">Student's Admission Number *</label>
            <div className="flex gap-2">
              <input value={admNo} onChange={e=>setAdmNo(e.target.value)} className="form-input flex-1" placeholder="e.g. 2025001" onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),findStudent())}/>
              <button type="button" onClick={findStudent} className="btn-secondary">{finding ? '…' : 'Find'}</button>
            </div>
            {student && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-green-600"/><p className="text-sm font-semibold text-green-800">{student.name}</p></div>
                {student.parent?.fatherName && <p className="text-xs text-green-600">Father: {student.parent.fatherName}</p>}
                {student.parent?.motherName && <p className="text-xs text-green-600">Mother: {student.parent.motherName}</p>}
              </div>
            )}
          </div>
          <div>
            <label className="form-label">Parent Phone</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} className="form-input" placeholder="Parent's phone number (pre-filled if on record)"/>
          </div>
          <div>
            <label className="form-label">Set Password *</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="form-input" placeholder="Minimum 6 characters"/>
            <p className="text-xs text-slate-400 mt-1">Parent will log in using their phone number (or student admission number) and this password.</p>
          </div>
          <button type="submit" disabled={!student || saving} className="btn-primary w-full justify-center py-3 bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Creating…</> : 'Create Parent Portal Access'}
          </button>
        </form>
      </div>

      {done && (
        <div className="card p-5 border-green-300 bg-green-50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600"/>
            <p className="font-bold text-green-800">Parent Portal Access Created!</p>
          </div>
          <div className="space-y-1.5 text-sm text-green-700">
            <p><span className="font-semibold">Login:</span> {done.phone || phone || 'Phone number'}</p>
            <p><span className="font-semibold">Student:</span> {done.studentId || student?.id}</p>
            <p className="text-xs text-green-600 mt-2">Share the login credentials with the parent to enable portal access.</p>
          </div>
        </div>
      )}
    </div>
  );
}
