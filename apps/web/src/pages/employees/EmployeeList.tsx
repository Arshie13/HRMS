import { useCallback, useEffect, useState } from 'react';
import { Table, Tag, Input, Select, Space, Button, Card } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

const statusColors: Record<string, string> = {
  active: 'green', probationary: 'orange', suspended: 'red',
  'on-leave': 'blue', resigned: 'default', terminated: 'default',
};

export function EmployeeList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const navigate = useNavigate();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data: d } = await api.get('/employees', { params });
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const columns = [
    { title: 'ID', dataIndex: 'employeeId', key: 'employeeId', width: 120 },
    { title: 'Name', key: 'name', render: (_: any, r: any) => `${r.firstName} ${r.lastName}` },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    { title: 'Department', key: 'dept', render: (_: any, r: any) => r.department?.name || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusColors[v]}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => navigate(`/employees/${r.id}`)}>View</Button>
      ),
    },
  ];

  return (
    <Card title="Employees">
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }} wrap>
        <Space>
          <Input placeholder="Search name, email, ID" prefix={<SearchOutlined />} value={search}
            onChange={(e) => setSearch(e.target.value)} allowClear style={{ width: 280 }} />
          <Select placeholder="Status" allowClear style={{ width: 140 }}
            value={statusFilter} onChange={setStatusFilter}
            options={['active', 'probationary', 'suspended', 'on-leave', 'resigned', 'terminated']
              .map((s) => ({ value: s, label: s }))} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/employees/new')}>Add Employee</Button>
      </Space>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
    </Card>
  );
}
