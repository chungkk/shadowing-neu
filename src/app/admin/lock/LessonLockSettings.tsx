"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { saveLessonLock } from "../actions";
import { FREE_LESSONS, FREE_PICKS, LESSON_PRICE } from "@/lib/lesson-lock";
import LevelBadge from "@/components/LevelBadge";
import { Section, Status } from "@/components/SettingsForms";

/** Admin: bật / tắt khoá bài học và chọn tối đa FREE_LESSONS bài miễn phí (khách cũng học được) */
export default function LessonLockSettings({
  enabled,
  free,
  lessons,
}: {
  enabled: boolean;
  free: number[];
  lessons: { id: number; title: string; level: string }[]; // bài đã đăng
}) {
  const [state, action, saving] = useActionState(saveLessonLock, {});
  const [picked, setPicked] = useState(() => new Set(free));
  const full = picked.size >= FREE_LESSONS;

  const toggle = (id: number) =>
    setPicked((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <form action={action}>
      <Section
        icon={Lock}
        title="Cài đặt"
        desc={`Khách chỉ học được ${FREE_LESSONS} bài miễn phí. Người đã đăng nhập tự chọn thêm ${FREE_PICKS} bài, sau đó mỗi bài ${LESSON_PRICE.toLocaleString("vi-VN")} kim cương. Bài ai đang học dở lúc bật vẫn học tiếp được.`}
        footer={
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        }
      >
        <label className="check text-sm">
          <input type="checkbox" name="enabled" defaultChecked={enabled} />
          Bật khoá bài học
        </label>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">
            Bài miễn phí{" "}
            <span className="text-muted">
              ({picked.size}/{FREE_LESSONS})
            </span>
          </p>
          <div className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {lessons.map((l) => (
              <label key={l.id} className={`check gap-3 px-3 py-2 text-sm ${!picked.has(l.id) && full ? "opacity-50" : ""}`}>
                <input type="checkbox" name="free" value={l.id} checked={picked.has(l.id)} disabled={!picked.has(l.id) && full} onChange={() => toggle(l.id)} />
                <span className="min-w-0 flex-1 truncate">{l.title}</span>
                <LevelBadge level={l.level} className="shrink-0 text-xs" />
              </label>
            ))}
            {!lessons.length && <p className="p-3 text-sm text-muted">Chưa có bài nào được đăng.</p>}
          </div>
        </div>
        <Status state={state} />
      </Section>
    </form>
  );
}
