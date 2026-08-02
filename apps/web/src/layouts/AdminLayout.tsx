import { Card, Tabs } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const adminTabs = [
  { key: '/admin', label: 'Overview' },
  { key: '/admin/roles', label: 'Roles' },
  { key: '/admin/users', label: 'Users' },
  { key: '/admin/settings', label: 'Settings' },
  { key: '/admin/billing', label: 'Billing' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Card title="Administration">
      <Tabs
        activeKey={location.pathname}
        onChange={(key) => navigate(key)}
        items={adminTabs}
      />
      <Outlet />
    </Card>
  );
}
