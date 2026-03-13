'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, BookOpen, Lock, Mail, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { user, accessToken } = res.data.data;
      setAuth(accessToken, user);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex overflow-hidden">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-navy-gradient relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(201,168,76,0.8) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        {/* Gold orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-gold-500/8 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center items-center h-full px-16 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-gold-500/10 border border-gold-500/30 mb-8 shadow-gold-lg">
            <BookOpen className="w-12 h-12 text-gold-500" strokeWidth={1.5} />
          </div>

          <h1 className="font-display text-5xl font-bold text-white mb-3">
            Edu<span className="text-gold-500">Nest</span>
          </h1>
          <p className="text-white/40 text-sm mb-12 tracking-widest uppercase">
            School Management System
          </p>

          <div className="space-y-6 w-full max-w-sm">
            {[
              { title: 'Complete Student Management', desc: 'Admissions, attendance, fees & more' },
              { title: 'Academic Excellence Tools', desc: 'Exams, report cards & timetables' },
              { title: 'Staff & Payroll Management', desc: 'Teachers, salaries & HR in one place' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 text-left">
                <div className="w-2 h-2 bg-gold-500 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-white/80 font-medium text-sm">{item.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 w-full">
            <p className="text-white/25 text-xs">
              Designed & Created by <span className="text-gold-500/60">Ashutosh Kumar Gautam</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30">
              <BookOpen className="w-5 h-5 text-gold-500" />
            </div>
            <span className="font-display text-2xl font-bold">Edu<span className="text-gold-500">Nest</span></span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-white/40 text-sm">Sign in to access your school dashboard</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@school.edu"
                  className="form-input pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-gold justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/25 text-xs">
              EduNest v5.0 · Sacred Heart School Koderma
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
