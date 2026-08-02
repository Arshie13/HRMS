import { z } from 'zod';

export const clockInSchema = z.object({
  employeeId: z.string().uuid(),
  timestamp: z.string().datetime().optional(),
});

export const clockOutSchema = z.object({
  attendanceId: z.string().uuid(),
  timestamp: z.string().datetime().optional(),
});
