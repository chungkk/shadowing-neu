"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  ExternalLink,
  Eye,
  EyeOff,
  Headphones,
  Keyboard,
  Languages,
  Layers,
  MessageCircle,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Square,
  Star,
  TriangleAlert,
  VideoOff,
  Volume2,
  X,
} from "lucide-react";
import { formatTime, mergeIntoSentences, type Segment } from "@/lib/subtitles";
import { comboGain, hasWords, hasWrongSlot, normalizeDictLevel, pickDictation, POINTS_HINT, slotsFromInput, type DictationLevel } from "@/lib/dictation";
import { tokenize, type Phrase } from "@/lib/phrase-match";
import type { PlayerHandle } from "@/lib/player";
import { clientApi } from "@/lib/client-api";
import { isSentence } from "@/lib/review";
import { emitPoints } from "@/lib/points";
import { prefetchGerman } from "@/lib/speak";
import { useRecorder } from "@/hooks/useRecorder";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import YouTubePlayer, { type YouTubePlayState } from "./YouTubePlayer";
import LevelBadge from "./LevelBadge";
import DictationPanel, { type DictDraft } from "./DictationPanel";
import Mascot from "./Mascot";
import { GuestTrialNote, GuestWall, useGuestQuota } from "./GuestQuota";
import { Gem } from "./PointsBadge";
import { SoundMark } from "./SoundBars";
import WordPopup from "./WordPopup";

type Settings = {
  mode: "segment" | "free"; // dừng sau mỗi câu | phát liên tục
  rate: number;
  repeat: number; // số lần phát mỗi câu
  gapFactor: number; // thời gian nghỉ để nói lại = gapFactor × độ dài câu
  autoNext: boolean;
  hideText: boolean;
  hideMedia: boolean; // thu gọn khung video (vẫn phát tiếng)
  dictHideMedia: boolean; // như hideMedia nhưng riêng cho Chính tả (bật / tắt độc lập với Shadowing)
  practice: "shadow" | "dictation"; // nói theo | nghe chép chính tả
  dictLevel: DictationLevel;
  showTranslation: boolean; // hiện bản dịch tiếng Việt dưới mỗi câu
};

const DEFAULTS: Settings = {
  mode: "segment",
  rate: 1,
  repeat: 1,
  gapFactor: 1.2,
  autoNext: false,
  hideText: false,
  hideMedia: false,
  dictHideMedia: false,
  practice: "shadow",
  dictLevel: "easy",
  showTranslation: false,
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
  dictDrafts?: Record<string, DictDraft>;
};
type VocabItem = { id: number; word: string; meaning: string; context: string };

/** Nút bật/tắt: nhãn cố định + công tắc gạt (điện thoại: bỏ công tắc cho gọn, bật thì viền xanh) */
function Toggle({
  on,
  onToggle,
  icon: Icon,
  label,
  title,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  icon: typeof Star;
  label: ReactNode;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      className={`chip disabled:cursor-not-allowed disabled:opacity-50 ${on ? "chip-on" : ""}`}
      onClick={onToggle}
      disabled={disabled}
      title={title}
    >
      <Icon className={`size-4 ${on ? "text-current" : "text-muted"}`} />
      {label}
      <span
        aria-hidden
        className={`relative ml-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none max-sm:hidden ${on ? "bg-accent" : "bg-line-strong/40"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-card transition-transform duration-200 ease-spring motion-reduce:transition-none ${on ? "translate-x-4" : ""}`}
        />
      </span>
    </button>
  );
}

/** Nhóm nút chọn 1 trong nhiều (Shadowing/Chính tả, Điền từ/Dễ/Khó…) */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
  label,
}: {
  options: readonly (readonly [T, string, string?])[]; // [giá trị, nhãn, tooltip]
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label?: string; // tên nhóm cho trình đọc màn hình
}) {
  return (
    <div role="tablist" aria-label={label} className={`tabs ${className}`}>
      {options.map(([v, text, title]) => (
        <button key={v} role="tab" aria-selected={value === v} title={title} onClick={() => onChange(v)} className="tab px-4">
          {text}
        </button>
      ))}
    </div>
  );
}

const PRACTICES = [
  ["shadow", "Shadowing"],
  ["dictation", "Chính tả"],
] as const;
const DICT_LEVELS = [
  ["cloze", "Điền từ", "Ẩn 60% từ của câu, không gợi ý"],
  ["easy", "Dễ", "Ẩn cả câu, gợi ý chữ cái đầu"],
  ["hard", "Khó", "Ẩn cả câu, không gợi ý"],
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
            className={`cursor-pointer rounded-md px-0.5 transition-colors hover:bg-accent-soft ${cls}`}
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
  backHref = "/tieng-duc", // danh sách bài học (trang chủ "/" chỉ là trang giới thiệu)
  loggedIn = false,
  sourceUrl = null,
  allowDictation = false,
  saveProgress = true,
  earnPoints = true,
  children,
}: {
  title: string;
  level?: string;
  loggedIn?: boolean; // đã đăng nhập → tra từ, cụm từ, lưu từ / đánh dấu câu, đồng bộ tiến độ
  sourceUrl?: string | null; // trang hiện tại (/lesson/1, /watch/…), lưu kèm từ vựng để mở lại
  allowDictation?: boolean; // bài admin bật Chính tả; video tự dán chỉ Shadowing
  saveProgress?: boolean; // false: video tự dán — học thử, không lưu tiến độ (muốn lưu → tạo bài học riêng)
  earnPoints?: boolean; // false: bài riêng — chép chính tả không được / không mất kim cương
  videoId: string;
  segments: Segment[];
  backHref?: string;
  children?: ReactNode; // thông tin thêm hiển thị dưới video
}) {
  // Đọc cài đặt qua useSyncExternalStore: server và lần hydrate đầu dùng DEFAULTS, không lệch HTML
  const [stored, setStored] = useLocalStorage(SETTINGS_KEY, NO_SETTINGS);
  const settings = useMemo<Settings>(
    () => ({
      ...DEFAULTS,
      ...stored,
      dictLevel: normalizeDictLevel(stored.dictLevel, DEFAULTS.dictLevel),
      ...(allowDictation ? {} : { practice: "shadow" as const }),
    }),
    [stored, allowDictation],
  );
  const segments = useMemo(
    // Luôn gộp thành câu: tiến độ / điểm Dictation lưu theo số thứ tự câu đã gộp (web và app giống nhau)
    () => mergeIntoSentences(rawSegments),
    [rawSegments],
  );
  const texts = useMemo(() => segments.map((s) => s.text), [segments]);
  const dictTotal = useMemo(() => texts.filter(hasWords).length, [texts]); // số câu chép được (bỏ câu chỉ có ký hiệu)
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [gap, setGap] = useState<{ ms: number; id: number } | null>(null);
  const [panel, setPanel] = useState<"settings" | null>(null);
  // Điện thoại đang gõ chính tả (bàn phím mở) → thu video về 0 (vẫn phát tiếng) để nhường chỗ cho ô gõ
  const [typing, setTyping] = useState(false);
  const [picked, setPicked] = useState<{ word: string; context: string; marks?: string[] } | null>(null); // bảng tra từ đang mở
  const [autoSave, setAutoSave] = useLocalStorage<boolean>("vocab-auto-save", true); // tự động đưa từ bấm tra vào sổ ôn
  const [saved, setSaved] = useState<Map<string, number>>(new Map()); // từ đã lưu (chữ thường) → id trong sổ từ vựng
  const [stars, setStars] = useState<Map<string, number>>(new Map()); // câu ⭐ (chữ thường) → id
  const [starFilter, setStarFilter] = useState(false); // Shadowing: chỉ hiện các câu ⭐
  const [revealed, setRevealed] = useState<Set<number>>(new Set()); // câu đã bấm 👁 xem chữ khi đang ẩn
  const [seen, setSeen] = useState<Set<number>>(new Set()); // câu đã thực sự nghe (Shadowing) — % tiến độ tính theo số này
  const [dictDone, setDictDone] = useState<Record<number, DictResult>>({}); // câu chính tả đã xong
  const [dictDrafts, setDictDrafts] = useState<Record<number, DictDraft>>({}); // chữ đã gõ / từ đã xem của từng câu (quay lại vẫn còn)
  const [dictEpoch, setDictEpoch] = useState(0); // "Học lại từ đầu" → dựng lại ô chính tả
  const [dictPick, setDictPick] = useState<number[]>([]); // lượt chính tả đang làm: các câu chưa chép, lần lượt từ đầu đến cuối bài
  const [pointIdx, setPointIdx] = useState<Set<number>>(new Set()); // câu đã được tính điểm (server + vừa được) — mỗi câu chỉ 1 lần
  const awardedWords = useRef<Record<number, number>>({}); // số từ đúng đã tính điểm của các câu chưa khép — đọc ngay khi gõ nhanh
  const streakRef = useRef(0); // chuỗi từ đúng liên tiếp hiện tại
  const [dictStreak, setDictStreak] = useState(0);
  const draftsRef = useRef<Record<number, DictDraft>>({});
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
  const playingRef = useRef(false);
  const stopAtRef = useRef<number | null>(null);
  // Sau khi seek, YouTube còn trả về vị trí cũ (vd. cuối câu vừa phát) một lúc trong khi tải → chỉ kiểm tra điểm dừng
  // khi đã thấy thời gian nằm trong câu mới (hoặc quá hạn chờ), tránh dừng ngay khiến phải bấm phát lần nữa
  const armAtRef = useRef<{ start: number; since: number } | null>(null);
  const repeatCountRef = useRef(0);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const dictation = settings.practice === "dictation";
  const mediaHidden = dictation ? settings.dictHideMedia : settings.hideMedia;
  const starredOnly = starFilter && loggedIn && !dictation; // Chính tả luôn theo lượt (lần lượt cả bài), không lọc câu ⭐
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
    draftsRef.current = dictDrafts;
  });

  const dictBreakStreak = useCallback(() => {
    if (streakRef.current === 0) return;
    streakRef.current = 0;
    setDictStreak(0);
    if (loggedIn && sourceUrl && saveProgress && earnPoints) {
      clientApi("/points", { method: "POST", body: { resetStreak: true, tz: new Date().getTimezoneOffset() } }).catch(() => {});
    }
  }, [loggedIn, sourceUrl, saveProgress, earnPoints]);

  const checkLeaveDraft = useCallback(
    (fromIdx: number) => {
      const d = draftsRef.current[fromIdx];
      const text = live.current.segments[fromIdx]?.text;
      if (d && text && hasWrongSlot(text, slotsFromInput(text, d.input), new Set(d.revealed), live.current.settings.dictLevel)) dictBreakStreak();
    },
    [dictBreakStreak],
  );

  const update = useCallback(
    // Ghi lên cài đặt đã lưu (không phải bản đã ép Shadowing) → video không có Chính tả không làm mất lựa chọn ở bài khác
    (patch: Partial<Settings>) => setStored({ ...live.current.stored, ...patch }),
    [setStored],
  );

  // Khách: học thử có giới hạn số câu mỗi ngày — phát câu mới khi hết lượt thì dừng video, hiện popup mời đăng nhập
  const quota = useGuestQuota("shadow", loggedIn);
  const guestOpen = quota.open;

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
      live.current.recorder.stopPlay();
      if (!guestOpen(`${videoId}:${i}`)) {
        h.pause();
        stopAtRef.current = null;
        playingRef.current = false;
        setPlaying(false);
        return;
      }
      setIdx(i);
      markSeen(i);
      live.current.idx = i;
      h.setRate(settings.rate);
      h.seek(s.start);
      armAtRef.current = { start: s.start, since: Date.now() };
      // Chính tả luôn dừng sau mỗi câu
      stopAtRef.current = settings.mode === "free" && settings.practice !== "dictation" ? null : s.end;
      playingRef.current = true;
      setPlaying(true);
      h.play();
    },
    [clearGap, markSeen, guestOpen, videoId],
  );

  /** Người dùng chủ động chọn câu → reset bộ đếm lặp */
  const go = useCallback(
    (i: number) => {
      if (i !== live.current.idx && live.current.settings.practice === "dictation") checkLeaveDraft(live.current.idx);
      repeatCountRef.current = 0;
      playSegment(i);
    },
    [playSegment, checkLeaveDraft],
  );

  const pause = useCallback(() => {
    handleRef.current?.pause();
    stopAtRef.current = null;
    armAtRef.current = null;
    clearGap();
    playingRef.current = false;
    setPlaying(false);
  }, [clearGap]);

  // Khi một câu phát xong: lặp lại / nghỉ để nói / sang câu tiếp
  const onSegmentEnd = useCallback(() => {
    const { settings, segments, idx, nextIdx } = live.current;
    const s = segments[idx];
    // Chính tả: chỉ lặp lại câu theo cài đặt, không nghỉ / tự sang câu (người học đang gõ)
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
    // Nghỉ để người học nói lại — không tự bật micro, muốn ghi âm thì tự bấm nút
    const id = Date.now();
    setGap({ ms: gapMs, id });
    gapTimerRef.current = setTimeout(() => {
      setGap(null);
      // Đang tự bấm ghi âm → chờ người học bấm dừng, không phát đè vào bản ghi
      if (target !== null && live.current.recorder.recordingKey === null) playSegment(target);
    }, gapMs);
  }, [playSegment]);

  // Theo dõi thời gian phát
  useEffect(() => {
    const timer = setInterval(() => {
      const h = handleRef.current;
      if (!h) return;
      const t = h.getTime();
      const { settings, segments, idx } = live.current;
      const arm = armAtRef.current;
      if (arm) {
        // Chưa thấy thời gian về đầu câu → chưa tin getTime (quá 3 giây thì thôi chờ)
        if (t >= arm.start - 0.5 && (stopAtRef.current === null || t < stopAtRef.current - 0.03)) armAtRef.current = null;
        else if (Date.now() - arm.since > 3000) armAtRef.current = null;
        else return;
      }
      if (stopAtRef.current !== null) {
        if (t >= stopAtRef.current - 0.03) {
          h.pause();
          stopAtRef.current = null;
          playingRef.current = false;
          setPlaying(false);
          onSegmentEnd();
        }
      } else if (settings.mode === "free") {
        let i = segments.findIndex((s, k) => t >= s.start && t < (segments[k + 1]?.start ?? Infinity));
        if (i === -1) i = 0;
        if (i !== idx) {
          if (!guestOpen(`${videoId}:${i}`)) {
            h.pause();
            playingRef.current = false;
            setPlaying(false);
            return;
          }
          setIdx(i);
          markSeen(i);
        }
      }
    }, 40);
    return () => clearInterval(timer);
  }, [onSegmentEnd, markSeen, guestOpen, videoId]);

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
      if (e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl/⌘+R (tải lại trang), ⌘+← … là phím của trình duyệt
      // Space / Enter trên nút đang được focus → để nút tự xử lý (không phát video thay vì bấm nút)
      if (e.code === "Space" && (e.target as HTMLElement).closest("button, a, [role=button]")) return;
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
        else {
          handleRef.current?.pause();
          stopAtRef.current = null;
          armAtRef.current = null;
          playingRef.current = false;
          setPlaying(false);
          void recorder.start(idx);
        }
      } else if (e.key === "p" || e.key === "P") {
        if (recorder.recordings[idx]) {
          pause();
          recorder.play(idx);
        }
      }
      else if ((e.key === "h" || e.key === "H") && live.current.settings.practice !== "dictation") toggleHideText();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, pause, go, toggleHideText]);

  const onReady = useCallback((h: PlayerHandle) => {
    handleRef.current = h;
  }, []);

  /** Đồng bộ khi người học bấm phát/dừng trực tiếp trên khung YouTube (hoặc video chạy tới hết) */
  const onPlayerState = useCallback(
    (state: YouTubePlayState) => {
      if (state === "ended") {
        const hadStop = stopAtRef.current !== null;
        stopAtRef.current = null;
        armAtRef.current = null;
        playingRef.current = false;
        setPlaying(false);
        if (hadStop) onSegmentEnd();
        return;
      }
      if (state === "paused") {
        // Đang seek sang câu mới YouTube có thể báo PAUSED thoáng qua trước khi phát → bỏ qua
        if (armAtRef.current && Date.now() - armAtRef.current.since < 800) return;
        if (!playingRef.current) return;
        stopAtRef.current = null;
        playingRef.current = false;
        setPlaying(false);
        return;
      }
      if (playingRef.current) return;
      const h = handleRef.current;
      const { segments, settings, idx, recorder } = live.current;
      if (!h || !segments.length) return;
      recorder.stopPlay();
      clearGap();
      const t = h.getTime();
      let i = segments.findIndex((s, k) => t >= s.start - 0.5 && t < (segments[k + 1]?.start ?? Infinity));
      if (i === -1) i = idx;
      if (!guestOpen(`${videoId}:${i}`)) {
        h.pause();
        stopAtRef.current = null;
        playingRef.current = false;
        setPlaying(false);
        return;
      }
      setIdx(i);
      markSeen(i);
      live.current.idx = i;
      h.setRate(settings.rate);
      const end = segments[i]?.end ?? null;
      stopAtRef.current =
        (settings.mode === "free" && settings.practice !== "dictation") || (end !== null && t >= end - 0.05) ? null : end;
      playingRef.current = true;
      setPlaying(true);
    },
    [clearGap, guestOpen, markSeen, onSegmentEnd, videoId],
  );

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
      .catch(() => { });
    clientApi<{ stars: { id: number; text: string }[] }>("/stars")
      .then(({ stars: list }) => alive && setStars(new Map(list.map((s) => [s.text.toLowerCase(), s.id]))))
      .catch(() => { });
    return () => {
      alive = false;
    };
  }, [loggedIn]);

  const saveWord = async (word: string, context: string, meaning: string, opts?: { silent?: boolean }) => {
    try {
      const r = await clientApi<{ item?: VocabItem; vocab: VocabItem[] }>("/vocab", {
        method: "POST",
        body: { word, context, sourceUrl, sourceTitle: title },
      });
      const item = r.item ?? r.vocab.find((v) => v.word.toLowerCase() === word.toLowerCase());
      if (item) setSaved((s) => new Map(s).set(word.toLowerCase(), item.id));
      // Điền sẵn nghĩa AI vừa giải thích nếu từ chưa có nghĩa
      if (item && !item.meaning && meaning) await clientApi(`/vocab/${item.id}`, { method: "PATCH", body: { meaning } }).catch(() => { });
    } catch (e) {
      if (!opts?.silent) alert(`Không lưu được: ${(e as Error).message}`);
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
    await clientApi(`/vocab/${id}`, { method: "DELETE" }).catch(() => { });
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
        const nextStars = new Map(stars);
        nextStars.delete(key);
        setStars(nextStars);
        if (starredOnly && current?.text.toLowerCase() === key) {
          const remaining = segments.flatMap((s, i) => (nextStars.has(s.text.toLowerCase()) ? [i] : []));
          const next = remaining.find((k) => k > idx) ?? remaining.at(-1);
          if (next !== undefined) select(next);
          else setStarFilter(false);
        }
        await clientApi("/stars", { method: "DELETE", body: { id } });
      }
    } catch (e) {
      if (id !== undefined) setStars((s) => new Map(s).set(key, id));
      alert(`Không lưu được: ${(e as Error).message}`);
    }
  };

  /** Chọn câu `i` mà không phát (bấm ▶ để nghe) */
  const select = (i: number) => {
    if (i !== idx && dictation) checkLeaveDraft(idx);
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
    // Vào Chính tả → mở câu của lượt đang làm (chưa có lượt thì lấy mọi câu chưa chép)
    const i = roundStart(ensureRound());
    if (i !== undefined && i !== idx) select(i);
  };

  // ---- Tiến độ học: lưu theo tài khoản, đồng bộ với app (chỉ khi gộp câu — app luôn gộp nên số câu mới khớp) ----
  const syncProgress = loggedIn && !!sourceUrl && saveProgress;
  const syncPoints = syncProgress && earnPoints;
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
        // Lượt cũ (5–10 câu ngẫu nhiên) → nối thêm mọi câu chưa chép để làm lần lượt tới cuối bài
        const round = pick.length || dict ? [...new Set([...pick, ...pickDictation(texts, done)])].sort((a, b) => a - b) : pick;
        let i = Math.min(p.idx, segments.length - 1);
        if (dict && round.length && !round.includes(i)) i = round.find((k) => !done[k]) ?? round[0];
        setIdx(i);
        setDictPick(round);
        // Chế độ + mức chính tả học lần trước (trên web hay app) — 1 lần ghi để không đè nhau
        const patch: Partial<Settings> = {};
        if (allowDictation) patch.practice = p.mode;
        if (p.dictLevel) patch.dictLevel = normalizeDictLevel(p.dictLevel, DEFAULTS.dictLevel);
        update(patch);
        setDictDone(done);
        setEarned(p.dictRoundPts ?? {});
        setSpent(p.dictRoundSpent ?? {});
        // Chữ đã gõ dở của lượt này (F5 / vào lại không phải gõ lại) → dựng lại ô chính tả đang mở
        const drafts = Object.fromEntries(Object.entries(p.dictDrafts ?? {}).filter(([k]) => Number(k) < segments.length && round.includes(Number(k))));
        if (Object.keys(drafts).length) {
          setDictDrafts(drafts);
          setDictEpoch((e) => e + 1);
        }
        // Gộp (không ghi đè): có thể đã phát vài câu trong lúc chờ tải
        setSeen((s) => new Set([...s, ...(p.seen ?? []).filter((k) => k < segments.length)]));
        if (i > 0 || Object.keys(done).length) setResumed(i);
      })
      .catch(() => { })
      .finally(() => {
        if (!alive) return;
        progressLoaded.current = true;
        setLoadedKey(`${sourceUrl}|${segments.length}`);
      });
    return () => {
      alive = false;
    };
  }, [syncProgress, sourceUrl, segments.length, texts, allowDictation, update]);

  // ---- Điểm chính tả: đúng 1 từ +1 cơ bản, chuỗi đúng liên tiếp thưởng tới +4/từ; sai / bấm xem reset chuỗi; bấm xem −2 ----
  useEffect(() => {
    if (!syncPoints) return;
    let alive = true;
    clientApi<{ idx: number[]; open: Record<number, number>; openWords?: Record<number, number>; streak?: number }>(`/points?source=${encodeURIComponent(sourceUrl!)}`)
      .then((r) => {
        if (!alive) return;
        awardedWords.current = { ...(r.openWords ?? r.open), ...awardedWords.current };
        if (typeof r.streak === "number" && streakRef.current === 0) {
          streakRef.current = r.streak;
          setDictStreak(r.streak);
        }
        setPointIdx((s) => new Set([...s, ...r.idx]));
      })
      .catch(() => { });
    return () => {
      alive = false;
    };
  }, [syncPoints, sourceUrl]);
  /** Số từ đúng của câu i vừa tăng quá mốc từ đã tính → cộng điểm kèm thưởng combo (hiện ngay, gửi server sau) */
  const dictEarn = (i: number, correct: number, total: number, input: string, revealed: number[]) => {
    if (pointIdx.has(i)) return 0;
    const prevWords = awardedWords.current[i] ?? 0;
    const newWords = correct - prevWords;
    if (newWords <= 0) return 0;
    const prevStreak = streakRef.current;
    const nextStreak = prevStreak + newWords;
    awardedWords.current[i] = correct;
    streakRef.current = nextStreak;
    setDictStreak(nextStreak);
    if (correct === total) setPointIdx((s) => new Set(s).add(i));
    if (!syncPoints) return 0;
    const gain = comboGain(prevStreak, newWords);
    setEarned((e) => ({ ...e, [i]: (e[i] ?? 0) + gain }));
    clientApi<{ total: number; streak?: number }>("/points", {
      method: "POST",
      body: { source: sourceUrl, idx: i, input, revealed, level: settings.dictLevel, streak: nextStreak, tz: new Date().getTimezoneOffset() },
    })
      .then((r) => {
        emitPoints({ total: r.total });
        if (typeof r.streak === "number" && streakRef.current === nextStreak) {
          streakRef.current = r.streak;
          setDictStreak(r.streak);
        }
      })
      .catch(() => {
        // Chưa lưu được → bỏ điểm tạm tính, từ đúng tiếp theo của câu này sẽ tính lại cả phần này
        awardedWords.current[i] = prevWords;
        streakRef.current = Math.max(0, streakRef.current - newWords);
        setDictStreak(streakRef.current);
        setPointIdx((s) => new Set([...s].filter((k) => k !== i)));
        setEarned((e) => ({ ...e, [i]: Math.max((e[i] ?? 0) - gain, 0) }));
        emitPoints({ delta: -gain });
      });
    return gain;
  };
  /** Làm xong câu chính tả → lưu kết quả */
  const dictFinished = (i: number, correct: number, total: number) => setDictDone((d) => ({ ...d, [i]: { correct, total } }));
  /** Bấm xem n từ của câu i → đứt chuỗi + trừ điểm ngay, gửi server sau */
  const dictHint = (i: number, n: number) => {
    streakRef.current = 0;
    setDictStreak(0);
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
    if (b) clientApi("/progress", { method: "PUT", body: b, keepalive: true }).catch(() => { });
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
      dictDrafts,
    };
    const id = setTimeout(flushProgress, 1500);
    return () => clearTimeout(id);
  }, [syncProgress, sourceUrl, title, idx, segments.length, settings.practice, settings.dictLevel, dictDone, seen, dictPick, dictDrafts, flushProgress]);
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
    // Đã làm hết cả bài (chép hết các câu chép được / nghe hết các câu) → báo server giữ là "đã hoàn thành"
    const finished = dictation ? dictTotal > 0 && doneCount >= dictTotal : seenCount >= segments.length;
    if (syncProgress)
      clientApi(`/progress?source=${encodeURIComponent(sourceUrl!)}${finished ? "&done=1" : ""}`, { method: "DELETE" }).catch(() => { });
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
  const trLoading = (text: string) => !(text in tr) && !trError;
  const trText = (text: string) =>
    tr[text] || (text in tr ? "⚠ Chưa dịch được câu này." : trError ? `⚠ ${trError}` : "Đang dịch…");
  /** Bản dịch câu hiện tại: đang tải → dải lấp lánh (vẫn đọc được "Đang dịch…" cho trình đọc màn hình) */
  const trBlock = (text: string, cls: string) =>
    trLoading(text) ? (
      <span className={`flex flex-col gap-1.5 py-1 ${cls}`} role="status">
        <span className="skeleton block h-3.5 w-4/5" aria-hidden />
        <span className="skeleton block h-3.5 w-1/2" aria-hidden />
        <span className="sr-only">Đang dịch…</span>
      </span>
    ) : (
      <p className={`${cls} ${tr[text] ? "text-muted" : "text-red-400"}`}>{trText(text)}</p>
    );

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
        aria-label={on ? "Bỏ đánh dấu câu" : "Đánh dấu câu"}
        aria-pressed={on}
        className={`inline-flex cursor-pointer items-center justify-center rounded-full transition-[color,transform] duration-200 ease-spring hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100 ${on ? "text-amber" : "text-muted hover:text-foreground"}`}
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
      aria-label={revealed.has(i) ? "Ẩn chữ câu này" : "Xem chữ câu này"}
      className="inline-flex cursor-pointer items-center justify-center text-muted transition-colors hover:text-foreground"
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
        className={`block cursor-pointer rounded-md text-left text-muted transition-colors hover:text-foreground ${small ? "text-xs" : "text-sm"}`}
      >
        <b className="text-phrase">{p.base}</b> — {p.meaning}
      </button>
    ));

  // Bước của câu đang học → chỉ 1 nút chính: chưa ghi âm thì "Ghi âm", ghi xong thì "Câu tiếp theo"
  const hasRec = !!recorder.recordings[idx];
  const toggleRecord = () => {
    if (isRecording) {
      recorder.stop();
      return;
    }
    // Dừng video YouTube trước khi thu (giữ nguyên thanh gap nếu đang trong quãng nghỉ nói)
    handleRef.current?.pause();
    stopAtRef.current = null;
    armAtRef.current = null;
    playingRef.current = false;
    setPlaying(false);
    void recorder.start(idx);
  };
  const playRecording = (i: number) => {
    if (!recorder.recordings[i]) return;
    pause();
    recorder.play(i);
  };
  const recordLabel = isRecording ? "Dừng ghi" : hasRec ? "Ghi lại" : "Ghi âm";
  const step = dictation ? "dict" : isRecording || gap ? "speak" : playing ? "listen" : recorder.recordings[idx] ? "compare" : seen.has(idx) ? "speak" : "listen";
  // Mỗi bước chỉ 1 nút tô màu: nghe → "Phát" xanh · nói → "Ghi âm" hồng · so sánh → "Câu tiếp theo" xanh
  const recordCls = isRecording ? "btn-recording" : hasRec ? "" : step === "speak" ? "btn-record" : "btn-soft";
  const playCls = !dictation && step === "listen" ? "btn-primary" : "btn-soft";
  // Chế độ Shadow = dừng sau mỗi câu + nghỉ để nói (không tự ghi âm — ghi âm chỉ khi bấm nút)
  const shadowOn = settings.mode === "segment" && settings.gapFactor > 0;
  // Đang ở câu cuối (của cả bài, không lọc ⭐) và đã nghe câu đó → hiện thẻ "Xong bài"
  const atEnd = !dictation && !starredOnly && segments.length > 0 && idx === segments.length - 1 && seen.has(idx) && !playing && !gap;
  // "Xong bài" khi đã nói theo ≥ một nửa số câu — shadowing là nói, không chỉ nghe
  const spokenCount = Object.keys(recorder.recordings).length;
  const spokenNeed = Math.ceil(segments.length / 2);
  const lessonDone = atEnd && spokenCount >= spokenNeed;
  const lessonAlmost = atEnd && !lessonDone;
  const toggleShadow = () =>
    update(shadowOn ? { gapFactor: 0 } : { mode: "segment", gapFactor: 1.2 });

  const toggles = (
    <>
      <Toggle
        on={mediaHidden}
        onToggle={() => update(dictation ? { dictHideMedia: !mediaHidden } : { hideMedia: !mediaHidden })}
        icon={VideoOff}
        label="Ẩn video"
        title="Ẩn video — chỉ nghe tiếng"
      />
      {/* Ẩn chữ / Câu ⭐ chỉ dùng cho Shadowing — Chính tả vẫn giữ nút (mờ) để các nút không nhảy chỗ khi đổi chế độ */}
      <Toggle
        on={settings.hideText && !dictation}
        onToggle={toggleHideText}
        icon={EyeOff}
        label="Ẩn chữ"
        disabled={dictation}
        title={dictation ? "Chỉ dùng ở chế độ Shadowing" : "Ẩn chữ — chỉ nghe rồi nói theo (H)"}
      />
      <Toggle
        on={settings.showTranslation}
        onToggle={() => update({ showTranslation: !settings.showTranslation })}
        icon={Languages}
        label="Bản dịch"
        title="Hiện bản dịch tiếng Việt dưới mỗi câu"
      />
      {loggedIn && (
        <Toggle
          on={starredOnly}
          onToggle={toggleStarredOnly}
          icon={Star}
          label="Câu ⭐"
          disabled={dictation}
          title={dictation ? "Chỉ dùng ở chế độ Shadowing" : "Chỉ hiện câu đã đánh dấu ⭐"}
        />
      )}
    </>
  );

  // Dòng đang học trong transcript đổi màu theo việc người học cần làm lúc này (tắc kè đổi màu) — `step` tính ở trên

  return (
    <div data-step={step} data-sec="de" className="lesson share-wide mx-auto flex w-full max-w-[1800px] flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6">
      {/* Dòng tiêu đề — điện thoại: nút quay lại chỉ còn icon, các nút bật/tắt thành 1 hàng cuộn ngang */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Link href={backHref} className="btn btn-ghost shrink-0 max-sm:px-2.5" title="Quay lại">
          <ChevronLeft className="size-4" /> <span className="max-sm:hidden">Quay lại</span>
        </Link>
        <h1 className="min-w-[min(100%,12rem)] flex-1 font-display text-lg leading-snug font-bold tracking-[-0.02em] text-foreground max-sm:line-clamp-2 sm:truncate sm:text-xl" title={title}>
          {title}
        </h1>
        {level && <LevelBadge level={level} />}
        {allowDictation && (
          <Segmented options={PRACTICES} value={settings.practice} onChange={changePractice} label="Chế độ luyện" className="max-sm:w-full max-sm:*:flex-1" />
        )}
        {/* Điện thoại + Shadowing: các nút bật/tắt nằm trong ⚙ (đầu màn chỉ còn tiêu đề + chế độ) */}
        <div
          className={`scroll-row flex gap-2 max-sm:-mx-3 max-sm:basis-full max-sm:px-3 max-sm:*:px-3 max-sm:*:py-1.5 sm:flex-wrap ${dictation ? "" : "max-md:hidden"}`}
        >
          {toggles}
        </div>
      </div>

      {!loggedIn && (
        <GuestTrialNote
          area="shadow"
          quota={quota}
          extra={
            !saveProgress
              ? "tra từ và lưu thành bài học riêng"
              : allowDictation && earnPoints
                ? "tra từ, lưu tiến độ và nhận kim cương"
                : "tra từ và lưu tiến độ"
          }
        />
      )}
      <GuestWall area="shadow" quota={quota} backHref={backHref} />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* Cột 1: video + điều khiển */}
        {/* Điện thoại: bỏ khung (contents) để video dính trên cùng suốt khi cuộn xuống câu / transcript */}
        <div className="card flex flex-col gap-3 self-start max-md:contents sm:gap-4">
          <div
            className={
              mediaHidden || typing
                ? "h-0 overflow-hidden"
                : "overflow-hidden rounded-ui border border-line bg-background max-md:sticky max-md:top-14 max-md:z-20 max-sm:-mx-3 max-md:rounded-none max-md:border-x-0 sm:max-md:-mx-4 sm:max-md:top-15"
            }
          >
          {/* Chính tả: tắt phụ đề YouTube (phụ đề = đáp án) */}
          <YouTubePlayer videoId={videoId} onReady={onReady} onStateChange={onPlayerState} captions={!dictation} />
        </div>
        {mediaHidden && (
          <p className="surface flex items-center justify-center gap-2 text-center text-sm font-semibold text-muted">
            <VideoOff className="size-4 shrink-0" aria-hidden /> Video đang ẩn — chỉ nghe tiếng.
          </p>
        )}
        {/* Thanh điều khiển ngay dưới video: phát / nghe lại (Shadowing thêm ⚙ cho tốc độ, lặp, nghỉ…) */}
        <div className="flex gap-2 sm:gap-3">
          {/* Điện thoại (Shadowing): nút phát nằm ở thanh dưới đáy */}
          <button className={`btn btn-lg flex-1 ${playCls} ${dictation ? "" : "max-md:hidden"}`} title="Phát / dừng (Space)" onClick={togglePlay}>
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />} {playing ? "Dừng" : "Phát"}
          </button>
          <button className="btn btn-lg flex-1" title={dictation ? "Nghe lại câu (Shift+Space)" : "Nghe lại câu"} onClick={() => go(idx)}>
            <RotateCcw className="size-5" /> Nghe lại
          </button>
          {!dictation && (
            <button
              className={`btn btn-lg size-12 shrink-0 p-0 ${panel === "settings" ? "btn-soft" : ""}`}
              title="Cài đặt (tốc độ, lặp câu, nghỉ để nói…)"
              aria-label="Cài đặt"
              aria-expanded={panel === "settings"}
              onClick={() => setPanel(panel === "settings" ? null : "settings")}
            >
              <Settings2 className="size-5" />
            </button>
          )}
        </div>

        {!dictation && panel === "settings" && (
          <div className="surface rise-in grid gap-3 text-sm min-[400px]:grid-cols-2 sm:p-4">
            <p className="label text-muted min-[400px]:col-span-2">Cài đặt luyện nói</p>
            {/* Điện thoại: các nút bật/tắt của đầu màn chuyển vào đây */}
            <div className="flex flex-wrap gap-2 md:hidden min-[400px]:col-span-2">{toggles}</div>
            <label className="field">
              Tốc độ phát
              <select
                value={settings.rate}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  update({ rate: r });
                  handleRef.current?.setRate(r);
                }}
              >
                {RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>
            </label>
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
              <input
                type="checkbox"
                checked={settings.autoNext}
                onChange={(e) => update({ autoNext: e.target.checked })}
              />
              Tự sang câu tiếp
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={settings.mode === "free"}
                onChange={(e) => update({ mode: e.target.checked ? "free" : "segment" })}
              />
              Phát liên tục (không dừng sau mỗi câu)
            </label>
            {/* Điện thoại không có bàn phím → ẩn phím tắt */}
            <p className="leading-7 text-muted max-md:hidden min-[400px]:col-span-2">
              <kbd>Space</kbd> phát/dừng · <kbd>←</kbd> <kbd>→</kbd> câu trước/sau · <kbd>R</kbd> ghi âm · <kbd>P</kbd>{" "}
              nghe bản ghi · <kbd>H</kbd> ẩn chữ · <kbd>Esc</kbd> đóng bảng tra từ. Nên đeo tai nghe khi ghi âm.
            </p>
          </div>
        )}

        {children}
      </div>

      {/* Cột 2: luyện tập câu hiện tại */}
      <div className="card flex flex-col gap-3 self-start max-sm:p-3 sm:gap-4">
        <div className="flex justify-center">
          {dictation ? (
            <Segmented options={DICT_LEVELS} value={settings.dictLevel} onChange={(l) => update({ dictLevel: l })} />
          ) : (
            // 1 công tắc cho cả vòng shadow; tinh chỉnh (lặp, thời gian nghỉ, phát liên tục) nằm trong ⚙
            <Toggle
              on={shadowOn}
              onToggle={toggleShadow}
              icon={CirclePause}
              label="Chế độ Shadow"
              title={
                shadowOn
                  ? "Đang bật: dừng sau mỗi câu, nghỉ để bạn nói lại — bấm để tắt"
                  : "Bật: dừng sau mỗi câu, nghỉ để bạn nói lại"
              }
            />
          )}
        </div>

        {resumed !== null && (
          <div className="alert alert-ok items-center py-1.5 pr-1.5">
            <span className="flex-1">
              Tiếp tục từ câu {resumed + 1}/{segments.length}
            </span>
            <button className="btn btn-ghost btn-sm shrink-0 text-link" onClick={restartProgress}>
              Học lại từ đầu
            </button>
            <button className="btn-icon size-8 shrink-0 text-muted hover:text-foreground" onClick={() => setResumed(null)} title="Đóng" aria-label="Đóng">
              <X className="size-4" />
            </button>
          </div>
        )}

        {dictation && current && dictPick.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted md:hidden" title="Số câu đã chép trong cả bài">
              <div className="progress h-1.5 flex-1">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <span className="shrink-0 font-semibold text-foreground tabular-nums">Cả bài {progress}%</span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-0.5">
                <button className="btn-icon" title="Câu trước (↑)" aria-label="Câu trước" onClick={prev} disabled={prevIdx === undefined}>
                  <ChevronLeft className="size-5" />
                </button>
                <span className="label whitespace-nowrap text-link max-sm:text-xs">
                  {queue?.includes(idx) ? `Câu ${queue.indexOf(idx) + 1}/${queue.length} · #${idx + 1}` : `Câu ${idx + 1}/${segments.length}`}
                </span>
                <button className="btn-icon" title="Câu sau (↓)" aria-label="Câu sau" onClick={next} disabled={nextIdx === undefined}>
                  <ChevronRight className="size-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs whitespace-nowrap text-muted">
                  <span className="max-sm:hidden">Đã xong </span>
                  <span className="sm:hidden">Xong </span>
                  {queue ? queue.filter((k) => dictDone[k]).length : doneCount}/{queue ? queue.length : segments.length}
                  <span className="max-sm:hidden"> câu</span>
                </span>
                {loggedIn && starButton(current.text, "size-[18px]")}
              </div>
            </div>
            <DictationPanel
              key={`${idx}-${dictEpoch}`}
              text={current.text}
              level={settings.dictLevel}
              onReplay={() => go(idx)}
              onTogglePlay={togglePlay}
              onNext={() => dictNextIdx !== undefined && go(dictNextIdx)}
              onPrevSentence={prev}
              onNextSentence={next}
              onDone={(correct, total) => dictFinished(idx, correct, total)}
              onEarn={(correct, total, input, revealed) => dictEarn(idx, correct, total, input, revealed)}
              streak={dictStreak}
              onBreakStreak={dictBreakStreak}
              onHint={syncPoints ? (n) => dictHint(idx, n) : undefined}
              hasNext={dictNextIdx !== undefined}
              draft={dictDrafts[idx]}
              saved={dictDone[idx]}
              onWord={(w) => pickWord(w)}
              onTyping={setTyping}
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
          </>
        )}

        {dictation && ready && (roundDone || !dictPick.length) && (
          <div className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--ok)_35%,transparent)] bg-ok-soft p-4">
            {roundDone && (
              <p className="flex items-start gap-2 font-display text-lg leading-snug font-bold text-ok-text">
                <CircleCheck className="mt-0.5 size-5 shrink-0" /> Xong lượt {dictPick.length} câu — đúng {roundScore.n ? Math.round((roundScore.c / roundScore.n) * 100) : 0}% số từ
              </p>
            )}
            {roundDone && roundPoints !== 0 && (
              <p className="badge badge-gem gap-2 self-start py-1 pr-3 pl-1.5 text-sm">
                <Gem className="size-5" /> {roundPoints > 0 ? `+${roundPoints}` : `−${-roundPoints}`} kim cương lượt này
              </p>
            )}
            <p className="text-sm text-muted">
              {left > 0
                ? `Cả bài: đã chép ${doneCount}/${dictTotal} câu. Chép tiếp các câu còn lại theo thứ tự.`
                : `Bạn đã chép hết ${dictTotal} câu của bài này.`}
            </p>
            <button className="btn btn-primary btn-lg" onClick={left > 0 ? newRound : restartProgress}>
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

        {!dictation && (
          <>
            {/* Câu hiện tại: bấm vào từ để tra / lưu, bấm cụm từ (xanh) để xem cả cụm */}
            <div className="flex min-h-40 flex-col gap-3 sm:min-h-48">
              <div className="flex items-center gap-3">
                <span className="label flex-1 text-link">
                  {queue?.includes(idx) ? `Câu ${queue.indexOf(idx) + 1}/${queue.length} · #${idx + 1}` : `Câu ${idx + 1}/${segments.length}`}
                </span>
                {current && <span className="text-xs text-muted">{formatTime(current.start)}</span>}
                {current && settings.hideText && revealButton(idx)}
                {current && loggedIn && !curHidden && starButton(current.text)}
              </div>
              {current && (
                // Đang ẩn chữ: di chuột để xem; bấm (hoặc chạm trên điện thoại) để hiện hẳn câu này — chưa tra từ được khi còn mờ
                <p
                  className={`font-display text-[1.375rem] leading-snug font-bold tracking-[-0.01em] transition sm:text-[1.65rem] ${curHidden ? "cursor-pointer blur-md select-none hover:blur-none [&_button]:pointer-events-none" : ""
                    }`}
                  title={curHidden ? "Di chuột để xem · bấm để hiện câu này" : undefined}
                  onClick={curHidden ? () => setRevealed((r) => new Set(r).add(idx)) : undefined}
                >
                  <SentenceText
                    text={current.text}
                    phrases={curPhrases ?? []}
                    saved={saved}
                    onWord={(w) => pickWord(w)}
                    onPhrase={(p) => pickPhrase(p, current.text)}
                  />
                </p>
              )}
              {current && !curHidden && curPhrases && <div className="flex flex-col gap-1">{phraseRows(curPhrases, current.text)}</div>}
              {current && !curHidden && showPhr && !curPhrases && (
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  {phrError ? (
                    <>
                      <TriangleAlert className="size-4 shrink-0 text-amber" /> {phrError}
                    </>
                  ) : (
                    "Đang tìm cụm từ…"
                  )}
                </p>
              )}
              {current && (settings.showTranslation || trShown.has(idx)) && trBlock(current.text, "text-base")}
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1">
                {current && !settings.showTranslation && !trShown.has(idx) && (
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
                {current && (trError || tr[current.text] === "") && (
                  <a
                    className="inline-flex items-center gap-1 text-xs font-bold text-link hover:underline"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://translate.google.com/?sl=de&tl=vi&text=${encodeURIComponent(current.text)}`}
                    title={trError}
                  >
                    Mở Google Dịch <ExternalLink className="size-3.5" />
                  </a>
                )}
                {gap && (
                  <span className="badge badge-coral ml-auto">
                    {isRecording ? <Mic className="size-3.5" /> : <MessageCircle className="size-3.5" />}
                    {isRecording ? "Đến lượt bạn — đang ghi âm…" : "Đến lượt bạn nói…"}
                  </span>
                )}
              </div>
              <div className="progress h-1.5">
                {gap && (
                  <div
                    key={gap.id}
                    className="gap-bar h-full rounded-full bg-[var(--candy-dark)]"
                    style={{ animationDuration: `${gap.ms}ms` }}
                  />
                )}
              </div>
            </div>

            {/* Ghi âm — máy tính; điện thoại dùng thanh dưới đáy. Nút chính đổi theo bước: Ghi âm → Câu tiếp theo */}
            <div className="grid grid-cols-2 gap-3 max-md:hidden">
              <button className={`btn btn-lg ${recordCls}`} onClick={toggleRecord}>
                {isRecording ? <Square className="size-5" /> : <Mic className="size-5" />}
                {recordLabel}
              </button>
              <button className="btn btn-lg" disabled={!hasRec} onClick={() => playRecording(idx)}>
                <Volume2 className="size-5" /> Nghe bản ghi
              </button>
            </div>

            {lessonDone ? (
              // Câu cuối đã nghe → khép vòng học: chép chính tả bài này / ôn từ đã lưu / chọn bài khác
              <div className="rise-in flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--ok)_35%,transparent)] bg-ok-soft p-4 text-center">
                <Mascot animated className="size-20" />
                <div>
                  <p className="font-display text-xl font-bold text-ok-text">Xong bài rồi!</p>
                  <p className="text-sm text-muted">
                    Đã nghe {seenCount}/{segments.length} câu · nói theo {spokenCount} câu
                    {seenCount < segments.length ? " — còn vài câu bạn chưa phát" : ""}.
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2">
                  {allowDictation && (
                    <button className="btn btn-primary btn-lg sm:col-span-2" onClick={() => changePractice("dictation")}>
                      <Keyboard className="size-5" /> Chép chính tả bài này
                    </button>
                  )}
                  {loggedIn && (
                    <Link href="/vocab/notebook?review=1" className={`btn btn-lg ${allowDictation ? "" : "btn-primary"}`}>
                      <Layers className="size-5" /> Ôn từ vựng
                    </Link>
                  )}
                  <Link href={backHref} className={`btn btn-lg ${loggedIn ? "" : "sm:col-span-2"}`}>
                    Chọn bài khác <ChevronRight className="size-5" />
                  </Link>
                </div>
              </div>
            ) : lessonAlmost ? (
              <div className="surface flex flex-col gap-1 text-sm">
                <p className="flex items-center gap-1.5 font-bold">
                  <Headphones className="size-4 shrink-0 text-sec-text" /> Bạn đã nghe hết bài
                </p>
                <p className="text-muted">
                  Mới nói theo {spokenCount}/{segments.length} câu. Nói thêm {spokenNeed - spokenCount} câu nữa (bấm câu bất kỳ trong transcript rồi Ghi âm) để hoàn thành bài.
                </p>
              </div>
            ) : (
              <button className={`btn btn-lg max-md:hidden ${hasRec ? "btn-primary" : ""}`} disabled={nextIdx === undefined} onClick={next}>
                Câu tiếp theo <ChevronRight className="size-5" />
              </button>
            )}
          </>
        )}
      </div>

        {/* Điện thoại: thanh điều khiển dưới đáy (thay thanh điều hướng) — ngón cái với tới, không phải cuộn tìm nút */}
        {!dictation && (
          <div className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center gap-1 border-t border-line bg-sidebar px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
            <button className="btn-icon shrink-0" aria-label="Câu trước" onClick={prev} disabled={prevIdx === undefined}>
              <ChevronLeft className="size-6" />
            </button>
            <button className="btn-icon shrink-0" aria-label={playing ? "Dừng" : "Phát câu"} onClick={togglePlay}>
              {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
            </button>
            <button className={`btn min-w-0 flex-1 ${recordCls}`} onClick={toggleRecord}>
              {isRecording ? <Square className="size-5" /> : <Mic className="size-5" />}
              {recordLabel}
            </button>
            <button className="btn-icon shrink-0" aria-label="Nghe bản ghi" disabled={!hasRec} onClick={() => playRecording(idx)}>
              <Volume2 className="size-6" />
            </button>
            <button
              className={`shrink-0 ${hasRec ? "btn btn-primary size-10 p-0" : "btn-icon"}`}
              aria-label="Câu tiếp theo"
              disabled={nextIdx === undefined}
              onClick={next}
            >
              <ChevronRight className="size-6" />
            </button>
          </div>
        )}

        {/* Cột 3: transcript sạch, dính gọn dưới header sticky.
            Màn rộng: khung ngoài không góp chiều cao (contain: size) → cao bằng 2 cột kia (tối thiểu 30rem), danh sách cuộn bên trong,
            thay vì kéo dài theo số câu / chiều cao màn hình */}
        <div className={`min-w-0 lg:col-span-2 xl:col-span-1 xl:flex xl:min-h-[30rem] xl:flex-col xl:[contain:size] ${dictation ? "max-md:hidden" : ""}`}>
          <div className="card flex max-h-[75dvh] min-h-0 min-w-0 flex-col gap-2.5 max-md:max-h-none max-sm:p-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6.5rem)]">
          <h2 className="label flex min-w-0 items-center gap-1.5 truncate text-foreground">
            <SoundMark className="text-base" />
            {dictation ? "Lượt chính tả" : starredOnly ? "Câu đã đánh dấu" : "Transcript"}
          </h2>
          {/* Chính tả: % tính trên cả bài (không phải lượt) — ghi rõ để khỏi lẫn với "Đã xong x/y câu" của lượt */}
          <div className="flex items-center gap-2" title={dictation ? "Số câu đã chép trong cả bài" : "Số câu đã nghe"}>
            <div className="progress h-2 flex-1">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-bold whitespace-nowrap tabular-nums">{dictation ? `Cả bài ${progress}%` : `${progress}%`}</span>
          </div>
          <div ref={listRef} className="relative -mx-1 flex flex-1 flex-col overflow-y-auto overscroll-contain px-1 py-1 max-md:overflow-visible">
            {segments.map((s, i) => {
              if (inQueue && !inQueue.has(i)) return null;
              // Chính tả: câu chưa làm thì che chữ; Shadowing: theo nút "Ẩn chữ" (bấm mắt để xem từng câu)
              const hidden = dictation ? !dictDone[i] : settings.hideText && !revealed.has(i);
              const phrases = showPhr && !hidden ? (phr[s.text] ?? []) : [];
              const passed = dictation ? !!dictDone[i] : seen.has(i);
              return (
                // Bàn phím: Tab tới dòng, Enter / Space để phát câu đó
                <div
                  key={i}
                  data-idx={i}
                  role="button"
                  tabIndex={0}
                  aria-current={i === idx ? "true" : undefined}
                  aria-label={`Câu ${i + 1}${hidden ? "" : `: ${s.text}`}`}
                  onClick={() => go(i)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                    e.preventDefault();
                    go(i);
                  }}
                  className={`trow ${i === idx ? "trow-on" : ""}`}
                >
                  <span className={`trow-dot ${i === idx ? "!border-accent !bg-accent !text-on-accent" : passed ? "trow-passed" : ""}`}>{i + 1}</span>
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
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-ok-text">
                        <Check className="size-3.5" /> {dictDone[i].correct}/{dictDone[i].total}
                        {pointIdx.has(i) && (
                          <span title="Câu này đã được tính kim cương">
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
                            playRecording(i);
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
          </div>
        </div>
      </div>

      <WordPopup
        word={picked?.word ?? null}
        context={picked?.context ?? ""}
        marks={picked?.marks}
        loggedIn={loggedIn}
        saved={!!picked && saved.has(picked.word.toLowerCase())}
        autoSave={autoSave}
        onAutoSaveChange={setAutoSave}
        onSave={(meaning, opts) => (picked ? saveWord(picked.word, picked.context, meaning, opts) : Promise.resolve())}
        onRemove={() => (picked ? unsave(picked.word) : Promise.resolve())}
        onClose={closePicked}
      />
    </div>
  );
}
