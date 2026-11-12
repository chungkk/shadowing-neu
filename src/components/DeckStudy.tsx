"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Eye, Lightbulb, List, RotateCcw, Volume2, X } from "lucide-react";
import { addDeck } from "@/app/account-actions";
import { blankExample, checkGuess, fullWord, hintOf, quizOptions, STUDY_MODES, type StudyMode } from "@/lib/deck-study";
import type { DeckTopic, DeckWord } from "@/lib/decks";
import { speak, useHasGermanVoice } from "@/lib/german-voice";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { shuffle } from "@/lib/review";
import DeckWords from "./DeckWords";
import { LoginLink } from "./LoginDialog";

type Word = DeckWord & { saved: boolean; learned: boolean };
type Mode = StudyMode | "list";

const noop = () => () => {};
/** Đáp án trắc nghiệm / thứ tự ôn lại là ngẫu nhiên → chỉ vẽ trên trình duyệt (khỏi lệch hydrate) */
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

const GENDER: Record<string, string> = { der: "text-phrase", die: "text-red-400", das: "text-accent-text" };

/** Hình minh hoạ của từ (emoji 3D), không có thì biểu tượng chủ đề */
function Picture({ w, icon, className = "size-28" }: { w: DeckWord; icon: string; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-3xl bg-amber/80 ${className}`}>
      {w.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={w.image} alt="" className="size-3/4 object-contain drop-shadow-lg" />
      ) : (
        <span className="text-5xl">{icon}</span>
      )}
    </span>
  );
}

/** "der Hund" — mạo từ tô màu theo giống */
function German({ w, className = "" }: { w: DeckWord; className?: string }) {
  const art = w.gender === "der" || w.gender === "die" || w.gender === "das" ? w.gender : "";
  return (
    <span className={className}>
      {art && <span className={GENDER[art]}>{art} </span>}
      {w.word}
    </span>
  );
}

function SpeakButton({ w, big }: { w: DeckWord; big?: boolean }) {
  const tts = useHasGermanVoice();
  if (!tts) return null;
  return (
    <button type="button" title="Nghe phát âm" className={`btn-icon shrink-0 text-link ${big ? "size-12" : "size-9"}`} onClick={() => speak(fullWord(w))}>
      <Volume2 className={big ? "size-6" : "size-4"} />
    </button>
  );
}

/** Đáp án đầy đủ hiện sau khi trả lời: từ · số nhiều · nghĩa · câu ví dụ */
function Reveal({ w, tone, title }: { w: DeckWord; tone: "ok" | "bad"; title: string }) {
  return (
    <div className={`flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 p-4 text-center ${tone === "ok" ? "border-accent/60 bg-accent/10" : "border-red/60 bg-red/10"}`}>
      <p className={`text-sm font-extrabold tracking-wide uppercase ${tone === "ok" ? "text-accent-text" : "text-red-400"}`}>{title}</p>
      <div className="flex items-center gap-1">
        <German w={w} className="text-2xl font-extrabold" />
        <SpeakButton w={w} />
      </div>
      {!!w.plural && w.plural !== w.word && <p className="text-sm text-muted">số nhiều: die {w.plural}</p>}
      <p className="text-foreground/85">{w.meaning}</p>
      {w.example && <p className="text-sm text-muted italic">{w.example}</p>}
    </div>
  );
}

/**
 * 1 thẻ học. onDone(true) = thuộc (thêm vào sổ, sang từ khác) · onDone(false) = chưa thuộc (gặp lại sau vài thẻ).
 * Mỗi thẻ là 1 component riêng (key) → trạng thái tự xoá khi sang thẻ mới
 */
function StudyCard({ w, mode, pool, icon, onDone }: { w: Word; mode: StudyMode; pool: DeckWord[]; icon: string; onDone: (ok: boolean) => void }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof checkGuess> | "skip" | null>(null);
  const [hint, setHint] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [options] = useState(() => (mode === "quiz" || mode === "reverse" ? quizOptions(w, pool, mode === "reverse") : []));
  const blanked = useMemo(() => blankExample(w), [w]);

  // Máy tính: con trỏ vào ô gõ luôn. Cảm ứng thì không — bàn phím bật lên che mất thẻ trước khi kịp nhìn từ
  const guessRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!matchMedia("(pointer: coarse)").matches) guessRef.current?.focus();
  }, []);

  // Nghe viết: đọc từ ngay khi hiện thẻ
  useEffect(() => {
    if (mode === "listen") speak(fullWord(w), 0.85);
  }, [mode, w]);

  const correct = picked !== null ? picked === answerOf(w, mode) : result === "ok" || result === "almost";
  const next = (
    <button autoFocus className={`btn h-12 w-full max-w-sm ${correct ? "btn-primary" : "btn-red"}`} onClick={() => onDone(correct)}>
      Tiếp tục
    </button>
  );

  // ---- Thẻ lật ----
  if (mode === "flash")
    return (
      <div className="flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="flex min-h-56 w-full max-w-lg cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-border bg-card-2/60 p-6 text-center transition hover:border-accent"
        >
          {!flipped ? (
            <>
              <Picture w={w} icon={icon} />
              <German w={w} className="text-3xl font-extrabold" />
              {!!w.plural && w.plural !== w.word && <span className="text-sm text-muted">die {w.plural}</span>}
              <span className="text-xs font-bold text-muted">Bấm để lật thẻ</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-extrabold text-link">{w.meaning}</span>
              {w.example && <span className="text-muted italic">{w.example}</span>}
            </>
          )}
        </button>
        <SpeakButton w={w} big />
        {flipped ? (
          <div className="grid w-full max-w-lg grid-cols-2 gap-3">
            <button className="btn btn-red h-12" onClick={() => onDone(false)}>
              <X className="size-4" /> Chưa thuộc
            </button>
            <button autoFocus className="btn btn-primary h-12" onClick={() => onDone(true)}>
              <Check className="size-4" /> Đã thuộc
            </button>
          </div>
        ) : (
          <button autoFocus className="btn btn-amber h-12 w-full max-w-lg" onClick={() => setFlipped(true)}>
            <RotateCcw className="size-4" /> Lật thẻ
          </button>
        )}
      </div>
    );

  // ---- Trắc nghiệm (nhìn từ chọn nghĩa) / ngược (nhìn nghĩa chọn từ) ----
  if (mode === "quiz" || mode === "reverse") {
    const right = answerOf(w, mode);
    return (
      <div className="flex flex-col items-center gap-5">
        <Picture w={w} icon={icon} />
        {mode === "quiz" ? (
          <div className="flex items-center gap-1">
            <German w={w} className="text-3xl font-extrabold" />
            <SpeakButton w={w} />
          </div>
        ) : (
          <p className="text-center text-2xl font-extrabold text-link">{w.meaning}</p>
        )}
        <p className="text-sm font-bold text-muted">{mode === "quiz" ? "Chọn nghĩa đúng" : "Chọn từ tiếng Đức đúng"}</p>
        <div className="grid w-full max-w-xl gap-2.5 sm:grid-cols-2">
          {options.map((o) => {
            const state = picked === null ? "" : o === right ? "border-accent bg-accent/15 text-accent-text" : o === picked ? "border-red bg-red/15 text-red-400" : "opacity-50";
            return (
              <button
                key={o}
                disabled={picked !== null}
                onClick={() => {
                  setPicked(o);
                  if (mode === "reverse" || o === right) speak(fullWord(w));
                }}
                className={`btn min-h-12 justify-start text-left text-base normal-case ${state}`}
              >
                {o}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <>
            {picked !== right && <Reveal w={w} tone="bad" title="Chưa đúng" />}
            {next}
          </>
        )}
      </div>
    );
  }

  // ---- Đoán từ (nhìn nghĩa + câu ví dụ, gõ từ) / Nghe viết (nghe, gõ từ) ----
  const check = (skip: boolean) => {
    const r = skip ? "skip" : checkGuess(input, w);
    setResult(r);
    if (r !== "wrong" && r !== "skip") speak(fullWord(w));
  };
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Nghe viết: ảnh lộ đáp án → chỉ hiện biểu tượng chủ đề */}
      <Picture w={mode === "listen" ? { ...w, image: null } : w} icon={icon} />
      {mode === "listen" ? (
        <button type="button" className="btn btn-amber h-14 px-6 text-base" onClick={() => speak(fullWord(w), 0.85)}>
          <Volume2 className="size-6" /> Nghe lại
        </button>
      ) : (
        <>
          <p className="text-center text-2xl font-extrabold text-link md:text-3xl">{w.meaning}</p>
          {blanked && (
            <div className="flex flex-col items-center gap-0.5 text-center">
              <p className="text-xs font-bold tracking-wider text-muted uppercase">Câu ví dụ</p>
              <p className="font-semibold italic">{blanked}</p>
            </div>
          )}
        </>
      )}
      {result === null ? (
        <form
          className="flex w-full max-w-md flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) check(false);
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="min-w-24 rounded-xl border border-dashed border-border px-4 py-2 text-center font-mono tracking-widest text-muted">{hintOf(w, hint)}</span>
            <button type="button" className="btn btn-amber h-10" onClick={() => setHint((h) => Math.min(h + 1, w.word.length))}>
              <Lightbulb className="size-4" /> Gợi ý
            </button>
          </div>
          <input
            ref={guessRef}
            className="input h-12 text-center text-lg md:text-lg"
            placeholder={mode === "listen" ? "Gõ từ bạn nghe được…" : "Gõ từ tiếng Đức…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn btn-red h-12" onClick={() => check(true)}>
              <Eye className="size-4" /> Không biết
            </button>
            <button className="btn btn-primary h-12" disabled={!input.trim()}>
              <Check className="size-4" /> Kiểm tra
            </button>
          </div>
        </form>
      ) : (
        <>
          <Reveal
            w={w}
            tone={correct ? "ok" : "bad"}
            title={
              result === "ok"
                ? "Chính xác!"
                : result === "almost"
                  ? "Gần đúng — chú ý chính tả"
                  : result === "article"
                    ? "Đúng từ nhưng sai mạo từ"
                    : result === "skip"
                      ? "Đáp án"
                      : `Chưa đúng — bạn gõ “${input.trim()}”`
            }
          />
          {next}
        </>
      )}
    </div>
  );
}

/** Đáp án đúng của thẻ trắc nghiệm (so với lựa chọn đã bấm) */
const answerOf = (w: DeckWord, mode: StudyMode) => (mode === "reverse" ? fullWord(w) : w.meaning);

/**
 * 1 lượt học 1 chủ đề: hàng đợi các từ chưa thuộc (ôn lại: mọi từ, xáo trộn).
 * Trả lời sai → từ quay lại sau 3 thẻ; hết hàng đợi → hoàn thành
 */
function Session({
  words,
  pool,
  mode,
  icon,
  practice,
  onLearned,
  onPractice,
  nextTopic,
}: {
  words: Word[];
  pool: DeckWord[];
  mode: StudyMode;
  icon: string;
  practice: boolean;
  onLearned: (w: Word) => void;
  onPractice: () => void;
  nextTopic: (() => void) | null;
}) {
  const [queue, setQueue] = useState(() => (practice ? shuffle(words) : words.filter((w) => !w.learned)));
  const [seq, setSeq] = useState(0); // đổi key thẻ mỗi lần sang thẻ mới
  const w = queue[0];
  if (!w)
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="text-6xl">🎉</span>
        <p className="text-xl font-extrabold">{practice ? "Đã ôn xong chủ đề này" : "Bạn đã học hết chủ đề này"}</p>
        <p className="max-w-md text-sm text-muted">Các từ đã nằm trong Sổ từ vựng và sẽ được nhắc ôn đúng lúc để nhớ lâu.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button className="btn h-11" onClick={onPractice}>
            <RotateCcw className="size-4" /> Ôn lại chủ đề
          </button>
          {nextTopic && (
            <button className="btn btn-primary h-11" onClick={nextTopic}>
              Chủ đề tiếp theo
            </button>
          )}
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      {w.saved && !practice && <p className="self-center rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-text">Đã có trong sổ</p>}
      <StudyCard
        key={seq}
        w={w}
        mode={mode}
        pool={pool}
        icon={icon}
        onDone={(ok) => {
          if (ok && !practice && !w.learned) onLearned(w);
          setQueue((q) => (ok ? q.slice(1) : [...q.slice(1, 4), q[0], ...q.slice(4)]));
          setSeq((n) => n + 1);
        }}
      />
    </div>
  );
}

/** Màn học 1 bộ từ: danh sách chủ đề (trái) · các chế độ học + tiến độ chủ đề (phải) */
export default function DeckStudy({
  slug,
  title,
  topics,
  words: initial,
  initialTopic,
  loggedIn,
}: {
  slug: string;
  title: string;
  topics: DeckTopic[];
  words: Word[];
  initialTopic: string;
  loggedIn: boolean;
}) {
  const [words, setWords] = useState(initial);
  const [topicId, setTopicId] = useState(initialTopic);
  const [practice, setPractice] = useState(0); // > 0: đang ôn lại (mỗi lần bấm "Ôn lại" tăng 1 → lượt mới)
  const [mode, setMode] = useLocalStorage<Mode>("deck-mode", "flash");
  const [picked, setPicked] = useState(false); // đã tự chọn chế độ trong lần mở trang này
  const pickMode = (m: Mode) => {
    setPicked(true);
    setMode(m);
  };
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const tts = useHasGermanVoice();
  const mounted = useMounted();

  const topic = topics.find((t) => t.id === topicId) ?? topics[0];
  const topicWords = useMemo(() => words.filter((w) => w.topic === topic.id), [words, topic.id]);
  const pool = topicWords.length >= 4 ? topicWords : words;
  const learned = topicWords.filter((w) => w.learned).length;
  const modes = STUDY_MODES.filter((m) => m.mode !== "listen" || tts);
  // Chủ đề chưa học từ nào → bắt đầu bằng Thẻ lật (không bắt gõ từ chưa từng thấy), trừ khi vừa tự chọn chế độ khác
  const study: Mode = !picked && learned === 0 && mode !== "list" ? "flash" : mode === "listen" && !tts ? "guess" : mode;

  const markSaved = (keys: string[]) => {
    const set = new Set(keys);
    setWords((ws) => ws.map((w) => (set.has(w.key) ? { ...w, saved: true } : w)));
  };
  const learn = (w: Word) => {
    setWords((ws) => ws.map((x) => (x.key === w.key ? { ...x, saved: true, learned: true } : x)));
    if (!loggedIn) return; // khách: tiến độ chỉ trong lượt này
    startTransition(async () => {
      // Thẻ lật = tự khai "đã thuộc" → chỉ vào sổ; dạng có kiểm tra → tính là lần ôn đầu (mức 1)
      const r = await addDeck(slug, [w.key], true, study !== "flash");
      if ("error" in r) setError(r.error);
    });
  };
  const pick = (id: string) => {
    setTopicId(id);
    setPractice(0);
    // Giữ chủ đề khi tải lại / chia sẻ link (không cần tải lại trang)
    window.history.replaceState(null, "", `/vocab/decks/${slug}/${id}`);
  };
  const i = topics.findIndex((t) => t.id === topic.id);
  const nextTopic = i + 1 < topics.length ? () => pick(topics[i + 1].id) : null;

  const countOf = (id: string) => {
    const list = words.filter((w) => w.topic === id);
    return { n: list.length, s: list.filter((w) => w.learned).length };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/vocab" className="btn h-9 px-3" title="Từ vựng">
          <ChevronLeft className="size-4" /> Quay lại
        </Link>
        <h1 className="flex-1 text-2xl font-extrabold md:text-3xl">{title}</h1>
        {/* Chế độ học */}
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-card-2 p-1">
          {[...modes, { mode: "list" as const, label: "Danh sách" }].map((m) => (
            <button
              key={m.mode}
              onClick={() => pickMode(m.mode)}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition pointer-coarse:py-2.5 ${
                study === m.mode ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {m.mode === "list" && <List className="size-4" />}
              {m.label}
            </button>
          ))}
        </div>
        {study === "flash" && learned > 0 && (
          <button className="cursor-pointer text-sm font-bold text-link hover:underline" onClick={() => pickMode("quiz")}>
            Tiếp theo: Trắc nghiệm →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Danh sách chủ đề: cột trái (máy tính) · hàng cuộn ngang (điện thoại) */}
        <aside className="card flex flex-col gap-2 p-3 max-lg:p-2 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:self-start">
          <p className="label px-1 max-lg:hidden">Chủ đề</p>
          <div className="flex gap-2 overflow-auto max-lg:pb-1 lg:flex-col">
            {topics.map((t) => {
              const { n, s } = countOf(t.id);
              const on = t.id === topic.id;
              return (
                <button
                  key={t.id}
                  onClick={() => pick(t.id)}
                  className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border p-2 text-left transition max-lg:pr-3 ${
                    on ? "border-accent bg-accent/20" : "border-border hover:border-accent/60 hover:bg-foreground/5"
                  }`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card-2 text-xl">{t.icon}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-extrabold">{t.title}</span>
                    <span className={`text-xs font-bold ${s >= n ? "text-accent-text" : "text-muted"}`}>
                      {s}/{n} từ{s >= n && " ✓"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3 text-sm font-extrabold tracking-wide uppercase">
            <span className="truncate text-link">
              {topic.icon} Tiến độ — {topic.title}
            </span>
            <span className="shrink-0 text-muted">
              {learned} / {topicWords.length} từ
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-card-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(learned * 100) / Math.max(1, topicWords.length)}%` }} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loggedIn && (
            <p className="text-sm text-muted">
              Bạn đang học thử — <LoginLink href={`/login?next=/vocab/decks/${slug}/${topic.id}`} className="font-bold text-link hover:underline">đăng nhập</LoginLink> để lưu tiến độ và ôn lại theo lịch.
            </p>
          )}
          <div className="card min-h-96 p-5 md:p-8">
            {!mounted ? null : study === "list" ? (
              <DeckWords key={topic.id} slug={slug} words={topicWords} loggedIn={loggedIn} onSaved={markSaved} />
            ) : (
              <Session
                key={`${topic.id}|${study}|${practice}`}
                words={topicWords}
                pool={pool}
                mode={study}
                icon={topic.icon}
                practice={practice > 0}
                onLearned={learn}
                onPractice={() => setPractice((p) => p + 1)}
                nextTopic={nextTopic}
              />
            )}
          </div>
          <p className="text-center text-xs font-bold text-muted">
            Chủ đề {i + 1}/{topics.length} · {words.length} từ trong bộ · đã thuộc {words.filter((w) => w.learned).length}
          </p>
        </section>
      </div>
    </div>
  );
}
