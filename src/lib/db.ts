import "server-only";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { POINTS_HINT, splitWords } from "./dictation";
import { isReservedSlug, slugify } from "./slug";
import { isDue, MASTERY_GAP_DAYS, masteryOf, nextSchedule, type Grade, type Mastery } from "./srs";
import { mergeIntoSentences, type Segment } from "./subtitles";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

export type Lesson = {
  id: number;
  title: string;
  slug: string; // đường dẫn ckk.pro/<slug> — tạo từ tiêu đề, giữ nguyên khi sửa tiêu đề (link cũ không gãy)
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
  wordCount?: number; // số từ để chép (mỗi từ đúng được điểm) — chỉ có trong danh sách bài
  duration?: number; // giây, tính đến hết dòng phụ đề cuối — chỉ có trong danh sách bài
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
      source_url TEXT, -- /lesson/1, /watch/abc… (null = không rõ nguồn, vd. tự thêm vào sổ)
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
    -- Điểm chính tả: gõ đúng 1 từ → +POINTS_CORRECT, mỗi từ của câu chỉ tính 1 lần (làm lại / học lại từ đầu
    -- không cộng thêm) và giữ vĩnh viễn (không bị xoá theo progress)
    CREATE TABLE IF NOT EXISTS dict_points (
      user_id INTEGER NOT NULL,
      source TEXT NOT NULL, -- "/lesson/3" | "/watch/<videoId>"
      idx INTEGER NOT NULL, -- câu (sau khi gộp câu)
      at INTEGER NOT NULL, -- ms
      pts INTEGER NOT NULL DEFAULT 1, -- điểm được cộng (câu được điểm theo luật cũ giữ nguyên số đã cộng)
      open INTEGER NOT NULL DEFAULT 0, -- 1 = câu còn từ chưa được điểm, gõ đúng thêm vẫn cộng (câu theo luật cũ đã khép)
      PRIMARY KEY (user_id, source, idx)
    );
    -- Điểm chính tả bị trừ: mỗi lần bấm xem từ (n từ) → −n × POINTS_HINT. Không giới hạn số lần, giữ vĩnh viễn như dict_points
    CREATE TABLE IF NOT EXISTS dict_hints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      idx INTEGER NOT NULL,
      n INTEGER NOT NULL, -- số từ xem ("Hiện tất cả" xem nhiều từ 1 lần)
      at INTEGER NOT NULL, -- ms
      pts INTEGER NOT NULL DEFAULT 1 -- điểm trừ mỗi từ lúc xem (lần xem theo luật cũ giữ −1)
    );
    CREATE INDEX IF NOT EXISTS dict_hints_user ON dict_hints (user_id, at);
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
    CREATE TABLE IF NOT EXISTS deck_learned (
      user_id INTEGER NOT NULL,
      deck TEXT NOT NULL, -- slug của bộ từ
      word_key TEXT NOT NULL, -- khoá mục trong bộ (phân biệt từ đồng âm)
      at INTEGER NOT NULL, -- ms
      PRIMARY KEY (user_id, deck, word_key)
    );
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
    -- Cài đặt chung admin chỉnh trên web (vd. khoá bài học) — giá trị dạng JSON
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    -- Bài người dùng đã mở khoá (khi admin bật khoá bài học). cost trừ thẳng vào điểm (getPoints) → xoá dòng = hoàn điểm
    CREATE TABLE IF NOT EXISTS lesson_unlocks (
      user_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      kind TEXT NOT NULL, -- 'pick' (lượt chọn miễn phí) | 'buy' (trả điểm) | 'legacy' (đã học trước khi bật khoá)
      cost INTEGER NOT NULL DEFAULT 0, -- điểm đã trả
      at INTEGER NOT NULL, -- ms
      PRIMARY KEY (user_id, lesson_id)
    );
    -- Ván game Der Die Das cược kim cương thời trước (giờ chơi trên trình duyệt, không cược): chỉ còn dữ liệu cũ, không tính vào điểm
    CREATE TABLE IF NOT EXISTS artikel_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      deck TEXT NOT NULL,
      stake INTEGER NOT NULL,
      words TEXT NOT NULL, -- [{ word, gender, meaning }, …] của ván đang chơi, xong ván thì xoá
      correct INTEGER NOT NULL DEFAULT 0, -- số từ đúng liên tiếp
      phase TEXT NOT NULL, -- 'word' | 'choose' | 'won' | 'lost'
      deadline INTEGER NOT NULL DEFAULT 0, -- ms, hạn trả lời từ đang hiện
      payout INTEGER NOT NULL DEFAULT 0, -- kim cương nhận về
      started_at INTEGER NOT NULL, -- ms
      ended_at INTEGER -- ms, NULL = đang chơi
    );
    CREATE UNIQUE INDEX IF NOT EXISTS artikel_rounds_active ON artikel_rounds (user_id) WHERE ended_at IS NULL; -- mỗi người 1 ván đang chơi
    CREATE INDEX IF NOT EXISTS artikel_rounds_user ON artikel_rounds (user_id, started_at);
    -- Ván Sudoku / Caro (luật trong play-game.ts), chỉ chơi vui: không tính vào điểm. stake / payout là cột thời còn cược, giờ luôn 0
    CREATE TABLE IF NOT EXISTS play_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE, -- mã phòng (ván một mình cũng có, chỉ không vào được)
      game TEXT NOT NULL, -- 'sudoku' | 'caro'
      mode TEXT NOT NULL, -- 'room' (với người) | 'solo' (Sudoku một mình / Caro với máy)
      level TEXT NOT NULL DEFAULT '', -- Sudoku: 'easy' | 'medium' | 'hard'
      stake INTEGER NOT NULL, -- thời còn cược kim cương; giờ luôn 0
      capacity INTEGER NOT NULL,
      host_id INTEGER NOT NULL,
      status TEXT NOT NULL, -- 'waiting' | 'playing' | 'ended' | 'canceled'
      data TEXT NOT NULL DEFAULT '{}', -- trạng thái do server giữ (Sudoku: đề + lời giải · Caro: bàn, lượt)
      winner_id INTEGER, -- NULL = hoà / chưa xong · 0 = máy
      reason TEXT NOT NULL DEFAULT '', -- vì sao ván kết thúc
      deadline INTEGER NOT NULL, -- ms: waiting → hạn chờ · playing → Sudoku hết giờ, Caro hết lượt
      version INTEGER NOT NULL DEFAULT 0, -- tăng mỗi lần đổi (máy khách hỏi lại theo số này)
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      ended_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS play_rooms_due ON play_rooms (status, deadline);
    CREATE TABLE IF NOT EXISTS play_seats (
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      seat INTEGER NOT NULL, -- thứ tự vào phòng (Caro: 0 = X đi trước)
      stake INTEGER NOT NULL, -- kim cương đã đặt
      payout INTEGER NOT NULL DEFAULT 0, -- kim cương nhận về
      data TEXT NOT NULL DEFAULT '{}', -- Sudoku: { cells: các ô đã điền đúng, mistakes }
      out INTEGER NOT NULL DEFAULT 0, -- 1 = bỏ cuộc / bị loại
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (room_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS play_seats_user ON play_seats (user_id, joined_at);
    -- Khách chơi Sudoku / Caro không cần tài khoản . Trong play_rooms / play_seats khách mang id ÂM (−id)
    -- để không trùng người dùng thật và máy (0); điểm của id âm luôn 0, không có trong bảng xếp hạng (bảng đó JOIN users)
    CREATE TABLE IF NOT EXISTS play_guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    -- Góp ý / báo lỗi gửi từ app (khách chưa đăng nhập cũng gửi được: user_id NULL)
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      kind TEXT NOT NULL, -- 'idea' | 'bug' | 'content' | 'other'
      message TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '', -- email để trả lời (người dùng tự nhập / email tài khoản)
      device TEXT NOT NULL DEFAULT '', -- "iOS 26.1 · iPhone 16 · app 1.0.1"
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
  // Ảnh đại diện: thời điểm đổi ảnh (ms) — làm phiên bản cho URL ảnh; NULL = chưa có ảnh (file ở AVATAR_DIR)
  if (!userCols.some((c) => c.name === "avatar_at")) db.exec("ALTER TABLE users ADD COLUMN avatar_at INTEGER");
  // Email đã được chứng minh sở hữu (mã gửi qua email / Google, Apple xác nhận). Tài khoản cũ từng đổi email không cần xác minh
  // nên mặc định 0; riêng email trùng với tài khoản Google / Apple đã liên kết thì coi như đã xác minh
  if (!userCols.some((c) => c.name === "email_verified")) {
    db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE users SET email_verified = 1 WHERE email IN (SELECT email FROM oauth_accounts)");
  }
  // Tăng lên khi "đăng xuất mọi thiết bị": nằm trong chữ ký phiên nên mọi token cũ hết hiệu lực
  if (!userCols.some((c) => c.name === "session_version")) db.exec("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0");
  // Bài có luyện Chính tả không (admin bật khi thêm / sửa bài; bài cũ mặc định tắt)
  const lessonCols = db.prepare("PRAGMA table_info(lessons)").all() as { name: string }[];
  if (!lessonCols.some((c) => c.name === "dictation")) db.exec("ALTER TABLE lessons ADD COLUMN dictation INTEGER NOT NULL DEFAULT 0");
  // Đường dẫn đẹp cho SEO (ckk.pro/<slug>); bài chưa có slug → tạo từ tiêu đề
  if (!lessonCols.some((c) => c.name === "slug")) db.exec("ALTER TABLE lessons ADD COLUMN slug TEXT");
  const setSlug = db.prepare("UPDATE lessons SET slug = ? WHERE id = ?");
  for (const r of db.prepare("SELECT id, title FROM lessons WHERE slug IS NULL OR slug = '' ORDER BY id").all() as { id: number; title: string }[])
    setSlug.run(uniqueSlug(db, r.title, r.id), r.id);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS lessons_slug ON lessons (slug)");
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
  // Điểm chính tả theo câu (trước đây mỗi câu đúng luôn +1)
  const pointCols = db.prepare("PRAGMA table_info(dict_points)").all() as { name: string }[];
  if (!pointCols.some((c) => c.name === "pts")) db.exec("ALTER TABLE dict_points ADD COLUMN pts INTEGER NOT NULL DEFAULT 1");
  // Điểm theo từng từ: câu có thể mới được điểm một phần
  if (!pointCols.some((c) => c.name === "open")) db.exec("ALTER TABLE dict_points ADD COLUMN open INTEGER NOT NULL DEFAULT 0");
  // Điểm trừ khi xem từ lưu theo từng lần xem (trước đây luôn −1) — đổi mức trừ không ảnh hưởng các lần đã xem
  const hintCols = db.prepare("PRAGMA table_info(dict_hints)").all() as { name: string }[];
  if (!hintCols.some((c) => c.name === "pts")) db.exec("ALTER TABLE dict_hints ADD COLUMN pts INTEGER NOT NULL DEFAULT 1");
  // Chính tả: các câu của lượt đang làm (mọi câu chưa chép, lần lượt từ đầu đến cuối)
  if (!progressCols.some((c) => c.name === "dict_pick")) db.exec("ALTER TABLE progress ADD COLUMN dict_pick TEXT NOT NULL DEFAULT '[]'"); // [3, 17, 42, …]
  // Chính tả: lúc bắt đầu lượt đang làm (ms, 0 = chưa biết) → tính lại điểm của lượt khi mở lại bài
  if (!progressCols.some((c) => c.name === "dict_round_at")) db.exec("ALTER TABLE progress ADD COLUMN dict_round_at INTEGER NOT NULL DEFAULT 0");
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
  // Câu ⭐ trước đây nằm trong vocab (nhiều từ, không câu ví dụ) → chuyển sang bảng riêng, chỉ dùng ở màn Shadowing
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'starred_sentences'").get()) {
    const legacy = "instr(trim(word), ' ') > 0 AND trim(context) = ''";
    db.exec("BEGIN");
    try {
      db.exec(`
        CREATE TABLE starred_sentences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          text TEXT NOT NULL,
          source_url TEXT, -- /lesson/1, /watch/abc…
          source_title TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (user_id, text)
        );
        INSERT OR IGNORE INTO starred_sentences (user_id, text, source_url, source_title, created_at)
          SELECT user_id, word, source_url, source_title, created_at FROM vocab WHERE ${legacy} AND source_url IS NOT NULL;
        DELETE FROM vocab WHERE ${legacy} AND source_url IS NOT NULL;
        -- Không có nguồn = cụm từ thêm từ bộ từ / tự thêm, không phải câu ⭐ → lấy chính cụm làm ngữ cảnh (lâu nay bị ẩn nhầm khỏi sổ)
        UPDATE vocab SET context = word WHERE ${legacy};
      `);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}

/** Slug chưa bài nào dùng: "tieu-de", trùng thì "tieu-de-2", "tieu-de-3"… (exceptId: bài đang sửa) */
function uniqueSlug(db: DatabaseSync, text: string, exceptId: number | null): string {
  const base = slugify(text) || "bai-hoc";
  const taken = db.prepare("SELECT 1 FROM lessons WHERE slug = ? AND id IS NOT ?");
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!isReservedSlug(slug) && !taken.get(slug, exceptId)) return slug;
  }
}

// Giữ 1 kết nối duy nhất (kể cả khi dev server hot-reload).
// Mở lúc dùng lần đầu, không mở lúc import (lúc build nhiều worker import cùng lúc → "database is locked").
const g = globalThis as unknown as { __db?: DatabaseSync };
const conn = () => (g.__db ??= open());

type Row = {
  id: number;
  title: string;
  slug: string;
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
  slug: r.slug,
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
      `SELECT id, title, slug, video_id, description, level, published, dictation, created_at,
              json_array_length(segments) AS segment_count
       FROM lessons ${includeDrafts ? "" : "WHERE published = 1"}
       ORDER BY created_at DESC, id DESC`,
    )
    .all() as Row[];
  return rows.map((r) => ({ ...toSummary(r), ...lessonStats(r.id) }));
}

/**
 * Số câu của bài sau khi gộp dòng phụ đề thành câu (đúng số màn học hiện "Câu 3/52"), số từ để chép và thời lượng.
 * Tính 1 lần mỗi bài rồi giữ trong bộ nhớ; deploy lại (có thể đổi cách gộp) thì tự tính lại.
 */
const statsCache = new Map<number, { sentenceCount: number; wordCount: number; duration: number }>();
function lessonStats(id: number) {
  let stats = statsCache.get(id);
  if (!stats) {
    const r = conn().prepare("SELECT segments FROM lessons WHERE id = ?").get(id) as { segments: string } | undefined;
    const segments: Segment[] = r ? JSON.parse(r.segments) : [];
    const sentences = mergeIntoSentences(segments);
    stats = { sentenceCount: sentences.length, wordCount: sentences.reduce((n, s) => n + splitWords(s.text).length, 0), duration: Math.max(0, ...segments.map((s) => s.end)) };
    statsCache.set(id, stats);
  }
  return stats;
}

export function getLesson(id: number): Lesson | null {
  const r = conn().prepare("SELECT * FROM lessons WHERE id = ?").get(id) as Row | undefined;
  if (!r) return null;
  const { segmentCount, ...rest } = toSummary(r);
  void segmentCount;
  return { ...rest, segments: JSON.parse(r.segments!) };
}

/** Các bài đã đăng dùng video này (để khoá bài không bị lách qua /watch/<videoId>) */
export function publishedLessonsByVideo(videoId: string): { id: number; slug: string }[] {
  return conn().prepare("SELECT id, slug FROM lessons WHERE video_id = ? AND published = 1 ORDER BY id").all(videoId) as { id: number; slug: string }[];
}

export function getLessonBySlug(slug: string): Lesson | null {
  const r = conn().prepare("SELECT id FROM lessons WHERE slug = ?").get(slug) as { id: number } | undefined;
  return r ? getLesson(r.id) : null;
}

/** slug: admin tự đặt (chuẩn hoá lại + tránh trùng); bỏ trống → tạo bài mới thì lấy từ tiêu đề, sửa bài thì giữ slug cũ */
export type LessonInput = Omit<Lesson, "id" | "createdAt" | "slug"> & { slug?: string };

export function createLesson(l: LessonInput): number {
  const db = conn();
  const res = db
    .prepare(
      "INSERT INTO lessons (title, slug, video_id, description, level, segments, published, dictation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(l.title, uniqueSlug(db, l.slug || l.title, null), l.videoId, l.description, l.level, JSON.stringify(l.segments), l.published ? 1 : 0, l.dictation ? 1 : 0);
  return Number(res.lastInsertRowid);
}

export function updateLesson(id: number, l: LessonInput) {
  const db = conn();
  db.prepare(
    "UPDATE lessons SET title = ?, video_id = ?, description = ?, level = ?, segments = ?, published = ?, dictation = ? WHERE id = ?",
  ).run(l.title, l.videoId, l.description, l.level, JSON.stringify(l.segments), l.published ? 1 : 0, l.dictation ? 1 : 0, id);
  if (l.slug) db.prepare("UPDATE lessons SET slug = ? WHERE id = ?").run(uniqueSlug(db, l.slug, id), id);
  statsCache.delete(id);
}

export function deleteLesson(id: number) {
  statsCache.delete(id);
  conn().prepare("DELETE FROM lessons WHERE id = ?").run(id);
  conn().prepare("DELETE FROM progress WHERE source = ?").run(`/lesson/${id}`);
  conn().prepare("DELETE FROM crazy_reps WHERE source = ?").run(`/lesson/${id}`);
  conn().prepare("DELETE FROM lesson_unlocks WHERE lesson_id = ?").run(id); // ai đã trả điểm mở bài này được hoàn lại
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
  emailVerified: boolean; // false = tài khoản cũ, chưa chứng minh sở hữu email (xem account.ts)
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
  email_verified: number;
  session_version: number;
};

const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  lang: r.lang ?? null,
  hasPassword: !r.password_hash.startsWith(NO_PASSWORD),
  emailVerified: !!r.email_verified,
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
export function getUserWithHash(by: { email: string } | { id: number }): (User & { passwordHash: string; sessionVersion: number }) | null {
  const r = ("email" in by
    ? conn().prepare("SELECT * FROM users WHERE email = ?").get(by.email)
    : conn().prepare("SELECT * FROM users WHERE id = ?").get(by.id)) as UserRow | undefined;
  return r ? { ...toUser(r), passwordHash: r.password_hash, sessionVersion: r.session_version } : null;
}

export function emailTaken(email: string, exceptId?: number): boolean {
  return !!conn().prepare("SELECT 1 FROM users WHERE email = ? AND id != ?").get(email, exceptId ?? -1);
}

export function updateUserName(id: number, name: string) {
  conn().prepare("UPDATE users SET name = ? WHERE id = ?").run(name, id);
}

/** Đặt email mới — chỉ gọi sau khi đã xác nhận mã gửi tới email đó */
export function setVerifiedEmail(id: number, email: string) {
  conn().prepare("UPDATE users SET email = ?, email_verified = 1 WHERE id = ?").run(email, id);
}

export function markEmailVerified(id: number) {
  conn().prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(id);
}

export function setUserLang(id: number, lang: string) {
  conn().prepare("UPDATE users SET lang = ? WHERE id = ?").run(lang, id);
}

export function bumpSessionVersion(id: number) {
  conn().prepare("UPDATE users SET session_version = session_version + 1 WHERE id = ?").run(id);
}

export function setUserPassword(id: number, passwordHash: string) {
  conn().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
}

/** Chỉ dùng khi email đã được xác minh (mã gửi qua email / Google, Apple xác nhận) */
export function createUser(u: { email: string; name: string; passwordHash: string; role: Role; lang?: string | null }): number {
  const res = conn()
    .prepare("INSERT INTO users (email, name, password_hash, role, lang, email_verified) VALUES (?, ?, ?, ?, ?, 1)")
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
  deleteOAuthLinks(id);
  conn().prepare("DELETE FROM vocab WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM vocab_examples WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM starred_sentences WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM deck_learned WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM progress WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM crazy_reps WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM dict_points WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM dict_hints WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM review_events WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM lesson_unlocks WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM artikel_rounds WHERE user_id = ?").run(id);
  conn().prepare("DELETE FROM play_seats WHERE user_id = ?").run(id); // phòng của người khác vẫn còn, chỉ mất ghế của người này
  conn().prepare("UPDATE feedback SET user_id = NULL, email = '' WHERE user_id = ?").run(id); // giữ nội dung góp ý, bỏ liên kết người gửi
  conn().prepare("DELETE FROM users WHERE id = ?").run(id);
  rmSync(path.join(AVATAR_DIR, String(id)), { force: true }); // ảnh đại diện
}

/**
 * Bản sao toàn bộ dữ liệu của 1 người (quyền truy cập / mang dữ liệu theo GDPR) — không có mật khẩu băm hay token đăng nhập.
 * Dạng thô theo từng bảng: đủ để đọc / nhập sang công cụ khác, không phụ thuộc định dạng API của app.
 */
export function exportUserData(id: number): Record<string, unknown> | null {
  const user = getUserById(id);
  if (!user) return null;
  const rows = (sql: string) => conn().prepare(sql).all(id);
  return {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, name: user.name, email: user.email, role: user.role, lang: user.lang, createdAt: user.createdAt, hasAvatar: !!user.avatarAt },
    signInWith: rows("SELECT provider, email, created_at FROM oauth_accounts WHERE user_id = ?"),
    vocab: rows("SELECT id, word, meaning, context, source_url, source_title, gender, singular, plural, srs_stage, due_at, lapses, created_at FROM vocab WHERE user_id = ? ORDER BY id"),
    vocabExamples: rows("SELECT vocab_id, context, source_url, source_title, created_at FROM vocab_examples WHERE user_id = ? ORDER BY id"),
    starredSentences: rows("SELECT text, source_url, source_title, created_at FROM starred_sentences WHERE user_id = ? ORDER BY id"),
    deckLearned: rows("SELECT deck, word_key, at FROM deck_learned WHERE user_id = ? ORDER BY at"),
    progress: rows("SELECT source, title, idx, total, mode, dict_level, dict_done, updated_at FROM progress WHERE user_id = ? ORDER BY updated_at DESC"),
    reviewHistory: rows("SELECT vocab_id, at, mode, exercise, grade, recall, speaking, auto_clear, stage_before, stage_after FROM review_events WHERE user_id = ? ORDER BY at"),
    crazyReps: rows("SELECT source, idx, reps, passed, updated_at FROM crazy_reps WHERE user_id = ?"),
    dictationPoints: rows("SELECT source, idx, pts, at FROM dict_points WHERE user_id = ? ORDER BY at"),
    dictationHints: rows("SELECT source, idx, n, pts, at FROM dict_hints WHERE user_id = ? ORDER BY at"),
    lessonUnlocks: rows("SELECT lesson_id, kind, cost, at FROM lesson_unlocks WHERE user_id = ?"),
    artikelRounds: rows("SELECT deck, stake, correct, phase, payout, started_at, ended_at FROM artikel_rounds WHERE user_id = ? ORDER BY id"),
    playRounds: rows(
      "SELECT r.game, r.mode, r.level, s.stake, s.payout, s.out, r.status, r.reason, r.started_at, r.ended_at FROM play_seats s JOIN play_rooms r ON r.id = s.room_id WHERE s.user_id = ? ORDER BY s.joined_at",
    ),
    feedback: rows("SELECT kind, message, created_at FROM feedback WHERE user_id = ? ORDER BY id"),
  };
}

// ---- Góp ý ----

export type FeedbackKind = "idea" | "bug" | "content" | "other";
export const FEEDBACK_KINDS: readonly FeedbackKind[] = ["idea", "bug", "content", "other"];

export type Feedback = {
  id: number;
  userId: number | null;
  userName: string | null;
  kind: FeedbackKind;
  message: string;
  email: string;
  device: string;
  createdAt: string;
};

export function saveFeedback(f: { userId: number | null; kind: FeedbackKind; message: string; email: string; device: string }): number {
  const r = conn()
    .prepare("INSERT INTO feedback (user_id, kind, message, email, device) VALUES (?, ?, ?, ?, ?)")
    .run(f.userId, f.kind, f.message, f.email, f.device);
  return Number(r.lastInsertRowid);
}

export function listFeedback(limit = 200): Feedback[] {
  const rows = conn()
    .prepare(
      `SELECT f.id, f.user_id, u.name AS user_name, f.kind, f.message, f.email, f.device, f.created_at
       FROM feedback f LEFT JOIN users u ON u.id = f.user_id ORDER BY f.id DESC LIMIT ?`,
    )
    .all(limit) as {
    id: number;
    user_id: number | null;
    user_name: string | null;
    kind: FeedbackKind;
    message: string;
    email: string;
    device: string;
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    kind: r.kind,
    message: r.message,
    email: r.email,
    device: r.device,
    createdAt: r.created_at,
  }));
}

export function deleteFeedback(id: number) {
  conn().prepare("DELETE FROM feedback WHERE id = ?").run(id);
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

export function deleteOAuthLinks(userId: number) {
  conn().prepare("DELETE FROM oauth_accounts WHERE user_id = ?").run(userId);
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
 * ở dạng bài không tự khai báo (thẻ lật "Tôi biết", tự chấm "recall-self", dạng lạ "other" không tính) và phải tự nhớ ra
 * (Luyện to "shadow" nghe mẫu rồi nói theo, nhớ lại có gợi ý "cued" không tính)
 */
function provenIds(userId: number): Set<number> {
  const rows = conn()
    .prepare(
      `SELECT DISTINCT vocab_id FROM review_events
       WHERE user_id = ? AND grade IN ('good', 'easy') AND exercise NOT IN ('flash', 'shadow', 'recall-self', 'cued', 'other') AND gap_days >= ?`,
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
export function saveVocab(
  userId: number,
  v: { word: string; context: string; sourceUrl: string | null; sourceTitle: string },
  opts: { exactCase?: boolean } = {},
): VocabItem {
  // Cụm từ không kèm câu ví dụ → lấy chính cụm làm ngữ cảnh (mục sổ từ luôn có ngữ cảnh nếu nhiều từ)
  const context = v.context.trim() || !/\s/.test(v.word.trim()) ? v.context : v.word;
  const variants = opts.exactCase ? [v.word] : caseVariants(v.word);
  const found = conn()
    .prepare(`SELECT id, word, context, gender FROM vocab WHERE user_id = ? AND word IN (${variants.map(() => "?").join(", ")})`)
    .all(userId, ...variants) as { id: number; word: string; context: string; gender: string }[];
  const lowerFirst = v.word[0] !== v.word[0].toUpperCase();
  // Mục cũ đã xác định là danh từ (der/die/das) mà lần này gặp dạng viết thường → từ khác ("essen" ≠ "Essen"), không gộp
  const isNoun = (f: { gender: string }) => f.gender === "der" || f.gender === "die" || f.gender === "das";
  const old =
    found.find((f) => f.word === v.word) ??
    (found.length === 1 && !(lowerFirst && isNoun(found[0])) ? found[0] : undefined);
  if (!old) {
    const r = conn()
      .prepare(`INSERT INTO vocab (user_id, word, context, source_url, source_title) VALUES (?, ?, ?, ?, ?) RETURNING *`)
      .get(userId, v.word, context, v.sourceUrl, v.sourceTitle) as VocabRow;
    return toVocab(r, false);
  }
  const word = old.word !== v.word && lowerFirst ? v.word : old.word;
  const r = conn()
    .prepare(
      `UPDATE vocab SET word = ?,
         source_url = CASE WHEN context = '' THEN ? ELSE source_url END,
         source_title = CASE WHEN context = '' THEN ? ELSE source_title END,
         context = CASE WHEN context = '' THEN ? ELSE context END
       WHERE id = ? RETURNING *`,
    )
    .get(word, v.sourceUrl, v.sourceTitle, context, old.id) as VocabRow;
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

// ---- Câu ⭐ (đánh dấu câu ở màn Shadowing, không thuộc sổ từ vựng) ----

export type StarredSentence = { id: number; text: string; sourceUrl: string | null; sourceTitle: string; createdAt: string };

type StarredRow = { id: number; text: string; source_url: string | null; source_title: string; created_at: string };
const toStarred = (r: StarredRow): StarredSentence => ({ id: r.id, text: r.text, sourceUrl: r.source_url, sourceTitle: r.source_title, createdAt: r.created_at });

export function listStarred(userId: number): StarredSentence[] {
  const rows = conn().prepare("SELECT * FROM starred_sentences WHERE user_id = ? ORDER BY id").all(userId) as StarredRow[];
  return rows.map(toStarred);
}

/** Đánh dấu câu (đã đánh dấu thì giữ mục cũ) */
export function starSentence(userId: number, s: { text: string; sourceUrl: string | null; sourceTitle: string }): StarredSentence {
  conn()
    .prepare("INSERT OR IGNORE INTO starred_sentences (user_id, text, source_url, source_title) VALUES (?, ?, ?, ?)")
    .run(userId, s.text, s.sourceUrl, s.sourceTitle);
  return toStarred(conn().prepare("SELECT * FROM starred_sentences WHERE user_id = ? AND text = ?").get(userId, s.text) as StarredRow);
}

/** false = không có câu này (của người này) */
export function unstarSentence(userId: number, id: number): boolean {
  return conn().prepare("DELETE FROM starred_sentences WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
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

/** Từ đã có trong sổ (đúng hoa thường → nghĩa) + số mục / số mục đến hạn ôn */
export function vocabOverview(userId: number, now = Date.now()): { notes: Map<string, string>; total: number; due: number } {
  const rows = conn().prepare("SELECT word, meaning, srs_stage, due_at FROM vocab WHERE user_id = ?").all(userId) as {
    word: string;
    meaning: string;
    srs_stage: number;
    due_at: number | null;
  }[];
  return {
    notes: new Map(rows.map((r) => [r.word, r.meaning])),
    total: rows.length,
    due: rows.filter((r) => isDue({ stage: r.srs_stage, dueAt: r.due_at }, now)).length,
  };
}

/** Số từ đến hạn ôn (badge "Từ vựng" trên thanh điều hướng — chạy mỗi trang nên chỉ đọc 2 cột) */
export function dueCount(userId: number, now = Date.now()): number {
  const rows = conn().prepare("SELECT srs_stage, due_at FROM vocab WHERE user_id = ?").all(userId) as { srs_stage: number; due_at: number | null }[];
  return rows.filter((r) => isDue({ stage: r.srs_stage, dueAt: r.due_at }, now)).length;
}

/** 1 mục của bộ từ cần đưa vào sổ — cách gộp nghĩa / phân biệt từ trùng do lib/decks quyết định */
export type DeckNoteInput = {
  word: string;
  gender: NounGender;
  plural: string;
  example: string;
  exactCase: boolean; // bộ có cả "essen" lẫn "Essen" → 2 mục riêng, không gộp theo viết hoa
  isNew: boolean; // chưa có trong sổ (để đếm số mục mới)
  mergeMeaning: (current: string) => string;
};

/**
 * Thêm các từ của 1 bộ từ vào sổ (1 giao dịch). Từ đã có thì giữ mục cũ (saveVocab). → số mục mới thêm
 * `tested`: vừa trả lời đúng ở dạng có kiểm tra (gõ / trắc nghiệm / nghe viết, không phải thẻ lật tự khai) →
 * tính là lần ôn đầu: từ mới lên mức 1, hẹn ôn ngày mai (khỏi dạy lại như từ chưa gặp ở phiên ôn).
 */
export function addDeckWords(userId: number, words: DeckNoteInput[], sourceTitle: string, tested = false): number {
  const db = conn();
  db.exec("BEGIN");
  try {
    let added = 0;
    for (const w of words) {
      if (w.isNew) added++;
      const item = saveVocab(userId, { word: w.word, context: w.example, sourceUrl: null, sourceTitle }, { exactCase: w.exactCase });
      const meaning = w.mergeMeaning(item.meaning);
      if (meaning && meaning !== item.meaning) updateVocabMeaning(userId, item.id, meaning.slice(0, 500));
      if (!item.gender && w.gender) setVocabNoun(userId, item.id, { gender: w.gender, singular: w.gender === "-" ? "" : w.word, plural: w.plural });
      if (tested && item.stage === 0)
        reviewVocab(userId, item.id, { grade: "good", mode: "duolingo", exercise: "deck", recall: null, speaking: null, autoClear: null });
    }
    db.exec("COMMIT");
    return added;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Các mục đã học trong từng bộ: bộ → tập khoá từ */
export function listDeckLearned(userId: number): Map<string, Set<string>> {
  const rows = conn().prepare("SELECT deck, word_key FROM deck_learned WHERE user_id = ?").all(userId) as { deck: string; word_key: string }[];
  const out = new Map<string, Set<string>>();
  for (const r of rows) (out.get(r.deck) ?? out.set(r.deck, new Set()).get(r.deck)!).add(r.word_key);
  return out;
}

export function markDeckLearned(userId: number, deck: string, keys: string[], at = Date.now()) {
  const db = conn();
  const insert = db.prepare("INSERT OR IGNORE INTO deck_learned (user_id, deck, word_key, at) VALUES (?, ?, ?, ?)");
  db.exec("BEGIN");
  try {
    for (const key of keys) insert.run(userId, deck, key, at);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Mục sổ từ thêm từ bộ từ (không có nguồn bài / video, tên nguồn = tên bộ) — dựng lại tiến độ học lần đầu */
export function deckSourcedVocab(): { user_id: number; word: string; meaning: string; source_title: string }[] {
  return conn().prepare("SELECT user_id, word, meaning, source_title FROM vocab WHERE source_url IS NULL AND source_title != ''").all() as {
    user_id: number;
    word: string;
    meaning: string;
    source_title: string;
  }[];
}

// ---- Cài đặt chung ----

export function getSetting<T>(key: string): T | null {
  const r = conn().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return r ? JSON.parse(r.value) : null;
}

export function setSetting(key: string, value: unknown) {
  conn().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
}

// ---- Bài đã mở khoá ----

export type UnlockKind = "pick" | "buy" | "legacy";

/** Các bài người này đã mở khoá */
export function unlockedLessonIds(userId: number): Set<number> {
  return new Set(
    (conn().prepare("SELECT lesson_id FROM lesson_unlocks WHERE user_id = ?").all(userId) as { lesson_id: number }[]).map((r) => r.lesson_id),
  );
}

/** Các bài người này đã trả để mở (kim cương hoặc lượt chọn) — bài bị ẩn sau đó vẫn học được */
export function paidLessonIds(userId: number): Set<number> {
  return new Set(
    (conn().prepare("SELECT lesson_id FROM lesson_unlocks WHERE user_id = ? AND kind IN ('buy', 'pick')").all(userId) as { lesson_id: number }[]).map((r) => r.lesson_id),
  );
}

/** Số lượt chọn bài miễn phí đã dùng */
export function lessonPicksUsed(userId: number): number {
  return (conn().prepare("SELECT COUNT(*) AS n FROM lesson_unlocks WHERE user_id = ? AND kind = 'pick'").get(userId) as { n: number }).n;
}

/** false = bài này đã mở khoá rồi (không trừ điểm lần 2) */
export function addLessonUnlock(userId: number, lessonId: number, kind: UnlockKind, cost: number): boolean {
  return (
    conn()
      .prepare("INSERT OR IGNORE INTO lesson_unlocks (user_id, lesson_id, kind, cost, at) VALUES (?, ?, ?, ?, ?)")
      .run(userId, lessonId, kind, cost, Date.now()).changes > 0
  );
}

/** Thống kê cho trang admin Khoá bài học: số lượt mở theo loại, số người đã mở, tổng điểm đã tiêu */
export function lessonUnlockStats(): { pick: number; buy: number; legacy: number; users: number; spent: number } {
  return conn()
    .prepare(
      `SELECT COALESCE(SUM(kind = 'pick'), 0) AS pick, COALESCE(SUM(kind = 'buy'), 0) AS buy, COALESCE(SUM(kind = 'legacy'), 0) AS legacy,
              COUNT(DISTINCT user_id) AS users, COALESCE(SUM(cost), 0) AS spent FROM lesson_unlocks`,
    )
    .get() as { pick: number; buy: number; legacy: number; users: number; spent: number };
}

/** Bật khoá bài / bỏ miễn phí bài lessonId: ai đã có tiến độ bài nào thì giữ quyền học tiếp bài đó (không tốn lượt chọn / điểm) */
export function unlockLessonsWithProgress(lessonId?: number) {
  conn()
    .prepare(
      `INSERT OR IGNORE INTO lesson_unlocks (user_id, lesson_id, kind, cost, at)
       SELECT p.user_id, l.id, 'legacy', 0, ? FROM progress p JOIN lessons l ON p.source = '/lesson/' || l.id
       WHERE ? IS NULL OR l.id = ?`,
    )
    .run(Date.now(), lessonId ?? null, lessonId ?? null);
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
  dictPick: number[]; // Chính tả: các câu của lượt đang làm ([] = chưa chọn)
  dictRoundAt: number; // lúc bắt đầu lượt đang làm (ms, 0 = chưa biết)
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
  dict_pick: string;
  dict_round_at: number;
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
  dictPick: JSON.parse(r.dict_pick ?? "[]"),
  dictRoundAt: r.dict_round_at ?? 0,
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
      `INSERT INTO progress (user_id, source, title, idx, total, mode, dict_level, dict_done, seen, dict_pick, dict_round_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, source) DO UPDATE SET title = excluded.title, idx = excluded.idx, total = excluded.total,
         mode = excluded.mode, dict_level = excluded.dict_level, dict_done = excluded.dict_done, seen = excluded.seen,
         dict_pick = excluded.dict_pick, dict_round_at = excluded.dict_round_at, updated_at = excluded.updated_at`,
    )
    .run(userId, p.source, p.title, p.idx, p.total, p.mode, p.dictLevel, JSON.stringify(p.dictDone), JSON.stringify(p.seen), JSON.stringify(p.dictPick), p.dictRoundAt, Date.now());
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

// ---- Điểm chính tả ----

export type Points = { total: number; today: number }; // today: điểm hôm nay (theo giờ máy người học) — có thể âm

/**
 * Điểm = cộng của các câu đúng − điểm trừ khi xem từ − điểm đã trả để mở khoá bài (khoản mở khoá không tính vào "hôm nay":
 * hôm nay chỉ đo điểm kiếm được). Game chỉ để chơi vui, không cộng trừ điểm · tzOffset: phút, như Date.getTimezoneOffset() (VN = -420) */
export function getPoints(userId: number, tzOffset = 0, now = Date.now()): Points {
  const dayStart = Date.parse(new Date(now - tzOffset * 60_000).toISOString().slice(0, 10)) + tzOffset * 60_000;
  const r = conn()
    .prepare(
      `SELECT COALESCE(SUM(pts), 0) AS total, COALESCE(SUM(CASE WHEN at >= ? THEN pts END), 0) AS today FROM (
         SELECT pts, at FROM dict_points WHERE user_id = ?
         UNION ALL SELECT -n * pts, at FROM dict_hints WHERE user_id = ?
         UNION ALL SELECT -cost, NULL FROM lesson_unlocks WHERE user_id = ?
       )`,
    )
    .get(dayStart, userId, userId, userId) as Points;
  return { total: r.total, today: r.today };
}

export type LeaderboardEntry = { rank: number; id: number; name: string; total: number };
/** top: những người đứng đầu · me.rank: null = chưa có hạng (điểm ≤ 0) · players: số người có hạng */
export type Leaderboard = { top: LeaderboardEntry[]; me: { rank: number | null; total: number }; players: number };

/**
 * Bảng xếp hạng theo đúng số điểm trên huy hiệu (getPoints): chỉ người có điểm > 0, bằng điểm thì cùng hạng.
 * Chỉ trả tên + điểm — không có email; ảnh đại diện vẫn chỉ chính chủ / admin xem được (route /avatar).
 */
export function getLeaderboard(userId: number, limit = 50): Leaderboard {
  const rows = conn()
    .prepare(
      `SELECT RANK() OVER (ORDER BY t.total DESC) AS rank, u.id, u.name, t.total FROM (
         SELECT user_id, SUM(pts) AS total FROM (
           SELECT user_id, pts FROM dict_points
           UNION ALL SELECT user_id, -n * pts FROM dict_hints
           UNION ALL SELECT user_id, -cost FROM lesson_unlocks
         ) GROUP BY user_id
       ) t JOIN users u ON u.id = t.user_id
       WHERE t.total > 0
       ORDER BY t.total DESC, u.id`,
    )
    .all() as LeaderboardEntry[];
  const mine = rows.find((r) => r.id === userId);
  return { top: rows.slice(0, limit), me: { rank: mine?.rank ?? null, total: mine?.total ?? getPoints(userId).total }, players: rows.length };
}

/** Các câu của 1 bài đã tính đủ điểm */
export function getPointIdx(userId: number, source: string): number[] {
  return (conn().prepare("SELECT idx FROM dict_points WHERE user_id = ? AND source = ? AND open = 0 ORDER BY idx").all(userId, source) as { idx: number }[]).map(
    (r) => r.idx,
  );
}

/** Các câu của 1 bài mới được điểm một phần: câu → số điểm đã cộng */
export function getOpenPoints(userId: number, source: string): Record<number, number> {
  const rows = conn().prepare("SELECT idx, pts FROM dict_points WHERE user_id = ? AND source = ? AND open = 1").all(userId, source) as { idx: number; pts: number }[];
  return Object.fromEntries(rows.map((r) => [r.idx, r.pts]));
}

/** Điểm của lượt đang làm (để hiện lại khi mở lại bài): các câu được điểm + số từ đã xem của từng câu, tính từ lúc bắt đầu lượt */
export function getRoundPoints(userId: number, source: string, p: Progress): { dictRoundEarned: number[]; dictRoundPts: Record<number, number>; dictRoundSpent: Record<number, number> } {
  if (!p.dictRoundAt) return { dictRoundEarned: [], dictRoundPts: {}, dictRoundSpent: {} }; // lượt bắt đầu trước khi có dict_round_at
  const inRound = new Set(p.dictPick);
  const earned = conn().prepare("SELECT idx, pts FROM dict_points WHERE user_id = ? AND source = ? AND at >= ?").all(userId, source, p.dictRoundAt) as { idx: number; pts: number }[];
  const spent = conn()
    .prepare("SELECT idx, SUM(n) AS n FROM dict_hints WHERE user_id = ? AND source = ? AND at >= ? GROUP BY idx")
    .all(userId, source, p.dictRoundAt) as { idx: number; n: number }[];
  return {
    dictRoundEarned: earned.flatMap((r) => (inRound.has(r.idx) ? [r.idx] : [])),
    dictRoundPts: Object.fromEntries(earned.flatMap((r) => (inRound.has(r.idx) ? [[r.idx, r.pts]] : []))),
    dictRoundSpent: Object.fromEntries(spent.flatMap((r) => (inRound.has(r.idx) ? [[r.idx, r.n]] : []))),
  };
}

/**
 * Câu idx giờ đáng `pts` điểm (số từ đúng) → nâng điểm của câu lên mức đó; chỉ lên chứ không xuống nên gõ xoá gõ lại không cộng thêm.
 * open = false: đã đúng hết, câu khép lại. Câu đã khép hoặc không có từ đúng mới → awarded = false, không cộng.
 */
export function awardDictWords(userId: number, source: string, idx: number, pts: number, open: boolean, tzOffset = 0): Points & { awarded: boolean } {
  const r = conn()
    .prepare(
      `INSERT INTO dict_points (user_id, source, idx, at, pts, open) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, source, idx) DO UPDATE SET at = excluded.at, pts = excluded.pts, open = excluded.open
       WHERE dict_points.open = 1 AND excluded.pts > dict_points.pts`,
    )
    .run(userId, source, idx, Date.now(), pts, open ? 1 : 0);
  return { ...getPoints(userId, tzOffset), awarded: r.changes > 0 };
}

/** Xem n từ của câu idx → −n × POINTS_HINT */
export function chargeDictHints(userId: number, source: string, idx: number, n: number, tzOffset = 0): Points {
  conn().prepare("INSERT INTO dict_hints (user_id, source, idx, n, at, pts) VALUES (?, ?, ?, ?, ?, ?)").run(userId, source, idx, n, Date.now(), POINTS_HINT);
  return getPoints(userId, tzOffset);
}

// ---- Game Der Die Das (chơi trên trình duyệt, không lưu ván) ----

export type ArtikelWord = { word: string; gender: "der" | "die" | "das"; meaning: string };

// ---- Sudoku & Caro (luật trong play-game.ts) ----

export type PlayRoomRow = {
  id: number;
  code: string;
  game: "sudoku" | "caro";
  mode: "room" | "solo";
  level: string;
  stake: number;
  capacity: number;
  hostId: number;
  status: "waiting" | "playing" | "ended" | "canceled";
  data: Record<string, unknown>;
  winnerId: number | null;
  reason: string;
  deadline: number;
  version: number;
};
export type PlaySeatRow = { userId: number; name: string; seat: number; stake: number; payout: number; data: Record<string, unknown>; out: boolean };

const ROOM_COLS =
  "id, code, game, mode, level, stake, capacity, host_id AS hostId, status, data, winner_id AS winnerId, reason, deadline, version";
const roomOf = (r: (Omit<PlayRoomRow, "data"> & { data: string }) | undefined): PlayRoomRow | null => (r ? { ...r, data: JSON.parse(r.data) } : null);

export const playRoomByCode = (code: string) => roomOf(conn().prepare(`SELECT ${ROOM_COLS} FROM play_rooms WHERE code = ?`).get(code) as never);
export const playRoomById = (id: number) => roomOf(conn().prepare(`SELECT ${ROOM_COLS} FROM play_rooms WHERE id = ?`).get(id) as never);

export function playSeats(roomId: number): PlaySeatRow[] {
  const rows = conn()
    .prepare(
      `SELECT s.user_id AS userId, COALESCE(u.name, g.name, 'Người chơi') AS name, s.seat, s.stake, s.payout, s.data, s.out
       FROM play_seats s LEFT JOIN users u ON u.id = s.user_id LEFT JOIN play_guests g ON g.id = -s.user_id
       WHERE s.room_id = ? ORDER BY s.seat`,
    )
    .all(roomId) as (Omit<PlaySeatRow, "data" | "out"> & { data: string; out: number })[];
  return rows.map((r) => ({ ...r, data: JSON.parse(r.data), out: !!r.out }));
}

/** Ván chưa xong mà người này còn trong cuộc (mỗi người chỉ 1 ván một lúc) */
export function activePlayRoom(userId: number): { code: string; game: "sudoku" | "caro" } | null {
  return (
    (conn()
      .prepare(
        `SELECT r.code, r.game FROM play_seats s JOIN play_rooms r ON r.id = s.room_id
         WHERE s.user_id = ? AND s.out = 0 AND r.status IN ('waiting', 'playing') ORDER BY s.joined_at DESC LIMIT 1`,
      )
      .get(userId) as { code: string; game: "sudoku" | "caro" } | undefined) ?? null
  );
}

export function createPlayRoom(r: Omit<PlayRoomRow, "id" | "winnerId" | "reason" | "version">, now: number): number {
  return Number(
    conn()
      .prepare(
        `INSERT INTO play_rooms (code, game, mode, level, stake, capacity, host_id, status, data, deadline, created_at, started_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(r.code, r.game, r.mode, r.level, r.stake, r.capacity, r.hostId, r.status, JSON.stringify(r.data), r.deadline, now, r.status === "playing" ? now : null)
      .lastInsertRowid,
  );
}

export function addPlaySeat(roomId: number, userId: number, seat: number, stake: number, data: Record<string, unknown>, now: number) {
  conn().prepare("INSERT INTO play_seats (room_id, user_id, seat, stake, data, joined_at) VALUES (?, ?, ?, ?, ?, ?)").run(roomId, userId, seat, stake, JSON.stringify(data), now);
}

/** Bỏ ghế = hoàn lại kim cương đã đặt */
export const removePlaySeat = (roomId: number, userId: number) => conn().prepare("DELETE FROM play_seats WHERE room_id = ? AND user_id = ?").run(roomId, userId);
export const removePlaySeats = (roomId: number) => conn().prepare("DELETE FROM play_seats WHERE room_id = ?").run(roomId);

export function updatePlayRoom(
  id: number,
  f: Partial<Pick<PlayRoomRow, "status" | "data" | "winnerId" | "reason" | "deadline">> & { startedAt?: number; endedAt?: number },
) {
  const sets: string[] = ["version = version + 1"];
  const vals: (string | number | null)[] = [];
  const put = (col: string, v: string | number | null) => (sets.push(`${col} = ?`), vals.push(v));
  if (f.status !== undefined) put("status", f.status);
  if (f.data !== undefined) put("data", JSON.stringify(f.data));
  if (f.winnerId !== undefined) put("winner_id", f.winnerId);
  if (f.reason !== undefined) put("reason", f.reason);
  if (f.deadline !== undefined) put("deadline", f.deadline);
  if (f.startedAt !== undefined) put("started_at", f.startedAt);
  if (f.endedAt !== undefined) put("ended_at", f.endedAt);
  conn().prepare(`UPDATE play_rooms SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
}

export function updatePlaySeat(roomId: number, userId: number, f: { data?: Record<string, unknown>; out?: boolean; payout?: number }) {
  if (f.data !== undefined) conn().prepare("UPDATE play_seats SET data = ? WHERE room_id = ? AND user_id = ?").run(JSON.stringify(f.data), roomId, userId);
  if (f.out !== undefined) conn().prepare("UPDATE play_seats SET out = ? WHERE room_id = ? AND user_id = ?").run(f.out ? 1 : 0, roomId, userId);
  if (f.payout !== undefined) conn().prepare("UPDATE play_seats SET payout = ? WHERE room_id = ? AND user_id = ?").run(f.payout, roomId, userId);
}

/** Phòng chưa xong đã quá hạn (chờ quá lâu, hết giờ, hết lượt) */
export function duePlayRooms(now: number): number[] {
  return (conn().prepare("SELECT id FROM play_rooms WHERE status IN ('waiting', 'playing') AND deadline < ? LIMIT 50").all(now) as { id: number }[]).map((r) => r.id);
}

/** Khách (tên tạm): tạo mới → id dương trong play_guests (khi chơi dùng −id) */
export const createPlayGuest = (name: string, now: number) =>
  Number(conn().prepare("INSERT INTO play_guests (name, created_at) VALUES (?, ?)").run(name, now).lastInsertRowid);
export const playGuestById = (id: number) =>
  (conn().prepare("SELECT id, name FROM play_guests WHERE id = ?").get(id) as { id: number; name: string } | undefined) ?? null;
export const renamePlayGuest = (id: number, name: string) => conn().prepare("UPDATE play_guests SET name = ? WHERE id = ?").run(name, id);

/** Chạy fn trong 1 giao dịch (fn đồng bộ: không có await chen giữa lúc đọc ván và lúc ghi) */
export function playTx<T>(fn: () => T): T {
  const db = conn();
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
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
  points: Points; // điểm chính tả
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

  const words = listVocab(userId);
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
    speaking: { reps: sp.reps, sentences: sp.n, totalSentences: listStarred(userId).length },
    forgotten: words
      .filter((v) => v.lapses > 0)
      .sort((a, b) => b.lapses - a.lapses)
      .slice(0, 5)
      .map((v) => ({ id: v.id, word: v.word, meaning: v.meaning, lapses: v.lapses })),
    points: getPoints(userId, tzOffset, now),
  };
}
