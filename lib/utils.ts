import Cookies from 'js-cookie';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...i: ClassValue[]) { return twMerge(clsx(i)); }

// ─── Auth ─────────────────────────────────────
export interface User { id:string; name:string; email:string; role:string; teacher?:any; }

export const setAuth = (token:string, user:User) => {
  Cookies.set('token', token, { expires: 7 });
  Cookies.set('user', JSON.stringify(user), { expires: 7 });
};
export const getToken  = () => Cookies.get('token');
export const getUser   = (): User|null => { try { const u = Cookies.get('user'); return u ? JSON.parse(u) : null; } catch { return null; } };
export const clearAuth = () => { Cookies.remove('token'); Cookies.remove('user'); };
export const isLoggedIn= () => !!getToken();

// ─── Format helpers ───────────────────────────
export const fmt = {
  currency: (n:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n),
  date: (d:string|Date) => new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(d)),
  dateShort: (d:string|Date) => new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short'}).format(new Date(d)),
  dateInput: (d:string|Date) => new Date(d).toISOString().split('T')[0],
  time: (t:string) => t,
  initials: (n:string) => n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2),
  truncate: (s:string,l:number) => s.length>l ? s.slice(0,l)+'…' : s,
};

export const ROLES = ['SUPERADMIN','ADMIN','TEACHER','ACCOUNTANT','LIBRARIAN'] as const;
export const GENDERS = ['MALE','FEMALE','OTHER'] as const;
export const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'] as const;
export const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'] as const;
export const CATEGORIES = ['GENERAL','OBC','SC','ST','EWS'] as const;
export const SEVERITY = ['LOW','MEDIUM','HIGH'] as const;
export const PAY_MODES = ['CASH','CHEQUE','ONLINE','NEFT','UPI','DD'] as const;
export const FEE_FREQ = ['MONTHLY','QUARTERLY','HALF_YEARLY','ANNUALLY','ONE_TIME'] as const;

export const severityColor = (s:string) => ({LOW:'badge-green',MEDIUM:'badge-yellow',HIGH:'badge-red'}[s]||'badge-gray');
export const statusColor   = (s:string) => ({PRESENT:'badge-green',ABSENT:'badge-red',LATE:'badge-yellow',HALF_DAY:'badge-yellow',HOLIDAY:'badge-blue'}[s]||'badge-gray');
export const roleColor     = (r:string) => ({SUPERADMIN:'badge-red',ADMIN:'badge-blue',TEACHER:'badge-green',ACCOUNTANT:'badge-yellow',LIBRARIAN:'badge-gray'}[r]||'badge-gray');

export function downloadBlob(blob:Blob, filename:string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
