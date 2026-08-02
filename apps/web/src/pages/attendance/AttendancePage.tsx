import { Card, Button, Table, Tag, Space, Statistic, Row, Col, Alert, message } from 'antd';
import { ClockCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, AttendanceRecord } from '../../api/attendance';
import { useCan } from '../../utils/permissions';
import { useAuthStore } from '../../store/auth';
import dayjs from 'dayjs';

const statusColor: Record<string, string> = {
  present: 'green',
  holiday: 'orange',
  absent: 'red',
  on_leave: 'blue',
  rest_day: 'default',
};

export function AttendancePage() {
  const queryClient = useQueryClient();
  const can = useCan();
  const employeeId = useAuthStore((s) => s.user?.employeeId ?? null);

  const { data: today } = useQuery({ queryKey: ['attendance-today'], queryFn: attendanceApi.today });
  const { data: records = [], isLoading } = useQuery({ queryKey: ['attendance'], queryFn: () => attendanceApi.list() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    queryClient.invalidateQueries({ queryKey: ['attendance'] });
  };

  const clockIn = useMutation({
    mutationFn: attendanceApi.clockIn,
    onSuccess: () => {
      message.success('Clocked in');
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Clock-in failed'),
  });
  const clockOut = useMutation({
    mutationFn: attendanceApi.clockOut,
    onSuccess: () => {
      message.success('Clocked out');
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Clock-out failed'),
  });

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
    {
      title: 'Employee',
      key: 'employee',
      render: (_: unknown, r: AttendanceRecord) =>
        r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '—',
    },
    { title: 'Clock In', dataIndex: 'clockIn', render: (v: string | null) => (v ? dayjs(v).format('HH:mm:ss') : '—') },
    { title: 'Clock Out', dataIndex: 'clockOut', render: (v: string | null) => (v ? dayjs(v).format('HH:mm:ss') : '—') },
    { title: 'Hours', dataIndex: 'totalHours', render: (v: number) => v.toFixed(2) },
    { title: 'Late (min)', dataIndex: 'lateMinutes' },
    { title: 'Undertime (min)', dataIndex: 'undertimeMinutes' },
    { title: 'OT (min)', dataIndex: 'overtimeMinutes' },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={statusColor[v] ?? 'default'}>{v}</Tag> },
  ];

  const clockedIn = !!today?.clockIn && !today?.clockOut;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Today"
              value={clockedIn ? 'Clocked in' : today?.clockOut ? 'Clocked out' : 'Not clocked in'}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            {!employeeId ? (
              <Alert
                type="info"
                showIcon
                message="No employee profile linked to this account"
                description="Ask an admin to create/link your employee profile to use clock-in."
              />
            ) : (
              <Space>
                {!clockedIn && !today?.clockOut && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<ClockCircleOutlined />}
                    loading={clockIn.isPending}
                    disabled={!can('attendance', 'create')}
                    onClick={() => clockIn.mutate(undefined)}
                  >
                    Clock In
                  </Button>
                )}
                {clockedIn && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<LogoutOutlined />}
                    loading={clockOut.isPending}
                    disabled={!can('attendance', 'update')}
                    onClick={() => clockOut.mutate(undefined)}
                  >
                    Clock Out
                  </Button>
                )}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
      <Card title="Attendance Records">
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
