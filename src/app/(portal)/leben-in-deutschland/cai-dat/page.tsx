import { Suspense, type ComponentType, type ReactNode } from "react";
import { BookOpen, Database, Languages, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { STATES, prefs } from "@/lib/lid";
import { AutoMarkToggle, LangSelect, ResetProgress } from "@/components/lai-xe/Settings";
import { LidShell, LidTopBar } from "@/components/lid/LidParts";
import { StatePicker } from "@/components/lid/StatePicker";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Cài đặt · Leben in Deutschland", robots: { index: false } };

/** Một nhóm cài đặt: thẻ sticker có tiêu đề + mô tả — như mục Lái xe trong trang Cài đặt */
function Group({ icon: Icon, title, text, children }: { icon: ComponentType<{ className?: string }>; title: string; text?: string; children: ReactNode }) {
  return (
    <section className="sticker flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Icon className="size-5 text-link" /> {title}
        </h2>
        {text && <p className="mt-0.5 text-sm text-muted">{text}</p>}
      </div>
      {children}
    </section>
  );
}

async function Settings() {
  const { state, lang } = await prefs();
  const user = await getCurrentUser();
  return (
    <>
      <Group icon={MapPin} title="Bang" text="Câu hỏi riêng của bang dùng khi học và khi thi thử.">
        <StatePicker states={STATES} current={state.code} />
      </Group>
      <Group icon={Languages} title="Ngôn ngữ" text="Bản dịch hiện dưới câu hỏi tiếng Đức; bấm biểu tượng 文A ở màn học để ẩn / hiện.">
        <LangSelect lang={lang} />
      </Group>
      <Group icon={BookOpen} title="Học tập">
        <AutoMarkToggle />
      </Group>
      {user && (
        <Group icon={Database} title="Dữ liệu" text="Xoá câu đã làm, câu đánh dấu và lịch sử thi của phần Leben in Deutschland.">
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
