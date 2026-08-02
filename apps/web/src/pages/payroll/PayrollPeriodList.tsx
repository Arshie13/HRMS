import { useEffect, useState } from 'react';
import { Table, Tag, Button, Modal, Descriptions } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { CreatePayrollPeriodModal } from './CreatePayrollPeriodModal';
import dayjs from 'dayjs';

const statusColors: Record<string, string> = {
  draft: 'default',
  computed: 'processing',
  approved: 'success',
  released: 'purple',
};

export function PayrollPeriodList() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const navigate = useNavigate();

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payroll/periods');
      setPeriods(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Period', key: 'period', render: (_: any, r: any) =>
      `${dayjs(r.startDate).format('MMM D')} - ${dayjs(r.endDate).format('MMM D, YYYY')}` },
    { title: 'Pay Date', dataIndex: 'payDate', key: 'payDate', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
    { title: 'Type', dataIndex: 'scheduleType', key: 'scheduleType' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusColors[v]}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => navigate(`/payroll/periods/${r.id}`)}>View</Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>New Period</Button>
      </div>
      <Table
        dataSource={periods}
        columns={columns}
        rowKey="id"
        loading={loading}
        onRow={(r) => ({
          onClick: () => setSelected(r),
          style: { cursor: 'pointer', background: selected?.id === r.id ? '#f5f5f5' : undefined },
        })}
      />

      <CreatePayrollPeriodModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); fetch(); }}
      />

      <Modal
        title="Payroll Period Details"
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={<Button onClick={() => { navigate(`/payroll/periods/${selected?.id}`); setSelected(null); }}>Open Full View</Button>}
      >
        {selected && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Period">{dayjs(selected.startDate).format('MMM D')} - {dayjs(selected.endDate).format('MMM D, YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Pay Date">{dayjs(selected.payDate).format('MMM D, YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Schedule">{selected.scheduleType}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={statusColors[selected.status]}>{selected.status}</Tag></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
}
