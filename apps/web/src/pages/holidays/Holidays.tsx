import { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, DatePicker, Switch, Space, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { leaveApi, Holiday } from '../../api/leaves';
import { useCan } from '../../utils/permissions';

export function HolidaysPage() {
  const queryClient = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form] = Form.useForm();

  const { data: holidays = [], isLoading } = useQuery({ queryKey: ['holidays'], queryFn: leaveApi.listHolidays });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['holidays'] });

  const save = useMutation({
    mutationFn: (data: Partial<Holiday>) =>
      editing ? leaveApi.updateHoliday(editing.id, data) : leaveApi.createHoliday(data),
    onSuccess: () => {
      message.success('Saved');
      setOpen(false);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: leaveApi.deleteHoliday,
    onSuccess: () => {
      message.success('Deleted');
      invalidate();
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };
  const openEdit = (h: Holiday) => {
    setEditing(h);
    form.setFieldsValue({ ...h, date: dayjs(h.date) });
    setOpen(true);
  };

  const onSave = () => {
    form.validateFields().then((v) =>
      save.mutate({
        name: v.name,
        date: v.date.format('YYYY-MM-DD'),
        type: v.type,
        recurring: v.recurring ?? false,
      }),
    );
  };

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Date', dataIndex: 'date', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag color={v === 'regular' ? 'red' : 'orange'}>{v}</Tag> },
    { title: 'Recurring', dataIndex: 'recurring', render: (v: boolean) => (v ? 'Yes' : 'No') },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, h: Holiday) =>
        can('leaves', 'update') ? (
          <Space>
            <Button size="small" onClick={() => openEdit(h)}>
              Edit
            </Button>
            {can('leaves', 'delete') && (
              <Popconfirm title="Delete holiday?" onConfirm={() => remove.mutate(h.id)}>
                <Button size="small" danger>
                  Delete
                </Button>
              </Popconfirm>
            )}
          </Space>
        ) : null,
    },
  ];

  return (
    <Card
      title="Holidays"
      extra={
        can('leaves', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Holiday
          </Button>
        )
      }
    >
      <Table dataSource={holidays} columns={columns} rowKey="id" loading={isLoading} pagination={false} />

      <Modal title={editing ? `Edit ${editing.name}` : 'New Holiday'} open={open} onOk={onSave} onCancel={() => setOpen(false)} confirmLoading={save.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'regular', label: 'Regular' },
                { value: 'special', label: 'Special non-working' },
              ]}
            />
          </Form.Item>
          <Form.Item name="recurring" label="Recurring yearly" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
