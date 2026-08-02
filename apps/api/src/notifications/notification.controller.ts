import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Res,
  Req,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { NotificationService, SseClient } from './notification.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { Public } from '../common/auth/public.decorator';

const HEARTBEAT_MS = 30000;

@Controller('notifications')
export class NotificationController {
  constructor(
    private notifications: NotificationService,
    private jwt: JwtService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('is_read') isRead?: string,
  ) {
    return this.notifications.list(user, isRead === 'false');
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: RequestUser) {
    return this.notifications.unreadCount(user);
  }

  @Put(':id/read')
  markRead(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(user, id);
  }

  @Put('read-all')
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user);
  }

  /**
   * SSE stream. EventSource cannot set Authorization headers, so the JWT is
   * passed as `?token=` query param and verified manually.
   */
  @Public()
  @Get('stream')
  stream(@Query('token') token: string, @Req() req: Request, @Res() res: Response) {
    if (!token) throw new UnauthorizedException('Missing token');

    let payload: { sub: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`retry: 3000\n\n`);

    let closed = false;
    const send = (event: string, data: unknown) => {
      if (closed) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const client: SseClient = {
      userId: payload.sub,
      send,
      close: () => {
        closed = true;
      },
    };
    this.notifications.registerClient(client);

    const heartbeat = setInterval(() => {
      send('heartbeat', { ts: Date.now() });
    }, HEARTBEAT_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      client.close();
    });
  }
}
