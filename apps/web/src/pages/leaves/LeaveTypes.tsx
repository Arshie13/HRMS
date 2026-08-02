import { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Space, Switch, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi, LeaveType } from '../../api/leaves';
import { useCan } from '../../utils/permissions';

export function LeaveTypesPage() {
  const queryClient = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form] = Form.useForm();

  const { data: types = [], isLoading } = useQuery({ queryKey: ['leave-types'], queryFn: leaveApi.listTypes });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['leave-types'] });

  const save = useMutation({
    mutationFn: (data: Partial<LeaveType>) =>
      editing ? leaveApi.updateType(editing.id, data) : leaveApi.createType(data),
    onSuccess: () => {
      message.success('Saved');
      setOpen(false);
      invalidate();
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };
  const openEdit = (t: LeaveType) => {
    setEditing(t);
    form.setFieldsValue(t);
    setOpen(true);
  };

  const onSave = () => form.validateFields().then((v) => save.mutate(v));

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Code', dataIndex: 'code' },
    { title: 'Paid', dataIndex: 'isPaid', render: (v: boolean) => (v ? <Tag color="green">Paid</Tag> : <Tag>Unpaid</Tag>) },
    { title: 'Max days/year', dataIndex: 'maxDaysPerYear' },
    { title: 'Accrual/mo', dataIndex: 'accrualRate' },
    { title: 'Max consecutive', dataIndex: 'maxConsecutiveDays', render: (v: number | null) => v ?? '—' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, t: LeaveType) =>
        can('leaves', 'update') ? (
          <Button size="small" onClick={() => openEdit(t)}>
            Edit
          </Button>
        ) : null,
    },
  ];

  return (
    <Card
      title="Leave Types"
      extra={
        can('leaves', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Leave Type
          </Button>
        )
      }
    >
      <Table dataSource={types} columns={columns} rowKey="id" loading={isLoading} pagination={false} />

      <Modal title={editing ? `Edit ${editing.name}` : 'New Leave Type'} open={open} onOk={onSave} onCancel={() => setOpen(false)} confirmLoading={save.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="VL" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="maxDaysPerYear" label="Max days/year" rules={[{ required: true }]}>
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="accrualRate" label="Accrual / month">
              <InputNumber min={0} step={0.01} />
            </Form.Item>
            <Form.Item name="maxConsecutiveDays" label="Max consecutive">
              <InputNumber min={1} />
            </Form.Item>
          </Space>
          <Form.Item name="isPaid" label="Paid" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
