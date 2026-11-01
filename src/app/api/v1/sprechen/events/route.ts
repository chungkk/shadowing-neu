import { apiUser } from "@/lib/api";
import { connect, disconnect, type SprechenEvent } from "@/lib/sprechen";

const PING_MS = 20_000; // giữ kết nối qua proxy (Coolify / Traefik cắt luồng im lặng quá lâu)

/**
 * GET → luồng SSE của phòng luyện nói: "hello" (clientId), danh sách phòng, trạng thái phòng, tín hiệu WebRTC.
 * Đóng tab / mất mạng → luồng đứt → tự rời phòng.
 */
export async function GET(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;

  const enc = new TextEncoder();
  let clientId = "";
  let ping: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      let open = true;
      const end = () => {
        if (!open) return;
        open = false;
        clearInterval(ping);
        disconnect(clientId);
        try {
          ctrl.close();
        } catch {}
      };
      const write = (s: string) => {
        if (!open) return;
        try {
          ctrl.enqueue(enc.encode(s));
        } catch {
          end();
        }
      };
      const send = (e: SprechenEvent) => write(`data: ${JSON.stringify(e)}\n\n`);
      clientId = connect(user, send, end);
      ping = setInterval(() => write(": ping\n\n"), PING_MS);
      req.signal.addEventListener("abort", end);
    },
    cancel() {
      clearInterval(ping);
      disconnect(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // proxy không gom dữ liệu → sự kiện tới ngay
    },
  });
}
