'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, BookMarked, Search, RefreshCw, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { libraryApi, studentsApi } from '@/lib/api';
import { fmt } from '@/lib/utils';
import { Modal, Tabs, Empty, TableSkeleton, Pagination, SearchInput, StatCard, Confirm } from '@/components/ui';
import toast from 'react-hot-toast';

export default function LibraryPage() {
  const [tab, setTab] = useState('books');
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header"><div><h1 className="page-title">Library</h1><p className="page-sub">Manage books, issue and returns</p></div></div>
      <Tabs tabs={[{key:'books',label:'Books'},{key:'issued',label:'Issued Books'},{key:'overdue',label:'Overdue'}]} active={tab} onChange={setTab}/>
      {tab==='books'   && <BooksTab/>}
      {tab==='issued'  && <IssuedTab/>}
      {tab==='overdue' && <OverdueTab/>}
    </div>
  );
}

function BooksTab() {
  const [books, setBooks]     = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showIssue, setShowIssue] = useState<any>(null);
  const LIMIT = 15;

  const load = useCallback(async()=>{
    setLoading(true);
    try { const r = await libraryApi.getBooks({page,limit:LIMIT,search:search||undefined}); setBooks(r.data.data?.books||r.data.data||[]); setTotal(r.data.data?.total||0); }
    catch{ toast.error('Failed'); } finally{ setLoading(false); }
  },[page,search]);
  useEffect(()=>load(),[load]);

  const deleteBook = async () => {
    if(!deleteId) return; setDeleting(true);
    try { await libraryApi.deleteBook(deleteId); toast.success('Book deleted'); setDeleteId(null); load(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Cannot delete book with active issues'); }
    finally{ setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <SearchInput value={search} onChange={v=>{setSearch(v);setPage(1);}} placeholder="Search books, author, ISBN…"/>
        <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Book</button>
      </div>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Title</th><th>Author</th><th>ISBN</th><th>Category</th><th>Total</th><th>Available</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <TableSkeleton rows={8} cols={7}/> : books.length===0 ? (
              <tr><td colSpan={7}><Empty icon={BookMarked} title="No books yet" action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add First Book</button>}/></td></tr>
            ) : books.map((b:any)=>(
              <tr key={b.id}>
                <td><p className="font-medium text-sm">{b.title}</p></td>
                <td className="text-sm text-slate-600">{b.author||'—'}</td>
                <td><span className="font-mono text-xs text-slate-500">{b.isbn||'—'}</span></td>
                <td>{b.category?<span className="badge badge-blue">{b.category}</span>:'—'}</td>
                <td className="text-center">{b.totalCopies||1}</td>
                <td className="text-center"><span className={`badge ${(b.availableCopies||0)>0?'badge-green':'badge-red'}`}>{b.availableCopies||0}</span></td>
                <td><div className="flex gap-1">
                  <button onClick={()=>setShowIssue(b)} disabled={(b.availableCopies||0)===0} className="btn-secondary text-xs py-1.5 disabled:opacity-40">Issue</button>
                  <button onClick={()=>setEditItem(b)} className="btn-icon" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                  <button onClick={()=>setDeleteId(b.id)} className="btn-icon hover:text-danger-500" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} limit={LIMIT} onChange={setPage}/>
      </div>
      {showAdd   && <AddBookModal onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}}/>}
      {editItem  && <EditBookModal book={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null);load();}}/>}
      {deleteId  && <Confirm title="Delete Book" message="This will permanently remove the book from the library. Books with active issues cannot be deleted." onConfirm={deleteBook} onCancel={()=>setDeleteId(null)} loading={deleting}/>}
      {showIssue && <IssueBookModal book={showIssue} onClose={()=>setShowIssue(null)} onSuccess={()=>{setShowIssue(null);load();}}/>}
    </div>
  );
}

function IssuedTab() {
  const [issued, setIssued] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string|null>(null);

  const load = () => { setLoading(true); libraryApi.getIssued().then(r=>setIssued(r.data.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>load(),[]);

  const returnBook = async (id:string) => {
    setReturning(id);
    try { await libraryApi.returnBook({issueId:id}); toast.success('Book returned!'); load(); }
    catch{ toast.error('Failed'); } finally{ setReturning(null); }
  };

  return (
    <div className="card overflow-hidden">
      <table className="tbl">
        <thead><tr><th>Book</th><th>Student</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {loading ? <TableSkeleton rows={6} cols={6}/> : issued.length===0 ? (
            <tr><td colSpan={6}><Empty icon={BookMarked} title="No books currently issued"/></td></tr>
          ) : issued.map((i:any)=>{
            const overdue = i.dueDate && new Date(i.dueDate)<new Date() && !i.returnDate;
            return (
              <tr key={i.id}>
                <td><p className="font-medium text-sm">{i.book?.title||'—'}</p><p className="text-xs text-slate-400">{i.book?.isbn}</p></td>
                <td><p className="text-sm">{i.student?.name||'—'}</p><p className="text-xs text-slate-400">{i.student?.admissionNumber}</p></td>
                <td className="text-sm">{i.issueDate?fmt.date(i.issueDate):'—'}</td>
                <td className={`text-sm ${overdue?'text-red-500 font-semibold':''}`}>{i.dueDate?fmt.date(i.dueDate):'—'}</td>
                <td>{i.returnDate?<span className="badge badge-green">Returned</span>:overdue?<span className="badge badge-red">Overdue</span>:<span className="badge badge-blue">Issued</span>}</td>
                <td>{!i.returnDate && <button onClick={()=>returnBook(i.id)} disabled={returning===i.id} className="btn-secondary text-xs py-1.5"><RefreshCw className="w-3 h-3"/>{returning===i.id?'…':'Return'}</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OverdueTab() {
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ libraryApi.getOverdue().then(r=>setOverdue(r.data.data||[])).catch(()=>{}).finally(()=>setLoading(false)); },[]);
  return (
    <div className="card overflow-hidden">
      <table className="tbl">
        <thead><tr><th>Book</th><th>Student</th><th>Issue Date</th><th>Due Date</th><th>Days Overdue</th></tr></thead>
        <tbody>
          {loading ? <TableSkeleton rows={5} cols={5}/> : overdue.length===0 ? (
            <tr><td colSpan={5}><Empty icon={AlertTriangle} title="No overdue books" sub="All books returned on time!"/></td></tr>
          ) : overdue.map((o:any,i:number)=>{
            const days = o.dueDate?Math.floor((new Date().getTime()-new Date(o.dueDate).getTime())/(1000*60*60*24)):0;
            return (
              <tr key={i}>
                <td className="font-medium text-sm">{o.book?.title||'—'}</td>
                <td><p className="text-sm">{o.student?.name||'—'}</p><p className="text-xs text-slate-400">{o.student?.admissionNumber}</p></td>
                <td className="text-sm">{o.issueDate?fmt.date(o.issueDate):'—'}</td>
                <td className="text-red-500 font-semibold text-sm">{o.dueDate?fmt.date(o.dueDate):'—'}</td>
                <td><span className="badge badge-red">{days} days</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditBookModal({ book, onClose, onSuccess }:any) {
  const [form, setForm] = useState({title:book.title||'',author:book.author||'',isbn:book.isbn||'',publisher:book.publisher||'',publishedYear:book.publishedYear||'',category:book.category||'',totalCopies:book.totalCopies||'1',description:book.description||''});
  const [saving, setSaving] = useState(false);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await libraryApi.updateBook(book.id,{...form,totalCopies:Number(form.totalCopies),publishedYear:form.publishedYear?Number(form.publishedYear):undefined}); toast.success('Book updated!'); onSuccess(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };
  return (
    <Modal title="Edit Book" onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Title *</label><input required value={form.title} onChange={e=>f('title',e.target.value)} className="form-input"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Author</label><input value={form.author} onChange={e=>f('author',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">ISBN</label><input value={form.isbn} onChange={e=>f('isbn',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Publisher</label><input value={form.publisher} onChange={e=>f('publisher',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Year</label><input type="number" value={form.publishedYear} onChange={e=>f('publishedYear',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Category</label><input value={form.category} onChange={e=>f('category',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Total Copies</label><input type="number" min={1} value={form.totalCopies} onChange={e=>f('totalCopies',e.target.value)} className="form-input"/></div>
        </div>
        <div><label className="form-label">Description</label><textarea value={form.description} onChange={e=>f('description',e.target.value)} className="form-input" rows={2}/></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':'Update Book'}</button></div>
      </form>
    </Modal>
  );
}

function AddBookModal({ onClose, onSuccess }:any) {
  const [form, setForm] = useState({title:'',author:'',isbn:'',publisher:'',publishedYear:'',category:'',totalCopies:'1',description:''});
  const [saving, setSaving] = useState(false);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await libraryApi.addBook({...form,totalCopies:Number(form.totalCopies),publishedYear:form.publishedYear?Number(form.publishedYear):undefined}); toast.success('Book added!'); onSuccess(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };
  return (
    <Modal title="Add Book" onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Title *</label><input required value={form.title} onChange={e=>f('title',e.target.value)} className="form-input" placeholder="Book title"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Author</label><input value={form.author} onChange={e=>f('author',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">ISBN</label><input value={form.isbn} onChange={e=>f('isbn',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Publisher</label><input value={form.publisher} onChange={e=>f('publisher',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Year</label><input type="number" value={form.publishedYear} onChange={e=>f('publishedYear',e.target.value)} className="form-input" placeholder="2024"/></div>
          <div><label className="form-label">Category</label><input value={form.category} onChange={e=>f('category',e.target.value)} className="form-input" placeholder="e.g. Science"/></div>
          <div><label className="form-label">Copies</label><input type="number" min={1} value={form.totalCopies} onChange={e=>f('totalCopies',e.target.value)} className="form-input"/></div>
        </div>
        <div><label className="form-label">Description</label><textarea value={form.description} onChange={e=>f('description',e.target.value)} className="form-input" rows={2}/></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':'Add Book'}</button></div>
      </form>
    </Modal>
  );
}

function IssueBookModal({ book, onClose, onSuccess }:any) {
  const [form, setForm] = useState({admissionNumber:'',dueDate:'',remarks:''});
  const [student, setStudent] = useState<any>(null);
  const [finding, setFinding] = useState(false);
  const [saving, setSaving]   = useState(false);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));

  const findStudent = async () => {
    if(!form.admissionNumber) return;
    setFinding(true);
    try { const r = await studentsApi.lookup(form.admissionNumber); setStudent(r.data.data); }
    catch{ toast.error('Not found'); setStudent(null); } finally{ setFinding(false); }
  };

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); if(!student) return toast.error('Find student first'); setSaving(true);
    try { await libraryApi.issueBook({bookId:book.id,studentId:student.id,dueDate:form.dueDate||undefined,remarks:form.remarks||undefined}); toast.success('Book issued!'); onSuccess(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };

  return (
    <Modal title={`Issue: ${book.title}`} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Student Admission No.</label>
          <div className="flex gap-2"><input value={form.admissionNumber} onChange={e=>f('admissionNumber',e.target.value)} className="form-input flex-1" placeholder="Admission number"/><button type="button" onClick={findStudent} className="btn-secondary">{finding?'…':'Find'}</button></div>
          {student && <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{student.name} · {student.class?.name}</div>}
        </div>
        <div><label className="form-label">Due Date</label><input type="date" value={form.dueDate} onChange={e=>f('dueDate',e.target.value)} className="form-input"/></div>
        <div><label className="form-label">Remarks</label><input value={form.remarks} onChange={e=>f('remarks',e.target.value)} className="form-input" placeholder="Optional"/></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving||!student} className="btn-primary flex-1 justify-center">{saving?'Issuing…':'Issue Book'}</button></div>
      </form>
    </Modal>
  );
}
