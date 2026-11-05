"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  Eye,
  EyeOff,
  Keyboard,
  Languages,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Square,
  Star,
  VideoOff,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { formatTime, mergeIntoSentences, type Segment } from "@/lib/subtitles";
import { hasWords, pickDictation, POINTS_CORRECT, POINTS_HINT, type DictationLevel } from "@/lib/dictation";
import { tokenize, type Phrase } from "@/lib/phrase-match";
import type { PlayerHandle } from "@/lib/player";
import { clientApi } from "@/lib/client-api";
import { isSentence } from "@/lib/review";
import { emitPoints } from "@/lib/points";
import { prefetchGerman } from "@/lib/speak";
import { useRecorder } from "@/hooks/useRecorder";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import YouTubePlayer from "./YouTubePlayer";
import LevelBadge from "./LevelBadge";
import DictationPanel, { type DictDraft } from "./DictationPanel";
import Mascot from "./Mascot";
import { Gem } from "./PointsBadge";
import { SoundMark, SoundWave } from "./SoundBars";
import WordPopup from "./WordPopup";

type Settings = {
  mode: "segment" | "free"; // dừng sau mỗi câu | phát liên tục
  rate: number;
  repeat: number; // số lần phát mỗi câu
  gapFactor: number; // thời gian nghỉ để nói lại = gapFactor × độ dài câu
  autoNext: boolean;
  autoRecord: boolean; // tự ghi âm trong lúc nghỉ
  hideText: boolean;
  hideMedia: boolean; // thu gọn khung video (vẫn phát tiếng)
  dictHideMedia: boolean; // như hideMedia nhưng riêng cho Chính tả (bật / tắt độc lập với Shadowing)
  practice: "shadow" | "dictation"; // nói theo | nghe chép chính tả
  dictLevel: DictationLevel;
  showTranslation: boolean; // hiện bản dịch tiếng Việt dưới mỗi câu
  merge: boolean; // gộp dòng thành câu
};

const DEFAULTS: Settings = {
  mode: "segment",
  rate: 1,
  repeat: 1,
  gapFactor: 1.2,
  autoNext: false,
  autoRecord: false,
  hideText: false,
  hideMedia: false,
  dictHideMedia: false,
  practice: "shadow",
  dictLevel: "normal",
  showTranslation: false,
  merge: true,
};

const SETTINGS_KEY = "shadow-settings";
const NO_SETTINGS: Partial<Settings> = {};
const RATES = [0.5, 0.75, 0.85, 1, 1.25];
const LANG = "vi"; // ngôn ngữ nghĩa cụm từ (giao diện web chỉ có tiếng Việt)

type DictResult = { correct: number; total: number };
/** Tiến độ 1 bài (GET /progress?source=…) — dùng chung với app */
type Progress = {
  idx: number;
  mode: "shadow" | "dictation";
  dictLevel: string;
  dictDone: Record<string, DictResult>;
  seen?: number[];
  dictPick?: number[];
  dictRoundPts?: Record<number, number>;
  dictRoundSpent?: Record<number, number>;
};
type VocabItem = { id: number; word: string; meaning: string; context: string };

/** Công tắc dạng chip, đặt ngay cạnh thứ nó tác động: bật thì nền màu + viền đậm */
function Chip({
  on,
  onToggle,
  icon: Icon,
  label,
  title,
}: {
  on: boolean;
  onToggle: () => void;
  icon: typeof Star;
  label: ReactNode;
  title?: string;
}) {
  return (
    <button role="switch" aria-checked={on} className={`chip ${on ? "chip-on" : ""}`} onClick={onToggle} title={title}>
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  );
}

/** Nhóm nút chọn 1 trong nhiều (Dễ / Vừa / Khó) */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string, string?])[]; // [giá trị, nhãn, tooltip]
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-full border-2 border-ink bg-card p-0.5 text-sm font-extrabold">
      {options.map(([v, label, title]) => (
        <button
          key={v}
          title={title}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`cursor-pointer rounded-full px-3 py-1 transition ${value === v ? "bg-ink text-white" : "text-muted hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** 1 bước trong vòng Nghe → Nói → So sánh: nút tròn lớn, bước đang tới lượt thì đổi màu theo sân khấu */
function Step({
  icon: Icon,
  label,
  keyHint,
  active,
  recording,
  disabled,
  onClick,
}: {
  icon: typeof Star;
  label: string;
  keyHint: string;
  active: boolean;
  recording?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`step ${active ? "step-on" : ""} ${recording ? "step-rec" : ""}`} onClick={onClick} disabled={disabled} aria-current={active ? "step" : undefined}>
      <span className="step-dot">
        <Icon className="size-6" />
      </span>
      <span className="flex items-center gap-1.5 text-sm font-extrabold">
        {label} <kbd className="max-md:hidden">{keyHint}</kbd>
      </span>
    </button>
  );
}

const PRACTICES = [
  ["shadow", "Shadowing", Mic],
  ["dictation", "Dictation", Keyboard],
] as const;
const DICT_LEVELS = [
  ["easy", "Dễ", "Gợi ý chữ cái đầu"],
  ["normal", "Vừa", "Gợi ý số chữ cái"],
  ["hard", "Khó", "Không gợi ý"],
] as const;

/** "Kamera," → "Kamera" (bỏ dấu câu quanh từ) */
const cleanWord = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/** "Guten Tag!" → "****** ***!" (chế độ ẩn chữ) */
const mask = (s: string) => s.replace(/[\p{L}\p{N}]/gu, "*");

/**
 * 1 câu tách theo từ: cụm từ cố định tô xanh + gạch chân (bấm → bảng tra cả cụm), từ đã lưu tô vàng.
 * Không truyền onWord → từ thường chỉ hiện chữ (bấm vào khung câu để phát).
 */
function SentenceText({
  text,
  phrases,
  saved,
  onWord,
  onPhrase,
}: {
  text: string;
  phrases: Phrase[];
  saved?: Map<string, number>;
  onWord?: (word: string) => void;
  onPhrase?: (p: Phrase) => void;
}) {
  const tokens = tokenize(text, phrases);
  return tokens.map(({ word: w, phrase: p }, k) => {
    const joined = p >= 0 && tokens[k + 1]?.phrase === p; // gạch chân liền giữa các từ cùng cụm
    const cw = cleanWord(w);
    const cls =
      p >= 0 ? "font-semibold text-phrase underline decoration-phrase/60 underline-offset-4" : saved?.has(cw.toLowerCase()) ? "text-amber" : "";
    const click = p >= 0 ? onPhrase && (() => onPhrase(phrases[p])) : onWord && cw ? () => onWord(cw) : undefined;
    return (
      <Fragment key={k}>
        {click ? (
          <button
            title={p >= 0 ? "Xem cụm từ" : "Tra từ / lưu từ"}
            onClick={(e) => {
              e.stopPropagation();
              click();
            }}
            className={`cursor-pointer rounded px-0.5 transition hover:bg-[var(--stage)] ${cls}`}
          >
            {w}
          </button>
        ) : (
          <span className={cls}>{w}</span>
        )}
        {joined ? <span className={cls}> </span> : " "}
      </Fragment>
    );
  });
}

export default function ShadowPlayer({
  title,
  level,
  videoId,
  segments: rawSegments,
  backHref = "/",
  loggedIn = false,
  sourceUrl = null,
  allowDictation = false,
  children,
}: {
  title: string;
  level?: string;
  loggedIn?: boolean; // đã đăng nhập → tra từ, cụm từ, lưu từ / đánh dấu câu, đồng bộ tiến độ
  sourceUrl?: string | null; // trang hiện tại (/lesson/1, /watch/…), lưu kèm từ vựng để mở lại
  allowDictation?: boolean; // bài admin bật Chính tả; video tự dán chỉ Shadowing
  videoId: string;
  segments: Segment[];
  backHref?: string;
  children?: ReactNode; // thông tin thêm hiển thị dưới video
}) {
  // Đọc cài đặt qua useSyncExternalStore: server và lần hydrate đầu dùng DEFAULTS, không lệch HTML
  const [stored, setStored] = useLocalStorage(SETTINGS_KEY, NO_SETTINGS);
  const settings = useMemo<Settings>(
    () => ({ ...DEFAULTS, ...stored, ...(allowDictation ? {} : { practice: "shadow" as const }) }),
    [stored, allowDictation],
  );
  const segments = useMemo(
    () => (settings.merge ? mergeIntoSentences(rawSegments) : rawSegments),
    [rawSegments, settings.merge],
  );
  const texts = useMemo(() => segments.map((s) => s.text), [segments]);
  const dictTotal = useMemo(() => texts.filter(hasWords).length, [texts]); // số câu chép được (bỏ câu chỉ có ký hiệu)
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [gap, setGap] = useState<{ ms: number; id: number } | null>(null);
  const [panel, setPanel] = useState<"settings" | "keys" | null>(null);
  const [picked, setPicked] = useState<{ word: string; context: string; marks?: string[] } | null>(null); // bảng tra từ đang mở
  const [saved, setSaved] = useState<Map<string, number>>(new Map()); // từ đã lưu (chữ thường) → id trong sổ từ vựng
  const [stars, setStars] = useState<Map<string, number>>(new Map()); // câu ⭐ (chữ thường) → id
  const [starFilter, setStarFilter] = useState(false); // Shadowing: chỉ hiện các câu ⭐
  const [revealed, setRevealed] = useState<Set<number>>(new Set()); // câu đã bấm 👁 xem chữ khi đang ẩn
  const [seen, setSeen] = useState<Set<number>>(new Set()); // câu đã thực sự nghe (Shadowing) — % tiến độ tính theo số này
  const [dictDone, setDictDone] = useState<Record<number, DictResult>>({}); // câu chính tả đã xong
  const [dictDrafts, setDictDrafts] = useState<Record<number, DictDraft>>({}); // chữ đã gõ / từ đã xem của từng câu (quay lại vẫn còn)
  const [dictEpoch, setDictEpoch] = useState(0); // "Học lại từ đầu" → dựng lại ô chính tả
  const [dictPick, setDictPick] = useState<number[]>([]); // lượt chính tả đang làm: 5–10 câu ngẫu nhiên chưa chép
  const [pointIdx, setPointIdx] = useState<Set<number>>(new Set()); // câu đã được tính điểm (server + vừa được) — mỗi câu chỉ 1 lần
  const awarded = useRef<Record<number, number>>({}); // điểm đã cộng của các câu chưa tính đủ — đọc ngay khi gõ nhanh, không chờ render
  const [earned, setEarned] = useState<Record<number, number>>({}); // điểm được của từng câu trong lượt này
  const [spent, setSpent] = useState<Record<number, number>>({}); // số từ đã bấm xem của từng câu trong lần mở bài này (điểm bị trừ)
  const [tr, setTr] = useState<Record<string, string>>({}); // câu gốc → bản dịch tiếng Việt
  const [trShown, setTrShown] = useState<Set<number>>(new Set()); // câu bấm "Dịch câu này" khi chưa bật bản dịch
  const [trError, setTrError] = useState("");
  const trPending = useRef<Set<string>>(new Set());
  const showPhr = loggedIn; // luôn tô sáng cụm từ cố định (AI phân tích, cần tài khoản)
  const [phr, setPhr] = useState<Record<string, Phrase[]>>({}); // câu → cụm từ trong câu
  const [phrError, setPhrError] = useState("");
  const phrPending = useRef<Set<string>>(new Set());
  const recorder = useRecorder();

  const handleRef = useRef<PlayerHandle | null>(null);
  const stopAtRef = useRef<number | null>(null);
  const repeatCountRef = useRef(0);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const dictation = settings.practice === "dictation";
  const mediaHidden = dictation ? settings.dictHideMedia : settings.hideMedia;
  const starredOnly = starFilter && loggedIn && !dictation; // Chính tả luôn theo lượt ngẫu nhiên, không lọc câu ⭐
  // Chỉ câu ⭐: chuyển câu nhảy giữa các câu đã đánh dấu · Chính tả: chỉ các câu của lượt đang làm
  const starredIdx = useMemo(() => segments.flatMap((s, i) => (stars.has(s.text.toLowerCase()) ? [i] : [])), [segments, stars]);
  const queue = starredOnly ? starredIdx : dictation ? dictPick : null; // null = mọi câu
  const inQueue = useMemo(() => queue && new Set(queue), [queue]);
  const nextIdx = queue ? queue.find((i) => i > idx) : idx < segments.length - 1 ? idx + 1 : undefined;
  const prevIdx = queue ? queue.findLast((i) => i < idx) : idx > 0 ? idx - 1 : undefined;

  // Ref luôn giữ giá trị mới nhất để dùng trong interval/timer
  const live = useRef({ settings, stored, segments, idx, recorder, nextIdx, prevIdx, picked });
  useEffect(() => {
    live.current = { settings, stored, segments, idx, recorder, nextIdx, prevIdx, picked };
  });

  const update = useCallback(
    // Ghi lên cài đặt đã lưu (không phải bản đã ép Shadowing) → video không có Chính tả không làm mất lựa chọn ở bài khác
    (patch: Partial<Settings>) => setStored({ ...live.current.stored, ...patch }),
    [setStored],
  );

  // Câu vừa được phát → tính là đã nghe (chỉ chọn câu mà không phát thì không tính)
  const markSeen = useCallback((i: number) => {
    if (live.current.settings.practice !== "dictation") setSeen((s) => (s.has(i) ? s : new Set(s).add(i)));
  }, []);

  const clearGap = useCallback(() => {
    if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    gapTimerRef.current = null;
    setGap(null);
  }, []);

  const playSegment = useCallback(
    (i: number) => {
      const h = handleRef.current;
      const { segments, settings } = live.current;
      const s = segments[i];
      if (!h || !s) return;
      clearGap();
      setIdx(i);
      markSeen(i);
      live.current.idx = i;
      h.setRate(settings.rate);
      h.seek(s.start);
      h.play();
      // Chính tả luôn dừng sau mỗi câu
      stopAtRef.current = settings.mode === "free" && settings.practice !== "dictation" ? null : s.end;
      setPlaying(true);
    },
    [clearGap, markSeen],
  );

  /** Người dùng chủ động chọn câu → reset bộ đếm lặp */
  const go = useCallback(
    (i: number) => {
      repeatCountRef.current = 0;
      playSegment(i);
    },
    [playSegment],
  );

  const pause = useCallback(() => {
    handleRef.current?.pause();
    stopAtRef.current = null;
    clearGap();
    setPlaying(false);
  }, [clearGap]);

  // Khi một câu phát xong: lặp lại / nghỉ để nói / sang câu tiếp
  const onSegmentEnd = useCallback(() => {
    const { settings, segments, idx, recorder, nextIdx } = live.current;
    const s = segments[idx];
    // Chính tả: chỉ lặp lại câu theo cài đặt, không nghỉ / ghi âm / tự sang câu (người học đang gõ)
    if (settings.practice === "dictation") {
      if (repeatCountRef.current + 1 < settings.repeat) {
        repeatCountRef.current++;
        playSegment(idx);
      }
      return;
    }
    const gapMs = settings.gapFactor > 0 ? ((s.end - s.start) / settings.rate) * settings.gapFactor * 1000 + 300 : 0;

    let target: number | null = null;
    if (repeatCountRef.current + 1 < settings.repeat) {
      repeatCountRef.current++;
      target = idx;
    } else if (settings.autoNext && nextIdx !== undefined) {
      repeatCountRef.current = 0;
      target = nextIdx;
    }

    if (!gapMs) {
      if (target !== null) playSegment(target);
      return;
    }
    if (settings.autoRecord) void recorder.start(idx);
    if (target === null && !settings.autoRecord) return;

    const id = Date.now();
    setGap({ ms: gapMs, id });
    gapTimerRef.current = setTimeout(() => {
      setGap(null);
      if (settings.autoRecord) live.current.recorder.stop();
      if (target !== null) playSegment(target);
    }, gapMs);
  }, [playSegment]);

  // Theo dõi thời gian phát
  useEffect(() => {
    const timer = setInterval(() => {
      const h = handleRef.current;
      if (!h) return;
      const t = h.getTime();
      setTime((prev) => (Math.floor(prev) === Math.floor(t) ? prev : t)); // chỉ render lại mỗi giây
      const { settings, segments, idx } = live.current;
      if (stopAtRef.current !== null) {
        if (t >= stopAtRef.current - 0.03) {
          h.pause();
          stopAtRef.current = null;
          setPlaying(false);
          onSegmentEnd();
        }
      } else if (settings.mode === "free") {
        let i = segments.findIndex((s, k) => t >= s.start && t < (segments[k + 1]?.start ?? Infinity));
        if (i === -1) i = 0;
        if (i !== idx) {
          setIdx(i);
          markSeen(i);
        }
      }
    }, 40);
    return () => clearInterval(timer);
  }, [onSegmentEnd, markSeen]);

  useEffect(() => clearGap, [clearGap]);

  /** Dịch câu i và ~20 câu kế tiếp (chỉ những câu chưa có / chưa đang dịch); server có kho bản dịch dùng chung */
  const translateFrom = useCallback(
    async (i: number) => {
      const list = segments
        .slice(i, i + 20)
        .map((s) => s.text)
        .filter((t) => !(t in tr) && !trPending.current.has(t));
      if (!list.length) return;
      list.forEach((t) => trPending.current.add(t));
      try {
        const data = await clientApi<{ translations: string[] }>("/translate", { method: "POST", body: { sentences: list } });
        setTrError("");
        setTr((prev) => ({ ...prev, ...Object.fromEntries(list.map((t, k) => [t, data.translations[k]])) }));
      } catch (e) {
        setTrError((e as Error).message);
      } finally {
        list.forEach((t) => trPending.current.delete(t));
      }
    },
    [segments, tr],
  );

  // Bật bản dịch → dịch trước các câu sắp học
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gọi API; setState chỉ chạy sau khi có kết quả
    if (settings.showTranslation) void translateFrom(idx);
  }, [settings.showTranslation, idx, translateFrom]);

  /** Tìm cụm từ cố định cho câu i và ~30 câu kế tiếp (server phân tích 1 lần mỗi câu, dùng chung mọi người) */
  const phrasesFrom = useCallback(
    async (i: number) => {
      const list = segments
        .slice(i, i + 30)
        .map((s) => s.text)
        .filter((x) => !(x in phr) && !phrPending.current.has(x));
      if (!list.length) return;
      list.forEach((x) => phrPending.current.add(x));
      try {
        const r = await clientApi<{ phrases: Phrase[][] }>("/phrases", { method: "POST", body: { sentences: list, lang: LANG } });
        setPhrError("");
        setPhr((prev) => ({ ...prev, ...Object.fromEntries(list.map((x, k) => [x, r.phrases[k] ?? []])) }));
      } catch (e) {
        setPhrError((e as Error).message);
      } finally {
        list.forEach((x) => phrPending.current.delete(x));
      }
    },
    [segments, phr],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gọi API; setState chỉ chạy sau khi có kết quả
    if (showPhr) void phrasesFrom(idx);
  }, [showPhr, idx, phrasesFrom]);

  // Cuộn danh sách tới câu đang học
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    if (list && el)
      list.scrollTo({
        top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2,
        behavior: "smooth",
      });
  }, [idx]);

  const toggleHideText = useCallback(() => {
    update({ hideText: !live.current.settings.hideText });
    setRevealed(new Set());
  }, [update]);

  // Phím tắt (tắt khi đang mở bảng tra từ)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      const { idx, recorder, nextIdx, prevIdx, picked } = live.current;
      if (picked) return;
      const dictating = live.current.settings.practice === "dictation"; // chính tả: ↑ ↓ đổi câu, ← → dành cho đổi ô
      if (e.code === "Space") {
        e.preventDefault();
        if (playing) pause();
        else go(idx);
      } else if (e.key === (dictating ? "ArrowUp" : "ArrowLeft")) {
        if (dictating) e.preventDefault();
        if (prevIdx !== undefined) go(prevIdx);
      } else if (e.key === (dictating ? "ArrowDown" : "ArrowRight")) {
        if (dictating) e.preventDefault();
        if (nextIdx !== undefined) go(nextIdx);
      } else if (e.key === "r" || e.key === "R") {
        if (recorder.recordingKey !== null) recorder.stop();
        else void recorder.start(idx);
      } else if (e.key === "p" || e.key === "P") recorder.play(idx);
      else if ((e.key === "h" || e.key === "H") && live.current.settings.practice !== "dictation") toggleHideText();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, pause, go, toggleHideText]);

  const onReady = useCallback((h: PlayerHandle) => {
    handleRef.current = h;
  }, []);

  const current = segments[idx];

  // ---- Bấm vào từ / cụm từ: bảng tra từ + lưu từ ----
  const pickWord = (word: string, context = current?.text ?? "") => {
    if (!word) return;
    pause(); // dừng video để xem nghĩa / nghe phát âm; bấm ▶ để phát tiếp
    setPicked({ word, context });
  };
  const pickPhrase = (p: Phrase, context: string) => {
    pause();
    setPicked({ word: p.base, context, marks: p.parts });
  };
  const closePicked = useCallback(() => setPicked(null), []);

  // Ở lại câu một chút → tải sẵn giọng đọc mọi từ / cụm bấm được trong câu, bấm vào là phát ngay
  const curHidden = dictation ? !dictDone[idx] : settings.hideText && !revealed.has(idx);
  const curPhrases = current && showPhr && !curHidden ? phr[current.text] : undefined;
  useEffect(() => {
    if (!loggedIn || !current || curHidden) return;
    const timer = setTimeout(() => {
      const phrases = curPhrases ?? [];
      const words = tokenize(current.text, phrases).flatMap(({ word, phrase }) => (phrase >= 0 ? [] : [cleanWord(word)]));
      new Set([...words, ...phrases.map((p) => p.base)]).forEach((w) => w && prefetchGerman(w));
    }, 600);
    return () => clearTimeout(timer);
  }, [loggedIn, current, curHidden, curPhrases]);

  // Mở bài → tải sổ từ vựng để tô màu từ đã lưu, tải câu ⭐ để hiện sao
  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    clientApi<{ vocab: VocabItem[] }>("/vocab")
      .then(({ vocab }) => alive && setSaved(new Map(vocab.filter((v) => !isSentence(v)).map((v) => [v.word.toLowerCase(), v.id]))))
      .catch(() => {});
    clientApi<{ stars: { id: number; text: string }[] }>("/stars")
      .then(({ stars: list }) => alive && setStars(new Map(list.map((s) => [s.text.toLowerCase(), s.id]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loggedIn]);

  const saveWord = async (word: string, context: string, meaning: string) => {
    try {
      const r = await clientApi<{ item?: VocabItem; vocab: VocabItem[] }>("/vocab", {
        method: "POST",
        body: { word, context, sourceUrl, sourceTitle: title },
      });
      const item = r.item ?? r.vocab.find((v) => v.word.toLowerCase() === word.toLowerCase());
      if (item) setSaved((s) => new Map(s).set(word.toLowerCase(), item.id));
      // Điền sẵn nghĩa AI vừa giải thích nếu từ chưa có nghĩa
      if (item && !item.meaning && meaning) await clientApi(`/vocab/${item.id}`, { method: "PATCH", body: { meaning } }).catch(() => {});
    } catch (e) {
      alert(`Không lưu được: ${(e as Error).message}`);
    }
  };
  /** Bỏ từ khỏi sổ từ vựng (bỏ ngay trên màn hình, xoá trên server sau) */
  const unsave = async (text: string) => {
    const id = saved.get(text.toLowerCase());
    if (id === undefined) return;
    setSaved((s) => {
      const m = new Map(s);
      m.delete(text.toLowerCase());
      return m;
    });
    await clientApi(`/vocab/${id}`, { method: "DELETE" }).catch(() => {});
  };
  // Sao trên mỗi câu: đánh dấu câu để lọc ở Shadowing (không vào sổ từ vựng); bấm lại để bỏ
  const toggleStar = async (text: string) => {
    const key = text.toLowerCase();
    const id = stars.get(key);
    try {
      if (id === undefined) {
        const { star } = await clientApi<{ star: { id: number } }>("/stars", { method: "POST", body: { text, sourceUrl, sourceTitle: title } });
        setStars((s) => new Map(s).set(key, star.id));
      } else {
        setStars((s) => {
          const m = new Map(s);
          m.delete(key);
          return m;
        });
        await clientApi("/stars", { method: "DELETE", body: { id } });
      }
    } catch (e) {
      if (id !== undefined) setStars((s) => new Map(s).set(key, id));
      alert(`Không lưu được: ${(e as Error).message}`);
    }
  };

  /** Chọn câu `i` mà không phát (bấm ▶ để nghe) */
  const select = (i: number) => {
    pause();
    setIdx(i);
    if (segments[i]) handleRef.current?.seek(segments[i].start);
  };
  const prev = () => prevIdx !== undefined && go(prevIdx);
  const next = () => nextIdx !== undefined && go(nextIdx);
  // Chính tả: hết câu phía sau mà lượt còn câu chưa chép (đã bỏ qua) → quay lại câu đó
  const dictNextIdx = nextIdx ?? dictPick.find((k) => !dictDone[k] && k !== idx);
  /** Câu đang chọn không có sao → về câu ⭐ gần nhất */
  const toNearestStarred = () => {
    const i = starredIdx.find((k) => k >= idx) ?? starredIdx.at(-1);
    if (i !== undefined && i !== idx) select(i);
  };
  const toggleStarredOnly = () => {
    setStarFilter(!starFilter);
    if (!starFilter) toNearestStarred();
  };

  // ---- Lượt chính tả ----
  /** Câu nên mở khi vào lượt: câu đang chọn nếu thuộc lượt, không thì câu đầu tiên chưa chép */
  const roundStart = (round: number[]) => (round.includes(idx) ? idx : (round.find((k) => !dictDone[k]) ?? round[0]));
  /** Lượt chính tả đang làm; chưa có → chọn lượt mới */
  const ensureRound = () => {
    if (dictPick.length) return dictPick;
    const round = pickDictation(texts, dictDone);
    setDictPick(round);
    return round;
  };
  const newRound = () => {
    const round = pickDictation(texts, dictDone);
    setDictPick(round);
    setDictDrafts({});
    setEarned({});
    setSpent({});
    if (round.length) select(round[0]);
  };
  const changePractice = (p: Settings["practice"]) => {
    pause();
    update({ practice: p });
    // Về Shadowing đang lọc câu ⭐ → về câu ⭐ gần nhất
    if (p !== "dictation") return starFilter && toNearestStarred();
    // Vào Chính tả → mở câu của lượt đang làm (chưa có lượt thì chọn ngẫu nhiên 5–10 câu)
    const i = roundStart(ensureRound());
    if (i !== undefined && i !== idx) select(i);
  };

  // ---- Tiến độ học: lưu theo tài khoản, đồng bộ với app (chỉ khi gộp câu — app luôn gộp nên số câu mới khớp) ----
  const syncProgress = loggedIn && !!sourceUrl && settings.merge;
  const [resumed, setResumed] = useState<number | null>(null);
  const progressLoaded = useRef(false);
  const pendingSave = useRef<object | null>(null);
  const loadKey = `${sourceUrl}|${segments.length}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const ready = !syncProgress || loadedKey === loadKey; // đã tải xong tiến độ (hoặc không cần tải)

  useEffect(() => {
    progressLoaded.current = false;
    if (!syncProgress || !segments.length) return;
    let alive = true;
    clientApi<{ progress: Progress | null }>(`/progress?source=${encodeURIComponent(sourceUrl!)}`)
      .then(({ progress: p }) => {
        if (!alive || !p) return;
        const done = Object.fromEntries(Object.entries(p.dictDone).filter(([k]) => Number(k) < segments.length));
        const dict = allowDictation && p.mode === "dictation";
        // Lượt chính tả đã lưu (chưa có mà đang ở Chính tả → chọn lượt mới)
        const pick = (p.dictPick ?? []).filter((k) => k < segments.length && hasWords(texts[k]));
        const round = pick.length || !dict ? pick : pickDictation(texts, done);
        let i = Math.min(p.idx, segments.length - 1);
        if (dict && round.length && !round.includes(i)) i = round.find((k) => !done[k]) ?? round[0];
        setIdx(i);
        setDictPick(round);
        // Chế độ + mức chính tả học lần trước (trên web hay app) — 1 lần ghi để không đè nhau
        const patch: Partial<Settings> = {};
        if (allowDictation) patch.practice = p.mode;
        if (p.dictLevel === "easy" || p.dictLevel === "normal" || p.dictLevel === "hard") patch.dictLevel = p.dictLevel;
        update(patch);
        setDictDone(done);
        setEarned(p.dictRoundPts ?? {});
        setSpent(p.dictRoundSpent ?? {});
        // Gộp (không ghi đè): có thể đã phát vài câu trong lúc chờ tải
        setSeen((s) => new Set([...s, ...(p.seen ?? []).filter((k) => k < segments.length)]));
        if (i > 0 || Object.keys(done).length) setResumed(i);
      })
      .catch(() => {})
      .finally(() => {
        if (!alive) return;
        progressLoaded.current = true;
        setLoadedKey(`${sourceUrl}|${segments.length}`);
      });
    return () => {
      alive = false;
    };
  }, [syncProgress, sourceUrl, segments.length, texts, allowDictation, update]);

  // ---- Điểm chính tả: gõ đúng 1 từ → +1 ngay, mỗi từ của câu chỉ tính 1 lần; mỗi từ bấm xem → −2 (cần tài khoản, như tiến độ) ----
  useEffect(() => {
    if (!syncProgress) return;
    let alive = true;
    clientApi<{ idx: number[]; open: Record<number, number> }>(`/points?source=${encodeURIComponent(sourceUrl!)}`)
      .then((r) => {
        if (!alive) return;
        awarded.current = { ...r.open, ...awarded.current };
        setPointIdx((s) => new Set([...s, ...r.idx]));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [syncProgress, sourceUrl]);
  /** Số từ đúng của câu i vừa tăng quá số đã được điểm → cộng phần chênh (hiện ngay, gửi server sau), trả về số điểm vừa được */
  const dictEarn = (i: number, correct: number, total: number, input: string, revealed: number[]) => {
    const gain = correct * POINTS_CORRECT - (awarded.current[i] ?? 0);
    if (!syncProgress || gain <= 0 || pointIdx.has(i)) return 0;
    awarded.current[i] = correct * POINTS_CORRECT;
    setEarned((e) => ({ ...e, [i]: (e[i] ?? 0) + gain }));
    if (correct === total) setPointIdx((s) => new Set(s).add(i));
    clientApi<{ total: number }>("/points", { method: "POST", body: { source: sourceUrl, idx: i, input, revealed, tz: new Date().getTimezoneOffset() } })
      .then((r) => emitPoints({ total: r.total }))
      .catch(() => {
        // Chưa lưu được → bỏ điểm tạm tính, từ đúng tiếp theo của câu này sẽ tính lại cả phần này
        awarded.current[i] = Math.max((awarded.current[i] ?? 0) - gain, 0);
        setPointIdx((s) => new Set([...s].filter((k) => k !== i)));
        setEarned((e) => ({ ...e, [i]: Math.max((e[i] ?? 0) - gain, 0) }));
        emitPoints({ delta: -gain });
      });
    return gain;
  };
  /** Làm xong câu chính tả → lưu kết quả */
  const dictFinished = (i: number, correct: number, total: number) => setDictDone((d) => ({ ...d, [i]: { correct, total } }));
  /** Bấm xem n từ của câu i → trừ điểm ngay, gửi server sau */
  const dictHint = (i: number, n: number) => {
    const cost = n * POINTS_HINT;
    setSpent((s) => ({ ...s, [i]: (s[i] ?? 0) + n }));
    emitPoints({ delta: -cost });
    clientApi<{ total: number }>("/points", { method: "POST", body: { source: sourceUrl, idx: i, hints: n, tz: new Date().getTimezoneOffset() } })
      .then((r) => emitPoints({ total: r.total }))
      .catch(() => {
        // Chưa lưu được → trả lại điểm tạm trừ
        setSpent((s) => ({ ...s, [i]: Math.max((s[i] ?? 0) - n, 0) }));
        emitPoints({ delta: cost });
      });
  };

  // Mở bài đang ở Chính tả mà chưa có lượt → chọn lượt đầu tiên
  const roundInit = useRef(false);
  useEffect(() => {
    if (!dictation || !ready || roundInit.current || dictPick.length) return;
    roundInit.current = true;
    const round = pickDictation(texts, dictDone);
    /* eslint-disable react-hooks/set-state-in-effect -- chọn lượt 1 lần khi mở bài ở chế độ Chính tả */
    setDictPick(round);
    if (round.length && !round.includes(idx)) setIdx(round.find((k) => !dictDone[k]) ?? round[0]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [dictation, ready, dictPick.length, texts, dictDone, idx]);

  const flushProgress = useCallback(() => {
    const b = pendingSave.current;
    pendingSave.current = null;
    // keepalive: vẫn gửi được khi đang đóng tab / chuyển trang
    if (b) clientApi("/progress", { method: "PUT", body: b, keepalive: true }).catch(() => {});
  }, []);
  // Lưu sau 1,5 giây kể từ thay đổi cuối (đổi câu, đổi chế độ, làm xong câu chính tả…)
  useEffect(() => {
    if (!syncProgress || !progressLoaded.current || !segments.length) return;
    pendingSave.current = {
      source: sourceUrl,
      title,
      idx,
      total: segments.length,
      mode: settings.practice,
      dictLevel: settings.dictLevel,
      dictDone,
      seen: [...seen],
      dictPick,
    };
    const id = setTimeout(flushProgress, 1500);
    return () => clearTimeout(id);
  }, [syncProgress, sourceUrl, title, idx, segments.length, settings.practice, settings.dictLevel, dictDone, seen, dictPick, flushProgress]);
  useEffect(() => {
    window.addEventListener("pagehide", flushProgress);
    return () => {
      window.removeEventListener("pagehide", flushProgress);
      flushProgress(); // rời trang trong app (chuyển route)
    };
  }, [flushProgress]);
  // Thông báo "tiếp tục từ câu …" tự ẩn sau 8 giây
  useEffect(() => {
    if (resumed === null) return;
    const id = setTimeout(() => setResumed(null), 8000);
    return () => clearTimeout(id);
  }, [resumed]);

  const restartProgress = () => {
    pause();
    pendingSave.current = null;
    if (syncProgress) clientApi(`/progress?source=${encodeURIComponent(sourceUrl!)}`, { method: "DELETE" }).catch(() => {});
    const round = dictation ? pickDictation(texts, {}) : [];
    setIdx(round.length ? round[0] : 0);
    setSeen(new Set());
    setDictDone({});
    setDictPick(round);
    setDictDrafts({});
    setEarned({});
    setSpent({});
    setDictEpoch((e) => e + 1);
    setResumed(null);
  };

  const isRecording = recorder.recordingKey !== null;
  const doneCount = Object.keys(dictDone).length;
  const seenCount = new Set(seen).add(idx).size; // server cũng tính câu đang học là đã nghe
  const progressTotal = dictation ? dictTotal : segments.length;
  const progress = progressTotal ? Math.round(((dictation ? doneCount : seenCount) / progressTotal) * 100) : 0;
  const togglePlay = () => (playing ? pause() : go(idx));
  const trText = (text: string) =>
    tr[text] || (text in tr ? "⚠ Chưa dịch được câu này." : trError ? `⚠ ${trError}` : "Đang dịch…");

  // Xong lượt chính tả (hoặc đã chép hết bài) → điểm của lượt + chọn lượt mới
  const roundDone = dictation && dictPick.length > 0 && dictPick.every((k) => dictDone[k]);
  const roundScore = dictPick.reduce((a, k) => ({ c: a.c + (dictDone[k]?.correct ?? 0), n: a.n + (dictDone[k]?.total ?? 0) }), { c: 0, n: 0 });
  const roundPoints = dictPick.reduce((p, k) => p + (earned[k] ?? 0) - (spent[k] ?? 0) * POINTS_HINT, 0);
  const left = dictTotal - doneCount;

  const starButton = (text: string, size = "size-5") => {
    const on = stars.has(text.toLowerCase());
    return (
      <button
        title={on ? "Bỏ đánh dấu câu" : "Đánh dấu câu"}
        aria-pressed={on}
        className={`relative cursor-pointer transition after:absolute after:-inset-1.5 hover:scale-110 ${on ? "text-amber" : "text-muted hover:text-foreground"}`}
        onClick={(e) => {
          e.stopPropagation();
          void toggleStar(text);
        }}
      >
        <Star className={`${size} ${on ? "fill-current" : ""}`} />
      </button>
    );
  };
  const revealButton = (i: number) => (
    <button
      title="Xem / ẩn chữ câu này"
      className="cursor-pointer text-muted transition hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((r) => {
          const s = new Set(r);
          if (!s.delete(i)) s.add(i);
          return s;
        });
      }}
    >
      {revealed.has(i) ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  );
  /** Cụm từ trong câu: dạng từ điển — nghĩa; bấm để xem giải thích, ví dụ, lưu */
  const phraseRows = (phrases: Phrase[], context: string, small = false) =>
    phrases.map((p, k) => (
      <button
        key={k}
        onClick={(e) => {
          e.stopPropagation();
          pickPhrase(p, context);
        }}
        className={`block cursor-pointer text-left text-muted hover:text-foreground ${small ? "text-xs" : "text-sm"}`}
      >
        <b className="text-phrase">{p.base}</b> — {p.meaning}
      </button>
    ));

  // Vòng luyện nói: sân khấu đổi màu theo việc người học cần làm lúc này (tắc kè đổi màu)
  const heard = seen.has(idx);
  const hasRecording = !!recorder.recordings[idx];
  const step = dictation ? "dict" : isRecording || gap ? "speak" : playing ? "listen" : hasRecording ? "compare" : heard ? "speak" : "listen";
  const coach = isRecording
    ? "Đang ghi âm, nói đi!"
    : gap
      ? "Đến lượt bạn nói!"
      : playing
        ? "Nghe kỹ nhé…"
        : hasRecording
          ? "Nghe lại xem giống chưa?"
          : heard
            ? "Đến lượt bạn, thử nói theo nhé!"
            : "Nghe câu này trước nhé.";
  const sentenceNav = (prevKey: string, nextKey: string) => (
    <div className="flex min-w-0 items-center gap-0.5">
      <button className="btn-icon size-9" title={`Câu trước (${prevKey})`} aria-label="Câu trước" onClick={prev} disabled={prevIdx === undefined}>
        <ChevronLeft className="size-5" />
      </button>
      <span className="font-display text-base font-extrabold whitespace-nowrap">
        {queue?.includes(idx) ? (
          <>
            Câu {queue.indexOf(idx) + 1}/{queue.length} <span className="text-sm font-bold opacity-70">#{idx + 1}</span>
          </>
        ) : (
          `Câu ${idx + 1}/${segments.length}`
        )}
      </span>
      <button className="btn-icon size-9" title={`Câu sau (${nextKey})`} aria-label="Câu sau" onClick={next} disabled={nextIdx === undefined}>
        <ChevronRight className="size-5" />
      </button>
    </div>
  );

  return (
    <div data-step={step} className="lesson share-wide mx-auto flex w-full max-w-[1800px] flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href={backHref} className="btn shrink-0 max-sm:px-2.5" title="Quay lại">
          <ChevronLeft className="size-4" /> <span className="max-sm:hidden">Quay lại</span>
        </Link>
        <h1 className="min-w-0 text-lg leading-tight font-extrabold max-sm:line-clamp-2 sm:truncate sm:text-2xl" title={title}>
          {title}
        </h1>
        {level && <LevelBadge level={level} className="shrink-0" />}
      </div>

      {/* lg: video + transcript bên trái, sân khấu bên phải · xl: 3 cột · điện thoại: video → sân khấu → transcript */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.85fr)] xl:grid-rows-[auto]">
        {/* Video + thanh điều khiển gắn liền như một chiếc máy phát */}
        <div className="flex min-w-0 flex-col gap-3 self-start max-lg:contents lg:col-start-1 lg:row-start-1">
          <div className="sticker overflow-hidden">
            <div className={mediaHidden ? "h-0 overflow-hidden" : "[&>div]:rounded-none"}>
              {/* Chính tả: tắt phụ đề YouTube (phụ đề = đáp án) */}
              <YouTubePlayer videoId={videoId} onReady={onReady} captions={!dictation} />
            </div>
            {mediaHidden && (
              <div className="relative flex h-32 items-end justify-center overflow-hidden bg-[var(--stage)] px-4 transition-colors duration-300">
                <SoundWave className={`absolute inset-x-4 bottom-0 h-24 ${playing ? "" : "[&_i]:[animation-play-state:paused]"}`} />
                <Mascot animated className="relative size-28 translate-y-2" />
              </div>
            )}
            <div className="flex items-center gap-0.5 border-t-2 border-ink bg-card-2 p-2 sm:gap-1">
              <button className="btn btn-sun size-11 rounded-full p-0" title="Phát / dừng (Space)" aria-label={playing ? "Dừng" : "Phát"} onClick={togglePlay}>
                {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <button className="btn-icon" title="Phát lại câu (Tab khi đang chép)" aria-label="Phát lại câu" onClick={() => go(idx)}>
                <RotateCcw className="size-5" />
              </button>
              <span className="ml-1 font-mono text-sm font-bold tabular-nums">{formatTime(time)}</span>
              <div className="flex-1" />
              <button
                className="btn-icon w-auto gap-1 px-2 font-extrabold"
                title="Tốc độ phát"
                onClick={() => {
                  const r = RATES[(RATES.indexOf(settings.rate) + 1) % RATES.length];
                  update({ rate: r });
                  handleRef.current?.setRate(r);
                }}
              >
                <Zap className="size-5" /> {settings.rate}×
              </button>
              <button
                className={`btn-icon ${mediaHidden ? "bg-[var(--stage)]" : ""}`}
                role="switch"
                aria-checked={mediaHidden}
                title="Ẩn video — chỉ nghe tiếng"
                aria-label="Ẩn video"
                onClick={() => update(dictation ? { dictHideMedia: !mediaHidden } : { hideMedia: !mediaHidden })}
              >
                <VideoOff className="size-5" />
              </button>
              {!dictation && (
                <button className={`btn-icon ${panel === "settings" ? "bg-foreground/10" : ""}`} title="Cài đặt" aria-label="Cài đặt" onClick={() => setPanel(panel === "settings" ? null : "settings")}>
                  <Settings2 className="size-5" />
                </button>
              )}
              {/* Điện thoại không có bàn phím → ẩn bảng phím tắt */}
              {!dictation && (
                <button className={`btn-icon max-md:hidden ${panel === "keys" ? "bg-foreground/10" : ""}`} title="Phím tắt" aria-label="Phím tắt" onClick={() => setPanel(panel === "keys" ? null : "keys")}>
                  <Keyboard className="size-5" />
                </button>
              )}
            </div>
            {!dictation && panel === "settings" && (
              <div className="grid gap-3 border-t-2 border-ink p-3 text-sm min-[400px]:grid-cols-2 sm:p-4">
                <label className="field">
                  Lặp mỗi câu
                  <select value={settings.repeat} onChange={(e) => update({ repeat: Number(e.target.value) })}>
                    {[1, 2, 3, 5].map((r) => (
                      <option key={r} value={r}>
                        {r} lần
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Nghỉ để nói
                  <select value={settings.gapFactor} onChange={(e) => update({ gapFactor: Number(e.target.value) })}>
                    <option value={0}>Không</option>
                    <option value={1}>1× độ dài câu</option>
                    <option value={1.2}>1.2×</option>
                    <option value={1.5}>1.5×</option>
                    <option value={2}>2×</option>
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" checked={settings.autoNext} onChange={(e) => update({ autoNext: e.target.checked })} />
                  Tự sang câu tiếp
                </label>
                <label className="check">
                  <input type="checkbox" checked={settings.autoRecord} onChange={(e) => update({ autoRecord: e.target.checked })} />
                  Tự ghi âm khi nghỉ
                </label>
                <label className="check min-[400px]:col-span-2">
                  <input
                    type="checkbox"
                    checked={settings.merge}
                    onChange={(e) => {
                      // Danh sách câu thay đổi → dừng và về câu đầu
                      pause();
                      setIdx(0);
                      setDictDone({});
                      setDictPick([]);
                      setEarned({});
                      setSpent({});
                      setSeen(new Set());
                      setRevealed(new Set());
                      roundInit.current = false;
                      update({ merge: e.target.checked });
                    }}
                  />
                  Gộp các dòng phụ đề thành câu hoàn chỉnh
                </label>
              </div>
            )}
            {!dictation && panel === "keys" && (
              <p className="border-t-2 border-ink p-4 text-sm leading-7 text-muted max-md:hidden">
                <kbd>Space</kbd> phát/dừng · <kbd>←</kbd> <kbd>→</kbd> câu trước/sau · <kbd>R</kbd> ghi âm · <kbd>P</kbd> nghe lại · <kbd>H</kbd> ẩn chữ · <kbd>Esc</kbd> đóng bảng tra từ. Nên đeo tai nghe khi ghi âm.
              </p>
            )}
          </div>
          {/* Điện thoại: mô tả xuống cuối để câu đang luyện nằm ngay dưới video */}
          {children && <div className="max-lg:order-last">{children}</div>}
        </div>

        {/* Sân khấu: câu đang luyện. Thẻ chế độ gắn vào mép trên, dải màu đổi theo trạng thái */}
        <section className="flex min-w-0 flex-col self-start lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:row-span-1">
          {allowDictation && (
            <div className="relative z-10 -mb-0.5 flex items-end gap-1.5 px-4" role="group" aria-label="Chế độ luyện tập">
              {PRACTICES.map(([v, label, Icon]) => (
                <button key={v} aria-pressed={settings.practice === v} className={`mode-tab ${settings.practice === v ? "mode-tab-on" : ""}`} onClick={() => settings.practice !== v && changePractice(v)}>
                  <Icon className="size-[18px]" /> {label}
                </button>
              ))}
            </div>
          )}
          <div className="sticker overflow-hidden">
            {dictation && current && dictPick.length > 0 && (
              <div className="stage-band flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  {sentenceNav("↑", "↓")}
                  <Segmented options={DICT_LEVELS} value={settings.dictLevel} onChange={(l) => update({ dictLevel: l })} />
                </div>
                <div className="flex items-center gap-1.5 pl-2">
                  {dictPick.map((k) => (
                    <span key={k} aria-hidden className={`size-3 rounded-full border-2 border-ink ${dictDone[k] ? "bg-ink" : "bg-card"} ${k === idx ? "scale-125 outline-2 outline-offset-1 outline-ink" : ""}`} />
                  ))}
                  <span className="ml-auto text-xs font-bold whitespace-nowrap">
                    Xong {queue ? queue.filter((k) => dictDone[k]).length : doneCount}/{queue ? queue.length : segments.length}
                  </span>
                  {loggedIn && starButton(current.text, "size-[18px]")}
                </div>
              </div>
            )}
            {!dictation && current && (
              <div className="stage-band flex items-center justify-between gap-2">
                {sentenceNav("←", "→")}
                <div className="flex items-center gap-3 pr-1">
                  <span className="font-mono text-xs font-bold tabular-nums">{formatTime(current.start)}</span>
                  {settings.hideText && revealButton(idx)}
                  {loggedIn && !curHidden && starButton(current.text)}
                </div>
                {gap && <div key={gap.id} className="gap-bar candy-bar absolute inset-x-0 bottom-0 h-1.5" style={{ animationDuration: `${gap.ms}ms` }} />}
              </div>
            )}

            <div className="flex flex-col gap-4 p-3.5 sm:p-5">
              {resumed !== null && (
                <div className="flex items-center gap-2 rounded-xl bg-card-2 px-3 py-2 text-sm">
                  <span className="flex-1 font-bold">
                    Tiếp tục từ câu {resumed + 1}/{segments.length}
                  </span>
                  <button className="cursor-pointer font-extrabold text-amber hover:underline" onClick={restartProgress}>
                    Học lại từ đầu
                  </button>
                  <button className="cursor-pointer text-muted hover:text-foreground" onClick={() => setResumed(null)} title="Đóng" aria-label="Đóng">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {dictation && current && dictPick.length > 0 && (
                <DictationPanel
                  key={`${idx}-${settings.merge}-${dictEpoch}`}
                  text={current.text}
                  level={settings.dictLevel}
                  onReplay={() => go(idx)}
                  onTogglePlay={togglePlay}
                  onNext={() => dictNextIdx !== undefined && go(dictNextIdx)}
                  onPrevSentence={prev}
                  onNextSentence={next}
                  onDone={(correct, total) => dictFinished(idx, correct, total)}
                  onEarn={(correct, total, input, revealed) => dictEarn(idx, correct, total, input, revealed)}
                  onHint={syncProgress ? (n) => dictHint(idx, n) : undefined}
                  hasNext={dictNextIdx !== undefined}
                  draft={dictDrafts[idx]}
                  saved={dictDone[idx]}
                  onWord={(w) => pickWord(w)}
                  translation={settings.showTranslation ? trText(current.text) : undefined}
                  onDraft={(d) =>
                    setDictDrafts((prev) => {
                      const drafts = { ...prev };
                      if (d) drafts[idx] = d;
                      else delete drafts[idx];
                      return drafts;
                    })
                  }
                />
              )}

              {dictation && ready && (roundDone || !dictPick.length) && (
                <div className="flex flex-col gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--leaf)_40%,var(--card))] p-4">
                  <div className="flex items-center gap-2">
                    <Mascot animated className="-my-1 size-16 -scale-x-100" />
                    <div className="flex min-w-0 flex-col gap-1">
                      {roundDone ? (
                        <p className="font-display text-lg leading-tight font-extrabold">
                          Xong lượt {dictPick.length} câu, đúng {roundScore.n ? Math.round((roundScore.c / roundScore.n) * 100) : 0}% số từ
                        </p>
                      ) : (
                        <p className="font-display text-lg leading-tight font-extrabold">Sẵn sàng chép lượt mới?</p>
                      )}
                      {roundDone && roundPoints !== 0 && (
                        <p className="inline-flex w-fit items-center gap-1.5 text-sm font-extrabold text-gem">
                          <Gem className="size-5" /> {roundPoints > 0 ? `+${roundPoints}` : `−${-roundPoints}`} điểm lượt này
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm">
                    {left > 0 ? `Cả bài: đã chép ${doneCount}/${dictTotal} câu. Lượt mới chọn ngẫu nhiên 5–10 câu bạn chưa chép.` : `Bạn đã chép hết ${dictTotal} câu của bài này!`}
                  </p>
                  <button className="btn btn-primary py-3" onClick={left > 0 ? newRound : restartProgress}>
                    {left > 0 ? (
                      <>
                        Lượt mới <ChevronRight className="size-5" />
                      </>
                    ) : (
                      "Học lại từ đầu"
                    )}
                  </button>
                </div>
              )}

              {!dictation && current && (
                <>
                  <div className="flex min-h-14 items-center gap-2">
                    <Mascot animated className="-my-1 -ml-1 size-14 -scale-x-100" />
                    <p key={coach} role="status" className="dict-bubble bubble-pop ml-1 min-w-0 rounded-2xl border-2 border-ink bg-card px-3 py-1.5 text-sm leading-snug font-extrabold">
                      {coach}
                    </p>
                  </div>

                  {/* Bấm vào từ để tra / lưu, bấm cụm từ (xanh) để xem cả cụm. Đang ẩn chữ: di chuột để xem; bấm (hoặc chạm) để hiện hẳn câu này */}
                  <div className="flex min-h-32 flex-col gap-2.5">
                    <p
                      className={`font-display text-2xl leading-snug font-bold transition sm:text-[1.75rem] ${
                        curHidden ? "cursor-pointer blur-md select-none hover:blur-none [&_button]:pointer-events-none" : ""
                      }`}
                      title={curHidden ? "Di chuột để xem · bấm để hiện câu này" : undefined}
                      onClick={curHidden ? () => setRevealed((r) => new Set(r).add(idx)) : undefined}
                    >
                      <SentenceText text={current.text} phrases={curPhrases ?? []} saved={saved} onWord={(w) => pickWord(w)} onPhrase={(p) => pickPhrase(p, current.text)} />
                    </p>
                    {!curHidden && curPhrases && curPhrases.length > 0 && <div className="flex flex-col gap-1">{phraseRows(curPhrases, current.text)}</div>}
                    {!curHidden && showPhr && !curPhrases && <p className="text-sm text-muted">{phrError ? `⚠ ${phrError}` : "Đang tìm cụm từ…"}</p>}
                    {(settings.showTranslation || trShown.has(idx)) && <p className="text-base text-muted">{trText(current.text)}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 empty:hidden">
                      {!settings.showTranslation && !trShown.has(idx) && (
                        <button
                          className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-link hover:underline"
                          onClick={() => {
                            setTrShown((s) => new Set(s).add(idx));
                            void translateFrom(idx);
                          }}
                        >
                          <Languages className="size-4" /> Dịch câu này
                        </button>
                      )}
                      {(trError || tr[current.text] === "") && (
                        <a
                          className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://translate.google.com/?sl=de&tl=vi&text=${encodeURIComponent(current.text)}`}
                          title={trError}
                        >
                          Mở Google Dịch ↗
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="steps">
                    <Step icon={playing ? Pause : Play} label={playing ? "Dừng" : "Nghe"} keyHint="Space" active={step === "listen"} onClick={togglePlay} />
                    <Step
                      icon={isRecording ? Square : Mic}
                      label={isRecording ? "Dừng ghi" : "Nói"}
                      keyHint="R"
                      active={step === "speak"}
                      recording={isRecording}
                      onClick={() => (isRecording ? recorder.stop() : void recorder.start(idx))}
                    />
                    <Step icon={Volume2} label="So sánh" keyHint="P" active={step === "compare"} disabled={!hasRecording} onClick={() => recorder.play(idx)} />
                  </div>

                  <button className="btn btn-primary py-3.5 text-base" disabled={nextIdx === undefined} onClick={next}>
                    Câu tiếp theo <ChevronRight className="size-5" />
                  </button>
                </>
              )}

              <div className="scroll-row -mx-3.5 flex gap-2 px-3.5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                <Chip on={settings.showTranslation} onToggle={() => update({ showTranslation: !settings.showTranslation })} icon={Languages} label="Bản dịch" title="Hiện bản dịch tiếng Việt dưới mỗi câu" />
                {!dictation && <Chip on={settings.hideText} onToggle={toggleHideText} icon={EyeOff} label="Ẩn chữ" title="Ẩn chữ — chỉ nghe rồi nói theo (H)" />}
                {!dictation && (
                  // 1 nút bật/tắt thay cho cặp "Từng câu / Liên tục" (như nút "Tự dừng sau mỗi câu" của app)
                  <Chip
                    on={settings.mode === "segment"}
                    onToggle={() => update({ mode: settings.mode === "segment" ? "free" : "segment" })}
                    icon={CirclePause}
                    label={
                      <>
                        Tự dừng<span className="max-sm:hidden"> sau mỗi câu</span>
                      </>
                    }
                    title={settings.mode === "segment" ? "Đang dừng sau mỗi câu — bấm để phát liên tục" : "Đang phát liên tục — bấm để dừng sau mỗi câu"}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Transcript: đường đi qua các câu, linh vật đứng ở câu đang học (Chính tả: chỉ các câu của lượt đang làm) */}
        <section className="card flex max-h-[75dvh] min-h-0 min-w-0 flex-col gap-2.5 max-sm:p-3 lg:col-start-1 lg:row-start-2 lg:max-h-[80dvh] xl:sticky xl:top-4 xl:col-start-3 xl:row-start-1 xl:max-h-[calc(100vh-7rem)]">
          <div className="flex items-center gap-2">
            <h2 className="flex min-w-0 items-center truncate text-lg font-extrabold">
              <SoundMark className="mr-1" />
              {dictation ? "Lượt Dictation" : starredOnly ? "Câu đã đánh dấu" : "Transcript"}
            </h2>
            <div className="flex-1" />
            {loggedIn && !dictation && <Chip on={starredOnly} onToggle={toggleStarredOnly} icon={Star} label="Câu sao" title="Chỉ hiện câu đã đánh dấu sao" />}
          </div>
          {/* Chính tả: % tính trên cả bài (không phải lượt) — ghi rõ để khỏi lẫn với "Xong x/y" của lượt */}
          <div className="flex items-center gap-2" title={dictation ? "Số câu đã chép trong cả bài" : "Số câu đã nghe"}>
            <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-card-2">
              <div className="candy-bar h-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-extrabold whitespace-nowrap tabular-nums">{dictation ? `Cả bài ${progress}%` : `${progress}%`}</span>
          </div>
          <div ref={listRef} className="relative -mx-1 flex flex-1 flex-col overflow-y-auto overscroll-contain px-1 py-1">
            {segments.map((s, i) => {
              if (inQueue && !inQueue.has(i)) return null;
              // Chính tả: câu chưa làm thì che chữ; Shadowing: theo nút "Ẩn chữ" (bấm mắt để xem từng câu)
              const hidden = dictation ? !dictDone[i] : settings.hideText && !revealed.has(i);
              const phrases = showPhr && !hidden ? (phr[s.text] ?? []) : [];
              const passed = dictation ? !!dictDone[i] : seen.has(i);
              return (
                <div key={i} data-idx={i} onClick={() => go(i)} className={`trow ${i === idx ? "trow-on" : ""}`}>
                  <span className={`trow-dot ${passed ? "trow-passed" : ""}`}>{i === idx ? <Mascot className="size-9 max-w-none" /> : i + 1}</span>
                  <div className="min-w-0 flex-1">
                    {/* Chính tả: câu chưa chép không hiện "****" — dấu sao lộ số từ, độ dài từ, dấu câu (mức Khó thành vô nghĩa) */}
                    <p className={`text-[15px] leading-snug ${i === idx ? "font-bold" : ""} ${hidden ? (dictation ? "text-muted italic" : "font-mono tracking-wider text-muted") : ""}`}>
                      {hidden ? (
                        dictation ? (
                          i === idx ? "Đang chép…" : "Chưa chép"
                        ) : (
                          mask(s.text)
                        )
                      ) : (
                        <SentenceText text={s.text} phrases={phrases} saved={i === idx ? saved : undefined} onPhrase={(p) => pickPhrase(p, s.text)} />
                      )}
                    </p>
                    {phrases.length > 0 && <div className="mt-1 flex flex-col gap-0.5">{phraseRows(phrases, s.text, true)}</div>}
                    {/* Bản dịch: ẩn chữ (Shadowing) vẫn cho xem nghĩa; Chính tả chưa chép thì không lộ */}
                    {settings.showTranslation && tr[s.text] && !(dictation && hidden) && <span className="mt-1 block text-xs text-muted">{tr[s.text]}</span>}
                    {dictation && dictDone[i] && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold text-accent">
                        <Check className="size-3.5" /> {dictDone[i].correct}/{dictDone[i].total}
                        {pointIdx.has(i) && (
                          <span title="Câu này đã được tính điểm">
                            <Gem className="ml-1 size-4" />
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-[11px] leading-5 text-muted tabular-nums">{formatTime(s.start)}</span>
                    <div className="flex items-center gap-1.5">
                      {recorder.recordings[i] && (
                        <button
                          className="cursor-pointer text-link hover:text-foreground"
                          title="Nghe bản ghi của bạn"
                          aria-label="Nghe bản ghi của bạn"
                          onClick={(e) => {
                            e.stopPropagation();
                            recorder.play(i);
                          }}
                        >
                          <Volume2 className="size-[18px]" />
                        </button>
                      )}
                      {!dictation && settings.hideText && revealButton(i)}
                      {loggedIn && !hidden && starButton(s.text, "size-[18px]")}
                    </div>
                  </div>
                </div>
              );
            })}
            {starredOnly && !starredIdx.length && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Mascot className="size-20" />
                <p className="text-sm text-muted">Chưa có câu nào được đánh dấu sao trong bài này.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <WordPopup
        word={picked?.word ?? null}
        context={picked?.context ?? ""}
        marks={picked?.marks}
        loggedIn={loggedIn}
        saved={!!picked && saved.has(picked.word.toLowerCase())}
        onSave={(meaning) => (picked ? saveWord(picked.word, picked.context, meaning) : Promise.resolve())}
        onRemove={() => (picked ? unsave(picked.word) : Promise.resolve())}
        onClose={closePicked}
      />
    </div>
  );
}
