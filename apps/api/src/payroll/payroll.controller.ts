import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { CreateAdjustmentDto } from './dto/adjustment.dto';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';

@Controller('payroll')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Post('periods')
  @RequirePermission('payroll', 'create')
  createPeriod(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePayrollPeriodDto,
  ) {
    return this.payrollService.createPeriod(user.tenantId, dto);
  }

  @Get('periods')
  @RequirePermission('payroll', 'read')
  listPeriods(@CurrentUser() user: RequestUser) {
    return this.payrollService.listPeriods(user.tenantId);
  }

  @Get('periods/:id')
  @RequirePermission('payroll', 'read')
  getPeriod(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.getPeriod(user.tenantId, id);
  }

  @Post('periods/:id/compute')
  @RequirePermission('payroll', 'approve')
  computePeriod(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.computePeriod(user.tenantId, id);
  }

  @Post('periods/:id/approve')
  @RequirePermission('payroll', 'approve')
  approvePeriod(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.approvePeriod(user.tenantId, id);
  }

  @Post('periods/:id/release')
  @RequirePermission('payroll', 'approve')
  releasePeriod(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.releasePeriod(user.tenantId, id);
  }

  @Post('periods/:id/revert')
  @RequirePermission('payroll', 'update')
  revertPeriod(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.revertToDraft(user.tenantId, id);
  }

  @Get('periods/:id/entries')
  @RequirePermission('payroll', 'read')
  getEntries(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.getEntries(user.tenantId, id);
  }

  @Get('periods/:id/entries/:employeeId')
  @RequirePermission('payroll', 'read')
  getEmployeeEntry(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.payrollService.getEmployeeEntry(user.tenantId, id, employeeId);
  }

  @Post('periods/:id/entries/:employeeId/adjustments')
  @RequirePermission('payroll', 'update')
  addAdjustment(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.payrollService.addAdjustment(user.tenantId, id, employeeId, dto, user.userId);
  }

  @Get('periods/:id/export/csv')
  @RequirePermission('payroll', 'export')
  async exportCsv(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const csv = await this.payrollService.exportCsv(user.tenantId, id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-${id}.csv`);
    res.send(csv);
  }
}
