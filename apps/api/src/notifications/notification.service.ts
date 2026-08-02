import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/auth/request-user';

export interface SseClient {
  userId: string;
  send: (event: string, data: unknown) => void;
  close: () => void;
}

@Injectable()
export class NotificationService {
  private clients = new Map<string, Set<SseClient>>();

  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  // --- persistence ---

  async create(
    tenantId: string,
    userId: string,
    type: string,
    title: string,
    body?: string,
    data?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.withTenant(tenantId, (tx) =>
      tx.notification.create({
        data: { tenantId, userId, type, title, body, data: data as any },
      }),
    );
    this.emitToUser(userId, notification);
    return notification;
  }

  async list(user: RequestUser, unreadOnly = false) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.notification.findMany({
        where: {
          tenantId: user.tenantId,
          userId: user.userId,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  }

  async unreadCount(user: RequestUser): Promise<number> {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.notification.count({
        where: { tenantId: user.tenantId, userId: user.userId, isRead: false },
      }),
    );
  }

  async markRead(user: RequestUser, id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const n = await tx.notification.findFirst({
        where: { id, tenantId: user.tenantId, userId: user.userId },
      });
      if (!n) throw new NotFoundException('Notification not found');
      return tx.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });
    });
  }

  async markAllRead(user: RequestUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.notification.updateMany({
        where: { tenantId: user.tenantId, userId: user.userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      }),
    );
  }

  // --- SSE registry ---

  registerClient(client: SseClient) {
    const set = this.clients.get(client.userId) ?? new Set<SseClient>();
    set.add(client);
    this.clients.set(client.userId, set);
    client.close = () => {
      set.delete(client);
      if (set.size === 0) this.clients.delete(client.userId);
    };
  }

  emitToUser(userId: string, data: unknown) {
    const set = this.clients.get(userId);
    if (!set) return;
    for (const client of set) {
      client.send('notification', data);
    }
  }

  // --- event helpers ---

  /** Users in the tenant whose role grants a permission (approval inbox). */
  async approversFor(tenantId: string, module: string, action: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.user.findMany({
        where: {
          tenantId,
          role: {
            is: { permissions: { path: [module, action], equals: true } },
          },
        },
      }),
    );
  }

  /** The tenant user matching an employee's email (for self-service notify). */
  async userForEmployee(tenantId: string, email: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.user.findFirst({ where: { tenantId, email } }),
    );
  }

  notifyApprovers(
    tenantId: string,
    module: string,
    action: string,
    type: string,
    title: string,
    body?: string,
    data?: Record<string, unknown>,
  ) {
    void this.approversFor(tenantId, module, action).then((users) => {
      for (const u of users) {
        void this.create(tenantId, u.id, type, title, body, data);
      }
    });
  }

  notifyEmployee(
    tenantId: string,
    employeeEmail: string,
    type: string,
    title: string,
    body?: string,
    data?: Record<string, unknown>,
  ) {
    void this.userForEmployee(tenantId, employeeEmail).then((u) => {
      if (u) void this.create(tenantId, u.id, type, title, body, data);
    });
  }

  get emitter(): EventEmitter2 {
    return this.events;
  }
}
