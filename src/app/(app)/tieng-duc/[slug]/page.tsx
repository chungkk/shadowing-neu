import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, ChevronDown, Ear, FileText, MessageSquareQuote, Mic, Zap } from "lucide-react";
import ShadowPlayer from "@/components/ShadowPlayer";
import LockedLesson from "@/components/LockedLesson";
import LevelBadge from "@/components/LevelBadge";
import { getLesson, getLessonBySlug, type Lesson } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { accessOf, canViewLesson, lockInfo, lockSettings } from "@/lib/access";
import { PlayerSkeleton } from "@/components/Skeleton";
import { lessonPath } from "@/lib/slug";
import { SITE_URL } from "@/lib/site";
import { clip, pageMeta, youtubeThumb } from "@/lib/page-meta";
import { ORGANIZATION_ID, serializeJsonLd } from "@/lib/seo";
import {
  LEVEL_CATALOG,
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

const GENDER_BADGE: Record<"der" | "die" | "das", string> = {
  der: "badge-link",
  die: "badge-coral",
  das: "badge-ok",
};

/**
 * Nội dung học + SEO đầy đủ bên dưới video (chỉ hiện cho bài công khai):
 * Giới thiệu tiếng Việt · Bài tập (Dictation / Shadowing / Phản xạ) · Từ vựng quan trọng · Cụm từ & mẫu câu · Transcript Đức–Việt · Bài liên quan.
 */
function LessonStudyGuide({ lesson }: { lesson: Lesson }) {
  const { sentences, phrases, translatedCount } = lessonStudyContent(lesson.segments);
  const vocab = extractLessonVocab(
    sentences.map((s) => s.text),
    lesson.level,
    12,
  );
  const lv = parseCefrLevel(lesson.level);
  const lvInfo = lv ? LEVEL_CATALOG[lv] : null;
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
    <article aria-label={`Nội dung bài học ${lesson.title}`} className="flex flex-col gap-5 pt-2">
      {/* 1. Giới thiệu bài học + 3 bài tập tương tác */}
      <section className="card flex flex-col gap-4 p-4 sm:p-6">
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
              <span>Kênh {lesson.channel}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {sentences.length} câu{mins ? ` · ~${mins} phút` : ""}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="section-title">Giới thiệu bài học {lesson.level}</h2>
          {lesson.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{lesson.description}</p>
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              Video luyện nghe nói tiếng Đức trình độ <b>{lesson.level}</b> gồm {sentences.length} câu hội thoại thực tế
              {lesson.channel ? ` từ kênh ${lesson.channel}` : ""}. Bạn có thể bấm trực tiếp vào bất kỳ từ nào trong phụ đề để xem nghĩa tiếng Việt, phiên âm IPA, từ đồng nghĩa và tự động lưu vào sổ ôn SRS.
            </p>
          )}
          {lvInfo && <p className="text-xs leading-relaxed text-muted">{lvInfo.intro}</p>}
        </div>

        {/* 3 chế độ luyện cho bài học này */}
        <div className="grid gap-2.5 sm:grid-cols-3">
          {lesson.dictation && (
            <div className="surface flex items-start gap-2.5 p-3">
              <span className="icon-bubble tint-accent size-8 shrink-0 rounded-lg">
                <Ear className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">Bài tập Dictation</span>
                <span className="text-xs text-muted">Nghe từng câu và gõ chính tả tiếng Đức</span>
              </span>
            </div>
          )}
          <div className="surface flex items-start gap-2.5 p-3">
            <span className="icon-bubble tint-sec size-8 shrink-0 rounded-lg">
              <Mic className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">Bài tập Shadowing</span>
              <span className="text-xs text-muted">Nói nhại theo ngữ điệu & ghi âm so sánh</span>
            </span>
          </div>
          <div className="surface flex items-start gap-2.5 p-3">
            <span className="icon-bubble tint-gold size-8 shrink-0 rounded-lg">
              <Zap className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">Bài tập Nghe hiểu</span>
              <span className="text-xs text-muted">Ẩn phụ đề để luyện nghe phản xạ tự nhiên</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. Từ vựng quan trọng xuất hiện trong bài (liên kết trực tiếp sang bộ từ vựng) */}
      {vocab.length > 0 && (
        <section className="card flex flex-col gap-3.5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title flex items-center gap-2">
              <BookOpen className="size-5 text-sec-text" /> Từ vựng quan trọng trong bài
            </h2>
            {deck && (
              <Link href={`/vocab/decks/${deck.slug}`} className="inline-flex items-center gap-1 text-xs font-bold text-link hover:underline">
                Học bộ {deck.title} ({deck.wordCount.toLocaleString("vi-VN")} từ) <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {vocab.map((w) => {
              const article = w.gender === "der" || w.gender === "die" || w.gender === "das" ? w.gender : null;
              const href = w.topic ? `/vocab/decks/${w.deckSlug}/${w.topic}` : `/vocab/decks/${w.deckSlug}`;
              return (
                <li key={`${w.deckSlug}:${w.word}`}>
                  <Link href={href} className="surface card-link flex h-full flex-col gap-1 p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {article && <span className={`badge ${GENDER_BADGE[article]} px-1.5 py-0 text-[11px]`}>{article}</span>}
                      <span className="font-display text-base font-extrabold text-foreground">{w.word}</span>
                      {article && w.plural && <span className="text-xs text-muted">· Pl. {w.plural}</span>}
                    </div>
                    <p className="text-sm font-semibold text-amber">{w.meaning}</p>
                    <span className="mt-auto text-[11px] font-medium text-muted">Trong bộ {w.deckTitle}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 3. Cụm từ cố định / Mẫu câu giao tiếp */}
      {(phrases.length > 0 || sampleSentences.length > 0) && (
        <section className="card flex flex-col gap-3.5 p-4 sm:p-6">
          <h2 className="section-title flex items-center gap-2">
            <MessageSquareQuote className="size-5 text-amber" />
            {phrases.length > 0 ? "Cụm từ & mẫu câu giao tiếp trong bài" : "Mẫu câu tiêu biểu trong bài"}
          </h2>
          {phrases.length > 0 ? (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {phrases.map((p) => (
                <li key={p.base} className="surface flex flex-col gap-1 p-3">
                  <p className="font-display text-base font-extrabold">{p.base}</p>
                  <p className="text-sm font-semibold text-amber">{p.meaning}</p>
                  <p className="text-xs leading-relaxed text-muted">“{p.sentence}”</p>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-2">
              {sampleSentences.map((s, i) => (
                <li key={i} className="surface flex flex-col gap-0.5 p-3">
                  <p className="text-sm font-semibold text-foreground">{s.text}</p>
                  {s.vi && <p className="text-xs text-muted">{s.vi}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 4. Transcript tiếng Đức (+ bản dịch tiếng Việt nếu đã có trong cache) — thu gọn để giữ trang gọn */}
      {sentences.length > 0 && (
        <details className="card group p-4 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="section-title flex items-center gap-2">
              <FileText className="size-5 text-muted" />
              Transcript tiếng Đức{translatedCount > 0 ? " & bản dịch tiếng Việt" : ""}
              <span className="badge badge-muted font-sans tabular-nums">{sentences.length} câu</span>
            </span>
            <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <ol className="mt-4 flex flex-col divide-y divide-line border-t border-line pt-2 text-sm">
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
        </details>
      )}

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
              <Link key={r.id} href={lessonPath(r.slug)} className="group sticker sticker-link flex flex-col overflow-hidden">
                <div className="relative m-2 mb-0 aspect-video overflow-hidden rounded-[calc(var(--radius-lg)-6px)] bg-card-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <LevelBadge level={r.level} className="absolute top-1.5 right-1.5" />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-2 text-sm leading-snug font-bold group-hover:text-accent-text">{r.title}</h3>
                  <p className="mt-auto text-xs text-muted">
                    {r.sentenceCount ?? r.segmentCount} câu{r.dictation ? " · Dictation" : ""}
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
  return { ...meta, robots: lesson.published ? undefined : { index: false, follow: false } };
}

export default function Page(props: PageProps<"/tieng-duc/[slug]">) {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <LessonView {...props} />
    </Suspense>
  );
}
