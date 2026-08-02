import { useEffect, useState } from 'react';
import { Table, Tag, Button, Modal, Form, InputNumber, Select, DatePicker, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import dayjs from 'dayjs';

const loanTypeLabels: Record<string, string> = {
  cash_advance: 'Cash Advance',
  company_loan: 'Company Loan',
  sss_loan: 'SSS Loan',
  pagibig_loan: 'Pag-IBIG Loan',
};

const statusColors: Record<string, string> = { active: 'blue', paid: 'green', defaulted: 'red' };

export function Loans() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/loans');
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/loans', {
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate?.toISOString(),
      });
      message.success('Loan created');
      form.resetFields();
      setModalOpen(false);
      fetch();
    } catch { message.error('Failed'); }
  };

  const columns = [
    { title: 'Type', dataIndex: 'loanType', key: 'loanType', render: (v: string) => loanTypeLabels[v] || v },
    { title: 'Principal', dataIndex: 'principal', key: 'principal' },
    { title: 'Amortization', dataIndex: 'amortizationPerPeriod', key: 'amortizationPerPeriod' },
    { title: 'Periods', key: 'periods', render: (_: any, r: any) => `${r.periodsPaid}/${r.totalPeriods}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusColors[v]}>{v}</Tag> },
    { title: 'Start', dataIndex: 'startDate', key: 'startDate', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Loan</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />

      <Modal title="New Loan" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="loanType" label="Loan Type" rules={[{ required: true }]}>
            <Select options={Object.entries(loanTypeLabels).map(([v, l]) => ({ value: v, label: l }))} />
          </Form.Item>
          <Form.Item name="principal" label="Principal" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="amortizationPerPeriod" label="Amortization per Period" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="totalPeriods" label="Total Periods" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endDate" label="End Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
