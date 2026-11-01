/** Hằng số + kiểu dùng chung giữa server (lib/sprechen.ts) và trình duyệt (components/Sprechen.tsx) */

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];
export const MAX_MEMBERS = 5;
export const MAX_TOPICS = 5;

export const TOPICS = [
  "Goethe-Prüfung",
  "telc-Prüfung",
  "Alltag",
  "Arbeit & Beruf",
  "Studium",
  "Reisen",
  "Essen",
  "Wohnen",
  "Familie",
  "Hobbys",
  "Musik",
  "Sport",
  "Filme",
  "Technik",
  "Gesundheit",
  "Einkaufen",
] as const;

export type Member = { clientId: string; userId: number; name: string; avatarAt: number | null; muted: boolean };
export type RoomView = {
  id: string;
  name: string;
  level: Level;
  topics: string[];
  max: number;
  private: boolean;
  hostId: string;
  members: Member[];
};

/** Sự kiện server gửi xuống trình duyệt qua SSE (/api/v1/sprechen/events) */
export type SprechenEvent =
  | { type: "hello"; clientId: string; iceServers: RTCIceServer[] }
  | { type: "lobby"; online: number; rooms: RoomView[] }
  | { type: "room"; room: RoomView | null }
  | { type: "joined"; room: RoomView } // người mới vào: gửi offer tới từng người đã ở trong phòng
  | { type: "signal"; from: string; data: unknown }
  | { type: "matching"; waiting: boolean }
  | { type: "kicked"; reason: string };
