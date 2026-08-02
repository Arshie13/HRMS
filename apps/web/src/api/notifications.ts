import { api } from './client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (unreadOnly = false) =>
    api.get<Notification[]>('/notifications', { params: { is_read: unreadOnly } }).then((r) => r.data),
  unreadCount: () => api.get<number>('/notifications/unread-count').then((r) => r.data),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};
