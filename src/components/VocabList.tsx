"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Brain, CalendarCheck, Download, ExternalLink, Search, Sparkles, Trash2 } from "lucide-react";
import { aiMeaning, removeWord, setWordMeaning } from "@/app/account-actions";
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
      <mark className="rounded bg-amber/20 px-0.5 text-amber">{text.slice(i, i + word.length)}</mark>
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
  const { label, color } = stageInfo(v.stage);
  let when = "";
  if (now != null && v.stage > 0 && v.dueAt != null) {
    const days = Math.ceil((v.dueAt - now) / 86_400_000);
    when = days <= 0 ? "đến hạn ôn" : days === 1 ? "ôn lại ngày mai" : `ôn lại sau ${days} ngày`;
  }
  return (
    <p className="text-xs text-muted">
      <span className={`font-bold ${color}`}>● {label}</span>
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
        <h3 className="text-lg leading-tight font-extrabold wrap-anywhere">{v.word}</h3>
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
          className="-mx-2 w-[calc(100%+1rem)] rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-bold text-amber outline-none placeholder:font-normal placeholder:text-muted hover:border-border focus:border-accent focus:bg-background md:text-sm"
          placeholder="+ Ghi nghĩa tiếng Việt…"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          maxLength={500}
        />
        {(pending || aiPending) && <p className="text-xs text-muted">{aiPending ? "AI đang dịch…" : "Đang lưu…"}</p>}
        {aiError && <p className="text-xs text-red-400">{aiError}</p>}
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

// Sổ lớn (hàng nghìn từ) vẽ hết 1 lần thì trang rất nặng → hiện dần
const PAGE = 60;

export default function VocabList({ items }: { items: VocabItem[] }) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [review, setReview] = useState<{ title: string; items: VocabItem[] } | null>(null);
  const local = useMounted();
  const router = useRouter();
  // Giờ hiện tại chỉ lấy trên trình duyệt (server render không biết → khỏi lệch hydrate)
  const now = useNow();
  const due = now == null ? [] : items.filter((v) => isDue(v, now)).sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
  const fresh = items.filter((v) => v.stage === 0);
  // Mỗi buổi: tối đa 30 từ đến hạn (quá hạn lâu nhất trước) + 10 từ mới (mới lưu nhất trước)
  const today = [...due.slice(0, 30), ...fresh.slice(0, 10)];
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
      <div className="card flex flex-col items-center gap-2 p-10 text-center">
        <BookOpen className="size-10 text-link" />
        <p className="font-bold">Chưa có từ nào</p>
        <p className="text-sm text-muted">Khi luyện một bài, bấm vào từ trong câu rồi chọn “Lưu từ”.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <label className="input flex h-11 w-full items-center gap-2 py-0 sm:w-auto sm:flex-1">
          <Search className="size-4 text-muted" />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder="Tìm từ hoặc nghĩa…"
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
        <button className="btn h-11" onClick={() => setReview({ title: "Tất cả", items })}>
          <Brain className="size-4 text-amber" /> Ôn tất cả
        </button>
        <button className="btn h-11 px-3" title="Tải CSV (nhập vào Anki)" onClick={() => downloadCsv(items)}>
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
              <h2 className="font-extrabold">{dayLabel(day, local)}</h2>
              <span className="text-sm text-muted">· {list.length} từ</span>
              <button
                className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-muted transition hover:bg-foreground/5 hover:text-foreground"
                onClick={() => setReview({ title: dayLabel(day, local), items: list })}
              >
                <Brain className="size-3.5 text-amber" /> Ôn ngày này
              </button>
            </div>
            <ul className="card divide-y divide-border p-0">
              {list.slice(0, room).map((v) => (
                <VocabRow key={v.id} v={v} now={now} />
              ))}
            </ul>
          </section>
        );
      })}
      {shown.length > limit && (
        <button className="btn self-center" onClick={() => setLimit((n) => n + PAGE * 5)}>
          Xem thêm ({shown.length - limit} từ)
        </button>
      )}
      {!shown.length && <p className="text-sm text-muted">Không tìm thấy “{q}”.</p>}
      {review && (
        <VocabReview
          title={review.title}
          items={review.items}
          pool={items}
          onClose={(changed) => {
            setReview(null);
            if (changed) router.refresh(); // cập nhật mức nhớ / lịch ôn trên các thẻ
          }}
        />
      )}
    </div>
  );
}
