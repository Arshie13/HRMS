import { api } from './client';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  isPaid: boolean;
  maxDaysPerYear: number;
  accrualRate: number;
  maxConsecutiveDays: number | null;
  _count?: { leaveRequests: number };
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  balance: number;
  usedDays: number;
  pendingDays: number;
  employee?: { firstName: string; lastName: string; employeeId: string };
  leaveType?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  status: string;
  reason?: string | null;
  createdAt: string;
  employee?: { firstName: string; lastName: string; employeeId: string };
  leaveType?: LeaveType;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  recurring: boolean;
}

export const leaveApi = {
  listTypes: () => api.get<LeaveType[]>('/leave-types').then((r) => r.data),
  createType: (data: Partial<LeaveType>) => api.post('/leave-types', data),
  updateType: (id: string, data: Partial<LeaveType>) => api.put(`/leave-types/${id}`, data),

  listBalances: (employeeId?: string) =>
    api.get<LeaveBalance[]>('/leave-balances', { params: { employeeId } }).then((r) => r.data),

  listRequests: (params?: { employeeId?: string; status?: string }) =>
    api.get<LeaveRequest[]>('/leave-requests', { params }).then((r) => r.data),
  createRequest: (data: { leaveTypeId: string; startDate: string; endDate: string; halfDay?: boolean; reason?: string }) =>
    api.post('/leave-requests', data),
  approveRequest: (id: string) => api.put(`/leave-requests/${id}/approve`),
  rejectRequest: (id: string) => api.put(`/leave-requests/${id}/reject`),
  cancelRequest: (id: string) => api.put(`/leave-requests/${id}/cancel`),

  listHolidays: () => api.get<Holiday[]>('/holidays').then((r) => r.data),
  createHoliday: (data: Partial<Holiday>) => api.post('/holidays', data),
  updateHoliday: (id: string, data: Partial<Holiday>) => api.put(`/holidays/${id}`, data),
  deleteHoliday: (id: string) => api.delete(`/holidays/${id}`),
};
