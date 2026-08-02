import { Form, Input, Button, Card, Alert, message } from 'antd';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../api/auth';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ email }: { email: string }) => {
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email);
      setSent(true);
      setResetToken(data.resetToken);
      message.success('Reset link generated');
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Reset password" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      {sent ? (
        <Alert
          type="success"
          showIcon
          message="If the account exists, a reset link has been sent."
          description={
            resetToken
              ? `Dev mode — use this token on the reset page: ${resetToken}`
              : undefined
          }
        />
      ) : (
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="you@company.com" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Send reset link
          </Button>
        </Form>
      )}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link to="/auth/login">Back to sign in</Link>
      </div>
    </Card>
  );
}
