"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookOpen, Download, ExternalLink, Search, Trash2 } from "lucide-react";
import { removeWord, setWordMeaning } from "@/app/account-actions";
import type { VocabItem } from "@/lib/db";

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

function VocabCard({ v }: { v: VocabItem }) {
  const [meaning, setMeaning] = useState(v.meaning);
  const [saved, setSaved] = useState(v.meaning);
  const [pending, start] = useTransition();
  const save = () => {
    if (meaning.trim() === saved) return;
    start(async () => {
      await setWordMeaning(v.id, meaning);
      setSaved(meaning.trim());
    });
  };

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-xl font-extrabold break-words">{v.word}</h3>
        <a
          href={`https://www.dict.cc/?s=${encodeURIComponent(v.word)}`}
          target="_blank"
          rel="noreferrer"
          title="Tra dict.cc"
          className="btn-icon size-8 text-link"
        >
          <BookOpen className="size-4" />
        </a>
        <form action={removeWord.bind(null, v.id)} onSubmit={(e) => !confirm(`Xoá “${v.word}”?`) && e.preventDefault()}>
          <button title="Xoá" className="btn-icon size-8 text-red-400">
            <Trash2 className="size-4" />
          </button>
        </form>
      </div>
      <input
        className="input py-2"
        placeholder="Ghi nghĩa tiếng Việt…"
        value={meaning}
        onChange={(e) => setMeaning(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        maxLength={500}
      />
      {pending && <span className="-mt-2 text-xs text-muted">Đang lưu…</span>}
      {v.context && (
        <p className="rounded-xl bg-background/60 p-3 text-sm leading-relaxed text-muted">
          <Highlight text={v.context} word={v.word} />
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 text-xs text-muted">
        {v.sourceUrl ? (
          <Link href={v.sourceUrl} className="inline-flex min-w-0 items-center gap-1 font-bold text-link hover:underline">
            <ExternalLink className="size-3.5 shrink-0" /> <span className="truncate">{v.sourceTitle || "Mở bài"}</span>
          </Link>
        ) : (
          <span className="truncate">{v.sourceTitle}</span>
        )}
        <span className="ml-auto shrink-0">{v.createdAt.slice(0, 10)}</span>
      </div>
    </div>
  );
}

export default function VocabList({ items }: { items: VocabItem[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = query
    ? items.filter((v) => v.word.toLowerCase().includes(query) || v.meaning.toLowerCase().includes(query))
    : items;

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="input flex flex-1 items-center gap-2 py-2.5">
          <Search className="size-4 text-muted" />
          <input className="flex-1 bg-transparent outline-none" placeholder="Tìm từ hoặc nghĩa…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="btn" onClick={() => downloadCsv(items)}>
          <Download className="size-4" /> Tải CSV (Anki)
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((v) => (
          <VocabCard key={v.id} v={v} />
        ))}
      </div>
      {!shown.length && <p className="text-sm text-muted">Không tìm thấy “{q}”.</p>}
    </div>
  );
}
