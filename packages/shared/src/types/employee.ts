export interface Employee {
  id: string;
  tenantId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  departmentId?: string;
  teamId?: string;
  status: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
}

export type EmploymentStatus = 'probationary' | 'active' | 'suspended' | 'on-leave' | 'resigned' | 'terminated';
