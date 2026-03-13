'use client';
import { useState, useEffect } from 'react';
import { GraduationCap, Users, DollarSign, UserCheck, TrendingUp, BookOpen, AlertCircle, Calendar, ChevronRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const GOLD = '#c9a84c';
const COLORS = ['#c9a84c', '#3d6eb5', '#22c55e', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const user = getUser();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, staffRes] = await Promise.allSettled([
        api.get('/admissions/students?limit=5'),
        api.get('/users?limit=5'),
      ]);

      const students = studentsRes.status === 'fulfilled' ? studentsRes.value.data : null;
      const staff = staffRes.status === 'fulfilled' ? staffRes.value.data : null;

      setStats({ students, staff });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const attendanceData = [
    { day: 'Mon', present: 92, absent: 8 },
    { day: 'Tue', present: 88, absent: 12 },
    { day: 'Wed', present: 95, absent: 5 },
    { day: 'Thu', present: 90, absent: 10 },
    { day: 'Fri', present: 85, absent: 15 },
    { day: 'Sat', present: 78, absent: 22 },
  ];

  const feeData = [
    { month: 'Apr', collected: 145000, pending: 55000 },
    { month: 'May', collected: 162000, pending: 38000 },
    { month: 'Jun', collected: 155000, pending: 45000 },
    { month: 'Jul', collected: 170000, pending: 30000 },
    { month: 'Aug', collected: 158000, pending: 42000 },
    { month: 'Sep', collected: 175000, pending: 25000 },
  ];

  const statsCards = [
    { label: 'Total Students', value: stats?.students?.data?.total || '—', icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-500/10', change: '+12 this month', href: '/dashboard/students' },
    { label: 'Staff Members', value: stats?.staff?.data?.total || '—', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', change: 'Active', href: '/dashboard/staff' },
    { label: 'Fee Collection', value: '₹1.75L', icon: DollarSign, color: 'text-gold-500', bg: 'bg-gold-500/10', change: 'This month', href: '/dashboard/fees' },
    { label: "Today's Attendance", value: '92%', icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10', change: '+3% from yesterday', href: '/dashboard/attendance' },
  ];

  const quickLinks = [
    { label: 'Admit Student', href: '/dashboard/students', icon: GraduationCap },
    { label: 'Mark Attendance', href: '/dashboard/attendance', icon: UserCheck },
    { label: 'Collect Fee', href: '/dashboard/fees', icon: DollarSign },
    { label: 'Enter Marks', href: '/dashboard/exams', icon: BookOpen },
    { label: 'Issue Book', href: '/dashboard/library', icon: BookOpen },
    { label: 'Add Complaint', href: '/dashboard/complaints', icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Good morning, <span className="gold-shimmer">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">{formatDate(new Date())} · Sacred Heart School Koderma</p>
        </div>
        <Link href="/dashboard/session" className="btn-outline text-xs">
          <Calendar className="w-3.5 h-3.5" /> Session 2025-26
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <Link key={i} href={card.href}
            className="stat-card p-5 hover:border-gold-500/20 transition-all duration-200 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/40 text-xs mb-2">{card.label}</p>
                <p className="text-2xl font-bold text-white">{loading ? <span className="animate-pulse">—</span> : card.value}</p>
                <p className={`text-xs mt-1 ${card.color}`}>{card.change}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1 text-white/30 group-hover:text-gold-500/60 transition-colors">
              <span className="text-xs">View details</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Attendance chart */}
        <div className="navy-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/80 font-semibold text-sm">Weekly Attendance</h3>
            <span className="text-white/30 text-xs">This week</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={attendanceData} barGap={4}>
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f2040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="present" fill="#c9a84c" radius={[4,4,0,0]} name="Present" />
              <Bar dataKey="absent" fill="rgba(239,68,68,0.4)" radius={[4,4,0,0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fee collection chart */}
        <div className="navy-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/80 font-semibold text-sm">Fee Collection</h3>
            <span className="text-white/30 text-xs">Apr – Sep 2025</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={feeData}>
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#0f2040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: any) => [formatCurrency(val), '']} />
              <Line type="monotone" dataKey="collected" stroke="#c9a84c" strokeWidth={2} dot={{ fill: '#c9a84c', r: 3 }} name="Collected" />
              <Line type="monotone" dataKey="pending" stroke="rgba(239,68,68,0.6)" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick actions + Recent */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Quick actions */}
        <div className="navy-card rounded-xl p-5">
          <h3 className="text-white/80 font-semibold text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((link, i) => (
              <Link key={i} href={link.href}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/3 hover:bg-gold-500/10 hover:border-gold-500/20 border border-transparent transition-all duration-150 text-center group">
                <link.icon className="w-5 h-5 text-white/40 group-hover:text-gold-500 transition-colors" />
                <span className="text-white/50 group-hover:text-white/80 text-xs transition-colors">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent students */}
        <div className="navy-card rounded-xl p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/80 font-semibold text-sm">Recent Students</h3>
            <Link href="/dashboard/students" className="text-gold-500 text-xs hover:text-gold-400 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {(stats?.students?.data?.students || []).slice(0, 5).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500 text-xs font-semibold">
                    {s.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm truncate">{s.name}</p>
                    <p className="text-white/30 text-xs">{s.admissionNumber}</p>
                  </div>
                  <span className="text-white/30 text-xs">{s.class?.name || '—'}</span>
                </div>
              ))}
              {(!stats?.students?.data?.students?.length) && (
                <div className="text-center py-8 text-white/30 text-sm">
                  No students yet. <Link href="/dashboard/students" className="text-gold-500">Add first student →</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
