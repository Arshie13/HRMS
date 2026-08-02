export const PLAN_LIMITS = {
  starter: { employees: 10 },
  professional: { employees: 50 },
  enterprise: { employees: Infinity },
} as const;

export const FEATURE_TIER_MAP: Record<string, string> = {
  payroll: 'starter',
  attendance: 'starter',
  leaves: 'starter',
  recruitment: 'professional',
  api_access: 'enterprise',
} as const;
