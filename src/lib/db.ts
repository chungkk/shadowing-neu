import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SRS_INTERVALS, SRS_MAX_STAGE } from "./srs";
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
  dictation: boolean; // admin bật luyện Chính tả cho bài này (mặc định chỉ Shadowing)
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
    -- Tiến độ học của từng người cho từng bài / video (đồng bộ giữa web và app)
    CREATE TABLE IF NOT EXISTS progress (
      user_id INTEGER NOT NULL,
      source TEXT NOT NULL, -- "/lesson/3" | "/watch/<videoId>"
      title TEXT NOT NULL DEFAULT '',
      idx INTEGER NOT NULL DEFAULT 0, -- câu đang học (sau khi gộp câu)
      total INTEGER NOT NULL DEFAULT 0, -- tổng số câu
      mode TEXT NOT NULL DEFAULT 'shadow', -- 'shadow' | 'dictation'
      dict_level TEXT NOT NULL DEFAULT 'normal',
      dict_done TEXT NOT NULL DEFAULT '{}', -- {"<idx>": {"correct": 7, "total": 8}} câu chính tả đã làm
      updated_at INTEGER NOT NULL, -- ms
      PRIMARY KEY (user_id, source)
    );
    -- Chế độ Crazy: số lượt hét từng câu của từng người — giữ vĩnh viễn (không bị xoá theo progress)
    CREATE TABLE IF NOT EXISTS crazy_reps (
      user_id INTEGER NOT NULL,
      source TEXT NOT NULL, -- "/lesson/3" | "/watch/<videoId>"
      idx INTEGER NOT NULL, -- câu (sau khi gộp câu)
      reps INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0, -- từng đạt đủ To · Rõ · Nhanh
      updated_at INTEGER NOT NULL, -- ms
      PRIMARY KEY (user_id, source, idx)
    );
    -- Mã xác nhận email khi đăng ký (lưu dạng băm, mỗi email 1 mã mới nhất)
    CREATE TABLE IF NOT EXISTS email_codes (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL, -- ms
      sent_at INTEGER NOT NULL, -- ms
      attempts INTEGER NOT NULL DEFAULT 0
    );
    -- Bản dịch câu (dùng chung mọi bài / người học, dịch 1 lần dùng mãi)
    CREATE TABLE IF NOT EXISTS translations (
      key TEXT PRIMARY KEY, -- "<ngôn ngữ>:<sha1 câu gốc>"
      text TEXT NOT NULL,
      translation TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- Đăng nhập bằng Google / Apple: mỗi tài khoản Google / Apple gắn với 1 người dùng
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      provider TEXT NOT NULL, -- 'google' | 'apple'
      subject TEXT NOT NULL, -- id cố định của người dùng phía Google / Apple ("sub" trong ID token)
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      refresh_token TEXT, -- Apple: dùng để thu hồi quyền khi xoá tài khoản (App Store bắt buộc)
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (provider, subject)
    );
    CREATE INDEX IF NOT EXISTS oauth_accounts_user ON oauth_accounts (user_id);
  `);
  // Phụ đề YouTube trước đây chỉ lưu 7 ngày → giờ lưu vĩnh viễn
  db.exec("UPDATE transcript_cache SET expires_at = NULL WHERE key LIKE 'ytp:%' AND expires_at IS NOT NULL");
  // Cột thời điểm lưu (cho trang admin "Phụ đề đã lưu")
  const cols = db.prepare("PRAGMA table_info(transcript_cache)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "updated_at")) db.exec("ALTER TABLE transcript_cache ADD COLUMN updated_at INTEGER");
  // Ngôn ngữ giao diện app theo tài khoản (NULL = chưa chọn)
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some((c) => c.name === "lang")) db.exec("ALTER TABLE users ADD COLUMN lang TEXT");
  // Bài có luyện Chính tả không (admin bật khi thêm / sửa bài; bài cũ mặc định tắt)
  const lessonCols = db.prepare("PRAGMA table_info(lessons)").all() as { name: string }[];
  if (!lessonCols.some((c) => c.name === "dictation")) db.exec("ALTER TABLE lessons ADD COLUMN dictation INTEGER NOT NULL DEFAULT 0");
  // Lịch ôn từ vựng (lặp lại ngắt quãng): mức nhớ, hạn ôn tiếp, số lần quên
  const vocabCols = db.prepare("PRAGMA table_info(vocab)").all() as { name: string }[];
  if (!vocabCols.some((c) => c.name === "srs_stage")) {
    db.exec(`
      ALTER TABLE vocab ADD COLUMN srs_stage INTEGER NOT NULL DEFAULT 0; -- 0 = chưa ôn lần nào
      ALTER TABLE vocab ADD COLUMN due_at INTEGER; -- ms, NULL = từ mới
      ALTER TABLE vocab ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0;
    `);
  }
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
  dictation: number;
  created_at: string;
};

const toSummary = (r: Row): LessonSummary => ({
  id: r.id,
  title: r.title,
  videoId: r.video_id,
  description: r.description,
  level: r.level,
  published: !!r.published,
  dictation: !!r.dictation,
  createdAt: r.created_at,
  segmentCount: r.segment_count ?? 0,
});

export function listLessons({ includeDrafts = false } = {}): LessonSummary[] {
  const rows = conn()
    .prepare(
      `SELECT id, title, video_id, description, level, published, dictation, created_at,
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
      "INSERT INTO lessons (title, video_id, description, level, segments, published, dictation) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(l.title, l.videoId, l.description, l.level, JSON.stringify(l.segments), l.published ? 1 : 0, l.dictation ? 1 : 0);
  return Number(res.lastInsertRowid);
}

export function updateLesson(id: number, l: LessonInput) {
  conn().prepare(
    "UPDATE lessons SET title = ?, video_id = ?, description = ?, level = ?, segments = ?, published = ?, dictation = ? WHERE id = ?",
  ).run(l.title, l.videoId, l.description, l.level, JSON.stringify(l.segments), l.published ? 1 : 0, l.dictation ? 1 : 0, id);
}

export function deleteLesson(id: number) {
  conn().prepare("DELETE FROM lessons WHERE id = ?").run(id);
  conn().prepare("DELETE FROM progress WHERE source = ?").run(`/lesson/${id}`);
  conn().prepare("DELETE FROM crazy_reps WHERE source = ?").run(`/lesson/${id}`);
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
  hasPassword: boolean; // false = tài khoản tạo bằng Google / Apple, chưa đặt mật khẩu
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
  hasPassword: !r.password_hash.startsWith(NO_PASSWORD),
  createdAt: r.created_at,
});

/** Mở đầu password_hash của tài khoản chưa có mật khẩu (Google / Apple) — không khớp với mật khẩu nào */
export const NO_PASSWORD = "!";

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

// ---- Mã xác nhận email ----

export type EmailCode = { codeHash: string; expiresAt: number; sentAt: number; attempts: number };

export function getEmailCode(email: string): EmailCode | null {
  const r = conn().prepare("SELECT * FROM email_codes WHERE email = ?").get(email) as
    | { code_hash: string; expires_at: number; sent_at: number; attempts: number }
    | undefined;
  return r ? { codeHash: r.code_hash, expiresAt: r.expires_at, sentAt: r.sent_at, attempts: r.attempts } : null;
}

export function saveEmailCode(email: string, codeHash: string, expiresAt: number) {
  conn()
    .prepare(
      `INSERT INTO email_codes (email, code_hash, expires_at, sent_at, attempts) VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
         sent_at = excluded.sent_at, attempts = 0`,
    )
    .run(email, codeHash, expiresAt, Date.now());
  // Dọn mã đã hết hạn của người khác
  conn().prepare("DELETE FROM email_codes WHERE expires_at < ?").run(Date.now() - 24 * 3600 * 1000);
}

export function bumpEmailCodeAttempts(email: string) {
  conn().prepare("UPDATE email_codes SET attempts = attempts + 1 WHERE email = ?").run(email);
}

export function deleteEmailCode(email: string) {
  conn().prepare("DELETE FROM email_codes WHERE email = ?").run(email);
}

export function listUsers(): User[] {
  return (conn().prepare("SELECT * FROM users ORDER BY created_at DESC, id DESC").all() as UserRow[]).map(toUser);
}

export function setUserRole(id: number, role: Role) {
  conn().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
}

export function deleteUser(id: number) {
  conn().prepare("DELETE FROM oauth_accounts WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM vocab WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM progress WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM crazy_reps WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM users WHERE id = ?").run(id);
}

// ---- Tài khoản Google / Apple ----

export type OAuthProvider = "google" | "apple";

export function getOAuthUserId(provider: OAuthProvider, subject: string): number | null {
  const r = conn().prepare("SELECT user_id FROM oauth_accounts WHERE provider = ? AND subject = ?").get(provider, subject) as
    | { user_id: number }
    | undefined;
  return r?.user_id ?? null;
}

export function linkOAuth(provider: OAuthProvider, subject: string, userId: number, email: string) {
  conn()
    .prepare("INSERT OR IGNORE INTO oauth_accounts (provider, subject, user_id, email) VALUES (?, ?, ?, ?)")
    .run(provider, subject, userId, email);
}

export function setOAuthRefreshToken(provider: OAuthProvider, subject: string, token: string) {
  conn().prepare("UPDATE oauth_accounts SET refresh_token = ? WHERE provider = ? AND subject = ?").run(token, provider, subject);
}

/** Refresh token Apple của người dùng (để thu hồi khi xoá tài khoản) */
export function appleRefreshTokens(userId: number): string[] {
  return (
    conn().prepare("SELECT refresh_token FROM oauth_accounts WHERE user_id = ? AND provider = 'apple' AND refresh_token IS NOT NULL").all(userId) as {
      refresh_token: string;
    }[]
  ).map((r) => r.refresh_token);
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
  stage: number; // mức nhớ 0 (mới) … SRS_MAX_STAGE
  dueAt: number | null; // ms, null = từ mới
  lapses: number; // số lần ôn sai
};

type VocabRow = {
  id: number;
  word: string;
  meaning: string;
  context: string;
  source_url: string | null;
  source_title: string;
  created_at: string;
  srs_stage: number;
  due_at: number | null;
  lapses: number;
};

const toVocab = (r: VocabRow): VocabItem => ({
  id: r.id,
  word: r.word,
  meaning: r.meaning,
  context: r.context,
  sourceUrl: r.source_url,
  sourceTitle: r.source_title,
  createdAt: r.created_at,
  stage: r.srs_stage,
  dueAt: r.due_at,
  lapses: r.lapses,
});

export function listVocab(userId: number): VocabItem[] {
  const rows = conn().prepare("SELECT * FROM vocab WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(userId) as VocabRow[];
  return rows.map(toVocab);
}

/** Lưu từ; đã có thì cập nhật câu ví dụ + nguồn mới nhất (giữ nghĩa đã ghi). Trả về mục vừa lưu */
export function saveVocab(userId: number, v: { word: string; context: string; sourceUrl: string | null; sourceTitle: string }): VocabItem {
  const r = conn()
    .prepare(
      `INSERT INTO vocab (user_id, word, context, source_url, source_title) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, word) DO UPDATE SET context = excluded.context, source_url = excluded.source_url,
         source_title = excluded.source_title
       RETURNING *`,
    )
    .get(userId, v.word, v.context, v.sourceUrl, v.sourceTitle) as VocabRow;
  return toVocab(r);
}

export function getVocab(userId: number, id: number): { word: string; context: string } | undefined {
  return conn().prepare("SELECT word, context FROM vocab WHERE id = ? AND user_id = ?").get(id, userId) as
    | { word: string; context: string }
    | undefined;
}

/** false = không có từ này (của người này) */
export function updateVocabMeaning(userId: number, id: number, meaning: string): boolean {
  return conn().prepare("UPDATE vocab SET meaning = ? WHERE id = ? AND user_id = ?").run(meaning, id, userId).changes > 0;
}

const DAY = 86_400_000;

/**
 * Chấm 1 lần ôn. Đúng → lên 1 mức, hẹn xa hơn (ôn sớm khi chưa tới hạn thì giữ nguyên lịch);
 * sai → tụt về nửa mức cũ, ôn lại ngày mai. null = không có từ này (của người này)
 */
export function reviewVocab(userId: number, id: number, correct: boolean, now = Date.now()): { stage: number; dueAt: number } | null {
  const r = conn().prepare("SELECT srs_stage, due_at FROM vocab WHERE id = ? AND user_id = ?").get(id, userId) as
    | { srs_stage: number; due_at: number | null }
    | undefined;
  if (!r) return null;
  if (correct && r.due_at != null && r.due_at > now) return { stage: r.srs_stage, dueAt: r.due_at };
  const stage = correct ? Math.min(r.srs_stage + 1, SRS_MAX_STAGE) : Math.max(1, Math.floor(r.srs_stage / 2));
  // Trừ vài giờ để hôm sau ôn sớm hơn giờ hôm nay một chút vẫn tính là tới hạn
  const dueAt = now + SRS_INTERVALS[stage] * DAY - 4 * 3_600_000;
  conn()
    .prepare("UPDATE vocab SET srs_stage = ?, due_at = ?, lapses = lapses + ? WHERE id = ? AND user_id = ?")
    .run(stage, dueAt, correct ? 0 : 1, id, userId);
  return { stage, dueAt };
}

/** false = không có từ này (của người này) */
export function deleteVocab(userId: number, id: number): boolean {
  return conn().prepare("DELETE FROM vocab WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
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

// ---- Tiến độ học ----

export type DictResult = { correct: number; total: number };
export type Progress = {
  source: string;
  title: string;
  idx: number;
  total: number;
  mode: "shadow" | "dictation";
  dictLevel: string;
  dictDone: Record<string, DictResult>;
  updatedAt: number;
};

type ProgressRow = {
  source: string;
  title: string;
  idx: number;
  total: number;
  mode: Progress["mode"];
  dict_level: string;
  dict_done: string;
  updated_at: number;
};

const toProgress = (r: ProgressRow): Progress => ({
  source: r.source,
  title: r.title,
  idx: r.idx,
  total: r.total,
  mode: r.mode,
  dictLevel: r.dict_level,
  dictDone: JSON.parse(r.dict_done),
  updatedAt: r.updated_at,
});

export function getProgress(userId: number, source: string): Progress | null {
  const r = conn().prepare("SELECT * FROM progress WHERE user_id = ? AND source = ?").get(userId, source) as ProgressRow | undefined;
  return r ? toProgress(r) : null;
}

/** Mọi bài người này đã học, mới nhất trước */
export function listProgress(userId: number): Progress[] {
  return (conn().prepare("SELECT * FROM progress WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as ProgressRow[]).map(toProgress);
}

const MAX_PROGRESS = 300;

export function saveProgress(userId: number, p: Omit<Progress, "updatedAt">) {
  conn()
    .prepare(
      `INSERT INTO progress (user_id, source, title, idx, total, mode, dict_level, dict_done, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, source) DO UPDATE SET title = excluded.title, idx = excluded.idx, total = excluded.total,
         mode = excluded.mode, dict_level = excluded.dict_level, dict_done = excluded.dict_done, updated_at = excluded.updated_at`,
    )
    .run(userId, p.source, p.title, p.idx, p.total, p.mode, p.dictLevel, JSON.stringify(p.dictDone), Date.now());
  // Chỉ giữ MAX_PROGRESS bài học gần nhất / người (source /watch/<id> là tuỳ ý → không giới hạn thì DB phình mãi)
  conn()
    .prepare(
      `DELETE FROM progress WHERE user_id = ? AND source NOT IN
         (SELECT source FROM progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?)`,
    )
    .run(userId, userId, MAX_PROGRESS);
}

export function deleteProgress(userId: number, source: string) {
  conn().prepare("DELETE FROM progress WHERE user_id = ? AND source = ?").run(userId, source);
}

// ---- Chế độ Crazy: số lượt hét từng câu ----

export type CrazyRep = { reps: number; passed: boolean };

/** Số lượt từng câu của 1 bài: {"<idx>": {reps, passed}} */
export function getCrazyReps(userId: number, source: string): Record<string, CrazyRep> {
  const rows = conn().prepare("SELECT idx, reps, passed FROM crazy_reps WHERE user_id = ? AND source = ?").all(userId, source) as {
    idx: number;
    reps: number;
    passed: number;
  }[];
  return Object.fromEntries(rows.map((r) => [r.idx, { reps: r.reps, passed: !!r.passed }]));
}

/** +1 lượt cho 1 câu (cộng trên server → học trên 2 máy cùng lúc không lệch số); đã đạt thì giữ đạt */
export function addCrazyRep(userId: number, source: string, idx: number, passed: boolean): CrazyRep {
  const r = conn()
    .prepare(
      `INSERT INTO crazy_reps (user_id, source, idx, reps, passed, updated_at) VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(user_id, source, idx) DO UPDATE SET reps = reps + 1, passed = MAX(passed, excluded.passed), updated_at = excluded.updated_at
       RETURNING reps, passed`,
    )
    .get(userId, source, idx, passed ? 1 : 0, Date.now()) as { reps: number; passed: number };
  return { reps: r.reps, passed: !!r.passed };
}

/** Tổng theo bài: source → { reps: tổng số lượt, passed: số câu đã đạt } */
export function crazySummary(userId: number): Map<string, { reps: number; passed: number }> {
  const rows = conn()
    .prepare("SELECT source, SUM(reps) AS reps, SUM(passed) AS passed FROM crazy_reps WHERE user_id = ? GROUP BY source")
    .all(userId) as { source: string; reps: number; passed: number }[];
  return new Map(rows.map((r) => [r.source, { reps: r.reps, passed: r.passed }]));
}
