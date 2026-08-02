import { Form, Input, Button, Card, Alert, message } from 'antd';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginForm) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login(values.email, values.password);
      setAuth(data);
      message.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Sign in" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input placeholder="you@company.com" autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true }]}>
          <Input.Password placeholder="Password" autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Sign in
        </Button>
      </Form>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Link to="/auth/forgot-password">Forgot password?</Link>
        <Link to="/auth/register">Create account</Link>
      </div>
    </Card>
  );
}
