import type { LessonAccess } from "./lesson-lock";

export type PathLevel = "A1" | "A2" | "B1" | "B2" | "C1";
export type StageId = 1 | 2 | 3;

export const PATH_LEVELS: readonly PathLevel[] = ["A1", "A2", "B1", "B2", "C1"];

export type TrackConfig = {
  from: PathLevel;
  to: "A2" | "B1" | "B2" | "C1" | "C2";
  dailyGoal: number; // số câu mục tiêu mỗi ngày
  dictSentencesGoal: number; // mốc câu Dictation để xong Giai đoạn 1
  shadowSentencesGoal: number; // mốc câu Shadowing để xong Giai đoạn 2
  lessonsToAdvance: number; // số bài đạt ≥80% để sẵn sàng lên trình độ kế tiếp
};

export const TRACKS: Record<PathLevel, TrackConfig> = {
  A1: { from: "A1", to: "A2", dailyGoal: 15, dictSentencesGoal: 40, shadowSentencesGoal: 80, lessonsToAdvance: 3 },
  A2: { from: "A2", to: "B1", dailyGoal: 15, dictSentencesGoal: 50, shadowSentencesGoal: 100, lessonsToAdvance: 3 },
  B1: { from: "B1", to: "B2", dailyGoal: 20, dictSentencesGoal: 60, shadowSentencesGoal: 120, lessonsToAdvance: 4 },
  B2: { from: "B2", to: "C1", dailyGoal: 25, dictSentencesGoal: 70, shadowSentencesGoal: 140, lessonsToAdvance: 4 },
  C1: { from: "C1", to: "C2", dailyGoal: 25, dictSentencesGoal: 80, shadowSentencesGoal: 160, lessonsToAdvance: 4 },
};

export type StageSpec = {
  id: StageId;
  name: string;
  timeframe: string;
  summary: string;
  dailyAction: string;
  ctaLabel: string;
  playerTip: string;
};

export const STAGES: readonly StageSpec[] = [
  {
    id: 1,
    name: "Giai đoạn 1 – Nghe hiểu",
    timeframe: "Tuần 1–2",
    summary: "Nghe câu ngắn, nhận diện từ và luyện Dictation.",
    dailyAction: "câu chép chính tả",
    ctaLabel: "Luyện Nghe hiểu (Dictation)",
    playerTip: "Giai đoạn 1 – Nghe hiểu: nghe từng câu ngắn, gõ chính tả để nhận diện từ còn hay nghe sót.",
  },
  {
    id: 2,
    name: "Giai đoạn 2 – Shadowing",
    timeframe: "Tuần 3–4",
    summary: "Bắt chước ngữ điệu, nối âm và tốc độ nói tự nhiên.",
    dailyAction: "câu nói theo (Shadowing)",
    ctaLabel: "Luyện Shadowing",
    playerTip: "Giai đoạn 2 – Shadowing: nghe và nói nhại theo đúng nhịp, chú ý nối âm và ngữ điệu của người bản xứ.",
  },
  {
    id: 3,
    name: "Giai đoạn 3 – Phản xạ",
    timeframe: "Sau tuần 4",
    summary: "Nghe không phụ đề, kể lại nội dung và trả lời câu hỏi.",
    dailyAction: "câu nghe ẩn phụ đề",
    ctaLabel: "Luyện Phản xạ (ẩn phụ đề)",
    playerTip: "Giai đoạn 3 – Phản xạ: phụ đề đã ẩn — hãy nghe hiểu ý chính, dừng lại kể lại bằng lời của bạn rồi mới mở chữ kiểm tra.",
  },
];

export const stageSpec = (id: StageId): StageSpec => STAGES[id - 1];

export type PathLesson = {
  id: number;
  title: string;
  slug: string;
  videoId: string;
  level: string;
  sentences: number;
  duration: number;
  dictation: boolean;
  percent: number;
  dictCount: number; // số câu Dictation đã chép xong của bài này
  seenCount: number; // số câu Shadowing đã nghe của bài này
  access: LessonAccess;
};

export type WeakWordItem = {
  id: number;
  word: string;
  meaning: string;
  context: string;
  sourceUrl: string | null;
  sourceTitle: string;
  lapses: number;
  stage: number;
  exampleCount: number;
};

const ALL_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const rankOf = (lv: string) => {
  const i = (ALL_LEVELS as readonly string[]).indexOf(lv);
  return i < 0 ? 2 : i;
};

export function isPathLevel(v: unknown): v is PathLevel {
  return typeof v === "string" && (PATH_LEVELS as readonly string[]).includes(v);
}

/** Gợi ý trình độ ban đầu từ bài người dùng đã học gần đây (mặc định B1) */
export function inferInitialLevel(lessons: PathLesson[]): PathLevel {
  const active = lessons.filter((l) => l.percent > 0 && isPathLevel(l.level));
  if (!active.length) return "B1";
  // Ưu tiên bài đang học dở; nếu đều đã xong thì lấy trình độ cao nhất đã học
  const unfinished = active.find((l) => l.percent < 100);
  if (unfinished && isPathLevel(unfinished.level)) return unfinished.level;
  const highest = [...active].sort((a, b) => rankOf(b.level) - rankOf(a.level))[0];
  return highest && isPathLevel(highest.level) ? highest.level : "B1";
}

export type FitInfo = {
  label: string;
  tone: "ok" | "gold" | "link";
  reason: string;
};

export function lessonFit(lesson: PathLesson, target: PathLevel, stage: StageId): FitInfo {
  const diff = rankOf(lesson.level) - rankOf(target);
  const mins = lesson.duration > 0 ? Math.max(1, Math.round(lesson.duration / 60)) : null;
  const meta = [lesson.dictation && stage === 1 ? "Có Dictation" : null, `${lesson.sentences} câu`, mins ? `~${mins} phút` : null].filter(Boolean).join(" · ");
  if (diff === 0) {
    return {
      label: `Đúng trình độ ${target}`,
      tone: "ok",
      reason: lesson.percent > 0 && lesson.percent < 100 ? `Đang học dở (${lesson.percent}%) · ${meta}` : `Phù hợp cho ${stageSpec(stage).name.split("–")[0].trim()} · ${meta}`,
    };
  }
  if (diff > 0) {
    return {
      label: `Thử thách ${lesson.level}`,
      tone: "gold",
      reason: `Khó hơn ${target} một bước — rất tốt để bước sang ${lesson.level} · ${meta}`,
    };
  }
  return {
    label: `Ôn nền ${lesson.level}`,
    tone: "link",
    reason: `Dễ hơn ${target} — phù hợp khởi động tai nghe và tăng tốc độ phản xạ · ${meta}`,
  };
}

export type PathPlan = {
  track: TrackConfig;
  currentStage: StageId;
  stageProgress: Record<StageId, { done: number; goal: number; pct: number }>;
  completedAtLevel: number;
  totalAtLevel: number;
  advanceReady: boolean;
  recommended: PathLesson | null;
  fit: FitInfo | null;
};

/** Tính toán tiến độ lộ trình + bài đề xuất hôm nay cho cặp trình độ `level → next` */
export function buildPathPlan(lessons: PathLesson[], level: PathLevel, viewStage?: StageId): PathPlan {
  const track = TRACKS[level];
  const atLevel = lessons.filter((l) => l.level === level);
  const completedAtLevel = atLevel.filter((l) => l.percent >= 80).length;
  const dictDone = atLevel.reduce((sum, l) => sum + l.dictCount, 0);
  const shadowDone = atLevel.reduce((sum, l) => sum + l.seenCount, 0);

  const pct = (done: number, goal: number) => Math.min(100, Math.round((done * 100) / Math.max(1, goal)));
  const lessonsGoal = Math.min(track.lessonsToAdvance, Math.max(1, atLevel.length || track.lessonsToAdvance));

  const stage1Done = dictDone >= track.dictSentencesGoal || atLevel.filter((l) => l.dictCount >= 15).length >= 2;
  const stage2Done = stage1Done && (shadowDone >= track.shadowSentencesGoal || completedAtLevel >= Math.min(2, lessonsGoal));
  const currentStage: StageId = !stage1Done ? 1 : !stage2Done ? 2 : 3;
  const activeStage = viewStage ?? currentStage;

  const advanceReady =
    (atLevel.length > 0 && completedAtLevel >= lessonsGoal) || (stage1Done && stage2Done && completedAtLevel >= Math.max(2, lessonsGoal - 1));

  // Chọn 1 bài đề xuất tốt nhất cho hôm nay (chỉ ưu tiên bài mở được ngay)
  const open = lessons.filter((l) => l.access !== "locked");
  const openAtLevel = open.filter((l) => l.level === level);
  const openNext = open.filter((l) => l.level === track.to);

  const pickBest = (pool: PathLesson[]): PathLesson | null => {
    if (!pool.length) return null;
    // 1. Bài đang học dở ở trình độ này → hoàn thành tiếp
    const inProgress = pool.find((l) => l.percent > 0 && l.percent < 100);
    if (inProgress) return inProgress;
    // 2. Bài chưa học: Giai đoạn 1 ưu tiên có Dictation + độ dài vừa phải (15–55 câu)
    const fresh = pool.filter((l) => l.percent === 0);
    if (fresh.length) {
      if (activeStage === 1) {
        const withDict = fresh.filter((l) => l.dictation);
        const candidates = withDict.length ? withDict : fresh;
        return [...candidates].sort((a, b) => Math.abs(a.sentences - 30) - Math.abs(b.sentences - 30))[0];
      }
      return [...fresh].sort((a, b) => a.sentences - b.sentences)[0];
    }
    return null;
  };

  let recommended: PathLesson | null = null;
  if (advanceReady && openNext.length) {
    recommended = pickBest(openNext) ?? openNext[0];
  } else {
    recommended =
      pickBest(openAtLevel) ??
      pickBest(openNext) ??
      openAtLevel[0] ??
      [...open].sort((a, b) => Math.abs(rankOf(a.level) - rankOf(level)) - Math.abs(rankOf(b.level) - rankOf(level)))[0] ??
      null;
  }

  return {
    track,
    currentStage,
    stageProgress: {
      1: { done: dictDone, goal: track.dictSentencesGoal, pct: pct(dictDone, track.dictSentencesGoal) },
      2: { done: shadowDone, goal: track.shadowSentencesGoal, pct: pct(shadowDone, track.shadowSentencesGoal) },
      3: { done: completedAtLevel, goal: lessonsGoal, pct: pct(completedAtLevel, lessonsGoal) },
    },
    completedAtLevel,
    totalAtLevel: atLevel.length,
    advanceReady,
    recommended,
    fit: recommended ? lessonFit(recommended, level, activeStage) : null,
  };
}
