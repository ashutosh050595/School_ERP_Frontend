'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Eye, Edit, Trash2, GraduationCap, Upload, Download, Filter, X, Camera, AlertCircle, FileText, FileSpreadsheet, SlidersHorizontal, Users, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { studentsApi, idcardsApi, api } from '@/lib/api';
import * as XLSX from 'xlsx';
import { fmt, downloadBlob, GENDERS, BLOOD_GROUPS, CATEGORIES } from '@/lib/utils';
import { Modal, Confirm, Pagination, SearchInput, Empty, TableSkeleton, Avatar, Tabs } from '@/components/ui';
import toast from 'react-hot-toast';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses]   = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('students');
  const [showAdd, setShowAdd]   = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await studentsApi.getAll({ page, limit:LIMIT, search:search||undefined, classSectionId:classFilter||undefined });
      // Backend returns { success, data: [...], pagination: { total, ... } }
      const respData = r.data.data || [];
      setStudents(Array.isArray(respData) ? respData : respData.students || []);
      setTotal(r.data.pagination?.total || r.data.data?.total || 0);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  }, [page, search, classFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { studentsApi.getClasses().then(r=>setClasses(r.data.data||[])).catch(()=>{}); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await studentsApi.delete(deleteId); toast.success('Student removed'); setDeleteId(null); load(); }
    catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const downloadIdCard = async (admNo: string) => {
    try {
      const r = await idcardsApi.generate(admNo);
      downloadBlob(r.data, `idcard-${admNo}.pdf`);
      toast.success('ID Card downloaded');
    } catch { toast.error('Failed to generate ID card'); }
  };

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div><h1 className="page-title">Students</h1><p className="page-sub">{total} students enrolled</p></div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Admit Student</button>
      </div>

      <Tabs tabs={[{key:'students',label:'All Students'},{key:'directory',label:'📋 Directory'},{key:'classes',label:'Classes & Sections'},{key:'photos',label:'Student Photos'},{key:'bulk',label:'⬆ Bulk Upload'}]} active={tab} onChange={setTab} />

      {tab==='students' && <>
        <div className="card p-4 flex flex-wrap gap-3">
          <SearchInput value={search} onChange={v=>{setSearch(v);setPage(1);}} placeholder="Name or admission number…" />
          <select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setPage(1);}} className="form-select w-40">
            <option value="">All Classes</option>
            {classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {(search||classFilter) && <button onClick={()=>{setSearch('');setClassFilter('');}} className="btn-ghost text-xs"><X className="w-3 h-3"/>Clear</button>}
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Student</th><th>Adm. No.</th><th>Class</th><th>Gender</th><th>Parent</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <TableSkeleton rows={8} cols={8}/> : students.length===0 ? (
                  <tr><td colSpan={8}><Empty icon={GraduationCap} title="No students found" sub="Try adjusting filters or admit a new student" action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Admit Student</button>}/></td></tr>
                ) : students.map((s:any)=>(
                  <tr key={s.id}>
                    <td><div className="flex items-center gap-2.5"><Avatar name={s.name} size="sm"/><div><p className="font-medium text-slate-800 text-sm">{s.name}</p><p className="text-xs text-slate-400">{s.dob?fmt.date(s.dob):''}</p></div></div></td>
                    <td><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{s.admissionNumber}</span></td>
                    <td className="text-sm">{s.classSection?.class?.name||s.class?.name||'—'}{s.classSection?.section?`-${s.classSection.section}`:s.section?.section?`-${s.section.section}`:''}</td>
                    <td><span className="badge badge-gray">{s.gender||'—'}</span></td>
                    <td className="text-sm text-slate-600">{s.parent?.fatherName||'—'}</td>
                    <td className="text-sm text-slate-600">{s.parent?.primaryPhone||'—'}</td>
                    <td><span className={`badge ${s.isActive!==false?'badge-green':'badge-red'}`}>{s.isActive!==false?'Active':'Inactive'}</span></td>
                    <td><div className="flex gap-1">
                      <button onClick={()=>setViewItem(s)} className="btn-icon" title="View"><Eye className="w-3.5 h-3.5"/></button>
                      <button onClick={()=>setEditItem(s)} className="btn-icon" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                      <button onClick={()=>downloadIdCard(s.admissionNumber)} className="btn-icon" title="ID Card"><Download className="w-3.5 h-3.5"/></button>
                      <button onClick={()=>setDeleteId(s.id)} className="btn-icon hover:text-danger-500" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage}/>
        </div>
      </>}

      {tab==='directory' && <StudentDirectory classes={classes}/>}
      {tab==='classes' && <ClassesManager classes={classes} reload={()=>studentsApi.getClasses().then(r=>setClasses(r.data.data||[]))}/>}
      {tab==='photos'  && <PhotosManager classes={classes}/>}
      {tab==='bulk'    && <BulkUploadRedirect/>}

      {showAdd && <StudentForm onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}} classes={classes}/>}
      {editItem && <StudentForm student={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null);load();}} classes={classes}/>}
      {viewItem && <StudentProfile student={viewItem} onClose={()=>setViewItem(null)} onIdCard={()=>downloadIdCard(viewItem.admissionNumber)}/>}
      {deleteId && <Confirm title="Delete Student" message="This will permanently remove the student and all related records. This cannot be undone." onConfirm={handleDelete} onCancel={()=>setDeleteId(null)} loading={deleting}/>}
    </div>
  );
}

function StudentForm({ student, onClose, onSuccess, classes }: any) {
  const editing = !!student;
  const [form, setForm] = useState({
    name: student?.name||'', admissionNumber: student?.admissionNumber||'',
    dob: student?.dob?fmt.dateInput(student.dob):'', gender: student?.gender||'MALE',
    phone: student?.phone||'', address: student?.address||'',
    classId: student?.class?.id||'', sectionId: student?.section?.id||'',
    religion: student?.religion||'', category: student?.category||'GENERAL',
    bloodGroup: student?.bloodGroup||'', rollNumber: student?.rollNumber||'',
    fatherName: student?.parent?.fatherName||'', motherName: student?.parent?.motherName||'',
    parentPhone: student?.parent?.primaryPhone||'', parentEmail: student?.parent?.email||'',
    parentOccupation: student?.parent?.occupation||'', emergencyContact: student?.parent?.emergencyContact||'',
    nationality: student?.nationality||'Indian', aadharNumber: student?.aadharNumber||'',
    previousSchool: student?.previousSchool||'',
  });
  const [sections, setSections] = useState<any[]>([]);
  const [saving, setSaving]     = useState(false);
  const f = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    if (form.classId) studentsApi.getSections(form.classId).then(r=>setSections(r.data.data||[])).catch(()=>{});
    else setSections([]);
  },[form.classId]);

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = {
        name:form.name, admissionNumber:form.admissionNumber, dob:form.dob||undefined,
        gender:form.gender, phone:form.phone||undefined, address:form.address||undefined,
        classId:form.classId||undefined, sectionId:form.sectionId||undefined,
        religion:form.religion||undefined, category:form.category, bloodGroup:form.bloodGroup||undefined,
        rollNumber:form.rollNumber||undefined, nationality:form.nationality||undefined,
        aadharNumber:form.aadharNumber||undefined, previousSchool:form.previousSchool||undefined,
        parent:{ fatherName:form.fatherName||undefined, motherName:form.motherName||undefined,
          primaryPhone:form.parentPhone||undefined, email:form.parentEmail||undefined,
          occupation:form.parentOccupation||undefined, emergencyContact:form.emergencyContact||undefined },
      };
      if (editing) await studentsApi.update(student.id, body);
      else await studentsApi.create(body);
      toast.success(editing?'Student updated!':'Student admitted!');
      onSuccess();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };

  return (
    <Modal title={editing?`Edit — ${student.name}`:'Admit New Student'} onClose={onClose} size="xl">
      <form onSubmit={submit} className="space-y-5">
        <Section title="Basic Information">
          <Row2><F label="Full Name *"><input required value={form.name} onChange={e=>f('name',e.target.value)} className="form-input" placeholder="Student's full name"/></F>
          <F label="Admission Number *"><input required value={form.admissionNumber} onChange={e=>f('admissionNumber',e.target.value)} className="form-input" placeholder="e.g. 2025001"/></F></Row2>
          <Row3>
            <F label="Date of Birth"><input type="date" value={form.dob} onChange={e=>f('dob',e.target.value)} className="form-input"/></F>
            <F label="Gender *"><select value={form.gender} onChange={e=>f('gender',e.target.value)} className="form-select">{GENDERS.map(g=><option key={g} value={g}>{g}</option>)}</select></F>
            <F label="Blood Group"><select value={form.bloodGroup} onChange={e=>f('bloodGroup',e.target.value)} className="form-select"><option value="">Select</option>{BLOOD_GROUPS.map(b=><option key={b} value={b}>{b}</option>)}</select></F>
          </Row3>
          <Row3>
            <F label="Category"><select value={form.category} onChange={e=>f('category',e.target.value)} className="form-select">{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></F>
            <F label="Religion"><input value={form.religion} onChange={e=>f('religion',e.target.value)} className="form-input" placeholder="e.g. Hindu"/></F>
            <F label="Nationality"><input value={form.nationality} onChange={e=>f('nationality',e.target.value)} className="form-input"/></F>
          </Row3>
          <Row2>
            <F label="Phone"><input value={form.phone} onChange={e=>f('phone',e.target.value)} className="form-input" placeholder="Student phone"/></F>
            <F label="Aadhar Number"><input value={form.aadharNumber} onChange={e=>f('aadharNumber',e.target.value)} className="form-input" placeholder="12-digit Aadhar"/></F>
          </Row2>
          <F label="Address"><textarea value={form.address} onChange={e=>f('address',e.target.value)} className="form-input" rows={2} placeholder="Full address"/></F>
        </Section>

        <Section title="Class & Section">
          <Row3>
            <F label="Class"><select value={form.classId} onChange={e=>f('classId',e.target.value)} className="form-select"><option value="">Select class</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
            <F label="Section"><select value={form.sectionId} onChange={e=>f('sectionId',e.target.value)} className="form-select" disabled={!sections.length}><option value="">Select section</option>{sections.map((s:any)=><option key={s.id} value={s.id}>{s.section}</option>)}</select></F>
            <F label="Roll Number"><input value={form.rollNumber} onChange={e=>f('rollNumber',e.target.value)} className="form-input" placeholder="Roll no."/></F>
          </Row3>
          <F label="Previous School"><input value={form.previousSchool} onChange={e=>f('previousSchool',e.target.value)} className="form-input" placeholder="Previous school name (if any)"/></F>
        </Section>

        <Section title="Parent / Guardian Details">
          <Row2>
            <F label="Father's Name"><input value={form.fatherName} onChange={e=>f('fatherName',e.target.value)} className="form-input" placeholder="Father's full name"/></F>
            <F label="Mother's Name"><input value={form.motherName} onChange={e=>f('motherName',e.target.value)} className="form-input" placeholder="Mother's full name"/></F>
          </Row2>
          <Row3>
            <F label="Parent Phone *"><input required value={form.parentPhone} onChange={e=>f('parentPhone',e.target.value)} className="form-input" placeholder="Primary contact"/></F>
            <F label="Parent Email"><input type="email" value={form.parentEmail} onChange={e=>f('parentEmail',e.target.value)} className="form-input" placeholder="Email"/></F>
            <F label="Emergency Contact"><input value={form.emergencyContact} onChange={e=>f('emergencyContact',e.target.value)} className="form-input" placeholder="Alternate number"/></F>
          </Row3>
          <F label="Occupation"><input value={form.parentOccupation} onChange={e=>f('parentOccupation',e.target.value)} className="form-input" placeholder="Father/Guardian occupation"/></F>
        </Section>

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving…</>:editing?'Update Student':'Admit Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StudentProfile({ student, onClose, onIdCard }:any) {
  // DB returns flat fields: parentName, parentPhone, fatherName, motherName etc.
  const className = student.classSection?.class?.name || student.class?.name || '—';
  const section   = student.classSection?.section || student.section?.section || '';
  const dob       = student.dateOfBirth || student.dob;

  const row = (label: string, value: any) => (
    <div key={label} className="flex flex-col py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</span>
      <span className="text-slate-700 text-sm">{value || '—'}</span>
    </div>
  );

  return (
    <Modal title="Student Profile" onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
          <Avatar name={student.name} size="lg"/>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-800">{student.name}</h3>
            <p className="text-primary-600 font-mono text-sm">{student.admissionNumber}</p>
            <p className="text-slate-500 text-sm">{className}{section ? `-${section}` : ''}</p>
            <span className={`badge mt-1 ${student.isActive!==false?'badge-green':'badge-red'}`}>{student.isActive!==false?'Active':'Inactive'}</span>
          </div>
        </div>

        {/* Two-column detail grid */}
        <div className="grid grid-cols-2 gap-x-8">
          {/* Left column — Personal */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Personal Details</p>
            {row('Gender',       student.gender)}
            {row('Date of Birth', dob ? fmt.date(dob) : null)}
            {row('Blood Group',  student.bloodGroup)}
            {row('Category',     student.category)}
            {row('Religion',     student.religion)}
            {row('Nationality',  student.nationality)}
            {row('Phone',        student.phone)}
            {row('Aadhaar',      student.aadhaarNumber)}
            {row('Previous School', student.previousSchool)}
          </div>
          {/* Right column — Academic + Family */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Academic & Family</p>
            {row('Roll Number',  student.rollNumber)}
            {row('Class',        className + (section ? `-${section}` : ''))}
            {row("Father's Name", student.fatherName || student.parent?.fatherName)}
            {row("Mother's Name", student.motherName || student.parent?.motherName)}
            {row('Parent Name',  student.parentName)}
            {row('Parent Phone', student.parentPhone || student.parent?.primaryPhone)}
            {row('Parent Email', student.parentEmail || student.parent?.email)}
            {row('Parent Occupation', student.parentOccupation)}
            {row('Guardian',     student.guardianName)}
            {row('Guardian Phone', student.guardianPhone)}
          </div>
        </div>

        {/* Full-width address */}
        <div className="border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Address</span>
          <p className="text-slate-700 text-sm mt-0.5">{student.address || '—'}</p>
        </div>

        <div className="flex gap-3 pt-3 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Close</button>
          <button onClick={onIdCard} className="btn-primary flex-1 justify-center"><Download className="w-4 h-4"/>ID Card PDF</button>
        </div>
      </div>
    </Modal>
  );
}

function ClassesManager({ classes, reload }:any) {
  const [showAdd,      setShowAdd]      = useState(false);
  const [expanded,     setExpanded]     = useState<string|null>(null);
  const [deleteClassId,setDeleteClassId]= useState<string|null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [academicYears,setAcademicYears]= useState<any[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);

  // Load academic years for the create-class form
  useEffect(() => {
    api.get('/admissions/academic-years')
      .then(r => setAcademicYears(r.data.data || []))
      .catch(() => {})
      .finally(() => setYearsLoading(false));
  }, []);

  const currentYear = academicYears.find((y:any) => y.isCurrent) || academicYears[0];

  const toggleExpand = (id:string) => setExpanded(p => p === id ? null : id);

  const deleteClass = async () => {
    if (!deleteClassId) return;
    setDeleting(true);
    try {
      await studentsApi.deleteClass(deleteClassId);
      toast.success('Class deleted');
      setDeleteClassId(null);
      reload();
    } catch(err:any) {
      toast.error(err.response?.data?.message || 'Cannot delete — class may have enrolled students');
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={()=>setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4"/>Add Class
        </button>
      </div>

      {/* Classes list */}
      <div className="space-y-2">
        {classes.length === 0 && (
          <div className="card p-10 text-center text-slate-400">
            <p className="font-medium">No classes yet.</p>
            <p className="text-sm mt-1">Create your first class using the button above.</p>
          </div>
        )}
        {classes.map((c:any) => {
          // sections come nested in the class object from getClasses
          const secs: any[] = c.sections || [];
          return (
            <div key={c.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50" onClick={()=>toggleExpand(c.id)}>
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                  {c.name.replace(/[^0-9IVXivx]/g,'').slice(0,3) || c.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {secs.length} section{secs.length !== 1 ? 's' : ''}
                    {c.academicYear?.name ? ` · ${c.academicYear.name}` : ''}
                  </p>
                </div>
                <button
                  onClick={e=>{e.stopPropagation(); setDeleteClassId(c.id);}}
                  className="btn-icon hover:text-red-500 mr-2" title="Delete class"
                >
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
                <span className="text-xs text-slate-400">{expanded===c.id?'▲':'▼'}</span>
              </div>
              {expanded === c.id && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-3 mb-2">Sections</p>
                  {secs.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No sections — sections are created together with the class.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {secs.map((s:any) => (
                        <span key={s.id} className="badge badge-blue">Section {s.section}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create class modal */}
      {showAdd && (
        <CreateClassModal
          academicYears={academicYears}
          yearsLoading={yearsLoading}
          defaultYearId={currentYear?.id || ''}
          onClose={()=>setShowAdd(false)}
          onSuccess={()=>{ setShowAdd(false); reload(); }}
        />
      )}

      {deleteClassId && (
        <Confirm
          title="Delete Class"
          message="This will permanently delete the class and all its sections. Classes with enrolled students cannot be deleted."
          onConfirm={deleteClass}
          onCancel={()=>setDeleteClassId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

// Separate modal for class creation — keeps the form clean
function CreateClassModal({ academicYears, yearsLoading, defaultYearId, onClose, onSuccess }:any) {
  const [name,         setName]         = useState('');
  const [academicYearId, setAcademicYearId] = useState(defaultYearId);
  // sections: comma-separated input → split into array on submit
  const [sectionsInput, setSectionsInput] = useState('A');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Parse sections: "A, B, C" → ["A","B","C"]
    const sections = sectionsInput
      .split(/[,;\n]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    if (!name.trim())        return setError('Class name is required.');
    if (!academicYearId)     return setError('Please select an academic year. Create one in Session & Years first.');
    if (sections.length < 1) return setError('At least one section is required (e.g. A).');

    setSaving(true);
    try {
      await studentsApi.createClass({
        name:          name.trim(),
        academicYearId,
        sections,           // ← what the backend actually expects
      });
      toast.success(`Class "${name.trim()}" created with ${sections.length} section${sections.length>1?'s':''}!`);
      onSuccess();
    } catch(err:any) {
      const msg = err.response?.data?.message
        || err.response?.data?.error
        || (err.response?.data?.errors as any[])?.[0]?.message
        || 'Failed to create class';
      setError(msg);
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Create New Class" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">

        {/* Academic year picker */}
        <div>
          <label className="form-label">Academic Year *</label>
          {yearsLoading ? (
            <div className="form-input text-slate-400 text-sm">Loading years…</div>
          ) : academicYears.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              No academic years found. Please create one first in{' '}
              <a href="/dashboard/session" className="font-semibold underline">Session & Years</a>.
            </div>
          ) : (
            <select
              value={academicYearId}
              onChange={e=>setAcademicYearId(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Select academic year</option>
              {academicYears.map((y:any) => (
                <option key={y.id} value={y.id}>
                  {y.name}{y.isCurrent ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Class name */}
        <div>
          <label className="form-label">Class Name *</label>
          <input
            required
            value={name}
            onChange={e=>setName(e.target.value)}
            className="form-input"
            placeholder="e.g. Class I, Class VI, Class X"
          />
        </div>

        {/* Sections */}
        <div>
          <label className="form-label">Sections * <span className="font-normal text-slate-400">(comma-separated)</span></label>
          <input
            value={sectionsInput}
            onChange={e=>setSectionsInput(e.target.value)}
            className="form-input"
            placeholder="A, B, C"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Enter section letters separated by commas. E.g. <code className="bg-slate-100 px-1 rounded">A, B</code> creates two sections.
            Sections cannot be added later — create all needed sections now.
          </p>
          {/* Preview */}
          {sectionsInput.trim() && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {sectionsInput.split(/[,;\n]+/).map(s=>s.trim().toUpperCase()).filter(s=>s).map(s=>(
                <span key={s} className="badge badge-blue">Section {s}</span>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving || academicYears.length === 0} className="btn-primary flex-1 justify-center">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Creating…</>
              : 'Create Class'
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PhotosManager({ classes }:any) {
  const singleRef = useRef<HTMLInputElement>(null);
  const bulkRef   = useRef<HTMLInputElement>(null);
  const [admNo, setAdmNo]     = useState('');
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const uploadSingle = async (file: File) => {
    if(!admNo) return toast.error('Enter admission number first');
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('photo', file); fd.append('admissionNumber', admNo);
      await studentsApi.uploadPhoto(fd);
      toast.success('Photo uploaded!');
    } catch(err:any){ toast.error(err.response?.data?.message||'Upload failed'); }
    finally{ setUploading(false); }
  };

  const uploadBulk = async (file: File) => {
    setBulkUploading(true); setBulkResult(null);
    try {
      const fd = new FormData(); fd.append('photos', file);
      const r = await studentsApi.bulkPhoto(fd);
      setBulkResult(r.data.data);
      toast.success('Bulk upload done!');
    } catch(err:any){ toast.error(err.response?.data?.message||'Upload failed'); }
    finally{ setBulkUploading(false); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Single photo upload */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Camera className="w-5 h-5 text-blue-600"/></div>
          <div><p className="font-bold text-slate-800">Upload Single Photo</p><p className="text-xs text-slate-400">Assign photo to a student by admission number</p></div>
        </div>
        <div>
          <label className="form-label">Admission Number *</label>
          <input value={admNo} onChange={e=>setAdmNo(e.target.value)} className="form-input" placeholder="e.g. 2025001"/>
        </div>
        <input ref={singleRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&uploadSingle(e.target.files[0])}/>
        <button onClick={()=>singleRef.current?.click()} disabled={!admNo||uploading} className="btn-primary w-full justify-center">
          {uploading?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Uploading…</>:<><Upload className="w-4 h-4"/>Choose Photo & Upload</>}
        </button>
      </div>

      {/* Bulk photo upload */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center"><Upload className="w-5 h-5 text-purple-600"/></div>
          <div><p className="font-bold text-slate-800">Bulk Photo Upload</p><p className="text-xs text-slate-400">ZIP file with photos named by admission number</p></div>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <p className="font-semibold mb-1">How to prepare the ZIP:</p>
          <p>Name each photo file as the student's admission number (e.g. <code className="bg-amber-100 px-1 rounded">2025001.jpg</code>). Compress all photos into a single ZIP file.</p>
        </div>
        <input ref={bulkRef} type="file" accept=".zip" className="hidden" onChange={e=>e.target.files?.[0]&&uploadBulk(e.target.files[0])}/>
        <button onClick={()=>bulkRef.current?.click()} disabled={bulkUploading} className="btn-primary w-full justify-center bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
          {bulkUploading?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Uploading…</>:<><Upload className="w-4 h-4"/>Choose ZIP & Upload</>}
        </button>
        {bulkResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <p className="font-semibold text-green-700 mb-1">Upload Complete</p>
            <div className="flex gap-4 text-xs">
              <span className="text-green-600">✓ {bulkResult.success||0} uploaded</span>
              {(bulkResult.failed||0)>0 && <span className="text-red-500">✗ {bulkResult.failed} failed</span>}
            </div>
            {bulkResult.errors?.length>0 && <p className="text-xs text-red-500 mt-1">{bulkResult.errors.join(', ')}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function BulkUploadRedirect() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
        <Upload className="w-8 h-8 text-primary-500"/>
      </div>
      <div>
        <p className="font-bold text-slate-800 text-lg">Bulk Student Upload</p>
        <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
          Configure columns, download an Excel template, fill it in, then import all students at once.
        </p>
      </div>
      <a href="/dashboard/students/bulk" className="btn-primary py-3 px-8 text-base">
        <Upload className="w-5 h-5"/>Open Bulk Upload
      </a>
    </div>
  );
}

// ─── Student Directory ────────────────────────────────────────────────────────

const DIR_COLS = [
  { key: 'admissionNumber', label: 'Adm. No.',          group: 'Academic' },
  { key: 'rollNumber',      label: 'Roll No.',           group: 'Academic' },
  { key: 'name',            label: 'Name',               group: 'Personal' },
  { key: 'class',           label: 'Class',              group: 'Academic' },
  { key: 'section',         label: 'Section',            group: 'Academic' },
  { key: 'gender',          label: 'Gender',             group: 'Personal' },
  { key: 'dateOfBirth',     label: 'Date of Birth',      group: 'Personal' },
  { key: 'bloodGroup',      label: 'Blood Group',        group: 'Personal' },
  { key: 'category',        label: 'Category',           group: 'Personal' },
  { key: 'religion',        label: 'Religion',           group: 'Personal' },
  { key: 'nationality',     label: 'Nationality',        group: 'Personal' },
  { key: 'house',           label: 'House',              group: 'Academic' },
  { key: 'phone',           label: 'Student Phone',      group: 'Contact'  },
  { key: 'aadhaarNumber',   label: 'Aadhaar No.',        group: 'Personal' },
  { key: 'address',         label: 'Address',            group: 'Contact'  },
  { key: 'fatherName',      label: "Father's Name",      group: 'Family'   },
  { key: 'motherName',      label: "Mother's Name",      group: 'Family'   },
  { key: 'parentName',      label: 'Parent / Guardian',  group: 'Family'   },
  { key: 'parentPhone',     label: 'Parent Phone',       group: 'Family'   },
  { key: 'parentEmail',     label: 'Parent Email',       group: 'Family'   },
  { key: 'parentOccupation',label: 'Parent Occupation',  group: 'Family'   },
  { key: 'guardianName',    label: 'Guardian Name',      group: 'Family'   },
  { key: 'guardianPhone',   label: 'Guardian Phone',     group: 'Family'   },
  { key: 'admissionDate',   label: 'Admission Date',     group: 'Academic' },
  { key: 'status',          label: 'Status',             group: 'Academic' },
] as const;

type ColKey = typeof DIR_COLS[number]['key'];

const DEFAULT_DIR_COLS: ColKey[] = ['admissionNumber', 'rollNumber', 'name', 'class', 'section', 'gender', 'fatherName', 'parentPhone'];

const getStudentVal = (s: any, key: ColKey): string => {
  switch (key) {
    case 'class':            return s.classSection?.class?.name || s.class?.name || '—';
    case 'section':          return s.classSection?.section || s.section?.section || '—';
    case 'dateOfBirth':      return s.dateOfBirth ? fmt.date(s.dateOfBirth) : '—';
    case 'admissionDate':    return s.admissionDate ? fmt.date(s.admissionDate) : s.createdAt ? fmt.date(s.createdAt) : '—';
    case 'status':           return s.isActive !== false ? 'Active' : 'Inactive';
    case 'fatherName':       return s.fatherName || s.parent?.fatherName || '—';
    case 'motherName':       return s.motherName || s.parent?.motherName || '—';
    case 'parentName':       return s.parentName || '—';
    case 'parentPhone':      return s.parentPhone || s.parent?.primaryPhone || '—';
    case 'parentEmail':      return s.parentEmail || s.parent?.email || '—';
    case 'parentOccupation': return s.parentOccupation || '—';
    case 'guardianName':     return s.guardianName || '—';
    case 'guardianPhone':    return s.guardianPhone || '—';
    default:                 return (s as any)[key] || '—';
  }
};

function StudentDirectory({ classes }: { classes: any[] }) {
  const [classId,    setClassId]    = useState('');
  const [sectionId,  setSectionId]  = useState('');
  const [students,   setStudents]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [loaded,     setLoaded]     = useState(false);
  const [selCols,    setSelCols]    = useState<ColKey[]>(DEFAULT_DIR_COLS);
  const [showPicker, setShowPicker] = useState(false);

  // Sections derived from selected class (no extra API call needed)
  const sections: any[] = classId ? (classes.find((c: any) => c.id === classId)?.sections || []) : [];

  // When class changes, clear section
  const handleClassChange = (id: string) => { setClassId(id); setSectionId(''); setLoaded(false); setStudents([]); };
  const handleSectionChange = (id: string) => { setSectionId(id); setLoaded(false); setStudents([]); };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 2000 };
      if (sectionId)  params.classSectionId = sectionId;
      else if (classId) params.classId = classId;
      const r = await studentsApi.getAll(params);
      const data = r.data.data || [];
      setStudents(Array.isArray(data) ? data : data.students || []);
      setLoaded(true);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  // Derive label for filenames / PDF title
  const filterLabel = (() => {
    if (sectionId) {
      const sec = sections.find((s: any) => s.id === sectionId);
      const cls = classes.find((c: any) => c.id === classId);
      return `${cls?.name || ''} - Section ${sec?.section || ''}`;
    }
    if (classId) return classes.find((c: any) => c.id === classId)?.name || 'Class';
    return 'All Students';
  })();

  const activeCols = DIR_COLS.filter(c => selCols.includes(c.key));

  // ─── Excel export ─────────────────────────────
  const exportExcel = () => {
    const rows = students.map((s, i) => {
      const row: any = { '#': i + 1 };
      activeCols.forEach(c => { row[c.label] = getStudentVal(s, c.key); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-fit column widths
    const colWidths = [{ wch: 4 }, ...activeCols.map(c => ({ wch: Math.max(c.label.length + 2, 12) }))];
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `students-${filterLabel.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel downloaded!');
  };

  // ─── PDF export (print window) ────────────────
  const exportPDF = () => {
    const headerRow = `<tr><th>#</th>${activeCols.map(c => `<th>${c.label}</th>`).join('')}</tr>`;
    const bodyRows  = students.map((s, i) =>
      `<tr><td>${i + 1}</td>${activeCols.map(c => `<td>${getStudentVal(s, c.key)}</td>`).join('')}</tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Student Directory — ${filterLabel}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #1a1a2e; padding: 16px; }
    .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
    .header h1 { font-size: 14px; font-weight: 700; color: #1e3a5f; letter-spacing: 0.5px; }
    .header p  { font-size: 9px; color: #64748b; margin-top: 3px; }
    .meta { display: flex; justify-content: space-between; font-size: 8px; color: #64748b; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1e3a5f; }
    th { color: #fff; padding: 5px 4px; text-align: left; font-size: 8px; font-weight: 600; white-space: nowrap; }
    td { padding: 4px; border-bottom: 1px solid #e2e8f0; font-size: 8.5px; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    @media print {
      body { padding: 8px; }
      @page { margin: 12mm 10mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Sacred Heart School Koderma — Student Directory</h1>
    <p>${filterLabel}</p>
  </div>
  <div class="meta">
    <span>Total Students: <strong>${students.length}</strong></span>
    <span>Generated: ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
  </div>
  <table>
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { toast.error('Popup blocked — please allow popups and try again'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  // ─── Column groups for picker ─────────────────
  const groups = Array.from(new Set(DIR_COLS.map(c => c.group)));
  const toggleCol = (key: ColKey) =>
    setSelCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const selectAll  = () => setSelCols(DIR_COLS.map(c => c.key));
  const selectNone = () => setSelCols([]);

  return (
    <div className="space-y-4">
      {/* ── Filters row ────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Class */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Class</label>
            <select value={classId} onChange={e => handleClassChange(e.target.value)} className="form-select w-44">
              <option value="">All Classes</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Section — only if class selected */}
          {classId && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Section</label>
              <select value={sectionId} onChange={e => handleSectionChange(e.target.value)} className="form-select w-36">
                <option value="">All Sections</option>
                {sections.map((s: any) => <option key={s.id} value={s.id}>Section {s.section}</option>)}
              </select>
            </div>
          )}

          {/* Load button */}
          <button onClick={fetchStudents} disabled={loading} className="btn-primary h-10">
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Loading…</>
              : <><Users className="w-4 h-4"/>Load Students</>
            }
          </button>

          {/* Clear */}
          {(classId || sectionId) && (
            <button onClick={() => { setClassId(''); setSectionId(''); setStudents([]); setLoaded(false); }} className="btn-ghost text-xs h-10">
              <X className="w-3 h-3"/>Clear
            </button>
          )}

          {/* Right side: column picker + downloads (only after load) */}
          {loaded && students.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setShowPicker(true)} className="btn-secondary h-10 text-sm">
                <SlidersHorizontal className="w-4 h-4"/>Columns <span className="ml-1 bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full font-bold">{selCols.length}</span>
              </button>
              <button onClick={exportExcel} className="btn-secondary h-10 text-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600"/>Excel
              </button>
              <button onClick={exportPDF} className="btn-secondary h-10 text-sm text-rose-700 border-rose-200 hover:bg-rose-50">
                <FileText className="w-4 h-4 text-rose-600"/>PDF
              </button>
            </div>
          )}
        </div>

        {/* Filter summary badge */}
        {loaded && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Showing:</span>
            <span className="badge badge-blue text-xs">{filterLabel}</span>
            <span className="text-xs font-semibold text-slate-700">{students.length} students</span>
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────── */}
      {!loaded && !loading && (
        <div className="card p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-slate-400"/>
          </div>
          <p className="font-semibold text-slate-600">Select filters and click Load Students</p>
          <p className="text-sm text-slate-400 mt-1">Choose All Classes, a specific class, or a class + section</p>
        </div>
      )}

      {loaded && students.length === 0 && (
        <div className="card p-14 text-center">
          <p className="font-semibold text-slate-600">No students found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different class or section</p>
        </div>
      )}

      {loaded && students.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  {activeCols.map(c => <th key={c.key}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {students.map((s: any, i: number) => (
                  <tr key={s.id}>
                    <td className="text-xs text-slate-400 font-mono">{i + 1}</td>
                    {activeCols.map(c => (
                      <td key={c.key} className="text-sm">
                        {c.key === 'admissionNumber'
                          ? <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{getStudentVal(s, c.key)}</span>
                          : c.key === 'status'
                          ? <span className={`badge ${getStudentVal(s, c.key) === 'Active' ? 'badge-green' : 'badge-red'}`}>{getStudentVal(s, c.key)}</span>
                          : c.key === 'gender'
                          ? <span className="badge badge-gray">{getStudentVal(s, c.key)}</span>
                          : getStudentVal(s, c.key)
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl flex items-center justify-between">
            <p className="text-xs text-slate-500">{students.length} students · {activeCols.length} columns shown</p>
            <div className="flex gap-2">
              <button onClick={exportExcel} className="btn-ghost text-xs text-emerald-700">
                <FileSpreadsheet className="w-3.5 h-3.5"/>Excel
              </button>
              <button onClick={exportPDF} className="btn-ghost text-xs text-rose-700">
                <FileText className="w-3.5 h-3.5"/>PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Column Picker Modal ───────────────────── */}
      {showPicker && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPicker(false); }}>
          <div className="modal-box max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-800">Customise Columns</h2>
                <p className="text-xs text-slate-400 mt-0.5">{selCols.length} of {DIR_COLS.length} selected</p>
              </div>
              <button onClick={() => setShowPicker(false)} className="btn-icon"><X className="w-4 h-4"/></button>
            </div>

            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
              <button onClick={selectAll}  className="btn-ghost text-xs py-1 px-2">Select All</button>
              <button onClick={selectNone} className="btn-ghost text-xs py-1 px-2">Clear All</button>
              <button onClick={() => setSelCols([...DEFAULT_DIR_COLS])} className="btn-ghost text-xs py-1 px-2">Reset Default</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {groups.map(group => (
                <div key={group}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{group}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DIR_COLS.filter(c => c.group === group).map(c => {
                      const on = selCols.includes(c.key);
                      return (
                        <button
                          key={c.key}
                          onClick={() => toggleCol(c.key)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                            on
                              ? 'bg-primary-50 border-primary-200 text-primary-800 font-medium'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {on
                            ? <CheckSquare className="w-4 h-4 text-primary-600 flex-shrink-0"/>
                            : <Square className="w-4 h-4 text-slate-300 flex-shrink-0"/>
                          }
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowPicker(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button
                onClick={() => setShowPicker(false)}
                disabled={selCols.length === 0}
                className="btn-primary flex-1 justify-center"
              >
                Apply {selCols.length} Columns
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Section = ({title,children}:any) => <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-100">{title}</p><div className="space-y-3">{children}</div></div>;
const Row2 = ({children}:any) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
const Row3 = ({children}:any) => <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{children}</div>;
const F = ({label,children}:any) => <div><label className="form-label">{label}</label>{children}</div>;
