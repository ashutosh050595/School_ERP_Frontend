import axios from 'axios';
import Cookies from 'js-cookie';

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://school-erp-bay.vercel.app') + '/api';

export const api = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use(cfg => {
  const t = Cookies.get('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401 && typeof window !== 'undefined') {
    Cookies.remove('token'); Cookies.remove('user');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

// ─── Auth ──────────────────────────────────────────────
export const authApi = {
  login:  (e:string,p:string) => api.post('/auth/login',{email:e,password:p}),
  me:     () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (d:any) => api.put('/auth/change-password',d),
};

// ─── Students ──────────────────────────────────────────
export const studentsApi = {
  getAll:        (p?:any) => api.get('/admissions/students',{params:p}),
  getOne:        (id:string) => api.get(`/admissions/students/${id}`),
  lookup:        (admNo:string) => api.get(`/students/photos/lookup/${admNo}`),
  create:        (d:any) => api.post('/admissions/students',d),
  update:        (id:string,d:any) => api.put(`/admissions/students/${id}`,d),
  delete:        (id:string) => api.delete(`/admissions/students/${id}`),
  deleteAll:     () => api.delete('/admissions/students/all'),
  getClasses:    () => api.get('/admissions/classes'),
  createClass:   (d:any) => api.post('/admissions/classes',d),
  deleteClass:   (id:string) => api.delete(`/admissions/classes/${id}`),
  getSections:   (cid:string) => api.get(`/admissions/classes/${cid}/sections`),
  createSection: (cid:string,d:any) => api.post(`/admissions/classes/${cid}/sections`,d),
  uploadPhoto:   (fd:FormData) => api.post('/students/photos/upload',fd,{headers:{'Content-Type':'multipart/form-data'}}),
  bulkPhoto:     (fd:FormData) => api.post('/students/photos/bulk-upload',fd,{headers:{'Content-Type':'multipart/form-data'}}),
};

// ─── Attendance ────────────────────────────────────────
export const attendanceApi = {
  getByDate:  (p:any) => api.get('/attendance',{params:p}),
  mark:       (d:any) => api.post('/attendance',d),
  getReport:  (p:any) => api.get('/attendance/report',{params:p}),
  getSummary: (p?:any) => api.get('/attendance/summary',{params:p}),
  getStudent: (admNo:string,p?:any) => api.get(`/attendance/student/${admNo}`,{params:p}),
};

// ─── Fees ──────────────────────────────────────────────
export const feesApi = {
  getStructures:  (p?:any) => api.get('/fees/structures',{params:p}),
  createStructure:(d:any) => api.post('/fees/structures',d),
  updateStructure:(id:string,d:any) => api.put(`/fees/structures/${id}`,d),
  deleteStructure:(id:string) => api.delete(`/fees/structures/${id}`),
  getPayments:    (p?:any) => api.get('/fees/payments',{params:p}),
  createPayment:  (d:any) => api.post('/fees/payments',d),
  getDefaulters:  (p?:any) => api.get('/fees/defaulters',{params:p}),
  getSummary:     (p?:any) => api.get('/fees/summary',{params:p}),
  getReceipt:     (id:string) => api.get(`/fees/payments/${id}/receipt`,{responseType:'blob'}),
  getStudentFees: (admNo:string) => api.get(`/fees/student/${admNo}`),
};

// ─── Exams ─────────────────────────────────────────────
export const examsApi = {
  getTerms:      (p?:any) => api.get('/exams/terms',{params:p}),
  createTerm:    (d:any) => api.post('/exams/terms',d),
  updateTerm:    (id:string,d:any) => api.put(`/exams/terms/${id}`,d),
  deleteTerm:    (id:string) => api.delete(`/exams/terms/${id}`),
  getSubjects:   (termId:string) => api.get(`/exams/terms/${termId}/subjects`),
  createSubject: (termId:string,d:any) => api.post(`/exams/terms/${termId}/subjects`,d),
  deleteSubject: (id:string) => api.delete(`/exams/subjects/${id}`),
  enterMarks:    (d:any) => api.post('/exams/marks',d),
  getResults:    (p:any) => api.get('/exams/results',{params:p}),
};

// ─── Report Cards ──────────────────────────────────────
export const reportCardsApi = {
  generate:     (studentId:string,termId:string) => api.get(`/report-cards/${studentId}/${termId}`,{responseType:'blob'}),
  bulkGenerate: (d:any) => api.post('/report-cards/bulk',d,{responseType:'blob'}),
};

// ─── ID Cards ──────────────────────────────────────────
export const idcardsApi = {
  generate:     (admNo:string) => api.get(`/idcards/${admNo}`,{responseType:'blob'}),
  bulkGenerate: (d:any) => api.post('/idcards/bulk',d,{responseType:'blob'}),
};

// ─── Library ───────────────────────────────────────────
export const libraryApi = {
  getBooks:   (p?:any) => api.get('/library/books',{params:p}),
  addBook:    (d:any) => api.post('/library/books',d),
  updateBook: (id:string,d:any) => api.put(`/library/books/${id}`,d),
  deleteBook: (id:string) => api.delete(`/library/books/${id}`),
  issueBook:  (d:any) => api.post('/library/issue',d),
  returnBook: (d:any) => api.post('/library/return',d),
  getIssued:  (p?:any) => api.get('/library/issued',{params:p}),
  getOverdue: () => api.get('/library/overdue'),
};

// ─── Timetable ─────────────────────────────────────────
export const timetableApi = {
  getPeriods:      () => api.get('/timetable/periods'),
  createPeriod:    (d:any) => api.post('/timetable/periods',d),
  deletePeriod:    (id:string) => api.delete(`/timetable/periods/${id}`),
  getSlots:        (p:any) => api.get('/timetable/slots',{params:p}),
  createSlot:      (d:any) => api.post('/timetable/slots',d),
  bulkCreateSlots: (d:any) => api.post('/timetable/slots/bulk',d),
  deleteSlot:      (id:string) => api.delete(`/timetable/slots/${id}`),
};

// ─── Transport ─────────────────────────────────────────
export const transportApi = {
  getVehicles:    () => api.get('/transport/vehicles'),
  addVehicle:     (d:any) => api.post('/transport/vehicles',d),
  updateVehicle:  (id:string,d:any) => api.put(`/transport/vehicles/${id}`,d),
  getRoutes:      () => api.get('/transport/routes'),
  createRoute:    (d:any) => api.post('/transport/routes',d),
  getRoute:       (id:string) => api.get(`/transport/routes/${id}`),
  assignStudent:  (d:any) => api.post('/transport/assign',d),
  unassign:       (id:string) => api.delete(`/transport/assign/${id}`),
  getAssignments: (p?:any) => api.get('/transport/assignments',{params:p}),
};

// ─── Payroll ───────────────────────────────────────────
export const payrollApi = {
  getStructures:  () => api.get('/payroll/structures'),
  createStructure:(d:any) => api.post('/payroll/structures',d),
  updateStructure:(id:string,d:any) => api.put(`/payroll/structures/${id}`,d),
  getPayslips:    (p?:any) => api.get('/payroll/payslips',{params:p}),
  generatePayslip:(d:any) => api.post('/payroll/generate',d),
  getPayslip:     (id:string) => api.get(`/payroll/payslips/${id}`,{responseType:'blob'}),
};

// ─── Complaints ────────────────────────────────────────
export const complaintsApi = {
  getTypes:    () => api.get('/complaints/types'),
  createType:  (d:any) => api.post('/complaints/types',d),
  updateType:  (id:string,d:any) => api.put(`/complaints/types/${id}`,d),
  getAll:      (p?:any) => api.get('/complaints',{params:p}),
  getOne:      (id:string) => api.get(`/complaints/${id}`),
  create:      (d:FormData) => api.post('/complaints',d,{headers:{'Content-Type':'multipart/form-data'}}),
  acknowledge: (id:string,d:any) => api.patch(`/complaints/${id}/acknowledge`,d),
  resolve:     (id:string,d:any) => api.patch(`/complaints/${id}/resolve`,d),
};

// ─── Staff ─────────────────────────────────────────────
export const staffApi = {
  getAll:     (p?:any) => api.get('/users',{params:p}),
  getOne:     (id:string) => api.get(`/users/${id}`),
  create:     (d:any) => api.post('/users',d),
  update:     (id:string,d:any) => api.put(`/users/${id}`,d),
  deactivate: (id:string) => api.patch(`/users/${id}/deactivate`),
  activate:   (id:string) => api.patch(`/users/${id}/activate`),
  resetPassword:(id:string,d:any) => api.post(`/users/${id}/reset-password`,d),
};

// ─── Calendar ──────────────────────────────────────────
export const calendarApi = {
  getAll:      (p?:any) => api.get('/calendar',{params:p}),
  addHoliday:  (d:any) => api.post('/calendar/holiday',d),
  addWorkingDay:(d:any) => api.post('/calendar/working-day',d),
  deleteEntry: (id:string) => api.delete(`/calendar/${id}`),
};

// ─── Notifications ─────────────────────────────────────
export const notificationsApi = {
  getAll:    (p?:any) => api.get('/notifications',{params:p}),
  create:    (d:any) => api.post('/notifications',d),
  markRead:  (id:string) => api.patch(`/notifications/${id}/read`),
  markAllRead:() => api.patch('/notifications/read-all'),
  delete:    (id:string) => api.delete(`/notifications/${id}`),
};

// ─── Session ───────────────────────────────────────────
export const sessionApi = {
  getYears:          () => api.get('/session/years'),
  createYear:        (d:any) => api.post('/session/years',d),
  updateYear:        (id:string,d:any) => api.put(`/session/years/${id}`,d),
  setCurrentYear:    (id:string) => api.patch(`/session/years/${id}/set-current`),
  getConfig:         (p?:any) => api.get('/session/config',{params:p}),
  saveConfig:        (d:any) => api.post('/session/config',d),
  previewPromotion:  (id:string) => api.get(`/session/promotion/preview/${id}`),
  draftPromotion:    (d:any) => api.post('/session/promotion/draft',d),
  confirmPromotion:  (d:any) => api.post('/session/promotion/confirm',d),
  rollbackPromotion: (d:any) => api.post('/session/promotion/rollback',d),
};

// ─── Portals ───────────────────────────────────────────
export const portalApi = {
  createStudentAccess: (d:any) => api.post('/admissions/portal/student',d),
  createParentAccess:  (d:any) => api.post('/admissions/portal/parent',d),
};

export default api;
