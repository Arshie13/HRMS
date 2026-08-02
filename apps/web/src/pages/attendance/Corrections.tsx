import { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, DatePicker, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { attendanceApi, Correction } from '../../api/attendance';
import { useCan } from '../../utils/permissions';
import { useAuthStore } from '../../store/auth';

const statusColor: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red' };

export function CorrectionsPage() {
  const queryClient = useQueryClient();
  const can = useCan();
  const employeeId = useAuthStore((s) => s.user?.employeeId ?? null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: corrections = [], isLoading } = useQuery({
    queryKey: ['attendance-corrections'],
    queryFn: () => attendanceApi.listCorrections(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] });

  const create = useMutation({
    mutationFn: attendanceApi.createCorrection,
    onSuccess: () => {
      message.success('Correction filed');
      setOpen(false);
      form.resetFields();
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed'),
  });

  const review = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      approve ? attendanceApi.approveCorrection(id) : attendanceApi.rejectCorrection(id),
    onSuccess: () => {
      message.success('Reviewed');
      invalidate();
    },
  });

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: unknown, c: Correction) =>
        c.employee ? `${c.employee.firstName} ${c.employee.lastName}` : '—',
    },
    { title: 'Field', dataIndex: 'field' },
    { title: 'Current', dataIndex: 'currentValue', render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
    { title: 'Requested', dataIndex: 'requestedValue', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: 'Reason', dataIndex: 'reason' },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={statusColor[v] ?? 'default'}>{v}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, c: Correction) =>
        c.status === 'pending' && can('attendance', 'approve') ? (
          <Space>
            <Button size="small" type="primary" onClick={() => review.mutate({ id: c.id, approve: true })}>
              Approve
            </Button>
            <Button size="small" danger onClick={() => review.mutate({ id: c.id, approve: false })}>
              Reject
            </Button>
          </Space>
        ) : null,
    },
  ];

  const onSave = () => {
    form.validateFields().then((v) => {
      create.mutate({
        field: v.field,
        requestedValue: v.requestedValue.toISOString(),
        reason: v.reason,
      });
    });
  };

  return (
    <Card
      title="Attendance Corrections"
      extra={
        can('attendance', 'create') &&
        employeeId && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            File Correction
          </Button>
        )
      }
    >
      <Table dataSource={corrections} columns={columns} rowKey="id" loading={isLoading} pagination={false} />

      <Modal title="File Attendance Correction" open={open} onOk={onSave} onCancel={() => setOpen(false)} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" initialValues={{ field: 'clock_in' }}>
          <Form.Item name="field" label="Field" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'clock_in', label: 'Clock In' },
                { value: 'clock_out', label: 'Clock Out' },
              ]}
            />
          </Form.Item>
          <Form.Item name="requestedValue" label="Corrected time" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Why is the correction needed?" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
