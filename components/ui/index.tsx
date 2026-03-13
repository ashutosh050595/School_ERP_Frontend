'use client';
import { X, Loader2, AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Spinner ──────────────────────────────────
export function Spinner({ size='sm' }: { size?:'sm'|'md'|'lg' }) {
  const s = { sm:'w-4 h-4', md:'w-6 h-6', lg:'w-8 h-8' }[size];
  return <Loader2 className={cn(s, 'animate-spin text-primary-600')} />;
}

// ─── Empty state ──────────────────────────────
export function Empty({ icon: Icon, title, sub, action }: { icon:any; title:string; sub?:string; action?:React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <p className="font-semibold text-slate-700 mb-1">{title}</p>
      {sub && <p className="text-sm text-slate-400 max-w-xs">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────
export function Modal({ title, onClose, children, size='md' }: { title:string; onClose:()=>void; children:React.ReactNode; size?:'sm'|'md'|'lg'|'xl' }) {
  const w = { sm:'max-w-sm', md:'max-w-md', lg:'max-w-2xl', xl:'max-w-4xl' }[size];
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={cn('modal-box w-full max-h-[90vh] overflow-y-auto', w)}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-display font-bold text-lg text-slate-800">{title}</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────
export function Confirm({ title, message, onConfirm, onCancel, loading }: { title:string; message:string; onConfirm:()=>void; onCancel:()=>void; loading?:boolean }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm w-full p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-danger-50 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-danger-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 mb-1">{title}</h3>
            <p className="text-sm text-slate-500">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1 justify-center">
            {loading ? <Spinner size="sm" /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────
export function Pagination({ page, total, limit, onChange }: { page:number; total:number; limit:number; onChange:(p:number)=>void }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  const start = (page-1)*limit+1, end = Math.min(page*limit, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
      <p className="text-xs text-slate-500">Showing {start}–{end} of {total}</p>
      <div className="flex items-center gap-1">
        <button disabled={page===1} onClick={()=>onChange(page-1)} className="btn-icon disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({length:Math.min(5,pages)},(_,i)=>{
          let p = i+1;
          if (pages>5) { if (page<=3) p=i+1; else if (page>=pages-2) p=pages-4+i; else p=page-2+i; }
          return (
            <button key={p} onClick={()=>onChange(p)} className={cn('w-7 h-7 text-xs rounded-lg font-medium transition-colors', p===page?'bg-primary-600 text-white':'hover:bg-slate-200 text-slate-600')}>
              {p}
            </button>
          );
        })}
        <button disabled={page>=pages} onClick={()=>onChange(page+1)} className="btn-icon disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Search input ─────────────────────────────
export function SearchInput({ value, onChange, placeholder='Search...' }: { value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return (
    <div className="relative">
      <Search className="input-icon-left" />
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="form-input pl-9 w-64" />
    </div>
  );
}

// ─── Stat card ────────────────────────────────
export function StatCard({ icon:Icon, iconBg, label, value, sub, color='text-slate-800' }: any) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{label}</p>
        <p className={cn('text-2xl font-bold', color)}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs:{key:string;label:string;count?:number}[]; active:string; onChange:(k:string)=>void }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>onChange(t.key)}
          className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            t.key===active ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
          {t.label}{t.count!=null && <span className="ml-1.5 text-xs opacity-70">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────
export function Avatar({ name, size='sm', photo }: { name:string; size?:'sm'|'md'|'lg'; photo?:string }) {
  const s = { sm:'w-8 h-8 text-xs', md:'w-10 h-10 text-sm', lg:'w-14 h-14 text-base' }[size];
  const initials = name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);
  const colors = ['bg-blue-100 text-blue-600','bg-green-100 text-green-600','bg-purple-100 text-purple-600','bg-orange-100 text-orange-600','bg-pink-100 text-pink-600'];
  const color = colors[name.charCodeAt(0)%colors.length];
  if (photo) return <img src={photo} alt={name} className={cn(s,'rounded-full object-cover')} />;
  return <div className={cn(s,'rounded-full flex items-center justify-center font-bold flex-shrink-0',color)}>{initials}</div>;
}

// ─── Loading skeleton ─────────────────────────
export function TableSkeleton({ rows=6, cols=5 }: { rows?:number; cols?:number }) {
  return (
    <>
      {Array.from({length:rows}).map((_,i)=>(
        <tr key={i} className="border-b border-slate-100">
          {Array.from({length:cols}).map((_,j)=>(
            <td key={j} className="py-3 px-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Alert ───────────────────────────────────
export function Alert({ type, message }: { type:'error'|'success'|'warning'; message:string }) {
  const styles = { error:'bg-danger-50 text-danger-600 border-danger-200', success:'bg-success-50 text-success-600 border-success-200', warning:'bg-warning-50 text-warning-600 border-warning-200' };
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border text-sm', styles[type])}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  );
}
