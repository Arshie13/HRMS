import { useCallback, useEffect, useState } from 'react';
import { Badge, Dropdown, Typography, Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { notificationsApi, Notification } from '../api/notifications';
import { useAuthStore } from '../store/auth';
import { SseClient } from '../lib/sse';

dayjs.extend(relativeTime);

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [unread, setUnread] = useState(0);

  const { data: recent = [] } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: () => notificationsApi.list(false),
  });

  const refresh = useCallback(() => {
    notificationsApi.unreadCount().then(setUnread).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
  }, [queryClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) return;
    const client = new SseClient(`/api/v1/notifications/stream?token=${encodeURIComponent(token)}`, {
      onNotification: refresh,
    });
    client.connect();
    return () => client.close();
  }, [token, refresh]);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    refresh();
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setUnread(0);
    queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
  };

  const items = [
    ...recent.slice(0, 5).map((n: Notification) => ({
      key: n.id,
      onClick: () => markRead(n.id),
      label: (
        <div style={{ width: 280, padding: '4px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Typography.Text strong>{n.title}</Typography.Text>
            {!n.isRead && <Badge status="processing" />}
          </div>
          {n.body && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {n.body}
            </Typography.Text>
          )}
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {dayjs(n.createdAt).fromNow()}
            </Typography.Text>
          </div>
        </div>
      ),
    })),
    ...(recent.length
      ? [
          { type: 'divider' as const },
          { key: 'mark-all', label: 'Mark all as read', onClick: markAll },
        ]
      : []),
    { type: 'divider' as const },
    { key: 'view-all', label: 'View all', onClick: () => navigate('/notifications') },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Badge count={unread} size="small" offset={[-2, 2]}>
        <Button type="text" icon={<BellOutlined style={{ fontSize: 16 }} />} />
      </Badge>
    </Dropdown>
  );
}
