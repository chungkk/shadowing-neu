"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Brain,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { addOwnWord, aiMeaning, aiMeaningFor, removeWord, setWordMeaning } from "@/app/(app)/account-actions";
import type { VocabExample, VocabItem } from "@/lib/db";
import { clientApi } from "@/lib/client-api";
import { isPhrase, spokenWord } from "@/lib/review";
import { speakGerman } from "@/lib/speak";
import { isDue, stageInfo } from "@/lib/srs";
import VocabReview from "./VocabReview";
import WordPopup from "./WordPopup";

const noop = () => () => {};
/** true sau khi chạy trên trình duyệt (server render dùng ngày UTC để khỏi lệch hydrate) */
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

/** Giờ hiện tại (làm tròn phút để giá trị ổn định giữa các lần vẽ); server → null */
const useNow = () => useSyncExternalStore(noop, () => Math.floor(Date.now() / 60_000) * 60_000, () => null);

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** created_at là UTC "YYYY-MM-DD HH:MM:SS" → ngày theo giờ máy người dùng */
function dayKey(createdAt: string, local: boolean) {
  const d = new Date(createdAt.replace(" ", "T") + "Z");
  return local && !isNaN(d.getTime()) ? ymd(d) : createdAt.slice(0, 10);
}

function dayLabel(key: string, local: boolean) {
  const [y, m, d] = key.split("-").map(Number);
  if (local) {
    const today = new Date();
    if (key === ymd(today)) return "Hôm nay";
    today.setDate(today.getDate() - 1);
    if (key === ymd(today)) return "Hôm qua";
  }
  const wd = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][new Date(y, m - 1, d).getDay()];
  return `${wd}, ${pad(d)}/${pad(m)}/${y}`;
}

/** Tô đậm từ trong câu ví dụ */
function Highlight({ text, word }: { text: string; word: string }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-gold-soft px-0.5 text-amber">{text.slice(i, i + word.length)}</mark>
      {text.slice(i + word.length)}
    </>
  );
}

const GENDER_BADGE: Record<"der" | "die" | "das", string> = {
  der: "badge-link",
  die: "badge-coral",
  das: "badge-ok",
};

type NounPatch = { gender: VocabItem["gender"]; singular: string; plural: string };
type Filter = "all" | "due" | "fresh" | "mastered";

function downloadCsv(items: VocabItem[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [
    "word,article,plural,meaning,context,source,more_examples",
    ...items.map((v) =>
      [
        v.word,
        v.gender === "der" || v.gender === "die" || v.gender === "das" ? v.gender : "",
        v.plural,
        v.meaning,
        v.context,
        v.sourceTitle,
        (v.examples ?? []).map((e) => e.context).join(" | "),
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
  Object.assign(document.createElement("a"), { href: url, download: "tu-vung.csv" }).click();
  URL.revokeObjectURL(url);
}

/** Mức nhớ + lần ôn tới ("ôn lại sau 3 ngày" / "đến hạn ôn") */
function Stage({ v, now }: { v: VocabItem; now: number | null }) {
  const info = stageInfo(v.stage);
  const label = info.label;
  // "Thuộc lâu" = đã thuộc → màu ok (xanh lá); accent giờ là xanh lam của hành động
  const color = v.stage >= 5 ? "text-ok-text" : info.color;
  let when = "";
  if (now != null && v.stage > 0 && v.dueAt != null) {
    const days = Math.ceil((v.dueAt - now) / 86_400_000);
    when = days <= 0 ? "đến hạn ôn" : days === 1 ? "ôn lại ngày mai" : `ôn lại sau ${days} ngày`;
  }
  return (
    <p className="text-xs text-muted">
      <span className={`inline-flex items-center gap-1 font-bold ${color}`}>
        <span aria-hidden className="size-1.5 rounded-full bg-current" /> {label}
      </span>
      {when && <span> · {when}</span>}
    </p>
  );
}

/**
 * 1 hàng trong danh sách. Điện thoại: từ + nút trên cùng, nghĩa và câu ví dụ xếp dưới.
 * Màn rộng: từ · nghĩa · câu ví dụ · nút nằm cùng 1 hàng.
 */
function VocabRow({
  v,
  now,
  speaking,
  onSpeak,
  onOpenDetail,
}: {
  v: VocabItem;
  now: number | null;
  speaking: string | null;
  onSpeak: (text: string, slow?: boolean) => void;
  onOpenDetail: (v: VocabItem, currentMeaning: string) => void;
}) {
  const [meaning, setMeaning] = useState(v.meaning);
  const [saved, setSaved] = useState(v.meaning);
  const [examples, setExamples] = useState<VocabExample[]>(v.examples ?? []);
  const [showMore, setShowMore] = useState(false);
  const [pending, start] = useTransition();
  const [aiPending, startAi] = useTransition();
  const [aiError, setAiError] = useState("");
  const save = () => {
    if (meaning.trim() === saved) return;
    start(async () => {
      await setWordMeaning(v.id, meaning);
      setSaved(meaning.trim());
    });
  };
  // Tự lưu khi ngừng gõ (không chỉ lúc rời ô — trên điện thoại có thể chuyển trang mà ô không kịp blur)
  useEffect(() => {
    if (meaning.trim() === saved) return;
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  });
  const ai = () =>
    startAi(async () => {
      setAiError("");
      const res = await aiMeaning(v.id);
      if ("error" in res) return setAiError(res.error);
      setMeaning(res.meaning);
      setSaved(res.meaning);
    });

  const removeExample = (exampleId: number) => {
    const prev = examples;
    setExamples((list) => list.filter((e) => e.id !== exampleId));
    clientApi(`/vocab/${v.id}/examples/${exampleId}`, { method: "DELETE" }).catch(() => setExamples(prev));
  };

  const article = v.gender === "der" || v.gender === "die" || v.gender === "das" ? v.gender : null;
  const wordAudio = spokenWord(v);

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-3 lg:grid-cols-[14rem_14rem_minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {article && <span className={`badge ${GENDER_BADGE[article]} px-1.5 py-0 text-[11px]`}>{article}</span>}
          <button
            type="button"
            onClick={() => onOpenDetail({ ...v, examples }, saved)}
            title="Xem phiên âm, đồng nghĩa, dạng từ và ví dụ"
            className="cursor-pointer text-left font-display text-lg leading-tight font-bold tracking-[-0.015em] wrap-anywhere transition-colors hover:text-accent-text"
          >
            {v.word}
          </button>
        </div>
        {article && v.plural && (
          <p className="mt-0.5 text-xs font-medium text-muted">
            Pl. <span className="text-foreground/80">die {v.plural}</span>
          </p>
        )}
        <Stage v={v} now={now} />
      </div>
      <div className="col-start-2 row-start-1 flex items-center text-muted lg:col-start-4">
        <button
          type="button"
          title="Nghe phát âm (Shift + bấm để nghe chậm)"
          aria-label={`Nghe phát âm ${wordAudio}`}
          className={`btn-icon size-8 ${speaking === wordAudio ? "text-accent-text" : "text-muted hover:text-accent-text"}`}
          onClick={(e) => onSpeak(wordAudio, e.shiftKey)}
        >
          <Volume2 className="size-4" />
        </button>
        <button type="button" title="Dịch nghĩa bằng AI" className="btn-icon size-8 text-muted hover:text-amber" onClick={ai} disabled={aiPending}>
          <Sparkles className={`size-4 ${aiPending ? "animate-pulse text-amber" : ""}`} />
        </button>
        <form action={removeWord.bind(null, v.id)} onSubmit={(e) => !confirm(`Xoá “${v.word}”?`) && e.preventDefault()}>
          <button title="Xoá" className="btn-icon size-8 text-muted hover:text-red-400">
            <Trash2 className="size-4" />
          </button>
        </form>
      </div>
      <div className="col-span-2 min-w-0 lg:col-span-1">
        {/* Ô nhập không viền — trông như chữ thường, rê chuột / bấm vào mới hiện khung */}
        <input
          className="-mx-2 w-[calc(100%+1rem)] rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-bold text-amber outline-none placeholder:font-normal placeholder:text-muted hover:border-line-strong focus:border-accent focus:bg-card md:text-sm"
          placeholder="+ Ghi nghĩa tiếng Việt…"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          maxLength={500}
        />
        {(pending || aiPending) && <p className="text-xs text-muted">{aiPending ? "AI đang dịch…" : "Đang lưu…"}</p>}
        {aiError && (
          <p role="alert" className="field-error">
            {aiError}
          </p>
        )}
      </div>
      <div className="col-span-2 flex min-w-0 flex-col gap-1 text-sm lg:col-span-1">
        {v.context && (
          <div className="flex items-start gap-1.5">
            <button
              type="button"
              title="Nghe câu ví dụ (Shift + bấm để nghe chậm)"
              aria-label="Nghe câu ví dụ"
              onClick={(e) => onSpeak(v.context, e.shiftKey)}
              className={`mt-0.5 shrink-0 cursor-pointer rounded p-0.5 transition-colors ${speaking === v.context ? "text-accent-text" : "text-muted hover:text-foreground"}`}
            >
              <Volume2 className="size-3.5" />
            </button>
            <p className="line-clamp-2 min-w-0 flex-1 leading-relaxed text-muted wrap-anywhere" title={v.context}>
              <Highlight text={v.context} word={v.word} />
            </p>
          </div>
        )}
        {v.sourceUrl ? (
          <Link href={v.sourceUrl} className="flex min-w-0 items-center gap-1 self-start text-xs font-bold text-link hover:underline">
            <ExternalLink className="size-3 shrink-0" /> <span className="truncate">{v.sourceTitle || "Mở bài"}</span>
          </Link>
        ) : (
          v.sourceTitle && <p className="truncate text-xs text-muted">{v.sourceTitle}</p>
        )}
        {examples.length > 0 && (
          <div className="mt-0.5 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setShowMore((s) => !s)}
              className="inline-flex cursor-pointer items-center gap-1 self-start text-xs font-bold text-muted hover:text-foreground"
            >
              {showMore ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {showMore ? "Thu gọn câu khác" : `+${examples.length} câu khác chứa từ này`}
            </button>
            {showMore && (
              <ul className="flex flex-col gap-1.5 border-l-2 border-line pl-2.5">
                {examples.map((ex) => (
                  <li key={ex.id} className="flex flex-col gap-0.5">
                    <div className="flex items-start gap-1.5">
                      <button
                        type="button"
                        title="Nghe câu này"
                        aria-label="Nghe câu ví dụ"
                        onClick={(e) => onSpeak(ex.context, e.shiftKey)}
                        className={`mt-0.5 shrink-0 cursor-pointer rounded p-0.5 ${speaking === ex.context ? "text-accent-text" : "text-muted hover:text-foreground"}`}
                      >
                        <Volume2 className="size-3.5" />
                      </button>
                      <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted wrap-anywhere">
                        <Highlight text={ex.context} word={v.word} />
                      </p>
                      <button
                        type="button"
                        title="Xoá câu ví dụ này"
                        aria-label="Xoá câu ví dụ"
                        onClick={() => removeExample(ex.id)}
                        className="shrink-0 cursor-pointer rounded p-0.5 text-muted hover:text-red-400"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    {ex.sourceUrl ? (
                      <Link href={ex.sourceUrl} className="ml-5 flex min-w-0 items-center gap-1 self-start text-[11px] font-bold text-link hover:underline">
                        <ExternalLink className="size-2.5 shrink-0" /> <span className="truncate">{ex.sourceTitle || "Mở bài"}</span>
                      </Link>
                    ) : (
                      ex.sourceTitle && <p className="ml-5 truncate text-[11px] text-muted">{ex.sourceTitle}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** Form tự thêm từ: gõ từ + nghĩa (tự điền hoặc bấm ✨ để AI tạo nghĩa) + câu ví dụ tuỳ chọn */
function AddWordDialog({ onClose }: { onClose: () => void }) {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  const [aiPending, startAi] = useTransition();
  const [saving, startSave] = useTransition();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
  const ai = () =>
    startAi(async () => {
      setError("");
      const res = await aiMeaningFor(word, context);
      if ("error" in res) return setError(res.error);
      setMeaning(res.meaning);
    });
  const field = "input w-full text-base md:text-sm";
  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-word-title"
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (!word.trim() || saving) return;
          startSave(async () => {
            setError("");
            const res = await addOwnWord({ word, meaning, context });
            if (res.error) return setError(res.error);
            onClose();
          });
        }}
      >
        <div className="dialog-head">
          <h2 id="add-word-title" className="dialog-title">
            Thêm từ mới
          </h2>
          <button type="button" className="btn-icon -mt-1 -mr-1 text-muted" onClick={onClose} aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>
        <div className="dialog-body">
          <label className="field">
            Từ / cụm từ
            <input autoFocus className={`${field} font-bold`} value={word} onChange={(e) => setWord(e.target.value)} maxLength={500} placeholder="vd. die Aussprache" />
          </label>
          <label className="field">
            Nghĩa
            <div className="flex gap-2">
              <input
                className={`${field} font-bold text-amber`}
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                maxLength={500}
                placeholder={aiPending ? "AI đang dịch…" : "Tự ghi nghĩa hoặc bấm AI"}
              />
              <button type="button" className="btn btn-soft shrink-0" onClick={ai} disabled={!word.trim() || aiPending} title="Tạo nghĩa bằng AI">
                <Sparkles className={`size-4 ${aiPending ? "animate-pulse" : ""}`} /> AI
              </button>
            </div>
          </label>
          <label className="field">
            <span>
              Câu ví dụ <span className="field-hint">(tuỳ chọn — giúp AI dịch đúng nghĩa)</span>
            </span>
            <textarea className={`${field} resize-none`} rows={2} value={context} onChange={(e) => setContext(e.target.value)} maxLength={500} />
          </label>
          {error && (
            <p role="alert" className="alert alert-err">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn btn-primary" disabled={!word.trim() || saving}>
            <Plus className="size-4" /> {saving ? "Đang lưu…" : "Lưu vào sổ"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Sổ lớn (hàng nghìn từ) vẽ hết 1 lần thì trang rất nặng → hiện dần
const PAGE = 60;

export default function VocabList({ items, autoReview = false }: { items: VocabItem[]; autoReview?: boolean }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE);
  const [review, setReview] = useState<{ title: string; items: VocabItem[] } | null>(null);
  const [detailWord, setDetailWord] = useState<{ item: VocabItem; meaning: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [nouns, setNouns] = useState<Map<number, NounPatch>>(new Map());
  const requestedNouns = useRef<Set<number>>(new Set());
  const local = useMounted();
  const router = useRouter();
  // Giờ hiện tại chỉ lấy trên trình duyệt (server render không biết → khỏi lệch hydrate)
  const now = useNow();

  const merged = useMemo(
    () => (nouns.size ? items.map((v) => (nouns.has(v.id) ? { ...v, ...nouns.get(v.id)! } : v)) : items),
    [items, nouns],
  );

  const due = useMemo(
    () => (now == null ? [] : merged.filter((v) => isDue(v, now)).sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))),
    [merged, now],
  );
  const fresh = useMemo(() => merged.filter((v) => v.stage === 0), [merged]);
  const mastered = useMemo(() => merged.filter((v) => v.stage >= 5), [merged]);
  // Mỗi buổi: tối đa 30 từ đến hạn (quá hạn lâu nhất trước) + 10 từ mới (mới lưu nhất trước)
  const today = useMemo(() => [...due.slice(0, 30), ...fresh.slice(0, 10)], [due, fresh]);

  // Vào từ nút "Ôn" (?review=1) → mở buổi ôn hôm nay ngay khi biết giờ (chỉ 1 lần, khỏi bấm thêm "Ôn hôm nay")
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoReview || autoStarted.current || now == null) return;
    autoStarted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mở buổi ôn 1 lần khi vào trang từ nút "Ôn"
    if (today.length) setReview({ title: "Hôm nay", items: today });
  }, [autoReview, now, today]);

  const query = q.trim().toLowerCase();
  const base = filter === "due" ? due : filter === "fresh" ? fresh : filter === "mastered" ? mastered : merged;
  const shown = useMemo(
    () =>
      query
        ? base.filter(
            (v) =>
              v.word.toLowerCase().includes(query) ||
              v.meaning.toLowerCase().includes(query) ||
              v.context.toLowerCase().includes(query) ||
              (v.examples ?? []).some((e) => e.context.toLowerCase().includes(query)),
          )
        : base,
    [base, query],
  );

  // Tự động xác định giống danh từ (der/die/das + số nhiều) cho các từ đang hiển thị chưa có thông tin
  const visibleUnknownKey = useMemo(
    () =>
      shown
        .slice(0, limit)
        .filter((v) => v.gender === "" && !isPhrase(v))
        .slice(0, 40)
        .map((v) => v.id)
        .join(","),
    [shown, limit],
  );
  useEffect(() => {
    if (!visibleUnknownKey) return;
    const ids = visibleUnknownKey
      .split(",")
      .map(Number)
      .filter((id) => !requestedNouns.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => requestedNouns.current.add(id));
    let alive = true;
    clientApi<{ items: ({ id: number } & NounPatch)[] }>("/vocab/nouns", { method: "POST", body: { ids } })
      .then((r) => {
        if (!alive || !r.items.length) return;
        setNouns((prev) => {
          const next = new Map(prev);
          for (const n of r.items) next.set(n.id, { gender: n.gender, singular: n.singular, plural: n.plural });
          return next;
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [visibleUnknownKey]);

  const speak = (text: string, slow = false) => {
    setSpeaking(text);
    void speakGerman(text, { slow, onEnd: () => setSpeaking((s) => (s === text ? null : s)) });
  };

  // items đã sắp mới → cũ nên các nhóm ngày cũng theo thứ tự đó
  const days = new Map<string, VocabItem[]>();
  for (const v of shown) {
    const k = dayKey(v.createdAt, local);
    const list = days.get(k);
    if (list) list.push(v);
    else days.set(k, [v]);
  }

  let drawn = 0; // số thẻ đã vẽ (tối đa `limit`), cả nhóm ngày vẫn ôn tập / đếm đủ từ

  if (!items.length) {
    return (
      <div className="card empty">
        <span className="icon-bubble tint-sec size-16 rounded-panel">
          <BookOpen className="size-8" />
        </span>
        <p className="font-display text-lg font-bold text-foreground">Chưa có từ nào</p>
        <p className="max-w-sm">Khi học bài video, bấm vào bất kỳ từ nào để tra nghĩa — hệ thống sẽ tự động lưu vào đây để bạn ôn tập theo lịch SRS.</p>
        <button className="btn btn-primary btn-lg mt-1 max-sm:w-full" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Thêm từ
        </button>
        {adding && <AddWordDialog onClose={() => setAdding(false)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-2">
          <label className="input-group h-11 w-full sm:w-auto sm:flex-1">
            <Search className="size-4 text-muted" />
            <input
              className="py-0"
              placeholder="Tìm từ, nghĩa hoặc câu ví dụ…"
              aria-label="Tìm từ, nghĩa hoặc câu ví dụ"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
            />
          </label>
          <button
            className="btn btn-primary h-11 flex-1 sm:flex-none"
            title={`${due.length} từ đến hạn ôn · ${fresh.length} từ mới`}
            onClick={() => setReview({ title: "Hôm nay", items: today })}
            disabled={now == null || !today.length}
          >
            <CalendarCheck className="size-4" /> Ôn hôm nay ({today.length})
          </button>
          <button className="btn h-11" onClick={() => setAdding(true)}>
            <Plus className="size-4 text-sec-text" /> Thêm từ
          </button>
          <button className="btn h-11" onClick={() => setReview({ title: "Tất cả", items: merged })}>
            <Brain className="size-4 text-amber" /> Ôn tất cả
          </button>
          <button className="btn h-11 px-3" title="Tải CSV (nhập vào Anki)" aria-label="Tải CSV (nhập vào Anki)" onClick={() => downloadCsv(merged)}>
            <Download className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc trạng thái ôn tập">
          {(
            [
              ["all", "Tất cả", merged.length],
              ["due", "Đến hạn ôn", due.length],
              ["fresh", "Mới lưu", fresh.length],
              ["mastered", "Thuộc lâu", mastered.length],
            ] as const
          ).map(([k, label, count]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setFilter(k);
                setLimit(PAGE);
              }}
              aria-pressed={filter === k}
              className="chip text-xs"
            >
              {label} <span className={`tabular-nums ${filter === k ? "opacity-80" : "text-muted"}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {[...days].map(([day, list]) => {
        const room = limit - drawn;
        if (room <= 0) return null;
        drawn += list.length;
        return (
          <section key={day} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold tracking-[-0.015em]">{dayLabel(day, local)}</h2>
              <span className="badge badge-muted">{list.length} từ</span>
              <button
                className="btn btn-ghost btn-sm ml-auto text-muted hover:text-foreground"
                onClick={() => setReview({ title: dayLabel(day, local), items: list })}
              >
                <Brain className="size-3.5 text-amber" /> Ôn ngày này
              </button>
            </div>
            <ul className="card divide-y divide-line overflow-hidden p-0">
              {list.slice(0, room).map((v) => (
                <VocabRow
                  key={v.id}
                  v={v}
                  now={now}
                  speaking={speaking}
                  onSpeak={speak}
                  onOpenDetail={(item, currentMeaning) => setDetailWord({ item, meaning: currentMeaning })}
                />
              ))}
            </ul>
          </section>
        );
      })}
      {shown.length > limit && (
        <button className="btn self-center max-sm:w-full" onClick={() => setLimit((n) => n + PAGE * 5)}>
          Xem thêm ({shown.length - limit} từ)
        </button>
      )}
      {!shown.length && <p className="empty py-6">{q ? `Không tìm thấy “${q}”.` : "Không có từ nào trong mục này."}</p>}
      {adding && <AddWordDialog onClose={() => setAdding(false)} />}
      <WordPopup
        word={detailWord?.item.word ?? null}
        context={detailWord?.item.context ?? ""}
        initialMeaning={detailWord?.meaning || undefined}
        extraExamples={detailWord?.item.examples}
        loggedIn
        saved={!!detailWord}
        onSave={async () => {}}
        onRemove={async () => {
          if (!detailWord) return;
          const id = detailWord.item.id;
          setDetailWord(null);
          await removeWord(id);
        }}
        onClose={() => setDetailWord(null)}
      />
      {review && (
        <VocabReview
          title={review.title}
          items={review.items}
          pool={merged}
          onClose={(changed) => {
            setReview(null);
            if (autoReview) router.replace("/vocab/notebook", { scroll: false }); // bỏ ?review=1 → tải lại trang không tự mở lại
            if (changed) router.refresh(); // cập nhật mức nhớ / lịch ôn trên các thẻ
          }}
        />
      )}
    </div>
  );
}
