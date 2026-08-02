import { Card, Table, Progress } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { leaveApi, LeaveBalance } from '../../api/leaves';

export function LeaveBalancesPage() {
  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: () => leaveApi.listBalances(),
  });

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: unknown, b: LeaveBalance) =>
        b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : '—',
    },
    { title: 'Year', dataIndex: 'year' },
    { title: 'Type', key: 'type', render: (_: unknown, b: LeaveBalance) => b.leaveType?.name ?? '—' },
    { title: 'Available', key: 'available', render: (_: unknown, b: LeaveBalance) => (b.balance - b.pendingDays).toFixed(1) },
    { title: 'Pending', dataIndex: 'pendingDays', render: (v: number) => v.toFixed(1) },
    { title: 'Used', dataIndex: 'usedDays', render: (v: number) => v.toFixed(1) },
    {
      title: 'Usage',
      key: 'usage',
      render: (_: unknown, b: LeaveBalance) => {
        const pct = b.balance > 0 ? Math.min(100, ((b.usedDays + b.pendingDays) / b.balance) * 100) : 0;
        return <Progress percent={Math.round(pct)} size="small" />;
      },
    },
  ];

  return (
    <Card title="Leave Balances">
      <Table dataSource={balances} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
    </Card>
  );
}
