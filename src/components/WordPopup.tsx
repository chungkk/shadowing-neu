"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { LoginLink } from "@/components/LoginDialog";
import { usePathname } from "next/navigation";
import { Bookmark, BookmarkMinus, Loader2, Lock, Play, Volume2, X } from "lucide-react";
import { locatePhrase } from "@/lib/phrase-match";
import { clientApi } from "@/lib/client-api";
import { speakGerman, stopSpeaking } from "@/lib/speak";

/** Nghĩa 1 từ theo ngữ cảnh câu (POST /word) */
type WordInfo = { word: string; meaning: string };
/** Tab Ví dụ / Giải thích (POST /word { detail: true }); từ cần học trong ví dụ được bọc **…** */
type WordDetail = {
  lemma: string;
  pos: string;
  grammar: string;
  explanation: string;
  examples: { de: string; tr: string }[];
  senses?: { meaning: string; use: string; de: string; tr: string; current: boolean }[];
  forms?: { form: string; note: string }[];
  tip?: string;
  cues?: { cue: string; meaning: string }[];
  idiom?: { de: string; note: string } | null;
};

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
  loggedIn,
  saved,
  onSave,
  onRemove,
  onClose,
}: {
  word: string | null;
  context: string;
  marks?: string[]; // mở từ cụm từ: các phần của cụm trong câu để tô sáng
  loggedIn: boolean;
  saved: boolean;
  onSave: (meaning: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"examples" | "explain">("examples");
  const [speaking, setSpeaking] = useState<string | null>(null);

  const key = `${LANG}|${word}|${context}`;
  const enabled = !!word && loggedIn;
  const meaning = useWordApi(meanings, key, enabled, { word, context, lang: LANG }, attempt, isMeaning);
  const detail = useWordApi(details, key, enabled, { word, context, lang: LANG, detail: true }, attempt, isDetail);

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
  // Esc để đóng
  useEffect(() => {
    if (!word) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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

  /** Chưa lưu → lưu (kèm nghĩa AI vừa giải thích); đã lưu → bỏ lưu */
  const save = async () => {
    setSaving(true);
    try {
      if (saved) await onRemove();
      else await onSave(meaning.data?.meaning ?? "");
    } finally {
      setSaving(false);
    }
  };
  const retry = () => setAttempt((a) => a + 1);
  const d = detail.data;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={word}>
      <button className="sheet-fade absolute inset-0 cursor-default bg-black/55" onClick={close} aria-label="Đóng" />
      <div className="sheet-up relative flex max-h-[88dvh] w-full max-w-[640px] flex-col rounded-t-[28px] border-t border-border bg-card md:max-h-[80vh] md:rounded-[28px] md:border">
        <div className="mx-auto mt-2 h-1.5 w-9 rounded-full bg-border md:hidden" />

        {/* Từ + loa + đóng, nghĩa ngay bên dưới */}
        <div className="flex flex-col gap-1.5 border-b border-border px-5 pt-3 pb-3.5 md:pt-5">
          <div className="flex items-center gap-2.5">
            <h2 className="min-w-0 flex-1 truncate text-2xl font-extrabold tracking-tight text-amber sm:text-[28px]">{word}</h2>
            {saved && <span className="rounded-md bg-amber/15 px-2 py-0.5 text-xs font-bold text-amber">Đã lưu</span>}
            <button
              {...speakProps(word)}
              title="Nghe phát âm (giữ hoặc Shift + bấm để nghe chậm)"
              className={`press inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-90 ${
                speaking === word ? "bg-accent text-white" : "bg-accent/15 text-accent"
              }`}
            >
              <Volume2 className="size-4" />
            </button>
            <button onClick={close} title="Đóng (Esc)" className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-card-2 text-muted hover:text-foreground">
              <X className="size-3.5" strokeWidth={3} />
            </button>
          </div>
          {loggedIn &&
            (meaning.data ? (
              <p className="text-lg leading-6 font-semibold select-text">{meaning.data.meaning}</p>
            ) : meaning.error ? (
              <ErrorRow text={meaning.error} onRetry={retry} />
            ) : (
              <Skeleton widths={["55%"]} height="h-[18px]" />
            ))}
        </div>

        {!loggedIn ? (
          <div className="m-5 mb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-3 rounded-[18px] bg-card-2 p-4">
            <div className="flex items-center gap-2 font-extrabold">
              <Lock className="size-3.5 text-amber" /> Xem nghĩa của từ
            </div>
            <p className="text-sm leading-5 text-muted">Đăng nhập hoặc đăng ký miễn phí để xem nghĩa của từ trong câu và lưu từ vựng.</p>
            <LoginLink href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-primary self-start">
              Đăng nhập / Đăng ký
            </LoginLink>
          </div>
        ) : (
          <>
            {/* Tab */}
            <div className="flex gap-5 border-b border-border px-5">
              {(
                [
                  ["examples", "Ví dụ"],
                  ["explain", "Giải thích"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`-mb-px cursor-pointer border-b-2 py-2.5 text-[15px] font-bold transition ${
                    tab === k ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain px-5 py-3.5">
              {tab === "examples" ? (
                <>
                  {/* Câu trong video */}
                  {!!context && (
                    <ExampleRow label="TRONG VIDEO" de={markWord(context, word, marks)} playing={speaking === context} {...speakProps(context)} />
                  )}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-extrabold">{d.lemma}</span>
                    {!!d.pos && <span className="rounded-md bg-card-2 px-2 py-0.5 text-xs font-bold text-muted">{d.pos}</span>}
                  </div>
                  {!!d.grammar && <p className="rounded-[10px] bg-background p-2.5 text-sm leading-5 text-amber">{d.grammar}</p>}
                  {/* Các nghĩa phổ biến của từ gốc (kiểu từ điển): nghĩa · cấu trúc dùng · ví dụ */}
                  {!!d.senses?.length && (
                    <Section title="Các nghĩa thường gặp">
                      {d.senses.map((s, i) => (
                        <div
                          key={i}
                          className={`flex flex-col gap-1 rounded-xl border p-3 ${s.current ? "border-accent/40 bg-accent/10" : "border-border bg-background"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex-1 font-bold">
                              {i + 1}. {s.meaning}
                            </span>
                            {s.current && <span className="text-[11px] font-bold text-accent">Trong câu này</span>}
                          </div>
                          {!!s.use && <Rich text={s.use} className="text-sm font-semibold text-amber" />}
                          <button {...speakProps(plain(s.de))} className="press cursor-pointer text-left hover:opacity-80" title="Bấm để nghe · giữ để nghe chậm">
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
                    <div className="flex flex-col gap-2 rounded-xl border border-amber/30 bg-amber/[0.08] p-3 text-[15px] leading-[22px]">
                      <span className="text-sm font-bold text-amber">💡 Mẹo nhớ</span>
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
                    <button {...speakProps(d.idiom.de)} className="press flex cursor-pointer flex-col gap-1 rounded-xl border border-border bg-background p-3 text-left hover:border-accent/50">
                      <span className="text-xs font-bold tracking-wider text-muted uppercase">Câu hay gặp</span>
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

            {/* Lưu từ: chưa lưu → nút chính; đã lưu → Bỏ lưu (nút trung tính) */}
            <div className="px-5 pt-1.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                onClick={save}
                disabled={saving}
                className={`flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-base font-bold transition active:scale-[0.98] disabled:opacity-70 ${
                  saved ? "border border-border bg-card-2" : "bg-accent text-white hover:brightness-110"
                }`}
              >
                {saving ? (
                  <Loader2 className="size-[17px] animate-spin" />
                ) : saved ? (
                  <BookmarkMinus className="size-[17px]" />
                ) : (
                  <Bookmark className="size-[17px] fill-current" />
                )}
                {saved ? "Bỏ lưu" : "Lưu vào sổ từ vựng"}
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
      <span className="text-xs font-bold tracking-wider text-muted uppercase">{title}</span>
      {children}
    </div>
  );
}

/** 1 ví dụ: ▶ câu tiếng Đức (từ cần học tô vàng) + bản dịch; bấm để nghe, giữ để nghe chậm */
function ExampleRow({ label, de, tr, playing, ...press }: { label?: string; de: string; tr?: string; playing: boolean } & ReturnType<typeof holdable>) {
  return (
    <button {...press} className="press flex cursor-pointer gap-2.5 text-left transition hover:opacity-80 active:opacity-60" title="Bấm để nghe · giữ để nghe chậm">
      <span className={label ? "pt-[22px]" : "pt-1"}>
        {playing ? <Volume2 className="size-3.5 text-accent" /> : <Play className="size-3 fill-accent text-accent" />}
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        {!!label && <span className="text-[11px] font-extrabold tracking-wider text-muted">{label}</span>}
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
        <div key={i} className={`${height} animate-pulse rounded-md bg-foreground/[0.08]`} style={{ width: w }} />
      ))}
    </div>
  );
}

function ErrorRow({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-red-400">{text}</span>
      <button onClick={onRetry} className="cursor-pointer font-extrabold text-accent hover:underline">
        Thử lại
      </button>
    </div>
  );
}
