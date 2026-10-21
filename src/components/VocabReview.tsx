"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Clock, Delete, Flame, Lightbulb, RotateCcw, Snail, Target, Volume2, VolumeX, X, Zap } from "lucide-react";
import { gradeWord } from "@/app/account-actions";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  buildQueue,
  canCloze,
  checkOrder,
  checkTyped,
  findWord,
  insertLater,
  isPhrase,
  isRecall,
  isSentence,
  newStep,
  resolveStep,
  shuffle,
  type Kind,
  type ReviewWord,
  type Step,
} from "@/lib/review";
import { stageInfo } from "@/lib/srs";
import type { VocabItem } from "@/lib/db";

// ---- Âm thanh: giọng đọc tiếng Đức của trình duyệt + tiếng báo đúng / sai ----

const voiceStore = {
  subscribe(cb: () => void) {
    if (typeof speechSynthesis === "undefined") return () => {};
    speechSynthesis.addEventListener("voiceschanged", cb);
    return () => speechSynthesis.removeEventListener("voiceschanged", cb);
  },
  /** Chrome nạp danh sách giọng không đồng bộ → lúc đầu có thể chưa có */
  germanVoice: () => (typeof speechSynthesis === "undefined" ? undefined : speechSynthesis.getVoices().find((v) => v.lang.startsWith("de"))),
};
const useHasGermanVoice = () => useSyncExternalStore(voiceStore.subscribe, () => !!voiceStore.germanVoice(), () => false);

function speak(text: string, rate = 0.9) {
  const voice = voiceStore.germanVoice();
  if (!voice) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = rate;
  speechSynthesis.speak(u);
}

let audioCtx: AudioContext | null = null;
/** Đúng: 2 nốt đi lên · sai: 2 nốt trầm */
function sfx(ok: boolean) {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    (ok ? [880, 1318.5] : [220, 196]).forEach((f, i) => {
      const t = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = ok ? "sine" : "square";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(ok ? 0.18 : 0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch {}
}

// ---- Thành phần giao diện ----

const PROMPT: Record<Kind, string> = {
  intro: "Từ mới",
  "choose-meaning": "Từ này nghĩa là gì?",
  "listen-choose": "Bạn nghe thấy từ nào?",
  "choose-word": "Chọn từ đúng",
  "cloze-bank": "Chọn từ điền vào chỗ trống",
  tiles: "Xếp chữ thành từ đúng",
  type: "Viết từ này bằng tiếng Đức",
  "cloze-type": "Gõ từ còn thiếu",
  "listen-type": "Nghe và viết lại",
  match: "Ghép các cặp từ",
  order: "Xếp từ thành câu",
  "listen-order": "Nghe rồi xếp lại câu",
  flash: "Bạn còn nhớ từ này không?",
};

/** Đề bài riêng khi mục cần ôn là câu đánh dấu sao */
const PROMPT_SENTENCE: Partial<Record<Kind, string>> = {
  intro: "Câu mới",
  "choose-meaning": "Câu này nghĩa là gì?",
  "listen-choose": "Bạn nghe thấy câu nào?",
  "choose-word": "Chọn câu đúng",
  flash: "Bạn còn nhớ câu này không?",
};

const PRAISE = ["Tuyệt vời!", "Chính xác!", "Giỏi lắm!", "Xuất sắc!", "Quá chuẩn!"];

/** Ô / nút kiểu "nổi" có viền dưới dày */
const tile = "rounded-2xl border-2 border-b-4 font-bold transition active:translate-y-0.5 active:border-b-2 disabled:active:translate-y-0";
const tone = (state: "idle" | "sel" | "right" | "wrong" | "dim") =>
  ({
    idle: "border-border bg-card-2 hover:bg-white/5",
    sel: "border-link bg-link/15 text-link",
    right: "border-accent bg-accent/15 text-accent",
    wrong: "border-red bg-red/15 text-red-400",
    dim: "border-border bg-card-2 opacity-40",
  })[state];

/** Câu ví dụ: che từ (khi hỏi), điền từ đang chọn, hoặc tô đậm */
function Context({ text, word, blank, fill }: { text: string; word: string; blank?: boolean; fill?: string | null }) {
  const at = findWord(text, word.trim());
  if (!at) return <>{text}</>;
  const [i, end] = at;
  return (
    <>
      {text.slice(0, i)}
      {blank ? (
        fill ? (
          <span className="rounded-lg border-b-2 border-link px-1 font-bold text-link">{fill}</span>
        ) : (
          <span className="inline-block min-w-16 rounded border-b-2 border-muted px-1">{" ".repeat(Math.min(end - i, 12))}</span>
        )
      ) : (
        <mark className="rounded bg-amber/20 px-0.5 text-amber">{text.slice(i, end)}</mark>
      )}
      {text.slice(end)}
    </>
  );
}

function SpeakButton({ text, tts, big }: { text: string; tts: boolean; big?: boolean }) {
  if (!tts) return null;
  return (
    <button
      type="button"
      title="Nghe phát âm"
      className={big ? `${tile} ${tone("idle")} flex size-14 shrink-0 items-center justify-center text-link` : "btn-icon size-8 shrink-0 text-link"}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
    >
      <Volume2 className={big ? "size-7" : "size-4"} />
    </button>
  );
}

/** Nút loa to + nút nghe chậm (dạng nghe) */
function ListenButtons({ word }: { word: string }) {
  return (
    <div className="flex items-end justify-center gap-3">
      <button className={`${tile} flex size-24 items-center justify-center border-link bg-link text-white`} onClick={() => speak(word, 0.85)} title="Nghe lại">
        <Volume2 className="size-12" />
      </button>
      <button className={`${tile} ${tone("idle")} flex size-14 items-center justify-center text-link`} onClick={() => speak(word, 0.5)} title="Nghe chậm">
        <Snail className="size-6" />
      </button>
    </div>
  );
}

type Feedback = { ok: boolean; note?: string; combo: number };
type Graded = { item: ReviewWord; correct: boolean; stage?: number };
type Streak = { day: string; count: number };

const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * Ôn từ chuyên sâu kiểu bài học Duolingo, theo lịch lặp lại ngắt quãng:
 * - Từ mới: làm quen → chọn nghĩa → nhận diện lần 2 (nghe / điền câu) → tự xếp chữ / viết ra.
 * - Từ đã học: dạng bài khó dần theo mức nhớ; xen bài ghép cặp các từ vừa gặp.
 * - Lần hỏi đầu tiên của mỗi từ được chấm vào lịch ôn; từ sai được hỏi lại vài thẻ sau cho tới khi đúng.
 */
export default function VocabReview({
  title,
  items,
  pool,
  onClose,
}: {
  title: string;
  items: VocabItem[];
  /** Cả sổ từ — lấy phương án nhiễu cho trắc nghiệm */
  pool: VocabItem[];
  onClose: (changed: boolean) => void;
}) {
  const tts = useHasGermanVoice();
  const [sound, setSound] = useLocalStorage("vocab-review-speak", true);
  const [streak, setStreak] = useLocalStorage<Streak>("vocab-streak", { day: "", count: 0 });
  const [queue, setQueue] = useState(() => {
    const q = buildQueue(items);
    return q.length ? [resolveStep(q[0], pool, false), ...q.slice(1)] : q;
  });
  const [pos, setPos] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // Câu trả lời đang làm
  const [sel, setSel] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [built, setBuilt] = useState<number[]>([]); // chỉ số các ô chữ đã xếp
  const [hint, setHint] = useState(0); // số chữ cái đầu đã gợi ý
  const [flipped, setFlipped] = useState(false);
  const [matched, setMatched] = useState<number[]>([]);
  const [pick, setPick] = useState<{ side: "l" | "r"; id: number } | null>(null);
  const [badPair, setBadPair] = useState<string[]>([]); // ["l<id>", "r<id>"] vừa ghép sai
  // Kết quả buổi ôn
  const [graded, setGraded] = useState<Graded[]>([]);
  const [practice, setPractice] = useState(false); // luyện thêm từ sai: không chấm lại vào lịch ôn
  const [changed, setChanged] = useState(false); // đã chấm vào lịch ôn → đóng thì tải lại sổ từ
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const step = queue[pos] as Step | undefined;
  const done = !step;
  const kind = step?.kind;
  const v = step?.item as ReviewWord;
  const typing = kind === "type" || kind === "cloze-type" || kind === "listen-type";
  const choosing = kind === "choose-meaning" || kind === "choose-word" || kind === "listen-choose" || kind === "cloze-bank";
  const ordering = kind === "order" || kind === "listen-order";
  const right = kind === "choose-meaning" ? v?.meaning.trim() : v?.word.trim();
  const builtWord = built.map((i) => step?.tiles?.[i]).join("");
  const sentence = !!v && isSentence(v);
  // Câu dài → chữ nhỏ hơn từ lẻ
  const headline = sentence ? "text-2xl leading-snug" : "text-4xl";

  // Tự đọc khi tới thẻ làm quen / thẻ nghe
  useEffect(() => {
    if (kind === "listen-choose" || kind === "listen-type" || kind === "listen-order") speak(v.word, 0.85);
    else if (kind === "intro" && sound) speak(v.word);
  }, [step?.id, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typing && !feedback) inputRef.current?.focus();
  }, [step?.id, typing, feedback]);

  const answer = (ok: boolean, note?: string) => {
    const s = step!;
    const nextCombo = ok ? combo + 1 : 0;
    setFeedback({ ok, note, combo: nextCombo });
    setCombo(nextCombo);
    setBestCombo((b) => Math.max(b, nextCombo));
    if (ok) setXp((x) => x + (s.role === "graded" || s.role === "match" ? 10 : 5));
    if (sound) {
      sfx(ok);
      if (kind !== "match") setTimeout(() => speak(v.word), 350);
    }
    if (s.role === "graded") {
      const entry: Graded = { item: v, correct: ok };
      setGraded((g) => [...g, entry]);
      if (!practice) {
        setChanged(true);
        gradeWord(v.id, ok)
          .then((res) => res && setGraded((g) => g.map((x) => (x === entry ? { ...x, stage: res.stage } : x))))
          .catch(() => {});
      }
    }
    if (kind === "match") return;
    let q = queue;
    if (!ok) q = insertLater(q, pos, 3, newStep({ role: "retry", item: v }));
    else if (s.role === "graded" && v.stage <= 2 && (!isPhrase(v) || isSentence(v)) && !isRecall(kind)) {
      // Từ còn non mà mới đúng ở dạng nhận diện → thêm lượt nhận diện khác (từ mới) và lượt tự viết ra
      if (v.stage === 0) q = insertLater(q, pos, 2, newStep({ role: "practice", item: v }));
      if (v.meaning || canCloze(v) || tts) q = insertLater(q, pos, 5, newStep({ role: "reinforce", item: v }));
    }
    setQueue(q);
  };

  const check = () => {
    if (!step || feedback) return;
    if (choosing && sel) return answer(sel === right);
    if (kind === "tiles" && built.length) {
      const exact = builtWord === v.word.trim();
      return answer(exact || builtWord.toLowerCase() === v.word.trim().toLowerCase(), exact ? undefined : `Đúng — viết chuẩn là “${v.word}”`);
    }
    if (ordering && built.length) {
      const c = checkOrder(built.map((i) => step.tiles![i]), v.word);
      return answer(c !== "wrong", c === "ok" ? `Đúng — câu gốc: “${v.word}”` : undefined);
    }
    if (typing && typed.trim()) {
      const c = checkTyped(typed, v.word);
      const note = c === "almost" ? `Gần đúng — để ý chính tả: “${v.word}”` : c === "ok" ? `Đúng — viết chuẩn là “${v.word}”` : undefined;
      return answer(c !== "wrong", note);
    }
  };

  const reset = () => {
    setFeedback(null);
    setSel(null);
    setTyped("");
    setBuilt([]);
    setHint(0);
    setFlipped(false);
    setMatched([]);
    setPick(null);
    setBadPair([]);
  };

  const next = () => {
    const n = pos + 1;
    if (queue[n]) setQueue((q) => q.map((s, i) => (i === n ? resolveStep(s, pool, tts) : s)));
    else {
      setFinishedAt(Date.now());
      // Chuỗi ngày ôn liên tiếp (lưu trên máy này)
      if (!practice && graded.length) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (streak.day !== ymd(today)) setStreak({ day: ymd(today), count: streak.day === ymd(yesterday) ? streak.count + 1 : 1 });
      }
    }
    setPos(n);
    reset();
  };

  const restart = (list: ReviewWord[]) => {
    const q = buildQueue(list);
    setQueue(q.length ? [resolveStep(q[0], pool, tts), ...q.slice(1)] : q);
    setPos(0);
    reset();
    setGraded([]);
    setPractice(true);
    setCombo(0);
    setBestCombo(0);
    setXp(0);
    setStartedAt(Date.now());
    setFinishedAt(null);
  };

  // Ghép cặp: chọn 1 ô mỗi bên; đúng thì cả 2 mờ đi, sai thì nháy đỏ
  const tapPair = (side: "l" | "r", id: number) => {
    if (feedback || matched.includes(id)) return;
    if (!pick || pick.side === side) return setPick({ side, id });
    setPick(null);
    if (pick.id === id) {
      const m = [...matched, id];
      setMatched(m);
      if (sound) speak(step!.pairs!.find((p) => p.id === id)!.word);
      if (m.length === step!.pairs!.length) answer(true, "Ghép đúng hết!");
    } else {
      setBadPair([pick.side + pick.id, side + id]);
      if (sound) sfx(false);
      setTimeout(() => setBadPair([]), 450);
    }
  };

  const addTile = (i: number) => {
    if (!feedback && !built.includes(i)) setBuilt((b) => [...b, i]);
  };

  // Phím tắt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose(changed);
      if (done) return;
      // Nút đang được focus tự nhận Enter/Space → không xử lý thêm lần nữa
      if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).closest?.("button")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (feedback || kind === "intro") return next();
        if (kind === "flash" && !flipped) return setFlipped(true);
        return check();
      }
      if (feedback || typing) return;
      if (choosing) {
        const opt = step.options?.[Number(e.key) - 1];
        if (opt) setSel(opt);
      } else if (kind === "tiles" || ordering) {
        if (e.key === "Backspace") setBuilt((b) => b.slice(0, -1));
        else if (kind === "tiles" && e.key.length === 1) {
          const i = step.tiles!.findIndex((c, j) => !built.includes(j) && c.toLowerCase() === e.key.toLowerCase());
          if (i >= 0) addTile(i);
        }
      } else if (kind === "flash") {
        if (e.key === " " && !flipped) {
          e.preventDefault();
          setFlipped(true);
        } else if (flipped && (e.key === "ArrowLeft" || e.key === "1")) answer(false);
        else if (flipped && (e.key === "ArrowRight" || e.key === "2")) answer(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Khoá cuộn trang phía sau; đóng thì ngừng đọc
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
  }, []);

  const canCheck = (choosing && !!sel) || ((kind === "tiles" || ordering) && built.length > 0) || (typing && !!typed.trim());
  const firstTry = graded.filter((g) => g.correct).length;
  const wrong = graded.filter((g) => !g.correct);
  const seconds = finishedAt ? Math.round((finishedAt - startedAt) / 1000) : 0;

  // ---- Đề bài theo từng dạng ----
  const renderExercise = () => {
    if (!step || !kind) return null;
    switch (kind) {
      case "intro":
        return (
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-extrabold tracking-wider text-amber uppercase">
              {sentence ? "Câu mới" : "Từ mới"} — ghi nhớ nhé
            </span>
            <div className="flex items-center gap-3">
              <SpeakButton text={v.word} tts={tts} big />
              <p className={`${headline} font-extrabold wrap-anywhere`}>{v.word}</p>
            </div>
            <p className={`wrap-anywhere ${v.meaning ? `${sentence ? "text-lg" : "text-2xl"} font-bold text-amber` : "text-muted italic"}`}>
              {v.meaning || "Chưa ghi nghĩa"}
            </p>
            {v.context && (
              <div className="flex items-start gap-1 rounded-2xl border-2 border-border p-4 text-left">
                <p className="leading-relaxed wrap-anywhere">
                  <Context text={v.context} word={v.word} />
                </p>
                <SpeakButton text={v.context} tts={tts} />
              </div>
            )}
          </div>
        );
      case "choose-meaning":
      case "listen-choose":
      case "choose-word":
      case "cloze-bank":
        return (
          <div className="flex flex-col gap-6">
            {kind === "choose-meaning" && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex items-center gap-3">
                  <SpeakButton text={v.word} tts={tts} big />
                  <p className={`${headline} font-extrabold wrap-anywhere`}>{v.word}</p>
                </div>
                {v.context && (
                  <p className="text-sm leading-relaxed text-muted wrap-anywhere">
                    <Context text={v.context} word={v.word} />
                  </p>
                )}
              </div>
            )}
            {kind === "listen-choose" && <ListenButtons word={v.word} />}
            {kind === "choose-word" && <p className={`text-center ${sentence ? "text-xl" : "text-3xl"} font-extrabold text-amber wrap-anywhere`}>{v.meaning}</p>}
            {kind === "cloze-bank" && (
              <div className="rounded-2xl border-2 border-border p-4 text-lg leading-loose wrap-anywhere">
                <Context text={v.context} word={v.word} blank={!feedback} fill={sel} />
                {v.meaning && <p className="mt-2 text-sm text-amber">Nghĩa: {v.meaning}</p>}
              </div>
            )}
            <div className={`grid gap-3 ${kind === "choose-meaning" || sentence ? "" : "sm:grid-cols-2"}`}>
              {step.options?.map((opt, i) => {
                const state = !feedback ? (sel === opt ? "sel" : "idle") : opt === right ? "right" : sel === opt ? "wrong" : "dim";
                return (
                  <button
                    key={opt}
                    className={`${tile} ${tone(state)} flex items-center gap-3 px-4 py-3.5 text-left text-lg`}
                    onClick={() => {
                      setSel(opt);
                      // Chọn từ tiếng Đức thì đọc lên cho quen tai (dạng nghe thì không, kẻo lộ đáp án)
                      if (sound && kind !== "choose-meaning" && kind !== "listen-choose") speak(opt);
                    }}
                    disabled={!!feedback}
                  >
                    <span className="hidden size-7 shrink-0 items-center justify-center rounded-lg border-2 border-current text-xs opacity-60 sm:inline-flex">
                      {i + 1}
                    </span>
                    <span className="wrap-anywhere">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case "tiles":
        return (
          <div className="flex flex-col gap-6">
            {v.meaning ? (
              <p className="text-center text-3xl font-extrabold text-amber wrap-anywhere">{v.meaning}</p>
            ) : canCloze(v) ? (
              <p className="rounded-2xl border-2 border-border p-4 text-lg leading-loose wrap-anywhere">
                <Context text={v.context} word={v.word} blank={!feedback} />
              </p>
            ) : (
              <ListenButtons word={v.word} />
            )}
            {/* Hàng chữ đã xếp */}
            <div
              className={`flex min-h-18 flex-wrap items-center justify-center gap-1.5 border-b-2 pb-3 ${feedback ? (feedback.ok ? "border-accent" : "border-red") : "border-border"}`}
            >
              {built.map((i) => (
                <button
                  key={i}
                  className={`${tile} ${tone(feedback ? (feedback.ok ? "right" : "wrong") : "idle")} min-w-11 px-3 py-2 text-2xl`}
                  onClick={() => setBuilt((b) => b.filter((x) => x !== i))}
                  disabled={!!feedback}
                >
                  {step.tiles![i]}
                </button>
              ))}
              {!built.length && <span className="text-sm text-muted">Bấm các chữ bên dưới (hoặc gõ phím)</span>}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {step.tiles!.map((c, i) =>
                built.includes(i) ? (
                  <span key={i} className="min-w-11 rounded-2xl bg-white/5 px-3 py-2 text-2xl text-transparent">
                    {c}
                  </span>
                ) : (
                  <button key={i} className={`${tile} ${tone("idle")} min-w-11 px-3 py-2 text-2xl`} onClick={() => addTile(i)} disabled={!!feedback}>
                    {c}
                  </button>
                ),
              )}
              {!feedback && built.length > 0 && (
                <button title="Xoá chữ cuối (Backspace)" className="btn-icon size-12 text-muted" onClick={() => setBuilt((b) => b.slice(0, -1))}>
                  <Delete className="size-5" />
                </button>
              )}
            </div>
          </div>
        );
      case "type":
      case "cloze-type":
      case "listen-type":
        return (
          <div className="flex flex-col gap-5">
            {kind === "type" && <p className="text-center text-3xl font-extrabold text-amber wrap-anywhere">{v.meaning}</p>}
            {kind === "cloze-type" && (
              <div className="rounded-2xl border-2 border-border p-4 text-lg leading-loose wrap-anywhere">
                <Context text={v.context} word={v.word} blank={!feedback} />
                {v.meaning && <p className="mt-2 text-sm text-amber">Nghĩa: {v.meaning}</p>}
              </div>
            )}
            {kind === "listen-type" && <ListenButtons word={v.word} />}
            <p className="text-center font-mono text-lg tracking-[0.3em] text-muted">
              {v.word.slice(0, hint)}
              {"_".repeat(Math.max(0, v.word.length - hint))}
            </p>
            <input
              ref={inputRef}
              className={`input rounded-2xl border-2 text-center text-xl font-bold ${feedback ? (feedback.ok ? "border-accent text-accent" : "border-red text-red-400 line-through") : ""}`}
              placeholder="Gõ bằng tiếng Đức…"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              readOnly={!!feedback}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {!feedback && (
              <div className="flex flex-wrap justify-center gap-2">
                {["ä", "ö", "ü", "ß"].map((c) => (
                  <button
                    key={c}
                    className={`${tile} ${tone("idle")} size-11 text-lg`}
                    onClick={() => {
                      setTyped((t) => t + c);
                      inputRef.current?.focus();
                    }}
                  >
                    {c}
                  </button>
                ))}
                <button
                  className={`${tile} ${tone("idle")} flex h-11 items-center gap-1.5 px-3 text-sm text-amber`}
                  onClick={() => {
                    setHint((h) => Math.min(h + 1, v.word.length - 1));
                    inputRef.current?.focus();
                  }}
                  disabled={hint >= v.word.length - 1}
                >
                  <Lightbulb className="size-4" /> Gợi ý
                </button>
              </div>
            )}
          </div>
        );
      case "match": {
        const pairs = step.pairs!;
        const owner = (m: string) => pairs.find((p) => p.meaning.trim() === m)!.id;
        const state = (side: "l" | "r", id: number) =>
          matched.includes(id) ? "dim" : badPair.includes(side + id) ? "wrong" : pick?.side === side && pick.id === id ? "sel" : "idle";
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-3">
              {pairs.map((p) => (
                <button
                  key={p.id}
                  className={`${tile} ${tone(state("l", p.id))} px-3 py-3.5 text-lg wrap-anywhere`}
                  onClick={() => tapPair("l", p.id)}
                  disabled={matched.includes(p.id)}
                >
                  {p.word}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {step.options!.map((m) => {
                const id = owner(m);
                return (
                  <button
                    key={m}
                    className={`${tile} ${tone(state("r", id))} px-3 py-3.5 text-base wrap-anywhere`}
                    onClick={() => tapPair("r", id)}
                    disabled={matched.includes(id)}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      case "order":
      case "listen-order":
        return (
          <div className="flex flex-col gap-6">
            {kind === "order" ? <p className="text-center text-xl font-extrabold text-amber wrap-anywhere">{v.meaning}</p> : <ListenButtons word={v.word} />}
            {/* Hàng từ đã xếp */}
            <div
              className={`flex min-h-18 flex-wrap items-center justify-center gap-1.5 border-b-2 pb-3 ${feedback ? (feedback.ok ? "border-accent" : "border-red") : "border-border"}`}
            >
              {built.map((i) => (
                <button
                  key={i}
                  className={`${tile} ${tone(feedback ? (feedback.ok ? "right" : "wrong") : "idle")} px-3 py-2 text-lg`}
                  onClick={() => setBuilt((b) => b.filter((x) => x !== i))}
                  disabled={!!feedback}
                >
                  {step.tiles![i]}
                </button>
              ))}
              {!built.length && <span className="text-sm text-muted">Bấm các từ bên dưới theo đúng thứ tự</span>}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {step.tiles!.map((w, i) =>
                built.includes(i) ? (
                  <span key={i} className="rounded-2xl bg-white/5 px-3 py-2 text-lg text-transparent">
                    {w}
                  </span>
                ) : (
                  <button key={i} className={`${tile} ${tone("idle")} px-3 py-2 text-lg`} onClick={() => addTile(i)} disabled={!!feedback}>
                    {w}
                  </button>
                ),
              )}
              {!feedback && built.length > 0 && (
                <button title="Bỏ từ cuối (Backspace)" className="btn-icon size-12 text-muted" onClick={() => setBuilt((b) => b.slice(0, -1))}>
                  <Delete className="size-5" />
                </button>
              )}
            </div>
          </div>
        );
      case "flash":
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-3">
              <SpeakButton text={v.word} tts={tts} big />
              <p className={`${headline} font-extrabold wrap-anywhere`}>{v.word}</p>
            </div>
            {flipped || feedback ? (
              <>
                <p className={`wrap-anywhere ${v.meaning ? "text-2xl font-bold text-amber" : "text-muted italic"}`}>{v.meaning || "Chưa ghi nghĩa"}</p>
                {v.context && (
                  <p className="text-sm leading-relaxed text-muted wrap-anywhere">
                    <Context text={v.context} word={v.word} />
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">Nhớ lại nghĩa trong đầu rồi lật thẻ</p>
            )}
          </div>
        );
    }
  };

  // ---- Thanh dưới: Kiểm tra / kết quả ----
  const renderBottom = () => {
    if (!step) return null;
    if (feedback) {
      const ok = feedback.ok;
      return (
        <div className={`border-t-2 ${ok ? "border-accent/40 bg-accent/15" : "border-red/40 bg-red/15"}`}>
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-6">
            <div className={`hidden size-14 shrink-0 items-center justify-center rounded-full bg-card sm:flex ${ok ? "text-accent" : "text-red-400"}`}>
              {ok ? <Check className="size-8" strokeWidth={3} /> : <X className="size-8" strokeWidth={3} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xl font-extrabold ${ok ? "text-accent" : "text-red-400"}`}>
                {ok ? (feedback.note ?? PRAISE[step.id % PRAISE.length]) : "Đáp án đúng:"}
              </p>
              {feedback.combo >= 3 && feedback.combo % 3 === 0 && (
                <p className="flex items-center gap-1 text-sm font-bold text-amber">
                  <Flame className="size-4" /> {feedback.combo} câu đúng liên tiếp!
                </p>
              )}
              {kind !== "match" && (
                <div className="mt-1 flex items-center gap-1">
                  <p className={`font-bold wrap-anywhere ${ok ? "text-accent" : "text-red-400"}`}>
                    {v.word}
                    {v.meaning && <span className="font-normal opacity-80"> — {v.meaning}</span>}
                  </p>
                  <SpeakButton text={v.word} tts={tts} />
                </div>
              )}
              {!ok && v.context && kind !== "choose-meaning" && (
                <p className="mt-1 text-sm leading-relaxed text-muted wrap-anywhere">
                  <Context text={v.context} word={v.word} />
                </p>
              )}
            </div>
            <button className={`btn ${ok ? "btn-primary" : "btn-red"} py-3 sm:min-w-40`} onClick={next}>
              Tiếp tục
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="border-t-2 border-border">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 p-4 sm:p-6">
          {kind === "intro" ? (
            <button className="btn btn-primary ml-auto py-3 sm:min-w-40" onClick={next}>
              Đã nhớ, tiếp tục
            </button>
          ) : kind === "flash" ? (
            flipped ? (
              <div className="grid flex-1 grid-cols-2 gap-3">
                <button className="btn btn-red py-3" onClick={() => answer(false)}>
                  <X className="size-4" /> Chưa nhớ
                </button>
                <button className="btn btn-primary py-3" onClick={() => answer(true)}>
                  <Check className="size-4" /> Đã nhớ
                </button>
              </div>
            ) : (
              <button className="btn btn-amber ml-auto py-3 sm:min-w-40" onClick={() => setFlipped(true)}>
                Lật thẻ
              </button>
            )
          ) : kind === "match" ? (
            <button className="btn py-3" onClick={() => answer(false)}>
              Bỏ qua
            </button>
          ) : (
            <>
              <button className="btn py-3 sm:min-w-32" onClick={() => answer(false)}>
                Không biết
              </button>
              <button className="btn btn-primary py-3 sm:min-w-40" onClick={check} disabled={!canCheck}>
                Kiểm tra
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const stats = [
    { icon: Zap, label: "Tổng XP", value: String(xp), color: "border-amber text-amber" },
    { icon: Target, label: "Chính xác", value: graded.length ? `${Math.round((firstTry / graded.length) * 100)}%` : "—", color: "border-accent text-accent" },
    { icon: Clock, label: "Thời gian", value: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, color: "border-link text-link" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Thanh trên: thoát · tiến độ · chuỗi đúng · âm thanh */}
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 p-4">
        <button title="Thoát (Esc)" className="btn-icon size-9 shrink-0 text-muted" onClick={() => onClose(changed)}>
          <X className="size-6" />
        </button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-card-2">
          <div
            className="relative h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${queue.length ? (Math.min(pos + (feedback ? 1 : 0), queue.length) / queue.length) * 100 : 100}%` }}
          >
            <div className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/30" />
          </div>
        </div>
        <span className={`flex w-12 shrink-0 items-center gap-0.5 font-extrabold ${combo >= 3 ? "text-amber" : "text-muted"}`} title="Số câu đúng liên tiếp">
          <Flame className="size-5" /> {combo}
        </span>
        <button title={sound ? "Tắt âm thanh" : "Bật âm thanh"} className="btn-icon size-9 shrink-0" onClick={() => setSound(!sound)}>
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-muted" />}
        </button>
      </div>

      {!items.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-5xl">🎉</p>
          <p className="text-xl font-extrabold">Không có từ nào cần ôn lúc này</p>
          <button className="btn btn-primary" onClick={() => onClose(false)}>
            Quay lại
          </button>
        </div>
      ) : done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6 text-center">
          <p className="text-6xl">{wrong.length ? "💪" : "🏆"}</p>
          <div>
            <p className="text-3xl font-extrabold text-amber">{practice ? "Luyện xong!" : "Hoàn thành bài ôn!"}</p>
            {!practice && streak.count > 0 && (
              <p className="mt-1 flex items-center justify-center gap-1 font-bold text-amber">
                <Flame className="size-5" /> {streak.count} ngày ôn liên tiếp
              </p>
            )}
          </div>
          <div className="grid w-full max-w-md grid-cols-3 gap-3">
            {stats.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className={`overflow-hidden rounded-2xl border-2 ${color}`}>
                <p className="bg-current/15 py-1 text-[10px] font-extrabold tracking-wider uppercase sm:text-xs">{label}</p>
                <p className="flex items-center justify-center gap-1 py-3 text-xl font-extrabold">
                  <Icon className="size-5" /> {value}
                </p>
              </div>
            ))}
          </div>
          <p className="max-w-md text-sm text-muted">
            Đúng ngay lần đầu {firstTry}/{graded.length} từ · chuỗi dài nhất {bestCombo} câu. Từ đúng được hẹn ôn lại xa hơn, từ sai quay lại vào ngày mai.
          </p>
          {wrong.length > 0 && (
            <div className="flex w-full max-w-md flex-col gap-2 rounded-2xl border-2 border-border p-4 text-left">
              <p className="font-extrabold text-red-400">Từ cần chú ý</p>
              {wrong.map((g) => (
                <div key={g.item.id} className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 wrap-anywhere">
                    <b>{g.item.word}</b> <span className="text-muted">— {g.item.meaning || "chưa ghi nghĩa"}</span>
                  </p>
                  {g.stage != null && <span className={`text-xs font-bold ${stageInfo(g.stage).color}`}>{stageInfo(g.stage).label}</span>}
                  <SpeakButton text={g.item.word} tts={tts} />
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {wrong.length > 0 && (
              <button className="btn py-3" onClick={() => restart(shuffle(wrong.map((g) => ({ ...g.item, stage: g.stage ?? 1 }))))}>
                <RotateCcw className="size-4" /> Luyện thêm từ sai
              </button>
            )}
            <button className="btn btn-primary py-3 sm:min-w-40" onClick={() => onClose(changed)}>
              Tiếp tục
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 px-4 py-4 sm:py-8">
              <div className="flex items-center gap-2">
                <h2 className="flex-1 text-2xl font-extrabold">{(sentence && PROMPT_SENTENCE[kind ?? "flash"]) || PROMPT[kind ?? "flash"]}</h2>
                {step.role === "retry" && <span className="pill text-xs text-red-400">Hỏi lại</span>}
                {step.role === "graded" && kind !== "intro" && (
                  <span className={`text-xs font-bold ${stageInfo(v.stage).color}`}>{stageInfo(v.stage).label}</span>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-center pb-6">{renderExercise()}</div>
              <p className="hidden text-center text-xs text-muted sm:block">
                {title} · Enter: kiểm tra / tiếp tục
                {choosing && " · 1–4: chọn"}
                {kind === "tiles" && " · gõ phím để xếp chữ, Backspace để xoá"}
                {ordering && " · Backspace: bỏ từ cuối"}
                {kind === "flash" && " · 1: chưa nhớ · 2: đã nhớ"} · Esc: thoát
              </p>
            </div>
          </div>
          {renderBottom()}
        </>
      )}
    </div>
  );
}
