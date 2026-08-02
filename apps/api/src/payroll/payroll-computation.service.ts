import { Injectable } from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ComputationInput {
  monthlySalary: number;
  dailyRate: number;
  daysWorked: number;
  overtimeHours: number;
  overtimeMultiplier: number;
  nightDiffHours: number;
  holidayType: 'none' | 'regular_not_worked' | 'regular_worked' | 'special_worked';
  holidayHoursWorked: number;
  allowances: number;
  bonuses: number;
  taxableIncome?: number;
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

  computeNightDiffPay(dailyRate: number, nightDiffHours: number): number {
    const hourlyRate = dailyRate / 8;
    return hourlyRate * nightDiffHours * 0.1;
  }

  computeHolidayPay(
    dailyRate: number,
    holidayType: ComputationInput['holidayType'],
    hoursWorked: number,
  ): number {
    const hourlyRate = dailyRate / 8;
    switch (holidayType) {
      case 'regular_not_worked':
        return dailyRate;
      case 'regular_worked':
        return hourlyRate * hoursWorked * 2.0;
      case 'special_worked':
        return hourlyRate * hoursWorked * 1.3;
      case 'none':
      default:
        return 0;
    }
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

  async compute(
    input: ComputationInput & { tenantId: string; employeeId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<ComputationResult> {
    const dailyRate = input.monthlySalary > 0
      ? this.computeDailyRate(input.monthlySalary)
      : input.dailyRate;

    const basicPay = this.computeBasicPay(dailyRate, input.daysWorked);
    const overtimePay = this.computeOvertimePay(dailyRate, input.overtimeHours, input.overtimeMultiplier);
    const nightDiffPay = this.computeNightDiffPay(dailyRate, input.nightDiffHours);
    const holidayPay = this.computeHolidayPay(dailyRate, input.holidayType, input.holidayHoursWorked);
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
    const ytdBasic = basicPay;
    const thirteenthMonthPay = ytdBasic / 12;
    const taxableIncome = grossPay - sss - philhealth - pagibig - Math.min(thirteenthMonthPay, thirteenthMonthExemption);

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
