import type { Mastery } from "@shared/srs";
import { File } from "expo-file-system";
import type { Segment } from "@shared/subtitles";
import { t } from "./i18n";

/** Gọi API /api/v1 của server web (Next.js). Lỗi → ném Error với thông báo tiếng Việt của server. */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type User = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  lang: string | null; // ngôn ngữ giao diện lưu theo tài khoản
  hasPassword?: boolean; // false = tài khoản Google / Apple chưa đặt mật khẩu (server cũ không gửi → coi như có)
  avatarUrl?: string | null; // "/api/v1/avatar/<id>?v=…" — xem cần token (dùng avatarSource)
  createdAt: string;
};

export type LessonSummary = {
  id: number;
  title: string;
  videoId: string;
  description: string;
  level: string;
  published: boolean;
  dictation: boolean; // admin bật luyện Chính tả cho bài (tắt = chỉ Shadowing)
  createdAt: string;
  segmentCount: number; // số dòng phụ đề thô
  sentenceCount?: number; // số câu sau khi gộp, như màn học đếm (server cũ không gửi → dùng segmentCount)
};
export type Lesson = Omit<LessonSummary, "segmentCount"> & { segments: Segment[] };

/** Tiến độ học 1 bài (GET/PUT /progress) — source: "/lesson/3" | "/watch/<videoId>" */
export type DictResult = { correct: number; total: number };
export type Progress = {
  source: string;
  title: string;
  idx: number;
  total: number;
  mode: "shadow" | "dictation";
  dictLevel: string;
  dictDone: Record<string, DictResult>;
  seen?: number[]; // các câu đã thực sự nghe (server cũ không gửi)
  updatedAt: number;
};
/** Mục trong danh sách tiến độ (GET /progress không có source) */
export type ProgressSummary = Omit<Progress, "dictDone" | "seen"> & { dictCount: number; seenCount?: number };
/** Thống kê học tập (GET /stats?tz=…) — ok = số lần nhớ được trên n lần ôn */
export type Rate = { n: number; ok: number };
export type Stats = {
  dueToday: number;
  streak: number;
  recall30: Rate;
  retention7: Rate;
  retention30: Rate;
  days: { day: string; reviews: number }[]; // 14 ngày, cũ → mới, "YYYY-MM-DD" theo giờ máy
  mastery: Record<Mastery, number>;
  forgotten: { id: number; word: string; meaning: string; lapses: number }[];
};

export type Track = { languageCode: string; name: string; auto: boolean };
export type Transcript = { videoId: string; title: string; track: Track; tracks: Track[]; segments: Segment[] };

/** Nghĩa 1 từ theo ngữ cảnh câu, kiểu nói hằng ngày (POST /word) */
export type WordInfo = { word: string; meaning: string };
/** Chi tiết cho tab Ví dụ / Giải thích (POST /word { detail: true }); từ cần học trong ví dụ được bọc **…** */
export type WordDetail = {
  lemma: string;
  pos: string;
  grammar: string;
  explanation: string;
  examples: { de: string; tr: string }[];
  // Các nghĩa phổ biến (nghĩa trong câu đứng đầu, current = true) — server cũ không gửi
  senses?: { meaning: string; use: string; de: string; tr: string; current: boolean }[];
  forms?: { form: string; note: string }[]; // các dạng quan trọng
  tip?: string; // mẹo nhớ
  cues?: { cue: string; meaning: string }[]; // từ đi kèm → nghĩa
  idiom?: { de: string; note: string } | null; // câu nói hay gặp
};

export type VocabItem = {
  id: number;
  word: string;
  meaning: string;
  context: string;
  sourceUrl: string | null;
  sourceTitle: string;
  createdAt: string;
  // Lịch ôn (lặp lại ngắt quãng) — server cũ không gửi → coi như từ mới
  stage?: number; // mức nhớ 0 (mới) … 8
  dueAt?: number | null; // ms, null = từ mới
  lapses?: number;
  mastery?: Mastery; // thành thạo suy ra từ lịch sử ôn (server cũ không gửi)
  examples?: VocabExample[]; // câu ví dụ thêm ngoài câu chính `context` (server cũ không gửi)
  // Danh từ (AI xác định dần qua POST /vocab/nouns): mạo từ, "-" = không phải danh từ, "" = chưa xác định, undefined = server cũ
  gender?: "der" | "die" | "das" | "-" | "";
  singular?: string;
  plural?: string;
};
export type VocabExample = { id: number; context: string; sourceUrl: string | null; sourceTitle: string };

let token: string | null = null;
export const setApiToken = (t: string | null) => {
  token = t;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown> = {}, // toàn bộ JSON lỗi server trả (vd. { error, id })
  ) {
    super(message);
  }
}

/**
 * Đếm số lần sổ từ thay đổi (lưu / sửa / xoá / ôn — mọi request không phải GET tới /vocab…).
 * Tab Từ vựng so số này để biết có cần tải lại sổ không, thay vì tải lại mỗi lần mở tab.
 */
let vocabVersion = 0;
export const getVocabVersion = () => vocabVersion;
/** Tương tự cho danh sách bài học (admin thêm / sửa / đăng / xoá bài) → tab Bài học tải lại */
let lessonsVersion = 0;
export const getLessonsVersion = () => lessonsVersion;

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  // FormData (gửi file ghi âm) → fetch tự đặt Content-Type multipart
  const form = init.body instanceof FormData;
  try {
    res = await fetch(API_URL + "/api/v1" + path, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined && !form ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form ? (init.body as FormData) : init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (e) {
    // Lỗi gốc chỉ in khi dev (vd. FormData sai kiểu cũng bị fetch ném ra như lỗi mạng)
    if (__DEV__) console.warn(`[api] không kết nối được ${API_URL}${path}`, e); // địa chỉ server chỉ hiện khi dev
    throw new ApiError(t("api.noConnection"), 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? t("api.serverError", { status: res.status }), res.status, data);
  if ((init.method ?? "GET") !== "GET" && /^\/vocab(\/|$)/.test(path)) vocabVersion++;
  if ((init.method ?? "GET") !== "GET" && /^\/lessons(\/|$)/.test(path)) lessonsVersion++;
  return data as T;
}

/**
 * FormData chỉ có 1 file (trường "file") từ file trên máy, để gửi lên server.
 * fetch của Expo (expo/fetch) KHÔNG nhận kiểu cũ của React Native { uri, name, type } → dùng File của expo-file-system
 * (đọc được bytes, tên file giữ đuôi .m4a / .jpg để server / Whisper nhận đúng định dạng).
 */
export function fileForm(uri: string): FormData {
  const body = new FormData();
  body.append("file", new File(uri) as unknown as Blob);
  return body;
}

/** Header đăng nhập cho request tự gọi ngoài api() (tải file, ảnh…) */
export const authHeaders = (): Record<string, string> | undefined => (token ? { Authorization: `Bearer ${token}` } : undefined);

/** Nguồn ảnh đại diện cho expo-image (kèm token — server chỉ cho chính chủ / admin xem) */
export const avatarSource = (url: string) => ({ uri: API_URL + url, headers: authHeaders() });

/** Ảnh bìa YouTube: mq 320×180 (ảnh nhỏ) · hq 480×360 (thẻ lớn trên iPad; có viền đen trên dưới, contentFit "cover" cắt đúng phần viền) */
export const thumb = (videoId: string, size: "mq" | "hq" = "mq") => `https://i.ytimg.com/vi/${videoId}/${size}default.jpg`;
