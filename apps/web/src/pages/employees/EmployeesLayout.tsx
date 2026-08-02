import { Card, Tabs } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { key: '/employees', label: 'Employees' },
  { key: '/departments', label: 'Departments' },
  { key: '/teams', label: 'Teams' },
];

export function EmployeesLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = tabs.find((t) => location.pathname.startsWith(t.key))?.key || '/employees';

  return (
    <Card>
      <Tabs activeKey={activeKey} onChange={(key) => navigate(key)} items={tabs} />
      <Outlet />
    </Card>
  );
}
