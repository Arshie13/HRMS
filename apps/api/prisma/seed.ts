import { PrismaClient } from '.prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || 'postgresql://hrm:hrm_dev@localhost:5433/hrm_dev',
  pool: { max: 1 },
});
const prisma = new PrismaClient({ adapter });

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEPT_ENG = '00000000-0000-0000-0000-000000000010';
const DEPT_HR = '00000000-0000-0000-0000-000000000011';
const DEPT_FINANCE = '00000000-0000-0000-0000-000000000012';
const TEAM_ALPHA = '00000000-0000-0000-0000-000000000020';
const TEAM_BRAVO = '00000000-0000-0000-0000-000000000021';

const ROLES = {
  admin: { id: '00000000-0000-0000-0000-000000000100', name: 'Admin' },
  hrManager: { id: '00000000-0000-0000-0000-000000000101', name: 'HR Manager' },
  hrStaff: { id: '00000000-0000-0000-0000-000000000102', name: 'HR Staff' },
  deptHead: { id: '00000000-0000-0000-0000-000000000103', name: 'Department Head' },
  manager: { id: '00000000-0000-0000-0000-000000000104', name: 'Manager' },
  employee: { id: '00000000-0000-0000-0000-000000000105', name: 'Employee' },
};

function fullPermissions(): Record<string, Record<string, boolean>> {
  const modules = ['employees', 'departments', 'teams', 'attendance', 'leaves', 'payroll', 'roles', 'users', 'settings'];
  const actions = ['create', 'read', 'update', 'delete', 'approve', 'export'];
  const perms: Record<string, Record<string, boolean>> = {};
  for (const m of modules) {
    perms[m] = {};
    for (const a of actions) perms[m][a] = true;
  }
  return perms;
}

function readOnlyPerms(): Record<string, Record<string, boolean>> {
  const none = { create: false, read: false, update: false, delete: false, approve: false, export: false };
  const read = { create: false, read: true, update: false, delete: false, approve: false, export: false };
  const self = { create: true, read: true, update: true, delete: false, approve: false, export: false };
  return {
    // self-service only — no tenant-wide visibility
    employees: read,      // reads are self-scoped by the API
    departments: read,    // org structure names only
    teams: read,          // org structure names only
    attendance: self,     // clock in/out, breaks, own corrections
    leaves: self,         // file/cancel own requests, own balances
    payroll: none,        // no salaries / periods
    roles: none,
    users: none,
    settings: none,
  };
}

async function main() {
  console.log('Seeding...');

  // Single pooled connection + session-level tenant context satisfies RLS.
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.tenant_id', '${TENANT_ID}', false)`,
  );

  const existing = await prisma.tenant.findUnique({ where: { slug: 'acme-corp' } });
  if (existing) {
    console.log('Seed already applied, deleting first...');
    await prisma.$executeRawUnsafe(`DELETE FROM "Payslip" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "PayrollAdjustment" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "PayrollDeduction" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "PayrollEntry" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "PayrollPeriod" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Loan" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "BIRTaxBracket" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "GovernmentContributionTable" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Holiday" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "LeaveRequest" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "LeaveBalance" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "LeaveType" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "AttendanceCorrection" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Attendance" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "EmployeeShift" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Shift" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Notification" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Session" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Employee" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Team" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Department" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Role" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" = '${TENANT_ID}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id = '${TENANT_ID}'`);
  }

  // Tenant
  await prisma.tenant.create({
    data: { id: TENANT_ID, name: 'Acme Corp', slug: 'acme-corp', plan: 'professional' },
  });

  // Roles
  for (const [key, role] of Object.entries(ROLES)) {
    const perms = key === 'employee' ? readOnlyPerms() : fullPermissions();
    if (key === 'manager') {
      perms.payroll = { create: false, read: false, update: false, delete: false, approve: false, export: false };
      perms.roles = { create: false, read: false, update: false, delete: false, approve: false, export: false };
      perms.users = { create: false, read: false, update: false, delete: false, approve: false, export: false };
    }
    await prisma.role.create({
      data: { id: role.id, tenantId: TENANT_ID, name: role.name, description: `${role.name} role`, permissions: perms, isSystem: true },
    });
  }

  // Departments
  await prisma.department.create({ data: { id: DEPT_ENG, tenantId: TENANT_ID, name: 'Engineering' } });
  await prisma.department.create({ data: { id: DEPT_HR, tenantId: TENANT_ID, name: 'Human Resources' } });
  await prisma.department.create({ data: { id: DEPT_FINANCE, tenantId: TENANT_ID, name: 'Finance' } });

  // Teams
  await prisma.team.create({ data: { id: TEAM_ALPHA, tenantId: TENANT_ID, name: 'Alpha' } });
  await prisma.team.create({ data: { id: TEAM_BRAVO, tenantId: TENANT_ID, name: 'Bravo' } });

  // Shifts
  const SHIFT_MORNING = '00000000-0000-0000-0000-000000000030';
  const SHIFT_NIGHT = '00000000-0000-0000-0000-000000000031';
  await prisma.shift.create({
    data: { id: SHIFT_MORNING, tenantId: TENANT_ID, name: 'Morning', startTime: '09:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00', flexible: false },
  });
  await prisma.shift.create({
    data: { id: SHIFT_NIGHT, tenantId: TENANT_ID, name: 'Night', startTime: '22:00', endTime: '06:00', breakStart: '02:00', breakEnd: '03:00', flexible: false },
  });

  // Users (password: Password123!)
  const passwordHash = await bcrypt.hash('Password123!', 10);
  await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000200',
      tenantId: TENANT_ID, email: 'admin@acme.com', name: 'John Admin',
      passwordHash, roleId: ROLES.admin.id,
    },
  });
  await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000201',
      tenantId: TENANT_ID, email: 'hr@acme.com', name: 'Sarah HR',
      passwordHash, roleId: ROLES.hrManager.id,
    },
  });
  // self-service employee account (matches Alice's employee email)
  await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000202',
      tenantId: TENANT_ID, email: 'alice@acme.com', name: 'Alice Santos',
      passwordHash, roleId: ROLES.employee.id,
    },
  });

  // Employees
  const employees = [
    { id: '00000000-0000-0000-0000-000000000301', employeeId: 'ACM-0001', firstName: 'Alice', lastName: 'Santos', email: 'alice@acme.com', position: 'Senior Engineer', dept: DEPT_ENG, team: TEAM_ALPHA, salary: 85000 },
    { id: '00000000-0000-0000-0000-000000000302', employeeId: 'ACM-0002', firstName: 'Bob', lastName: 'Cruz', email: 'bob@acme.com', position: 'Software Engineer', dept: DEPT_ENG, team: TEAM_ALPHA, salary: 65000 },
    { id: '00000000-0000-0000-0000-000000000303', employeeId: 'ACM-0003', firstName: 'Carol', lastName: 'Garcia', email: 'carol@acme.com', position: 'DevOps Engineer', dept: DEPT_ENG, team: TEAM_BRAVO, salary: 72000 },
    { id: '00000000-0000-0000-0000-000000000304', employeeId: 'ACM-0004', firstName: 'David', lastName: 'Reyes', email: 'david@acme.com', position: 'Frontend Developer', dept: DEPT_ENG, team: TEAM_BRAVO, salary: 58000 },
    { id: '00000000-0000-0000-0000-000000000305', employeeId: 'ACM-0005', firstName: 'Elena', lastName: 'Mendoza', email: 'elena@acme.com', position: 'HR Specialist', dept: DEPT_HR, team: null, salary: 45000 },
    { id: '00000000-0000-0000-0000-000000000306', employeeId: 'ACM-0006', firstName: 'Frank', lastName: 'Torres', email: 'frank@acme.com', position: 'Recruiter', dept: DEPT_HR, team: null, salary: 40000 },
    { id: '00000000-0000-0000-0000-000000000307', employeeId: 'ACM-0007', firstName: 'Grace', lastName: 'Lim', email: 'grace@acme.com', position: 'Accountant', dept: DEPT_FINANCE, team: null, salary: 52000 },
    { id: '00000000-0000-0000-0000-000000000308', employeeId: 'ACM-0008', firstName: 'Henry', lastName: 'Chua', email: 'henry@acme.com', position: 'Finance Manager', dept: DEPT_FINANCE, team: null, salary: 78000 },
    { id: '00000000-0000-0000-0000-000000000309', employeeId: 'ACM-0009', firstName: 'Isabel', lastName: 'Dizon', email: 'isabel@acme.com', position: 'Junior Developer', dept: DEPT_ENG, team: TEAM_ALPHA, salary: 38000 },
    { id: '00000000-0000-0000-0000-000000000310', employeeId: 'ACM-0010', firstName: 'Jake', lastName: 'Villanueva', email: 'jake@acme.com', position: 'QA Engineer', dept: DEPT_ENG, team: TEAM_BRAVO, salary: 48000 },
  ];

  for (const emp of employees) {
    await prisma.employee.create({
      data: {
        id: emp.id, tenantId: TENANT_ID, employeeId: emp.employeeId,
        firstName: emp.firstName, lastName: emp.lastName, email: emp.email,
        position: emp.position, departmentId: emp.dept, teamId: emp.team,
        status: 'active', monthlySalary: emp.salary,
        emergencyContacts: [{ name: 'Emergency Contact', phone: '09170000000', relation: 'Spouse' }],
      },
    });
  }

  // Contribution Tables
  const sssBrackets = [
    { min: 0, max: 3250, ee: 135, er: 307.5 },
    { min: 3250, max: 3750, ee: 157.5, er: 352.5 },
    { min: 3750, max: 4250, ee: 180, er: 397.5 },
    { min: 4250, max: 4750, ee: 202.5, er: 442.5 },
    { min: 4750, max: 5250, ee: 225, er: 487.5 },
    { min: 5250, max: 5750, ee: 247.5, er: 532.5 },
    { max: null, min: 24750, ee: 1125, er: 2437.5 },
  ];
  for (const b of sssBrackets) {
    if (b.min === 24750 && b.max === null) {
      await prisma.governmentContributionTable.create({
        data: { tenantId: TENANT_ID, type: 'SSS', minCompensation: 24750, maxCompensation: null, employeeShare: b.ee, employerShare: b.er, effectiveDate: new Date('2025-01-01') },
      });
    } else {
      await prisma.governmentContributionTable.create({
        data: { tenantId: TENANT_ID, type: 'SSS', minCompensation: b.min, maxCompensation: b.max, employeeShare: b.ee, employerShare: b.er, effectiveDate: new Date('2025-01-01') },
      });
    }
  }

  await prisma.governmentContributionTable.create({
    data: { tenantId: TENANT_ID, type: 'PhilHealth', minCompensation: 0, maxCompensation: null, employeeShare: 500, employerShare: 500, effectiveDate: new Date('2025-01-01') },
  });
  await prisma.governmentContributionTable.create({
    data: { tenantId: TENANT_ID, type: 'PagIBIG', minCompensation: 0, maxCompensation: null, employeeShare: 100, employerShare: 100, effectiveDate: new Date('2025-01-01') },
  });

  // BIR Tax Brackets
  const taxBrackets = [
    { min: 0, max: 250000, base: 0, excess: 0 },
    { min: 250000, max: 400000, base: 0, excess: 15 },
    { min: 400000, max: 800000, base: 22500, excess: 20 },
    { min: 800000, max: 2000000, base: 102500, excess: 25 },
    { min: 2000000, max: 8000000, base: 402500, excess: 30 },
    { min: 8000000, max: null, base: 2202500, excess: 35 },
  ];
  for (const b of taxBrackets) {
    await prisma.bIRTaxBracket.create({
      data: { tenantId: TENANT_ID, minAmount: b.min, maxAmount: b.max, baseTax: b.base, excessPercentage: b.excess, effectiveDate: new Date('2025-01-01') },
    });
  }

  // Leave Types
  await prisma.leaveType.create({
    data: { tenantId: TENANT_ID, name: 'Vacation Leave', code: 'VL', isPaid: true, maxDaysPerYear: 5, accrualRate: 0.4167, maxConsecutiveDays: 15 },
  });
  await prisma.leaveType.create({
    data: { tenantId: TENANT_ID, name: 'Sick Leave', code: 'SL', isPaid: true, maxDaysPerYear: 5, accrualRate: 0, maxConsecutiveDays: 5 },
  });

  // Holidays
  const holidays = [
    { name: 'New Year\'s Day', date: '2026-01-01', type: 'regular' },
    { name: 'Maundy Thursday', date: '2026-04-02', type: 'regular' },
    { name: 'Good Friday', date: '2026-04-03', type: 'regular' },
    { name: 'Labor Day', date: '2026-05-01', type: 'regular' },
    { name: 'Independence Day', date: '2026-06-12', type: 'regular' },
    { name: 'National Heroes Day', date: '2026-08-24', type: 'regular' },
    { name: 'Bonifacio Day', date: '2026-11-30', type: 'regular' },
    { name: 'Christmas Day', date: '2026-12-25', type: 'regular' },
    { name: 'Rizal Day', date: '2026-12-30', type: 'regular' },
    { name: 'Ninoy Aquino Day', date: '2026-08-21', type: 'special' },
    { name: 'All Saints Day', date: '2026-11-01', type: 'special' },
    { name: 'Christmas Eve', date: '2026-12-24', type: 'special' },
  ];
  for (const h of holidays) {
    await prisma.holiday.create({
      data: { tenantId: TENANT_ID, name: h.name, date: new Date(h.date), type: h.type, recurring: true },
    });
  }

  // Payroll Periods
  const period1Id = '00000000-0000-0000-0000-000000000400';
  const period2Id = '00000000-0000-0000-0000-000000000401';

  await prisma.payrollPeriod.create({
    data: {
      id: period1Id, tenantId: TENANT_ID,
      startDate: new Date('2026-06-01'), endDate: new Date('2026-06-15'),
      payDate: new Date('2026-06-20'), scheduleType: 'semi-monthly', status: 'approved',
    },
  });
  await prisma.payrollPeriod.create({
    data: {
      id: period2Id, tenantId: TENANT_ID,
      startDate: new Date('2026-06-16'), endDate: new Date('2026-06-30'),
      payDate: new Date('2026-07-05'), scheduleType: 'semi-monthly', status: 'computed',
    },
  });

  // Payroll Entries - compute simple values for each employee
  function computePayroll(salary: number) {
    const dailyRate = salary / 26;
    const daysWorked = 13;
    const basicPay = dailyRate * daysWorked;
    const otHours = 4;
    const otPay = (dailyRate / 8) * otHours * 1.25;
    const nightDiff = (dailyRate / 8) * 3 * 0.1;
    const grossPay = basicPay + otPay + nightDiff;
    const sss = salary >= 24750 ? 1125 : Math.min(Math.floor(salary / 1000) * 22.5, 1125);
    const philhealth = Math.min(salary * 0.05 / 2, 500);
    const pagibig = Math.min(salary * 0.02, 100);
    const taxableIncome = grossPay - sss - philhealth - pagibig;
    const withholdingTax = taxableIncome > 0 ? taxableIncome * 0.15 : 0;
    const totalDeductions = sss + philhealth + pagibig + withholdingTax;
    const netPay = grossPay - totalDeductions;
    return { dailyRate, basicPay, otPay, nightDiff, grossPay, sss, philhealth, pagibig, withholdingTax, totalDeductions, netPay };
  }

  function round2(n: number) { return Math.round(n * 100) / 100; }

  for (const emp of employees) {
    const c = computePayroll(emp.salary);

    const entry1Id = `00000000-0000-0000-0000-0000${String(500 + employees.indexOf(emp)).padStart(4, '0')}`;
    await prisma.payrollEntry.create({
      data: {
        id: entry1Id, payrollPeriodId: period1Id, employeeId: emp.id, tenantId: TENANT_ID,
        dailyRate: round2(c.dailyRate), daysWorked: 13,
        basicPay: round2(c.basicPay), overtimePay: round2(c.otPay),
        nightDiffPay: round2(c.nightDiff), holidayPay: 0,
        grossPay: round2(c.grossPay),
        sssDeduction: round2(c.sss), philhealthDeduction: round2(c.philhealth),
        pagibigDeduction: round2(c.pagibig), withholdingTax: round2(c.withholdingTax),
        totalDeductions: round2(c.totalDeductions), netPay: round2(c.netPay),
      },
    });

    const c2 = computePayroll(emp.salary * 1.02);
    const entry2Id = `00000000-0000-0000-0000-0000${String(600 + employees.indexOf(emp)).padStart(4, '0')}`;
    await prisma.payrollEntry.create({
      data: {
        id: entry2Id, payrollPeriodId: period2Id, employeeId: emp.id, tenantId: TENANT_ID,
        dailyRate: round2(c2.dailyRate), daysWorked: 14,
        basicPay: round2(c2.basicPay), overtimePay: round2(c2.otPay),
        nightDiffPay: round2(c2.nightDiff), holidayPay: round2(c2.dailyRate),
        grossPay: round2(c2.grossPay + c2.dailyRate),
        sssDeduction: round2(c2.sss), philhealthDeduction: round2(c2.philhealth),
        pagibigDeduction: round2(c2.pagibig), withholdingTax: round2(c2.withholdingTax),
        totalDeductions: round2(c2.totalDeductions), netPay: round2(c2.grossPay + c2.dailyRate - c2.totalDeductions),
      },
    });
  }

  // Loans
  await prisma.loan.create({
    data: {
      tenantId: TENANT_ID, employeeId: '00000000-0000-0000-0000-000000000301',
      loanType: 'cash_advance', principal: 20000,
      amortizationPerPeriod: 2500, totalPeriods: 8, periodsPaid: 3,
      startDate: new Date('2026-03-01'), status: 'active',
    },
  });
  await prisma.loan.create({
    data: {
      tenantId: TENANT_ID, employeeId: '00000000-0000-0000-0000-000000000305',
      loanType: 'company_loan', principal: 50000,
      amortizationPerPeriod: 5000, totalPeriods: 12, periodsPaid: 5,
      startDate: new Date('2026-02-01'), status: 'active',
    },
  });
  await prisma.loan.create({
    data: {
      tenantId: TENANT_ID, employeeId: '00000000-0000-0000-0000-000000000308',
      loanType: 'sss_loan', principal: 30000,
      amortizationPerPeriod: 3000, totalPeriods: 10, periodsPaid: 10,
      startDate: new Date('2025-09-01'), endDate: new Date('2026-06-01'), status: 'paid',
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
