'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Eye, Edit, Trash2, GraduationCap, Upload, Download, Filter, X, Camera } from 'lucide-react';
import { studentsApi, idcardsApi } from '@/lib/api';
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
      const r = await studentsApi.getAll({ page, limit:LIMIT, search:search||undefined, classId:classFilter||undefined });
      setStudents(r.data.data?.students || []);
      setTotal(r.data.data?.total || 0);
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

      <Tabs tabs={[{key:'students',label:'All Students'},{key:'classes',label:'Classes & Sections'},{key:'photos',label:'Student Photos'}]} active={tab} onChange={setTab} />

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
                    <td className="text-sm">{s.class?.name||'—'}{s.section?.section?`-${s.section.section}`:''}</td>
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

      {tab==='classes' && <ClassesManager classes={classes} reload={()=>studentsApi.getClasses().then(r=>setClasses(r.data.data||[]))}/>}
      {tab==='photos'  && <PhotosManager classes={classes}/>}

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
  return (
    <Modal title="Student Profile" onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
          <Avatar name={student.name} size="lg"/>
          <div>
            <h3 className="font-bold text-lg text-slate-800">{student.name}</h3>
            <p className="text-primary-600 font-mono text-sm">{student.admissionNumber}</p>
            <p className="text-slate-500 text-sm">{student.class?.name||'—'}{student.section?.section?`-${student.section.section}`:''}</p>
            <span className={`badge mt-1 ${student.isActive!==false?'badge-green':'badge-red'}`}>{student.isActive!==false?'Active':'Inactive'}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[['Gender',student.gender],['DOB',student.dob?fmt.date(student.dob):'—'],['Blood Group',student.bloodGroup||'—'],['Category',student.category||'—'],['Religion',student.religion||'—'],['Roll No.',student.rollNumber||'—'],['Phone',student.phone||'—'],['Aadhar',student.aadharNumber||'—'],['Father',student.parent?.fatherName||'—'],['Mother',student.parent?.motherName||'—'],['Parent Phone',student.parent?.primaryPhone||'—'],['Address',student.address||'—']].map(([k,v])=>(
            <div key={k} className="flex flex-col"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{k}</span><span className="text-slate-700">{v}</span></div>
          ))}
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
  const [showAdd, setShowAdd]   = useState(false);
  const [newClass, setNewClass] = useState({name:'',numericValue:''});
  const [sections, setSections] = useState<Record<string,any[]>>({});
  const [newSec, setNewSec]     = useState<Record<string,string>>({});
  const [expanded, setExpanded] = useState<string|null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleteClassId, setDeleteClassId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSections = async (cid:string) => {
    const r = await studentsApi.getSections(cid);
    setSections(p=>({...p,[cid]:r.data.data||[]}));
  };

  const toggleExpand = (id:string) => { if(expanded===id){setExpanded(null);}else{setExpanded(id);loadSections(id);} };

  const addClass = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await studentsApi.createClass({name:newClass.name,numericValue:newClass.numericValue?Number(newClass.numericValue):undefined}); toast.success('Class created'); setNewClass({name:'',numericValue:''}); setShowAdd(false); reload(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };

  const addSection = async (classId:string) => {
    const sec = newSec[classId]; if(!sec) return;
    try { await studentsApi.createSection(classId,{section:sec}); toast.success('Section added'); setNewSec(p=>({...p,[classId]:''})); loadSections(classId); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
  };

  const deleteClass = async () => {
    if(!deleteClassId) return; setDeleting(true);
    try { await studentsApi.deleteClass(deleteClassId); toast.success('Class deleted'); setDeleteClassId(null); reload(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Cannot delete class with students'); }
    finally{ setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={()=>setShowAdd(!showAdd)} className="btn-primary"><Plus className="w-4 h-4"/>Add Class</button>
      </div>
      {showAdd && (
        <form onSubmit={addClass} className="card p-4 flex gap-3 items-end">
          <F label="Class Name *"><input required value={newClass.name} onChange={e=>setNewClass(p=>({...p,name:e.target.value}))} className="form-input" placeholder="e.g. Class I"/></F>
          <F label="Numeric Value"><input type="number" value={newClass.numericValue} onChange={e=>setNewClass(p=>({...p,numericValue:e.target.value}))} className="form-input w-32" placeholder="1"/></F>
          <button type="submit" disabled={saving} className="btn-primary">Create</button>
          <button type="button" onClick={()=>setShowAdd(false)} className="btn-secondary">Cancel</button>
        </form>
      )}
      <div className="space-y-2">
        {classes.map((c:any)=>(
          <div key={c.id} className="card overflow-hidden">
            <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50" onClick={()=>toggleExpand(c.id)}>
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">{c.numericValue||c.name.charAt(0)}</div>
              <p className="font-semibold text-slate-700 flex-1">{c.name}</p>
              <button onClick={e=>{e.stopPropagation();setDeleteClassId(c.id);}} className="btn-icon hover:text-danger-500 mr-2" title="Delete class"><Trash2 className="w-3.5 h-3.5"/></button>
              <span className="text-xs text-slate-400">{expanded===c.id?'▲':'▼'}</span>
            </div>
            {expanded===c.id && (
              <div className="px-4 pb-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-2 mt-3">
                  {(sections[c.id]||[]).map((s:any)=>(
                    <span key={s.id} className="badge badge-blue">Section {s.section}</span>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <input value={newSec[c.id]||''} onChange={e=>setNewSec(p=>({...p,[c.id]:e.target.value}))} className="form-input w-32" placeholder="Section A"/>
                  <button onClick={()=>addSection(c.id)} className="btn-primary text-xs py-1.5">Add Section</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {deleteClassId && <Confirm title="Delete Class" message="This will permanently delete the class. Classes with enrolled students cannot be deleted." onConfirm={deleteClass} onCancel={()=>setDeleteClassId(null)} loading={deleting}/>}
    </div>
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

const Section = ({title,children}:any) => <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-100">{title}</p><div className="space-y-3">{children}</div></div>;
const Row2 = ({children}:any) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
const Row3 = ({children}:any) => <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{children}</div>;
const F = ({label,children}:any) => <div><label className="form-label">{label}</label>{children}</div>;


function BulkUploadRedirect() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
        <Upload className="w-8 h-8 text-primary-500"/>
      </div>
      <div>
        <p className="font-bold text-slate-800 text-lg">Bulk Student Upload</p>
        <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Configure columns, download a template, fill it in Excel, then import all students at once.</p>
      </div>
      <a href="/dashboard/students/bulk" className="btn-primary py-3 px-8 text-base">
        <Upload className="w-5 h-5"/>Open Bulk Upload
      </a>
    </div>
  );
}

