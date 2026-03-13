'use client';

/**
 * Bulk Student Upload
 * ─────────────────────────────────────────────────────────────────
 * Flow:
 *  Step 1 – Configure Columns  → pick which fields to include
 *  Step 2 – Download Template  → generates colour-coded .xlsx
 *  Step 3 – Upload & Preview   → parse, validate, show table
 *  Step 4 – Import             → submit rows, live progress
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings2, Download, Upload, CheckCircle2, XCircle,
  AlertCircle, ChevronRight, ChevronLeft, RefreshCw,
  FileSpreadsheet, Lock, Eye, Trash2, Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { studentsApi } from '@/lib/api';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────
// Field catalogue — every student field the system knows about
// ─────────────────────────────────────────────────────────────────
export const ALL_FIELDS: FieldDef[] = [
  // ── Required (locked on)
  { key:'name',              label:'Student Name',        required:true,  group:'Basic',   hint:'Full legal name', example:'Aarav Kumar' },
  { key:'admissionNumber',   label:'Admission Number',    required:true,  group:'Basic',   hint:'Unique ID for the student', example:'2025001' },
  { key:'parentPhone',       label:'Parent Phone',        required:true,  group:'Parent',  hint:'Primary contact number', example:'9876543210' },

  // ── Basic (optional)
  { key:'dob',               label:'Date of Birth',       required:false, group:'Basic',   hint:'DD-MM-YYYY or YYYY-MM-DD', example:'2010-04-15' },
  { key:'gender',            label:'Gender',              required:false, group:'Basic',   hint:'MALE | FEMALE | OTHER', example:'MALE' },
  { key:'bloodGroup',        label:'Blood Group',         required:false, group:'Basic',   hint:'A+ A- B+ B- O+ O- AB+ AB-', example:'B+' },
  { key:'category',          label:'Category',            required:false, group:'Basic',   hint:'GENERAL | OBC | SC | ST | EWS', example:'GENERAL' },
  { key:'religion',          label:'Religion',            required:false, group:'Basic',   hint:'e.g. Hindu, Muslim, Christian', example:'Hindu' },
  { key:'nationality',       label:'Nationality',         required:false, group:'Basic',   hint:'', example:'Indian' },
  { key:'aadharNumber',      label:'Aadhar Number',       required:false, group:'Basic',   hint:'12-digit Aadhar', example:'123456789012' },
  { key:'phone',             label:'Student Phone',       required:false, group:'Basic',   hint:'Student\'s own number', example:'9123456789' },
  { key:'address',           label:'Address',             required:false, group:'Basic',   hint:'Full residential address', example:'123 Main St, Koderma' },

  // ── Class
  { key:'className',         label:'Class Name',          required:false, group:'Class',   hint:'Exact class name as in system', example:'Class VI' },
  { key:'sectionName',       label:'Section',             required:false, group:'Class',   hint:'Section letter e.g. A', example:'A' },
  { key:'rollNumber',        label:'Roll Number',         required:false, group:'Class',   hint:'Class roll number', example:'15' },
  { key:'previousSchool',    label:'Previous School',     required:false, group:'Class',   hint:'Name of previous school if any', example:'DPS Ranchi' },

  // ── Parent
  { key:'fatherName',        label:'Father\'s Name',      required:false, group:'Parent',  hint:'Father\'s full name', example:'Rajesh Kumar' },
  { key:'motherName',        label:'Mother\'s Name',      required:false, group:'Parent',  hint:'Mother\'s full name', example:'Sunita Kumar' },
  { key:'parentEmail',       label:'Parent Email',        required:false, group:'Parent',  hint:'Parent email address', example:'rajesh@gmail.com' },
  { key:'emergencyContact',  label:'Emergency Contact',   required:false, group:'Parent',  hint:'Alternate phone number', example:'9012345678' },
  { key:'parentOccupation',  label:'Parent Occupation',   required:false, group:'Parent',  hint:'Father/Guardian occupation', example:'Teacher' },
];

type FieldDef = {
  key: string; label: string; required: boolean;
  group: 'Basic'|'Class'|'Parent'; hint: string; example: string;
};

const GROUPS: Array<'Basic'|'Class'|'Parent'> = ['Basic', 'Class', 'Parent'];
const GROUP_COLOR: Record<string, string> = {
  Basic:  '#1E3A5F',
  Class:  '#1A4731',
  Parent: '#4A1942',
};
const STORAGE_KEY = 'edunest_bulk_columns';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function loadSavedColumns(): string[] {
  try {
    const s = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return s ? JSON.parse(s) : ALL_FIELDS.filter(f => f.required || ['dob','gender','className','sectionName','fatherName','motherName'].includes(f.key)).map(f => f.key);
  } catch { return ALL_FIELDS.filter(f => f.required).map(f => f.key); }
}

function saveColumns(keys: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keys)); } catch {}
}

function colLetter(n: number): string {
  let s = ''; while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } return s;
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
export default function BulkUploadPage() {
  const [step, setStep]           = useState<1|2|3|4>(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(loadSavedColumns);
  const [classes, setClasses]     = useState<any[]>([]);
  const [rows, setRows]           = useState<Record<string,string>[]>([]);
  const [results, setResults]     = useState<RowResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress]   = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    studentsApi.getClasses().then(r => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  const activeFields = ALL_FIELDS.filter(f => selectedKeys.includes(f.key));

  const toggleField = (key: string) => {
    if (ALL_FIELDS.find(f => f.key === key)?.required) return;
    setSelectedKeys(p => {
      const n = p.includes(key) ? p.filter(k => k !== key) : [...p, key];
      saveColumns(n);
      return n;
    });
  };

  const selectGroup = (group: string, on: boolean) => {
    const keys = ALL_FIELDS.filter(f => f.group === group && !f.required).map(f => f.key);
    setSelectedKeys(p => {
      const n = on ? [...new Set([...p, ...keys])] : p.filter(k => !keys.includes(k));
      saveColumns(n); return n;
    });
  };

  // ── Step 2: generate Excel template
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template
    const wsData: any[][] = [];

    // Row 1: Headers
    wsData.push(activeFields.map(f => f.label + (f.required ? ' *' : '')));
    // Row 2: Sample data
    wsData.push(activeFields.map(f => f.example));
    // Row 3: Hints
    wsData.push(activeFields.map(f => f.hint || ''));

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style header row
    activeFields.forEach((f, i) => {
      const cell = colLetter(i) + '1';
      if (!ws[cell]) return;
      ws[cell].s = {
        font:    { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill:    { fgColor: { rgb: f.required ? '1E3A8A' : GROUP_COLOR[f.group].replace('#','') } },
        alignment: { horizontal: 'center', wrapText: true },
        border: { bottom: { style: 'medium', color: { rgb: '000000' } } }
      };
    });

    // Style sample row (light blue)
    activeFields.forEach((_, i) => {
      const cell = colLetter(i) + '2';
      if (!ws[cell]) return;
      ws[cell].s = { fill: { fgColor: { rgb: 'DBEAFE' } }, font: { italic: true, color: { rgb: '1E40AF' } } };
    });

    // Style hints row (grey italic)
    activeFields.forEach((_, i) => {
      const cell = colLetter(i) + '3';
      if (!ws[cell]) return;
      ws[cell].s = { fill: { fgColor: { rgb: 'F1F5F9' } }, font: { italic: true, color: { rgb: '64748B' }, sz: 9 } };
    });

    // Column widths
    ws['!cols'] = activeFields.map(f => ({ wch: Math.max(f.label.length + 4, 18) }));

    // Freeze top 3 rows
    ws['!freeze'] = { xSplit: 0, ySplit: 3 };

    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Sheet 2: Reference lists
    const refWs = XLSX.utils.aoa_to_sheet([
      ['GENDER'],        ['MALE'],['FEMALE'],['OTHER'],[''],
      ['CATEGORY'],      ['GENERAL'],['OBC'],['SC'],['ST'],['EWS'],[''],
      ['BLOOD_GROUP'],   ['A+'],['A-'],['B+'],['B-'],['O+'],['O-'],['AB+'],['AB-'],[''],
      ['AVAILABLE CLASSES (copy exact name)'],
      ...classes.map(c => [c.name]),
    ]);
    refWs['!cols'] = [{ wch: 40 }];
    XLSX.utils.book_append_sheet(wb, refWs, 'Reference');

    XLSX.writeFile(wb, 'EduNest_Student_Bulk_Template.xlsx');
    toast.success('Template downloaded!');
    setStep(3);
  };

  // ── Step 3: parse uploaded Excel
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb  = XLSX.read(ev.target?.result, { type: 'binary', cellDates: true });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (raw.length < 2) { toast.error('Sheet appears empty'); return; }

        // Find header row (first row that matches our labels)
        let headerRow = 0;
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          const rowStr = raw[i].join('|').toLowerCase();
          if (rowStr.includes('name') || rowStr.includes('admission')) { headerRow = i; break; }
        }

        const headers: string[] = (raw[headerRow] as any[]).map((h: any) => String(h).trim().replace(' *','').toLowerCase());

        // Map uploaded headers → field keys
        const headerToKey: Record<string, string> = {};
        ALL_FIELDS.forEach(f => {
          const lbl = f.label.toLowerCase().replace(' *','');
          const idx = headers.findIndex(h => h === lbl || h === f.key.toLowerCase());
          if (idx !== -1) headerToKey[idx] = f.key;
        });

        // Parse data rows (skip header + sample + hints rows if present)
        const dataStart = headerRow + 1;
        const parsed: Record<string,string>[] = [];
        for (let r = dataStart; r < raw.length; r++) {
          const row: any[] = raw[r];
          if (row.every(c => c === '' || c === null || c === undefined)) continue;
          const sample = ALL_FIELDS.map(f => f.example).join('|');
          if (row.slice(0,3).join('|') === ALL_FIELDS.filter(f=>selectedKeys.includes(f.key)).slice(0,3).map(f=>f.example).join('|')) continue; // skip sample row

          const obj: Record<string,string> = {};
          Object.entries(headerToKey).forEach(([colIdx, fieldKey]) => {
            let val = row[Number(colIdx)];
            if (val instanceof Date) {
              val = val.toISOString().split('T')[0];
            }
            obj[fieldKey] = String(val ?? '').trim();
          });
          if (obj.name || obj.admissionNumber) parsed.push(obj);
        }

        if (parsed.length === 0) { toast.error('No valid data rows found'); return; }
        setRows(parsed);
        setResults([]);
        setStep(4);
        toast.success(`${parsed.length} rows loaded — review below`);
      } catch(err) { toast.error('Failed to parse file. Ensure you used the downloaded template.'); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // ── Step 4: import rows
  const runImport = async () => {
    setImporting(true);
    setProgress(0);
    const res: RowResult[] = [];

    // Pre-load sections for all classes we'll encounter
    const classMap: Record<string, string>    = {};
    const sectionMap: Record<string, string>  = {};
    classes.forEach(c => { classMap[c.name.toLowerCase().trim()] = c.id; });

    // Fetch sections lazily, cache by classId
    const sectionCache: Record<string, any[]> = {};
    const getSections = async (classId: string) => {
      if (sectionCache[classId]) return sectionCache[classId];
      try { const r = await studentsApi.getSections(classId); sectionCache[classId] = r.data.data || []; }
      catch { sectionCache[classId] = []; }
      return sectionCache[classId];
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Resolve classId / sectionId from names
      let classId   = '';
      let sectionId = '';
      if (row.className) {
        classId = classMap[row.className.toLowerCase().trim()] || '';
        if (classId && row.sectionName) {
          const sections = await getSections(classId);
          const sec = sections.find((s:any) => s.section?.toLowerCase() === row.sectionName.toLowerCase().trim());
          if (sec) sectionId = sec.id;
        }
      }

      // Build API body
      const body: any = {
        name:            row.name,
        admissionNumber: row.admissionNumber,
        dob:             row.dob         || undefined,
        gender:          row.gender      || undefined,
        phone:           row.phone       || undefined,
        address:         row.address     || undefined,
        classId:         classId         || undefined,
        sectionId:       sectionId       || undefined,
        religion:        row.religion    || undefined,
        category:        row.category    || 'GENERAL',
        bloodGroup:      row.bloodGroup  || undefined,
        rollNumber:      row.rollNumber  || undefined,
        nationality:     row.nationality || undefined,
        aadharNumber:    row.aadharNumber|| undefined,
        previousSchool:  row.previousSchool || undefined,
        parent: {
          fatherName:       row.fatherName       || undefined,
          motherName:       row.motherName       || undefined,
          primaryPhone:     row.parentPhone      || undefined,
          email:            row.parentEmail      || undefined,
          occupation:       row.parentOccupation || undefined,
          emergencyContact: row.emergencyContact || undefined,
        },
      };

      // Validate required
      if (!body.name || !body.admissionNumber || !body.parent?.primaryPhone) {
        res.push({ row: i + 1, name: row.name || '—', admNo: row.admissionNumber || '—', status: 'error', message: 'Missing required field: Name, Admission Number, or Parent Phone' });
        setProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }

      try {
        await studentsApi.create(body);
        res.push({ row: i + 1, name: body.name, admNo: body.admissionNumber, status: 'success', message: 'Admitted successfully' });
      } catch(err: any) {
        const msg = err.response?.data?.message || err.response?.data?.error || 'Failed';
        res.push({ row: i + 1, name: body.name, admNo: body.admissionNumber, status: 'error', message: msg });
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100));
      setResults([...res]);
      // Small delay to avoid rate limit
      if (i < rows.length - 1) await new Promise(r => setTimeout(r, 150));
    }

    setImporting(false);
    const ok  = res.filter(r => r.status === 'success').length;
    const err = res.filter(r => r.status === 'error').length;
    if (err === 0) toast.success(`All ${ok} students admitted!`);
    else toast.error(`${ok} succeeded, ${err} failed — see details`);
  };

  type RowResult = { row:number; name:string; admNo:string; status:'success'|'error'; message:string; };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount   = results.filter(r => r.status === 'error').length;
  const isDone       = results.length === rows.length && rows.length > 0;

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Student Upload</h1>
          <p className="page-sub">Configure columns → Download template → Fill data → Import</p>
        </div>
        {step > 1 && (
          <button onClick={()=>{setStep(1);setRows([]);setResults([]);}} className="btn-ghost text-xs">
            <RefreshCw className="w-3.5 h-3.5"/>Start over
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 card p-4">
        {([
          [1, 'Configure', Settings2],
          [2, 'Template',  FileSpreadsheet],
          [3, 'Upload',    Upload],
          [4, 'Import',    CheckCircle2],
        ] as [number, string, any][]).map(([n, label, Icon], idx) => (
          <div key={n} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1 gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                step > n ? 'bg-green-500 text-white' : step === n ? 'bg-primary-600 text-white shadow-glow' : 'bg-slate-100 text-slate-400'
              }`}>
                {step > n ? <CheckCircle2 className="w-5 h-5"/> : <Icon className="w-4 h-4"/>}
              </div>
              <span className={`text-xs font-semibold ${step === n ? 'text-primary-600' : step > n ? 'text-green-600' : 'text-slate-400'}`}>{label}</span>
            </div>
            {idx < 3 && <div className={`h-0.5 flex-1 mx-1 rounded transition-all ${step > n ? 'bg-green-400' : 'bg-slate-200'}`}/>}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Configure columns ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-200">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
            <div className="text-sm text-blue-700">
              <p className="font-semibold">Choose columns for your Excel template.</p>
              <p className="mt-0.5 text-xs">Locked columns (<Lock className="w-3 h-3 inline"/>) are always required. Your selection is saved automatically.</p>
            </div>
          </div>

          {GROUPS.map(group => {
            const fields = ALL_FIELDS.filter(f => f.group === group);
            const optFields = fields.filter(f => !f.required);
            const allOn = optFields.every(f => selectedKeys.includes(f.key));
            return (
              <div key={group} className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-700">{group} Information</h3>
                  {optFields.length > 0 && (
                    <button onClick={()=>selectGroup(group, !allOn)}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                      {allOn ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {fields.map(f => {
                    const on = selectedKeys.includes(f.key);
                    return (
                      <label key={f.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          f.required ? 'border-primary-200 bg-primary-50 cursor-not-allowed' :
                          on ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <input type="checkbox" checked={on} onChange={()=>toggleField(f.key)}
                          disabled={f.required} className="mt-0.5 rounded text-primary-600"/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-700">{f.label}</span>
                            {f.required && <Lock className="w-3 h-3 text-primary-500" title="Required"/>}
                          </div>
                          {f.hint && <p className="text-xs text-slate-400 mt-0.5 leading-tight">{f.hint}</p>}
                          <p className="text-xs text-primary-500 mt-1 font-mono">e.g. {f.example}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between p-4 card bg-slate-50">
            <p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{selectedKeys.length}</span> columns selected</p>
            <button onClick={()=>setStep(2)} className="btn-primary">
              Next — Download Template<ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Download template ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="card p-6 space-y-5">
            {/* Template preview */}
            <h2 className="font-semibold text-slate-700">Your Template Preview</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    {activeFields.map(f => (
                      <th key={f.key} className={`px-3 py-2.5 text-left text-white font-bold whitespace-nowrap ${
                        f.required ? 'bg-primary-800' : f.group==='Basic'?'bg-slate-700':f.group==='Class'?'bg-emerald-800':'bg-purple-800'
                      }`}>
                        {f.label}{f.required?' *':''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-blue-50">
                    {activeFields.map(f=><td key={f.key} className="px-3 py-2 text-blue-600 italic whitespace-nowrap">{f.example}</td>)}
                  </tr>
                  <tr className="bg-slate-50">
                    {activeFields.map(f=><td key={f.key} className="px-3 py-1.5 text-slate-400 text-xs whitespace-nowrap">{f.hint}</td>)}
                  </tr>
                  <tr>
                    {activeFields.map(f=><td key={f.key} className="px-3 py-2 text-slate-300 italic">← your data here</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold">Before filling the template:</p>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li>Row 1 = headers (don't change), Row 2 = sample (delete before upload)</li>
                  <li>Row 3 = hints (delete before upload), start your data from Row 4</li>
                  <li>Use exact values for Gender/Category/Blood Group (see Reference sheet)</li>
                  <li>Class Name must match exactly as entered in the Classes section</li>
                  <li>Dates: YYYY-MM-DD format preferred</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setStep(1)} className="btn-secondary"><ChevronLeft className="w-4 h-4"/>Back</button>
              <button onClick={downloadTemplate} className="btn-primary flex-1 justify-center py-3">
                <Download className="w-5 h-5"/>Download Excel Template (.xlsx)
              </button>
            </div>
          </div>

          <div className="card p-4 border-dashed border-2 border-slate-300 text-center space-y-2">
            <p className="text-sm text-slate-500">Already have a filled template?</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile}/>
            <button onClick={()=>fileRef.current?.click()} className="btn-outline mx-auto">
              <Upload className="w-4 h-4"/>Upload Filled Template
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Upload ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="card p-8 text-center space-y-5 border-dashed border-2 border-slate-300">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-8 h-8 text-primary-600"/>
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-lg">Upload your filled Excel file</p>
              <p className="text-sm text-slate-400 mt-1">Supports .xlsx · .xls · .csv</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile}/>
            <button onClick={()=>fileRef.current?.click()} className="btn-primary mx-auto py-3 px-8 text-base">
              <Upload className="w-5 h-5"/>Choose File
            </button>
            <p className="text-xs text-slate-400">Or go back and re-download a fresh template</p>
          </div>
          <button onClick={()=>setStep(2)} className="btn-ghost"><ChevronLeft className="w-4 h-4"/>Back to Template</button>
        </div>
      )}

      {/* ── STEP 4: Preview + Import ── */}
      {step === 4 && (
        <div className="space-y-5">
          {/* Summary bar */}
          <div className="card p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-primary-600"/>
              </div>
              <div>
                <p className="font-semibold text-slate-800">{rows.length} rows loaded</p>
                <p className="text-xs text-slate-400">{activeFields.length} columns detected</p>
              </div>
            </div>
            {isDone ? (
              <div className="flex gap-3 ml-auto flex-wrap">
                <span className="badge badge-green">{successCount} admitted</span>
                {errorCount > 0 && <span className="badge badge-red">{errorCount} failed</span>}
              </div>
            ) : importing ? (
              <div className="flex items-center gap-3 ml-auto">
                <div className="w-40 bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-primary-gradient transition-all" style={{width:`${progress}%`}}/>
                </div>
                <span className="text-sm font-semibold text-primary-700">{progress}%</span>
              </div>
            ) : (
              <div className="ml-auto flex gap-3">
                <button onClick={()=>{setStep(3);setRows([]);}} className="btn-secondary"><Trash2 className="w-3.5 h-3.5"/>Clear</button>
                <button onClick={runImport} className="btn-primary">
                  <Upload className="w-4 h-4"/>Import {rows.length} Students
                </button>
              </div>
            )}
          </div>

          {/* Progress bar (while importing) */}
          {importing && (
            <div className="card p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">Importing students…</span>
                <span className="text-primary-600 font-bold">{results.length} / {rows.length}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width:`${progress}%`}}/>
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="text-green-600 font-semibold">✓ {successCount} admitted</span>
                {errorCount > 0 && <span className="text-red-500 font-semibold">✗ {errorCount} failed</span>}
              </div>
            </div>
          )}

          {/* Done summary */}
          {isDone && !importing && (
            <div className={`card p-5 ${errorCount === 0 ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {errorCount === 0 ? <CheckCircle2 className="w-5 h-5 text-green-600"/> : <AlertCircle className="w-5 h-5 text-amber-600"/>}
                <p className="font-bold text-slate-800">
                  {errorCount === 0 ? `All ${successCount} students admitted successfully!` : `Import complete — ${successCount} admitted, ${errorCount} failed`}
                </p>
              </div>
              {errorCount > 0 && <p className="text-xs text-amber-700">Review failed rows below. Fix the errors and re-upload only the failed rows.</p>}
            </div>
          )}

          {/* Data preview table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="font-semibold text-slate-700 text-sm">Data Preview</p>
              {results.length === 0 && <span className="badge badge-blue text-xs">Not imported yet</span>}
            </div>
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="tbl">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="w-10">#</th>
                    {results.length > 0 && <th className="w-24">Status</th>}
                    <th>Name</th>
                    <th>Adm. No.</th>
                    {activeFields.filter(f => !['name','admissionNumber'].includes(f.key)).map(f => (
                      <th key={f.key}>{f.label}</th>
                    ))}
                    {results.length > 0 && <th>Message</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const result = results[i];
                    const rowCls = result?.status === 'success' ? 'bg-green-50' : result?.status === 'error' ? 'bg-red-50' : '';
                    const missing = !row.name || !row.admissionNumber || !row.parentPhone;
                    return (
                      <tr key={i} className={rowCls || (missing ? 'bg-amber-50' : '')}>
                        <td className="text-slate-400 text-xs">{i + 1}</td>
                        {results.length > 0 && (
                          <td>
                            {result ? (
                              result.status === 'success'
                                ? <span className="badge badge-green">✓ Done</span>
                                : <span className="badge badge-red">✗ Error</span>
                            ) : <span className="badge badge-gray">Pending</span>}
                          </td>
                        )}
                        <td className={`font-medium ${missing && !row.name ? 'text-red-500 italic' : ''}`}>
                          {row.name || <span className="text-red-400 text-xs">⚠ Missing</span>}
                        </td>
                        <td className="font-mono text-xs">
                          {row.admissionNumber || <span className="text-red-400 text-xs">⚠ Missing</span>}
                        </td>
                        {activeFields.filter(f => !['name','admissionNumber'].includes(f.key)).map(f => (
                          <td key={f.key} className="text-slate-500 text-xs max-w-xs truncate">
                            {row[f.key] || <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                        {results.length > 0 && (
                          <td className={`text-xs ${result?.status==='error'?'text-red-600':'text-green-600'}`}>
                            {result?.message || '…'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Start import button (bottom) */}
          {!importing && !isDone && (
            <div className="flex justify-end gap-3">
              <button onClick={()=>{setStep(3);setRows([]);}} className="btn-secondary">
                <ChevronLeft className="w-4 h-4"/>Re-upload
              </button>
              <button onClick={runImport} className="btn-primary py-3 px-8 text-base">
                <Upload className="w-5 h-5"/>Import All {rows.length} Students
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
