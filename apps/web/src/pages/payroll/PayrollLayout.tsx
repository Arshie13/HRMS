import { Card, Tabs } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { key: '/payroll', label: 'Payroll Periods' },
  { key: '/payroll/contributions', label: 'Contributions' },
  { key: '/payroll/tax-brackets', label: 'Tax Brackets' },
  { key: '/payroll/loans', label: 'Loans' },
];

export function PayrollLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = tabs.find((t) => location.pathname.startsWith(t.key))?.key || '/payroll';

  return (
    <Card title="Payroll">
      <Tabs activeKey={activeKey} onChange={(key) => navigate(key)} items={tabs} />
      <Outlet />
    </Card>
  );
}
