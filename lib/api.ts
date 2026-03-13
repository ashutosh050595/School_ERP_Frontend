import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://school-erp-bay.vercel.app';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 - redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      Cookies.remove('token');
      Cookies.remove('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ─── Dashboard Stats ──────────────────────────
export const dashboardApi = {
  getStats: async () => {
    const [students, staff, fees, attendance] = await Promise.allSettled([
      api.get('/admissions/students?limit=1'),
      api.get('/users?limit=1'),
      api.get('/fees/summary'),
      api.get('/attendance/summary'),
    ]);
    return { students, staff, fees, attendance };
  },
};

// ─── Students ─────────────────────────────────
export const studentsApi = {
  getAll: (params?: any) => api.get('/admissions/students', { params }),
  getOne: (admissionNumber: string) => api.get(`/students/photos/lookup/${admissionNumber}`),
  create: (data: any) => api.post('/admissions', data),
  update: (id: string, data: any) => api.put(`/admissions/students/${id}`, data),
  delete: (id: string) => api.delete(`/admissions/students/${id}`),
  getClasses: () => api.get('/admissions/classes'),
  createClass: (data: any) => api.post('/admissions/classes', data),
  getSections: (classId: string) => api.get(`/admissions/classes/${classId}/sections`),
  createSection: (classId: string, data: any) => api.post(`/admissions/classes/${classId}/sections`, data),
  uploadPhoto: (formData: FormData) => api.post('/students/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ─── Attendance ────────────────────────────────
export const attendanceApi = {
  getByDate: (params: any) => api.get('/attendance', { params }),
  mark: (data: any) => api.post('/attendance', data),
  getReport: (params: any) => api.get('/attendance/report', { params }),
  getSummary: (params: any) => api.get('/attendance/summary', { params }),
};

// ─── Fees ──────────────────────────────────────
export const feesApi = {
  getStructures: () => api.get('/fees/structures'),
  createStructure: (data: any) => api.post('/fees/structures', data),
  getPayments: (params?: any) => api.get('/fees/payments', { params }),
  createPayment: (data: any) => api.post('/fees/payments', data),
  getDefaulters: (params?: any) => api.get('/fees/defaulters', { params }),
  getSummary: () => api.get('/fees/summary'),
  getReceipt: (paymentId: string) => api.get(`/fees/payments/${paymentId}/receipt`, { responseType: 'blob' }),
};

// ─── Exams ─────────────────────────────────────
export const examsApi = {
  getTerms: (params?: any) => api.get('/exams/terms', { params }),
  createTerm: (data: any) => api.post('/exams/terms', data),
  getSubjects: (termId: string) => api.get(`/exams/terms/${termId}/subjects`),
  createSubject: (termId: string, data: any) => api.post(`/exams/terms/${termId}/subjects`, data),
  enterMarks: (data: any) => api.post('/exams/marks', data),
  getResults: (params: any) => api.get('/exams/results', { params }),
};

// ─── Report Cards ──────────────────────────────
export const reportCardsApi = {
  generate: (studentId: string, termId: string) =>
    api.get(`/report-cards/${studentId}/${termId}`, { responseType: 'blob' }),
  bulkGenerate: (data: any) => api.post('/report-cards/bulk', data, { responseType: 'blob' }),
};

// ─── Library ───────────────────────────────────
export const libraryApi = {
  getBooks: (params?: any) => api.get('/library/books', { params }),
  addBook: (data: any) => api.post('/library/books', data),
  issueBook: (data: any) => api.post('/library/issue', data),
  returnBook: (data: any) => api.post('/library/return', data),
  getIssuedBooks: (params?: any) => api.get('/library/issued', { params }),
};

// ─── Timetable ─────────────────────────────────
export const timetableApi = {
  getPeriods: () => api.get('/timetable/periods'),
  createPeriod: (data: any) => api.post('/timetable/periods', data),
  getSlots: (params: any) => api.get('/timetable/slots', { params }),
  createSlot: (data: any) => api.post('/timetable/slots', data),
};

// ─── Transport ─────────────────────────────────
export const transportApi = {
  getVehicles: () => api.get('/transport/vehicles'),
  addVehicle: (data: any) => api.post('/transport/vehicles', data),
  getRoutes: () => api.get('/transport/routes'),
  createRoute: (data: any) => api.post('/transport/routes', data),
  assignStudent: (data: any) => api.post('/transport/assign', data),
};

// ─── Payroll ───────────────────────────────────
export const payrollApi = {
  getStructures: () => api.get('/payroll/structures'),
  createStructure: (data: any) => api.post('/payroll/structures', data),
  getPayslips: (params?: any) => api.get('/payroll/payslips', { params }),
  generatePayslip: (data: any) => api.post('/payroll/generate', data),
};

// ─── Complaints ────────────────────────────────
export const complaintsApi = {
  getTypes: () => api.get('/complaints/types'),
  createType: (data: any) => api.post('/complaints/types', data),
  getAll: (params?: any) => api.get('/complaints', { params }),
  create: (data: FormData) => api.post('/complaints', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  acknowledge: (id: string, data: any) => api.patch(`/complaints/${id}/acknowledge`, data),
};

// ─── Staff / Users ─────────────────────────────
export const staffApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  deactivate: (id: string) => api.patch(`/users/${id}/deactivate`),
};

// ─── Calendar ──────────────────────────────────
export const calendarApi = {
  getWorkingDays: (params?: any) => api.get('/calendar', { params }),
  addHoliday: (data: any) => api.post('/calendar/holiday', data),
};

// ─── Notifications ─────────────────────────────
export const notificationsApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  create: (data: any) => api.post('/notifications', data),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
};

// ─── Session ───────────────────────────────────
export const sessionApi = {
  getYears: () => api.get('/session/years'),
  createYear: (data: any) => api.post('/session/years', data),
  getConfig: (yearId: string) => api.get(`/session/config/${yearId}`),
  saveConfig: (data: any) => api.post('/session/config', data),
  previewPromotion: (fromYearId: string) => api.get(`/session/promotion/preview/${fromYearId}`),
  draftPromotion: (data: any) => api.post('/session/promotion/draft', data),
  confirmPromotion: (data: any) => api.post('/session/promotion/confirm', data),
};

// ─── ID Cards ──────────────────────────────────
export const idcardsApi = {
  generate: (admissionNumber: string) =>
    api.get(`/idcards/${admissionNumber}`, { responseType: 'blob' }),
  bulkGenerate: (data: any) =>
    api.post('/idcards/bulk', data, { responseType: 'blob' }),
};

export default api;
