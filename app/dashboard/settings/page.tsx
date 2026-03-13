'use client';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { getUser, clearAuth } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Lock, LogOut, User, Shield } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const user   = getUser();
  const [pwForm, setPwForm] = useState({currentPassword:'',newPassword:'',confirmPassword:''});
  const [saving, setSaving] = useState(false);

  const changePassword = async (e:React.FormEvent) => {
    e.preventDefault();
    if(pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    if(pwForm.newPassword.length < 6) return toast.error('Min 6 characters');
    setSaving(true);
    try { await authApi.changePassword({currentPassword:pwForm.currentPassword,newPassword:pwForm.newPassword}); toast.success('Password changed!'); setPwForm({currentPassword:'',newPassword:'',confirmPassword:''}); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };

  const logout = () => { clearAuth(); toast.success('Logged out'); router.push('/login'); };

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="page-title">Settings</h1><p className="page-sub">Manage your account preferences</p></div>

      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <User className="w-5 h-5 text-slate-500"/><h2 className="font-bold text-slate-700">My Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <Avatar name={user?.name||'User'} size="lg"/>
          <div>
            <p className="font-bold text-lg text-slate-800">{user?.name}</p>
            <p className="text-slate-500">{user?.email}</p>
            <span className="badge badge-blue mt-1">{user?.role}</span>
          </div>
        </div>
        {user?.role==='TEACHER' && user?.teacher && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-sm">
            {[['Subject',user.teacher.subject],['Qualification',user.teacher.qualification],['Employee ID',user.teacher.employeeId],['Phone',user.teacher.phone]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k}><span className="text-xs text-slate-400 font-semibold uppercase">{k}</span><p className="text-slate-700">{v}</p></div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <Lock className="w-5 h-5 text-slate-500"/><h2 className="font-bold text-slate-700">Change Password</h2>
        </div>
        <form onSubmit={changePassword} className="space-y-4 max-w-sm">
          <div><label className="form-label">Current Password</label><input required type="password" value={pwForm.currentPassword} onChange={e=>setPwForm(p=>({...p,currentPassword:e.target.value}))} className="form-input" placeholder="Current password"/></div>
          <div><label className="form-label">New Password</label><input required type="password" value={pwForm.newPassword} onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))} className="form-input" placeholder="Min 6 characters"/></div>
          <div><label className="form-label">Confirm New Password</label><input required type="password" value={pwForm.confirmPassword} onChange={e=>setPwForm(p=>({...p,confirmPassword:e.target.value}))} className="form-input" placeholder="Repeat new password"/></div>
          <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Update Password'}</button>
        </form>
      </div>

      {/* About */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <Shield className="w-5 h-5 text-slate-500"/><h2 className="font-bold text-slate-700">About EduNest</h2>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <p><span className="font-semibold">Version:</span> 2.0.0</p>
          <p><span className="font-semibold">School:</span> Sacred Heart School Koderma</p>
          <p><span className="font-semibold">CBSE Affiliated</span></p>
          <p><span className="font-semibold">Backend:</span> https://school-erp-bay.vercel.app</p>
          <p className="text-xs text-slate-400 mt-3">Designed & Created by <span className="font-semibold text-slate-600">Ashutosh Kumar Gautam</span></p>
        </div>
      </div>

      {/* Logout */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <LogOut className="w-5 h-5 text-slate-500"/><h2 className="font-bold text-slate-700">Sign Out</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">You will be signed out of your account on this device.</p>
        <button onClick={logout} className="btn-danger"><LogOut className="w-4 h-4"/>Sign Out</button>
      </div>
    </div>
  );
}
