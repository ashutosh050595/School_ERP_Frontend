'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Users, DollarSign, UserCheck, BookMarked, Bus, ArrowUpRight, TrendingUp } from 'lucide-react';
import { api, studentsApi, feesApi, staffApi } from '@/lib/api';
import { getUser, fmt } from '@/lib/utils';
import { StatCard, Avatar } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const ATTENDANCE_DATA = [
  {day:'Mon',present:188,absent:12},{day:'Tue',present:182,absent:18},{day:'Wed',present:192,absent:8},
  {day:'Thu',present:185,absent:15},{day:'Fri',present:178,absent:22},{day:'Sat',present:160,absent:40},
];
const FEE_DATA = [
  {m:'Apr',col:145000,pen:55000},{m:'May',col:162000,pen:38000},{m:'Jun',col:155000,pen:45000},
  {m:'Jul',col:170000,pen:30000},{m:'Aug',col:158000,pen:42000},{m:'Sep',col:175000,pen:25000},
];

export default function DashboardPage() {
  const user = getUser();
  const [stats, setStats] = useState<any>({});
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      studentsApi.getAll({ limit:5, page:1 }),
      staffApi.getAll({ limit:1 }),
      feesApi.getSummary(),
    ]).then(([s, st, f]) => {
      if (s.status==='fulfilled') { setStats(p=>({...p, students:s.value.data.data?.total||0})); setRecentStudents(s.value.data.data?.students||[]); }
      if (st.status==='fulfilled') setStats(p=>({...p, staff:st.value.data.data?.total||0}));
      if (f.status==='fulfilled')  setStats(p=>({...p, fees:f.value.data.data}));
    }).finally(()=>setLoading(false));
  }, []);

  const QUICK = [
    {label:'Add Student',href:'/dashboard/students',color:'bg-blue-50 text-blue-600 hover:bg-blue-100'},
    {label:'Mark Attendance',href:'/dashboard/attendance',color:'bg-green-50 text-green-600 hover:bg-green-100'},
    {label:'Collect Fee',href:'/dashboard/fees',color:'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'},
    {label:'Enter Marks',href:'/dashboard/exams',color:'bg-purple-50 text-purple-600 hover:bg-purple-100'},
    {label:'Issue Book',href:'/dashboard/library',color:'bg-orange-50 text-orange-600 hover:bg-orange-100'},
    {label:'Add Complaint',href:'/dashboard/complaints',color:'bg-red-50 text-red-600 hover:bg-red-100'},
    {label:'Generate ID Card',href:'/dashboard/idcards',color:'bg-teal-50 text-teal-600 hover:bg-teal-100'},
    {label:'View Timetable',href:'/dashboard/timetable',color:'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'},
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="page-title">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-sub">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={GraduationCap} iconBg="bg-blue-50" color="text-blue-600" label="Total Students" value={loading?'—':stats.students||0} sub="Enrolled this session" />
        <StatCard icon={Users} iconBg="bg-purple-50" color="text-purple-600" label="Staff Members" value={loading?'—':stats.staff||0} sub="Active employees" />
        <StatCard icon={DollarSign} iconBg="bg-green-50" color="text-green-600" label="Fee Collected" value={loading?'—':fmt.currency(stats.fees?.totalCollected||0)} sub="This session" />
        <StatCard icon={UserCheck} iconBg="bg-orange-50" color="text-orange-600" label="Attendance Today" value="92%" sub="+3% from yesterday" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Weekly Attendance</h3>
            <span className="text-xs text-slate-400">This week</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ATTENDANCE_DATA} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'12px'}} />
              <Bar dataKey="present" fill="#3b82f6" radius={[4,4,0,0]} name="Present" />
              <Bar dataKey="absent" fill="#fca5a5" radius={[4,4,0,0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Fee Collection Trend</h3>
            <span className="text-xs text-slate-400">Apr–Sep 2025</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={FEE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="m" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'12px'}} formatter={(v:any)=>[fmt.currency(v),'']} />
              <Line type="monotone" dataKey="col" stroke="#3b82f6" strokeWidth={2} dot={{r:3}} name="Collected" />
              <Line type="monotone" dataKey="pen" stroke="#f87171" strokeWidth={2} dot={{r:3}} name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick actions + Recent students */}
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
            <h3 className="font-semibold text-slate-700">Recent Students</h3>
            <Link href="/dashboard/students" className="text-xs text-primary-600 hover:underline flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : recentStudents.length===0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">No students yet. <Link href="/dashboard/students" className="text-primary-600">Add first student →</Link></p>
          ) : (
            <div className="space-y-1">
              {recentStudents.map((s:any)=>(
                <div key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <Avatar name={s.name} size="sm" />
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
