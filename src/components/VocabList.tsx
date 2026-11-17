"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Brain, CalendarCheck, Download, ExternalLink, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { addOwnWord, aiMeaning, aiMeaningFor, removeWord, setWordMeaning } from "@/app/(app)/account-actions";
import type { VocabItem } from "@/lib/db";
import { isDue, stageInfo } from "@/lib/srs";
import VocabReview from "./VocabReview";

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

function downloadCsv(items: VocabItem[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = ["word,meaning,context,source", ...items.map((v) => [v.word, v.meaning, v.context, v.sourceTitle].map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
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
function VocabRow({ v, now }: { v: VocabItem; now: number | null }) {
  const [meaning, setMeaning] = useState(v.meaning);
  const [saved, setSaved] = useState(v.meaning);
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

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-3 lg:grid-cols-[13rem_15rem_minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <h3 className="font-display text-lg leading-tight font-bold tracking-[-0.015em] wrap-anywhere">{v.word}</h3>
        <Stage v={v} now={now} />
      </div>
      <div className="col-start-2 row-start-1 flex items-center text-muted lg:col-start-4">
        <button title="Dịch nghĩa bằng AI" className="btn-icon size-8 text-muted hover:text-amber" onClick={ai} disabled={aiPending}>
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
        {aiError && <p role="alert" className="field-error">{aiError}</p>}
      </div>
      <div className="col-span-2 min-w-0 text-sm lg:col-span-1">
        {v.context && (
          <p className="line-clamp-2 leading-relaxed text-muted wrap-anywhere" title={v.context}>
            <Highlight text={v.context} word={v.word} />
          </p>
        )}
        {v.sourceUrl ? (
          <Link href={v.sourceUrl} className="mt-0.5 flex min-w-0 items-center gap-1 text-xs font-bold text-link hover:underline">
            <ExternalLink className="size-3 shrink-0" /> <span className="truncate">{v.sourceTitle || "Mở bài"}</span>
          </Link>
        ) : (
          v.sourceTitle && <p className="mt-0.5 truncate text-xs text-muted">{v.sourceTitle}</p>
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
  const [limit, setLimit] = useState(PAGE);
  const [review, setReview] = useState<{ title: string; items: VocabItem[] } | null>(null);
  const [adding, setAdding] = useState(false);
  const local = useMounted();
  const router = useRouter();
  // Giờ hiện tại chỉ lấy trên trình duyệt (server render không biết → khỏi lệch hydrate)
  const now = useNow();
  const due = useMemo(
    () => (now == null ? [] : items.filter((v) => isDue(v, now)).sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))),
    [items, now],
  );
  const fresh = useMemo(() => items.filter((v) => v.stage === 0), [items]);
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
  const shown = query
    ? items.filter((v) => v.word.toLowerCase().includes(query) || v.meaning.toLowerCase().includes(query))
    : items;
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
        <p className="max-w-sm">Khi luyện một bài, bấm vào từ trong câu rồi chọn “Lưu từ” — hoặc tự thêm từ.</p>
        <button className="btn btn-primary btn-lg mt-1 max-sm:w-full" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Thêm từ
        </button>
        {adding && <AddWordDialog onClose={() => setAdding(false)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <label className="input-group h-11 w-full sm:w-auto sm:flex-1">
          <Search className="size-4 text-muted" />
          <input
            className="py-0"
            placeholder="Tìm từ hoặc nghĩa…"
            aria-label="Tìm từ hoặc nghĩa"
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
          disabled={now == null}
        >
          <CalendarCheck className="size-4" /> Ôn hôm nay ({today.length})
        </button>
        <button className="btn h-11" onClick={() => setAdding(true)}>
          <Plus className="size-4 text-sec-text" /> Thêm từ
        </button>
        <button className="btn h-11" onClick={() => setReview({ title: "Tất cả", items })}>
          <Brain className="size-4 text-amber" /> Ôn tất cả
        </button>
        <button className="btn h-11 px-3" title="Tải CSV (nhập vào Anki)" aria-label="Tải CSV (nhập vào Anki)" onClick={() => downloadCsv(items)}>
          <Download className="size-4" />
        </button>
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
                <VocabRow key={v.id} v={v} now={now} />
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
      {!shown.length && <p className="empty py-6">Không tìm thấy “{q}”.</p>}
      {adding && <AddWordDialog onClose={() => setAdding(false)} />}
      {review && (
        <VocabReview
          title={review.title}
          items={review.items}
          pool={items}
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
