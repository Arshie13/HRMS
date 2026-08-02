import { z } from 'zod';

export const createPayrollPeriodSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  payDate: z.string(),
  scheduleType: z.enum(['semi-monthly', 'monthly']),
});

export const adjustmentSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.number(),
  reason: z.string().min(1),
});
