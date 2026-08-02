import { api } from './client';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  totalHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeMinutes: number;
  status: string;
  employee?: { id: string; firstName: string; lastName: string; employeeId: string };
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  flexible: boolean;
  _count?: { employeeShifts: number };
}

export interface Correction {
  id: string;
  employeeId: string;
  field: string;
  currentValue: string | null;
  requestedValue: string;
  reason: string;
  status: string;
  createdAt: string;
  employee?: { firstName: string; lastName: string };
}

export const attendanceApi = {
  today: () => api.get<AttendanceRecord | null>('/attendance/today').then((r) => r.data),
  clockIn: (employeeId?: string) => api.post('/attendance/clock-in', { employeeId }),
  clockOut: (employeeId?: string) => api.post('/attendance/clock-out', { employeeId }),
  breakStart: () => api.post('/attendance/break-start', {}),
  breakEnd: () => api.post('/attendance/break-end', {}),
  list: (params?: { employeeId?: string; dateFrom?: string; dateTo?: string }) =>
    api.get<AttendanceRecord[]>('/attendance', { params }).then((r) => r.data),

  listCorrections: (employeeId?: string) =>
    api.get<Correction[]>('/attendance/corrections', { params: { employeeId } }).then((r) => r.data),
  createCorrection: (data: { field: string; requestedValue: string; reason: string }) =>
    api.post('/attendance/corrections', data),
  approveCorrection: (id: string) => api.put(`/attendance/corrections/${id}/approve`),
  rejectCorrection: (id: string) => api.put(`/attendance/corrections/${id}/reject`),

  listShifts: () => api.get<Shift[]>('/shifts').then((r) => r.data),
  createShift: (data: Partial<Shift>) => api.post('/shifts', data),
  updateShift: (id: string, data: Partial<Shift>) => api.put(`/shifts/${id}`, data),
  deleteShift: (id: string) => api.delete(`/shifts/${id}`),
  assignShift: (data: { employeeId: string; shiftId: string; effectiveFrom: string; effectiveTo?: string }) =>
    api.post('/shifts/assign', data),
};
