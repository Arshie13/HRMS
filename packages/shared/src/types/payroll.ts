export interface PayrollEntry {
  id: string;
  employeeId: string;
  payrollPeriodId: string;
  basicPay: number;
  overtimePay: number;
  nightDiffPay: number;
  holidayPay: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}
