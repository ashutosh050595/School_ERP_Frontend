'use client';
import { useState, useEffect, useRef } from 'react';
import { Download, Eye, Users, FileBarChart, Printer, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { examsApi, studentsApi } from '@/lib/api';
import { Tabs, Empty } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ReportCardsPage() {
  const [tab, setTab] = useState('single');
  return (
    <div className="space-y-5 max-w-6xl">
      <div className="page-header">
        <div><h1 className="page-title">Report Cards</h1><p className="page-sub">Preview and print student report cards</p></div>
      </div>
      <Tabs tabs={[{ key:'single', label:'Single Student' }, { key:'bulk', label:'Bulk / Class' }]} active={tab} onChange={setTab}/>
      {tab === 'single' && <SingleReport/>}
      {tab === 'bulk'   && <BulkReport/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Single student report card
// ─────────────────────────────────────────────────────────
function SingleReport() {
  const [terms, setTerms]     = useState<any[]>([]);
  const [admNo, setAdmNo]     = useState('');
  const [student, setStudent] = useState<any>(null);
  const [termId, setTermId]   = useState('');
  const [finding, setFinding] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    examsApi.getTerms().then(r => setTerms(r.data.data || [])).catch(() => {});
  }, []);

  const findStudent = async () => {
    if (!admNo) return;
    setFinding(true);
    try {
      const r = await studentsApi.getAll({ search: admNo, limit: 5 });
      const data = Array.isArray(r.data.data) ? r.data.data : [];
      if (data.length === 0) { toast.error('Student not found'); return; }
      setStudent(data[0]);
      setResult(null);
    } catch { toast.error('Student not found'); }
    finally { setFinding(false); }
  };

  const generate = async () => {
    if (!student || !termId) return toast.error('Select student and exam term');
    setLoading(true);
    try {
      const r = await examsApi.getStudentResult(student.id, termId);
      setResult({ ...r.data.data, student, term: terms.find(t => t.id === termId) });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate report card');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5 max-w-lg space-y-4">
        <div>
          <label className="form-label">Admission Number</label>
          <div className="flex gap-2">
            <input value={admNo} onChange={e => setAdmNo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && findStudent()}
              className="form-input flex-1" placeholder="e.g. 2025001"/>
            <button onClick={findStudent} disabled={finding} className="btn-secondary min-w-16">
              {finding ? '…' : 'Find'}
            </button>
          </div>
          {student && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="font-semibold text-green-800">{student.name}</p>
              <p className="text-sm text-green-600">
                {student.classSection?.class?.name || '—'} · Adm: {student.admissionNumber}
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="form-label">Exam Term</label>
          <select value={termId} onChange={e => setTermId(e.target.value)} className="form-select">
            <option value="">Select exam term</option>
            {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={!student || !termId || loading} className="btn-primary w-full justify-center py-2.5">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating…</>
            : <><Eye className="w-4 h-4"/>Preview Report Card</>
          }
        </button>
      </div>

      {result && (
        <ReportCardPreview
          result={result}
          student={result.student}
          term={result.term}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Bulk / Class report cards
// ─────────────────────────────────────────────────────────
function BulkReport() {
  const [terms, setTerms]     = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [termId, setTermId]   = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    examsApi.getTerms().then(r => setTerms(r.data.data || [])).catch(() => {});
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  const generate = async () => {
    if (!termId || !classId) return toast.error('Select term and class');
    setLoading(true);
    setResults([]);
    try {
      const [resR, stuR] = await Promise.all([
        examsApi.getResults({ termId, classId }),
        studentsApi.getAll({ classId, limit: 500 }),
      ]);
      const studs: any[] = Array.isArray(stuR.data.data) ? stuR.data.data : [];
      const res: any[]   = resR.data.data || [];
      const term         = terms.find(t => t.id === termId);
      // Merge result data into student objects
      const merged = studs
        .sort((a, b) => parseInt(a.rollNumber || '9999') - parseInt(b.rollNumber || '9999'))
        .map(s => {
          const r = res.find((x: any) => x.studentId === s.id) || null;
          return { student: s, result: r, term };
        });
      setStudents(studs);
      setResults(merged);
      setCurrentIdx(0);
      toast.success(`${merged.length} report cards loaded`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate');
    } finally { setLoading(false); }
  };

  const currentCard = results[currentIdx];

  return (
    <div className="space-y-4">
      <div className="card p-5 max-w-lg space-y-4">
        <div>
          <label className="form-label">Exam Term</label>
          <select value={termId} onChange={e => { setTermId(e.target.value); setResults([]); }} className="form-select">
            <option value="">Select</option>
            {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Class</label>
          <select value={classId} onChange={e => { setClassId(e.target.value); setResults([]); }} className="form-select">
            <option value="">Select</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={!termId || !classId || loading} className="btn-primary w-full justify-center py-2.5">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Loading…</>
            : <><Eye className="w-4 h-4"/>Preview All Report Cards</>
          }
        </button>
      </div>

      {results.length > 0 && (
        <>
          {/* Navigation bar */}
          <div className="card p-3 flex items-center gap-4">
            <button onClick={() => setCurrentIdx(p => Math.max(0, p-1))} disabled={currentIdx === 0} className="btn-icon disabled:opacity-30">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <span className="text-sm font-medium text-slate-600 flex-1 text-center">
              Student {currentIdx + 1} of {results.length} — {currentCard?.student?.name}
            </span>
            <button onClick={() => setCurrentIdx(p => Math.min(results.length-1, p+1))} disabled={currentIdx === results.length-1} className="btn-icon disabled:opacity-30">
              <ChevronRight className="w-5 h-5"/>
            </button>
            <button onClick={() => window.print()} className="btn-ghost border border-slate-300 text-sm py-1.5 px-3">
              <Printer className="w-4 h-4"/>Print All
            </button>
          </div>

          {currentCard && (
            <ReportCardPreview
              result={currentCard.result}
              student={currentCard.student}
              term={currentCard.term}
              inline
            />
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Report Card Preview component
// ─────────────────────────────────────────────────────────
function ReportCardPreview({ result, student, term, onClose, inline }: any) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report Card - ${student?.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
            .rc { width: 210mm; min-height: 297mm; padding: 12mm; background: white; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
            th { background: #1a237e; color: white; }
            .header { text-align: center; margin-bottom: 8px; }
            .school { font-size: 18px; font-weight: bold; color: #1a237e; }
            .subtitle { font-size: 11px; color: #555; }
            .student-info { display: flex; justify-content: space-between; border: 1px solid #ccc; padding: 6px; margin: 8px 0; font-size: 10px; }
            .pass { color: green; font-weight: bold; }
            .fail { color: red; }
            .total-row { background: #e8f5e9; font-weight: bold; }
            .summary { margin-top: 10px; font-size: 11px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 10px; }
            .grade-scale { background: #f5f5f5; padding: 4px; font-size: 9px; margin: 6px 0; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${content}
        </body>
      </html>
    `);
    w.document.close();
  };

  const noResult = !result || !result.subjects;
  const subjects  = result?.subjects || [];
  const termNum   = term?.termNumber ?? 1;
  const mainLabel = termNum === 2 ? 'Annual' : 'Mid Term';
  const className = student?.classSection?.class?.name || student?.class?.name || '—';
  const section   = student?.classSection?.section || student?.section?.section || '';

  const card = (
    <div ref={printRef} className="rc">
      {/* Header */}
      <div className="header" style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div className="school" style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a237e', textTransform: 'uppercase' }}>
          EduNest School
        </div>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
          Progress Report Card · Academic Year {term?.academicYear?.name || ''}
        </div>
        <div style={{ fontSize: '11px', color: '#888' }}>
          {term?.name} · Term {termNum}
        </div>
      </div>

      {/* Student info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #c5cae9', padding: '8px 10px', borderRadius: '6px', background: '#e8eaf6', marginBottom: '10px', fontSize: '11px' }}>
        <div><b>Name:</b> {student?.name}</div>
        <div><b>Adm No:</b> {student?.admissionNumber}</div>
        <div><b>Class:</b> {className}{section ? `-${section}` : ''}</div>
        <div><b>Roll No:</b> {student?.rollNumber || '—'}</div>
        {result?.rank && <div><b>Rank:</b> {result.rank}</div>}
      </div>

      {noResult ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#999', border: '1px dashed #ccc', borderRadius: '6px' }}>
          No marks found for this student in {term?.name || 'selected term'}.
        </div>
      ) : (
        <>
          {/* Marks table */}
          <table style={{ fontSize: '10.5px', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ textAlign: 'left', paddingLeft: '8px', background: '#1a237e', color: 'white', border: '1px solid #333' }}>Subject</th>
                <th colSpan={2} style={{ background: '#1a237e', color: 'white', border: '1px solid #333' }}>PT (20→10)</th>
                <th style={{ background: '#1a237e', color: 'white', border: '1px solid #333' }}>Notebook (5)</th>
                <th style={{ background: '#1a237e', color: 'white', border: '1px solid #333' }}>Sub.Enrich (5)</th>
                <th style={{ background: '#1a237e', color: 'white', border: '1px solid #333' }}>{mainLabel} (80)</th>
                <th style={{ background: '#1a237e', color: 'white', border: '1px solid #333' }}>Total (100)</th>
                <th style={{ background: '#1a237e', color: 'white', border: '1px solid #333' }}>Grade</th>
              </tr>
              <tr>
                <th style={{ fontSize: '9px', background: '#283593', color: 'white', border: '1px solid #333' }}>Raw/20</th>
                <th style={{ fontSize: '9px', background: '#283593', color: 'white', border: '1px solid #333' }}>Wtd/10</th>
                <th style={{ fontSize: '9px', background: '#283593', color: 'white', border: '1px solid #333' }}>/5</th>
                <th style={{ fontSize: '9px', background: '#283593', color: 'white', border: '1px solid #333' }}>/5</th>
                <th style={{ fontSize: '9px', background: '#283593', color: 'white', border: '1px solid #333' }}>/80</th>
                <th style={{ fontSize: '9px', background: '#283593', color: 'white', border: '1px solid #333' }}>/100</th>
                <th style={{ fontSize: '9px', background: '#283593', color: 'white', border: '1px solid #333' }}></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub: any, i: number) => (
                <tr key={sub.subjectName} style={{ background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                  <td style={{ textAlign: 'left', paddingLeft: '8px', fontWeight: '500', border: '1px solid #ddd', color: sub.isPassed ? '#000' : '#c62828' }}>
                    {sub.subjectName}
                  </td>
                  <td style={{ border: '1px solid #ddd' }}>{sub.ptObtained}</td>
                  <td style={{ border: '1px solid #ddd' }}>{sub.ptWeighted}</td>
                  <td style={{ border: '1px solid #ddd' }}>{sub.nbObtained}</td>
                  <td style={{ border: '1px solid #ddd' }}>{sub.seObtained}</td>
                  <td style={{ border: '1px solid #ddd' }}>{sub.mainObtained}</td>
                  <td style={{ border: '1px solid #ddd', fontWeight: 'bold', color: sub.isPassed ? '#1b5e20' : '#b71c1c' }}>
                    {typeof sub.total === 'number' ? sub.total.toFixed(1) : sub.total}
                  </td>
                  <td style={{ border: '1px solid #ddd', fontWeight: 'bold' }}>{sub.grade}</td>
                </tr>
              ))}
              <tr style={{ background: '#e8f5e9' }}>
                <td style={{ textAlign: 'left', paddingLeft: '8px', fontWeight: 'bold', border: '1px solid #aaa' }}>GRAND TOTAL</td>
                <td colSpan={5} style={{ border: '1px solid #aaa' }}></td>
                <td style={{ fontWeight: 'bold', fontSize: '12px', border: '1px solid #aaa', color: '#1b5e20' }}>
                  {typeof result.grandTotal === 'number' ? result.grandTotal.toFixed(1) : result.grandTotal}
                  <span style={{ fontWeight: 'normal', fontSize: '9px', color: '#555' }}>/{result.maxGrandTotal}</span>
                </td>
                <td style={{ fontWeight: 'bold', border: '1px solid #aaa' }}>{result.grade}</td>
              </tr>
            </tbody>
          </table>

          {/* Summary */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '11px' }}>
            <div><b>Percentage:</b> {parseFloat(result.percentage).toFixed(2)}%</div>
            <div><b>Overall Grade:</b> {result.grade}</div>
            <div><b>Rank in Class:</b> {result.rank}</div>
            <div><b>Subjects Passed:</b> {subjects.filter((s: any) => s.isPassed).length}/{subjects.length}</div>
          </div>

          {/* Grade scale */}
          <div style={{ background: '#f5f5f5', padding: '4px 8px', marginTop: '8px', borderRadius: '4px', fontSize: '9px', color: '#555' }}>
            Grade Scale: A+ ≥90% | A ≥80% | B+ ≥70% | B ≥60% | C ≥50% | D ≥40% | F &lt;40%
          </div>
        </>
      )}

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '10px', color: '#444' }}>
        <div>Class Teacher's Signature: ___________________</div>
        <div>Parent's Signature: ___________________</div>
        <div>Principal's Signature: ___________________</div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end gap-2">
          <button onClick={handlePrint} className="btn-primary text-sm py-1.5">
            <Printer className="w-4 h-4"/>Print / Save PDF
          </button>
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="bg-white p-6 min-h-[600px]">{card}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Report Card Preview</h3>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-primary text-sm py-1.5">
            <Printer className="w-4 h-4"/>Print / Save PDF
          </button>
          {onClose && <button onClick={onClose} className="btn-ghost text-sm py-1.5"><X className="w-4 h-4"/>Close</button>}
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="bg-white p-6">{card}</div>
      </div>
    </div>
  );
}
