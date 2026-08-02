import { Card, List, Tag, Button, Empty, Typography } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { notificationsApi, Notification } from '../../api/notifications';

dayjs.extend(relativeTime);

const typeColor: Record<string, string> = {
  leave_request: 'orange',
  leave_approved: 'green',
  leave_rejected: 'red',
  attendance_correction: 'blue',
  attendance_correction_resolved: 'purple',
};

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(false),
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <Card
      title="Notifications"
      extra={
        notifications.some((n) => !n.isRead) && (
          <Button onClick={() => markAll.mutate()} loading={markAll.isPending}>
            Mark all as read
          </Button>
        )
      }
    >
      <List
        loading={isLoading}
        dataSource={notifications}
        locale={{ emptyText: <Empty description="No notifications" /> }}
        renderItem={(n: Notification) => (
          <List.Item
            style={{ cursor: 'pointer', opacity: n.isRead ? 0.6 : 1 }}
            onClick={() => !n.isRead && markRead.mutate(n.id)}
            actions={[
              <Typography.Text key="time" type="secondary" style={{ fontSize: 12 }}>
                {dayjs(n.createdAt).fromNow()}
              </Typography.Text>,
            ]}
          >
            <List.Item.Meta
              avatar={<Tag color={typeColor[n.type] ?? 'default'}>{n.type.replace(/_/g, ' ')}</Tag>}
              title={
                <SpaceRow title={n.title} read={n.isRead} />
              }
              description={n.body}
            />
          </List.Item>
        )}
      />
    </Card>
  );
}

function SpaceRow({ title, read }: { title: string; read: boolean }) {
  return (
    <span>
      {title} {!read && <Tag color="processing">New</Tag>}
    </span>
  );
}
