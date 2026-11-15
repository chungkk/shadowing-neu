import { Suspense, type ComponentType, type ReactNode } from "react";
import { BookOpen, Database, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { STATES, prefs } from "@/lib/lid";
import { AutoMarkToggle, ResetProgress, VibrateToggle } from "@/components/lai-xe/Settings";
import { LidShell, LidTopBar } from "@/components/lid/LidParts";
import { StatePicker } from "@/components/lid/StatePicker";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Cài đặt · Leben in Deutschland", robots: { index: false } };

/** Một nhóm cài đặt: thẻ sticker có tiêu đề + mô tả — như mục Lái xe trong trang Cài đặt */
function Group({ icon: Icon, title, text, children }: { icon: ComponentType<{ className?: string }>; title: string; text?: string; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-3">
      <div>
        <h2 className="section-title flex items-center gap-2">
          <Icon className="size-5 text-link" /> {title}
        </h2>
        {text && <p className="mt-0.5 text-sm text-muted">{text}</p>}
      </div>
      {children}
    </section>
  );
}

async function Settings() {
  const { state, chosen } = await prefs();
  const user = await getCurrentUser();
  // Form cài đặt: giới hạn bề ngang bên trong, khung ngoài vẫn .page để tiêu đề thẳng hàng subnav
  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <Group icon={MapPin} title="Bang" text="Câu hỏi riêng của bang dùng khi học và khi thi thử.">
        <StatePicker states={STATES} current={state.code} chosen={chosen} />
      </Group>
      <Group icon={BookOpen} title="Học tập">
        {/* Đánh dấu câu lưu trên tài khoản → chỉ có khi đã đăng nhập */}
        {user && <AutoMarkToggle />}
        <VibrateToggle />
      </Group>
      {user && (
        <Group icon={Database} title="Dữ liệu" text="Xoá câu đã làm, câu đánh dấu và lịch sử thi của phần Leben in Deutschland.">
          <ResetProgress module="lid" userId={user.id} />
        </Group>
      )}
    </div>
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
