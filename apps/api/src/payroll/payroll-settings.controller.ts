import { Controller, Get, Put, Body } from '@nestjs/common';
import { PayrollComputationService } from './payroll-computation.service';
import { UpdatePayrollSettingsDto } from './dto/payroll-settings.dto';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';

@Controller('payroll/settings')
export class PayrollSettingsController {
  constructor(private computation: PayrollComputationService) {}

  @Get()
  @RequirePermission('payroll', 'read')
  get(@CurrentUser() user: RequestUser) {
    return this.computation.getSettings(user.tenantId);
  }

  @Put()
  @RequirePermission('payroll', 'update')
  update(@CurrentUser() user: RequestUser, @Body() dto: UpdatePayrollSettingsDto) {
    return this.computation.upsertSettings(user.tenantId, dto);
  }
}
