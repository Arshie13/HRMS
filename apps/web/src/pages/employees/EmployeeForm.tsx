import { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';

export function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [depts, setDepts] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const isEdit = !!id;

  useEffect(() => {
    api.get('/departments').then(({ data }) => setDepts(data)).catch(() => {});
    api.get('/teams').then(({ data }) => setTeams(data)).catch(() => {});
    if (isEdit) {
      api.get(`/employees/${id}`).then(({ data }) => form.setFieldsValue(data));
    }
  }, [id, isEdit, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/employees/${id}`, values);
        message.success('Updated');
      } else {
        await api.post('/employees', values);
        message.success('Created');
      }
      navigate('/employees');
    } catch { message.error('Failed'); }
    setLoading(false);
  };

  return (
    <Card title={isEdit ? 'Edit Employee' : 'New Employee'} style={{ maxWidth: 700 }}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input />
        </Form.Item>
        <Form.Item name="position" label="Position">
          <Input />
        </Form.Item>
        <Form.Item name="departmentId" label="Department">
          <Select allowClear options={depts.map((d: any) => ({ value: d.id, label: d.name }))} />
        </Form.Item>
        <Form.Item name="teamId" label="Team">
          <Select allowClear options={teams.map((t: any) => ({ value: t.id, label: t.name }))} />
        </Form.Item>
        <Form.Item name="monthlySalary" label="Monthly Salary">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="dailyRate" label="Daily Rate">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select options={['active', 'probationary', 'suspended', 'on-leave', 'resigned', 'terminated']
            .map((s) => ({ value: s, label: s }))} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          {isEdit ? 'Update' : 'Create'}
        </Button>
      </Form>
    </Card>
  );
}
