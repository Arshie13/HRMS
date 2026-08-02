import { useState } from 'react';
import { Layout, Menu, Button, theme, Dropdown, Avatar, Space, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { authApi } from '../api/auth';
import { useCan } from '../utils/permissions';
import { NotificationBell } from '../components/NotificationBell';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/employees', icon: <TeamOutlined />, label: 'Employees', perm: ['employees', 'read'] },
  {
    key: 'attendance-group',
    icon: <ClockCircleOutlined />,
    label: 'Attendance',
    perm: ['attendance', 'read'],
    children: [
      { key: '/attendance', label: 'My Attendance' },
      { key: '/attendance/corrections', label: 'Corrections' },
      { key: '/attendance/shifts', label: 'Shifts' },
    ],
  },
  {
    key: 'leaves-group',
    icon: <CalendarOutlined />,
    label: 'Leaves',
    perm: ['leaves', 'read'],
    children: [
      { key: '/leaves', label: 'Leave Requests' },
      { key: '/leaves/types', label: 'Leave Types' },
      { key: '/leaves/balances', label: 'Balances' },
    ],
  },
  { key: '/holidays', icon: <CalendarOutlined />, label: 'Holidays', perm: ['leaves', 'read'] },
  { key: '/payroll', icon: <DollarOutlined />, label: 'Payroll', perm: ['payroll', 'read'] },
  { key: '/admin', icon: <SettingOutlined />, label: 'Admin', perm: ['settings', 'read'] },
  { key: '/notifications', icon: <BellOutlined />, label: 'Notifications' },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const can = useCan();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const selectedKey = location.pathname;
  const visibleItems = menuItems.filter((item) => !item.perm || can(item.perm[0], item.perm[1]));

  const handleLogout = async () => {
    try {
      await authApi.logout(refreshToken ?? undefined);
    } catch {
      // ignore
    }
    logout();
    navigate('/auth/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{
          height: 32, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: collapsed ? 14 : 18, whiteSpace: 'nowrap',
        }}>
          {collapsed ? 'HR' : 'HRM SaaS'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={visibleItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Space>
            <NotificationBell />
            <Dropdown
              menu={{
                items: [
                  { key: 'name', label: <Typography.Text strong>{user?.name ?? user?.email}</Typography.Text>, disabled: true },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', onClick: handleLogout },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <Typography.Text>{user?.name ?? user?.email}</Typography.Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
