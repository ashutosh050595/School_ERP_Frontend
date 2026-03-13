'use client';
import { useState, useEffect } from 'react';
import { Plus, FileText, Download, Edit } from 'lucide-react';
import { payrollApi, staffApi } from '@/lib/api';
import { fmt, downloadBlob } from '@/lib/utils';
import { Modal, Tabs, Empty, TableSkeleton, StatCard } from '@/components/ui';
import toast from 'react-hot-toast';

export default function PayrollPage() {
  const [tab, setTab] = useState('payslips');
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header"><div><h1 className="page-title">Payroll</h1><p className="page-sub">Manage staff salary structures and payslips</p></div></div>
      <Tabs tabs={[{key:'payslips',label:'Payslips'},{key:'structures',label:'Salary Structures'},{key:'generate',label:'Generate Payslip'}]} active={tab} onChange={setTab}/>
      {tab==='payslips'   && <PayslipsTab/>}
      {tab==='structures' && <StructuresTab/>}
      {tab==='generate'   && <GenerateTab/>}
    </div>
  );
}

function PayslipsTab() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [month, setMonth]       = useState('');
  const [year, setYear]         = useState(new Date().getFullYear().toString());

  const load = async () => {
    setLoading(true);
    try { const r = await payrollApi.getPayslips({month:month||undefined,year:year||undefined}); setPayslips(r.data.data||[]); }
    catch{ toast.error('Failed'); } finally{ setLoading(false); }
  };
  useEffect(()=>load(),[]);

  const download = async (id:string, name:string) => {
    try { const r = await payrollApi.getPayslip(id); downloadBlob(r.data,`payslip-${name}.pdf`); }
    catch{ toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-3 items-end">
        <div><label className="form-label">Month</label><select value={month} onChange={e=>setMonth(e.target.value)} className="form-select w-36"><option value="">All</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}</select></div>
        <div><label className="form-label">Year</label><input type="number" value={year} onChange={e=>setYear(e.target.value)} className="form-input w-28"/></div>
        <button onClick={load} className="btn-primary">Filter</button>
      </div>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Staff</th><th>Month/Year</th><th>Basic</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <TableSkeleton rows={6} cols={8}/> : payslips.length===0 ? (
              <tr><td colSpan={8}><Empty icon={FileText} title="No payslips found"/></td></tr>
            ) : payslips.map((p:any)=>(
              <tr key={p.id}>
                <td><p className="font-medium text-sm">{p.user?.name||'—'}</p><p className="text-xs text-slate-400">{p.user?.role}</p></td>
                <td className="text-sm">{p.month}/{p.year}</td>
                <td className="text-sm">{fmt.currency(p.basicSalary||0)}</td>
                <td className="text-sm font-semibold">{fmt.currency(p.grossSalary||0)}</td>
                <td className="text-sm text-red-500">{fmt.currency(p.totalDeductions||0)}</td>
                <td className="font-bold text-green-600">{fmt.currency(p.netPay||0)}</td>
                <td><span className={`badge ${p.status==='PAID'?'badge-green':p.status==='PENDING'?'badge-yellow':'badge-gray'}`}>{p.status||'PENDING'}</span></td>
                <td><button onClick={()=>download(p.id,p.user?.name||'staff')} className="btn-icon" title="Download"><Download className="w-3.5 h-3.5"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StructuresTab() {
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [editItem, setEditItem]     = useState<any>(null);
  const load = () => { setLoading(true); payrollApi.getStructures().then(r=>setStructures(r.data.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>load(),[]);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Structure</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? [...Array(3)].map((_,i)=><div key={i} className="h-28 card animate-pulse"/>) : structures.length===0 ? <div className="col-span-3"><Empty icon={FileText} title="No salary structures"/></div>
        : structures.map((s:any)=>(
          <div key={s.id} className="card p-4 group hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between">
              <p className="font-bold text-slate-800 mb-1">{s.name}</p>
              <button onClick={()=>setEditItem(s)} className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
            </div>
            <p className="text-2xl font-bold text-green-600 mb-2">{fmt.currency(s.basicSalary||0)}</p>
            <p className="text-xs text-slate-400">Basic Salary · {s.payGrade||'General'}</p>
          </div>
        ))}
      </div>
      {showAdd  && <StructureModal onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}}/>}
      {editItem && <StructureModal structure={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null);load();}}/>}
    </div>
  );
}

function GenerateTab() {
  const [staff, setStaff]   = useState<any[]>([]);
  const [form, setForm]     = useState({userId:'',month:String(new Date().getMonth()+1),year:String(new Date().getFullYear()),workingDays:'26',presentDays:'26',overtime:'0',extraAllowance:'0',extraDeduction:'0',remarks:''});
  const [saving, setSaving] = useState(false);
  useEffect(()=>{ staffApi.getAll({limit:100}).then(r=>setStaff(r.data.data?.users||r.data.data||[])).catch(()=>{}); },[]);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await payrollApi.generatePayslip({userId:form.userId,month:Number(form.month),year:Number(form.year),workingDays:Number(form.workingDays),presentDays:Number(form.presentDays),overtime:Number(form.overtime)||undefined,extraAllowance:Number(form.extraAllowance)||undefined,extraDeduction:Number(form.extraDeduction)||undefined,remarks:form.remarks||undefined});
      toast.success('Payslip generated!');
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };
  return (
    <div className="card p-6 max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Staff Member *</label><select required value={form.userId} onChange={e=>f('userId',e.target.value)} className="form-select"><option value="">Select staff</option>{staff.map((s:any)=><option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Month *</label><select required value={form.month} onChange={e=>f('month',e.target.value)} className="form-select">{['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}</select></div>
          <div><label className="form-label">Year *</label><input required type="number" value={form.year} onChange={e=>f('year',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Working Days</label><input type="number" value={form.workingDays} onChange={e=>f('workingDays',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Present Days</label><input type="number" value={form.presentDays} onChange={e=>f('presentDays',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Extra Allowance (₹)</label><input type="number" value={form.extraAllowance} onChange={e=>f('extraAllowance',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Extra Deduction (₹)</label><input type="number" value={form.extraDeduction} onChange={e=>f('extraDeduction',e.target.value)} className="form-input"/></div>
        </div>
        <div><label className="form-label">Remarks</label><input value={form.remarks} onChange={e=>f('remarks',e.target.value)} className="form-input" placeholder="Optional"/></div>
        <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">{saving?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating…</>:'Generate Payslip'}</button>
      </form>
    </div>
  );
}

function StructureModal({ structure, onClose, onSuccess }:any) {
  const editing = !!structure;
  const existing = structure?.components || [];
  const getComp = (name:string) => existing.find((c:any)=>c.name===name)?.amount||'';
  const [form, setForm] = useState({
    name:structure?.name||'', basicSalary:structure?.basicSalary||'',
    hra:getComp('HRA'), da:getComp('DA'), ta:getComp('TA'),
    medicalAllowance:getComp('Medical'), pfPercent:getComp('PF')||'12',
    esiPercent:getComp('ESI')||'', payGrade:structure?.payGrade||''
  });
  const [saving, setSaving] = useState(false);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = {name:form.name,basicSalary:Number(form.basicSalary),components:[
        {name:'HRA',amount:Number(form.hra)||0,type:'ALLOWANCE'},{name:'DA',amount:Number(form.da)||0,type:'ALLOWANCE'},
        {name:'TA',amount:Number(form.ta)||0,type:'ALLOWANCE'},{name:'Medical',amount:Number(form.medicalAllowance)||0,type:'ALLOWANCE'},
        {name:'PF',amount:Number(form.pfPercent)||12,type:'DEDUCTION',isPercentage:true},{name:'ESI',amount:Number(form.esiPercent)||0,type:'DEDUCTION',isPercentage:true},
      ].filter(c=>c.amount>0),payGrade:form.payGrade||undefined};
      if(editing) await payrollApi.updateStructure(structure.id, body);
      else await payrollApi.createStructure(body);
      toast.success(editing?'Structure updated!':'Structure created!'); onSuccess();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title={editing?'Edit Salary Structure':'Add Salary Structure'} onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="form-label">Structure Name *</label><input required value={form.name} onChange={e=>f('name',e.target.value)} className="form-input" placeholder="e.g. Teacher Grade A"/></div>
          <div><label className="form-label">Basic Salary (₹) *</label><input required type="number" value={form.basicSalary} onChange={e=>f('basicSalary',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Pay Grade</label><input value={form.payGrade} onChange={e=>f('payGrade',e.target.value)} className="form-input" placeholder="e.g. Grade A"/></div>
          <div><label className="form-label">HRA (₹)</label><input type="number" value={form.hra} onChange={e=>f('hra',e.target.value)} className="form-input" placeholder="0"/></div>
          <div><label className="form-label">DA (₹)</label><input type="number" value={form.da} onChange={e=>f('da',e.target.value)} className="form-input" placeholder="0"/></div>
          <div><label className="form-label">TA (₹)</label><input type="number" value={form.ta} onChange={e=>f('ta',e.target.value)} className="form-input" placeholder="0"/></div>
          <div><label className="form-label">Medical Allowance (₹)</label><input type="number" value={form.medicalAllowance} onChange={e=>f('medicalAllowance',e.target.value)} className="form-input" placeholder="0"/></div>
          <div><label className="form-label">PF (%)</label><input type="number" value={form.pfPercent} onChange={e=>f('pfPercent',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">ESI (%)</label><input type="number" value={form.esiPercent} onChange={e=>f('esiPercent',e.target.value)} className="form-input" placeholder="0"/></div>
        </div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':editing?'Update':'Create'}</button></div>
      </form>
    </Modal>
  );
}
