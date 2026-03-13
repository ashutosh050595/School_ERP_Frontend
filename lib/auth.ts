import Cookies from 'js-cookie';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'ACCOUNTANT' | 'LIBRARIAN';
  teacher?: any;
}

export const setAuth = (token: string, user: User) => {
  Cookies.set('token', token, { expires: 7 });
  Cookies.set('user', JSON.stringify(user), { expires: 7 });
};

export const getToken = () => Cookies.get('token');

export const getUser = (): User | null => {
  const u = Cookies.get('user');
  try { return u ? JSON.parse(u) : null; } catch { return null; }
};

export const clearAuth = () => {
  Cookies.remove('token');
  Cookies.remove('user');
};

export const isLoggedIn = () => !!getToken();

export const roleLabel = (role: string) => ({
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  ACCOUNTANT: 'Accountant',
  LIBRARIAN: 'Librarian',
}[role] || role);

export const canAccess = (user: User | null, roles: string[]) => {
  if (!user) return false;
  return roles.includes(user.role);
};
