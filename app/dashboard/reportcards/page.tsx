'use client';
import { useState, useEffect } from 'react';
import { FileBarChart, Download, Users } from 'lucide-react';
import { reportCardsApi, examsApi, studentsApi } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';
import { Tabs, Empty } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ReportCardsPage() {
  const [tab, setTab] = useState('single');
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="page-header"><div><h1 className="page-title">Report Cards</h1><p className="page-sub">Generate CBSE-format report cards</p></div></div>
      <Tabs tabs={[{key:'single',label:'Single Student'},{key:'bulk',label:'Bulk Generate'}]} active={tab} onChange={setTab}/>
      {tab==='single' && <SingleReport/>}
      {tab==='bulk'   && <BulkReport/>}
    </div>
  );
}

function SingleReport() {
  const [terms, setTerms]   = useState<any[]>([]);
  const [admNo, setAdmNo]   = useState('');
  const [student, setStudent] = useState<any>(null);
  const [termId, setTermId] = useState('');
  const [loading, setLoading] = useState(false);
  const [finding, setFinding] = useState(false);

  useEffect(()=>{ examsApi.getTerms().then(r=>setTerms(r.data.data||[])).catch(()=>{}); },[]);

  const findStudent = async () => {
    if(!admNo) return;
    setFinding(true);
    try { const r = await studentsApi.lookup(admNo); setStudent(r.data.data); }
    catch{ toast.error('Student not found'); setStudent(null); }
    finally{ setFinding(false); }
  };

  const generate = async () => {
    if(!student||!termId) return toast.error('Select student and exam term');
    setLoading(true);
    try {
      const r = await reportCardsApi.generate(student.id, termId);
      downloadBlob(r.data, `reportcard-${admNo}-${termId}.pdf`);
      toast.success('Report card downloaded!');
    } catch{ toast.error('Failed to generate'); }
    finally{ setLoading(false); }
  };

  return (
    <div className="card p-6 max-w-lg space-y-5">
      <div>
        <label className="form-label">Admission Number</label>
        <div className="flex gap-2">
          <input value={admNo} onChange={e=>setAdmNo(e.target.value)} className="form-input flex-1" placeholder="e.g. 2025001"/>
          <button onClick={findStudent} className="btn-secondary">{finding?'…':'Find'}</button>
        </div>
        {student && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="font-semibold text-green-800">{student.name}</p>
            <p className="text-sm text-green-600">{student.class?.name}{student.section?.section?`-${student.section.section}`:''} · {student.admissionNumber}</p>
          </div>
        )}
      </div>
      <div>
        <label className="form-label">Exam Term</label>
        <select value={termId} onChange={e=>setTermId(e.target.value)} className="form-select">
          <option value="">Select exam term</option>
          {terms.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <button onClick={generate} disabled={!student||!termId||loading} className="btn-primary w-full justify-center py-3">
        {loading?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating…</>:<><Download className="w-4 h-4"/>Generate Report Card</>}
      </button>
    </div>
  );
}

function BulkReport() {
  const [terms, setTerms]   = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ examsApi.getTerms().then(r=>setTerms(r.data.data||[])).catch(()=>{}); studentsApi.getClasses().then(r=>setClasses(r.data.data||[])).catch(()=>{}); },[]);

  const generate = async () => {
    if(!termId||!classId) return toast.error('Select term and class');
    setLoading(true);
    try {
      const r = await reportCardsApi.bulkGenerate({termId,classId});
      downloadBlob(r.data,`reportcards-bulk.pdf`);
      toast.success('Bulk report cards downloaded!');
    } catch{ toast.error('Failed'); }
    finally{ setLoading(false); }
  };

  return (
    <div className="card p-6 max-w-lg space-y-5">
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
        <p className="text-sm text-blue-700">Bulk generation will create one PDF with all students' report cards for the selected class and exam term.</p>
      </div>
      <div><label className="form-label">Exam Term</label><select value={termId} onChange={e=>setTermId(e.target.value)} className="form-select"><option value="">Select</option>{terms.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div><label className="form-label">Class</label><select value={classId} onChange={e=>setClassId(e.target.value)} className="form-select"><option value="">Select</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <button onClick={generate} disabled={!termId||!classId||loading} className="btn-primary w-full justify-center py-3">
        {loading?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating…</>:<><Download className="w-4 h-4"/>Download All Report Cards</>}
      </button>
    </div>
  );
}
