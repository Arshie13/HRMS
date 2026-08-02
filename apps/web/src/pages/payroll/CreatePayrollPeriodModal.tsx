import { useState } from 'react';
import { Modal, Form, DatePicker, Select, message } from 'antd';
import { api } from '../../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePayrollPeriodModal({ open, onClose, onCreated }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      await api.post('/payroll/periods', {
        startDate: values.dateRange[0].toISOString(),
        endDate: values.dateRange[1].toISOString(),
        payDate: values.payDate.toISOString(),
        scheduleType: values.scheduleType,
      });
      message.success('Payroll period created');
      form.resetFields();
      onCreated();
    } catch { message.error('Failed to create period'); }
    setLoading(false);
  };

  return (
    <Modal title="New Payroll Period" open={open} onOk={handleOk} onCancel={onClose} confirmLoading={loading} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="dateRange" label="Period Dates" rules={[{ required: true, message: 'Required' }]}>
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="payDate" label="Pay Date" rules={[{ required: true, message: 'Required' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="scheduleType" label="Schedule" rules={[{ required: true, message: 'Required' }]}>
          <Select options={[
            { value: 'semi-monthly', label: 'Semi-Monthly' },
            { value: 'monthly', label: 'Monthly' },
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
