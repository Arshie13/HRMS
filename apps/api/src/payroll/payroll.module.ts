import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { ContributionsController } from './contributions.controller';
import { PayrollService } from './payroll.service';
import { PayrollComputationService } from './payroll-computation.service';
import { PayslipGeneratorService } from './payslip-generator.service';

@Module({
  controllers: [PayrollController, ContributionsController],
  providers: [PayrollService, PayrollComputationService, PayslipGeneratorService],
  exports: [PayrollService],
})
export class PayrollModule {}
