import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { DepartmentsController } from './departments.controller';
import { TeamsController } from './teams.controller';

@Module({
  controllers: [EmployeesController, DepartmentsController, TeamsController],
})
export class EmployeesModule {}
