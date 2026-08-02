import { Row, Col, Card, Statistic } from 'antd';
import { TeamOutlined, DollarOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';

export function DashboardPage() {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Active Employees" value={0} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Pending Leaves" value={0} prefix={<CalendarOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Today's Attendance" value={0} prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Pending Payroll" value={0} prefix={<DollarOutlined />} /></Card>
        </Col>
      </Row>
    </div>
  );
}
