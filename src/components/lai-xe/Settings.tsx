"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { setLicenseClass, setLidState, setTranslationLang } from "@/app/(portal)/lai-xe/actions";
import { clientApi } from "@/lib/client-api";
import { LANGS, LANG_NAMES, type Lang } from "@/lib/fuehrerschein-rules";
import { useLocalStorage } from "@/hooks/useLocalStorage";

/** Chọn ngôn ngữ bản dịch (lưu cookie, trang tải lại với bản dịch mới) */
export function LangSelect({ lang }: { lang: Lang }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm font-bold">
      Bản dịch:
      <select
        value={lang}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          start(() => setTranslationLang(v));
        }}
        className="rounded-xl border-2 border-ink bg-card px-2 py-1.5 font-bold"
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANG_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

export type ClassOption = { id: string; name: string; description: string; vi: string; count: number; exam: string };

/** Lưới chọn hạng bằng theo nhóm xe */
export function ClassPicker({ groups, current }: { groups: { title: string; classes: ClassOption[] }[]; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [choosing, setChoosing] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold">{g.title}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.classes.map((c) => {
              const on = c.id === current;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={pending}
                    aria-pressed={on}
                    onClick={() => {
                      setChoosing(c.id);
                      start(async () => {
                        await setLicenseClass(c.id);
                        router.push("/lai-xe");
                      });
                    }}
                    className={`sticker sticker-link flex w-full items-start gap-3 p-3 text-left ${on ? "bg-gold/25" : ""}`}
                  >
                    <span className={`flex h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink px-1.5 text-base font-extrabold ${on ? "bg-gold text-black" : "bg-card-2"}`}>{c.id}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-extrabold">
                        {c.vi} <span className="text-sm font-bold text-muted">· {c.name}</span>
                      </span>
                      <span className="text-sm text-muted">{c.description}</span>
                      <span className="mt-1 text-xs font-bold text-muted tabular-nums">
                        {c.count.toLocaleString("vi-VN")} câu · thi {c.exam}
                      </span>
                    </span>
                    {on && <Check className="size-5 shrink-0" aria-label="Đang học" />}
                    {pending && choosing === c.id && <span className="text-xs text-muted">Đang đổi…</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Chọn bang (Leben in Deutschland) */
export function StateSelect({ states, current }: { states: { code: string; name: string }[]; current: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm font-bold">
      Bang:
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          start(() => setLidState(v));
        }}
        className="rounded-xl border-2 border-ink bg-card px-2 py-1.5 font-bold"
      >
        {states.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Như app LiD: làm sai tự đánh dấu, làm đúng tự bỏ đánh dấu */
export function AutoMarkToggle() {
  const [on, setOn] = useLocalStorage<boolean>("lid:auto-mark", true);
  return (
    <label className="flex items-center gap-2 text-sm font-bold">
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="size-5 accent-[var(--accent)]" />
      Tự đánh dấu câu làm sai, bỏ đánh dấu khi làm đúng
    </label>
  );
}

/** Xoá toàn bộ tiến độ (câu đã làm, đánh dấu, lịch sử thi) của 1 phần */
export function ResetProgress({ module = "fuehrerschein" }: { module?: "fuehrerschein" | "lid" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-red"
        disabled={busy}
        onClick={async () => {
          if (!confirm(`Xoá toàn bộ tiến độ ${module === "lid" ? "Leben in Deutschland" : "lái xe"}: câu đã làm, câu đánh dấu và lịch sử thi? Không hoàn tác được.`)) return;
          setBusy(true);
          setError("");
          try {
            await clientApi("/quiz", { method: "DELETE", body: { module, all: true } });
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Trash2 className="size-4" /> Xoá tiến độ
      </button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  );
}
