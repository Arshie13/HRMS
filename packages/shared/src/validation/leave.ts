import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().max(500).optional(),
});

export const approveLeaveSchema = z.object({
  notes: z.string().optional(),
});

export const rejectLeaveSchema = z.object({
  reason: z.string().min(1),
});
