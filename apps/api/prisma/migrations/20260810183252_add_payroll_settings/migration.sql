-- CreateTable
CREATE TABLE "PayrollSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nightDiffStart" TEXT NOT NULL DEFAULT '22:00',
    "nightDiffEnd" TEXT NOT NULL DEFAULT '06:00',
    "nightDiffRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "otRegularDay" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    "otRestDay" DOUBLE PRECISION NOT NULL DEFAULT 1.30,
    "otRegularHoliday" DOUBLE PRECISION NOT NULL DEFAULT 2.00,
    "otSpecialHoliday" DOUBLE PRECISION NOT NULL DEFAULT 1.50,
    "otRestDayHoliday" DOUBLE PRECISION NOT NULL DEFAULT 2.60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollSetting_tenantId_key" ON "PayrollSetting"("tenantId");

-- AddForeignKey
ALTER TABLE "PayrollSetting" ADD CONSTRAINT "PayrollSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: tenant-scoped table (base RLS migration lists tables explicitly, so a new table needs its own policy)
ALTER TABLE "PayrollSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollSetting" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PayrollSetting"
  USING ("tenantId" = app.current_tenant_id()::text)
  WITH CHECK ("tenantId" = app.current_tenant_id()::text);
