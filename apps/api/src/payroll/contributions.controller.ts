import { Controller, Get, Post, Put, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';

@Controller()
export class ContributionsController {
  constructor(private prisma: PrismaService) {}

  @Get('contribution-tables')
  @RequirePermission('payroll', 'read')
  listTables(@CurrentUser() user: RequestUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.governmentContributionTable.findMany({
        where: { tenantId: user.tenantId },
        orderBy: [{ type: 'asc' }, { minCompensation: 'asc' }],
      }),
    );
  }

  @Post('contribution-tables')
  @RequirePermission('payroll', 'update')
  createTable(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.governmentContributionTable.create({
        data: { ...body, tenantId: user.tenantId, effectiveDate: new Date(body.effectiveDate) },
      }),
    );
  }

  @Put('contribution-tables/:id')
  @RequirePermission('payroll', 'update')
  updateTable(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.governmentContributionTable.update({
        where: { id, tenantId: user.tenantId },
        data: body.effectiveDate ? { ...body, effectiveDate: new Date(body.effectiveDate) } : body,
      }),
    );
  }

  @Get('tax-brackets')
  @RequirePermission('payroll', 'read')
  listBrackets(@CurrentUser() user: RequestUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.bIRTaxBracket.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { minAmount: 'asc' },
      }),
    );
  }

  @Post('tax-brackets')
  @RequirePermission('payroll', 'update')
  createBracket(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.bIRTaxBracket.create({
        data: { ...body, tenantId: user.tenantId, effectiveDate: new Date(body.effectiveDate) },
      }),
    );
  }

  @Put('tax-brackets/:id')
  @RequirePermission('payroll', 'update')
  updateBracket(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.bIRTaxBracket.update({
        where: { id, tenantId: user.tenantId },
        data: body.effectiveDate ? { ...body, effectiveDate: new Date(body.effectiveDate) } : body,
      }),
    );
  }

  @Get('loans')
  @RequirePermission('payroll', 'read')
  listLoans(@CurrentUser() user: RequestUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.loan.findMany({
        where: { tenantId: user.tenantId },
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  @Post('loans')
  @RequirePermission('payroll', 'create')
  createLoan(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.loan.create({
        data: {
          ...body,
          tenantId: user.tenantId,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
        },
      }),
    );
  }

  @Put('loans/:id')
  @RequirePermission('payroll', 'update')
  updateLoan(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.loan.update({
        where: { id, tenantId: user.tenantId },
        data: {
          ...body,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
        },
      }),
    );
  }
}
