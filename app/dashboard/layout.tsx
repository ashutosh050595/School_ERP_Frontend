'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, GraduationCap, UserCheck, DollarSign,
  Award, BookMarked, Clock, Bus, FileText, MessageSquare,
  Users, Calendar, CreditCard, Bell, Settings, BookOpen,
  LogOut, Menu, X, ChevronRight, FileBarChart, Globe
} from 'lucide-react';
import { isLoggedIn, getUser, clearAuth, fmt } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const NAV = [
  { group:'Overview', items:[
    { href:'/dashboard', icon:LayoutDashboard, label:'Dashboard' },
    { href:'/dashboard/notifications', icon:Bell, label:'Notifications' },
  ]},
  { group:'Academic', items:[
    { href:'/dashboard/students',   icon:GraduationCap, label:'Students' },
    { href:'/dashboard/attendance', icon:UserCheck,     label:'Attendance' },
    { href:'/dashboard/exams',      icon:Award,         label:'Exams & Marks' },
    { href:'/dashboard/reportcards',icon:FileBarChart,  label:'Report Cards' },
    { href:'/dashboard/idcards',    icon:CreditCard,    label:'ID Cards' },
    { href:'/dashboard/timetable',  icon:Clock,         label:'Timetable' },
    { href:'/dashboard/calendar',   icon:Calendar,      label:'Calendar' },
  ]},
  { group:'Finance', items:[
    { href:'/dashboard/fees',    icon:DollarSign, label:'Fees' },
    { href:'/dashboard/payroll', icon:FileText,   label:'Payroll' },
  ]},
  { group:'Resources', items:[
    { href:'/dashboard/library',   icon:BookMarked, label:'Library' },
    { href:'/dashboard/transport', icon:Bus,        label:'Transport' },
  ]},
  { group:'Admin', items:[
    { href:'/dashboard/staff',      icon:Users,        label:'Staff & Users' },
    { href:'/dashboard/complaints', icon:MessageSquare,label:'Complaints' },
    { href:'/dashboard/session',    icon:BookOpen,     label:'Session & Years' },
    { href:'/dashboard/portals',    icon:Globe,        label:'Student Portals' },
    { href:'/dashboard/settings',   icon:Settings,     label:'Settings' },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = getUser();

  useEffect(() => { if (!isLoggedIn()) router.replace('/login'); }, [router]);
  if (!isLoggedIn()) return null;

  const logout = () => { clearAuth(); toast.success('Logged out'); router.push('/login'); };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {open && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={()=>setOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-slate-800 leading-none">EduNest</p>
            <p className="text-slate-400 text-[10px] mt-0.5 truncate">Sacred Heart Koderma</p>
          </div>
          <button className="lg:hidden text-slate-400" onClick={()=>setOpen(false)}><X className="w-4 h-4" /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map(g=>(
            <div key={g.group} className="mb-4">
              <p className="section-title">{g.group}</p>
              {g.items.map(item=>{
                const active = pathname===item.href || (item.href!=='/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={()=>setOpen(false)}
                    className={active ? 'nav-item-active' : 'nav-item'}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-sm">{item.label}</span>
                    {active && <ChevronRight className="w-3 h-3 opacity-40" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            <Avatar name={user?.name||'User'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role}</p>
            </div>
            <button onClick={logout} className="btn-icon" title="Logout"><LogOut className="w-4 h-4 text-slate-400" /></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <button className="lg:hidden btn-icon" onClick={()=>setOpen(true)}><Menu className="w-5 h-5" /></button>
          <div className="flex-1" />
          <Link href="/dashboard/notifications" className="btn-icon relative">
            <Bell className="w-4 h-4" />
          </Link>
          <Avatar name={user?.name||'U'} size="sm" />
        </header>
        <main className="flex-1 overflow-y-auto p-5 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
