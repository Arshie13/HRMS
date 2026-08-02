import { Row, Col, Card, Statistic } from 'antd';
import { TeamOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons';

export function AdminOverview() {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card><Statistic title="System Users" value={0} prefix={<UserOutlined />} /></Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card><Statistic title="Roles" value={0} prefix={<SafetyOutlined />} /></Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card><Statistic title="Departments" value={0} prefix={<TeamOutlined />} /></Card>
      </Col>
    </Row>
  );
}
