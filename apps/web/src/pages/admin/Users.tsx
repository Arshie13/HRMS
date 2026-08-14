import { useState } from 'react';
import { Card, Table, Tag, Select, Button, Modal, Form, Input, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi, UserRow } from '../../api/rbac';
import { useCan } from '../../utils/permissions';

export function UsersPage() {
  const queryClient = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: rbacApi.listUsers,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: rbacApi.listRoles,
  });

  const createMutation = useMutation({
    mutationFn: (data: { email: string; name?: string; password: string; roleId?: string }) =>
      rbacApi.createUser(data),
    onSuccess: () => {
      message.success('User created');
      setOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create user'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      rbacApi.assignRole(userId, roleId),
    onSuccess: () => {
      message.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to assign role'),
  });

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string | null) => v || '—' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Role',
      key: 'role',
      render: (_: unknown, user: UserRow) =>
        can('users', 'update') ? (
          <Select
            style={{ width: 180 }}
            value={user.roleId ?? undefined}
            placeholder="No role"
            loading={assignMutation.isPending}
            onChange={(roleId) => assignMutation.mutate({ userId: user.id, roleId })}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />
        ) : (
          <Tag>{user.role?.name ?? 'None'}</Tag>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="green">active</Tag>,
    },
  ];

  return (
    <Card
      title="User Management"
      style={{ marginTop: 16 }}
      extra={can('users', 'create') ? (
        <Button type="primary" onClick={() => setOpen(true)}>New User</Button>
      ) : null}
    >
      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: 'No users yet' }}
      />
      <Modal
        title="Create User"
        open={open}
        onOk={() => form.submit()}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item name="name" label="Name">
            <Input placeholder="Jane Doe" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="jane@company.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password placeholder="At least 8 characters" />
          </Form.Item>
          <Form.Item name="roleId" label="Role">
            <Select allowClear placeholder="Select a role" options={roles.map((r) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
