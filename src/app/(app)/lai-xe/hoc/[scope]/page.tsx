import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { CLASS_ORDER, DEFAULT_CLASS, forClient, prefs, scopeQuestions, type ClassId } from "@/lib/laixe";
import { JsonLd, breadcrumbLd, fmtNum, quizLd, quizPageMeta } from "@/lib/laixe/seo";
import DrivingRunner from "@/components/laixe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

type P = PageProps<"/lai-xe/hoc/[scope]">;

/** Phạm vi cho metadata / JSON-LD: theo hạng B, chương chỉ có ở hạng khác thì lấy hạng đầu tiên có chương đó (nội dung trang vẫn theo hạng người học chọn) */
function seoScope(scope: string) {
  for (const cls of [DEFAULT_CLASS, ...CLASS_ORDER.filter((c) => c !== DEFAULT_CLASS)] as ClassId[]) {
    const s = scopeQuestions(scope, cls);
    if (s) {
      // Chủ đề / chương của Grundstoff và Zusatzstoff có thể trùng tên tiếng Việt → thêm mã để title không trùng
      const name = scope === "grund" || scope === "zusatz" ? s.title : `${s.title} ${scope}`;
      return { ...s, cls, name };
    }
  }
  return null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { scope } = await params;
  const s = seoScope(scope);
  if (!s) return { title: "Học lý thuyết lái xe", robots: { index: false } };
  const n = fmtNum(s.ids.length);
  // Tên chương tiếng Đức có khi rất dài → lấy bản dài nhất còn vừa (title ~60, description ≤ 160 ký tự)
  const fit = (max: number, ...xs: string[]) => xs.find((x) => x.length <= max) ?? xs[xs.length - 1];
  return quizPageMeta({
    // ?mode=lesen (đọc lướt) cùng bộ câu → canonical về trang không tham số
    path: `/lai-xe/hoc/${scope}`,
    title: fit(60, `${s.name} – ${n} câu lý thuyết lái xe Đức`, `${s.name} – ${n} câu lý thuyết lái xe`, `${s.name} – lý thuyết lái xe`),
    description: fit(
      160,
      `${n} câu hỏi thi lý thuyết lái xe Đức hạng ${s.cls}, ${s.subtitle}: bản dịch tiếng Việt, giải thích, luyện chấm đúng/sai ngay hoặc đọc lướt đáp án.`,
      `${n} câu hỏi thi lý thuyết lái xe Đức hạng ${s.cls} – ${s.name}: bản dịch tiếng Việt, giải thích, luyện chấm đúng/sai ngay hoặc đọc lướt đáp án.`,
      `${n} câu thi lý thuyết lái xe Đức hạng ${s.cls} – ${s.name}: dịch tiếng Việt, giải thích, luyện chấm ngay.`,
    ),
    // HTML chỉ có 1 câu (phần còn lại tải sau, xem lib/crawl-guard.ts) → trang mỏng với Google / AdSense: không index, vẫn theo link
    robots: { index: false, follow: true },
  });
}

async function ScopeLd({ params }: Pick<P, "params">) {
  const { scope } = await params;
  const s = seoScope(scope);
  if (!s) return null;
  const path = `/lai-xe/hoc/${scope}`;
  return (
    <JsonLd
      data={[
        quizLd({ path, name: `${s.name} – lý thuyết lái xe Đức`, description: `${s.ids.length} câu hỏi lý thuyết lái xe Đức (${s.subtitle}), dịch tiếng Việt.`, about: "Theorieprüfung Führerschein" }),
        breadcrumbLd([["Lý thuyết lái xe", "/lai-xe"], ["Học theo chủ đề", "/lai-xe/hoc"], [s.name, path]]),
      ]}
    />
  );
}

async function Learn({ params, searchParams }: P) {
  const { scope } = await params;
  const mode = (await searchParams).mode === "lesen" ? "lesen" : "ueben";
  const { cls, lang } = await prefs();
  const s = scopeQuestions(scope, cls);
  if (!s) notFound();
  const user = await getCurrentUser();
  return (
    <DrivingRunner
      key={mode}
      mode={mode}
      title={s.title}
      subtitle={`${s.subtitle} · hạng ${cls}`}
      backHref="/lai-xe/hoc"
      questions={await forClient(s.ids, lang)}
      loggedIn={!!user}
      lang={lang}
      stats={user ? quizStats(user.id, "fuehrerschein") : {}}
      bookmarks={user ? quizBookmarks(user.id, "fuehrerschein") : []}
      modeLinks={{ lesen: `/lai-xe/hoc/${scope}?mode=lesen`, ueben: `/lai-xe/hoc/${scope}` }}
      resumeKey={`laixe:pos:${cls}:${scope}`}
    />
  );
}

export default function Page(props: P) {
  return (
    <main className="page" data-sec="laixe">
      <ScopeLd params={props.params} />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Learn {...props} />
      </Suspense>
    </main>
  );
}
