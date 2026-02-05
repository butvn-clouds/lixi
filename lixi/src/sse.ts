import { SSE_BASE } from "./constants";
import type { RoomStatus } from "./api";

export class SSEClient {
  private code: string;
  private es: EventSource | null = null;
  private timer: number | null = null;
  private retry = 0;

  constructor(code: string, private onStatus: (s: RoomStatus) => void) {
    this.code = code;
  }

  connect() {
    this.cleanup();
    const url = `${SSE_BASE}/stream/${encodeURIComponent(this.code)}`;
    this.es = new EventSource(url);

    this.es.addEventListener("room_status", (e: MessageEvent) => {
      try {
        const s = JSON.parse(e.data);
        this.onStatus(s);
      } catch {}
    });

    this.es.onerror = () => {
      this.cleanup();
      this.reconnect();
    };

    this.es.onopen = () => (this.retry = 0);
  }

  disconnect() {
    this.cleanup();
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = null;
  }

  private cleanup() {
    try { this.es?.close(); } catch {}
    this.es = null;
  }

  private reconnect() {
    this.retry += 1;
    const delay = Math.min(12000, 700 * Math.pow(2, this.retry - 1)) + Math.floor(Math.random() * 300);
    this.timer = window.setTimeout(() => this.connect(), delay);
  }
}
