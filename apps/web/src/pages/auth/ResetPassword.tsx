import { Form, Input, Button, Card, Alert, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../api/auth';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ token, newPassword }: { token: string; newPassword: string }) => {
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      message.success('Password updated. Please sign in.');
      navigate('/auth/login', { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Set new password" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="token" label="Reset token" rules={[{ required: true }]}>
          <Input placeholder="Paste the reset token from your email" />
        </Form.Item>
        <Form.Item name="newPassword" label="New password" rules={[{ required: true, min: 8 }]}>
          <Input.Password placeholder="At least 8 characters" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Update password
        </Button>
      </Form>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link to="/auth/login">Back to sign in</Link>
      </div>
    </Card>
  );
}
