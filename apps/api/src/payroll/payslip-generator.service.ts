import { Injectable } from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class PayslipGeneratorService {
  constructor(private prisma: PrismaService) {}

  async generate(
    tenantId: string,
    payrollEntryId: string,
    employeeId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Buffer> {
    const db = tx ?? this.prisma;
    const entry = await db.payrollEntry.findFirst({
      where: { id: payrollEntryId, tenantId },
      include: {
        payrollPeriod: true,
        deductions: true,
        adjustments: true,
        employee: true,
      },
    });
    if (!entry) throw new Error('Payroll entry not found');

    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const emp = entry.employee;
    const period = entry.payrollPeriod;

    doc.fontSize(18).text('PAYSLIP', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`${emp.firstName} ${emp.lastName}`, { align: 'center' });
    doc.text(`Employee ID: ${emp.employeeId}`);
    doc.text(`Period: ${period.startDate.toISOString().split('T')[0]} - ${period.endDate.toISOString().split('T')[0]}`);
    doc.text(`Pay Date: ${period.payDate.toISOString().split('T')[0]}`);
    doc.moveDown();

    const leftX = 50;
    const rightX = 300;
    let y = doc.y;

    doc.fontSize(12).text('Earnings', leftX, y);
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Basic Pay:`, leftX);
    doc.text(`${entry.basicPay.toFixed(2)}`, rightX, undefined, { align: 'right' });
    doc.text(`Overtime Pay:`, leftX);
    doc.text(`${entry.overtimePay.toFixed(2)}`, rightX, undefined, { align: 'right' });
    doc.text(`Night Diff:`, leftX);
    doc.text(`${entry.nightDiffPay.toFixed(2)}`, rightX, undefined, { align: 'right' });
    doc.text(`Holiday Pay:`, leftX);
    doc.text(`${entry.holidayPay.toFixed(2)}`, rightX, undefined, { align: 'right' });

    doc.moveDown();
    doc.fontSize(11).text(`Gross Pay:`, leftX);
    doc.text(`${entry.grossPay.toFixed(2)}`, rightX, undefined, { align: 'right' });
    doc.moveDown();

    doc.fontSize(12).text('Deductions', leftX);
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`SSS:`, leftX);
    doc.text(`${entry.sssDeduction.toFixed(2)}`, rightX, undefined, { align: 'right' });
    doc.text(`PhilHealth:`, leftX);
    doc.text(`${entry.philhealthDeduction.toFixed(2)}`, rightX, undefined, { align: 'right' });
    doc.text(`Pag-IBIG:`, leftX);
    doc.text(`${entry.pagibigDeduction.toFixed(2)}`, rightX, undefined, { align: 'right' });
    doc.text(`Withholding Tax:`, leftX);
    doc.text(`${entry.withholdingTax.toFixed(2)}`, rightX, undefined, { align: 'right' });

    doc.moveDown();
    doc.fontSize(11).text(`Total Deductions:`, leftX);
    doc.text(`${entry.totalDeductions.toFixed(2)}`, rightX, undefined, { align: 'right' });
    doc.moveDown();

    doc.fontSize(14).text(`NET PAY: ${entry.netPay.toFixed(2)}`, { align: 'center' });

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);

        db.payslip.create({
          data: {
            payrollEntryId,
            tenantId,
            employeeId,
            pdfData: pdfBuffer,
          },
        }).catch(() => {});

        resolve(pdfBuffer);
      });
    });
  }
}
