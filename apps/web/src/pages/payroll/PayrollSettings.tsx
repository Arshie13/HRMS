import { useCallback, useEffect, useState } from 'react';
import { Card, Form, InputNumber, TimePicker, Button, Space, message } from 'antd';
import { api } from '../../api/client';
import dayjs from 'dayjs';

export function PayrollSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payroll/settings');
      form.setFieldsValue({
        nightDiffStart: dayjs(data.nightDiffStart, 'HH:mm'),
        nightDiffEnd: dayjs(data.nightDiffEnd, 'HH:mm'),
        nightDiffRatePct: Math.round(data.nightDiffRate * 10000) / 100,
        otRegularDay: data.otRegularDay,
        otRestDay: data.otRestDay,
        otRegularHoliday: data.otRegularHoliday,
        otSpecialHoliday: data.otSpecialHoliday,
        otRestDayHoliday: data.otRestDayHoliday,
      });
    } catch { message.error('Failed to load payroll settings'); }
    setLoading(false);
  }, [form]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await api.put('/payroll/settings', {
        nightDiffStart: values.nightDiffStart.format('HH:mm'),
        nightDiffEnd: values.nightDiffEnd.format('HH:mm'),
        nightDiffRate: values.nightDiffRatePct / 100,
        otRegularDay: values.otRegularDay,
        otRestDay: values.otRestDay,
        otRegularHoliday: values.otRegularHoliday,
        otSpecialHoliday: values.otSpecialHoliday,
        otRestDayHoliday: values.otRestDayHoliday,
      });
      message.success('Payroll settings saved');
    } catch { message.error('Failed to save payroll settings'); }
    setSaving(false);
  };

  return (
    <Card title="Payroll Settings" style={{ marginTop: 16 }} loading={loading}>
      <Form form={form} layout="vertical" style={{ maxWidth: 520 }}>
        <Space size="large" wrap>
          <Form.Item name="nightDiffStart" label="Night Diff Start" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" minuteStep={5} />
          </Form.Item>
          <Form.Item name="nightDiffEnd" label="Night Diff End" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" minuteStep={5} />
          </Form.Item>
        </Space>
        <Form.Item name="nightDiffRatePct" label="Night Diff Rate (%)" rules={[{ required: true }]}>
          <InputNumber min={0} max={100} step={0.5} style={{ width: 200 }} addonAfter="%" />
        </Form.Item>

        <Space size="large" wrap>
          <Form.Item name="otRegularDay" label="OT Regular Day" rules={[{ required: true }]}>
            <InputNumber min={0} max={10} step={0.05} precision={2} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="otRestDay" label="OT Rest Day" rules={[{ required: true }]}>
            <InputNumber min={0} max={10} step={0.05} precision={2} style={{ width: 140 }} />
          </Form.Item>
        </Space>
        <Space size="large" wrap>
          <Form.Item name="otRegularHoliday" label="OT Regular Holiday" rules={[{ required: true }]}>
            <InputNumber min={0} max={10} step={0.05} precision={2} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="otSpecialHoliday" label="OT Special Holiday" rules={[{ required: true }]}>
            <InputNumber min={0} max={10} step={0.05} precision={2} style={{ width: 140 }} />
          </Form.Item>
        </Space>
        <Form.Item name="otRestDayHoliday" label="OT Rest Day + Holiday" rules={[{ required: true }]}>
          <InputNumber min={0} max={10} step={0.05} precision={2} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" loading={saving} onClick={handleSave}>Save</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
