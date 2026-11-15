import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { CATEGORIES, forClient, getSet, getState, prefs } from "@/lib/lid";
import { LID_SET_IDS } from "@/lib/lid-routes";
import LidRunner from "@/components/lid/LidRunner";
import { LidShell } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

type P = PageProps<"/leben-in-deutschland/[set]">;

// Danh sách bộ cố định → metadata của từng bộ dựng sẵn lúc build (nằm trong <head>, không stream vào <body>).
// Đường dẫn lạ (/leben-in-deutschland/xyz) bị proxy.ts trả 404 thật trước khi tới đây.
export function generateStaticParams() {
  return LID_SET_IDS.map((set) => ({ set }));
}

function describe(set: string, s: { title: string; ids: string[] }) {
  const state = getState(set);
  if (state) return `10 câu hỏi riêng của bang ${state.name} trong bài thi Leben in Deutschland / Einbürgerungstest, kèm bản dịch tiếng Việt và đáp án.`;
  const cat = CATEGORIES.find((c) => c.key === set);
  if (cat) return `Luyện ${s.ids.length} câu Leben in Deutschland chủ đề „${cat.de}" (${cat.vi.toLowerCase()}), có bản dịch tiếng Việt, chấm đúng/sai ngay.`;
  if (set === "tat-ca") return "Luyện đủ 300 câu chung Leben in Deutschland theo thứ tự danh mục BAMF 2025, có bản dịch tiếng Việt, chấm đúng/sai ngay.";
  if (set === "hoc") return "Học toàn bộ câu hỏi Leben in Deutschland: 300 câu chung và 10 câu của bang bạn, có bản dịch tiếng Việt.";
  return `Luyện ${s.title.toLowerCase()} trong 300 câu chung Leben in Deutschland / Einbürgerungstest (danh mục BAMF 2025), kèm bản dịch tiếng Việt.`;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { set } = await params;
  const s = getSet(set);
  if (!s) return { title: "Không tìm thấy", robots: { index: false, follow: false } };
  const path = `/leben-in-deutschland/${set}`;
  return {
    title: `${s.title} – Leben in Deutschland tiếng Việt`,
    description: describe(set, s),
    // ?mode=lesen (đọc lướt) cùng nội dung → canonical về trang không tham số. "hoc" trùng "tat-ca" + đổi theo bang → không index
    alternates: { canonical: path },
    openGraph: { url: path },
    robots: set === "hoc" ? { index: false, follow: true } : undefined,
  };
}

async function SetView({ params, searchParams }: P) {
  const { set } = await params;
  const { state, lang } = await prefs();
  const s = getSet(set, state.code);
  if (!s) notFound();
  const mode = (await searchParams).mode === "lesen" ? "lesen" : "ueben";
  const user = await getCurrentUser();
  return (
    <LidRunner
      key={`${mode}:${s.ids.join()}`} // đổi chế độ / đổi bang → màn mới
      mode={mode}
      title={mode === "lesen" ? `${s.title} · Đọc lướt` : s.title}
      backHref="/leben-in-deutschland"
      questions={await forClient(s.ids)}
      userId={user?.id}
      lang={lang}
      stats={user ? quizStats(user.id, "lid") : undefined}
      bookmarks={user ? quizBookmarks(user.id, "lid") : undefined}
      resumeKey={set === "hoc" ? `lid:hoc:${state.code}` : `lid:${set}:${mode}`}
    />
  );
}

export default function Page(props: P) {
  return (
    <LidShell>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <SetView {...props} />
      </Suspense>
    </LidShell>
  );
}
