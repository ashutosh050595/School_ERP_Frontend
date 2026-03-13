'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, UserCheck, DollarSign, BookOpen,
  Calendar, Clock, Bus, CreditCard, MessageSquare, Bell,
  Settings, LogOut, Menu, X, ChevronRight, GraduationCap,
  Library, FileText, User, BookMarked, Award
} from 'lucide-react';
import { isLoggedIn, getUser, clearAuth } from '@/lib/auth';
import { cn, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { href: '/dashboard/students', icon: GraduationCap, label: 'Students' },
      { href: '/dashboard/attendance', icon: UserCheck, label: 'Attendance' },
      { href: '/dashboard/exams', icon: Award, label: 'Exams & Marks' },
      { href: '/dashboard/timetable', icon: Clock, label: 'Timetable' },
      { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
      { href: '/dashboard/idcards', icon: CreditCard, label: 'ID Cards' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/dashboard/fees', icon: DollarSign, label: 'Fees' },
      { href: '/dashboard/payroll', icon: FileText, label: 'Payroll' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { href: '/dashboard/library', icon: BookMarked, label: 'Library' },
      { href: '/dashboard/transport', icon: Bus, label: 'Transport' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/dashboard/staff', icon: Users, label: 'Staff & Users' },
      { href: '/dashboard/complaints', icon: MessageSquare, label: 'Complaints' },
      { href: '/dashboard/session', icon: BookOpen, label: 'Session & Years' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = getUser();

  useEffect(() => {
    if (!isLoggedIn()) router.replace('/login');
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (!isLoggedIn()) return null;

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-navy-900 border-r border-white/5 flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gold-500/10 border border-gold-500/30">
            <BookOpen className="w-5 h-5 text-gold-500" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white leading-none">
              Edu<span className="text-gold-500">Nest</span>
            </h1>
            <p className="text-white/30 text-[10px] mt-0.5">School ERP</p>
          </div>
          <button className="ml-auto lg:hidden text-white/40" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group',
                        isActive ? 'nav-active' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                      )}>
                      <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-gold-500' : 'text-white/40 group-hover:text-white/60')} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 text-gold-500/60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-500 font-semibold text-xs">
              {getInitials(user?.name || 'SA')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm font-medium truncate">{user?.name}</p>
              <p className="text-white/30 text-xs truncate">{user?.role}</p>
            </div>
            <button onClick={handleLogout} title="Logout"
              className="text-white/30 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-navy-900/80 backdrop-blur-sm border-b border-white/5 flex-shrink-0">
          <button className="lg:hidden text-white/60 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-white/40 text-xs">Sacred Heart School Koderma</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/notifications"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors">
              <Bell className="w-4 h-4" />
            </Link>
            <Link href="/dashboard/settings"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors">
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
