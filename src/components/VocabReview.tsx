"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Eye, Lightbulb, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { gradeWord } from "@/app/account-actions";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { stageInfo } from "@/lib/srs";
import type { VocabItem } from "@/lib/db";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Đọc tiếng Đức bằng giọng của trình duyệt ----

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

// ---- Chấm câu trả lời gõ tay ----

/** Bỏ hoa/thường, dấu câu, mạo từ; ä→ae… để gõ thiếu umlaut vẫn chỉ lệch 1 ký tự */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFC")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(der|die|das|sich) /, "");

function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** "exact" | "ok" (khác hoa/thường, umlaut viết ae…) | "almost" (sai 1–2 chữ, vẫn tính đúng) | "wrong" */
function check(given: string, word: string): "exact" | "ok" | "almost" | "wrong" {
  if (given.trim() === word.trim()) return "exact";
  const a = norm(given);
  const b = norm(word);
  if (!a) return "wrong";
  if (a === b) return "ok";
  const d = distance(a, b);
  return (b.length >= 5 && d <= 1) || (b.length >= 10 && d <= 2) ? "almost" : "wrong";
}

// ---- Các dạng bài ----

/**
 * intro: làm quen từ mới · choose-meaning / choose-word: trắc nghiệm 2 chiều ·
 * cloze: điền từ vào câu ví dụ · type: nhìn nghĩa viết từ · listen: nghe viết · flash: thẻ lật tự chấm
 */
type Kind = "intro" | "choose-meaning" | "choose-word" | "cloze" | "type" | "listen" | "flash";

type Step = {
  item: VocabItem;
  /** graded: lần hỏi đầu tiên → chấm vào lịch ôn; retry: hỏi lại sau khi sai; reinforce: củng cố bằng dạng khó hơn */
  role: "intro" | "graded" | "retry" | "reinforce";
  kind?: Kind; // chọn lúc tới lượt (lúc đó mới biết trình duyệt có giọng Đức chưa)
  options?: string[];
  id: number;
};

const KIND_LABEL: Record<Kind, string> = {
  intro: "Từ mới",
  "choose-meaning": "Chọn nghĩa đúng",
  "choose-word": "Chọn từ đúng",
  cloze: "Điền từ vào câu",
  type: "Nhìn nghĩa, viết từ",
  listen: "Nghe và viết",
  flash: "Tự kiểm tra",
};

const isPhrase = (v: VocabItem) => v.word.trim().includes(" ");
const canCloze = (v: VocabItem) =>
  !isPhrase(v) && v.context.toLowerCase().includes(v.word.toLowerCase()) && v.context.trim().toLowerCase() !== v.word.toLowerCase();

/** 3 phương án nhiễu khác nhau, ưu tiên cùng loại (từ / cụm từ) với đáp án */
function distractors(item: VocabItem, pool: VocabItem[], field: "word" | "meaning"): string[] {
  const right = item[field].trim().toLowerCase();
  const seen = new Set([right]);
  const same: string[] = [];
  const other: string[] = [];
  for (const v of shuffle(pool)) {
    const val = v[field].trim();
    if (!val || seen.has(val.toLowerCase())) continue;
    seen.add(val.toLowerCase());
    (isPhrase(v) === isPhrase(item) ? same : other).push(val);
    if (same.length >= 3) break;
  }
  return [...same, ...other].slice(0, 3);
}

/** Dạng bài theo mức nhớ: mới → nhận diện (trắc nghiệm) → nhớ lại (điền / viết / nghe) */
function pickKind(step: Step, pool: VocabItem[], tts: boolean): Kind {
  const v = step.item;
  if (step.role === "intro") return "intro";
  const mcMeaning = !!v.meaning && distractors(v, pool, "meaning").length === 3;
  const mcWord = !!v.meaning && distractors(v, pool, "word").length === 3;
  const listen = tts && !isPhrase(v);
  if (!v.meaning) return canCloze(v) ? "cloze" : listen ? "listen" : "flash";
  if (isPhrase(v)) {
    if (step.role === "reinforce" || v.stage >= 2) return mcWord ? "choose-word" : listen ? "listen" : "flash";
    return mcMeaning ? "choose-meaning" : "flash";
  }
  if (step.role === "reinforce") return canCloze(v) ? "cloze" : "type";
  // Sai rồi hỏi lại thì dễ hơn một bậc
  const stage = step.role === "retry" ? Math.max(0, v.stage - 2) : v.stage;
  if (stage <= 1) return mcMeaning ? "choose-meaning" : canCloze(v) ? "cloze" : "type";
  if (stage === 2) return mcWord ? "choose-word" : canCloze(v) ? "cloze" : "type";
  if (stage === 3) return canCloze(v) ? "cloze" : "type";
  const hard: Kind[] = ["type"];
  if (canCloze(v)) hard.push("cloze");
  if (listen) hard.push("listen");
  return shuffle(hard)[0];
}

function resolve(step: Step, pool: VocabItem[], tts: boolean): Step {
  if (step.kind) return step;
  const kind = pickKind(step, pool, tts);
  const field = kind === "choose-meaning" ? "meaning" : kind === "choose-word" ? "word" : null;
  return { ...step, kind, options: field ? shuffle([step.item[field].trim(), ...distractors(step.item, pool, field)]) : undefined };
}

let nextId = 0;

/** Từ đã ôn xen kẽ với nhóm 3 từ mới (làm quen cả 3 rồi mới hỏi, để không chỉ nhớ tức thời) */
function buildQueue(items: VocabItem[]): Step[] {
  const reviews = shuffle(items.filter((v) => v.stage > 0));
  const fresh = shuffle(items.filter((v) => v.stage === 0));
  const out: Step[] = [];
  while (reviews.length || fresh.length) {
    for (const v of reviews.splice(0, 3)) out.push({ item: v, role: "graded", id: nextId++ });
    const group = fresh.splice(0, 3);
    for (const v of group) out.push({ item: v, role: "intro", id: nextId++ });
    for (const v of shuffle(group)) out.push({ item: v, role: "graded", id: nextId++ });
  }
  return out;
}

/** Chèn bước vào hàng đợi cách vị trí hiện tại vài thẻ (hoặc cuối hàng) */
const insertLater = (queue: Step[], pos: number, gap: number, step: Step) => {
  const q = [...queue];
  q.splice(Math.min(pos + 1 + gap, q.length), 0, step);
  return q;
};

// ---- Giao diện ----

/** Câu ví dụ: che từ (khi hỏi) hoặc tô đậm */
function Context({ text, word, hide }: { text: string; word: string; hide?: boolean }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      {hide ? (
        <span className="rounded bg-white/10 px-1 tracking-widest">{"_".repeat(Math.min(word.length, 14))}</span>
      ) : (
        <mark className="rounded bg-amber/20 px-0.5 text-amber">{text.slice(i, i + word.length)}</mark>
      )}
      {text.slice(i + word.length)}
    </>
  );
}

function SpeakButton({ text, tts }: { text: string; tts: boolean }) {
  if (!tts) return null;
  return (
    <button
      type="button"
      title="Nghe phát âm"
      className="btn-icon size-8 shrink-0 text-link"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
    >
      <Volume2 className="size-4" />
    </button>
  );
}

/** Thông tin đầy đủ của từ: hiện ở bước làm quen và sau mỗi câu trả lời */
function WordInfo({ v, tts }: { v: VocabItem; tts: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex items-center gap-1">
        <p className="text-3xl font-extrabold wrap-anywhere">{v.word}</p>
        <SpeakButton text={v.word} tts={tts} />
      </div>
      <p className={`wrap-anywhere ${v.meaning ? "text-xl font-bold text-amber" : "text-sm text-muted italic"}`}>
        {v.meaning || "Chưa ghi nghĩa"}
      </p>
      {v.context && (
        <div className="flex items-start gap-1">
          <p className="text-sm leading-relaxed text-muted wrap-anywhere">
            <Context text={v.context} word={v.word} />
          </p>
          <SpeakButton text={v.context} tts={tts} />
        </div>
      )}
    </div>
  );
}

type Result = { ok: boolean; note?: string; given?: string };
type Graded = { item: VocabItem; correct: boolean; stage?: number };

/**
 * Ôn từ chuyên sâu, theo lịch lặp lại ngắt quãng:
 * - Từ mới: làm quen → trắc nghiệm nghĩa → củng cố bằng điền từ / viết từ.
 * - Từ đã học: dạng bài khó dần theo mức nhớ (trắc nghiệm → điền vào câu → viết từ / nghe viết).
 * - Lần hỏi đầu tiên của mỗi từ được chấm vào lịch ôn (đúng → hẹn xa hơn, sai → ôn lại sớm);
 *   từ sai được hỏi lại vài thẻ sau cho tới khi trả lời đúng.
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
  const [autoSpeak, setAutoSpeak] = useLocalStorage("vocab-review-speak", true);
  const [queue, setQueue] = useState(() => {
    const q = buildQueue(items);
    return q.length ? [resolve(q[0], pool, false), ...q.slice(1)] : q;
  });
  const [pos, setPos] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState(0); // số chữ cái đầu đã gợi ý
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState<Graded[]>([]);
  const [practice, setPractice] = useState(false); // luyện thêm từ sai: không chấm lại vào lịch ôn
  const [changed, setChanged] = useState(false); // đã chấm vào lịch ôn → đóng thì tải lại sổ từ
  const inputRef = useRef<HTMLInputElement>(null);

  const step = queue[pos];
  const done = !step;
  const kind = step?.kind;
  const v = step?.item as VocabItem;
  const typing = kind === "cloze" || kind === "type" || kind === "listen";

  // Nghe viết: tự đọc từ khi tới thẻ
  useEffect(() => {
    if (kind === "listen" && !result) speak(step.item.word, 0.85);
  }, [step?.id, kind, result]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typing && !result) inputRef.current?.focus();
  }, [step?.id, typing, result]);

  const answer = (r: Result) => {
    setResult(r);
    if (autoSpeak) speak(v.word);
    if (step.role === "graded") {
      const entry: Graded = { item: v, correct: r.ok };
      setGraded((g) => [...g, entry]);
      if (!practice) {
        setChanged(true);
        gradeWord(v.id, r.ok)
          .then((res) => res && setGraded((g) => g.map((x) => (x === entry ? { ...x, stage: res.stage } : x))))
          .catch(() => {});
      }
    }
    // Từ còn non mà mới đúng ở dạng nhận diện → thêm 1 lượt tự viết ra để nhớ chủ động
    const recognitionOnly = kind === "choose-meaning" || kind === "choose-word" || kind === "flash";
    if (!r.ok) setQueue(insertLater(queue, pos, 3, { item: v, role: "retry", id: nextId++ }));
    else if (step.role === "graded" && v.stage <= 2 && recognitionOnly && !isPhrase(v) && (v.meaning || canCloze(v)))
      setQueue(insertLater(queue, pos, 4, { item: v, role: "reinforce", id: nextId++ }));
  };

  const next = () => {
    const n = pos + 1;
    if (queue[n]) setQueue((q) => q.map((s, i) => (i === n ? resolve(s, pool, tts) : s)));
    setPos(n);
    setResult(null);
    setTyped("");
    setHint(0);
    setFlipped(false);
  };

  const submitTyped = () => {
    if (result) return next();
    if (!typed.trim()) return;
    const c = check(typed, v.word);
    answer({
      ok: c !== "wrong",
      given: typed,
      note: c === "almost" ? "Gần đúng — để ý chính tả nhé" : c === "ok" ? "Đúng — chú ý cách viết chuẩn" : undefined,
    });
  };

  const rightOption = kind === "choose-meaning" ? v?.meaning.trim() : v?.word.trim();
  const choose = (opt: string) => {
    if (result) return;
    answer({ ok: opt === rightOption, given: opt });
  };

  const restart = (list: VocabItem[]) => {
    const q = buildQueue(list);
    setQueue(q.length ? [resolve(q[0], pool, tts), ...q.slice(1)] : q);
    setPos(0);
    setResult(null);
    setTyped("");
    setHint(0);
    setFlipped(false);
    setGraded([]);
    setPractice(true);
  };

  // Phím tắt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose(changed);
      if (done || typing) return; // ô gõ tự xử lý Enter
      // Nút đang được focus tự nhận Enter/Space → không xử lý thêm lần nữa
      if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).closest?.("button")) return;
      if (result || kind === "intro") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          next();
        }
      } else if (kind === "choose-meaning" || kind === "choose-word") {
        const i = Number(e.key) - 1;
        if (step.options?.[i]) choose(step.options[i]);
      } else if (kind === "flash") {
        if (!flipped && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          setFlipped(true);
        } else if (flipped && (e.key === "ArrowLeft" || e.key === "1")) answer({ ok: false });
        else if (flipped && (e.key === "ArrowRight" || e.key === "2")) answer({ ok: true });
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

  const remaining = queue.length - pos;
  const firstTry = graded.filter((g) => g.correct).length;
  const wrong = graded.filter((g) => !g.correct);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => onClose(changed)}>
      <div className="card flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="label truncate">Ôn tập · {title}</p>
            <p className="text-xs text-muted">
              {done ? "Hoàn thành" : `${KIND_LABEL[kind ?? "flash"]} · còn ${remaining} thẻ`}
              {step?.role === "retry" && " · hỏi lại"}
              {step?.role === "reinforce" && " · củng cố"}
            </p>
          </div>
          {tts && (
            <button
              title={autoSpeak ? "Tắt tự đọc từ sau khi trả lời" : "Bật tự đọc từ sau khi trả lời"}
              className="btn-icon size-8 shrink-0"
              onClick={() => setAutoSpeak(!autoSpeak)}
            >
              {autoSpeak ? <Volume2 className="size-4" /> : <VolumeX className="size-4 text-muted" />}
            </button>
          )}
          <button title="Đóng (Esc)" className="btn-icon size-8 shrink-0" onClick={() => onClose(changed)}>
            <X className="size-4" />
          </button>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full bg-accent transition-all" style={{ width: `${queue.length ? (pos / queue.length) * 100 : 100}%` }} />
        </div>

        {!items.length ? (
          <p className="py-10 text-center text-sm text-muted">Không có từ nào cần ôn lúc này. 🎉</p>
        ) : done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-4xl">{wrong.length ? "💪" : "🎉"}</p>
            <p className="text-lg font-extrabold">
              Đúng ngay lần đầu {firstTry}/{graded.length} từ
            </p>
            <p className="text-sm text-muted">
              Từ trả lời đúng được hẹn ôn lại xa hơn; từ sai sẽ quay lại vào ngày mai — ôn đúng hẹn để nhớ lâu.
            </p>
            {wrong.length > 0 && (
              <div className="flex w-full flex-col gap-1.5 rounded-xl bg-background/60 p-3 text-left text-sm">
                <p className="font-bold text-red-400">Cần chú ý</p>
                {wrong.map((g) => (
                  <p key={g.item.id} className="wrap-anywhere">
                    <b>{g.item.word}</b> <span className="text-muted">— {g.item.meaning || "chưa ghi nghĩa"}</span>
                  </p>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {wrong.length > 0 && (
                <button className="btn" onClick={() => restart(wrong.map((g) => ({ ...g.item, stage: g.stage ?? 1 })))}>
                  <RotateCcw className="size-4" /> Luyện thêm từ sai
                </button>
              )}
              <button className="btn btn-primary" onClick={() => onClose(changed)}>
                Xong
              </button>
            </div>
          </div>
        ) : kind === "intro" ? (
          <>
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-amber/40 bg-background/60 p-5">
              <p className="pill text-xs text-amber">Từ mới — ghi nhớ nhé</p>
              <WordInfo v={v} tts={tts} />
            </div>
            <button className="btn btn-primary" onClick={next}>
              Đã ghi nhớ, tiếp
            </button>
          </>
        ) : (
          <>
            {/* Đề bài */}
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-background/60 p-5 text-center">
              {kind === "choose-meaning" && (
                <>
                  <div className="flex items-center gap-1">
                    <p className="text-3xl font-extrabold wrap-anywhere">{v.word}</p>
                    <SpeakButton text={v.word} tts={tts} />
                  </div>
                  {v.context && (
                    <p className="text-sm leading-relaxed text-muted wrap-anywhere">
                      <Context text={v.context} word={v.word} />
                    </p>
                  )}
                </>
              )}
              {(kind === "choose-word" || kind === "type") && (
                <>
                  <p className="text-xs text-muted">Từ tiếng Đức nào có nghĩa là</p>
                  <p className="text-2xl font-extrabold text-amber wrap-anywhere">{v.meaning}</p>
                </>
              )}
              {kind === "cloze" && (
                <>
                  <p className="text-lg leading-relaxed wrap-anywhere">
                    <Context text={v.context} word={v.word} hide={!result} />
                  </p>
                  {v.meaning && <p className="text-sm text-amber">Nghĩa: {v.meaning}</p>}
                </>
              )}
              {kind === "listen" && (
                <>
                  <button className="btn-icon size-16 rounded-full bg-accent/15 text-accent" onClick={() => speak(v.word, 0.85)} title="Nghe lại">
                    <Volume2 className="size-8" />
                  </button>
                  <button className="text-xs text-link hover:underline" onClick={() => speak(v.word, 0.55)}>
                    Nghe chậm
                  </button>
                </>
              )}
              {kind === "flash" &&
                (flipped || result ? (
                  <WordInfo v={v} tts={tts} />
                ) : (
                  <>
                    <p className="text-3xl font-extrabold wrap-anywhere">{v.word}</p>
                    <p className="text-xs text-muted">Nhớ lại nghĩa rồi lật thẻ (Space)</p>
                  </>
                ))}
              {typing && (hint > 0 || kind === "type") && !result && (
                <p className="font-mono text-sm tracking-widest text-muted">
                  {v.word.slice(0, hint)}
                  {"_".repeat(Math.max(0, v.word.length - hint))}
                </p>
              )}
            </div>

            {/* Trả lời */}
            {(kind === "choose-meaning" || kind === "choose-word") && (
              <div className="grid gap-2">
                {step.options?.map((opt, i) => {
                  const isRight = opt === rightOption;
                  const picked = result?.given === opt;
                  const tone = !result
                    ? "hover:border-accent"
                    : isRight
                      ? "border-accent bg-accent/15"
                      : picked
                        ? "border-red bg-red/15"
                        : "opacity-50";
                  return (
                    <button
                      key={opt}
                      className={`flex items-center gap-3 rounded-xl border border-border bg-card-2 px-4 py-3 text-left font-bold transition ${tone}`}
                      onClick={() => choose(opt)}
                      disabled={!!result}
                    >
                      <span className="hidden size-6 shrink-0 items-center justify-center rounded-md border border-border text-xs text-muted sm:inline-flex">
                        {i + 1}
                      </span>
                      <span className="wrap-anywhere">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {typing && (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitTyped();
                }}
              >
                <input
                  ref={inputRef}
                  className={`input text-center text-lg font-bold ${result ? (result.ok ? "border-accent" : "border-red text-red-400 line-through") : ""}`}
                  placeholder="Gõ từ tiếng Đức…"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  readOnly={!!result}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {!result && (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      className="btn px-2 text-xs"
                      onClick={() => {
                        setHint((h) => Math.min(h + 1, v.word.length - 1));
                        inputRef.current?.focus();
                      }}
                      disabled={hint >= v.word.length - 1}
                    >
                      <Lightbulb className="size-3.5 text-amber" /> Gợi ý
                    </button>
                    <button type="button" className="btn px-2 text-xs" onClick={() => answer({ ok: false, given: typed })}>
                      <Eye className="size-3.5" /> Không biết
                    </button>
                    <button className="btn btn-primary px-2 text-xs" disabled={!typed.trim()}>
                      Kiểm tra
                    </button>
                  </div>
                )}
              </form>
            )}

            {kind === "flash" &&
              !result &&
              (flipped ? (
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn btn-red" onClick={() => answer({ ok: false })}>
                    <X className="size-4" /> Chưa nhớ
                  </button>
                  <button className="btn btn-primary" onClick={() => answer({ ok: true })}>
                    <Check className="size-4" /> Đã nhớ
                  </button>
                </div>
              ) : (
                <button className="btn btn-amber" onClick={() => setFlipped(true)}>
                  Lật thẻ
                </button>
              ))}

            {/* Kết quả + thông tin đầy đủ của từ */}
            {result && (
              <div className={`flex flex-col gap-3 rounded-2xl border-2 p-4 ${result.ok ? "border-accent/60 bg-accent/10" : "border-red/60 bg-red/10"}`}>
                <p className={`font-extrabold ${result.ok ? "text-accent" : "text-red-400"}`}>
                  {result.ok ? (result.note ?? "Chính xác!") : "Chưa đúng — sẽ hỏi lại sau ít thẻ nữa"}
                </p>
                {kind !== "flash" && <WordInfo v={v} tts={tts} />}
                <button className={`btn ${result.ok ? "btn-primary" : "btn-red"}`} onClick={next}>
                  Tiếp tục
                </button>
              </div>
            )}

            <p className="hidden text-center text-xs text-muted sm:block">
              {typing
                ? "Enter: kiểm tra / tiếp tục · Esc: đóng"
                : kind === "flash"
                  ? "Space: lật · ←: chưa nhớ · →: đã nhớ · Esc: đóng"
                  : "1–4: chọn · Enter: tiếp tục · Esc: đóng"}
              {step.role === "graded" && (
                <>
                  {" · "}
                  <span className={stageInfo(v.stage).color}>{stageInfo(v.stage).label}</span>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
