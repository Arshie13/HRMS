import { useEffect, useState } from 'react';
import { Table, Tag, Button, Modal, Form, InputNumber, Select, DatePicker, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import dayjs from 'dayjs';

const typeColors: Record<string, string> = { SSS: 'blue', PhilHealth: 'green', PagIBIG: 'orange' };

export function ContributionTables() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/contribution-tables');
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/contribution-tables', { ...values, effectiveDate: values.effectiveDate.toISOString() });
      message.success('Created');
      form.resetFields();
      setModalOpen(false);
      fetch();
    } catch { message.error('Failed'); }
  };

  const columns = [
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={typeColors[v]}>{v}</Tag> },
    { title: 'Min', dataIndex: 'minCompensation', key: 'minCompensation', render: (v: number | null) => v ?? '-' },
    { title: 'Max', dataIndex: 'maxCompensation', key: 'maxCompensation', render: (v: number | null) => v ?? '-' },
    { title: 'Employee Share', dataIndex: 'employeeShare', key: 'employeeShare' },
    { title: 'Employer Share', dataIndex: 'employerShare', key: 'employerShare' },
    { title: 'Effective', dataIndex: 'effectiveDate', key: 'effectiveDate', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add Bracket</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />

      <Modal title="Add Contribution Bracket" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'SSS', label: 'SSS' },
              { value: 'PhilHealth', label: 'PhilHealth' },
              { value: 'PagIBIG', label: 'Pag-IBIG' },
            ]} />
          </Form.Item>
          <Form.Item name="minCompensation" label="Min Compensation">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxCompensation" label="Max Compensation">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="employeeShare" label="Employee Share" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="employerShare" label="Employer Share" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="effectiveDate" label="Effective Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
