import { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, DatePicker, Space, Switch, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { leaveApi, LeaveRequest } from '../../api/leaves';
import { useCan } from '../../utils/permissions';

const statusColor: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
};

export function LeaveRequestsPage() {
  const queryClient = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: types = [] } = useQuery({ queryKey: ['leave-types'], queryFn: leaveApi.listTypes });
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['leave-requests'], queryFn: () => leaveApi.listRequests() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] });

  const create = useMutation({
    mutationFn: leaveApi.createRequest,
    onSuccess: () => {
      message.success('Leave request filed');
      setOpen(false);
      form.resetFields();
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed'),
  });

  const review = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      approve ? leaveApi.approveRequest(id) : leaveApi.rejectRequest(id),
    onSuccess: () => {
      message.success('Reviewed');
      invalidate();
    },
  });

  const cancel = useMutation({
    mutationFn: leaveApi.cancelRequest,
    onSuccess: () => {
      message.success('Cancelled');
      invalidate();
    },
  });

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: unknown, r: LeaveRequest) =>
        r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '—',
    },
    { title: 'Type', key: 'type', render: (_: unknown, r: LeaveRequest) => r.leaveType?.name ?? '—' },
    { title: 'Start', dataIndex: 'startDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: 'End', dataIndex: 'endDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: 'Half day', dataIndex: 'halfDay', render: (v: boolean) => (v ? 'Yes' : 'No') },
    { title: 'Reason', dataIndex: 'reason', render: (v: string | null) => v || '—' },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={statusColor[v] ?? 'default'}>{v}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: LeaveRequest) => (
        <Space>
          {r.status === 'pending' && can('leaves', 'approve') && (
            <>
              <Button size="small" type="primary" onClick={() => review.mutate({ id: r.id, approve: true })}>
                Approve
              </Button>
              <Button size="small" danger onClick={() => review.mutate({ id: r.id, approve: false })}>
                Reject
              </Button>
            </>
          )}
          {r.status === 'pending' && can('leaves', 'update') && (
            <Button size="small" onClick={() => cancel.mutate(r.id)}>
              Cancel
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const onSave = () => {
    form.validateFields().then((v) => {
      create.mutate({
        leaveTypeId: v.leaveTypeId,
        startDate: v.range[0].format('YYYY-MM-DD'),
        endDate: v.range[1].format('YYYY-MM-DD'),
        halfDay: v.halfDay ?? false,
        reason: v.reason,
      });
    });
  };

  return (
    <Card
      title="Leave Requests"
      extra={
        can('leaves', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            File Leave
          </Button>
        )
      }
    >
      <Table dataSource={requests} columns={columns} rowKey="id" loading={isLoading} pagination={false} />

      <Modal title="File Leave Request" open={open} onOk={onSave} onCancel={() => setOpen(false)} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="leaveTypeId" label="Leave type" rules={[{ required: true }]}>
            <Select options={types.map((t) => ({ value: t.id, label: t.name }))} />
          </Form.Item>
          <Form.Item name="range" label="Date range" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="halfDay" label="Half day" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
