import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PayrollComputationService,
  PayrollSettings,
  OvertimeBreakdown,
} from './payroll-computation.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { CreateAdjustmentDto } from './dto/adjustment.dto';
import { PayslipGeneratorService } from './payslip-generator.service';

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

const EMPTY_OVERTIME: OvertimeBreakdown = {
  regularHours: 0,
  restDayHours: 0,
  regularHolidayHours: 0,
  specialHolidayHours: 0,
  restDayHolidayHours: 0,
};

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private computation: PayrollComputationService,
    private payslipGenerator: PayslipGeneratorService,
  ) {}

  async createPeriod(tenantId: string, dto: CreatePayrollPeriodDto) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.payrollPeriod.create({
        data: {
          tenantId,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          payDate: new Date(dto.payDate),
          scheduleType: dto.scheduleType,
          status: 'draft',
        },
      }),
    );
  }

  async listPeriods(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.payrollPeriod.findMany({
        where: { tenantId },
        orderBy: { startDate: 'desc' },
      }),
    );
  }

  async getPeriod(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const period = await tx.payrollPeriod.findFirst({
        where: { id, tenantId },
        include: { entries: { include: { deductions: true, adjustments: true } } },
      });
      if (!period) throw new NotFoundException('Payroll period not found');
      return period;
    });
  }

  async computePeriod(tenantId: string, periodId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const period = await tx.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });
      if (!period) throw new NotFoundException('Payroll period not found');
      if (period.status !== 'draft') throw new BadRequestException('Period must be in draft status to compute');

      const settings = await this.computation.getSettings(tenantId, tx);

      const employees = await tx.employee.findMany({
        where: { tenantId, status: 'active' },
      });

      for (const employee of employees) {
        const monthlySalary = employee.monthlySalary ?? 0;
        const dailyRate = employee.dailyRate ?? this.computation.computeDailyRate(monthlySalary);

        const { daysWorked, holidayEvents, overtimeBreakdown, nightDiffHours, yearToDateBasic } =
          await this.collectPayrollMetrics(tx, tenantId, employee.id, period, settings);

        const result = await this.computation.compute(
          {
            monthlySalary,
            dailyRate,
            daysWorked,
            overtimeBreakdown,
            nightDiffHours,
            holidayEvents,
            allowances: 0,
            bonuses: 0,
            settings,
            tenantId,
            employeeId: employee.id,
            yearToDateBasic,
            scheduleType: period.scheduleType as 'semi-monthly' | 'monthly',
            periodStartDate: period.startDate,
            periodEndDate: period.endDate,
            contractStart: employee.contractStart,
            contractEnd: employee.contractEnd,
          },
          tx,
        );

        const entry = await tx.payrollEntry.create({
          data: {
            payrollPeriodId: periodId,
            employeeId: employee.id,
            tenantId,
            dailyRate: result.dailyRate,
            daysWorked,
            basicPay: result.basicPay,
            overtimePay: result.overtimePay,
            nightDiffPay: result.nightDiffPay,
            holidayPay: result.holidayPay,
            grossPay: result.grossPay,
            sssDeduction: result.deductions.sss,
            philhealthDeduction: result.deductions.philhealth,
            pagibigDeduction: result.deductions.pagibig,
            withholdingTax: result.deductions.withholdingTax,
            totalDeductions: result.deductions.total,
            netPay: result.netPay,
          },
        });

        const deductionData = [
          { type: 'SSS', label: 'SSS', amount: result.deductions.sss },
          { type: 'PhilHealth', label: 'PhilHealth', amount: result.deductions.philhealth },
          { type: 'PagIBIG', label: 'Pag-IBIG', amount: result.deductions.pagibig },
          { type: 'withholding_tax', label: 'Withholding Tax', amount: result.deductions.withholdingTax },
        ];

        if (result.deductions.loanDeductions > 0) {
          deductionData.push({
            type: 'loan',
            label: 'Loan Repayment',
            amount: result.deductions.loanDeductions,
          });
        }

        await tx.payrollDeduction.createMany({
          data: deductionData.map((deduction) => ({
            payrollEntryId: entry.id,
            tenantId,
            type: deduction.type,
            label: deduction.label,
            amount: deduction.amount,
          })),
        });
      }

      return tx.payrollPeriod.update({
        where: { id: periodId },
        data: { status: 'computed' },
        include: { entries: true },
      });
    });
  }

  private async collectPayrollMetrics(
    tx: Prisma.TransactionClient,
    tenantId: string,
    employeeId: string,
    period: { startDate: Date; endDate: Date },
    settings: PayrollSettings,
  ) {
    const attendanceRecords = await tx.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        date: { gte: period.startDate, lte: period.endDate },
      },
    });

    const holidays = await tx.holiday.findMany({
      where: {
        tenantId,
        date: { gte: period.startDate, lte: period.endDate },
      },
    });

    const holidayByDate = new Map<string, { type: 'regular' | 'special' }>();
    for (const holiday of holidays) {
      holidayByDate.set(dateKey(holiday.date), {
        type: holiday.type as 'regular' | 'special',
      });
    }

    const holidayEvents = holidays.map((holiday): { type: 'regular' | 'special'; worked: boolean; hoursWorked: number } => {
      const record = attendanceRecords.find(
        (attendance) => dateKey(attendance.date) === dateKey(holiday.date),
      );
      const worked = !!record && !!record.clockIn && !!record.clockOut;
      const hoursWorked = record?.totalHours ?? 0;
      return {
        type: holiday.type as 'regular' | 'special',
        worked,
        hoursWorked,
      };
    });

    const workedHolidayCount = holidayEvents.filter((event) => event.worked).length;
    const presentDays = attendanceRecords.filter((record) => record.status === 'present').length;
    const daysWorked = presentDays + workedHolidayCount;

    let nightDiffHours = 0;
    const overtimeBreakdown: OvertimeBreakdown = { ...EMPTY_OVERTIME };

    for (const record of attendanceRecords) {
      if (record.clockIn && record.clockOut) {
        nightDiffHours += this.computation.computeNightDiffHours(
          record.clockIn,
          record.clockOut,
          settings.nightDiffStart,
          settings.nightDiffEnd,
        );
      }
      const otHours = (record.overtimeMinutes ?? 0) / 60;
      if (otHours <= 0) continue;
      const isRestDay = record.status === 'rest_day';
      const holiday = holidayByDate.get(dateKey(record.date));
      if (holiday && isRestDay) {
        overtimeBreakdown.restDayHolidayHours += otHours;
      } else if (holiday?.type === 'regular') {
        overtimeBreakdown.regularHolidayHours += otHours;
      } else if (holiday?.type === 'special') {
        overtimeBreakdown.specialHolidayHours += otHours;
      } else if (isRestDay) {
        overtimeBreakdown.restDayHours += otHours;
      } else {
        overtimeBreakdown.regularHours += otHours;
      }
    }

    const yearStart = new Date(period.startDate.getFullYear(), 0, 1);
    const aggregate = await tx.payrollEntry.aggregate({
      _sum: { basicPay: true },
      where: {
        tenantId,
        employeeId,
        payrollPeriod: {
          startDate: { gte: yearStart, lte: period.startDate },
        },
      },
    });

    return {
      daysWorked,
      holidayEvents,
      overtimeBreakdown,
      nightDiffHours,
      yearToDateBasic: aggregate._sum.basicPay ?? 0,
    };
  }

  async approvePeriod(tenantId: string, periodId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const period = await tx.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });
      if (!period) throw new NotFoundException('Payroll period not found');
      if (period.status !== 'computed') throw new BadRequestException('Period must be computed before approval');

      return tx.payrollPeriod.update({
        where: { id: periodId },
        data: { status: 'approved' },
      });
    });
  }

  async releasePeriod(tenantId: string, periodId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const period = await tx.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
        include: { entries: true },
      });
      if (!period) throw new NotFoundException('Payroll period not found');
      if (period.status !== 'approved') throw new BadRequestException('Period must be approved before release');

      const updated = await tx.payrollPeriod.update({
        where: { id: periodId },
        data: { status: 'released' },
      });

      for (const entry of period.entries) {
        await this.payslipGenerator.generate(tenantId, entry.id, entry.employeeId, tx);
      }

      return updated;
    });
  }

  async getEntries(tenantId: string, periodId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const period = await tx.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });
      if (!period) throw new NotFoundException('Payroll period not found');

      return tx.payrollEntry.findMany({
        where: { payrollPeriodId: periodId, tenantId },
        include: { deductions: true, adjustments: true, employee: true },
      });
    });
  }

  async getEmployeeEntry(tenantId: string, periodId: string, employeeId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const entry = await tx.payrollEntry.findFirst({
        where: { payrollPeriodId: periodId, employeeId, tenantId },
        include: { deductions: true, adjustments: true },
      });
      if (!entry) throw new NotFoundException('Payroll entry not found');
      return entry;
    });
  }

  async addAdjustment(
    tenantId: string,
    periodId: string,
    employeeId: string,
    dto: CreateAdjustmentDto,
    userId?: string,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const entry = await tx.payrollEntry.findFirst({
        where: { payrollPeriodId: periodId, employeeId, tenantId },
      });
      if (!entry) throw new NotFoundException('Payroll entry not found');

      const adjustment = await tx.payrollAdjustment.create({
        data: {
          payrollEntryId: entry.id,
          tenantId,
          amount: dto.amount,
          reason: dto.reason,
          createdById: userId,
        },
      });

      const netPay = entry.netPay + dto.amount;
      await tx.payrollEntry.update({
        where: { id: entry.id },
        data: { netPay },
      });

      return adjustment;
    });
  }

  async revertToDraft(tenantId: string, periodId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const period = await tx.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });
      if (!period) throw new NotFoundException('Payroll period not found');
      if (period.status !== 'computed') throw new BadRequestException('Only computed periods can be reverted to draft');

      await tx.payrollEntry.deleteMany({
        where: { payrollPeriodId: periodId },
      });

      return tx.payrollPeriod.update({
        where: { id: periodId },
        data: { status: 'draft' },
      });
    });
  }

  async exportCsv(tenantId: string, periodId: string): Promise<string> {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const period = await tx.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });
      if (!period) throw new NotFoundException('Payroll period not found');

      const entries = await tx.payrollEntry.findMany({
        where: { payrollPeriodId: periodId, tenantId },
        include: { employee: true },
      });

      const header = 'Employee Name,Bank Account,Amount,Notes';
      const rows = entries.map((e) => {
        const name = `${e.employee.firstName} ${e.employee.lastName}`;
        return `${name},,${e.netPay.toFixed(2)},Payroll ${period.startDate.toISOString().split('T')[0]} - ${period.endDate.toISOString().split('T')[0]}`;
      });

      return [header, ...rows].join('\n');
    });
  }
}
