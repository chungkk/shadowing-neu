import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShadowPlayer from "@/components/ShadowPlayer";
import { getLessonBySlug } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Trang bài học: ckk.pro/<slug> (link cũ /lesson/<id> chuyển hướng 308 về đây) */
async function LessonView({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  // Bài nháp chỉ admin xem được
  const user = await getCurrentUser();
  if (!lesson || (!lesson.published && user?.role !== "admin")) notFound();

  return (
    <ShadowPlayer
      title={lesson.title}
      level={lesson.level}
      videoId={lesson.videoId}
      segments={lesson.segments}
      loggedIn={!!user}
      // Khoá tiến độ / nguồn từ vựng vẫn theo id (dữ liệu cũ + app dùng) — không đổi theo slug
      sourceUrl={`/lesson/${lesson.id}`}
      allowDictation={lesson.dictation}
    >
      {(!lesson.published || lesson.description) && (
        <div className="flex flex-col gap-1 rounded-xl bg-card-2/60 p-3 text-sm">
          {!lesson.published && <span className="font-bold text-amber">Bản nháp — chỉ admin xem được</span>}
          {lesson.description && <p className="whitespace-pre-line text-muted">{lesson.description}</p>}
        </div>
      )}
    </ShadowPlayer>
  );
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const lesson = getLessonBySlug((await params).slug);
  // Trang stream nên notFound() vẫn trả HTTP 200 → báo noindex để Google không lưu trang 404 này
  if (!lesson) return { title: "Không tìm thấy bài học", robots: { index: false, follow: false } };
  const title = `${lesson.title} — Luyện nghe nói tiếng Đức ${lesson.level}`;
  const description =
    lesson.description.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `Luyện shadowing và chép chính tả tiếng Đức trình độ ${lesson.level} với video “${lesson.title}”: phụ đề từng câu, nghe lại, ghi âm giọng nói, tra từ và lưu từ vựng.`;
  const image = `https://i.ytimg.com/vi/${lesson.videoId}/hqdefault.jpg`;
  return {
    title,
    description,
    alternates: { canonical: `/${lesson.slug}` },
    openGraph: { type: "article", title, description, url: `/${lesson.slug}`, images: [{ url: image, width: 480, height: 360 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots: lesson.published ? undefined : { index: false, follow: false },
  };
}

export default function Page(props: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<p className="p-10 text-center text-muted">Đang tải bài học…</p>}>
      <LessonView {...props} />
    </Suspense>
  );
}
