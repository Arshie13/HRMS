import {
  PayrollComputationService,
  DEFAULT_PAYROLL_SETTINGS,
} from '../src/payroll/payroll-computation.service';

const mockPrismaService = {
  governmentContributionTable: {
    findFirst: jest.fn(),
  },
  bIRTaxBracket: {
    findFirst: jest.fn(),
  },
  loan: {
    findMany: jest.fn(),
  },
  payrollSetting: {
    findUnique: jest.fn(),
  },
};

const txMock = {
  payrollSetting: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
};

describe('PayrollComputationService', () => {
  let service: PayrollComputationService;

  beforeEach(() => {
    service = new PayrollComputationService(mockPrismaService as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('computes daily rate from monthly salary', () => {
    expect(service.computeDailyRate(52000)).toBeCloseTo(2000);
  });

  it('computes basic pay, overtime, holiday pay and deductions correctly', async () => {
    mockPrismaService.governmentContributionTable.findFirst.mockResolvedValue({
      employeeShare: 1500,
    });
    mockPrismaService.bIRTaxBracket.findFirst.mockResolvedValue({
      baseTax: 500,
      minAmount: 0,
      excessPercentage: 10,
    });
    mockPrismaService.loan.findMany.mockResolvedValue([]);

    const result = await service.compute(
      {
        monthlySalary: 52000,
        dailyRate: 2000,
        daysWorked: 10,
        overtimeHours: 5,
        nightDiffHours: 2,
        holidayEvents: [
          { type: 'regular', worked: false, hoursWorked: 0 },
          { type: 'special', worked: true, hoursWorked: 4 },
        ],
        allowances: 1000,
        bonuses: 500,
        settings: DEFAULT_PAYROLL_SETTINGS,
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
        yearToDateBasic: 100000,
      },
      undefined,
    );

    expect(result.basicPay).toBeCloseTo(20000);
    expect(result.overtimePay).toBeGreaterThan(0);
    expect(result.holidayPay).toBeGreaterThan(0);
    expect(result.deductions.sss).toBe(1500);
    expect(result.deductions.withholdingTax).toBeGreaterThanOrEqual(0);
    expect(result.netPay).toBeGreaterThan(0);
  });

  describe('overtime multiplier matrix', () => {
    it('applies the configured multiplier per day type', () => {
      const dailyRate = 2000; // hourly = 250
      const breakdown = {
        regularHours: 2,
        restDayHours: 1,
        regularHolidayHours: 3,
        specialHolidayHours: 1,
        restDayHolidayHours: 1,
      };
      const expected =
        250 * (2 * 1.25 + 1 * 1.3 + 3 * 2.0 + 1 * 1.5 + 1 * 2.6);
      expect(
        service.computeOvertimePayBreakdown(dailyRate, breakdown, DEFAULT_PAYROLL_SETTINGS),
      ).toBeCloseTo(expected);
    });

    it('reflects a custom multiplier override', () => {
      const settings = { ...DEFAULT_PAYROLL_SETTINGS, otRegularHoliday: 3.0 };
      const dailyRate = 2000;
      const breakdown = {
        regularHours: 0,
        restDayHours: 0,
        regularHolidayHours: 2,
        specialHolidayHours: 0,
        restDayHolidayHours: 0,
      };
      expect(service.computeOvertimePayBreakdown(dailyRate, breakdown, settings)).toBeCloseTo(
        250 * 2 * 3.0,
      );
    });
  });

  describe('computeNightDiffHours', () => {
    it('counts a full night shift inside the window', () => {
      const in_ = new Date('2026-06-10T22:00:00');
      const out = new Date('2026-06-11T06:00:00');
      expect(service.computeNightDiffHours(in_, out, '22:00', '06:00')).toBeCloseTo(8);
    });

    it('returns zero for a daytime shift', () => {
      const in_ = new Date('2026-06-10T09:00:00');
      const out = new Date('2026-06-10T18:00:00');
      expect(service.computeNightDiffHours(in_, out, '22:00', '06:00')).toBeCloseTo(0);
    });

    it('counts a partial overlap', () => {
      const in_ = new Date('2026-06-10T21:00:00');
      const out = new Date('2026-06-10T23:00:00');
      expect(service.computeNightDiffHours(in_, out, '22:00', '06:00')).toBeCloseTo(1);
    });

    it('supports a custom window', () => {
      const in_ = new Date('2026-06-10T20:00:00');
      const out = new Date('2026-06-10T23:00:00');
      expect(service.computeNightDiffHours(in_, out, '20:00', '04:00')).toBeCloseTo(3);
    });
  });

  describe('getSettings', () => {
    it('returns defaults when the tenant has no settings row', async () => {
      const prisma: any = {
        withTenant: jest.fn((_tenantId: string, fn: (tx: any) => any) => fn(txMock)),
      };
      const svc = new PayrollComputationService(prisma);
      const settings = await svc.getSettings('tenant-x');
      expect(settings).toEqual(DEFAULT_PAYROLL_SETTINGS);
    });
  });
});
