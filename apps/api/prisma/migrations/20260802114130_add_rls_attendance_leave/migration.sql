-- RLS for attendance + leave tables (added after the base RLS migration)

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Shift','EmployeeShift','Attendance','AttendanceCorrection',
    'LeaveBalance','LeaveRequest'
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
