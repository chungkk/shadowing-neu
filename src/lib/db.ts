import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Segment } from "./subtitles";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

export type Lesson = {
  id: number;
  title: string;
  videoId: string;
  description: string;
  level: Level;
  segments: Segment[];
  published: boolean;
  createdAt: string;
};

export type LessonSummary = Omit<Lesson, "segments"> & { segmentCount: number };

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "shadow.db");

function open() {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH, { timeout: 5000 }); // chờ tối đa 5s nếu DB đang bị khoá
  db.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      video_id TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL DEFAULT 'A1',
      segments TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- Cache phụ đề đã lấy (YouTube / Whisper) để mở lại nhanh và không tốn tiền Whisper lần 2
    CREATE TABLE IF NOT EXISTS transcript_cache (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expires_at INTEGER -- ms, NULL = không hết hạn
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- Sổ từ vựng của từng người dùng (mỗi từ 1 dòng / người)
    CREATE TABLE IF NOT EXISTS vocab (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      word TEXT NOT NULL,
      meaning TEXT NOT NULL DEFAULT '',
      context TEXT NOT NULL DEFAULT '', -- câu chứa từ
      source_url TEXT, -- /lesson/1, /watch/abc… (null = file trên máy)
      source_title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, word)
    );
    -- Bản dịch câu (dùng chung mọi bài / người học, dịch 1 lần dùng mãi)
    CREATE TABLE IF NOT EXISTS translations (
      key TEXT PRIMARY KEY, -- "<ngôn ngữ>:<sha1 câu gốc>"
      text TEXT NOT NULL,
      translation TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  // Phụ đề YouTube trước đây chỉ lưu 7 ngày → giờ lưu vĩnh viễn
  db.exec("UPDATE transcript_cache SET expires_at = NULL WHERE key LIKE 'ytp:%' AND expires_at IS NOT NULL");
  // Cột thời điểm lưu (cho trang admin "Phụ đề đã lưu")
  const cols = db.prepare("PRAGMA table_info(transcript_cache)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "updated_at")) db.exec("ALTER TABLE transcript_cache ADD COLUMN updated_at INTEGER");
  // Ngôn ngữ giao diện app theo tài khoản (NULL = chưa chọn)
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some((c) => c.name === "lang")) db.exec("ALTER TABLE users ADD COLUMN lang TEXT");
  return db;
}

// Giữ 1 kết nối duy nhất (kể cả khi dev server hot-reload).
// Mở lúc dùng lần đầu, không mở lúc import (lúc build nhiều worker import cùng lúc → "database is locked").
const g = globalThis as unknown as { __db?: DatabaseSync };
const conn = () => (g.__db ??= open());

type Row = {
  id: number;
  title: string;
  video_id: string;
  description: string;
  level: Level;
  segments?: string;
  segment_count?: number;
  published: number;
  created_at: string;
};

const toSummary = (r: Row): LessonSummary => ({
  id: r.id,
  title: r.title,
  videoId: r.video_id,
  description: r.description,
  level: r.level,
  published: !!r.published,
  createdAt: r.created_at,
  segmentCount: r.segment_count ?? 0,
});

export function listLessons({ includeDrafts = false } = {}): LessonSummary[] {
  const rows = conn()
    .prepare(
      `SELECT id, title, video_id, description, level, published, created_at,
              json_array_length(segments) AS segment_count
       FROM lessons ${includeDrafts ? "" : "WHERE published = 1"}
       ORDER BY created_at DESC, id DESC`,
    )
    .all() as Row[];
  return rows.map(toSummary);
}

export function getLesson(id: number): Lesson | null {
  const r = conn().prepare("SELECT * FROM lessons WHERE id = ?").get(id) as Row | undefined;
  if (!r) return null;
  const { segmentCount, ...rest } = toSummary(r);
  void segmentCount;
  return { ...rest, segments: JSON.parse(r.segments!) };
}

export type LessonInput = Omit<Lesson, "id" | "createdAt">;

export function createLesson(l: LessonInput): number {
  const res = conn()
    .prepare(
      "INSERT INTO lessons (title, video_id, description, level, segments, published) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(l.title, l.videoId, l.description, l.level, JSON.stringify(l.segments), l.published ? 1 : 0);
  return Number(res.lastInsertRowid);
}

export function updateLesson(id: number, l: LessonInput) {
  conn().prepare(
    "UPDATE lessons SET title = ?, video_id = ?, description = ?, level = ?, segments = ?, published = ? WHERE id = ?",
  ).run(l.title, l.videoId, l.description, l.level, JSON.stringify(l.segments), l.published ? 1 : 0, id);
}

export function deleteLesson(id: number) {
  conn().prepare("DELETE FROM lessons WHERE id = ?").run(id);
}

export function getCached<T>(key: string): T | null {
  const r = conn().prepare("SELECT data, expires_at FROM transcript_cache WHERE key = ?").get(key) as
    | { data: string; expires_at: number | null }
    | undefined;
  if (!r || (r.expires_at !== null && r.expires_at < Date.now())) return null;
  return JSON.parse(r.data);
}

export function setCached(key: string, data: unknown, ttlMs: number | null) {
  conn()
    .prepare("INSERT OR REPLACE INTO transcript_cache (key, data, expires_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(key, JSON.stringify(data), ttlMs === null ? null : Date.now() + ttlMs, Date.now());
}

// ---- Phụ đề video YouTube đã lưu (trang admin) ----
// Khoá: "ytp:<videoId>:<default | mã track>" (phụ đề YouTube) và "yt:<videoId>:whisper" (Whisper)

export type SavedTranscript = {
  key: string;
  videoId: string;
  title: string;
  languageCode: string;
  trackName: string;
  auto: boolean;
  lines: number;
  updatedAt: number | null;
};

const SAVED_WHERE = "(key LIKE 'ytp:%' OR key LIKE 'yt:%:whisper')";

export function listSavedTranscripts(): SavedTranscript[] {
  const rows = conn()
    .prepare(
      `SELECT key, json_extract(data, '$.videoId') AS videoId, json_extract(data, '$.title') AS title,
              json_extract(data, '$.track.languageCode') AS languageCode, json_extract(data, '$.track.name') AS trackName,
              json_extract(data, '$.track.auto') AS auto, json_array_length(data, '$.segments') AS lines, updated_at AS updatedAt
       FROM transcript_cache WHERE ${SAVED_WHERE} ORDER BY updated_at DESC NULLS LAST, key`,
    )
    .all() as (Omit<SavedTranscript, "auto"> & { auto: number })[];
  return rows.map((r) => ({ ...r, auto: !!r.auto }));
}

export function savedTranscriptKeys(videoId: string): string[] {
  return (
    conn()
      .prepare(`SELECT key FROM transcript_cache WHERE ${SAVED_WHERE} AND (key LIKE ? OR key = ?)`)
      .all(`ytp:${videoId}:%`, `yt:${videoId}:whisper`) as { key: string }[]
  ).map((r) => r.key);
}

export function deleteSavedTranscripts(videoId: string) {
  for (const key of savedTranscriptKeys(videoId)) conn().prepare("DELETE FROM transcript_cache WHERE key = ?").run(key);
}

export type Role = "user" | "admin";

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  lang: string | null;
  createdAt: string;
};

type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  lang: string | null;
  created_at: string;
};

const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  lang: r.lang ?? null,
  createdAt: r.created_at,
});

export function getUserById(id: number): User | null {
  const r = conn().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return r ? toUser(r) : null;
}

/** Trả về cả password_hash — chỉ dùng trong lib/auth (kiểm tra đăng nhập / chữ ký phiên) */
export function getUserWithHash(by: { email: string } | { id: number }): (User & { passwordHash: string }) | null {
  const r = ("email" in by
    ? conn().prepare("SELECT * FROM users WHERE email = ?").get(by.email)
    : conn().prepare("SELECT * FROM users WHERE id = ?").get(by.id)) as UserRow | undefined;
  return r ? { ...toUser(r), passwordHash: r.password_hash } : null;
}

export function emailTaken(email: string, exceptId?: number): boolean {
  return !!conn().prepare("SELECT 1 FROM users WHERE email = ? AND id != ?").get(email, exceptId ?? -1);
}

export function updateUserProfile(id: number, p: { name: string; email: string }) {
  conn().prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(p.name, p.email, id);
}

export function setUserLang(id: number, lang: string) {
  conn().prepare("UPDATE users SET lang = ? WHERE id = ?").run(lang, id);
}

export function setUserPassword(id: number, passwordHash: string) {
  conn().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
}

export function createUser(u: { email: string; name: string; passwordHash: string; role: Role; lang?: string | null }): number {
  const res = conn()
    .prepare("INSERT INTO users (email, name, password_hash, role, lang) VALUES (?, ?, ?, ?, ?)")
    .run(u.email, u.name, u.passwordHash, u.role, u.lang ?? null);
  return Number(res.lastInsertRowid);
}

/** Tạo hoặc cập nhật tài khoản admin lấy từ biến môi trường (ADMIN_EMAIL + ADMIN_PASSWORD) */
export function upsertEnvAdmin(email: string, passwordHash: string): number {
  conn().prepare(
    `INSERT INTO users (email, name, password_hash, role) VALUES (?, 'Admin', ?, 'admin')
     ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = 'admin'`,
  ).run(email, passwordHash);
  return (conn().prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number }).id;
}

export function listUsers(): User[] {
  return (conn().prepare("SELECT * FROM users ORDER BY created_at DESC, id DESC").all() as UserRow[]).map(toUser);
}

export function setUserRole(id: number, role: Role) {
  conn().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
}

export function deleteUser(id: number) {
  conn().prepare("DELETE FROM vocab WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM users WHERE id = ?").run(id);
}

// ---- Sổ từ vựng ----

export type VocabItem = {
  id: number;
  word: string;
  meaning: string;
  context: string;
  sourceUrl: string | null;
  sourceTitle: string;
  createdAt: string;
};

type VocabRow = {
  id: number;
  word: string;
  meaning: string;
  context: string;
  source_url: string | null;
  source_title: string;
  created_at: string;
};

export function listVocab(userId: number): VocabItem[] {
  const rows = conn().prepare("SELECT * FROM vocab WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(userId) as VocabRow[];
  return rows.map((r) => ({
    id: r.id,
    word: r.word,
    meaning: r.meaning,
    context: r.context,
    sourceUrl: r.source_url,
    sourceTitle: r.source_title,
    createdAt: r.created_at,
  }));
}

/** Lưu từ; đã có thì cập nhật câu ví dụ + nguồn mới nhất (giữ nghĩa đã ghi) */
export function saveVocab(userId: number, v: { word: string; context: string; sourceUrl: string | null; sourceTitle: string }) {
  conn()
    .prepare(
      `INSERT INTO vocab (user_id, word, context, source_url, source_title) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, word) DO UPDATE SET context = excluded.context, source_url = excluded.source_url,
         source_title = excluded.source_title`,
    )
    .run(userId, v.word, v.context, v.sourceUrl, v.sourceTitle);
}

export function updateVocabMeaning(userId: number, id: number, meaning: string) {
  conn().prepare("UPDATE vocab SET meaning = ? WHERE id = ? AND user_id = ?").run(meaning, id, userId);
}

export function deleteVocab(userId: number, id: number) {
  conn().prepare("DELETE FROM vocab WHERE id = ? AND user_id = ?").run(id, userId);
}

export function setLessonPublished(id: number, published: boolean) {
  conn().prepare("UPDATE lessons SET published = ? WHERE id = ?").run(published ? 1 : 0, id);
}

// ---- Bản dịch câu ----

export function getTranslations(keys: string[]): Map<string, string> {
  const out = new Map<string, string>();
  const stmt = conn().prepare("SELECT translation FROM translations WHERE key = ?");
  for (const k of keys) {
    const r = stmt.get(k) as { translation: string } | undefined;
    if (r) out.set(k, r.translation);
  }
  return out;
}

export function saveTranslations(rows: { key: string; text: string; translation: string; provider: string }[]) {
  const stmt = conn().prepare(
    "INSERT OR REPLACE INTO translations (key, text, translation, provider) VALUES (?, ?, ?, ?)",
  );
  for (const r of rows) stmt.run(r.key, r.text, r.translation, r.provider);
}
