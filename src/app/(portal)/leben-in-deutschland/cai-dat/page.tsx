import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { STATES, prefs } from "@/lib/lid";
import { AutoMarkToggle, LangSelect, ResetProgress } from "@/components/lai-xe/Settings";
import { LidShell, LidTopBar } from "@/components/lid/LidParts";
import { StatePicker } from "@/components/lid/StatePicker";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Cài đặt · Leben in Deutschland", robots: { index: false } };

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[11px] font-semibold tracking-[0.1em] text-white/35">{title}</h2>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">{children}</div>
    </section>
  );
}

async function Settings() {
  const { state, lang } = await prefs();
  const user = await getCurrentUser();
  return (
    <>
      <Group title="BANG">
        <StatePicker states={STATES} current={state.code} />
      </Group>
      <Group title="NGÔN NGỮ">
        <LangSelect lang={lang} />
        <p className="text-sm text-white/45">Bản dịch hiện dưới câu hỏi tiếng Đức; bấm biểu tượng 文A ở màn học để ẩn / hiện.</p>
      </Group>
      <Group title="HỌC TẬP">
        <AutoMarkToggle />
      </Group>
      {user && (
        <Group title="DỮ LIỆU">
          <p className="text-sm text-white/45">Xoá câu đã làm, câu đánh dấu và lịch sử thi của phần Leben in Deutschland.</p>
          <ResetProgress module="lid" />
        </Group>
      )}
    </>
  );
}

export default function Page() {
  return (
    <LidShell>
      <LidTopBar back="/leben-in-deutschland" title="Cài đặt" />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Settings />
      </Suspense>
    </LidShell>
  );
}
