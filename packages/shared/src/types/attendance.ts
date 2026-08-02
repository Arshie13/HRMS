export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  totalHours?: number;
  lateMinutes?: number;
  overtimeMinutes?: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'holiday' | 'on-leave';
