'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, GraduationCap, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { setAuth } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email:'', password:'' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await authApi.login(form.email, form.password);
      const { user, accessToken } = r.data.data;
      setAuth(accessToken, user);
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col w-5/12 bg-primary-700 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background:'linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#3b82f6 100%)' }} />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)', backgroundSize:'32px 32px' }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-20 -left-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="relative z-10 flex flex-col justify-center h-full px-14">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <span className="font-display text-3xl font-bold text-white">EduNest</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Complete School<br />Management<br />Solution
          </h1>
          <p className="text-primary-200 text-lg mb-10">Where every student's journey is nurtured</p>
          <div className="space-y-4">
            {['Student Admissions & Records','Daily Attendance Tracking','Fee Collection & Reports','Exams, Marks & Report Cards','Library, Transport & Payroll','Staff Management & Payroll'].map(f=>(
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <span className="text-primary-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
          <div className="mt-14 pt-8 border-t border-white/20">
            <p className="text-primary-300 text-xs">Designed & Created by <span className="text-white font-semibold">Ashutosh Kumar Gautam</span></p>
            <p className="text-primary-400 text-xs mt-1">Sacred Heart School Koderma · CBSE Affiliated</p>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-slate-800">EduNest</span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-slate-800 mb-2">Sign in</h2>
            <p className="text-slate-500">Access your school dashboard</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-danger-50 border border-danger-200 rounded-xl p-3 mb-5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-danger-500 flex-shrink-0" />
              <p className="text-danger-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="input-icon-left" />
                <input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                  className="form-input pl-10" placeholder="admin@school.edu" required autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="input-icon-left" />
                <input type={show?'text':'password'} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}
                  className="form-input pl-10 pr-10" placeholder="••••••••" required autoComplete="current-password" />
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-xs mt-8">EduNest v2.0 · Sacred Heart School Koderma</p>
        </div>
      </div>
    </div>
  );
}
