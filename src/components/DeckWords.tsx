"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Layers, Loader2, Plus, Volume2 } from "lucide-react";
import { addDeck } from "@/app/(portal)/account-actions";
import type { DeckWord } from "@/lib/decks";
import { speak, useHasGermanVoice } from "@/lib/german-voice";
import { LoginLink } from "./LoginDialog";

type Word = DeckWord & { saved: boolean; learned: boolean };

/** Màu mạo từ theo giống — như app: der xanh dương · die đỏ · das xanh lá */
const GENDER: Record<string, string> = { der: "text-phrase", die: "text-red-400", das: "text-accent-text" };
const article = (w: DeckWord) => (w.gender === "der" || w.gender === "die" || w.gender === "das" ? w.gender : "");

// Bộ cả nghìn từ vẽ hết 1 lần thì trang rất nặng → hiện dần
const PAGE = 100;
// Thêm nhiều hơn chừng này từ 1 lần → hỏi lại (sổ đầy từ mới, lịch ôn dồn dập)
const CONFIRM_OVER = 100;

/** Danh sách từ của 1 bộ + thêm vào sổ (cả bộ / từng từ) */
export default function DeckWords({
  slug,
  words: initial,
  loggedIn,
  onSaved,
}: {
  slug: string;
  words: Word[];
  loggedIn: boolean;
  onSaved?: (keys: string[]) => void; // báo trang cha (màn học) cập nhật cờ "có trong sổ"
}) {
  const [words, setWords] = useState(initial);
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState<Set<string> | "all">(new Set()); // mục đang thêm · "all" = đang thêm cả bộ
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [, startTransition] = useTransition();
  const tts = useHasGermanVoice();
  const left = words.filter((w) => !w.saved);

  const add = (list: string[], all: boolean) => {
    if (all && list.length > CONFIRM_OVER && !confirm(`Thêm cả ${list.length} từ vào sổ? Có thể thêm từng từ bằng nút + ở mỗi dòng.`)) return;
    setMsg({});
    setBusy(all ? "all" : (b) => new Set(b === "all" ? [] : b).add(list[0]));
    startTransition(async () => {
      const r = await addDeck(slug, list);
      if ("error" in r) setMsg({ error: r.error === "login" ? "Đăng nhập để thêm từ vào sổ." : r.error });
      else {
        const set = new Set(list);
        setWords((ws) => ws.map((w) => (set.has(w.key) ? { ...w, saved: true } : w)));
        onSaved?.(list);
        if (all) setMsg({ ok: `Đã thêm ${r.added} từ vào sổ — vào Sổ từ vựng để bắt đầu ôn.` });
      }
      setBusy((b) => {
        if (all || b === "all") return new Set();
        const n = new Set(b);
        n.delete(list[0]);
        return n;
      });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {!loggedIn ? (
          <LoginLink href={`/login?next=/vocab/decks/${slug}`} className="btn btn-primary btn-lg">
            Đăng nhập để thêm vào sổ và ôn tập
          </LoginLink>
        ) : left.length ? (
          <button className="btn btn-primary btn-lg" disabled={busy === "all"} onClick={() => add(left.map((w) => w.key), true)}>
            {busy === "all" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Thêm {left.length} từ vào sổ
          </button>
        ) : (
          <Link href="/vocab/notebook" className="btn btn-primary btn-lg">
            <Layers className="size-4" /> Cả bộ đã ở trong sổ · Ôn tập
          </Link>
        )}
        {msg.ok && (
          <Link href="/vocab/notebook" className="text-sm font-bold text-accent-text hover:underline">
            {msg.ok}
          </Link>
        )}
        {msg.error && <p className="text-sm text-red-400">{msg.error}</p>}
      </div>

      <ul className="card divide-y divide-border p-0">
        {words.slice(0, limit).map((w, i) => {
          const a = article(w);
          const adding = busy === "all" ? !w.saved : busy.has(w.key);
          return (
            <li key={i} className="flex items-center gap-2 py-2.5 pr-2 pl-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {w.image && <img src={w.image} alt="" loading="lazy" className="size-8 object-contain" />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:grid sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-x-4">
                <p className="text-lg font-bold">
                  {a && <span className={GENDER[a]}>{a} </span>}
                  {w.word}
                  {!!w.plural && w.plural !== w.word && <span className="text-sm font-medium text-muted"> · die {w.plural}</span>}
                </p>
                <div className="flex min-w-0 flex-col gap-0.5 sm:justify-center">
                  <p className="text-sm text-foreground/85 sm:text-base">{w.meaning}</p>
                  {w.example && <p className="text-sm text-muted italic">{w.example}</p>}
                </div>
              </div>
              {tts && (
                <button type="button" title="Nghe phát âm" className="btn-icon shrink-0 text-link" onClick={() => speak(a ? `${a} ${w.word}` : w.word)}>
                  <Volume2 className="size-4" />
                </button>
              )}
              {loggedIn && (
                <button
                  type="button"
                  title={w.saved ? "Đã có trong sổ" : "Thêm vào sổ"}
                  disabled={w.saved || adding || busy === "all"}
                  className={`btn-icon shrink-0 ${w.saved ? "text-accent-text" : "text-foreground"}`}
                  onClick={() => add([w.key], false)}
                >
                  {adding ? <Loader2 className="size-4 animate-spin" /> : w.saved ? <Check className="size-5" /> : <Plus className="size-5" />}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {words.length > limit && (
        <button className="btn self-center" onClick={() => setLimit((n) => n + PAGE * 3)}>
          Xem thêm ({words.length - limit} từ)
        </button>
      )}
    </div>
  );
}
