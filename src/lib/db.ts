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
  `);
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
  conn().prepare("INSERT OR REPLACE INTO transcript_cache (key, data, expires_at) VALUES (?, ?, ?)").run(
    key,
    JSON.stringify(data),
    ttlMs === null ? null : Date.now() + ttlMs,
  );
}

export type Role = "user" | "admin";

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
};

type UserRow = { id: number; email: string; name: string; password_hash: string; role: Role; created_at: string };

const toUser = (r: UserRow): User => ({ id: r.id, email: r.email, name: r.name, role: r.role, createdAt: r.created_at });

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

export function setUserPassword(id: number, passwordHash: string) {
  conn().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
}

export function createUser(u: { email: string; name: string; passwordHash: string; role: Role }): number {
  const res = conn()
    .prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(u.email, u.name, u.passwordHash, u.role);
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
