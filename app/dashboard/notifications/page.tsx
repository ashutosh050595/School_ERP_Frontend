'use client';
import { useState, useEffect } from 'react';
import { Plus, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { fmt } from '@/lib/utils';
import { Modal, Empty, TableSkeleton } from '@/components/ui';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showCreate, setShowCreate]       = useState(false);

  const load = () => { setLoading(true); notificationsApi.getAll().then(r=>setNotifications(r.data.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>load(),[]);

  const markRead = async (id:string) => {
    try { await notificationsApi.markRead(id); load(); }
    catch { toast.error('Failed'); }
  };
  const markAllRead = async () => {
    try { await notificationsApi.markAllRead(); toast.success('All marked read'); load(); }
    catch { toast.error('Failed'); }
  };
  const deleteNotif = async (id:string) => {
    try { await notificationsApi.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const unread = notifications.filter(n=>!n.isRead).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="page-header">
        <div><h1 className="page-title">Notifications</h1><p className="page-sub">{unread} unread</p></div>
        <div className="flex gap-2">
          {unread>0 && <button onClick={markAllRead} className="btn-secondary"><CheckCheck className="w-4 h-4"/>Mark All Read</button>}
          <button onClick={()=>setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4"/>Send Notification</button>
        </div>
      </div>
      <div className="space-y-2">
        {loading ? [...Array(5)].map((_,i)=><div key={i} className="h-16 card animate-pulse"/>) : notifications.length===0 ? (
          <div className="card p-12"><Empty icon={Bell} title="No notifications"/></div>
        ) : notifications.map((n:any)=>(
          <div key={n.id} className={`card p-4 flex items-start gap-4 transition-colors ${!n.isRead?'border-primary-200 bg-primary-50/30':''}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!n.isRead?'bg-primary-100':'bg-slate-100'}`}>
              <Bell className={`w-4 h-4 ${!n.isRead?'text-primary-600':'text-slate-400'}`}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${!n.isRead?'text-slate-800':'text-slate-600'}`}>{n.title||n.message||'—'}</p>
              {n.message&&n.title && <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>}
              <p className="text-xs text-slate-400 mt-1">{n.createdAt?fmt.date(n.createdAt):'—'}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {!n.isRead && <button onClick={()=>markRead(n.id)} className="btn-icon text-primary-600" title="Mark read"><CheckCheck className="w-3.5 h-3.5"/></button>}
              <button onClick={()=>deleteNotif(n.id)} className="btn-icon hover:text-danger-500" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          </div>
        ))}
      </div>
      {showCreate && <CreateNotificationModal onClose={()=>setShowCreate(false)} onSuccess={()=>{setShowCreate(false);load();}}/>}
    </div>
  );
}

function CreateNotificationModal({ onClose, onSuccess }:any) {
  const [form, setForm] = useState({title:'',message:'',type:'GENERAL',targetRole:'',isGlobal:true});
  const [saving, setSaving] = useState(false);
  const f=(k:string,v:any)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await notificationsApi.create(form); toast.success('Notification sent!'); onSuccess(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title="Send Notification" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Title *</label><input required value={form.title} onChange={e=>f('title',e.target.value)} className="form-input" placeholder="Notification title"/></div>
        <div><label className="form-label">Message *</label><textarea required value={form.message} onChange={e=>f('message',e.target.value)} className="form-input" rows={3} placeholder="Notification message…"/></div>
        <div><label className="form-label">Type</label><select value={form.type} onChange={e=>f('type',e.target.value)} className="form-select">{['GENERAL','ACADEMIC','FEE','EXAM','HOLIDAY','TRANSPORT','COMPLAINT'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className="form-label">Target Role</label><select value={form.targetRole} onChange={e=>f('targetRole',e.target.value)} className="form-select"><option value="">All</option>{['ADMIN','TEACHER','ACCOUNTANT','LIBRARIAN'].map(r=><option key={r} value={r}>{r}</option>)}</select></div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isGlobal} onChange={e=>f('isGlobal',e.target.checked)} className="rounded"/><span className="text-sm text-slate-600">Send to all users</span></label>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Sending…':'Send'}</button></div>
      </form>
    </Modal>
  );
}
