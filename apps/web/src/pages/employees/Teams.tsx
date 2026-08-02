import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

export function Teams() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/teams');
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/teams', values);
      message.success('Created');
      form.resetFields();
      setModalOpen(false);
      fetch();
    } catch { message.error('Failed'); }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Employees', key: 'count', render: (_: any, r: any) => r._count?.employees || 0 },
  ];

  return (
    <Card title="Teams" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add</Button>}>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      <Modal title="New Team" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
