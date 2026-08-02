import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Button, Space, Descriptions, message } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import dayjs from 'dayjs';

const statusColors: Record<string, string> = {
  draft: 'default', computed: 'processing', approved: 'success', released: 'purple',
};

export function PayrollPeriodDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [periodRes, entriesRes] = await Promise.all([
        api.get(`/payroll/periods/${id}`),
        api.get(`/payroll/periods/${id}/entries`),
      ]);
      setPeriod(periodRes.data);
      setEntries(entriesRes.data);
    } catch { message.error('Failed to load period'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const doAction = async (action: string) => {
    setActionLoading(action);
    try {
      await api.post(`/payroll/periods/${id}/${action}`);
      message.success(`${action} successful`);
      fetch();
    } catch { message.error(`${action} failed`); }
    setActionLoading('');
  };

  const exportCsv = async () => {
    try {
      const res = await api.get(`/payroll/periods/${id}/export/csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `payroll-${id}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { message.error('Export failed'); }
  };

  const entryColumns = [
    { title: 'Employee', key: 'name', render: (_: any, r: any) =>
      r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId },
    { title: 'Basic Pay', dataIndex: 'basicPay', key: 'basicPay', render: (v: number) => v.toFixed(2) },
    { title: 'OT', dataIndex: 'overtimePay', key: 'overtimePay', render: (v: number) => v.toFixed(2) },
    { title: 'Holiday', dataIndex: 'holidayPay', key: 'holidayPay', render: (v: number) => v.toFixed(2) },
    { title: 'Gross', dataIndex: 'grossPay', key: 'grossPay', render: (v: number) => v.toFixed(2) },
    { title: 'Deductions', dataIndex: 'totalDeductions', key: 'totalDeductions', render: (v: number) => v.toFixed(2) },
    { title: 'Net Pay', dataIndex: 'netPay', key: 'netPay', render: (v: number) => <strong>{v.toFixed(2)}</strong> },
  ];

  if (!period && loading) return null;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/payroll')}>Back</Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Period">
            {dayjs(period.startDate).format('MMM D')} - {dayjs(period.endDate).format('MMM D, YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Pay Date">{dayjs(period.payDate).format('MMM D, YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Schedule">{period.scheduleType}</Descriptions.Item>
          <Descriptions.Item label="Status"><Tag color={statusColors[period.status]}>{period.status}</Tag></Descriptions.Item>
        </Descriptions>

        <Space style={{ marginTop: 16 }}>
          {period.status === 'draft' && (
            <Button type="primary" loading={actionLoading === 'compute'} onClick={() => doAction('compute')}>
              Compute
            </Button>
          )}
          {period.status === 'computed' && (
            <>
              <Button type="primary" loading={actionLoading === 'approve'} onClick={() => doAction('approve')}>
                Approve
              </Button>
              <Button loading={actionLoading === 'revert'} onClick={() => doAction('revert')}>
                Revert to Draft
              </Button>
            </>
          )}
          {period.status === 'approved' && (
            <Button type="primary" loading={actionLoading === 'release'} onClick={() => doAction('release')}>
              Release
            </Button>
          )}
          {period.status !== 'draft' && (
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button>
          )}
        </Space>
      </Card>

      <Card title="Employee Entries">
        <Table dataSource={entries} columns={entryColumns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  );
}
