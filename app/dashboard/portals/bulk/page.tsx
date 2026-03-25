'use client';

/**
 * Bulk Portal Login Creation
 * ─────────────────────────────────────────────────────────────────
 * Step 1 – Choose mode (Student / Parent)
 * Step 2 – Download template (.xlsx with admission numbers pre-filled)
 * Step 3 – Upload filled file (admin fills in passwords)
 * Step 4 – Import — creates portal logins in bulk
 */

import { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Users, Download, Upload, CheckCircle2,
  AlertCircle, ChevronRight, ChevronLeft, FileSpreadsheet,
  RefreshCw, Info, Key, Globe,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { studentsApi, portalApi } from '@/lib/api';
import toast from 'react-hot-toast';

type Mode = 'student' | 'parent';
type RowResult = { row:number; name:string; admNo:string; status:'success'|'error'|'skip'; message:string; };

function colLetter(n:number):string{let s='';while(n>=0){s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26)-1;}return s;}

export default function BulkPortalPage() {
  const [step,      setStep]     = useState<1|2|3|4>(1);
  const [mode,      setMode]     = useState<Mode>('student');
  const [students,  setStudents] = useState<any[]>([]);
  const [loadingSt, setLoadingSt]= useState(false);
  const [rows,      setRows]     = useState<any[]>([]);
  const [results,   setResults]  = useState<RowResult[]>([]);
  const [importing, setImporting]= useState(false);
  const [progress,  setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load ALL students for pre-filling the template
  const loadAllStudents = async () => {
    setLoadingSt(true);
    let all: any[] = [];
    let page = 1;
    while (true) {
      try {
        const r = await studentsApi.getAll({ page, limit: 100 });
        const batch = r.data.data?.students || [];
        all = [...all, ...batch];
        if (batch.length < 100) break;
        page++;
      } catch { break; }
    }
    setStudents(all);
    setLoadingSt(false);
    return all;
  };

  useEffect(() => { loadAllStudents(); }, []);

  // ── Step 2: Generate template
  const downloadTemplate = async () => {
    let list = students;
    if (list.length === 0) {
      toast('Loading students…', { icon: '⏳' });
      list = await loadAllStudents();
      if (list.length === 0) { toast.error('No students found. Add students first.'); return; }
    }

    const wb = XLSX.utils.book_new();

    if (mode === 'student') {
      // Student template: AdmNo, Name, Class, Password, Confirm Password
      const headers = ['Admission Number', 'Student Name', 'Class', 'Set Password', 'Confirm Password'];
      const rows: any[][] = [headers];
      list.forEach(s => {
        rows.push([
          s.admissionNumber,
          s.name,
          `${s.class?.name||''}${s.section?.section?`-${s.section.section}`:''}`,
          '', // admin fills password
          '', // confirm
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Style header
      headers.forEach((_,i)=>{
        const c = colLetter(i)+'1';
        if(!ws[c]) return;
        ws[c].s = { font:{bold:true,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:i<3?'1E3A8A':'15803D'}}, alignment:{horizontal:'center'} };
      });
      // Style locked columns (1-3) hint
      for(let r=2;r<=list.length+1;r++){
        ['A','B','C'].forEach(col=>{
          const c=col+r; if(!ws[c]) return;
          ws[c].s = { fill:{fgColor:{rgb:'F1F5F9'}}, font:{color:{rgb:'64748B'}} };
        });
        ['D','E'].forEach(col=>{
          const c=col+r; if(!ws[c]) return;
          ws[c].s = { fill:{fgColor:{rgb:'ECFDF5'}}, font:{color:{rgb:'166534'}} };
        });
      }
      ws['!cols'] = [{ wch:20 },{ wch:28 },{ wch:16 },{ wch:22 },{ wch:22 }];

      // Hint row 2 (after header)
      const hintRow = ['← Do not change','← Do not change','← Do not change','← Enter password (min 6 chars)','← Must match password'];
      XLSX.utils.sheet_add_aoa(ws, [hintRow], { origin: -1 });
      // Move data down 1 (insert hint after header before data)
      // Actually just prepend a hint row at position 2, shift data to 3
      const finalRows = [headers, hintRow, ...rows.slice(1)];
      const ws2 = XLSX.utils.aoa_to_sheet(finalRows);
      ws2['!cols'] = ws['!cols'];
      // Header style
      headers.forEach((_,i)=>{ const c=colLetter(i)+'1'; if(!ws2[c]) return; ws2[c].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:i<3?'1E3A8A':'15803D'}},alignment:{horizontal:'center'}}; });
      // Hint style
      hintRow.forEach((_,i)=>{ const c=colLetter(i)+'2'; if(!ws2[c]) return; ws2[c].s={font:{italic:true,color:{rgb:'64748B'},sz:9},fill:{fgColor:{rgb:'F8FAFC'}}}; });
      ws2['!freeze'] = {xSplit:0,ySplit:2};
      XLSX.utils.book_append_sheet(wb, ws2, 'Student Logins');

    } else {
      // Parent template: AdmNo, Student Name, Father, Mother, Phone, Password, Confirm
      const headers = ['Admission Number','Student Name','Father Name','Mother Name','Parent Phone','Set Password','Confirm Password'];
      const rows: any[][] = [headers];
      list.forEach(s => {
        rows.push([
          s.admissionNumber,
          s.name,
          s.parent?.fatherName || '',
          s.parent?.motherName || '',
          s.parent?.primaryPhone || '',
          '', '',
        ]);
      });
      const hintRow = ['← Do not change','← Do not change','← Info only','← Info only','← Login username (phone)','← Set password','← Confirm'];
      const finalRows = [headers, hintRow, ...rows.slice(1)];
      const ws = XLSX.utils.aoa_to_sheet(finalRows);
      ws['!cols'] = [{wch:20},{wch:28},{wch:24},{wch:24},{wch:18},{wch:22},{wch:22}];
      headers.forEach((_,i)=>{ const c=colLetter(i)+'1'; if(!ws[c]) return; ws[c].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:i<5?'6B21A8':'B45309'}},alignment:{horizontal:'center'}}; });
      hintRow.forEach((_,i)=>{ const c=colLetter(i)+'2'; if(!ws[c]) return; ws[c].s={font:{italic:true,color:{rgb:'64748B'},sz:9},fill:{fgColor:{rgb:'F8FAFC'}}}; });
      ws['!freeze'] = {xSplit:0,ySplit:2};
      XLSX.utils.book_append_sheet(wb, ws, 'Parent Logins');
    }

    XLSX.writeFile(wb, `EduNest_Bulk_${mode==='student'?'Student':'Parent'}_Portal.xlsx`);
    toast.success(`Template with ${students.length} ${mode === 'student' ? 'students' : 'parents'} downloaded!`);
    setStep(3);
  };

  // ── Step 3: Parse uploaded file
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb  = XLSX.read(ev.target?.result, { type:'binary' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' }) as any[][];
        if(raw.length < 2){ toast.error('File appears empty'); return; }

        // Find header row
        let hi = 0;
        for(let i=0;i<Math.min(5,raw.length);i++){
          if(String(raw[i][0]).toLowerCase().includes('admission')){ hi=i; break; }
        }
        const headers = (raw[hi] as string[]).map(h=>String(h).trim().toLowerCase());

        const find = (...keys:string[]) => { for(const k of keys){ const i=headers.findIndex(h=>h.includes(k)); if(i!==-1) return i; } return -1; };

        const iAdm = find('admission');
        const iName= find('student name','name');
        const iPwd = find('set password','password');
        const iConf= find('confirm');
        const iPhone= find('phone');

        if(iAdm===-1 || iPwd===-1){ toast.error('Could not find Admission Number or Password columns'); return; }

        const parsed: any[] = [];
        for(let r=hi+1; r<raw.length; r++){
          const row = raw[r];
          const isHint = String(row[iAdm]).startsWith('←');
          if(isHint) continue;
          const admNo = String(row[iAdm]||'').trim();
          if(!admNo) continue;
          const pwd  = String(row[iPwd]||'').trim();
          const conf = iConf!==-1 ? String(row[iConf]||'').trim() : pwd;
          const phone= iPhone!==-1 ? String(row[iPhone]||'').trim() : '';
          const name = iName!==-1 ? String(row[iName]||'').trim() : '';
          parsed.push({ admNo, name, pwd, conf, phone });
        }
        if(parsed.length===0){ toast.error('No valid data rows found'); return; }
        setRows(parsed); setResults([]); setStep(4);
        toast.success(`${parsed.length} rows loaded`);
      } catch{ toast.error('Failed to parse file'); }
    };
    reader.readAsBinaryString(file);
    e.target.value='';
  };

  // ── Step 4: Import
  const runImport = async () => {
    setImporting(true); setProgress(0);
    const res: RowResult[] = [];

    // Build admNo → studentId map
    const admMap: Record<string,string> = {};
    students.forEach(s=>{ admMap[s.admissionNumber] = s.id; });

    for(let i=0; i<rows.length; i++){
      const row = rows[i];
      const studentId = admMap[row.admNo];

      if(!row.pwd){ res.push({row:i+1,name:row.name,admNo:row.admNo,status:'skip',message:'No password set — skipped'}); }
      else if(row.pwd.length < 6){ res.push({row:i+1,name:row.name,admNo:row.admNo,status:'error',message:'Password too short (min 6 chars)'}); }
      else if(row.conf && row.pwd !== row.conf){ res.push({row:i+1,name:row.name,admNo:row.admNo,status:'error',message:'Password & confirm do not match'}); }
      else if(!studentId){ res.push({row:i+1,name:row.name,admNo:row.admNo,status:'error',message:'Student not found in system'}); }
      else {
        try {
          if(mode==='student'){
            await portalApi.createStudentAccess({ studentId, password:row.pwd });
          } else {
            await portalApi.createParentAccess({ studentId, password:row.pwd, phone:row.phone||undefined });
          }
          res.push({row:i+1,name:row.name,admNo:row.admNo,status:'success',message:'Login created'});
        } catch(err:any){
          const msg = err.response?.data?.message || 'Failed';
          res.push({row:i+1,name:row.name,admNo:row.admNo,status:'error',message:msg});
        }
      }

      setProgress(Math.round(((i+1)/rows.length)*100));
      setResults([...res]);
      if(i < rows.length-1) await new Promise(r=>setTimeout(r,120));
    }

    setImporting(false);
    const ok   = res.filter(r=>r.status==='success').length;
    const skip = res.filter(r=>r.status==='skip').length;
    const err  = res.filter(r=>r.status==='error').length;
    if(err===0) toast.success(`${ok} logins created!${skip>0?` (${skip} skipped — no password)`:''}`);
    else toast.error(`${ok} created, ${err} failed, ${skip} skipped`);
  };

  const successCount = results.filter(r=>r.status==='success').length;
  const skipCount    = results.filter(r=>r.status==='skip').length;
  const errorCount   = results.filter(r=>r.status==='error').length;
  const isDone = results.length === rows.length && rows.length > 0 && !importing;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Portal Login Creation</h1>
          <p className="page-sub">Create portal access for all students or parents in one go via Excel</p>
        </div>
        {step>1 && (
          <button onClick={()=>{setStep(1);setRows([]);setResults([]);}} className="btn-ghost text-xs">
            <RefreshCw className="w-3.5 h-3.5"/>Start over
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 card p-4">
        {([
          [1,'Select Mode',Globe],
          [2,'Template', FileSpreadsheet],
          [3,'Upload',   Upload],
          [4,'Create',   Key],
        ] as [number,string,any][]).map(([n,label,Icon],idx)=>(
          <div key={n} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1 gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${step>n?'bg-green-500 text-white':step===n?'bg-primary-600 text-white shadow-glow':'bg-slate-100 text-slate-400'}`}>
                {step>n?<CheckCircle2 className="w-5 h-5"/>:<Icon className="w-4 h-4"/>}
              </div>
              <span className={`text-xs font-semibold ${step===n?'text-primary-600':step>n?'text-green-600':'text-slate-400'}`}>{label}</span>
            </div>
            {idx<3&&<div className={`h-0.5 flex-1 mx-1 rounded transition-all ${step>n?'bg-green-400':'bg-slate-200'}`}/>}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Choose mode ── */}
      {step===1 && (
        <div className="space-y-5">
          <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-200">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
            <p className="text-sm text-blue-700">Choose whether you want to create Student portal logins (students log in with their admission number) or Parent portal logins (parents log in with their phone number).</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {([['student','Student Portal','Admission number as username',GraduationCap,'border-blue-400 bg-blue-50','bg-blue-100 text-blue-600'],['parent','Parent Portal','Phone number as username',Users,'border-purple-400 bg-purple-50','bg-purple-100 text-purple-600']] as const).map(([m,title,sub,Icon,active,ic])=>(
              <button key={m} onClick={()=>setMode(m as Mode)}
                className={`card p-6 flex flex-col items-center gap-3 text-center border-2 transition-all hover:shadow-card-hover ${mode===m?active:'border-slate-200 hover:border-slate-300'}`}>
                <div className={`w-14 h-14 rounded-2xl ${mode===m?ic:'bg-slate-100 text-slate-400'} flex items-center justify-center`}>
                  <Icon className="w-7 h-7"/>
                </div>
                <div>
                  <p className="font-bold text-slate-800">{title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
                {mode===m && <CheckCircle2 className={`w-5 h-5 ${m==='student'?'text-blue-600':'text-purple-600'}`}/>}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 card bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-slate-700">Creating: <span className={mode==='student'?'text-blue-600':'text-purple-600'}>{mode==='student'?'Student':'Parent'} portal logins</span></p>
              {loadingSt ? <p className="text-xs text-slate-400 mt-0.5">Loading students…</p> : <p className="text-xs text-slate-400 mt-0.5">{students.length} students found in system</p>}
            </div>
            <button onClick={()=>setStep(2)} disabled={loadingSt} className="btn-primary">
              Next — Download Template<ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Template ── */}
      {step===2 && (
        <div className="space-y-5">
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-slate-700">Template Preview — {students.length} {mode==='student'?'Students':'Parents'}</h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    {(mode==='student'
                      ? ['Admission Number','Student Name','Class','Set Password','Confirm Password']
                      : ['Admission Number','Student Name','Father Name','Mother Name','Parent Phone','Set Password','Confirm Password']
                    ).map((h,i)=>(
                      <th key={h} className={`px-3 py-2.5 text-white font-bold whitespace-nowrap ${
                        mode==='student'
                          ? (i<3?'bg-blue-800':'bg-green-700')
                          : (i<5?'bg-purple-800':'bg-amber-700')
                      }`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-50 text-slate-400 italic text-xs">
                    {(mode==='student'
                      ? ['← Do not change','← Do not change','← Do not change','Enter password (min 6)','Repeat password']
                      : ['← Do not change','← Do not change','Info only','Info only','Login username','Enter password','Repeat password']
                    ).map((h,i)=><td key={i} className="px-3 py-1.5">{h}</td>)}
                  </tr>
                  {students.slice(0,3).map(s=>(
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-slate-500">{s.admissionNumber}</td>
                      <td className="px-3 py-2 text-slate-600">{s.name}</td>
                      {mode==='student'
                        ? <><td className="px-3 py-2 text-slate-400">{s.class?.name||'—'}</td><td className="px-3 py-2 bg-green-50 text-green-600 italic">admin sets…</td><td className="px-3 py-2 bg-green-50 text-green-600 italic">…confirm</td></>
                        : <><td className="px-3 py-2 text-slate-400">{s.parent?.fatherName||'—'}</td><td className="px-3 py-2 text-slate-400">{s.parent?.motherName||'—'}</td><td className="px-3 py-2 font-mono text-slate-500">{s.parent?.primaryPhone||'—'}</td><td className="px-3 py-2 bg-amber-50 text-amber-600 italic">admin sets…</td><td className="px-3 py-2 bg-amber-50 text-amber-600 italic">…confirm</td></>
                      }
                    </tr>
                  ))}
                  {students.length>3 && (
                    <tr className="border-t border-slate-100 bg-slate-50"><td colSpan={mode==='student'?5:7} className="px-3 py-2 text-center text-slate-400 text-xs">… and {students.length-3} more rows</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold mb-1">Instructions:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Columns A-{mode==='student'?'C':'E'} are pre-filled — <strong>do not edit them</strong></li>
                  <li>Fill in the Password and Confirm columns only</li>
                  <li>Leave password blank to skip creating login for that student</li>
                  <li>Minimum password length: 6 characters</li>
                  {mode==='parent' && <li>Parent logs in with their phone number as username</li>}
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={()=>setStep(1)} className="btn-secondary"><ChevronLeft className="w-4 h-4"/>Back</button>
              <button onClick={downloadTemplate} className="btn-primary flex-1 justify-center py-3">
                <Download className="w-5 h-5"/>Download Template ({students.length} rows)
              </button>
            </div>
          </div>

          <div className="card p-4 border-dashed border-2 border-slate-300 text-center space-y-2">
            <p className="text-sm text-slate-500">Already filled a template?</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile}/>
            <button onClick={()=>fileRef.current?.click()} className="btn-outline mx-auto"><Upload className="w-4 h-4"/>Upload Now</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Upload ── */}
      {step===3 && (
        <div className="space-y-5">
          <div className="card p-8 text-center space-y-5 border-dashed border-2 border-slate-300">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-8 h-8 text-primary-600"/>
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-lg">Upload your filled Excel file</p>
              <p className="text-sm text-slate-400 mt-1">The file must have Admission Number and Password columns</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile}/>
            <button onClick={()=>fileRef.current?.click()} className="btn-primary mx-auto py-3 px-8">
              <Upload className="w-5 h-5"/>Choose File
            </button>
          </div>
          <button onClick={()=>setStep(2)} className="btn-ghost"><ChevronLeft className="w-4 h-4"/>Back to Template</button>
        </div>
      )}

      {/* ── STEP 4: Review & Create ── */}
      {step===4 && (
        <div className="space-y-5">
          {/* Top bar */}
          <div className="card p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              {mode==='student' ? <GraduationCap className="w-5 h-5 text-blue-600"/> : <Users className="w-5 h-5 text-purple-600"/>}
              <p className="font-semibold text-slate-800">{rows.length} rows loaded</p>
              <span className={`badge ${mode==='student'?'badge-blue':'badge-gray'}`}>{mode==='student'?'Student':'Parent'} Portal</span>
            </div>

            {isDone ? (
              <div className="flex gap-3 ml-auto flex-wrap">
                <span className="badge badge-green">{successCount} created</span>
                {skipCount  >0 && <span className="badge badge-blue">{skipCount} skipped</span>}
                {errorCount >0 && <span className="badge badge-red">{errorCount} failed</span>}
              </div>
            ) : importing ? (
              <div className="flex items-center gap-3 ml-auto">
                <div className="w-40 bg-slate-100 rounded-full h-2"><div className="h-2 rounded-full bg-primary-gradient transition-all" style={{width:`${progress}%`}}/></div>
                <span className="text-sm font-semibold text-primary-700">{progress}%</span>
              </div>
            ) : (
              <div className="ml-auto flex gap-3">
                <button onClick={()=>{setStep(3);setRows([]);}} className="btn-secondary"><ChevronLeft className="w-3.5 h-3.5"/>Re-upload</button>
                <button onClick={runImport} className="btn-primary">
                  <Key className="w-4 h-4"/>Create {rows.filter(r=>r.pwd).length} Logins
                </button>
              </div>
            )}
          </div>

          {/* Progress */}
          {importing && (
            <div className="card p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">Creating portal logins…</span>
                <span className="text-primary-600 font-bold">{results.length} / {rows.length}</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{width:`${progress}%`}}/></div>
              <div className="flex gap-4 text-xs">
                <span className="text-green-600 font-semibold">✓ {successCount} created</span>
                {skipCount  > 0 && <span className="text-blue-500 font-semibold">— {skipCount} skipped</span>}
                {errorCount > 0 && <span className="text-red-500 font-semibold">✗ {errorCount} failed</span>}
              </div>
            </div>
          )}

          {isDone && (
            <div className={`card p-5 ${errorCount===0?'border-green-300 bg-green-50':'border-amber-300 bg-amber-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                {errorCount===0?<CheckCircle2 className="w-5 h-5 text-green-600"/>:<AlertCircle className="w-5 h-5 text-amber-600"/>}
                <p className="font-bold text-slate-800">
                  {errorCount===0
                    ? `${successCount} portal logins created!${skipCount>0?` (${skipCount} skipped — no password set)`:''}`
                    : `${successCount} created · ${errorCount} failed · ${skipCount} skipped`}
                </p>
              </div>
              {errorCount>0 && <p className="text-xs text-amber-700">Review failures below, fix and re-upload only failed rows.</p>}
            </div>
          )}

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="font-semibold text-slate-700 text-sm">Preview</p>
              <p className="text-xs text-slate-400">{rows.filter(r=>!r.pwd).length} rows will be skipped (no password)</p>
            </div>
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="tbl">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="w-10">#</th>
                    {results.length>0&&<th className="w-24">Status</th>}
                    <th>Admission No.</th>
                    <th>Name</th>
                    {mode==='parent'&&<th>Phone</th>}
                    <th>Password Set?</th>
                    {results.length>0&&<th>Result</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row,i)=>{
                    const result = results[i];
                    const rowCls = result?.status==='success'?'bg-green-50':result?.status==='error'?'bg-red-50':result?.status==='skip'?'bg-slate-50':'';
                    return (
                      <tr key={i} className={rowCls||(row.pwd&&row.pwd!==row.conf?'bg-amber-50':'')}>
                        <td className="text-slate-400 text-xs">{i+1}</td>
                        {results.length>0&&(
                          <td>{result
                            ? result.status==='success'?<span className="badge badge-green">✓ Done</span>
                            : result.status==='skip'?<span className="badge badge-gray">— Skip</span>
                            : <span className="badge badge-red">✗ Error</span>
                            : <span className="badge badge-gray text-xs">Pending</span>}
                          </td>
                        )}
                        <td className="font-mono text-xs">{row.admNo}</td>
                        <td className="text-sm text-slate-600">{row.name||'—'}</td>
                        {mode==='parent'&&<td className="text-sm font-mono text-slate-500">{row.phone||<span className="text-slate-300 text-xs">—</span>}</td>}
                        <td>
                          {!row.pwd ? <span className="text-slate-400 text-xs italic">No password — will skip</span>
                          : row.conf&&row.pwd!==row.conf ? <span className="text-red-500 text-xs">⚠ Mismatch</span>
                          : row.pwd.length<6 ? <span className="text-amber-500 text-xs">Too short</span>
                          : <span className="text-green-600 text-xs">✓ {row.pwd.length} chars</span>}
                        </td>
                        {results.length>0&&(
                          <td className={`text-xs ${result?.status==='error'?'text-red-600':result?.status==='success'?'text-green-600':'text-slate-400'}`}>
                            {result?.message||'…'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {!importing&&!isDone&&(
            <div className="flex justify-end gap-3">
              <button onClick={()=>{setStep(3);setRows([]);}} className="btn-secondary"><ChevronLeft className="w-4 h-4"/>Re-upload</button>
              <button onClick={runImport} className="btn-primary py-3 px-8 text-base">
                <Key className="w-5 h-5"/>Create {rows.filter(r=>r.pwd&&r.pwd.length>=6).length} Logins
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
