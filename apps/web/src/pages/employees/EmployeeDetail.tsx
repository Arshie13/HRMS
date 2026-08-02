import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Tabs, Table, Button, Space } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import dayjs from 'dayjs';

const statusColors: Record<string, string> = {
  active: 'green', probationary: 'orange', suspended: 'red',
  'on-leave': 'blue', resigned: 'default', terminated: 'default',
};

export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp] = useState<any>(null);

  useEffect(() => {
    api.get(`/employees/${id}`).then(({ data }) => setEmp(data)).catch(() => {});
  }, [id]);

  if (!emp) return null;

  const historyColumns = [
    { title: 'Event', dataIndex: 'eventType', key: 'eventType' },
    { title: 'Old Value', dataIndex: 'oldValue', key: 'oldValue', render: (v: any) => v ? JSON.stringify(v) : '-' },
    { title: 'New Value', dataIndex: 'newValue', key: 'newValue', render: (v: any) => v ? JSON.stringify(v) : '-' },
    { title: 'Date', dataIndex: 'changedAt', key: 'changedAt', render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A') },
  ];

  const docColumns = [
    { title: 'File', dataIndex: 'filename', key: 'filename' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Size', dataIndex: 'fileSizeBytes', key: 'fileSizeBytes', render: (v: number) => `${(v / 1024).toFixed(1)} KB` },
    { title: 'Uploaded', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/employees')}>Back</Button>
        <Button icon={<EditOutlined />} onClick={() => navigate(`/employees/${id}/edit`)}>Edit</Button>
      </Space>

      <Card>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Employee ID">{emp.employeeId}</Descriptions.Item>
          <Descriptions.Item label="Status"><Tag color={statusColors[emp.status]}>{emp.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="Name">{emp.firstName} {emp.lastName}</Descriptions.Item>
          <Descriptions.Item label="Email">{emp.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{emp.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="Position">{emp.position || '-'}</Descriptions.Item>
          <Descriptions.Item label="Department">{emp.department?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Team">{emp.team?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Monthly Salary">{emp.monthlySalary ? `₱${emp.monthlySalary.toLocaleString()}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="Daily Rate">{emp.dailyRate ? `₱${emp.dailyRate.toFixed(2)}` : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Tabs items={[
          {
            key: 'history', label: 'History',
            children: <Table dataSource={emp.histories} columns={historyColumns} rowKey="id" size="small" />,
          },
          {
            key: 'documents', label: 'Documents',
            children: <Table dataSource={emp.documents} columns={docColumns} rowKey="id" size="small" />,
          },
        ]} />
      </Card>
    </div>
  );
}
