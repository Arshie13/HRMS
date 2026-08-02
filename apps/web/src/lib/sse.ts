export interface SseHandlers {
  onNotification?: (data: unknown) => void;
  onHeartbeat?: () => void;
  onError?: () => void;
}

/** Minimal SSE client with auto-reconnect + heartbeat tolerance. */
export class SseClient {
  private es: EventSource | null = null;
  private reconnectDelay = 3000;
  private closed = false;

  constructor(
    private url: string,
    private handlers: SseHandlers = {},
  ) {}

  connect() {
    if (this.closed) return;
    const es = new EventSource(this.url);
    this.es = es;

    es.addEventListener('notification', (e) => {
      try {
        this.handlers.onNotification?.(JSON.parse((e as MessageEvent).data));
      } catch {
        /* ignore malformed payload */
      }
    });

    es.addEventListener('heartbeat', () => this.handlers.onHeartbeat?.());

    es.onerror = () => {
      es.close();
      if (!this.closed) {
        this.handlers.onError?.();
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    };
  }

  close() {
    this.closed = true;
    this.es?.close();
    this.es = null;
  }
}
