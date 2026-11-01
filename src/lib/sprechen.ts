import "server-only";
import { randomBytes } from "node:crypto";
import type { Level, RoomView, SprechenEvent } from "./sprechen-types";

export { LEVELS, MAX_MEMBERS, type Level } from "./sprechen-types";
export type { SprechenEvent };

/**
 * Phòng luyện nói (Sprechen): gọi thoại WebRTC giữa người học, server chỉ làm "tổng đài" báo hiệu.
 * Mọi trạng thái nằm trong RAM (đủ cho 1 server Coolify) — khởi động lại thì phòng mất, client tự kết nối lại.
 * Mỗi tab trình duyệt = 1 client (1 luồng SSE); âm thanh đi thẳng giữa các trình duyệt (mesh, tối đa 5 người).
 */

type Client = {
  id: string;
  userId: number;
  name: string;
  avatarAt: number | null;
  muted: boolean;
  roomId: string | null;
  send: (e: SprechenEvent) => void;
  close: () => void;
};
type Room = Omit<RoomView, "members" | "hostId"> & { hostId: string; members: string[] };
type Waiting = { clientId: string; level: Level; topics: string[]; since: number };

// globalThis: dev (HMR) nạp lại module không làm mất phòng đang gọi
type State = { clients: Map<string, Client>; rooms: Map<string, Room>; queue: Waiting[] };
const g = globalThis as unknown as { __sprechen?: State };
const state: State = (g.__sprechen ??= { clients: new Map(), rooms: new Map(), queue: [] });

const newId = () => randomBytes(9).toString("base64url");

/** STUN công khai của Google + TURN riêng nếu có (mạng công ty / 4G có NAT chặt cần TURN mới nghe được nhau) */
function iceServers(): RTCIceServer[] {
  const list: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turn = process.env.TURN_URL?.split(",").map((s) => s.trim()).filter(Boolean);
  if (turn?.length) list.push({ urls: turn, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  return list;
}

function view(r: Room): RoomView {
  const members = r.members.flatMap((id) => {
    const c = state.clients.get(id);
    return c ? [{ clientId: c.id, userId: c.userId, name: c.name, avatarAt: c.avatarAt, muted: c.muted }] : [];
  });
  return { ...r, members };
}

const lobby = (): SprechenEvent => ({
  type: "lobby",
  online: new Set([...state.clients.values()].map((c) => c.userId)).size,
  rooms: [...state.rooms.values()].filter((r) => !r.private).map(view),
});

// Gom nhiều thay đổi trong cùng 1 nhịp thành 1 lần gửi danh sách phòng
let lobbyTimer: ReturnType<typeof setTimeout> | null = null;
function broadcastLobby() {
  lobbyTimer ??= setTimeout(() => {
    lobbyTimer = null;
    const e = lobby();
    for (const c of state.clients.values()) if (!c.roomId) c.send(e);
  }, 50);
}

function broadcastRoom(r: Room) {
  const e: SprechenEvent = { type: "room", room: view(r) };
  for (const id of r.members) state.clients.get(id)?.send(e);
}

// ---- Kết nối ----

export function connect(user: { id: number; name: string; avatarAt: number | null }, send: Client["send"], close: () => void): string {
  const id = newId();
  state.clients.set(id, { id, userId: user.id, name: user.name, avatarAt: user.avatarAt, muted: false, roomId: null, send, close });
  send({ type: "hello", clientId: id, iceServers: iceServers() });
  send(lobby());
  broadcastLobby();
  return id;
}

export function disconnect(clientId: string) {
  leave(clientId);
  cancelMatch(clientId);
  state.clients.delete(clientId);
  broadcastLobby();
}

/** Client của đúng người đang đăng nhập (không cho giả mạo clientId của người khác) */
export function clientOf(clientId: string, userId: number): Client | null {
  const c = state.clients.get(clientId);
  return c && c.userId === userId ? c : null;
}

// ---- Phòng ----

export function createRoom(
  c: Client,
  opts: { name: string; level: Level; topics: string[]; max: number; private: boolean },
): RoomView {
  leave(c.id);
  cancelMatch(c.id);
  const room: Room = { id: newId(), ...opts, hostId: c.id, members: [] };
  state.rooms.set(room.id, room);
  return join(c, room.id) as RoomView;
}

/** Vào phòng; trả về lỗi (chuỗi) nếu không vào được */
export function join(c: Client, roomId: string): RoomView | string {
  const r = state.rooms.get(roomId);
  if (!r) return "Phòng không còn tồn tại";
  if (c.roomId === roomId) return view(r);
  if (r.members.length >= r.max) return "Phòng đã đủ người";
  // Cùng tài khoản mở 2 tab: không cho vào 1 phòng 2 lần (tự nghe tiếng mình)
  if (r.members.some((id) => state.clients.get(id)?.userId === c.userId)) return "Bạn đã ở trong phòng này ở tab khác";
  leave(c.id);
  cancelMatch(c.id);
  r.members.push(c.id);
  c.roomId = r.id;
  c.muted = false;
  const v = view(r);
  c.send({ type: "joined", room: v });
  for (const id of r.members) if (id !== c.id) state.clients.get(id)?.send({ type: "room", room: v });
  broadcastLobby();
  return v;
}

export function leave(clientId: string) {
  const c = state.clients.get(clientId);
  const r = c?.roomId ? state.rooms.get(c.roomId) : null;
  if (!c || !r) return;
  c.roomId = null;
  r.members = r.members.filter((id) => id !== clientId);
  if (!r.members.length) state.rooms.delete(r.id);
  else {
    if (r.hostId === clientId) r.hostId = r.members[0]; // chủ phòng rời → người vào sớm nhất làm chủ
    broadcastRoom(r);
  }
  c.send({ type: "room", room: null });
  broadcastLobby(); // gồm cả người vừa rời (giờ đã ở sảnh)
}

export function setMuted(c: Client, muted: boolean) {
  c.muted = muted;
  const r = c.roomId ? state.rooms.get(c.roomId) : null;
  if (r) broadcastRoom(r);
}

/** Chủ phòng mời một người ra khỏi phòng */
export function kick(host: Client, target: string): string | null {
  const r = host.roomId ? state.rooms.get(host.roomId) : null;
  if (!r || r.hostId !== host.id) return "Chỉ chủ phòng mới làm được việc này";
  if (target === host.id || !r.members.includes(target)) return "Người này không ở trong phòng";
  state.clients.get(target)?.send({ type: "kicked", reason: "Chủ phòng đã mời bạn ra khỏi phòng" });
  leave(target);
  return null;
}

/** Chuyển offer / answer / ICE giữa 2 người cùng phòng */
export function relay(c: Client, to: string, data: unknown): boolean {
  const t = state.clients.get(to);
  if (!t || !c.roomId || t.roomId !== c.roomId) return false;
  t.send({ type: "signal", from: c.id, data });
  return true;
}

// ---- Ghép ngẫu nhiên 1-1 ----

/** Tìm người cùng trình độ đang chờ (ưu tiên trùng nhiều chủ đề); chưa có ai → xếp hàng chờ */
export function match(c: Client, level: Level, topics: string[]) {
  leave(c.id);
  cancelMatch(c.id);
  const overlap = (w: Waiting) => w.topics.filter((t) => topics.includes(t)).length;
  const candidates = state.queue
    .filter((w) => w.level === level && state.clients.get(w.clientId)?.userId !== c.userId)
    .sort((a, b) => overlap(b) - overlap(a) || a.since - b.since);
  const other = candidates[0] && state.clients.get(candidates[0].clientId);
  if (!other) {
    state.queue.push({ clientId: c.id, level, topics, since: Date.now() });
    c.send({ type: "matching", waiting: true });
    return;
  }
  state.queue = state.queue.filter((w) => w.clientId !== other.id); // không báo "hết chờ": sự kiện "joined" tới ngay sau
  const shared = topics.filter((t) => candidates[0].topics.includes(t));
  const room: Room = {
    id: newId(),
    name: `Gọi ngẫu nhiên ${level}`,
    level,
    topics: shared.length ? shared : [...new Set([...topics, ...candidates[0].topics])].slice(0, 3),
    max: 2,
    private: true,
    hostId: other.id,
    members: [],
  };
  state.rooms.set(room.id, room);
  join(other, room.id);
  join(c, room.id); // người vào sau gửi offer
}

export function cancelMatch(clientId: string) {
  const i = state.queue.findIndex((w) => w.clientId === clientId);
  if (i < 0) return;
  state.queue.splice(i, 1);
  state.clients.get(clientId)?.send({ type: "matching", waiting: false });
}
