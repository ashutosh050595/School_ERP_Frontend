'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Users, DollarSign, UserCheck, ArrowUpRight } from 'lucide-react';
import { studentsApi, feesApi, staffApi, attendanceApi, complaintsApi } from '@/lib/api';
import { getUser, fmt } from '@/lib/utils';
import { StatCard, Avatar } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

function useGreeting(name: string) {
  const [text, setText] = useState('Welcome back');
  useEffect(() => {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    setText(`${g}, ${name?.split(' ')[0] || 'Admin'} 👋`);
  }, [name]);
  return text;
}

function weekRange() {
  const today = new Date();
  const day = today.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(today); mon.setDate(today.getDate() + diffToMon);
  const sat = new Date(mon);   sat.setDate(mon.getDate() + 5);
  const iso = (d: Date) => d.toISOString().split('T')[0];
  return { from: iso(mon), to: iso(sat) };
}

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat'];

export default function DashboardPage() {
  const user     = getUser();
  const greeting = useGreeting(user?.name || '');
  const [stats,          setStats]          = useState<any>({});
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [attChartData,   setAttChartData]   = useState<any[]>([]);
  const [feeChartData,   setFeeChartData]   = useState<any[]>([]);
  const [todayAtt,       setTodayAtt]       = useState<any>(null);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const { from, to } = weekRange();

    Promise.allSettled([
      studentsApi.getAll({ limit: 5, page: 1 }),
      staffApi.getAll({ limit: 1 }),
      feesApi.getSummary(),
      attendanceApi.getSummary(),
      attendanceApi.getByDate({ date: today }),
      attendanceApi.getReport({ from, to }),
    ]).then(([s, st, f, attSum, todayRaw, weekRaw]) => {
      if (s.status === 'fulfilled') {
        setStats(p => ({ ...p, students: s.value.data.data?.total || 0 }));
        setRecentStudents(s.value.data.data?.students || []);
      }
      if (st.status === 'fulfilled')
        setStats(p => ({ ...p, staff: st.value.data.data?.total || 0 }));

      if (f.status === 'fulfilled') {
        const fd = f.value.data.data;
        setStats(p => ({ ...p, fees: fd }));
        const monthly: any[] = fd?.monthly || fd?.monthlyBreakdown || [];
        if (monthly.length > 0) {
          setFeeChartData(monthly.map((m: any) => ({
            m: m.month || m.label || m.name,
            col: m.collected || m.amount || 0,
            pen: m.pending || 0,
          })));
        }
      }

      if (todayRaw.status === 'fulfilled') {
        const td = todayRaw.value.data.data;
        const records: any[] = Array.isArray(td) ? td : td?.records || [];
        const present = records.filter((r: any) => r.status === 'PRESENT').length;
        const total   = records.length;
        setTodayAtt({ present, total, pct: total > 0 ? Math.round((present / total) * 100) : null });
      }

      if (attSum.status === 'fulfilled')
        setStats(p => ({ ...p, attSummary: attSum.value.data.data }));

      if (weekRaw.status === 'fulfilled') {
        const wd = weekRaw.value.data.data;
        const raw: any[] = Array.isArray(wd) ? wd : wd?.records || wd?.data || [];
        const byDay: Record<string, { present:number; absent:number; late:number }> = {};
        DAY_LABELS.forEach(d => { byDay[d] = { present:0, absent:0, late:0 }; });
        raw.forEach((r: any) => {
          if (!r.date) return;
          const idx = new Date(r.date).getDay();           // 1=Mon…6=Sat
          const label = DAY_LABELS[idx - 1];
          if (!label) return;
          if      (r.status === 'PRESENT') byDay[label].present++;
          else if (r.status === 'ABSENT')  byDay[label].absent++;
          else if (r.status === 'LATE')    byDay[label].late++;
        });
        // If API already returns per-day summary
        const days = wd?.byDay || wd?.daily;
        if (days) {
          Object.entries(days).forEach(([k, v]: any) => {
            const label = k.slice(0, 3);
            if (byDay[label]) { byDay[label].present = v.present||0; byDay[label].absent = v.absent||0; }
          });
        }
        const chartData = DAY_LABELS.map(d => ({ day: d, ...byDay[d] }));
        if (chartData.some(d => d.present > 0 || d.absent > 0)) setAttChartData(chartData);
      }
    }).finally(() => setLoading(false));
  }, []);

  const todayPct   = todayAtt?.pct ?? stats.attSummary?.percentage ?? null;
  const todayLabel = todayPct !== null ? `${todayPct}%` : '—';
  const todaySub   = todayAtt?.total > 0
    ? `${todayAtt.present} present / ${todayAtt.total} total`
    : 'No records yet today';

  const QUICK = [
    { label:'Admit Student',    href:'/dashboard/students',    color:'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { label:'Mark Attendance',  href:'/dashboard/attendance',  color:'bg-green-50 text-green-600 hover:bg-green-100' },
    { label:'Collect Fee',      href:'/dashboard/fees',        color:'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
    { label:'Enter Marks',      href:'/dashboard/exams',       color:'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { label:'Issue Book',       href:'/dashboard/library',     color:'bg-orange-50 text-orange-600 hover:bg-orange-100' },
    { label:'Add Complaint',    href:'/dashboard/complaints',  color:'bg-red-50 text-red-600 hover:bg-red-100' },
    { label:'Generate ID Card', href:'/dashboard/idcards',     color:'bg-teal-50 text-teal-600 hover:bg-teal-100' },
    { label:'Portal Logins',    href:'/dashboard/portals',     color:'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="page-title">{greeting}</h1>
        <p className="page-sub">
          {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={GraduationCap} iconBg="bg-blue-50"   color="text-blue-600"   label="Total Students"   value={loading?'—':(stats.students||0)} sub="Enrolled this session"/>
        <StatCard icon={Users}         iconBg="bg-purple-50"  color="text-purple-600" label="Staff Members"    value={loading?'—':(stats.staff||0)} sub="Active employees"/>
        <StatCard icon={DollarSign}    iconBg="bg-green-50"   color="text-green-600"  label="Fee Collected"    value={loading?'—':fmt.currency(stats.fees?.totalCollected||stats.fees?.collected||0)} sub={`Pending: ${fmt.currency(stats.fees?.totalPending||stats.fees?.pending||0)}`}/>
        <StatCard icon={UserCheck}     iconBg="bg-orange-50"  color="text-orange-600" label="Attendance Today" value={loading?'—':todayLabel} sub={todaySub}/>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Attendance chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Weekly Attendance</h3>
            <Link href="/dashboard/attendance" className="text-xs text-primary-600 hover:underline">View details →</Link>
          </div>
          {loading ? <div className="h-48 bg-slate-50 rounded-lg animate-pulse"/> :
          attChartData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <UserCheck className="w-8 h-8 text-slate-200"/>
              <p>No attendance marked this week yet.</p>
              <Link href="/dashboard/attendance" className="text-xs text-primary-600">Mark attendance →</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="day" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'12px'}}/>
                <Bar dataKey="present" fill="#3b82f6" radius={[4,4,0,0]} name="Present"/>
                <Bar dataKey="absent"  fill="#fca5a5" radius={[4,4,0,0]} name="Absent"/>
                {attChartData.some(d=>d.late>0) && <Bar dataKey="late" fill="#fde68a" radius={[4,4,0,0]} name="Late"/>}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Fee chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Fee Overview</h3>
            <Link href="/dashboard/fees" className="text-xs text-primary-600 hover:underline">View details →</Link>
          </div>
          {loading ? <div className="h-48 bg-slate-50 rounded-lg animate-pulse"/> :
          feeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={feeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="m" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'12px'}} formatter={(v:any)=>[fmt.currency(v),'']}/>
                <Line type="monotone" dataKey="col" stroke="#3b82f6" strokeWidth={2} dot={{r:3}} name="Collected"/>
                <Line type="monotone" dataKey="pen" stroke="#f87171" strokeWidth={2} dot={{r:3}} name="Pending"/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col justify-center gap-5 px-2">
              {[
                { label:'Total Collected', val:stats.fees?.totalCollected||stats.fees?.collected||0, color:'bg-blue-500' },
                { label:'Total Pending',   val:stats.fees?.totalPending  ||stats.fees?.pending  ||0, color:'bg-red-400' },
              ].map(row => {
                const total = (stats.fees?.totalFees||stats.fees?.total||row.val)||1;
                const pct   = Math.min(Math.round((row.val/total)*100),100);
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600 font-medium">{row.label}</span>
                      <span className="font-bold text-slate-800">{fmt.currency(row.val)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className={`${row.color} h-2.5 rounded-full transition-all duration-700`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                );
              })}
              {stats.fees && (
                <p className="text-xs text-slate-400 text-center">
                  Total: {fmt.currency(stats.fees.totalFees||stats.fees.total||0)}
                  {(stats.fees.defaulters||0) > 0 && <span className="text-red-400 ml-2">· {stats.fees.defaulters} defaulters</span>}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map(q=>(
              <Link key={q.href} href={q.href} className={`p-3 rounded-xl text-xs font-semibold text-center transition-colors ${q.color}`}>{q.label}</Link>
            ))}
          </div>
        </div>
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Recently Admitted Students</h3>
            <Link href="/dashboard/students" className="text-xs text-primary-600 hover:underline flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3"/></Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
          ) : recentStudents.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="w-8 h-8 text-slate-200 mx-auto mb-2"/>
              <p className="text-slate-400 text-sm">No students yet.</p>
              <Link href="/dashboard/students" className="text-primary-600 text-sm font-medium">Admit first student →</Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentStudents.map((s:any)=>(
                <div key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <Avatar name={s.name} size="sm"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.admissionNumber}</p>
                  </div>
                  <span className="text-xs text-slate-400">{s.class?.name||'—'}{s.section?.section?`-${s.section.section}`:''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
