import { Form, Input, Button, Card, Alert, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth';

interface RegisterForm {
  companyName: string;
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: RegisterForm) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.register(values.companyName, values.email, values.password, values.name);
      setAuth(data);
      message.success('Account created!');
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Create your company account" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="companyName" label="Company name" rules={[{ required: true }]}>
          <Input placeholder="Acme Corp" />
        </Form.Item>
        <Form.Item name="name" label="Your name">
          <Input placeholder="John Doe" />
        </Form.Item>
        <Form.Item name="email" label="Work email" rules={[{ required: true, type: 'email' }]}>
          <Input placeholder="you@company.com" autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
          <Input.Password placeholder="At least 8 characters" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm password"
          dependencies={['password']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Repeat password" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Create account
        </Button>
      </Form>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link to="/auth/login">Already have an account? Sign in</Link>
      </div>
    </Card>
  );
}
