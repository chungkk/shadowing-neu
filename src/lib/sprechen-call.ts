"use client";

import { clientApi } from "./client-api";
import type { Level, RoomView, SprechenEvent } from "./sprechen-types";

/**
 * Cuộc gọi thoại trong phòng luyện nói (chạy trên trình duyệt).
 * - Báo hiệu: nhận qua SSE /api/v1/sprechen/events, gửi qua POST /api/v1/sprechen.
 * - Âm thanh: WebRTC mesh — mỗi người nối thẳng với từng người khác; người vào sau gửi offer (không bị "đụng offer").
 * - Đo âm lượng từng người để hiện vòng "đang nói".
 */

type Peer = { pc: RTCPeerConnection; audio: HTMLAudioElement; pending: RTCIceCandidateInit[] };
type Signal = { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

export type CallState = {
  connected: boolean;
  clientId: string | null;
  online: number;
  rooms: RoomView[];
  room: RoomView | null;
  waiting: boolean;
  speaking: string[]; // clientId đang nói
  peerStates: Record<string, RTCPeerConnectionState>;
  notice: string; // thông báo (bị mời ra, mất kết nối…)
};

export const initialCallState: CallState = {
  connected: false,
  clientId: null,
  online: 0,
  rooms: [],
  room: null,
  waiting: false,
  speaking: [],
  peerStates: {},
  notice: "",
};

const SPEAK_LEVEL = 0.035; // RMS trên ngưỡng này = đang nói

export class SprechenCall {
  private es: EventSource | null = null;
  private ice: RTCIceServer[] = [];
  private peers = new Map<string, Peer>();
  private mic: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private meters = new Map<string, AnalyserNode>();
  private meterTimer: ReturnType<typeof setInterval> | null = null;
  private outbox: Promise<unknown> = Promise.resolve(); // gửi tín hiệu theo đúng thứ tự
  private inbox: Promise<unknown> = Promise.resolve(); // xử lý tín hiệu nhận được lần lượt
  private s: CallState = initialCallState;

  constructor(private onChange: (s: CallState) => void) {}

  private set(patch: Partial<CallState>) {
    this.s = { ...this.s, ...patch };
    this.onChange(this.s);
  }

  start() {
    this.es = new EventSource("/api/v1/sprechen/events");
    this.es.onmessage = (ev) => this.handle(JSON.parse(ev.data) as SprechenEvent);
    // EventSource tự kết nối lại; kết nối mới = clientId mới (server đã cho rời phòng cũ)
    this.es.onerror = () => this.set({ connected: false });
  }

  stop() {
    this.es?.close();
    this.es = null;
    this.teardown();
  }

  // ---- Hành động của người dùng ----

  private post<T = unknown>(action: string, extra: object = {}) {
    return clientApi<T>("/sprechen", { method: "POST", body: { clientId: this.s.clientId, action, ...extra } });
  }

  /** Xin micro trước khi vào phòng (cần thao tác của người dùng) */
  private async ensureMic() {
    if (this.mic) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Trình duyệt không hỗ trợ gọi thoại (cần HTTPS và trình duyệt mới).");
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      const name = (e as DOMException).name;
      throw new Error(
        name === "NotAllowedError"
          ? "Hãy cho phép trang dùng micro để luyện nói (biểu tượng ổ khoá cạnh thanh địa chỉ)."
          : name === "NotFoundError"
            ? "Không tìm thấy micro trên thiết bị này."
            : "Không mở được micro.",
      );
    }
    this.meter("me", this.mic);
  }

  async create(opts: { name: string; level: Level; topics: string[]; max: number; private: boolean }) {
    await this.ensureMic();
    await this.post("create", opts).catch(this.releaseIfIdle);
  }

  async join(roomId: string) {
    await this.ensureMic();
    await this.post("join", { roomId }).catch(this.releaseIfIdle);
  }

  async match(level: Level, topics: string[]) {
    await this.ensureMic();
    await this.post("match", { level, topics }).catch(this.releaseIfIdle);
  }

  async cancelMatch() {
    await this.post("cancel");
    if (!this.s.room) this.teardown();
  }

  async leave() {
    this.teardown();
    this.set({ room: null });
    await this.post("leave").catch(() => {});
  }

  async kick(target: string) {
    await this.post("kick", { target });
  }

  setMuted(muted: boolean) {
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    void this.post("mute", { muted }).catch(() => {});
  }

  /** Vào phòng / ghép lỗi → trả micro (đèn ghi âm tắt) rồi báo lỗi tiếp */
  private releaseIfIdle = (e: unknown): never => {
    if (!this.s.room && !this.s.waiting) this.teardown();
    throw e;
  };

  // ---- Sự kiện từ server ----

  private handle(e: SprechenEvent) {
    switch (e.type) {
      case "hello": {
        const lost = !!this.s.room;
        if (lost || this.s.waiting) this.teardown();
        this.ice = e.iceServers;
        this.set({
          connected: true,
          clientId: e.clientId,
          room: null,
          waiting: false,
          notice: lost ? "Mất kết nối nên bạn đã rời phòng. Hãy vào lại nhé." : this.s.notice,
        });
        break;
      }
      case "lobby":
        this.set({ online: e.online, rooms: e.rooms });
        break;
      case "matching":
        this.set({ waiting: e.waiting });
        break;
      case "joined":
        this.set({ room: e.room, waiting: false, notice: "" });
        for (const m of e.room.members) if (m.clientId !== this.s.clientId) void this.call(m.clientId);
        break;
      case "room":
        if (!e.room) {
          this.teardown();
          this.set({ room: null });
        } else {
          const ids = new Set(e.room.members.map((m) => m.clientId));
          for (const id of this.peers.keys()) if (!ids.has(id)) this.closePeer(id);
          this.set({ room: e.room });
        }
        break;
      case "kicked":
        this.set({ notice: e.reason });
        break;
      case "signal":
        this.inbox = this.inbox.then(() => this.onSignal(e.from, e.data as Signal)).catch(() => {});
        break;
    }
  }

  // ---- WebRTC ----

  private signal(to: string, data: Signal) {
    this.outbox = this.outbox.then(() => this.post("signal", { to, data })).catch(() => {});
  }

  private peer(id: string): Peer {
    const old = this.peers.get(id);
    if (old) return old;
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    const audio = new Audio();
    audio.autoplay = true;
    const p: Peer = { pc, audio, pending: [] };
    this.peers.set(id, p);
    this.mic?.getTracks().forEach((t) => pc.addTrack(t, this.mic!));
    pc.onicecandidate = (ev) => ev.candidate && this.signal(id, { candidate: ev.candidate.toJSON() });
    pc.ontrack = (ev) => {
      const stream = ev.streams[0] ?? new MediaStream([ev.track]);
      audio.srcObject = stream;
      void audio.play().catch(() => {});
      this.meter(id, stream);
    };
    pc.onconnectionstatechange = () => {
      if (this.peers.get(id)?.pc !== pc) return;
      this.set({ peerStates: { ...this.s.peerStates, [id]: pc.connectionState } });
    };
    return p;
  }

  /** Người vào sau: gửi offer tới người đã có trong phòng */
  private async call(id: string) {
    const { pc } = this.peer(id);
    await pc.setLocalDescription(await pc.createOffer());
    this.signal(id, { sdp: pc.localDescription!.toJSON() });
  }

  private async onSignal(from: string, data: Signal) {
    if (data.sdp?.type === "offer") {
      const p = this.peer(from);
      await p.pc.setRemoteDescription(data.sdp);
      await this.flush(p);
      await p.pc.setLocalDescription(await p.pc.createAnswer());
      this.signal(from, { sdp: p.pc.localDescription!.toJSON() });
    } else if (data.sdp?.type === "answer") {
      const p = this.peers.get(from);
      if (!p) return;
      await p.pc.setRemoteDescription(data.sdp);
      await this.flush(p);
    } else if (data.candidate) {
      // ICE có thể tới trước offer → giữ lại, thêm sau khi có remote description
      const p = this.peer(from);
      if (p.pc.remoteDescription) await p.pc.addIceCandidate(data.candidate).catch(() => {});
      else p.pending.push(data.candidate);
    }
  }

  private async flush(p: Peer) {
    for (const c of p.pending.splice(0)) await p.pc.addIceCandidate(c).catch(() => {});
  }

  private closePeer(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    p.pc.close();
    p.audio.srcObject = null;
    this.peers.delete(id);
    this.meters.delete(id);
    const { [id]: _, ...rest } = this.s.peerStates;
    void _;
    this.set({ peerStates: rest });
  }

  /** Đóng mọi kết nối, tắt micro */
  private teardown() {
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.mic?.getTracks().forEach((t) => t.stop());
    this.mic = null;
    this.meters.clear();
    if (this.meterTimer) clearInterval(this.meterTimer);
    this.meterTimer = null;
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.set({ speaking: [], peerStates: {} });
  }

  // ---- Đo âm lượng ----

  private meter(id: string, stream: MediaStream) {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
      const an = this.ctx.createAnalyser();
      an.fftSize = 512;
      this.ctx.createMediaStreamSource(stream).connect(an); // không nối ra loa: tiếng phát qua thẻ <audio>
      this.meters.set(id, an);
    } catch {
      return; // không đo được thì chỉ thiếu vòng "đang nói"
    }
    this.meterTimer ??= setInterval(() => this.tick(), 150);
  }

  private tick() {
    const buf = new Uint8Array(512);
    const me = this.s.clientId;
    const muted = this.s.room?.members.find((m) => m.clientId === me)?.muted;
    const speaking: string[] = [];
    for (const [id, an] of this.meters) {
      if (id === "me" && muted) continue;
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      if (Math.sqrt(sum / buf.length) > SPEAK_LEVEL) speaking.push(id === "me" ? (me ?? id) : id);
    }
    if (speaking.join() !== this.s.speaking.join()) this.set({ speaking });
  }
}
