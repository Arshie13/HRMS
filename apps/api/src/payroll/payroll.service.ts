import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollComputationService } from './payroll-computation.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { CreateAdjustmentDto } from './dto/adjustment.dto';
import { PayslipGeneratorService } from './payslip-generator.service';

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

      const employees = await tx.employee.findMany({
        where: { tenantId, status: 'active' },
      });

      for (const employee of employees) {
        const monthlySalary = employee.monthlySalary ?? 0;
        const dailyRate = employee.dailyRate ?? this.computation.computeDailyRate(monthlySalary);
        const calendarDays = Math.ceil(
          (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

        const result = await this.computation.compute(
          {
            monthlySalary,
            dailyRate,
            daysWorked: calendarDays,
            overtimeHours: 0,
            overtimeMultiplier: 1.25,
            nightDiffHours: 0,
            holidayType: 'none',
            holidayHoursWorked: 0,
            allowances: 0,
            bonuses: 0,
            tenantId,
            employeeId: employee.id,
          },
          tx,
        );

        await tx.payrollEntry.create({
          data: {
            payrollPeriodId: periodId,
            employeeId: employee.id,
            tenantId,
            dailyRate: result.dailyRate,
            daysWorked: calendarDays,
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
      }

      return tx.payrollPeriod.update({
        where: { id: periodId },
        data: { status: 'computed' },
        include: { entries: true },
      });
    });
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
