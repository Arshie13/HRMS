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

    IF t = 'User' THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I
         USING ("tenantId" = app.current_tenant_id()::text OR email = current_setting(''app.auth_user_email'', true))
         WITH CHECK ("tenantId" = app.current_tenant_id()::text);', t);
    ELSIF t = 'Session' THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I
         USING ("tenantId" = app.current_tenant_id()::text OR token = current_setting(''app.auth_session_token'', true))
         WITH CHECK ("tenantId" = app.current_tenant_id()::text);', t);
    ELSIF t = 'PasswordResetToken' THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I
         USING ("tenantId" = app.current_tenant_id()::text OR "tokenHash" = current_setting(''app.auth_password_reset_token'', true))
         WITH CHECK ("tenantId" = app.current_tenant_id()::text);', t);
    ELSIF t = 'LoginActivity' THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I
         USING (("tenantId" = app.current_tenant_id()::text) OR ("tenantId" IS NULL AND app.current_tenant_id() IS NULL))
         WITH CHECK (("tenantId" = app.current_tenant_id()::text) OR ("tenantId" IS NULL AND app.current_tenant_id() IS NULL));', t);
    ELSE
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I
         USING ("tenantId" = app.current_tenant_id()::text)
         WITH CHECK ("tenantId" = app.current_tenant_id()::text);', t);
    END IF;
  END LOOP;
END $$;

-- Tenant table itself: no tenant_id column, its id IS the tenant
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Tenant"
  USING (id = app.current_tenant_id()::text OR slug = current_setting('app.auth_tenant_slug', true))
  WITH CHECK (id = app.current_tenant_id()::text);
