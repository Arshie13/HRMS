import { Injectable } from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface HolidayEvent {
  type: 'regular' | 'special';
  worked: boolean;
  hoursWorked: number;
}

export interface OvertimeBreakdown {
  regularHours: number;
  restDayHours: number;
  regularHolidayHours: number;
  specialHolidayHours: number;
  restDayHolidayHours: number;
}

export interface PayrollSettings {
  nightDiffStart: string;
  nightDiffEnd: string;
  nightDiffRate: number;
  otRegularDay: number;
  otRestDay: number;
  otRegularHoliday: number;
  otSpecialHoliday: number;
  otRestDayHoliday: number;
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  nightDiffStart: '22:00',
  nightDiffEnd: '06:00',
  nightDiffRate: 0.1,
  otRegularDay: 1.25,
  otRestDay: 1.3,
  otRegularHoliday: 2.0,
  otSpecialHoliday: 1.5,
  otRestDayHoliday: 2.6,
};

export interface ComputationInput {
  monthlySalary: number;
  dailyRate: number;
  daysWorked: number;
  overtimeHours?: number;
  overtimeMultiplier?: number;
  overtimeBreakdown?: OvertimeBreakdown;
  nightDiffHours: number;
  holidayEvents: HolidayEvent[];
  allowances: number;
  bonuses: number;
  yearToDateBasic?: number;
  settings?: PayrollSettings;
}

export interface DeductionResult {
  sss: number;
  philhealth: number;
  pagibig: number;
  withholdingTax: number;
  loanDeductions: number;
  total: number;
}

export interface ComputationResult {
  dailyRate: number;
  basicPay: number;
  overtimePay: number;
  nightDiffPay: number;
  holidayPay: number;
  grossPay: number;
  deductions: DeductionResult;
  netPay: number;
}

@Injectable()
export class PayrollComputationService {
  constructor(private prisma: PrismaService) {}

  computeDailyRate(monthlySalary: number): number {
    return monthlySalary / 26;
  }

  computeBasicPay(dailyRate: number, daysWorked: number): number {
    return dailyRate * daysWorked;
  }

  computeOvertimePay(
    dailyRate: number,
    overtimeHours: number,
    multiplier: number,
  ): number {
    const hourlyRate = dailyRate / 8;
    return hourlyRate * overtimeHours * multiplier;
  }

  computeOvertimePayBreakdown(
    dailyRate: number,
    breakdown: OvertimeBreakdown,
    settings: PayrollSettings,
  ): number {
    const hourlyRate = dailyRate / 8;
    const weighted =
      breakdown.regularHours * settings.otRegularDay +
      breakdown.restDayHours * settings.otRestDay +
      breakdown.regularHolidayHours * settings.otRegularHoliday +
      breakdown.specialHolidayHours * settings.otSpecialHoliday +
      breakdown.restDayHolidayHours * settings.otRestDayHoliday;
    return hourlyRate * weighted;
  }

  computeNightDiffPay(dailyRate: number, nightDiffHours: number, rate = 0.1): number {
    const hourlyRate = dailyRate / 8;
    return hourlyRate * nightDiffHours * rate;
  }

  computeHolidayPay(dailyRate: number, holidayEvents: HolidayEvent[]): number {
    const hourlyRate = dailyRate / 8;
    return holidayEvents.reduce((sum, event) => {
      if (event.type === 'regular') {
        if (event.worked) {
          return sum + dailyRate + hourlyRate * event.hoursWorked * 2.0;
        }
        return sum + dailyRate;
      }
      if (event.worked) {
        return sum + hourlyRate * event.hoursWorked * 1.3;
      }
      return sum;
    }, 0);
  }

  computeGrossPay(params: {
    basicPay: number;
    overtimePay: number;
    nightDiffPay: number;
    holidayPay: number;
    allowances: number;
    bonuses: number;
  }): number {
    return (
      params.basicPay +
      params.overtimePay +
      params.nightDiffPay +
      params.holidayPay +
      params.allowances +
      params.bonuses
    );
  }

  async computeSSS(
    tenantId: string,
    monthlyCredit: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const db = tx ?? this.prisma;
    const bracket = await db.governmentContributionTable.findFirst({
      where: {
        tenantId,
        type: 'SSS',
        minCompensation: { lte: monthlyCredit },
        maxCompensation: { gte: monthlyCredit },
      },
      orderBy: { effectiveDate: 'desc' },
    });
    return bracket?.employeeShare ?? 0;
  }

  computePhilHealth(monthlyBasic: number): number {
    const premium = monthlyBasic * 0.05;
    const ceiling = 5000;
    const cappedPremium = Math.min(premium, ceiling);
    return cappedPremium / 2;
  }

  computePagIBIG(monthlyBasic: number): number {
    const share = monthlyBasic * 0.02;
    return Math.min(share, 100);
  }

  async computeWithholdingTax(
    tenantId: string,
    taxableIncome: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const db = tx ?? this.prisma;
    const bracket = await db.bIRTaxBracket.findFirst({
      where: {
        tenantId,
        minAmount: { lte: taxableIncome },
        OR: [{ maxAmount: null }, { maxAmount: { gte: taxableIncome } }],
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!bracket) return 0;

    return bracket.baseTax + (taxableIncome - bracket.minAmount) * (bracket.excessPercentage / 100);
  }

  async computeLoanDeductions(
    employeeId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const db = tx ?? this.prisma;
    const activeLoans = await db.loan.findMany({
      where: {
        employeeId,
        tenantId,
        status: 'active',
      },
    });

    const active = activeLoans.filter((l) => l.periodsPaid < l.totalPeriods);
    return active.reduce((sum, loan) => sum + loan.amortizationPerPeriod, 0);
  }

  // --- payroll settings ---

  async getSettings(
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PayrollSettings> {
    if (tx) return this.readSettings(tenantId, tx);
    return this.prisma.withTenant(tenantId, (t) => this.readSettings(tenantId, t));
  }

  async upsertSettings(
    tenantId: string,
    data: Partial<PayrollSettings>,
  ): Promise<PayrollSettings> {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.payrollSetting.upsert({
        where: { tenantId },
        create: { tenantId, ...data },
        update: data,
      }),
    );
  }

  private async readSettings(
    tenantId: string,
    db: Prisma.TransactionClient,
  ): Promise<PayrollSettings> {
    const row = await db.payrollSetting.findUnique({ where: { tenantId } });
    if (!row) return { ...DEFAULT_PAYROLL_SETTINGS };
    return {
      nightDiffStart: row.nightDiffStart,
      nightDiffEnd: row.nightDiffEnd,
      nightDiffRate: row.nightDiffRate,
      otRegularDay: row.otRegularDay,
      otRestDay: row.otRestDay,
      otRegularHoliday: row.otRegularHoliday,
      otSpecialHoliday: row.otSpecialHoliday,
      otRestDayHoliday: row.otRestDayHoliday,
    };
  }

  // --- night differential window helpers ---

  timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }

  /**
   * Overlap (in hours) between [clockIn, clockOut] and the configured night
   * differential window. The window is anchored to the clock-in date and may
   * cross midnight (e.g. 22:00 -> 06:00).
   */
  computeNightDiffHours(
    clockIn: Date,
    clockOut: Date,
    nightStart: string,
    nightEnd: string,
  ): number {
    if (clockOut.getTime() <= clockIn.getTime()) return 0;
    const dayStart = new Date(clockIn);
    dayStart.setHours(0, 0, 0, 0);
    const startMin = this.timeToMinutes(nightStart);
    const endMin = this.timeToMinutes(nightEnd);
    const windowStart = dayStart.getTime() + startMin * 60000;
    let windowEnd = dayStart.getTime() + endMin * 60000;
    if (endMin <= startMin) windowEnd += 24 * 60 * 60000;
    const overlapStart = Math.max(clockIn.getTime(), windowStart);
    const overlapEnd = Math.min(clockOut.getTime(), windowEnd);
    return Math.max(0, (overlapEnd - overlapStart) / 3600000);
  }

  async compute(
    input: ComputationInput & { tenantId: string; employeeId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<ComputationResult> {
    const dailyRate = input.monthlySalary > 0
      ? this.computeDailyRate(input.monthlySalary)
      : input.dailyRate;

    const settings = input.settings ?? (await this.getSettings(input.tenantId, tx));

    const breakdown: OvertimeBreakdown = input.overtimeBreakdown ?? {
      regularHours: input.overtimeHours ?? 0,
      restDayHours: 0,
      regularHolidayHours: 0,
      specialHolidayHours: 0,
      restDayHolidayHours: 0,
    };

    const basicPay = this.computeBasicPay(dailyRate, input.daysWorked);
    const overtimePay = this.computeOvertimePayBreakdown(dailyRate, breakdown, settings);
    const nightDiffPay = this.computeNightDiffPay(dailyRate, input.nightDiffHours, settings.nightDiffRate);
    const holidayPay = this.computeHolidayPay(dailyRate, input.holidayEvents);
    const grossPay = this.computeGrossPay({
      basicPay,
      overtimePay,
      nightDiffPay,
      holidayPay,
      allowances: input.allowances ?? 0,
      bonuses: input.bonuses ?? 0,
    });

    const sss = await this.computeSSS(input.tenantId, input.monthlySalary, tx);
    const philhealth = this.computePhilHealth(input.monthlySalary);
    const pagibig = this.computePagIBIG(input.monthlySalary);

    const thirteenthMonthExemption = 90000;
    const ytdBasic = input.yearToDateBasic ?? basicPay;
    const thirteenthMonthPay = this.computeThirteenthMonth(ytdBasic);
    const taxableIncome = Math.max(
      0,
      grossPay - sss - philhealth - pagibig - Math.min(thirteenthMonthPay, thirteenthMonthExemption),
    );

    const withholdingTax = await this.computeWithholdingTax(input.tenantId, taxableIncome, tx);
    const loanDeductions = await this.computeLoanDeductions(input.employeeId, input.tenantId, tx);

    const totalDeductions = sss + philhealth + pagibig + withholdingTax + loanDeductions;
    const netPay = grossPay - totalDeductions;

    return {
      dailyRate,
      basicPay,
      overtimePay,
      nightDiffPay,
      holidayPay,
      grossPay,
      deductions: {
        sss,
        philhealth,
        pagibig,
        withholdingTax,
        loanDeductions,
        total: totalDeductions,
      },
      netPay,
    };
  }

  computeThirteenthMonth(totalBasicSalaryEarnedYtd: number): number {
    return totalBasicSalaryEarnedYtd / 12;
  }
}
