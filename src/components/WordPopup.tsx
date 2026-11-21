"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { LoginLink } from "@/components/auth/LoginDialog";
import { usePathname } from "next/navigation";
import { Bookmark, BookmarkMinus, ExternalLink, Lightbulb, Loader2, Lock, Play, Volume2, X } from "lucide-react";
import { locatePhrase } from "@/lib/phrase-match";
import { clientApi } from "@/lib/client-api";
import { speakGerman, stopSpeaking } from "@/lib/speak";

/** Nghĩa 1 từ theo ngữ cảnh câu (POST /word) */
type WordInfo = { word: string; meaning: string };
/** Tab Giải thích / Ví dụ (POST /word { detail: true }); từ cần học trong ví dụ được bọc **…** */
type WordDetail = {
  lemma: string;
  ipa?: string;
  pos: string;
  grammar: string;
  explanation: string;
  examples: { de: string; tr: string }[];
  synonyms?: { word: string; note: string }[];
  senses?: { meaning: string; use: string; de: string; tr: string; current: boolean }[];
  forms?: { form: string; note: string }[];
  tip?: string;
  cues?: { cue: string; meaning: string }[];
  idiom?: { de: string; note: string } | null;
};

type SavedExample = { context: string; sourceUrl: string | null; sourceTitle: string };
type TabKey = "explain" | "examples";

const LANG = "vi"; // giao diện web chỉ có tiếng Việt
const UNAVAILABLE = "Chưa có dữ liệu cho từ này, thử lại sau.";
const MAX_CACHE = 200;

// Kết quả đã hỏi trong lần mở trang này (từ + câu) → mở lại không phải chờ; kèm chống gọi trùng khi đang tải
const meanings = new Map<string, WordInfo>();
const details = new Map<string, WordDetail>();
const inflightMeanings = new Map<string, Promise<WordInfo>>();
const inflightDetails = new Map<string, Promise<WordDetail>>();

function cacheSet<T>(cache: Map<string, T>, key: string, value: T) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

const isMeaning = (x: unknown): x is WordInfo => typeof (x as WordInfo)?.meaning === "string";
const isDetail = (x: unknown): x is WordDetail =>
  Array.isArray((x as WordDetail)?.examples) && typeof (x as WordDetail).explanation === "string";

/** Gọi API 1 lần cho mỗi khoá, có cache + chống gọi trùng + nút thử lại sạch trạng thái lỗi */
function useWordApi<T>(
  cache: Map<string, T>,
  inflight: Map<string, Promise<T>>,
  key: string,
  enabled: boolean,
  body: object,
  attempt: number,
  valid: (x: unknown) => x is T,
) {
  const [res, setRes] = useState<{ key: string; attempt: number; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (!enabled || cache.has(key)) return;
    let alive = true;
    let job = inflight.get(key);
    if (!job) {
      job = clientApi<unknown>("/word", { method: "POST", body })
        .then((data) => {
          if (!valid(data)) throw new Error(UNAVAILABLE);
          cacheSet(cache, key, data);
          return data;
        })
        .finally(() => {
          inflight.delete(key);
        });
      inflight.set(key, job);
    }
    job
      .then((data) => alive && setRes({ key, attempt, data }))
      .catch((e: Error) => alive && setRes({ key, attempt, error: e.message }));
    return () => {
      alive = false;
    };
    // body dựng lại mỗi lần render; key đã gồm đủ nội dung của body
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, inflight, key, enabled, attempt]);
  const data = cache.get(key) ?? (res?.key === key ? res.data : undefined);
  return { data, error: !data && res?.key === key && res.attempt === attempt ? res.error : undefined };
}

// Bấm = đọc bình thường; giữ (hoặc Shift + bấm) = đọc chậm. Chỉ 1 con trỏ bấm cùng lúc → giữ trạng thái ở cấp module
let holdTimer: ReturnType<typeof setTimeout> | undefined;
let held = false;
function holdable(tap: () => void, hold: () => void) {
  const cancel = () => clearTimeout(holdTimer);
  return {
    onPointerDown: () => {
      held = false;
      cancel();
      holdTimer = setTimeout(() => {
        held = true;
        hold();
      }, 450);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
    onClick: (e: MouseEvent) => {
      if (held) return;
      if (e.shiftKey) hold();
      else tap();
    },
  };
}

/**
 * Bảng tra từ (bản web của mobile/src/components/WordSheet.tsx): từ + IPA + loa, nghĩa theo ngữ cảnh ngay bên dưới;
 * mặc định mở tab Giải thích (dạng từ điển, ngữ pháp, giải thích ngữ cảnh, các nghĩa, mẹo nhớ, đồng nghĩa…),
 * tab Ví dụ (câu trong video + ví dụ AI, bấm để nghe); nút lưu vào sổ từ.
 * Màn hẹp: trượt lên từ đáy; màn rộng: hộp giữa màn hình. Khách thấy lời mời đăng nhập.
 */
export default function WordPopup({
  word,
  context,
  marks,
  initialMeaning,
  extraExamples,
  loggedIn,
  saved,
  autoSave = false,
  onAutoSaveChange,
  onSave,
  onRemove,
  onClose,
}: {
  word: string | null;
  context: string;
  marks?: string[]; // mở từ cụm từ: các phần của cụm trong câu để tô sáng
  initialMeaning?: string; // nghĩa đã lưu sẵn (khi mở từ Sổ từ vựng) → hiện ngay không phải chờ
  extraExamples?: SavedExample[]; // các câu khác chứa từ này đã lưu từ nhiều bài học
  loggedIn: boolean;
  saved: boolean;
  autoSave?: boolean; // tự động đưa từ bấm tra vào sổ từ vựng + hàng đợi ôn
  onAutoSaveChange?: (next: boolean) => void;
  onSave: (meaning: string, opts?: { silent?: boolean }) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tabState, setTabState] = useState<{ key: string; tab: TabKey }>({ key: "", tab: "explain" });
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [autoSavedKey, setAutoSavedKey] = useState<string | null>(null);
  const autoSavedRef = useRef<string | null>(null);
  const dismissedRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const key = `${LANG}|${word}|${context}`;
  const tab: TabKey = tabState.key === key ? tabState.tab : "explain";
  const setTab = (next: TabKey) => setTabState({ key, tab: next });

  const enabled = !!word && loggedIn;
  const meaning = useWordApi(meanings, inflightMeanings, key, enabled && !initialMeaning, { word, context, lang: LANG }, attempt, isMeaning);
  const detail = useWordApi(details, inflightDetails, key, enabled, { word, context, lang: LANG, detail: true }, attempt, isDetail);
  const resolvedMeaning = initialMeaning || meaning.data?.meaning;

  // Cuộn về đầu khi mở từ mới hoặc chuyển tab
  useEffect(() => {
    if (!word) return;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [word, key, tab]);

  // Tự động lưu từ vừa tra vào sổ từ & hàng đợi ôn (nếu bật autoSave, chưa bấm Bỏ lưu trong lần mở này)
  useEffect(() => {
    if (!enabled || !autoSave || !resolvedMeaning) return;
    if (autoSavedRef.current === key || dismissedRef.current === key) return;
    autoSavedRef.current = key;
    const wasNew = !saved;
    void onSaveRef.current(resolvedMeaning, { silent: true }).then(() => {
      if (wasNew) setAutoSavedKey(key);
    });
  }, [enabled, autoSave, resolvedMeaning, key, saved]);

  const speak = (text: string, slow = false) => {
    setSpeaking(text);
    void speakGerman(text, { slow, onEnd: () => setSpeaking((s) => (s === text ? null : s)) });
  };
  const speakProps = (text: string) => holdable(() => speak(text), () => speak(text, true));

  // Vừa mở từ → đọc từ đó luôn; đóng / unmount → dừng đọc
  useEffect(() => {
    if (!word) return;
    setSpeaking(word); // eslint-disable-line react-hooks/set-state-in-effect -- trạng thái loa đi cùng lệnh đọc
    void speakGerman(word, { onEnd: () => setSpeaking((s) => (s === word ? null : s)) });
    return () => stopSpeaking();
  }, [word]);

  const close = () => {
    stopSpeaking();
    onClose();
  };
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(panel, !!word);
  // Esc để đóng
  useEffect(() => {
    if (!word) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Có hộp khác mở đè lên (vd. LoginDialog) → để Esc đóng hộp trên cùng trước
        const modals = document.querySelectorAll('[aria-modal="true"]');
        if (modals.length && modals[modals.length - 1] !== panel.current) return;
        e.stopPropagation();
        stopSpeaking();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    // Khoá cuộn trang phía sau (điện thoại: vuốt trong bảng không kéo theo trang)
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
    };
  }, [word, onClose]);

  if (!word) return null;

  /** Chưa lưu → lưu (kèm nghĩa AI vừa giải thích); đã lưu → bỏ lưu (và không tự lưu lại trong lần mở này) */
  const save = async () => {
    setSaving(true);
    try {
      if (saved) {
        dismissedRef.current = key;
        setAutoSavedKey(null);
        await onRemove();
      } else {
        dismissedRef.current = null;
        await onSave(resolvedMeaning ?? "");
      }
    } finally {
      setSaving(false);
    }
  };
  const retry = () => setAttempt((a) => a + 1);
  const d = detail.data;
  const justAutoSaved = saved && autoSavedKey === key;
  const exampleCount = (context ? 1 : 0) + (extraExamples?.length ?? 0) + (d?.examples.length ?? 0);
  const showLemmaSpeak = !!d?.lemma && d.lemma.toLowerCase() !== word.toLowerCase();

  const onTabKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next: TabKey = tab === "explain" ? "examples" : "explain";
      setTab(next);
      e.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
    }
  };

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={word}
        data-sec="de"
        className="dialog word-sheet max-w-[640px] gap-0 overflow-hidden p-0 outline-none sm:p-0 md:max-h-[82vh]"
      >
        {/* Từ + phiên âm IPA + loa + đóng, nghĩa theo ngữ cảnh ngay bên dưới */}
        <div className="flex flex-col gap-1 border-b border-line px-5 pt-2 pb-3 md:pt-4">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h2 className="truncate font-display text-2xl leading-tight font-extrabold tracking-tight sm:text-[26px]">{word}</h2>
              {!!d?.ipa && <span className="font-mono text-sm font-medium text-muted select-text">{d.ipa}</span>}
            </div>
            {saved && (
              <span className="badge badge-ok shrink-0">
                <Bookmark className="size-3 fill-current" /> {justAutoSaved ? "Đã tự lưu" : "Đã lưu"}
              </span>
            )}
            <button
              {...speakProps(word)}
              title="Nghe phát âm (giữ hoặc Shift + bấm để nghe chậm)"
              aria-label="Nghe phát âm"
              className={`btn-icon press rounded-full ${speaking === word ? "bg-accent text-on-accent" : "tint-accent"}`}
            >
              <Volume2 className="size-[18px]" />
            </button>
            <button onClick={close} title="Đóng (Esc)" aria-label="Đóng" className="btn-icon -mr-2 text-muted hover:text-foreground">
              <X className="size-5" />
            </button>
          </div>
          {loggedIn &&
            (resolvedMeaning ? (
              <p className="text-[17px] leading-6 font-semibold select-text">{resolvedMeaning}</p>
            ) : meaning.error ? (
              <ErrorRow text={meaning.error} onRetry={retry} />
            ) : (
              <Skeleton widths={["55%"]} height="h-[18px]" />
            ))}
        </div>

        {!loggedIn ? (
          <div className="surface m-5 mb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2.5 font-bold">
              <span className="icon-bubble tint-accent size-8 rounded-xl">
                <Lock className="size-4" />
              </span>
              Xem nghĩa của từ
            </div>
            <p className="text-sm leading-5 text-muted">Đăng nhập hoặc đăng ký miễn phí để xem nghĩa của từ trong câu và lưu từ vựng.</p>
            <LoginLink href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-primary self-start">
              Đăng nhập / Đăng ký
            </LoginLink>
          </div>
        ) : (
          <>
            {/* Tab: Giải thích hiển thị trước */}
            <div role="tablist" aria-label="Nội dung tra từ" onKeyDown={onTabKeyDown} className="tabs-line shrink-0 px-3">
              {(
                [
                  ["explain", "Giải thích", null],
                  ["examples", "Ví dụ", exampleCount > 0 ? exampleCount : null],
                ] as const
              ).map(([k, label, count]) => (
                <button
                  key={k}
                  role="tab"
                  data-tab={k}
                  aria-selected={tab === k}
                  tabIndex={tab === k ? 0 : -1}
                  onClick={() => setTab(k)}
                  className="tab min-h-10 text-[15px]"
                >
                  <span>{label}</span>
                  {count !== null && <span className="font-mono text-xs text-muted">{count}</span>}
                </button>
              ))}
            </div>

            <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain px-5 py-3.5">
              {tab === "explain" ? (
                d ? (
                  <div className="flex flex-col gap-3.5">
                    {/* Dạng từ điển + loại từ + ngữ pháp gom gọn 1 khối (không lặp IPA đã có ở đầu bảng) */}
                    {(!!d.lemma || !!d.pos || !!d.grammar) && (
                      <div className="word-meta">
                        <div className="flex flex-wrap items-center gap-2">
                          {!!d.lemma &&
                            (showLemmaSpeak ? (
                              <button
                                {...speakProps(d.lemma)}
                                title="Bấm để nghe dạng từ điển · giữ để nghe chậm"
                                className={`press inline-flex cursor-pointer items-center gap-1.5 rounded-md font-display text-[17px] leading-snug font-extrabold transition hover:text-accent-text ${speaking === d.lemma ? "text-accent-text" : ""}`}
                              >
                                <span>{d.lemma}</span>
                                <Volume2 className="size-3.5 shrink-0 text-accent-text" />
                              </button>
                            ) : (
                              <span className="font-display text-[17px] leading-snug font-extrabold">{d.lemma}</span>
                            ))}
                          {!!d.pos && <span className="badge">{d.pos}</span>}
                        </div>
                        {!!d.grammar && <p className="text-[13px] leading-5 font-medium text-muted select-text">{d.grammar}</p>}
                      </div>
                    )}

                    {/* Giải thích ngữ cảnh lên đầu để đọc ngay khi bấm từ */}
                    {!!d.explanation && <Rich text={d.explanation} className="text-[15px] leading-[23px] whitespace-pre-line" />}

                    {/* Các nghĩa phổ biến của từ gốc (kiểu từ điển): nghĩa · cấu trúc dùng · ví dụ (bấm nghe) */}
                    {!!d.senses?.length && (
                      <Section title="Các nghĩa thường gặp">
                        {d.senses.map((s, i) => {
                          const spoken = plain(s.de);
                          const isPlaying = speaking === spoken;
                          return (
                            <div key={i} className="word-sense" data-current={s.current || undefined} data-playing={isPlaying || undefined}>
                              <div className="flex items-center gap-2">
                                <span className="flex-1 text-[15px] font-bold">
                                  {i + 1}. {s.meaning}
                                </span>
                                {s.current && <span className="badge badge-accent">Trong câu này</span>}
                              </div>
                              {!!s.use && <Rich text={s.use} className="text-[13px] font-semibold text-muted" />}
                              <button
                                {...speakProps(spoken)}
                                className="press -mx-1.5 flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 text-left transition hover:bg-card-2/70"
                                title="Bấm để nghe · giữ để nghe chậm"
                              >
                                <span
                                  className={`icon-bubble mt-0.5 size-6 shrink-0 rounded-full ${isPlaying ? "bg-accent text-on-accent" : "tint-accent"}`}
                                >
                                  {isPlaying ? <Volume2 className="size-3" /> : <Play className="size-2.5 translate-x-px fill-current" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <Rich text={s.de} className="text-[15px] leading-[22px]" />
                                  {!!s.tr && <span className="block text-sm leading-5 text-muted">{s.tr}</span>}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </Section>
                    )}

                    {/* Mẹo nhớ + từ đi kèm → nghĩa */}
                    {(!!d.tip || !!d.cues?.length) && (
                      <div className="word-tip text-[15px] leading-[22px]">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-amber">
                          <Lightbulb className="size-4 shrink-0" /> Mẹo nhớ
                        </span>
                        {!!d.tip && <p>{d.tip}</p>}
                        {d.cues?.map((c, i) => (
                          <p key={i} className="text-sm leading-5">
                            <i className="font-semibold text-foreground">{c.cue}</i>
                            <span className="text-muted"> → {c.meaning}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Từ đồng nghĩa (bấm để nghe phát âm) */}
                    {!!d.synonyms?.length && (
                      <Section title="Từ đồng nghĩa">
                        <div className="flex flex-wrap gap-2">
                          {d.synonyms.map((s, i) => (
                            <button
                              key={i}
                              {...speakProps(s.word)}
                              title="Bấm để nghe phát âm · giữ để nghe chậm"
                              className={`surface press inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-left text-sm transition ${speaking === s.word ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong"}`}
                            >
                              <Volume2 className="size-3.5 shrink-0 text-accent-text" />
                              <b className="font-bold">{s.word}</b>
                              {!!s.note && <span className="text-xs text-muted">· {s.note}</span>}
                            </button>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Phân biệt các dạng quan trọng */}
                    {!!d.forms?.length && (
                      <Section title="Phân biệt các dạng">
                        <ul className="flex flex-col gap-1.5">
                          {d.forms.map((f, i) => (
                            <li key={i} className="flex gap-2 text-[15px] leading-[22px]">
                              <span className="text-muted">•</span>
                              <span>
                                <b className="font-bold">{f.form}</b>
                                {!!f.note && <span className="text-muted">: {f.note}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {/* Câu hay gặp với từ này (bấm để nghe) */}
                    {!!d.idiom && (
                      <button
                        {...speakProps(d.idiom.de)}
                        data-playing={speaking === d.idiom.de || undefined}
                        title="Bấm để nghe · giữ để nghe chậm"
                        className="word-sense press cursor-pointer text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="label">Câu hay gặp</span>
                          <Volume2 className="size-3.5 shrink-0 text-accent-text" />
                        </div>
                        <span className="font-bold">„{d.idiom.de}“</span>
                        {!!d.idiom.note && <span className="text-sm leading-5 text-muted">{d.idiom.note}</span>}
                      </button>
                    )}
                  </div>
                ) : detail.error ? (
                  <ErrorRow text={detail.error} onRetry={retry} />
                ) : (
                  <ExplainSkeleton />
                )
              ) : (
                <>
                  {/* Câu trong video */}
                  {!!context && (
                    <ExampleRow
                      label="Trong video"
                      source="video"
                      de={markWord(context, word, marks)}
                      playing={speaking === context}
                      {...speakProps(context)}
                    />
                  )}
                  {/* Các câu khác đã gặp từ này trong nhiều bài học */}
                  {!!extraExamples?.length &&
                    extraExamples.map((ex, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <ExampleRow
                          label={ex.sourceTitle || "Trong bài học khác"}
                          de={markWord(ex.context, word)}
                          playing={speaking === ex.context}
                          {...speakProps(ex.context)}
                        />
                        {ex.sourceUrl && (
                          <Link
                            href={ex.sourceUrl}
                            onClick={close}
                            className="ml-10 inline-flex items-center gap-1 self-start text-xs font-bold text-link hover:underline"
                          >
                            <ExternalLink className="size-3" /> Mở bài học
                          </Link>
                        )}
                      </div>
                    ))}
                  {d ? (
                    d.examples.map((ex, i) => (
                      <ExampleRow key={i} de={ex.de} tr={ex.tr} playing={speaking === plain(ex.de)} {...speakProps(plain(ex.de))} />
                    ))
                  ) : detail.error ? (
                    <ErrorRow text={detail.error} onRetry={retry} />
                  ) : (
                    <Skeleton widths={["90%", "60%", "80%", "50%"]} height="h-3.5" />
                  )}
                </>
              )}
            </div>

            {/* Lưu từ + công tắc tự lưu vào hàng đợi ôn (khi mở trong bài học) */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-line px-5 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {onAutoSaveChange && (
                <label className="check cursor-pointer justify-between text-xs font-semibold text-muted">
                  <span>Tự lưu từ đã tra vào sổ ôn tập</span>
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => onAutoSaveChange(e.target.checked)}
                    className="size-4 accent-accent"
                  />
                </label>
              )}
              <button onClick={save} disabled={saving} className={`btn btn-block min-h-11 font-bold ${saved ? "" : "btn-primary"}`}>
                {saving ? (
                  <Loader2 className="size-[17px] animate-spin" />
                ) : saved ? (
                  <BookmarkMinus className="size-[17px]" />
                ) : (
                  <Bookmark className="size-[17px] fill-current" />
                )}
                {saved ? "Bỏ lưu khỏi sổ ôn" : "Lưu vào sổ từ vựng"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** "Câu có **từ** cần học" → bỏ dấu ** để đọc */
const plain = (s: string) => s.replace(/\*\*/g, "");

/** Bọc từ đang xem (hoặc các phần của cụm từ) trong câu gốc bằng ** để tô sáng như ví dụ AI */
function markWord(sentence: string, word: string, parts?: string[]) {
  const ranges = parts && locatePhrase(sentence, parts);
  if (ranges) {
    let out = sentence;
    for (const [s, e] of [...ranges].sort((a, b) => b[0] - a[0])) out = `${out.slice(0, s)}**${out.slice(s, e)}**${out.slice(e)}`;
    return out;
  }
  const i = sentence.toLowerCase().indexOf(word.toLowerCase());
  return i < 0 ? sentence : `${sentence.slice(0, i)}**${sentence.slice(i, i + word.length)}**${sentence.slice(i + word.length)}`;
}

/** Hiện chữ, phần **…** tô vàng đậm */
function Rich({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`block ${className ?? ""}`}>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
        i % 2 ? (
          <b key={i} className="font-extrabold text-amber">
            {part}
          </b>
        ) : (
          part
        ),
      )}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label">{title}</span>
      {children}
    </div>
  );
}

/** 1 ví dụ: ▶ câu tiếng Đức (từ cần học tô vàng) + bản dịch; bấm để nghe, giữ để nghe chậm */
function ExampleRow({
  label,
  source,
  de,
  tr,
  playing,
  ...press
}: { label?: string; source?: "video"; de: string; tr?: string; playing: boolean } & ReturnType<typeof holdable>) {
  return (
    <button
      {...press}
      className="word-example press"
      data-source={source}
      data-playing={playing || undefined}
      title="Bấm để nghe · giữ để nghe chậm"
    >
      <span className={`icon-bubble size-7 shrink-0 rounded-full ${playing ? "bg-accent text-on-accent" : "tint-accent"} ${label ? "mt-[18px]" : ""}`}>
        {playing ? <Volume2 className="size-3.5" /> : <Play className="size-3 translate-x-px fill-current" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {!!label && <span className="label text-[11px]">{label}</span>}
        <Rich text={de} className="leading-[22px] font-semibold" />
        {!!tr && <span className="text-sm leading-5 text-muted">{tr}</span>}
      </span>
    </button>
  );
}

function Skeleton({ widths, height }: { widths: string[]; height: string }) {
  return (
    <div className="flex flex-col gap-2 py-0.5">
      {widths.map((w, i) => (
        <div key={i} className={`${height} skeleton rounded-md`} style={{ width: w }} />
      ))}
    </div>
  );
}

function ExplainSkeleton() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="word-meta">
        <div className="flex items-center gap-2">
          <div className="h-5 w-36 skeleton rounded-md" />
          <div className="h-5 w-16 skeleton rounded-md" />
        </div>
        <div className="h-3.5 w-3/4 skeleton rounded-md" />
      </div>
      <Skeleton widths={["96%", "84%"]} height="h-3.5" />
      <div className="word-sense gap-2">
        <div className="h-4 w-44 skeleton rounded-md" />
        <div className="h-3.5 w-full skeleton rounded-md" />
        <div className="h-3.5 w-2/3 skeleton rounded-md" />
      </div>
    </div>
  );
}

function ErrorRow({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div role="alert" className="alert alert-err items-center">
      <span className="flex-1">{text}</span>
      <button onClick={onRetry} className="btn btn-sm shrink-0">
        Thử lại
      </button>
    </div>
  );
}
