import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConfigProvider } from 'antd';
import { AppLayout } from './layouts/AppLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/Dashboard';
import { AdminOverview } from './pages/admin/AdminOverview';
import { RolesPage } from './pages/admin/Roles';
import { UsersPage } from './pages/admin/Users';
import { SettingsPage } from './pages/admin/Settings';
import { PayrollLayout } from './pages/payroll/PayrollLayout';
import { PayrollPeriodList } from './pages/payroll/PayrollPeriodList';
import { PayrollPeriodDetail } from './pages/payroll/PayrollPeriodDetail';
import { ContributionTables } from './pages/payroll/ContributionTables';
import { TaxBrackets } from './pages/payroll/TaxBrackets';
import { Loans } from './pages/payroll/Loans';
import { EmployeesLayout } from './pages/employees/EmployeesLayout';
import { EmployeeList } from './pages/employees/EmployeeList';
import { EmployeeForm } from './pages/employees/EmployeeForm';
import { EmployeeDetail } from './pages/employees/EmployeeDetail';
import { Departments } from './pages/employees/Departments';
import { Teams } from './pages/employees/Teams';
import { LoginPage } from './pages/auth/Login';
import { RegisterPage } from './pages/auth/Register';
import { ForgotPasswordPage } from './pages/auth/ForgotPassword';
import { ResetPasswordPage } from './pages/auth/ResetPassword';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { CorrectionsPage } from './pages/attendance/Corrections';
import { ShiftsPage } from './pages/attendance/Shifts';
import { LeaveRequestsPage } from './pages/leaves/LeaveRequests';
import { LeaveTypesPage } from './pages/leaves/LeaveTypes';
import { LeaveBalancesPage } from './pages/leaves/LeaveBalances';
import { HolidaysPage } from './pages/holidays/Holidays';
import { NotificationsPage } from './pages/notifications/NotificationsPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677ff',
          },
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/employees" element={<EmployeesLayout />}>
                <Route index element={<EmployeeList />} />
                <Route path="new" element={<EmployeeForm />} />
                <Route path=":id" element={<EmployeeDetail />} />
                <Route path=":id/edit" element={<EmployeeForm />} />
              </Route>
              <Route path="/departments" element={<Departments />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/attendance/corrections" element={<CorrectionsPage />} />
              <Route path="/attendance/shifts" element={<ShiftsPage />} />
              <Route path="/leaves" element={<LeaveRequestsPage />} />
              <Route path="/leaves/types" element={<LeaveTypesPage />} />
              <Route path="/leaves/balances" element={<LeaveBalancesPage />} />
              <Route path="/holidays" element={<HolidaysPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="/payroll" element={<PayrollLayout />}>
                <Route index element={<PayrollPeriodList />} />
                <Route path="periods/:id" element={<PayrollPeriodDetail />} />
                <Route path="contributions" element={<ContributionTables />} />
                <Route path="tax-brackets" element={<TaxBrackets />} />
                <Route path="loans" element={<Loans />} />
              </Route>
              <Route path="*" element={<DashboardPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
