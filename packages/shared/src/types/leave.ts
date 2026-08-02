export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  status: LeaveRequestStatus;
  reason?: string;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
