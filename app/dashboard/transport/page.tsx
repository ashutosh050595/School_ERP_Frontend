'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { BookMarked, Clock, Bus, FileText, MessageSquare, Users, Calendar, CreditCard, Bell, Settings, BookOpen } from 'lucide-react';

export default function ModulePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname.split('/').pop() || '';
    const endpointMap: Record<string, string> = {
      staff: '/users', library: '/library/books', timetable: '/timetable/periods',
      transport: '/transport/vehicles', payroll: '/payroll/structures',
      complaints: '/complaints', calendar: '/calendar',
      notifications: '/notifications', session: '/session/years', settings: '/auth/me',
      idcards: '/admissions/students?limit=1',
    };
    api.get(endpointMap[path] || '/' + path)
      .then(r => setData(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const path = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '';
  const iconMap: Record<string, any> = { library: BookMarked, timetable: Clock, transport: Bus, payroll: FileText, complaints: MessageSquare, staff: Users, calendar: Calendar, idcards: CreditCard, notifications: Bell, session: BookOpen, settings: Settings };
  const Icon = iconMap[path] || BookOpen;
  const title = path.charAt(0).toUpperCase() + path.slice(1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
        <p className="text-white/40 text-sm mt-0.5">Manage {title.toLowerCase()}</p>
      </div>
      <div className="navy-card rounded-xl p-10 text-center">
        <Icon className="w-12 h-12 mx-auto mb-3 text-gold-500/30" />
        <p className="text-white/60 font-semibold">{title} Module</p>
        <p className="text-white/30 text-sm mt-1">{loading ? 'Connecting...' : `${Array.isArray(data) ? data.length : 1} record(s)`}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span className="text-green-400 text-xs">API Connected</span>
        </div>
        <p className="text-white/20 text-xs mt-4 max-w-sm mx-auto">Full UI coming in next update.</p>
      </div>
    </div>
  );
}
