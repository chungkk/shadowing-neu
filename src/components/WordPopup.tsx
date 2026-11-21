"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { LoginLink } from "@/components/auth/LoginDialog";
import { usePathname } from "next/navigation";
import { Bookmark, BookmarkMinus, ExternalLink, Loader2, Lock, Play, Volume2, X, Lightbulb } from "lucide-react";
import { locatePhrase } from "@/lib/phrase-match";
import { clientApi } from "@/lib/client-api";
import { speakGerman, stopSpeaking } from "@/lib/speak";

/** Nghĩa 1 từ theo ngữ cảnh câu (POST /word) */
type WordInfo = { word: string; meaning: string };
/** Tab Ví dụ / Giải thích (POST /word { detail: true }); từ cần học trong ví dụ được bọc **…** */
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

const LANG = "vi"; // giao diện web chỉ có tiếng Việt
const UNAVAILABLE = "Chưa có dữ liệu cho từ này, thử lại sau.";

// Kết quả đã hỏi trong lần mở trang này (từ + câu) → mở lại không phải chờ
const meanings = new Map<string, WordInfo>();
const details = new Map<string, WordDetail>();

const isMeaning = (x: unknown): x is WordInfo => typeof (x as WordInfo)?.meaning === "string";
const isDetail = (x: unknown): x is WordDetail =>
  Array.isArray((x as WordDetail)?.examples) && typeof (x as WordDetail).explanation === "string";

/** Gọi API 1 lần cho mỗi khoá, có cache + nút thử lại. Dữ liệu sai dạng → báo lỗi, không crash */
function useWordApi<T>(cache: Map<string, T>, key: string, enabled: boolean, body: object, attempt: number, valid: (x: unknown) => x is T) {
  const [res, setRes] = useState<{ key: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (!enabled || cache.has(key)) return;
    let alive = true;
    clientApi<unknown>("/word", { method: "POST", body })
      .then((data) => {
        if (!valid(data)) throw new Error(UNAVAILABLE);
        cache.set(key, data);
        if (alive) setRes({ key, data });
      })
      .catch((e: Error) => alive && setRes({ key, error: e.message }));
    return () => {
      alive = false;
    };
    // body dựng lại mỗi lần render; key đã gồm đủ nội dung của body
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, key, enabled, attempt]);
  const data = cache.get(key) ?? (res?.key === key ? res.data : undefined);
  return { data, error: !data && res?.key === key ? res.error : undefined };
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
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
    onClick: (e: MouseEvent) => {
      if (held) return;
      if (e.shiftKey) hold();
      else tap();
    },
  };
}

/**
 * Bảng tra từ (bản web của mobile/src/components/WordSheet.tsx): từ + loa, nghĩa theo ngữ cảnh ngay bên dưới;
 * tab Ví dụ (câu trong video + ví dụ AI, bấm để nghe) / Giải thích (dạng từ điển, ngữ pháp, mẹo nhớ…); nút lưu vào sổ từ.
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
  const [tab, setTab] = useState<"examples" | "explain">("examples");
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [autoSavedKey, setAutoSavedKey] = useState<string | null>(null);
  const autoSavedRef = useRef<string | null>(null);
  const dismissedRef = useRef<string | null>(null);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const key = `${LANG}|${word}|${context}`;
  const enabled = !!word && loggedIn;
  const meaning = useWordApi(meanings, key, enabled && !initialMeaning, { word, context, lang: LANG }, attempt, isMeaning);
  const detail = useWordApi(details, key, enabled, { word, context, lang: LANG, detail: true }, attempt, isDetail);
  const resolvedMeaning = initialMeaning || meaning.data?.meaning;

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

  // Vừa mở từ → đọc từ đó luôn
  useEffect(() => {
    if (!word) return;
    setSpeaking(word); // eslint-disable-line react-hooks/set-state-in-effect -- trạng thái loa đi cùng lệnh đọc
    void speakGerman(word, { onEnd: () => setSpeaking((s) => (s === word ? null : s)) });
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

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={word}
        data-sec="de" className="dialog word-sheet max-w-[640px] gap-0 overflow-hidden p-0 outline-none sm:p-0 md:max-h-[80vh]"
      >
        {/* Từ + phiên âm IPA + loa + đóng, nghĩa ngay bên dưới */}
        <div className="flex flex-col gap-1.5 border-b border-line px-5 pt-2 pb-3.5 md:pt-5">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h2 className="truncate font-display text-2xl leading-tight font-extrabold tracking-tight sm:text-[28px]">{word}</h2>
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
              <p className="text-lg leading-6 font-semibold select-text">{resolvedMeaning}</p>
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
            {/* Tab */}
            <div role="tablist" aria-label="Nội dung tra từ" className="tabs-line shrink-0 px-3">
              {(
                [
                  ["examples", "Ví dụ"],
                  ["explain", "Giải thích"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="tab min-h-11 text-[15px]">
                  {label}
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain px-5 py-3.5">
              {tab === "examples" ? (
                <>
                  {/* Câu trong video */}
                  {!!context && (
                    <ExampleRow label="Trong video" de={markWord(context, word, marks)} playing={speaking === context} {...speakProps(context)} />
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
                    d.examples.map((ex, i) => <ExampleRow key={i} de={ex.de} tr={ex.tr} playing={speaking === plain(ex.de)} {...speakProps(plain(ex.de))} />)
                  ) : detail.error ? (
                    <ErrorRow text={detail.error} onRetry={retry} />
                  ) : (
                    <Skeleton widths={["90%", "60%", "80%", "50%"]} height="h-3.5" />
                  )}
                </>
              ) : d ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-lg font-extrabold">{d.lemma}</span>
                    {!!d.ipa && <span className="font-mono text-sm text-muted select-text">{d.ipa}</span>}
                    {!!d.pos && <span className="badge">{d.pos}</span>}
                  </div>
                  {!!d.grammar && <p className="surface p-2.5 text-sm leading-5 font-semibold">{d.grammar}</p>}
                  {/* Từ đồng nghĩa (bấm để nghe phát âm) */}
                  {!!d.synonyms?.length && (
                    <Section title="Từ đồng nghĩa">
                      <div className="flex flex-wrap gap-2">
                        {d.synonyms.map((s, i) => (
                          <button
                            key={i}
                            {...speakProps(s.word)}
                            title="Bấm để nghe phát âm · giữ để nghe chậm"
                            className={`surface press inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-left text-sm transition ${speaking === s.word ? "border-accent bg-accent-soft" : "hover:border-line-strong"}`}
                          >
                            <Volume2 className="size-3.5 shrink-0 text-accent-text" />
                            <b className="font-bold">{s.word}</b>
                            {!!s.note && <span className="text-xs text-muted">· {s.note}</span>}
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}
                  {/* Các nghĩa phổ biến của từ gốc (kiểu từ điển): nghĩa · cấu trúc dùng · ví dụ */}
                  {!!d.senses?.length && (
                    <Section title="Các nghĩa thường gặp">
                      {d.senses.map((s, i) => (
                        <div key={i} className="word-sense" data-current={s.current || undefined}>
                          <div className="flex items-center gap-2">
                            <span className="flex-1 font-bold">
                              {i + 1}. {s.meaning}
                            </span>
                            {s.current && <span className="badge badge-accent">Trong câu này</span>}
                          </div>
                          {!!s.use && <Rich text={s.use} className="text-sm font-semibold text-muted" />}
                          <button {...speakProps(plain(s.de))} className="press cursor-pointer rounded-lg text-left hover:opacity-80" title="Bấm để nghe · giữ để nghe chậm">
                            <Rich text={s.de} className="text-[15px] leading-[22px]" />
                            {!!s.tr && <span className="block text-sm leading-5 text-muted">{s.tr}</span>}
                          </button>
                        </div>
                      ))}
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
                              <b>{f.form}</b>
                              {!!f.note && <span className="text-muted">: {f.note}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                  {/* 💡 Mẹo nhớ + từ đi kèm → nghĩa */}
                  {(!!d.tip || !!d.cues?.length) && (
                    <div className="surface flex flex-col gap-2 text-[15px] leading-[22px]">
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        <Lightbulb className="size-4 text-amber" /> Mẹo nhớ
                      </span>
                      {!!d.tip && <p>{d.tip}</p>}
                      {d.cues?.map((c, i) => (
                        <p key={i}>
                          <i className="font-semibold">{c.cue}</i>
                          <span className="text-muted"> → {c.meaning}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {/* Câu hay gặp với từ này (bấm để nghe) */}
                  {!!d.idiom && (
                    <button {...speakProps(d.idiom.de)} className="word-sense press cursor-pointer text-left">
                      <span className="label">Câu hay gặp</span>
                      <span className="font-bold">„{d.idiom.de}“</span>
                      {!!d.idiom.note && <span className="text-sm leading-5 text-muted">{d.idiom.note}</span>}
                    </button>
                  )}
                  <Rich text={d.explanation} className="text-[15px] leading-[23px] whitespace-pre-line" />
                </div>
              ) : detail.error ? (
                <ErrorRow text={detail.error} onRetry={retry} />
              ) : (
                <Skeleton widths={["40%", "95%", "85%", "70%"]} height="h-3.5" />
              )}
            </div>

            {/* Lưu từ + công tắc tự lưu vào hàng đợi ôn (khi mở trong bài học) */}
            <div className="flex shrink-0 flex-col gap-2.5 border-t border-line px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
              <button onClick={save} disabled={saving} className={`btn btn-lg btn-block ${saved ? "" : "btn-primary"}`}>
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
    <div className="flex flex-col gap-2.5">
      <span className="label">{title}</span>
      {children}
    </div>
  );
}

/** 1 ví dụ: ▶ câu tiếng Đức (từ cần học tô vàng) + bản dịch; bấm để nghe, giữ để nghe chậm */
function ExampleRow({ label, de, tr, playing, ...press }: { label?: string; de: string; tr?: string; playing: boolean } & ReturnType<typeof holdable>) {
  return (
    <button {...press} className="word-example press" data-playing={playing || undefined} title="Bấm để nghe · giữ để nghe chậm">
      <span className={`icon-bubble size-7 rounded-full ${playing ? "bg-accent text-on-accent" : "tint-accent"} ${label ? "mt-[18px]" : ""}`}>
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
