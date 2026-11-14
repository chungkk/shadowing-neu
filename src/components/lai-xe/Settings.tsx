"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, Check, Trash2 } from "lucide-react";
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

/** Chọn hạng bằng dạng danh sách thả xuống (trang Cài đặt) */
export function ClassSelect({ groups, current }: { groups: { title: string; classes: ClassOption[] }[]; current: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm font-bold">
      Hạng bằng:
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          start(() => setLicenseClass(v));
        }}
        className="min-w-0 max-w-full rounded-xl border-2 border-ink bg-card px-2 py-1.5 font-bold"
      >
        {groups.map((g) => (
          <optgroup key={g.title} label={g.title}>
            {g.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.vi}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/** Mục "Lý thuyết lái xe" trong trang Cài đặt: hạng bằng đang học + ngôn ngữ bản dịch */
export function DrivingSettings({ groups, current, lang }: { groups: { title: string; classes: ClassOption[] }[]; current: string; lang: Lang }) {
  const info = groups.flatMap((g) => g.classes).find((c) => c.id === current);
  return (
    <section id="lai-xe" className="sticker scroll-mt-20 overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Car className="size-5 text-link" /> Lý thuyết lái xe
          </h2>
          <p className="mt-0.5 text-sm text-muted">Hạng bằng đang học và ngôn ngữ bản dịch câu hỏi (dùng chung cho Leben in Deutschland).</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-12 min-w-12 items-center justify-center rounded-2xl border-2 border-ink bg-gold px-2 text-lg font-extrabold text-black">{current}</span>
          {info && (
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-extrabold">
                Hạng {info.name} · {info.vi}
              </span>
              <span className="text-sm text-muted">
                {info.count.toLocaleString("vi-VN")} câu · thi {info.exam}
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <ClassSelect groups={groups} current={current} />
          <LangSelect lang={lang} />
        </div>
        <Link href="/lai-xe/hang" className="self-start text-sm font-bold text-muted underline-offset-2 hover:underline">
          Xem mô tả từng hạng →
        </Link>
      </div>
    </section>
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
          <h2 className="section-title">{g.title}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    className={`tile sticker-link flex h-full w-full items-start gap-3 text-left ${on ? "bg-gold/25" : ""}`}
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
