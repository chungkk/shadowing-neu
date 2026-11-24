import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, ChevronDown, FileText, MessageSquareQuote } from "lucide-react";
import ShadowPlayer from "@/components/ShadowPlayer";
import LockedLesson from "@/components/LockedLesson";
import LevelBadge from "@/components/LevelBadge";
import { getLesson, getLessonBySlug, type Lesson } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { accessOf, canViewLesson, lockInfo, lockSettings } from "@/lib/access";
import { PlayerSkeleton } from "@/components/Skeleton";
import { channelPath, lessonPath } from "@/lib/slug";
import { SITE_URL } from "@/lib/site";
import { clip, pageMeta, youtubeThumb } from "@/lib/page-meta";
import { ORGANIZATION_ID, serializeJsonLd } from "@/lib/seo";
import {
  deckForLevel,
  extractLessonVocab,
  lessonStudyContent,
  levelCatalogPath,
  parseCefrLevel,
  relatedLessons,
} from "@/lib/lesson-seo";
import { formatTime } from "@/lib/subtitles";

/** Mô tả SEO: mô tả admin viết (gọn một dòng, ≤160 ký tự) hoặc câu mặc định theo tên bài + trình độ */
function lessonDescription(lesson: Lesson) {
  if (lesson.description.trim()) return clip(lesson.description);
  return `Bài học tiếng Đức ${lesson.level} “${lesson.title}”: luyện nghe hiểu, từ vựng quan trọng, transcript kèm dịch tiếng Việt, chép chính tả Dictation và Shadowing.`;
}

const lessonDuration = (lesson: Lesson) => (lesson.segments.length ? Math.round(lesson.segments[lesson.segments.length - 1].end) : 0);

function isoDuration(sec: number): string | undefined {
  if (!sec || sec <= 0) return undefined;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `PT${m ? `${m}M` : ""}${s || !m ? `${s}S` : ""}`;
}

/** Dữ liệu có cấu trúc: LearningResource + VideoObject + BreadcrumbList */
function LessonJsonLd({ lesson }: { lesson: Lesson }) {
  const url = `${SITE_URL}${lessonPath(lesson.slug)}`;
  const description = lessonDescription(lesson);
  const lv = parseCefrLevel(lesson.level);
  const timeRequired = isoDuration(lessonDuration(lesson));
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        name: lesson.title,
        description,
        url,
        inLanguage: ["de", "vi"],
        educationalLevel: lesson.level,
        learningResourceType: "Video lesson",
        teaches: `Nghe hiểu, từ vựng, Shadowing${lesson.dictation ? " và Dictation" : ""} tiếng Đức ${lesson.level}`,
        ...(timeRequired ? { timeRequired } : {}),
        isAccessibleForFree: true,
        provider: { "@id": ORGANIZATION_ID },
        video: {
          "@type": "VideoObject",
          name: lesson.title,
          description,
          thumbnailUrl: youtubeThumb(lesson.videoId).url,
          embedUrl: `https://www.youtube.com/embed/${lesson.videoId}`,
          ...(timeRequired ? { duration: timeRequired } : {}),
          // Ngày bài được đăng lên HalloVN (DB lưu "YYYY-MM-DD HH:MM:SS" theo UTC)
          uploadDate: `${lesson.createdAt.replace(" ", "T")}Z`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Tiếng Đức", item: `${SITE_URL}/tieng-duc` },
          ...(lv
            ? [{ "@type": "ListItem", position: 3, name: `Trình độ ${lv}`, item: `${SITE_URL}${levelCatalogPath(lv)}` }]
            : []),
          { "@type": "ListItem", position: lv ? 4 : 3, name: lesson.title, item: url },
        ],
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

const GENDER_TEXT: Record<"der" | "die" | "das", string> = {
  der: "text-link",
  die: "text-coral-text",
  das: "text-ok-text",
};

/** 1 mục thu gọn trong khung giới thiệu (nội dung vẫn nằm trong HTML để Google đọc được) */
function Fold({ icon: Icon, title, count, children }: { icon: typeof FileText; title: string; count: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 py-3 text-sm font-semibold text-foreground hover:text-accent-text">
        <Icon className="size-4 shrink-0 text-muted" aria-hidden />
        <h3 className="min-w-0 flex-1">{title}</h3>
        <span className="badge badge-muted shrink-0 tabular-nums">{count}</span>
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

/**
 * Nội dung học + SEO bên dưới video (chỉ hiện cho bài công khai), gọn trong 1 khung:
 * Giới thiệu · (thu gọn) Từ vựng quan trọng · Cụm từ & mẫu câu · Transcript Đức–Việt — rồi Bài liên quan.
 */
function LessonStudyGuide({ lesson }: { lesson: Lesson }) {
  const { sentences, phrases, translatedCount } = lessonStudyContent(lesson.segments);
  const vocab = extractLessonVocab(
    sentences.map((s) => s.text),
    lesson.level,
    12,
  );
  const lv = parseCefrLevel(lesson.level);
  const deck = deckForLevel(lesson.level);
  const related = relatedLessons(lesson.id, lesson.level, 4);
  const dur = lessonDuration(lesson);
  const mins = dur > 0 ? Math.max(1, Math.round(dur / 60)) : null;

  // Khi chưa có cụm cố định trong cache → chọn tối đa 5 mẫu câu có độ dài vừa đẹp (có bản dịch tiếng Việt nếu đã cache)
  const sampleSentences = phrases.length
    ? []
    : sentences
        .filter((s) => s.text.length >= 28 && s.text.length <= 130)
        .slice(0, 5);

  return (
    <article aria-label={`Nội dung bài học ${lesson.title}`} className="flex flex-col gap-5 pt-2 max-md:hidden">
      <section className="card flex flex-col p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link href="/tieng-duc" className="font-bold hover:text-foreground">
            Tiếng Đức
          </Link>
          <span aria-hidden>/</span>
          {lv ? (
            <Link href={levelCatalogPath(lv)} className="font-bold text-link hover:underline">
              Trình độ {lv}
            </Link>
          ) : (
            <span>{lesson.level}</span>
          )}
          {lesson.channel && (
            <>
              <span aria-hidden>·</span>
              <Link href={channelPath(lesson.channel)} className="font-bold text-link hover:underline">
                Kênh {lesson.channel}
              </Link>
            </>
          )}
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {sentences.length} câu{mins ? ` · ~${mins} phút` : ""}
          </span>
        </div>

        <div className="flex flex-col gap-2 pt-3 pb-4">
          <h2 className="section-title">Giới thiệu bài học {lesson.level}</h2>
          {lesson.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{lesson.description}</p>
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              Video luyện nghe nói tiếng Đức trình độ <b>{lesson.level}</b> gồm {sentences.length} câu hội thoại thực tế
              {lesson.channel ? ` từ kênh ${lesson.channel}` : ""}: nghe từng câu, nói theo (shadowing){lesson.dictation ? ", chép chính tả" : ""} và bấm vào từ bất kỳ trong phụ đề để xem nghĩa tiếng Việt.
            </p>
          )}
        </div>

        <div className="flex flex-col divide-y divide-line border-t border-line">
          {vocab.length > 0 && (
            <Fold icon={BookOpen} title="Từ vựng quan trọng trong bài" count={`${vocab.length} từ`}>
              <ul className="flex flex-col divide-y divide-line">
                {vocab.map((w) => {
                  const article = w.gender === "der" || w.gender === "die" || w.gender === "das" ? w.gender : null;
                  const href = w.topic ? `/vocab/decks/${w.deckSlug}/${w.topic}` : `/vocab/decks/${w.deckSlug}`;
                  return (
                    <li key={`${w.deckSlug}:${w.word}`}>
                      <Link href={href} className="flex items-baseline gap-2 py-1.5 text-sm hover:text-accent-text">
                        <span className="shrink-0 font-semibold text-foreground">
                          {article && <span className={`mr-1 font-bold ${GENDER_TEXT[article]}`}>{article}</span>}
                          {w.word}
                        </span>
                        <span className="min-w-0 text-muted">— {w.meaning}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {deck && (
                <Link href={`/vocab/decks/${deck.slug}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-link hover:underline">
                  Học cả bộ {deck.title} ({deck.wordCount.toLocaleString("vi-VN")} từ) <ArrowRight className="size-3.5" />
                </Link>
              )}
            </Fold>
          )}

          {(phrases.length > 0 || sampleSentences.length > 0) && (
            <Fold
              icon={MessageSquareQuote}
              title={phrases.length > 0 ? "Cụm từ & mẫu câu giao tiếp" : "Mẫu câu tiêu biểu"}
              count={`${phrases.length || sampleSentences.length}`}
            >
              <ul className="flex flex-col divide-y divide-line">
                {phrases.length > 0
                  ? phrases.map((p) => (
                      <li key={p.base} className="flex flex-col gap-0.5 py-2 text-sm">
                        <p>
                          <span className="font-semibold text-foreground">{p.base}</span> <span className="text-muted">— {p.meaning}</span>
                        </p>
                        <p className="text-xs leading-relaxed text-muted italic">„{p.sentence}“</p>
                      </li>
                    ))
                  : sampleSentences.map((s, i) => (
                      <li key={i} className="flex flex-col gap-0.5 py-2 text-sm">
                        <p className="font-semibold text-foreground">{s.text}</p>
                        {s.vi && <p className="text-xs text-muted">{s.vi}</p>}
                      </li>
                    ))}
              </ul>
            </Fold>
          )}

          {sentences.length > 0 && (
            <Fold icon={FileText} title={`Transcript tiếng Đức${translatedCount > 0 ? " & bản dịch" : ""}`} count={`${sentences.length} câu`}>
              <ol className="flex flex-col divide-y divide-line text-sm">
                {sentences.map((s, i) => (
                  <li key={i} className="flex gap-3 py-2.5">
                    <span className="w-11 shrink-0 pt-0.5 font-mono text-xs text-muted tabular-nums">{formatTime(s.start)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="leading-relaxed font-medium text-foreground">{s.text}</p>
                      {s.vi && <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.vi}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </Fold>
          )}
        </div>
      </section>

      {/* 5. Bài học cùng trình độ (liên kết nội bộ) */}
      {related.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">Bài học tiếng Đức liên quan</h2>
            {lv && (
              <Link href={levelCatalogPath(lv)} className="inline-flex items-center gap-1 text-xs font-bold text-link hover:underline">
                Tất cả bài trình độ {lv} <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <Link key={r.id} href={lessonPath(r.slug)} className="group card card-link flex flex-col overflow-hidden p-0">
                <div className="relative aspect-video overflow-hidden bg-card-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <LevelBadge level={r.level} className="absolute top-2 right-2" />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-accent-text">{r.title}</h3>
                  <p className="mt-auto text-xs text-muted">
                    {r.sentenceCount ?? r.segmentCount} câu{r.dictation ? " · Chính tả" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
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

  const own = !!lesson.ownerId; // bài học riêng người dùng tự tạo (chỉ chủ bài xem)
  const draft = !lesson.published && !own && user?.role === "admin";
  return (
    <>
      {lesson.published && <LessonJsonLd lesson={lesson} />}
      <ShadowPlayer
        title={lesson.title}
        level={own ? undefined : lesson.level}
        videoId={lesson.videoId}
        segments={lesson.segments}
        loggedIn={!!user}
        // Khoá tiến độ / nguồn từ vựng vẫn theo id (dữ liệu cũ + app dùng) — không đổi theo slug
        sourceUrl={`/lesson/${lesson.id}`}
        allowDictation={lesson.dictation}
        earnPoints={!own}
      >
        {(draft || own) && (
          <div className="surface flex flex-col gap-1.5 text-sm">
            {draft && <span className="badge badge-gold self-start">Bản nháp — chỉ admin xem được</span>}
            {own && (
              <span className="badge badge-gem self-start whitespace-normal">Bài học riêng của bạn — chỉ bạn thấy · lưu tiến độ, không tính kim cương</span>
            )}
            {lesson.description && <p className="whitespace-pre-line text-muted">{lesson.description}</p>}
          </div>
        )}
        {lesson.published && !own && <LessonStudyGuide lesson={lesson} />}
      </ShadowPlayer>
    </>
  );
}

export async function generateMetadata({ params }: PageProps<"/tieng-duc/[slug]">): Promise<Metadata> {
  const lesson = getLessonBySlug((await params).slug);
  // Trang stream nên notFound() vẫn trả HTTP 200 → báo noindex để Google không lưu trang 404 này
  if (!lesson) return { title: "Không tìm thấy bài học", robots: { index: false, follow: false } };
  if (lesson.ownerId) return { title: "Bài học riêng", robots: { index: false, follow: false } }; // không lộ tên bài riêng của người khác
  const meta = pageMeta({
    title: `${lesson.title} – Luyện nghe nói tiếng Đức ${lesson.level}`,
    description: lessonDescription(lesson),
    path: lessonPath(lesson.slug),
    image: youtubeThumb(lesson.videoId, lesson.title),
    type: "article",
  });
  if (!lesson.published) return { ...meta, robots: { index: false, follow: false } };
  // Bài đang khoá với khách: Google chỉ thấy màn "đăng nhập để mở khoá" → trang mỏng với AdSense, không index (bài miễn phí vẫn index)
  if (accessOf(null)(lesson.id) === "locked") return { ...meta, robots: { index: false, follow: true } };
  return meta;
}

export default function Page(props: PageProps<"/tieng-duc/[slug]">) {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <LessonView {...props} />
    </Suspense>
  );
}
