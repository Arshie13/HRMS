import { Layout, Typography } from 'antd';
import { Outlet } from 'react-router-dom';

const { Content } = Layout;

export function AuthLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Typography.Title level={2} style={{ marginBottom: 32 }}>HRM SaaS</Typography.Title>
        <div style={{ width: 380, maxWidth: '100%' }}>
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
