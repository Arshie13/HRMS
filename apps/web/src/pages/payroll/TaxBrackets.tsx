import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, InputNumber, DatePicker, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import dayjs from 'dayjs';

export function TaxBrackets() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/tax-brackets');
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/tax-brackets', { ...values, effectiveDate: values.effectiveDate.toISOString() });
      message.success('Created');
      form.resetFields();
      setModalOpen(false);
      fetch();
    } catch { message.error('Failed'); }
  };

  const columns = [
    { title: 'Min Amount', dataIndex: 'minAmount', key: 'minAmount' },
    { title: 'Max Amount', dataIndex: 'maxAmount', key: 'maxAmount', render: (v: number | null) => v ?? '∞' },
    { title: 'Base Tax', dataIndex: 'baseTax', key: 'baseTax' },
    { title: 'Excess %', dataIndex: 'excessPercentage', key: 'excessPercentage', render: (v: number) => `${v}%` },
    { title: 'Effective', dataIndex: 'effectiveDate', key: 'effectiveDate', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add Bracket</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />

      <Modal title="Add Tax Bracket" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="minAmount" label="Min Amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxAmount" label="Max Amount">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="baseTax" label="Base Tax" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="excessPercentage" label="Excess Percentage" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={100} />
          </Form.Item>
          <Form.Item name="effectiveDate" label="Effective Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
