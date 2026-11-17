"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Car, Check, Trash2 } from "lucide-react";
import { setLicenseClass, setLidState } from "@/app/(app)/lai-xe/actions";
import { clientApi } from "@/lib/client-api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useConfirm } from "@/components/ConfirmDialog";

/** Chọn hạng bằng dạng danh sách thả xuống (trang Cài đặt) */
export function ClassSelect({ groups, current }: { groups: { title: string; classes: ClassOption[] }[]; current: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="field w-full max-w-sm">
      Hạng bằng
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          start(() => setLicenseClass(v));
        }}
        className="min-h-11 w-full min-w-0 font-bold"
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

/** Mục "Lý thuyết lái xe" trong trang Cài đặt: hạng bằng đang học */
export function DrivingSettings({ groups, current }: { groups: { title: string; classes: ClassOption[] }[]; current: string }) {
  const info = groups.flatMap((g) => g.classes).find((c) => c.id === current);
  return (
    <section id="lai-xe" className="sticker scroll-mt-20 overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Car className="size-5 text-amber" /> Lý thuyết lái xe
          </h2>
          <p className="mt-0.5 text-sm text-muted">Hạng bằng đang học. Bản dịch câu hỏi là tiếng Việt.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="icon-bubble tint-gold h-12 min-w-12 px-2 font-display text-xl font-extrabold" aria-hidden>
            {current}
          </span>
          {info && (
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-bold">
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
        </div>
        <Link href="/lai-xe/hang" className="btn btn-sm btn-ghost self-start text-link">
          Xem mô tả từng hạng <ArrowRight className="size-3.5" aria-hidden />
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
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-3">
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
                    className={`tile card-link flex h-full min-h-[5.5rem] w-full cursor-pointer items-start gap-3 text-left disabled:cursor-wait ${on ? "border-sec bg-sec-soft shadow-[inset_0_0_0_1px_var(--sec)]" : ""}`}
                  >
                    <span className={`icon-bubble h-11 min-w-11 px-1.5 font-display text-lg font-extrabold ${on ? "bg-sec text-on-sec" : "tint-muted"}`}>{c.id}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-bold">
                        {c.vi} <span className="text-sm font-bold text-muted">· {c.name}</span>
                      </span>
                      <span className="text-sm text-muted">{c.description}</span>
                      <span className="mt-1 text-xs font-bold text-muted tabular-nums">
                        {c.count.toLocaleString("vi-VN")} câu · thi {c.exam}
                      </span>
                    </span>
                    {on && (
                      <span className="badge badge-gold shrink-0">
                        <Check className="size-3.5" aria-hidden /> Đang học
                      </span>
                    )}
                    {pending && choosing === c.id && <span className="badge badge-muted shrink-0">Đang đổi…</span>}
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
    <label className="field w-full max-w-sm">
      Bang
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          start(() => setLidState(v));
        }}
        className="min-h-11 w-full font-bold"
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
    <label className="check min-h-11 text-sm font-bold">
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="size-5" />
      Tự đánh dấu câu làm sai, bỏ đánh dấu khi làm đúng
    </label>
  );
}

/** Rung khi trả lời sai (điện thoại) — Leben in Deutschland */
export function VibrateToggle() {
  const [on, setOn] = useLocalStorage<boolean>("lid:vibrate", true);
  return (
    <label className="check min-h-11 text-sm font-bold">
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="size-5" />
      Rung khi trả lời sai (điện thoại)
    </label>
  );
}

/** Xoá toàn bộ tiến độ (câu đã làm, đánh dấu, lịch sử thi) của 1 phần */
export function ResetProgress({ module = "fuehrerschein", userId }: { module?: "fuehrerschein" | "lid"; userId?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ask, confirmDialog] = useConfirm();
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="btn btn-red"
        disabled={busy}
        onClick={async () => {
          const ok = await ask({
            title: `Xoá toàn bộ tiến độ ${module === "lid" ? "Leben in Deutschland" : "lái xe"}?`,
            text: "Câu đã làm, câu đánh dấu và lịch sử thi sẽ bị xoá. Không hoàn tác được.",
            ok: "Xoá tiến độ",
            tone: "red",
            icon: <Trash2 className="size-5" />,
          });
          if (!ok) return;
          setBusy(true);
          setError("");
          try {
            await clientApi("/quiz", { method: "DELETE", body: { module, all: true } });
            // Vị trí học dở của tài khoản này (localStorage "pos:u<id>:lid:…") cũng là tiến độ → xoá theo
            if (module === "lid" && userId !== undefined)
              try {
                for (const k of Object.keys(localStorage)) if (k.startsWith(`pos:u${userId}:lid:`)) localStorage.removeItem(k);
              } catch {}
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
      {error && (
        <p className="alert alert-err" role="alert">
          {error}
        </p>
      )}
      {confirmDialog}
    </div>
  );
}
