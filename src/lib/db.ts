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
  const db = new DatabaseSync(DB_PATH);
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
  `);
  return db;
}

// Giữ 1 kết nối duy nhất (kể cả khi dev server hot-reload)
const g = globalThis as unknown as { __db?: DatabaseSync };
const db = (g.__db ??= open());

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
  const rows = db
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
  const r = db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as Row | undefined;
  if (!r) return null;
  const { segmentCount, ...rest } = toSummary(r);
  void segmentCount;
  return { ...rest, segments: JSON.parse(r.segments!) };
}

export type LessonInput = Omit<Lesson, "id" | "createdAt">;

export function createLesson(l: LessonInput): number {
  const res = db
    .prepare(
      "INSERT INTO lessons (title, video_id, description, level, segments, published) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(l.title, l.videoId, l.description, l.level, JSON.stringify(l.segments), l.published ? 1 : 0);
  return Number(res.lastInsertRowid);
}

export function updateLesson(id: number, l: LessonInput) {
  db.prepare(
    "UPDATE lessons SET title = ?, video_id = ?, description = ?, level = ?, segments = ?, published = ? WHERE id = ?",
  ).run(l.title, l.videoId, l.description, l.level, JSON.stringify(l.segments), l.published ? 1 : 0, id);
}

export function deleteLesson(id: number) {
  db.prepare("DELETE FROM lessons WHERE id = ?").run(id);
}

export function getCached<T>(key: string): T | null {
  const r = db.prepare("SELECT data, expires_at FROM transcript_cache WHERE key = ?").get(key) as
    | { data: string; expires_at: number | null }
    | undefined;
  if (!r || (r.expires_at !== null && r.expires_at < Date.now())) return null;
  return JSON.parse(r.data);
}

export function setCached(key: string, data: unknown, ttlMs: number | null) {
  db.prepare("INSERT OR REPLACE INTO transcript_cache (key, data, expires_at) VALUES (?, ?, ?)").run(
    key,
    JSON.stringify(data),
    ttlMs === null ? null : Date.now() + ttlMs,
  );
}
