import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShadowPlayer from "@/components/ShadowPlayer";
import LockedLesson from "@/components/LockedLesson";
import { getLesson, getLessonBySlug, type Lesson } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { accessOf, canViewLesson, lockInfo, lockSettings } from "@/lib/access";
import { PlayerSkeleton } from "@/components/Skeleton";
import { lessonPath } from "@/lib/slug";
import { SITE_URL } from "@/lib/site";
import { clip, pageMeta, youtubeThumb } from "@/lib/page-meta";
import { ORGANIZATION_ID, serializeJsonLd } from "@/lib/seo";

/** Mô tả SEO: mô tả admin viết (gọn một dòng, ≤160 ký tự) hoặc câu mặc định theo tên bài + trình độ */
function lessonDescription(lesson: Lesson) {
  if (lesson.description.trim()) return clip(lesson.description);
  return `Luyện nghe nói tiếng Đức ${lesson.level} qua video YouTube “${lesson.title}”: shadowing từng câu, phụ đề, dịch tiếng Việt, chép chính tả và lưu từ vựng.`;
}

/** Dữ liệu có cấu trúc: bài học (LearningResource) kèm video YouTube (VideoObject) */
function LessonJsonLd({ lesson }: { lesson: Lesson }) {
  const url = `${SITE_URL}${lessonPath(lesson.slug)}`;
  const description = lessonDescription(lesson);
  const data = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: lesson.title,
    description,
    url,
    inLanguage: "de",
    educationalLevel: lesson.level,
    learningResourceType: "Video lesson",
    teaches: "Nghe, nói và chính tả tiếng Đức",
    isAccessibleForFree: true,
    provider: { "@id": ORGANIZATION_ID },
    video: {
      "@type": "VideoObject",
      name: lesson.title,
      description,
      thumbnailUrl: youtubeThumb(lesson.videoId).url,
      embedUrl: `https://www.youtube.com/embed/${lesson.videoId}`,
      // Ngày bài được đăng lên HalloVN (DB lưu "YYYY-MM-DD HH:MM:SS" theo UTC)
      uploadDate: `${lesson.createdAt.replace(" ", "T")}Z`,
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

/** Trang bài học: hallovn.de/tieng-duc/<slug> (link cũ hallovn.de/<slug> và /lesson/<id> chuyển hướng 308 về đây) */
async function LessonView({ params }: PageProps<"/tieng-duc/[slug]">) {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  // Bài nháp chỉ admin và người đã trả để mở xem được
  const user = await getCurrentUser();
  if (!lesson || !canViewLesson(user, lesson)) notFound();
  // Admin bật khoá bài học mà người này chưa mở bài → màn mở khoá (không gửi phụ đề xuống trình duyệt)
  if (accessOf(user)(lesson.id) === "locked") {
    const free = lockSettings()
      .free.map(getLesson)
      .filter((l) => l?.published)
      .map((l) => ({ title: l!.title, slug: l!.slug }));
    const { id, title, level, videoId, description } = lesson;
    return (
      <>
        {lesson.published && <LessonJsonLd lesson={lesson} />}
        <LockedLesson lesson={{ id, title, level, videoId, description }} lock={lockInfo(user)} freeLessons={free} />
      </>
    );
  }

  const draft = !lesson.published && user?.role === "admin";
  return (
    <>
      {lesson.published && <LessonJsonLd lesson={lesson} />}
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
        {(draft || lesson.description) && (
          <div className="flex flex-col gap-1 rounded-xl bg-card-2/60 p-3 text-sm">
            {draft && <span className="font-bold text-amber">Bản nháp — chỉ admin xem được</span>}
            {lesson.description && <p className="whitespace-pre-line text-muted">{lesson.description}</p>}
          </div>
        )}
      </ShadowPlayer>
    </>
  );
}

export async function generateMetadata({ params }: PageProps<"/tieng-duc/[slug]">): Promise<Metadata> {
  const lesson = getLessonBySlug((await params).slug);
  // Trang stream nên notFound() vẫn trả HTTP 200 → báo noindex để Google không lưu trang 404 này
  if (!lesson) return { title: "Không tìm thấy bài học", robots: { index: false, follow: false } };
  const meta = pageMeta({
    title: `${lesson.title} – Luyện nghe nói tiếng Đức ${lesson.level}`,
    description: lessonDescription(lesson),
    path: lessonPath(lesson.slug),
    image: youtubeThumb(lesson.videoId, lesson.title),
    type: "article",
  });
  return { ...meta, robots: lesson.published ? undefined : { index: false, follow: false } };
}

export default function Page(props: PageProps<"/tieng-duc/[slug]">) {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <LessonView {...props} />
    </Suspense>
  );
}
