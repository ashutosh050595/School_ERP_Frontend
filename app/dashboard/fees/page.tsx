'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, DollarSign, AlertCircle, CheckCircle, Download, X, Receipt } from 'lucide-react';
import { feesApi, studentsApi } from '@/lib/api';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FeeStructure { id: string; name: string; amount: number; frequency: string; classId?: string; class?: { name: string }; }
interface Payment { id: string; amount: number; paymentDate: string; paymentMode: string; receiptNumber?: string; student?: { name: string; admissionNumber: string }; feeStructure?: { name: string }; }

export default function FeesPage() {
  const [tab, setTab] = useState<'payments' | 'structures' | 'defaulters'>('payments');
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCollect, setShowCollect] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'payments') {
        const r = await feesApi.getPayments({ search, limit: 20 });
        setPayments(r.data.data?.payments || r.data.data || []);
      } else if (tab === 'structures') {
        const r = await feesApi.getStructures();
        setStructures(r.data.data || []);
      } else {
        const r = await feesApi.getDefaulters();
        setDefaulters(r.data.data || []);
      }
    } catch { } finally { setLoading(false); }
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    feesApi.getSummary().then(r => setSummary(r.data.data)).catch(() => {});
    feesApi.getStructures().then(r => setStructures(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Fees Management</h1>
          <p className="text-white/40 text-sm mt-0.5">Collect fees & manage structures</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowStructure(true)} className="btn-outline text-sm">
            <Plus className="w-4 h-4" /> Fee Structure
          </button>
          <button onClick={() => setShowCollect(true)} className="btn-gold">
            <DollarSign className="w-4 h-4" /> Collect Fee
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card p-4">
            <p className="text-white/40 text-xs mb-1">Total Collected</p>
            <p className="text-xl font-bold text-green-400">{formatCurrency(summary.totalCollected || 0)}</p>
          </div>
          <div className="stat-card p-4">
            <p className="text-white/40 text-xs mb-1">Pending</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(summary.totalPending || 0)}</p>
          </div>
          <div className="stat-card p-4">
            <p className="text-white/40 text-xs mb-1">This Month</p>
            <p className="text-xl font-bold text-gold-500">{formatCurrency(summary.thisMonth || 0)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800 rounded-xl p-1 w-fit">
        {(['payments', 'structures', 'defaulters'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-gold-500 text-navy-900' : 'text-white/50 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'payments' && (
        <div className="navy-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." className="form-input pl-9" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Student</th><th>Fee Type</th><th>Amount</th><th>Date</th><th>Mode</th><th>Receipt</th></tr></thead>
              <tbody>
                {loading ? [...Array(6)].map((_, i) => <tr key={i}><td colSpan={6}><div className="h-8 bg-white/5 rounded animate-pulse" /></td></tr>)
                : payments.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-white/30">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-20" />No payments yet
                  </td></tr>
                ) : payments.map((p, i) => (
                  <tr key={p.id || i}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500 text-xs">
                          {p.student?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-white/80">{p.student?.name || '—'}</p>
                          <p className="text-white/30 text-xs">{p.student?.admissionNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td>{p.feeStructure?.name || '—'}</td>
                    <td><span className="text-green-400 font-semibold">{formatCurrency(p.amount)}</span></td>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td><span className="badge bg-blue-500/10 text-blue-400">{p.paymentMode}</span></td>
                    <td><span className="text-white/30 font-mono text-xs">{p.receiptNumber || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'structures' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? [...Array(4)].map((_, i) => <div key={i} className="h-28 navy-card rounded-xl animate-pulse" />)
          : structures.map(s => (
            <div key={s.id} className="navy-card rounded-xl p-4 hover:border-gold-500/20 transition-colors border border-transparent">
              <p className="text-white/80 font-semibold">{s.name}</p>
              <p className="text-gold-500 text-2xl font-bold mt-2">{formatCurrency(s.amount)}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="badge bg-white/5 text-white/40">{s.frequency}</span>
                {s.class && <span className="text-white/30 text-xs">Class {s.class.name}</span>}
              </div>
            </div>
          ))}
          {!loading && structures.length === 0 && (
            <div className="col-span-3 navy-card rounded-xl p-12 text-center text-white/30">
              No fee structures. Create one first.
            </div>
          )}
        </div>
      )}

      {tab === 'defaulters' && (
        <div className="navy-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Class</th><th>Pending Amount</th><th>Due Since</th></tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={4}><div className="h-8 bg-white/5 rounded animate-pulse" /></td></tr>)
              : defaulters.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-white/30">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400/30" />No defaulters — all fees paid!
                </td></tr>
              ) : defaulters.map((d, i) => (
                <tr key={i}>
                  <td><div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xs">{d.student?.name?.charAt(0)}</div>
                    <div><p className="text-white/80">{d.student?.name}</p><p className="text-white/30 text-xs">{d.student?.admissionNumber}</p></div>
                  </div></td>
                  <td>{d.student?.class?.name || '—'}</td>
                  <td><span className="text-red-400 font-semibold">{formatCurrency(d.pendingAmount || 0)}</span></td>
                  <td className="text-white/40">{d.dueSince ? formatDate(d.dueSince) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCollect && <CollectFeeModal structures={structures} onClose={() => setShowCollect(false)} onSuccess={() => { setShowCollect(false); load(); }} />}
      {showStructure && <AddStructureModal onClose={() => setShowStructure(false)} onSuccess={() => { setShowStructure(false); feesApi.getStructures().then(r => setStructures(r.data.data || [])); }} />}
    </div>
  );
}

function CollectFeeModal({ structures, onClose, onSuccess }: any) {
  const [form, setForm] = useState<any>({ admissionNumber: '', feeStructureId: '', amount: '', paymentMode: 'CASH', paymentDate: new Date().toISOString().split('T')[0], remarks: '' });
  const [student, setStudent] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const lookupStudent = async () => {
    if (!form.admissionNumber) return;
    setLookupLoading(true);
    try {
      const r = await studentsApi.getOne(form.admissionNumber);
      setStudent(r.data.data);
    } catch { toast.error('Student not found'); setStudent(null); }
    finally { setLookupLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await feesApi.createPayment({
        admissionNumber: form.admissionNumber, feeStructureId: form.feeStructureId,
        amount: Number(form.amount), paymentMode: form.paymentMode,
        paymentDate: form.paymentDate, remarks: form.remarks,
      });
      toast.success('Fee collected!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-white">Collect Fee</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-white/40" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="form-label">Admission Number</label>
            <div className="flex gap-2">
              <input value={form.admissionNumber} onChange={e => f('admissionNumber', e.target.value)} className="form-input flex-1" placeholder="e.g. 2025001" />
              <button type="button" onClick={lookupStudent} className="btn-outline px-3">{lookupLoading ? '...' : 'Find'}</button>
            </div>
            {student && <div className="mt-2 p-2.5 bg-green-500/10 rounded-lg border border-green-500/20 text-green-400 text-sm">{student.name} · {student.class?.name}</div>}
          </div>
          <div>
            <label className="form-label">Fee Structure</label>
            <select required value={form.feeStructureId} onChange={e => { f('feeStructureId', e.target.value); const s = structures.find((s: any) => s.id === e.target.value); if (s) f('amount', String(s.amount)); }} className="form-input">
              <option value="">Select fee type</option>
              {structures.map((s: any) => <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.amount)}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Amount (₹)</label>
            <input required type="number" value={form.amount} onChange={e => f('amount', e.target.value)} className="form-input" placeholder="Amount" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => f('paymentMode', e.target.value)} className="form-input">
                {['CASH','CHEQUE','ONLINE','NEFT','UPI'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Date</label>
              <input type="date" value={form.paymentDate} onChange={e => f('paymentDate', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold flex-1 justify-center disabled:opacity-50">
              {saving ? 'Processing...' : <><Receipt className="w-4 h-4" />Collect & Receipt</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddStructureModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState<any>({ name: '', amount: '', frequency: 'MONTHLY', description: '' });
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await feesApi.createStructure({ ...form, amount: Number(form.amount) });
      toast.success('Fee structure created!'); onSuccess();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-white">Add Fee Structure</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-white/40" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="form-label">Name *</label><input required value={form.name} onChange={e => f('name', e.target.value)} className="form-input" placeholder="e.g. Tuition Fee" /></div>
          <div><label className="form-label">Amount (₹) *</label><input required type="number" value={form.amount} onChange={e => f('amount', e.target.value)} className="form-input" /></div>
          <div><label className="form-label">Frequency</label>
            <select value={form.frequency} onChange={e => f('frequency', e.target.value)} className="form-input">
              {['MONTHLY','QUARTERLY','HALF_YEARLY','ANNUALLY','ONE_TIME'].map(f => <option key={f} value={f}>{f.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold flex-1 justify-center">{saving ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
