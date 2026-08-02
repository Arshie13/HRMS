import { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Switch, Space, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, Shift } from '../../api/attendance';
import { useCan } from '../../utils/permissions';

export function ShiftsPage() {
  const queryClient = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form] = Form.useForm();

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: attendanceApi.listShifts,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['shifts'] });

  const save = useMutation({
    mutationFn: (data: Partial<Shift>) =>
      editing ? attendanceApi.updateShift(editing.id, data) : attendanceApi.createShift(data),
    onSuccess: () => {
      message.success(editing ? 'Shift updated' : 'Shift created');
      setOpen(false);
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed'),
  });

  const remove = useMutation({
    mutationFn: attendanceApi.deleteShift,
    onSuccess: () => {
      message.success('Shift deleted');
      invalidate();
    },
  });

  const openEdit = (s: Shift) => {
    setEditing(s);
    form.setFieldsValue(s);
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const onSave = () => {
    form.validateFields().then((v) => save.mutate(v));
  };

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Start', dataIndex: 'startTime' },
    { title: 'End', dataIndex: 'endTime' },
    { title: 'Break', key: 'break', render: (_: unknown, s: Shift) => `${s.breakStart ?? '—'} – ${s.breakEnd ?? '—'}` },
    { title: 'Flexible', dataIndex: 'flexible', render: (v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>) },
    {
      title: 'Assigned',
      key: 'count',
      render: (_: unknown, s: Shift) => s._count?.employeeShifts ?? 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, s: Shift) =>
        can('attendance', 'update') ? (
          <Space>
            <Button size="small" onClick={() => openEdit(s)}>
              Edit
            </Button>
            {can('attendance', 'delete') && (
              <Popconfirm title="Delete shift?" onConfirm={() => remove.mutate(s.id)}>
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
      title="Shifts"
      extra={
        can('attendance', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Shift
          </Button>
        )
      }
    >
      <Table dataSource={shifts} columns={columns} rowKey="id" loading={isLoading} pagination={false} />

      <Modal title={editing ? `Edit ${editing.name}` : 'New Shift'} open={open} onOk={onSave} onCancel={() => setOpen(false)} confirmLoading={save.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="startTime" label="Start time" rules={[{ required: true }]}>
            <Input placeholder="09:00" />
          </Form.Item>
          <Form.Item name="endTime" label="End time" rules={[{ required: true }]}>
            <Input placeholder="18:00" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="breakStart" label="Break start">
              <Input placeholder="12:00" />
            </Form.Item>
            <Form.Item name="breakEnd" label="Break end">
              <Input placeholder="13:00" />
            </Form.Item>
          </Space>
          <Form.Item name="flexible" label="Flexible" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
