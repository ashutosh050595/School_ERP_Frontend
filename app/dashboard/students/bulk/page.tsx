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
const ALL_FIELDS: FieldDef[] = [
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
// Fuzzy class name normaliser
// Handles: "Class VI", "class vi", "ClassVI", "Class 6", "VI", "6"
// ─────────────────────────────────────────────────────────────────
const ROMAN: Record<string,string> = {
  i:'1',ii:'2',iii:'3',iv:'4',v:'5',vi:'6',vii:'7',viii:'8',
  ix:'9',x:'10',xi:'11',xii:'12',
};
function normaliseClassName(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')   // symbols → space
    .trim()
    .split(/\s+/)
    .map(w => ROMAN[w] ?? w)       // roman → arabic
    .filter(w => w !== 'class' && w !== 'std' && w !== 'grade' && w !== '-')
    .join(' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
export default function BulkUploadPage() {
  const [step, setStep]           = useState<1|2|3|4>(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(loadSavedColumns);
  const [classes, setClasses]     = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [rows, setRows]           = useState<Record<string,string>[]>([]);
  const [results, setResults]     = useState<RowResult[]>([]);
  // Pre-validation: class resolution map  key=rowIndex, value={classId,sectionId,resolvedName,warn}
  const [classResolution, setClassResolution] = useState<Record<number,{classId:string;sectionId:string;resolvedName:string;warn:string}>>({});
  const [resolving, setResolving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress]   = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load ALL classes (paginated)
  useEffect(() => {
    setClassesLoading(true);
    studentsApi.getClasses()
      .then(r => setClasses(r.data.data || []))
      .catch(() => {})
      .finally(() => setClassesLoading(false));
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

  // ── Pre-validate class/section resolution for all rows
  const resolveClasses = useCallback(async (rowsToResolve: Record<string,string>[]) => {
    if (!rowsToResolve.some(r => r.className)) return; // nothing to resolve
    setResolving(true);

    // Fresh class load to make sure we have latest
    let freshClasses = classes;
    if (freshClasses.length === 0) {
      try { const r = await studentsApi.getClasses(); freshClasses = r.data.data || []; setClasses(freshClasses); }
      catch {}
    }

    // Build lookup maps from the already-loaded classes (sections are nested inside)
    const classById: Record<string,any> = {};
    const classNormMap: Record<string,string> = {};      // normalised → classId
    const classRawMap:  Record<string,string> = {};      // lowercase  → classId
    freshClasses.forEach(c => {
      classById[c.id] = c;
      classRawMap[c.name.toLowerCase().trim()] = c.id;
      classNormMap[normaliseClassName(c.name)]  = c.id;
    });

    // No separate getSections() call needed — sections are nested inside each class object
    // from GET /admissions/classes which includes sections: { ... }

    const resolution: Record<number,{classId:string;sectionId:string;resolvedName:string;warn:string}> = {};

    for (let i = 0; i < rowsToResolve.length; i++) {
      const row = rowsToResolve[i];
      if (!row.className) { resolution[i] = {classId:'',sectionId:'',resolvedName:'',warn:''}; continue; }

      const rawKey  = row.className.toLowerCase().trim();
      const normKey = normaliseClassName(row.className);

      // Try exact → raw lowercase → normalised
      const classId = classRawMap[rawKey] || classNormMap[normKey] || '';
      const resolvedClass = classId ? classById[classId] : null;
      const resolvedName  = resolvedClass?.name || '';

      let sectionId = '';
      let sectionWarn = '';
      if (classId && row.sectionName) {
        // Use sections already nested in the class object — no separate API call needed
        const nestedSections: any[] = classById[classId]?.sections || [];
        const rawSec = row.sectionName.trim().toLowerCase();
        const sec = nestedSections.find((s:any) =>
          s.section?.toLowerCase() === rawSec ||
          s.section?.toLowerCase() === rawSec.replace('section','').trim() ||
          s.section?.toLowerCase() === rawSec.replace('sec','').trim()
        );
        if (sec) {
          sectionId = sec.id;  // This is the classSectionId the backend needs
        } else {
          // Show available sections in the warning to help admin fix the Excel
          const available = nestedSections.map((s:any) => s.section).join(', ');
          sectionWarn = `Section "${row.sectionName}" not found in ${resolvedName}${available ? ` (available: ${available})` : ''} — will import without section`;
        }
      }

      const warn = !classId
        ? `Class "${row.className}" not found — will import without class assignment`
        : sectionWarn;

      resolution[i] = { classId, sectionId, resolvedName, warn };
    }

    setClassResolution(resolution);
    setResolving(false);
    return resolution;
  }, [classes]);

  // ── Load existing admission numbers for duplicate detection
  const [existingAdmNos, setExistingAdmNos] = useState<Set<string>>(new Set());
  const [dupeCheckDone,  setDupeCheckDone]  = useState(false);

  const loadExistingAdmNos = useCallback(async () => {
    setDupeCheckDone(false);
    const all: string[] = [];
    let pg = 1;
    while (true) {
      try {
        const r = await studentsApi.getAll({ page: pg, limit: 100 });
        const batch: any[] = Array.isArray(r.data.data) ? r.data.data : r.data.data?.students || [];
        batch.forEach((s:any) => { if (s.admissionNumber) all.push(s.admissionNumber); });
        if (batch.length < 100) break;
        pg++;
      } catch { break; }
    }
    setExistingAdmNos(new Set(all));
    setDupeCheckDone(true);
    return new Set(all);
  }, []);

  // Run resolution whenever rows change in step 4
  useEffect(() => {
    if (step === 4 && rows.length > 0) { resolveClasses(rows); loadExistingAdmNos(); }
  }, [step, rows]); // eslint-disable-line

  // ── Speed presets (ms between requests)
  const SPEEDS = [
    { label:'Slow (safe)',   ms:1200, desc:'1.2s gap — recommended for 50+ students' },
    { label:'Normal',        ms:700,  desc:'0.7s gap — good for up to 50 students' },
    { label:'Fast',          ms:350,  desc:'0.35s gap — small batches only (<20)' },
  ];
  const [speedIdx,   setSpeedIdx]   = useState(0); // default: Slow
  const [paused,     setPaused]     = useState(false);
  const [rateLimited,setRateLimited]= useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);

  const stopImport = () => { abortRef.current = true; setPaused(false); };

  // Retry a request up to maxRetries times on 429, with exponential backoff
  const withRetry = async (fn: () => Promise<any>, maxRetries = 4): Promise<any> => {
    let lastErr: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        setRateLimited(false);
        return result;
      } catch(err: any) {
        lastErr = err;
        const status = err?.response?.status;
        // 429 = rate limited, 503 = server busy — wait and retry
        if ((status === 429 || status === 503) && attempt < maxRetries) {
          const waitMs = Math.min(2000 * Math.pow(2, attempt), 16000); // 2s → 4s → 8s → 16s
          setRateLimited(true);
          toast(`Rate limited — waiting ${waitMs/1000}s before retry ${attempt+1}/${maxRetries}…`, { icon:'⏳', id:'rate-limit', duration: waitMs });
          await new Promise(r => setTimeout(r, waitMs));
          setRateLimited(false);
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  };

  // ── Step 4: import rows
  const runImport = async () => {
    setImporting(true);
    setProgress(0);
    setRateLimited(false);
    abortRef.current = false;
    pauseRef.current = false;
    const res: RowResult[] = [];

    // Build class resolution — use pre-validated map, or re-resolve if empty
    let resolution = classResolution;
    if (Object.keys(resolution).length === 0) {
      resolution = await resolveClasses(rows) || {};
    }

    const delay = SPEEDS[speedIdx].ms;

    for (let i = 0; i < rows.length; i++) {
      // Abort check
      if (abortRef.current) {
        toast('Import stopped.', { icon:'⛔' });
        break;
      }

      // Pause: wait until unpaused
      while (pauseRef.current) {
        await new Promise(r => setTimeout(r, 300));
        if (abortRef.current) break;
      }
      if (abortRef.current) break;

      setCurrentRow(i + 1);
      const row = rows[i];

      // Use pre-resolved class/section (non-blocking — warn only, never fail)
      const resolved  = resolution[i] || { classId:'', sectionId:'', warn:'' };
      const classId   = resolved.classId;
      const sectionId = resolved.sectionId;

      // Check duplicate by admission number
      if (existingAdmNos.has(row.admissionNumber)) {
        res.push({ row:i+1, name:row.name||'—', admNo:row.admissionNumber, status:'skip', message:'Already exists — skipped' });
        setProgress(Math.round(((i+1)/rows.length)*100));
        setResults([...res]);
        if (i < rows.length - 1) await new Promise(r => setTimeout(r, 50));
        continue;
      }

      // Build body matching EXACTLY the working StudentForm body structure
      // (same fields, same nesting — backend accepts this shape)
      const body: any = {
        name:            row.name,
        admissionNumber: row.admissionNumber,
      };
      if (row.dob)            body.dob            = row.dob;
      if (row.gender)         body.gender         = row.gender;
      if (row.phone)          body.phone          = row.phone;
      if (row.address)        body.address        = row.address;
      if (row.religion)       body.religion       = row.religion;
      if (row.category)       body.category       = row.category;
      if (row.bloodGroup)     body.bloodGroup     = row.bloodGroup;
      if (row.rollNumber)     body.rollNumber     = row.rollNumber;
      if (row.nationality)    body.nationality    = row.nationality;
      if (row.aadharNumber)   body.aadharNumber   = row.aadharNumber;
      if (row.previousSchool) body.previousSchool = row.previousSchool;

      // Class/section: send classId + sectionId (same as StudentForm — working)
      if (classId)   body.classId   = classId;
      if (sectionId) body.sectionId = sectionId;

      // Parent block — same structure as StudentForm
      const parent: any = {};
      if (row.parentPhone)      parent.primaryPhone     = row.parentPhone;
      if (row.fatherName)       parent.fatherName       = row.fatherName;
      if (row.motherName)       parent.motherName       = row.motherName;
      if (row.parentEmail)      parent.email            = row.parentEmail;
      if (row.parentOccupation) parent.occupation       = row.parentOccupation;
      if (row.emergencyContact) parent.emergencyContact = row.emergencyContact;
      if (Object.keys(parent).length > 0) body.parent = parent;

      // Client-side validation
      if (!body.name || !body.admissionNumber) {
        res.push({ row:i+1, name:row.name||'—', admNo:row.admissionNumber||'—', status:'error', message:'Missing Name or Admission Number' });
        setProgress(Math.round(((i+1)/rows.length)*100));
        setResults([...res]);
        continue;
      }
      if (!row.parentPhone) {
        res.push({ row:i+1, name:row.name, admNo:row.admissionNumber, status:'error', message:'Missing Parent Phone (required)' });
        setProgress(Math.round(((i+1)/rows.length)*100));
        setResults([...res]);
        continue;
      }

      try {
        await withRetry(() => studentsApi.create(body));
        const warn = resolved.warn ? ` · ⚠ ${resolved.warn}` : '';
        res.push({ row:i+1, name:body.name, admNo:body.admissionNumber, status:'success', message:`Admitted${warn}` });
      } catch(err: any) {
        const status = err?.response?.status;
        const data   = err?.response?.data;
        let msg = data?.message || data?.error || data?.errors?.[0]?.message || `Error ${status||''}`;
        if (status === 429) msg = 'Rate limited — try slower speed next time';
        if (status === 404) msg = 'API route not found — check backend';
        if (status === 409) msg = 'Admission number already exists';
        res.push({ row:i+1, name:body.name, admNo:body.admissionNumber, status:'error', message: msg });
      }

      setProgress(Math.round(((i+1)/rows.length)*100));
      setResults([...res]);

      // Delay between requests
      if (i < rows.length - 1) await new Promise(r => setTimeout(r, delay));
    }

    setImporting(false);
    setCurrentRow(0);
    abortRef.current = false;
    pauseRef.current = false;
    setPaused(false);

    const ok  = res.filter(r => r.status === 'success').length;
    const err = res.filter(r => r.status === 'error').length;
    if (err === 0) toast.success(`All ${ok} students admitted!`);
    else if (ok > 0) toast(`${ok} admitted, ${err} failed — see table for details`, { icon:'⚠️', duration:6000 });
    else toast.error(`All ${err} rows failed — check errors below`);
  };

  type RowResult = { row:number; name:string; admNo:string; status:'success'|'error'|'skip'; message:string; };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount   = results.filter(r => r.status === 'error').length;
  const skipCount    = results.filter(r => r.status === 'skip').length;
  const isDone       = !importing && results.length > 0 && (results.length === rows.length || abortRef.current);

  // Estimated time remaining
  const etaSec = importing && currentRow > 0
    ? Math.round(((rows.length - currentRow) * SPEEDS[speedIdx].ms) / 1000)
    : 0;

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

          {/* Speed selector — shown before import starts */}
          {!importing && results.length === 0 && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-blue-600"/>
                <p className="text-sm font-semibold text-slate-700">Import Speed</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {SPEEDS.map((s, i) => (
                  <label key={i} className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${speedIdx===i?'border-primary-400 bg-primary-50':'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="speed" checked={speedIdx===i} onChange={()=>setSpeedIdx(i)} className="hidden"/>
                    <span className="text-sm font-semibold text-slate-700">{s.label}</span>
                    <span className="text-xs text-slate-400">{s.desc}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Recommended: Slow (safe)</span> for 20+ students. The backend rate-limiter allows ~100 requests per 15 minutes. Faster speeds risk hitting this limit and triggering "Too many requests" errors. The importer will auto-retry on rate limits, but slower is more reliable.
                </p>
              </div>
            </div>
          )}

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

            {/* Controls */}
            {isDone ? (
              <div className="flex gap-3 ml-auto flex-wrap">
                <span className="badge badge-green">{successCount} admitted</span>
                {skipCount  > 0 && <span className="badge badge-blue">{skipCount} skipped</span>}
                {errorCount > 0 && <span className="badge badge-red">{errorCount} failed</span>}
              </div>
            ) : importing ? (
              <div className="flex items-center gap-3 ml-auto flex-wrap">
                {rateLimited && <span className="badge badge-red animate-pulse">⏳ Rate limited — retrying…</span>}
                <div className="w-36 bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-primary-gradient transition-all" style={{width:`${progress}%`}}/>
                </div>
                <span className="text-sm font-semibold text-primary-700">{progress}%</span>
                <button
                  onClick={() => { pauseRef.current = !pauseRef.current; setPaused(p=>!p); }}
                  className="btn-secondary text-xs py-1.5"
                >
                  {paused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button onClick={stopImport} className="btn-secondary text-xs py-1.5 border-red-200 text-red-600 hover:bg-red-50">
                  ⛔ Stop
                </button>
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
                <span className="font-medium text-slate-700">
                  {paused ? '⏸ Paused' : rateLimited ? '⏳ Waiting for rate limit…' : `Importing… row ${currentRow} of ${rows.length}`}
                </span>
                <span className="text-primary-600 font-bold">{results.length} / {rows.length}</span>
              </div>
              <div className="progress-bar">
                <div className={`progress-fill transition-all ${rateLimited?'opacity-50':''}`} style={{width:`${progress}%`}}/>
              </div>
              <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
                <span className="text-green-600 font-semibold">✓ {successCount} admitted</span>
                {errorCount > 0 && <span className="text-red-500 font-semibold">✗ {errorCount} failed</span>}
                {etaSec > 0 && !paused && !rateLimited && <span className="text-slate-400">~{etaSec}s remaining</span>}
                {paused && <span className="text-amber-600 font-semibold">Paused — click Resume to continue</span>}
              </div>
            </div>
          )}

          {/* Done summary */}
          {isDone && !importing && (
            <div className={`card p-5 ${errorCount === 0 ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {errorCount === 0 ? <CheckCircle2 className="w-5 h-5 text-green-600"/> : <AlertCircle className="w-5 h-5 text-amber-600"/>}
                <p className="font-bold text-slate-800">
                  {errorCount === 0
                    ? `All ${successCount} students admitted successfully!`
                    : `Import complete — ${successCount} admitted, ${errorCount} failed`}
                </p>
              </div>
              {errorCount > 0 && (
                <div className="text-xs text-amber-700 space-y-1">
                  <p>Failed rows are shown in red below. Common causes:</p>
                  <ul className="list-disc list-inside ml-1 space-y-0.5">
                    <li><strong>Admission number already exists</strong> — student is already in system</li>
                    <li><strong>Rate limited</strong> — try again with "Slow (safe)" speed selected</li>
                    <li><strong>API route not found</strong> — backend may be restarting, wait 30s and retry</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Class resolution panel — shown before import starts */}
          {!importing && results.length === 0 && rows.some(r => r.className) && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="font-semibold text-slate-700 text-sm">Class & Section Resolution</p>
                {resolving
                  ? <span className="text-xs text-slate-400 flex items-center gap-1"><div className="w-3 h-3 border border-primary-600 border-t-transparent rounded-full animate-spin"/>Resolving…</span>
                  : (() => {
                      const warns = Object.values(classResolution).filter(r => r.warn).length;
                      return warns > 0
                        ? <span className="badge badge-red">{warns} unresolved</span>
                        : <span className="badge badge-green">All resolved ✓</span>;
                    })()
                }
              </div>
              {!resolving && (
                <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                  {rows.map((row, i) => {
                    if (!row.className) return null;
                    const res = classResolution[i];
                    if (!res) return null;
                    return (
                      <div key={i} className={`flex items-center gap-3 px-4 py-2 text-sm ${res.warn ? 'bg-amber-50' : ''}`}>
                        <span className="text-slate-400 text-xs w-6 flex-shrink-0">{i+1}</span>
                        <span className="text-slate-500 w-28 flex-shrink-0 truncate">{row.admissionNumber}</span>
                        {/* What was in Excel */}
                        <span className="font-mono text-xs text-slate-600 flex-shrink-0">
                          "{row.className}{row.sectionName ? `-${row.sectionName}` : ''}"
                        </span>
                        <span className="text-slate-300 flex-shrink-0">→</span>
                        {res.warn ? (
                          <span className="text-amber-600 text-xs flex items-center gap-1 min-w-0">
                            <AlertCircle className="w-3 h-3 flex-shrink-0"/>
                            <span className="truncate">{res.warn}</span>
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs flex items-center gap-1 flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3"/>
                            {res.resolvedName}{res.sectionId ? ` · Sec OK` : row.sectionName ? ' · No sec' : ''}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!resolving && Object.values(classResolution).some(r => r.warn) && (
                <div className="px-4 py-3 border-t border-amber-100 bg-amber-50">
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Rows with ⚠ warnings will still be imported</span> — students will be admitted without a class/section assignment. You can assign them manually afterwards.
                    The class names in your Excel must match <em>exactly</em> as they appear in <strong>Students → Classes & Sections</strong>.
                  </p>
                  <button
                    onClick={() => resolveClasses(rows)}
                    className="btn-ghost text-xs mt-2 text-amber-700 hover:bg-amber-100"
                  >
                    <RefreshCw className="w-3 h-3"/>Re-check
                  </button>
                </div>
              )}
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
                <Upload className="w-5 h-5"/>Import All {rows.length} Students · {SPEEDS[speedIdx].label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
