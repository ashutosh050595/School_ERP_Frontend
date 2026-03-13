'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Download, Users } from 'lucide-react';
import { idcardsApi, studentsApi } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';
import { Tabs } from '@/components/ui';
import toast from 'react-hot-toast';

export default function IdCardsPage() {
  const [tab, setTab] = useState('single');
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="page-header"><div><h1 className="page-title">ID Cards</h1><p className="page-sub">Generate student ID cards as PDF</p></div></div>
      <Tabs tabs={[{key:'single',label:'Single Student'},{key:'bulk',label:'Bulk Generate'}]} active={tab} onChange={setTab}/>
      {tab==='single' && <SingleIdCard/>}
      {tab==='bulk'   && <BulkIdCard/>}
    </div>
  );
}

function SingleIdCard() {
  const [admNo, setAdmNo]     = useState('');
  const [student, setStudent] = useState<any>(null);
  const [finding, setFinding] = useState(false);
  const [loading, setLoading] = useState(false);

  const findStudent = async () => {
    if(!admNo) return;
    setFinding(true);
    try { const r = await studentsApi.lookup(admNo); setStudent(r.data.data); }
    catch { toast.error('Student not found'); setStudent(null); } finally { setFinding(false); }
  };

  const generate = async () => {
    if(!admNo) return;
    setLoading(true);
    try { const r = await idcardsApi.generate(admNo); downloadBlob(r.data,`idcard-${admNo}.pdf`); toast.success('ID Card downloaded!'); }
    catch { toast.error('Failed to generate'); } finally { setLoading(false); }
  };

  return (
    <div className="card p-6 space-y-5">
      <div>
        <label className="form-label">Admission Number</label>
        <div className="flex gap-2">
          <input value={admNo} onChange={e=>setAdmNo(e.target.value)} className="form-input flex-1" placeholder="e.g. 2025001" onKeyDown={e=>e.key==='Enter'&&findStudent()}/>
          <button onClick={findStudent} className="btn-secondary">{finding?'…':'Find Student'}</button>
        </div>
        {student && (
          <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="font-bold text-slate-800">{student.name}</p>
            <p className="text-sm text-slate-500">{student.class?.name}{student.section?.section?`-${student.section.section}`:''} · {student.admissionNumber}</p>
            {student.rollNumber && <p className="text-sm text-slate-500">Roll No. {student.rollNumber}</p>}
          </div>
        )}
      </div>
      <button onClick={generate} disabled={!admNo||loading} className="btn-primary w-full justify-center py-3">
        {loading?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating…</>:<><Download className="w-4 h-4"/>Download ID Card PDF</>}
      </button>
    </div>
  );
}

function BulkIdCard() {
  const [classes, setClasses]   = useState<any[]>([]);
  const [classId, setClassId]   = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(()=>{ studentsApi.getClasses().then(r=>setClasses(r.data.data||[])).catch(()=>{}); },[]);

  const generate = async () => {
    if(!classId) return toast.error('Select a class');
    setLoading(true);
    try { const r = await idcardsApi.bulkGenerate({classId}); downloadBlob(r.data,`idcards-bulk.pdf`); toast.success('Bulk ID cards downloaded!'); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
        <p className="text-sm text-blue-700">Generates a single PDF with ID cards for all students in the selected class.</p>
      </div>
      <div><label className="form-label">Class</label><select value={classId} onChange={e=>setClassId(e.target.value)} className="form-select"><option value="">Select class</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <button onClick={generate} disabled={!classId||loading} className="btn-primary w-full justify-center py-3">
        {loading?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating…</>:<><Download className="w-4 h-4"/>Download All ID Cards</>}
      </button>
    </div>
  );
}
