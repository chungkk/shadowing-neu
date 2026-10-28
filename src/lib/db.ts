import "server-only";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isSentence } from "./review";
import { isDue, MASTERY_GAP_DAYS, masteryOf, nextSchedule, type Grade, type Mastery } from "./srs";
import { mergeIntoSentences, type Segment } from "./subtitles";

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

export type LessonSummary = Omit<Lesson, "segments"> & {
  segmentCount: number; // số dòng phụ đề thô
  sentenceCount?: number; // số câu sau khi gộp (như màn học đếm) — chỉ có trong danh sách bài
};

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "shadow.db");
/** Ảnh đại diện lưu thành file cạnh DB (cùng volume dữ liệu trên VPS) */
export const AVATAR_DIR = path.join(path.dirname(DB_PATH), "avatars");
/** Giọng đọc mẫu (mp3) đã tạo — mỗi câu chỉ tạo 1 lần, dùng chung cho mọi người học */
export const TTS_DIR = path.join(path.dirname(DB_PATH), "tts");

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
      source TEXT NOT NULL, -- "/lesson/3" | "/watch/<videoId>" | "/vocab/<id>" (ôn tập Crazy Deutsch)
      idx INTEGER NOT NULL, -- câu (sau khi gộp câu); mục sổ từ vựng luôn là 0
      reps INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0, -- từng đạt đủ To · Rõ · Nhanh
      updated_at INTEGER NOT NULL, -- ms
      PRIMARY KEY (user_id, source, idx)
    );
    -- Lịch sử ôn: mỗi lần ôn 1 dòng (không ghi đè) → đo độ chính xác nhớ lại, còn nhớ sau 7/30 ngày, hiệu quả từng dạng bài
    CREATE TABLE IF NOT EXISTS review_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vocab_id INTEGER NOT NULL,
      at INTEGER NOT NULL, -- ms
      mode TEXT NOT NULL DEFAULT 'duolingo', -- 'duolingo' | 'crazy'
      exercise TEXT NOT NULL DEFAULT '', -- dạng bài: choose-meaning, flash, recall…
      grade TEXT NOT NULL, -- 'again' | 'hard' | 'good' | 'easy'
      recall INTEGER, -- tự đánh giá nhớ 0–3 (Crazy)
      speaking INTEGER, -- tự đánh giá nói 0–2 (Crazy)
      auto_clear REAL, -- tỉ lệ từ máy nghe ra 0–1 (Crazy, null = không chấm được)
      stage_before INTEGER NOT NULL,
      stage_after INTEGER NOT NULL,
      gap_days REAL -- số ngày kể từ lần ôn trước của mục này (null = lần đầu)
    );
    CREATE INDEX IF NOT EXISTS review_events_user ON review_events (user_id, vocab_id, at);
    -- Câu ví dụ thêm của 1 mục sổ từ (gặp lại từ ở câu khác). Câu chính vẫn ở vocab.context — nghĩa được ghi theo câu đó
    CREATE TABLE IF NOT EXISTS vocab_examples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vocab_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      context TEXT NOT NULL,
      source_url TEXT, -- /lesson/1, /watch/abc… (null = tự thêm / không rõ)
      source_title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (vocab_id, context)
    );
    CREATE INDEX IF NOT EXISTS vocab_examples_user ON vocab_examples (user_id, vocab_id);
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
  // Ảnh đại diện: thời điểm đổi ảnh (ms) — làm phiên bản cho URL ảnh; NULL = chưa có ảnh (file ở AVATAR_DIR)
  if (!userCols.some((c) => c.name === "avatar_at")) db.exec("ALTER TABLE users ADD COLUMN avatar_at INTEGER");
  // Bài có luyện Chính tả không (admin bật khi thêm / sửa bài; bài cũ mặc định tắt)
  const lessonCols = db.prepare("PRAGMA table_info(lessons)").all() as { name: string }[];
  if (!lessonCols.some((c) => c.name === "dictation")) db.exec("ALTER TABLE lessons ADD COLUMN dictation INTEGER NOT NULL DEFAULT 0");
  // Tiến độ: các câu đã thực sự nghe (% tính theo số này, không theo câu đang mở).
  // Tiến độ cũ chỉ có câu đang học → coi mọi câu tới đó là đã nghe, để % đang hiện không bị tụt
  const progressCols = db.prepare("PRAGMA table_info(progress)").all() as { name: string }[];
  if (!progressCols.some((c) => c.name === "seen")) {
    db.exec("BEGIN");
    db.exec("ALTER TABLE progress ADD COLUMN seen TEXT NOT NULL DEFAULT '[]'"); // [0, 1, 4, …]
    const fill = db.prepare("UPDATE progress SET seen = ? WHERE user_id = ? AND source = ?");
    for (const r of db.prepare("SELECT user_id, source, idx FROM progress").all() as { user_id: number; source: string; idx: number }[])
      fill.run(JSON.stringify(Array.from({ length: r.idx + 1 }, (_, i) => i)), r.user_id, r.source);
    db.exec("COMMIT");
  }
  // Lịch ôn từ vựng (lặp lại ngắt quãng): mức nhớ, hạn ôn tiếp, số lần quên
  const vocabCols = db.prepare("PRAGMA table_info(vocab)").all() as { name: string }[];
  if (!vocabCols.some((c) => c.name === "srs_stage")) {
    db.exec(`
      ALTER TABLE vocab ADD COLUMN srs_stage INTEGER NOT NULL DEFAULT 0; -- 0 = chưa ôn lần nào
      ALTER TABLE vocab ADD COLUMN due_at INTEGER; -- ms, NULL = từ mới
      ALTER TABLE vocab ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0;
    `);
  }
  // Danh từ: mạo từ (giống) + dạng số ít / số nhiều — AI xác định dần ('' = chưa xác định, '-' = không phải danh từ)
  if (!vocabCols.some((c) => c.name === "gender")) {
    db.exec(`
      ALTER TABLE vocab ADD COLUMN gender TEXT NOT NULL DEFAULT ''; -- 'der' | 'die' | 'das' | '-' | ''
      ALTER TABLE vocab ADD COLUMN singular TEXT NOT NULL DEFAULT '';
      ALTER TABLE vocab ADD COLUMN plural TEXT NOT NULL DEFAULT '';
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
  return rows.map((r) => ({ ...toSummary(r), sentenceCount: sentenceCount(r.id) }));
}

/**
 * Số câu của bài sau khi gộp dòng phụ đề thành câu (đúng số màn học hiện "Câu 3/52").
 * Tính 1 lần mỗi bài rồi giữ trong bộ nhớ; deploy lại (có thể đổi cách gộp) thì tự tính lại.
 */
const sentenceCounts = new Map<number, number>();
function sentenceCount(id: number): number {
  let n = sentenceCounts.get(id);
  if (n === undefined) {
    const r = conn().prepare("SELECT segments FROM lessons WHERE id = ?").get(id) as { segments: string } | undefined;
    n = r ? mergeIntoSentences(JSON.parse(r.segments)).length : 0;
    sentenceCounts.set(id, n);
  }
  return n;
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
  sentenceCounts.delete(id);
}

export function deleteLesson(id: number) {
  sentenceCounts.delete(id);
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
  avatarAt: number | null; // ms lúc đổi ảnh đại diện, null = chưa có
};

type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  lang: string | null;
  created_at: string;
  avatar_at: number | null;
};

const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  lang: r.lang ?? null,
  hasPassword: !r.password_hash.startsWith(NO_PASSWORD),
  createdAt: r.created_at,
  avatarAt: r.avatar_at ?? null,
});

/** Ghi / xoá (null) mốc ảnh đại diện */
export function setUserAvatar(id: number, at: number | null) {
  conn().prepare("UPDATE users SET avatar_at = ? WHERE id = ?").run(at, id);
}

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
  conn().prepare("DELETE FROM vocab_examples WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM progress WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM crazy_reps WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM review_events WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM users WHERE id = ?").run(id);
  rmSync(path.join(AVATAR_DIR, String(id)), { force: true }); // ảnh đại diện
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
  mastery: Mastery; // suy ra từ mức nhớ + lịch sử ôn (review_events)
  examples: VocabExample[]; // câu ví dụ thêm (ngoài câu chính `context`), cũ → mới
  gender: NounGender; // danh từ: mạo từ; '-' = không phải danh từ; '' = chưa xác định
  singular: string; // danh từ: dạng số ít (không mạo từ) — "" nếu chưa biết / không phải danh từ
  plural: string; // danh từ: dạng số nhiều (không mạo từ), "" nếu không có / chưa biết
};
export type VocabExample = { id: number; context: string; sourceUrl: string | null; sourceTitle: string };
export type NounGender = "der" | "die" | "das" | "-" | "";

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
  gender: NounGender;
  singular: string;
  plural: string;
};

const toVocab = (r: VocabRow, proven = false, examples: VocabExample[] = []): VocabItem => ({
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
  mastery: masteryOf(r.srs_stage, proven),
  examples,
  gender: r.gender ?? "",
  singular: r.singular ?? "",
  plural: r.plural ?? "",
});

const MAX_EXAMPLES = 20; // câu ví dụ thêm tối đa mỗi mục

/** Câu ví dụ thêm của các mục (1 truy vấn cho cả sổ), nhóm theo mục */
function examplesOf(userId: number, vocabId?: number): Map<number, VocabExample[]> {
  const rows = conn()
    .prepare(
      `SELECT id, vocab_id, context, source_url, source_title FROM vocab_examples
       WHERE user_id = ? ${vocabId === undefined ? "" : "AND vocab_id = ?"} ORDER BY id`,
    )
    .all(...(vocabId === undefined ? [userId] : [userId, vocabId])) as {
    id: number;
    vocab_id: number;
    context: string;
    source_url: string | null;
    source_title: string;
  }[];
  const out = new Map<number, VocabExample[]>();
  for (const r of rows) {
    const list = out.get(r.vocab_id) ?? out.set(r.vocab_id, []).get(r.vocab_id)!;
    list.push({ id: r.id, context: r.context, sourceUrl: r.source_url, sourceTitle: r.source_title });
  }
  return out;
}

/**
 * Các mục đã "chứng minh" nhớ lâu: từng nhớ lại đúng sau khoảng cách ≥ MASTERY_GAP_DAYS ngày,
 * ở dạng bài không tự khai báo (thẻ lật "Tôi biết", tự chấm "recall-self" không tính) và phải tự nhớ ra
 * (Luyện to "shadow" nghe mẫu rồi nói theo, nhớ lại có gợi ý "cued" không tính)
 */
function provenIds(userId: number): Set<number> {
  const rows = conn()
    .prepare(
      `SELECT DISTINCT vocab_id FROM review_events
       WHERE user_id = ? AND grade IN ('good', 'easy') AND exercise NOT IN ('flash', 'shadow', 'recall-self', 'cued') AND gap_days >= ?`,
    )
    .all(userId, MASTERY_GAP_DAYS) as { vocab_id: number }[];
  return new Set(rows.map((r) => r.vocab_id));
}

export function listVocab(userId: number): VocabItem[] {
  const rows = conn().prepare("SELECT * FROM vocab WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(userId) as VocabRow[];
  const proven = provenIds(userId);
  const examples = examplesOf(userId);
  return rows.map((r) => toVocab(r, proven.has(r.id), examples.get(r.id)));
}

/** "heute" ↔ "Heute": cùng từ, chỉ khác viết hoa chữ cái đầu (đứng đầu câu / danh từ) */
const caseVariants = (w: string) => [...new Set([w, w[0].toLowerCase() + w.slice(1), w[0].toUpperCase() + w.slice(1)])];

/**
 * Lưu từ. Đã có (kể cả chỉ khác viết hoa chữ cái đầu, vd. từ đứng đầu câu "Heute" ~ "heute") → giữ mục cũ:
 * giữ nghĩa, giữ câu ví dụ + nguồn gốc (nghĩa được ghi theo câu đó); mục cũ chưa có câu ví dụ thì điền câu mới.
 * Mục cũ viết hoa mà lần này gặp dạng viết thường (giữa câu → chắc chắn không phải danh từ) → đổi về viết thường.
 * Trả về mục vừa lưu.
 */
export function saveVocab(userId: number, v: { word: string; context: string; sourceUrl: string | null; sourceTitle: string }): VocabItem {
  const variants = caseVariants(v.word);
  const found = conn()
    .prepare(`SELECT id, word, context FROM vocab WHERE user_id = ? AND word IN (${variants.map(() => "?").join(", ")})`)
    .all(userId, ...variants) as { id: number; word: string; context: string }[];
  const old = found.find((f) => f.word === v.word) ?? (found.length === 1 ? found[0] : undefined);
  if (!old) {
    const r = conn()
      .prepare(`INSERT INTO vocab (user_id, word, context, source_url, source_title) VALUES (?, ?, ?, ?, ?) RETURNING *`)
      .get(userId, v.word, v.context, v.sourceUrl, v.sourceTitle) as VocabRow;
    return toVocab(r, false);
  }
  const lowerFirst = v.word[0] !== v.word[0].toUpperCase();
  const word = old.word !== v.word && lowerFirst ? v.word : old.word;
  const r = conn()
    .prepare(
      `UPDATE vocab SET word = ?,
         source_url = CASE WHEN context = '' THEN ? ELSE source_url END,
         source_title = CASE WHEN context = '' THEN ? ELSE source_title END,
         context = CASE WHEN context = '' THEN ? ELSE context END
       WHERE id = ? RETURNING *`,
    )
    .get(word, v.sourceUrl, v.sourceTitle, v.context, old.id) as VocabRow;
  // Gặp lại ở câu khác → giữ thêm làm câu ví dụ (không trùng câu chính / câu đã có, tối đa MAX_EXAMPLES)
  const ctx = v.context.trim();
  if (old.context && ctx && ctx !== old.context.trim()) {
    const n = conn().prepare("SELECT COUNT(*) AS n FROM vocab_examples WHERE vocab_id = ?").get(old.id) as { n: number };
    if (n.n < MAX_EXAMPLES)
      conn()
        .prepare("INSERT OR IGNORE INTO vocab_examples (vocab_id, user_id, context, source_url, source_title) VALUES (?, ?, ?, ?, ?)")
        .run(old.id, userId, ctx, v.sourceUrl, v.sourceTitle);
  }
  return toVocab(r, provenIds(userId).has(r.id), examplesOf(userId, old.id).get(old.id));
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

export type ReviewInput = {
  grade: Grade;
  mode: "duolingo" | "crazy";
  exercise: string;
  recall: number | null;
  speaking: number | null;
  autoClear: number | null;
};

/**
 * Chấm 1 lần ôn (lịch: nextSchedule trong srs.ts) và ghi lại thành 1 sự kiện trong review_events.
 * null = không có từ này (của người này)
 */
export function reviewVocab(
  userId: number,
  id: number,
  ev: ReviewInput,
  now = Date.now(),
): { stage: number; dueAt: number; mastery: Mastery } | null {
  const r = conn().prepare("SELECT srs_stage, due_at FROM vocab WHERE id = ? AND user_id = ?").get(id, userId) as
    | { srs_stage: number; due_at: number | null }
    | undefined;
  if (!r) return null;
  const next = nextSchedule({ stage: r.srs_stage, dueAt: r.due_at }, ev.grade, now);
  const last = conn().prepare("SELECT MAX(at) AS at FROM review_events WHERE user_id = ? AND vocab_id = ?").get(userId, id) as {
    at: number | null;
  };
  conn()
    .prepare("UPDATE vocab SET srs_stage = ?, due_at = ?, lapses = lapses + ? WHERE id = ? AND user_id = ?")
    .run(next.stage, next.dueAt, next.lapse ? 1 : 0, id, userId);
  conn()
    .prepare(
      `INSERT INTO review_events (user_id, vocab_id, at, mode, exercise, grade, recall, speaking, auto_clear, stage_before, stage_after, gap_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      userId,
      id,
      now,
      ev.mode,
      ev.exercise,
      ev.grade,
      ev.recall,
      ev.speaking,
      ev.autoClear,
      r.srs_stage,
      next.stage,
      last.at == null ? null : (now - last.at) / DAY,
    );
  return { stage: next.stage, dueAt: next.dueAt, mastery: masteryOf(next.stage, provenIds(userId).has(id)) };
}

/** false = không có từ này (của người này) */
export function deleteVocab(userId: number, id: number): boolean {
  conn().prepare("DELETE FROM crazy_reps WHERE user_id = ? AND source = ?").run(userId, `/vocab/${id}`);
  conn().prepare("DELETE FROM review_events WHERE user_id = ? AND vocab_id = ?").run(userId, id);
  conn().prepare("DELETE FROM vocab_examples WHERE user_id = ? AND vocab_id = ?").run(userId, id);
  return conn().prepare("DELETE FROM vocab WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

/** Xoá nhiều mục 1 lần (1 giao dịch) → số mục đã xoá */
export function deleteVocabs(userId: number, ids: number[]): number {
  const db = conn();
  db.exec("BEGIN");
  try {
    let n = 0;
    for (const id of ids) if (deleteVocab(userId, id)) n++;
    db.exec("COMMIT");
    return n;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Xoá 1 câu ví dụ thêm → false = không có (của người này) */
export function deleteVocabExample(userId: number, vocabId: number, exampleId: number): boolean {
  return conn().prepare("DELETE FROM vocab_examples WHERE id = ? AND vocab_id = ? AND user_id = ?").run(exampleId, vocabId, userId).changes > 0;
}

/** Các mục (của người này) chưa xác định có phải danh từ không — để AI xác định mạo từ */
export function vocabNounsUnknown(userId: number, ids: number[]): { id: number; word: string; context: string }[] {
  if (!ids.length) return [];
  return conn()
    .prepare(`SELECT id, word, context FROM vocab WHERE user_id = ? AND gender = '' AND id IN (${ids.map(() => "?").join(", ")})`)
    .all(userId, ...ids) as { id: number; word: string; context: string }[];
}

export function setVocabNoun(userId: number, id: number, n: { gender: NounGender; singular: string; plural: string }) {
  conn().prepare("UPDATE vocab SET gender = ?, singular = ?, plural = ? WHERE id = ? AND user_id = ?").run(n.gender, n.singular, n.plural, id, userId);
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
  seen: number[]; // các câu đã thực sự nghe (Shadowing) — % tiến độ tính theo số này
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
  seen: string;
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
  seen: JSON.parse(r.seen ?? "[]"),
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
      `INSERT INTO progress (user_id, source, title, idx, total, mode, dict_level, dict_done, seen, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, source) DO UPDATE SET title = excluded.title, idx = excluded.idx, total = excluded.total,
         mode = excluded.mode, dict_level = excluded.dict_level, dict_done = excluded.dict_done, seen = excluded.seen,
         updated_at = excluded.updated_at`,
    )
    .run(userId, p.source, p.title, p.idx, p.total, p.mode, p.dictLevel, JSON.stringify(p.dictDone), JSON.stringify(p.seen), Date.now());
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

/** Ôn tập Crazy Deutsch: số lượt hét mọi mục trong sổ từ vựng → {"<id vocab>": {reps, passed}} */
export function getCrazyVocabReps(userId: number): Record<string, CrazyRep> {
  const rows = conn()
    .prepare("SELECT source, reps, passed FROM crazy_reps WHERE user_id = ? AND source LIKE '/vocab/%'")
    .all(userId) as { source: string; reps: number; passed: number }[];
  return Object.fromEntries(rows.map((r) => [r.source.slice("/vocab/".length), { reps: r.reps, passed: !!r.passed }]));
}

// ---- Thống kê học tập (màn Thống kê trên app) ----

export type Rate = { n: number; ok: number }; // ok = nhớ được (good / easy) trên n lần ôn
export type Stats = {
  dueToday: number; // mục tới hạn ôn
  streak: number; // số ngày liên tiếp có ôn (tính tới hôm nay, hoặc hôm qua nếu hôm nay chưa ôn)
  recall30: Rate & { duolingo: Rate; crazy: Rate }; // nhớ lại trong 30 ngày qua
  retention7: Rate; // lần ôn cách lần trước ≥ 7 ngày — còn nhớ không
  retention30: Rate; // … ≥ 30 ngày
  days: { day: string; reviews: number }[]; // 14 ngày gần nhất (theo giờ máy người học), cũ → mới
  mastery: Record<Mastery, number>;
  speaking: { reps: number; sentences: number; totalSentences: number }; // lượt nói (Luyện câu ⭐) · số câu đã luyện / có
  forgotten: { id: number; word: string; meaning: string; lapses: number }[]; // hay quên nhất
};

const rate = (rows: { grade: string }[]): Rate => ({ n: rows.length, ok: rows.filter((r) => r.grade === "good" || r.grade === "easy").length });

/** tzOffset: phút, như Date.getTimezoneOffset() của máy người học (VN = -420) — để chia ngày đúng giờ địa phương */
export function getStats(userId: number, tzOffset: number, now = Date.now()): Stats {
  const dayOf = (ms: number) => new Date(ms - tzOffset * 60_000).toISOString().slice(0, 10);
  const events = conn()
    .prepare("SELECT at, grade, mode, exercise, gap_days FROM review_events WHERE user_id = ? AND at >= ?")
    .all(userId, now - 90 * DAY) as { at: number; grade: Grade; mode: string; exercise: string; gap_days: number | null }[];

  // Tỉ lệ nhớ lại không tính lượt Luyện to (nghe mẫu rồi nói theo, không phải tự nhớ ra)
  const recalls = events.filter((e) => e.exercise !== "shadow");
  const last30 = recalls.filter((e) => e.at >= now - 30 * DAY);
  const counts = new Map<string, number>();
  for (const e of events) counts.set(dayOf(e.at), (counts.get(dayOf(e.at)) ?? 0) + 1);
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = dayOf(now - (13 - i) * DAY);
    return { day, reviews: counts.get(day) ?? 0 };
  });
  // Chuỗi ngày: hôm nay chưa ôn thì vẫn giữ chuỗi tới hôm qua.
  // Lấy mọi ngày có ôn (không chỉ 90 ngày như trên) để chuỗi dài hơn 90 ngày không bị cắt
  const studied = new Set(
    (
      conn()
        .prepare("SELECT DISTINCT date((at - ? * 60000) / 1000, 'unixepoch') AS day FROM review_events WHERE user_id = ?")
        .all(tzOffset, userId) as { day: string }[]
    ).map((r) => r.day),
  );
  let streak = 0;
  for (let i = studied.has(dayOf(now)) ? 0 : 1; studied.has(dayOf(now - i * DAY)); i++) streak++;

  const vocab = listVocab(userId);
  // Câu ⭐ chỉ là đánh dấu trong bài học, app không ôn → không tính vào mục đến hạn / mức thành thạo / hay quên
  const words = vocab.filter((v) => !isSentence(v));
  const mastery: Record<Mastery, number> = { saved: 0, learning: 0, active: 0, mastered: 0 };
  for (const v of words) mastery[v.mastery]++;
  const sp = conn()
    .prepare("SELECT COALESCE(SUM(reps), 0) AS reps, COUNT(*) AS n FROM crazy_reps WHERE user_id = ? AND source LIKE '/vocab/%'")
    .get(userId) as { reps: number; n: number };

  return {
    dueToday: words.filter((v) => isDue(v, now)).length,
    streak,
    recall30: { ...rate(last30), duolingo: rate(last30.filter((e) => e.mode === "duolingo")), crazy: rate(last30.filter((e) => e.mode === "crazy")) },
    retention7: rate(recalls.filter((e) => (e.gap_days ?? 0) >= 7)),
    retention30: rate(recalls.filter((e) => (e.gap_days ?? 0) >= 30)),
    days,
    mastery,
    speaking: { reps: sp.reps, sentences: sp.n, totalSentences: vocab.filter(isSentence).length },
    forgotten: words
      .filter((v) => v.lapses > 0)
      .sort((a, b) => b.lapses - a.lapses)
      .slice(0, 5)
      .map((v) => ({ id: v.id, word: v.word, meaning: v.meaning, lapses: v.lapses })),
  };
}
