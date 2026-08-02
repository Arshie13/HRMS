import { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  Checkbox,
  message,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi, Role } from '../../api/rbac';
import { useCan } from '../../utils/permissions';

const MODULES = [
  'employees',
  'departments',
  'teams',
  'attendance',
  'leaves',
  'payroll',
  'roles',
  'users',
  'settings',
] as const;

const ACTIONS = ['create', 'read', 'update', 'delete', 'approve', 'export'] as const;

function emptyMatrix(): Record<string, Record<string, boolean>> {
  const m: Record<string, Record<string, boolean>> = {};
  for (const mod of MODULES) {
    m[mod] = {};
    for (const act of ACTIONS) m[mod][act] = false;
  }
  return m;
}

export function RolesPage() {
  const queryClient = useQueryClient();
  const can = useCan();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(emptyMatrix());

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rbacApi.listRoles,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['roles'] });

  const createMutation = useMutation({
    mutationFn: rbacApi.createRole,
    onSuccess: () => {
      message.success('Role created');
      setModalOpen(false);
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create role'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof rbacApi.updateRole>[1] }) =>
      rbacApi.updateRole(id, data),
    onSuccess: () => {
      message.success('Role updated');
      setModalOpen(false);
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update role'),
  });

  const deleteMutation = useMutation({
    mutationFn: rbacApi.deleteRole,
    onSuccess: () => {
      message.success('Role deleted');
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to delete role'),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setMatrix(emptyMatrix());
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    form.setFieldsValue({ name: role.name, description: role.description ?? '' });
    const m = emptyMatrix();
    for (const mod of MODULES) {
      m[mod] = { ...(role.permissions?.[mod] ?? {}) };
    }
    setMatrix(m);
    setModalOpen(true);
  };

  const onSave = () => {
    form.validateFields().then((values) => {
      const payload = {
        name: values.name,
        description: values.description,
        permissions: matrix,
      };
      if (editing) {
        updateMutation.mutate({ id: editing.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const toggleModule = (mod: string, checked: boolean) => {
    setMatrix((prev) => {
      const next = { ...prev, [mod]: { ...prev[mod] } };
      for (const act of ACTIONS) next[mod][act] = checked;
      return next;
    });
  };

  const columns = [
    { title: 'Role', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v: string | null) => v || '—' },
    {
      title: 'Type',
      dataIndex: 'isSystem',
      key: 'isSystem',
      render: (v: boolean) => (v ? <Tag color="blue">System</Tag> : <Tag>Custom</Tag>),
    },
    {
      title: 'Users',
      key: 'users',
      render: (_: unknown, r: Role) => r._count?.users ?? 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: Role) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)} disabled={r.isSystem}>
            Edit
          </Button>
          {!r.isSystem && (
            <Popconfirm
              title="Delete this role?"
              onConfirm={() => deleteMutation.mutate(r.id)}
            >
              <Button size="small" danger>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Role Management"
      style={{ marginTop: 16 }}
      extra={
        can('roles', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Role
          </Button>
        )
      }
    >
      <Table dataSource={roles} columns={columns} rowKey="id" loading={isLoading} pagination={false} />

      <Modal
        title={editing ? `Edit ${editing.name}` : 'New Role'}
        open={modalOpen}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Role name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Finance Manager" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="What can this role do?" />
          </Form.Item>
        </Form>

        <Typography.Title level={5}>Permissions</Typography.Title>
        {MODULES.map((mod) => {
          const row = matrix[mod] ?? {};
          const allOn = ACTIONS.every((a) => row[a]);
          return (
            <div key={mod} style={{ marginBottom: 8, padding: 8, border: '1px solid #f0f0f0', borderRadius: 6 }}>
              <Space style={{ marginBottom: 4 }}>
                <Checkbox
                  checked={allOn}
                  indeterminate={!allOn && ACTIONS.some((a) => row[a])}
                  onChange={(e) => toggleModule(mod, e.target.checked)}
                >
                  <strong style={{ textTransform: 'capitalize' }}>{mod}</strong>
                </Checkbox>
              </Space>
              <Space wrap>
                {ACTIONS.map((act) => (
                  <Checkbox
                    key={act}
                    checked={!!row[act]}
                    onChange={(e) =>
                      setMatrix((prev) => ({
                        ...prev,
                        [mod]: { ...prev[mod], [act]: e.target.checked },
                      }))
                    }
                  >
                    {act}
                  </Checkbox>
                ))}
              </Space>
            </div>
          );
        })}
      </Modal>
    </Card>
  );
}
