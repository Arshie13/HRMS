import { Card, Form, Input, Button } from 'antd';

export function SettingsPage() {
  return (
    <Card title="Company Settings" style={{ marginTop: 16 }}>
      <Form layout="vertical" style={{ maxWidth: 500 }}>
        <Form.Item label="Company Name" name="companyName">
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary">Save</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
