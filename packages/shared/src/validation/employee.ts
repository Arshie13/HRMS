import { z } from 'zod';

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  position: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();
