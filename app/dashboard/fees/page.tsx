'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Search, Download, DollarSign, AlertTriangle, CheckCircle, Trash2, Edit } from 'lucide-react';
import { feesApi, studentsApi } from '@/lib/api';
import { fmt, downloadBlob, PAY_MODES, FEE_FREQ } from '@/lib/utils';
import { Modal, Tabs, StatCard, Pagination, SearchInput, Empty, TableSkeleton, Confirm } from '@/components/ui';
import toast from 'react-hot-toast';

export default function FeesPage() {
  const [tab, setTab] = useState('payments');
  const [structures, setStructures] = useState<any[]>([]);

  const loadStructures = () => feesApi.getStructures().then(r=>setStructures(r.data.data||[])).catch(()=>{});
  useEffect(()=>{ loadStructures(); },[]);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div><h1 className="page-title">Fees Management</h1><p className="page-sub">Collect fees & manage structures</p></div>
      </div>
      <FeeSummary/>
      <Tabs tabs={[{key:'payments',label:'Payments'},{key:'structures',label:'Fee Structures'},{key:'defaulters',label:'Defaulters'},{key:'student',label:'Student Fees'}]} active={tab} onChange={setTab}/>
      {tab==='payments'   && <PaymentsTab structures={structures}/>}
      {tab==='structures' && <StructuresTab structures={structures} reload={loadStructures}/>}
      {tab==='defaulters' && <DefaultersTab/>}
      {tab==='student'    && <StudentFeesTab/>}
    </div>
  );
}

function FeeSummary() {
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ feesApi.getSummary().then(r=>setData(r.data.data)).catch(()=>{}); },[]);
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard icon={DollarSign} iconBg="bg-green-50" color="text-green-600" label="Total Collected" value={data?fmt.currency(data.totalCollected||0):'—'}/>
      <StatCard icon={AlertTriangle} iconBg="bg-red-50" color="text-red-600" label="Total Pending" value={data?fmt.currency(data.totalPending||0):'—'}/>
      <StatCard icon={CheckCircle} iconBg="bg-blue-50" color="text-blue-600" label="This Month" value={data?fmt.currency(data.thisMonth||0):'—'}/>
      <StatCard icon={DollarSign} iconBg="bg-purple-50" color="text-purple-600" label="Transactions" value={data?data.totalTransactions||0:'—'}/>
    </div>
  );
}

function PaymentsTab({ structures }:any) {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showCollect, setShowCollect] = useState(false);
  const LIMIT = 15;

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const r = await feesApi.getPayments({page,limit:LIMIT,search:search||undefined});
      const d = r.data.data;
      setPayments(Array.isArray(d)?d:d?.payments||[]);
      setTotal(d?.total||0);
    } catch{ toast.error('Failed'); }
    finally{ setLoading(false); }
  },[page,search]);
  useEffect(()=>{ load(); },[load]);

  const downloadReceipt = async (id:string, admNo:string) => {
    try { const r = await feesApi.getReceipt(id); downloadBlob(r.data,`receipt-${admNo}.pdf`); }
    catch{ toast.error('Failed to get receipt'); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <SearchInput value={search} onChange={v=>{setSearch(v);setPage(1);}} placeholder="Search by student name…"/>
        <button onClick={()=>setShowCollect(true)} className="btn-primary"><Plus className="w-4 h-4"/>Collect Fee</button>
      </div>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Student</th><th>Fee Type</th><th>Amount</th><th>Date</th><th>Mode</th><th>Receipt No.</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <TableSkeleton rows={8} cols={7}/> : payments.length===0 ? (
              <tr><td colSpan={7}><Empty icon={DollarSign} title="No payments yet" sub="Collect the first fee payment"/></td></tr>
            ) : payments.map((p:any)=>(
              <tr key={p.id}>
                <td><div><p className="font-medium text-sm">{p.student?.name||'—'}</p><p className="text-xs text-slate-400">{p.student?.admissionNumber}</p></div></td>
                <td className="text-sm">{p.feeStructure?.name||'—'}</td>
                <td><span className="font-semibold text-green-600">{fmt.currency(p.amount)}</span></td>
                <td className="text-sm">{p.paymentDate?fmt.date(p.paymentDate):'—'}</td>
                <td><span className="badge badge-blue">{p.paymentMode}</span></td>
                <td><span className="font-mono text-xs text-slate-500">{p.receiptNumber||'—'}</span></td>
                <td><button onClick={()=>downloadReceipt(p.id,p.student?.admissionNumber||'fee')} className="btn-icon" title="Download Receipt"><Download className="w-3.5 h-3.5"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} limit={LIMIT} onChange={setPage}/>
      </div>
      {showCollect && <CollectFeeModal structures={structures} onClose={()=>setShowCollect(false)} onSuccess={()=>{setShowCollect(false);load();}}/>}
    </div>
  );
}

function StructuresTab({ structures, reload }:any) {
  const [showAdd, setShowAdd]   = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteStructure = async () => {
    if(!deleteId) return; setDeleting(true);
    try { await feesApi.deleteStructure(deleteId); toast.success('Deleted'); setDeleteId(null); reload(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Cannot delete structure with payments'); }
    finally{ setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>New Structure</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {structures.map((s:any)=>(
          <div key={s.id} className="card p-4 hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <p className="font-semibold text-slate-700">{s.name}</p>
              <div className="flex gap-1">
                <button onClick={()=>setEditItem(s)} className="btn-icon" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                <button onClick={()=>setDeleteId(s.id)} className="btn-icon hover:text-danger-500" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 mb-2">{fmt.currency(s.amount)}</p>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-blue">{s.frequency?.replace('_',' ')}</span>
              {s.class && <span className="badge badge-gray">Class {s.class.name}</span>}
            </div>
            {s.description && <p className="text-xs text-slate-400 mt-2">{s.description}</p>}
          </div>
        ))}
        {structures.length===0 && <div className="col-span-3"><Empty icon={DollarSign} title="No fee structures" sub="Create fee structures to collect fees"/></div>}
      </div>
      {showAdd   && <FeeStructureModal onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);reload();}}/>}
      {editItem  && <FeeStructureModal structure={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null);reload();}}/>}
      {deleteId  && <Confirm title="Delete Fee Structure" message="This will permanently delete the fee structure. Structures with existing payments cannot be deleted." onConfirm={deleteStructure} onCancel={()=>setDeleteId(null)} loading={deleting}/>}
    </div>
  );
}

function StudentFeesTab() {
  const [admNo, setAdmNo]     = useState('');
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if(!admNo) return toast.error('Enter admission number');
    setLoading(true);
    try { const r = await feesApi.getStudentFees(admNo); setData(r.data.data); }
    catch { toast.error('Student not found'); setData(null); }
    finally { setLoading(false); }
  };

  const downloadReceipt = async (id:string) => {
    try { const r = await feesApi.getReceipt(id); downloadBlob(r.data,`receipt-${id}.pdf`); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-3 items-end">
        <div className="flex-1"><label className="form-label">Admission Number</label><input value={admNo} onChange={e=>setAdmNo(e.target.value)} className="form-input" placeholder="e.g. 2025001"/></div>
        <button onClick={load} className="btn-primary" disabled={!admNo}><Search className="w-4 h-4"/>View Fees</button>
      </div>

      {loading && <div className="card p-8 text-center"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}

      {!loading && data && (
        <div className="space-y-4">
          {data.student && (
            <div className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">{data.student.name?.charAt(0)}</div>
              <div>
                <p className="font-bold text-slate-800">{data.student.name}</p>
                <p className="text-sm text-slate-500">{data.student.class?.name} · {data.student.admissionNumber}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400">Total Paid</p>
                <p className="text-xl font-bold text-green-600">{fmt.currency(data.totalPaid||0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Pending</p>
                <p className="text-xl font-bold text-red-500">{fmt.currency(data.totalPending||0)}</p>
              </div>
            </div>
          )}
          <div className="card overflow-hidden">
            <table className="tbl">
              <thead><tr><th>Fee Type</th><th>Amount</th><th>Date</th><th>Mode</th><th>Receipt</th><th></th></tr></thead>
              <tbody>
                {(data.payments||[]).length === 0 ? (
                  <tr><td colSpan={6}><Empty icon={DollarSign} title="No payments yet"/></td></tr>
                ) : (data.payments||[]).map((p:any)=>(
                  <tr key={p.id}>
                    <td className="text-sm">{p.feeStructure?.name||'—'}</td>
                    <td className="font-semibold text-green-600">{fmt.currency(p.amount)}</td>
                    <td className="text-sm">{p.paymentDate?fmt.date(p.paymentDate):'—'}</td>
                    <td><span className="badge badge-blue">{p.paymentMode}</span></td>
                    <td className="font-mono text-xs text-slate-500">{p.receiptNumber||'—'}</td>
                    <td><button onClick={()=>downloadReceipt(p.id)} className="btn-icon"><Download className="w-3.5 h-3.5"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && !data && <div className="card p-12 text-center text-slate-400">Enter admission number to view fee history</div>}
    </div>
  );
}

function DefaultersTab() {
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(()=>{
    feesApi.getDefaulters().then(r=>setDefaulters(r.data.data||[])).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  return (
    <div className="card overflow-hidden">
      <table className="tbl">
        <thead><tr><th>Student</th><th>Class</th><th>Fee Type</th><th>Amount Due</th><th>Due Since</th></tr></thead>
        <tbody>
          {loading ? <TableSkeleton rows={6} cols={5}/> : defaulters.length===0 ? (
            <tr><td colSpan={5}><Empty icon={CheckCircle} title="No defaulters!" sub="All fees are up to date"/></td></tr>
          ) : defaulters.map((d:any,i:number)=>(
            <tr key={i}>
              <td><div><p className="font-medium text-sm">{d.student?.name||'—'}</p><p className="text-xs text-slate-400">{d.student?.admissionNumber}</p></div></td>
              <td className="text-sm">{d.student?.class?.name||'—'}</td>
              <td className="text-sm">{d.feeStructure?.name||'—'}</td>
              <td><span className="font-semibold text-red-500">{fmt.currency(d.pendingAmount||0)}</span></td>
              <td className="text-sm text-slate-500">{d.dueSince?fmt.date(d.dueSince):'—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CollectFeeModal({ structures, onClose, onSuccess }:any) {
  const [form, setForm] = useState({ admissionNumber:'', feeStructureId:'', amount:'', paymentMode:'CASH', paymentDate:new Date().toISOString().split('T')[0], remarks:'' });
  const [student, setStudent] = useState<any>(null);
  const [finding, setFinding] = useState(false);
  const [saving, setSaving]   = useState(false);
  const f = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const findStudent = async () => {
    if(!form.admissionNumber) return;
    setFinding(true);
    try { const r = await studentsApi.lookup(form.admissionNumber); setStudent(r.data.data); }
    catch{ toast.error('Student not found'); setStudent(null); }
    finally{ setFinding(false); }
  };

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await feesApi.createPayment({ admissionNumber:form.admissionNumber, feeStructureId:form.feeStructureId, amount:Number(form.amount), paymentMode:form.paymentMode, paymentDate:form.paymentDate, remarks:form.remarks||undefined });
      toast.success('Fee collected!'); onSuccess();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };

  return (
    <Modal title="Collect Fee" onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Admission Number</label>
          <div className="flex gap-2">
            <input value={form.admissionNumber} onChange={e=>f('admissionNumber',e.target.value)} className="form-input flex-1" placeholder="e.g. 2025001"/>
            <button type="button" onClick={findStudent} className="btn-secondary">{finding?'…':'Find'}</button>
          </div>
          {student && <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">{student.name} · {student.class?.name}</div>}
        </div>
        <div><label className="form-label">Fee Structure *</label>
          <select required value={form.feeStructureId} onChange={e=>{ f('feeStructureId',e.target.value); const s=structures.find((x:any)=>x.id===e.target.value); if(s) f('amount',String(s.amount)); }} className="form-select">
            <option value="">Select fee type</option>
            {structures.map((s:any)=><option key={s.id} value={s.id}>{s.name} — {fmt.currency(s.amount)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Amount (₹) *</label><input required type="number" value={form.amount} onChange={e=>f('amount',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Payment Mode</label><select value={form.paymentMode} onChange={e=>f('paymentMode',e.target.value)} className="form-select">{PAY_MODES.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
        </div>
        <div><label className="form-label">Payment Date</label><input type="date" value={form.paymentDate} onChange={e=>f('paymentDate',e.target.value)} className="form-input"/></div>
        <div><label className="form-label">Remarks</label><input value={form.remarks} onChange={e=>f('remarks',e.target.value)} className="form-input" placeholder="Optional note"/></div>
        <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Processing…':'Collect & Save'}</button></div>
      </form>
    </Modal>
  );
}

function FeeStructureModal({ structure, onClose, onSuccess }:any) {
  const editing = !!structure;
  const [form, setForm] = useState({ name:structure?.name||'', amount:structure?.amount||'', frequency:structure?.frequency||'MONTHLY', description:structure?.description||'', isOptional:structure?.isOptional||false });
  const [saving, setSaving] = useState(false);
  const f = (k:string,v:any) => setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = {...form,amount:Number(form.amount)};
      if(editing) await feesApi.updateStructure(structure.id,body); else await feesApi.createStructure(body);
      toast.success(editing?'Updated!':'Created!'); onSuccess();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };
  return (
    <Modal title={editing?'Edit Fee Structure':'Add Fee Structure'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Name *</label><input required value={form.name} onChange={e=>f('name',e.target.value)} className="form-input" placeholder="e.g. Tuition Fee"/></div>
        <div><label className="form-label">Amount (₹) *</label><input required type="number" value={form.amount} onChange={e=>f('amount',e.target.value)} className="form-input"/></div>
        <div><label className="form-label">Frequency</label><select value={form.frequency} onChange={e=>f('frequency',e.target.value)} className="form-select">{FEE_FREQ.map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}</select></div>
        <div><label className="form-label">Description</label><input value={form.description} onChange={e=>f('description',e.target.value)} className="form-input" placeholder="Optional description"/></div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isOptional} onChange={e=>f('isOptional',e.target.checked)} className="rounded"/><span className="text-sm text-slate-600">Optional fee</span></label>
        <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':editing?'Update':'Create'}</button></div>
      </form>
    </Modal>
  );
}
