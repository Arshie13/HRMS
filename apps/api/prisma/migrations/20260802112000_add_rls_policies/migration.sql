-- Row-Level Security: tenant isolation as defense-in-depth.
-- The app sets `app.tenant_id` (via PrismaService.withTenant -> set_config in a
-- transaction) before every query. Any query that fails to set the context
-- returns zero rows (fail-safe: no cross-tenant leak).

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

-- Tables carrying an explicit tenant_id column
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Session','Role','Employee','EmployeeDocument','EmployeeHistory',
    'EmployeeProfileUpdateRequest','Department','Team','Holiday','LeaveType',
    'Notification','GovernmentContributionTable','BIRTaxBracket','PayrollPeriod',
    'PayrollEntry','PayrollDeduction','PayrollAdjustment','Payslip','Loan',
    'PasswordResetToken','LoginActivity'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I
       USING ("tenantId" = app.current_tenant_id()::text)
       WITH CHECK ("tenantId" = app.current_tenant_id()::text);', t);
  END LOOP;
END $$;

-- Tenant table itself: no tenant_id column, its id IS the tenant
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Tenant"
  USING (id = app.current_tenant_id()::text)
  WITH CHECK (id = app.current_tenant_id()::text);
