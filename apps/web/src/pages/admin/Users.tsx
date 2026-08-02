import { Card, Table, Tag, Select, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi, UserRow } from '../../api/rbac';
import { useCan } from '../../utils/permissions';

export function UsersPage() {
  const queryClient = useQueryClient();
  const can = useCan();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: rbacApi.listUsers,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: rbacApi.listRoles,
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
    <Card title="User Management" style={{ marginTop: 16 }}>
      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: 'No users yet' }}
      />
    </Card>
  );
}
