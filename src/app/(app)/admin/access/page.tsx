import { Suspense } from "react";
import Link from "next/link";
import { Circle, CircleCheck, Coins, KeyRound, Lock, LockOpen, Sparkles, Unlock } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { earnableFreePoints, lockSettings } from "@/lib/access";
import { POINTS_CORRECT } from "@/lib/dictation";
import { FREE_PICKS, LESSON_PRICE } from "@/lib/lesson-lock";
import { lessonUnlockStats, listLessons } from "@/lib/db";
import LevelBadge from "@/components/LevelBadge";
import { ListSkeleton } from "@/components/Skeleton";
import { setLessonLock, toggleFreeLesson } from "../actions";
import AdminPageHeader from "../_components/AdminPageHeader";
import KpiCard from "../_components/KpiCard";
import SectionCard from "../_components/SectionCard";

const fmt = (n: number) => n.toLocaleString("vi-VN");

async function AccessContent() {
  await requireAdmin();
  const lock = lockSettings();
  const lessons = listLessons({ includeDrafts: false });
  const freeSet = new Set(lock.free.filter((id) => lessons.some((l) => l.id === id)));
  const earnable = earnableFreePoints();
  const short = earnable < LESSON_PRICE;
  const ratio = Math.min(100, Math.round((earnable / Math.max(1, LESSON_PRICE)) * 100));
  const stats = lessonUnlockStats();

  // Sắp bài miễn phí lên trước, sau đó theo điểm chính tả cao → thấp để admin dễ chọn bài đủ kim cương
  const sorted = [...lessons].sort(
    (a, b) => Number(freeSet.has(b.id)) - Number(freeSet.has(a.id)) || (b.dictation ? b.wordCount ?? 0 : 0) - (a.dictation ? a.wordCount ?? 0 : 0),
  );

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Vận hành & Hệ thống" }, { label: "Khoá bài & Kim cương" }]}
        title="Khoá bài & Kinh tế Kim cương"
        description="Kiểm soát chế độ mở khoá bài học Tiếng Đức, số bài miễn phí cho khách và cân bằng kim cương kiếm được từ Dictation."
      />

      {/* Công tắc chính + thanh kiểm tra ngưỡng kim cương */}
      <SectionCard
        title="Chế độ khoá bài học"
        description={`Khách chỉ học các bài “Miễn phí”. Học viên đã đăng nhập được chọn thêm ${FREE_PICKS} bài miễn phí, sau đó ${fmt(LESSON_PRICE)} kim cương / bài.`}
        aside={
          <form action={setLessonLock.bind(null, !lock.enabled)}>
            <button
              className={`btn btn-sm ${lock.enabled ? "" : "btn-primary"}`}
              disabled={!lock.enabled && short}
              title={!lock.enabled && short ? "Các bài miễn phí chưa kiếm đủ kim cương để mở 1 bài" : undefined}
            >
              {lock.enabled ? (
                <>
                  <LockOpen className="size-4" aria-hidden /> Tắt khoá bài
                </>
              ) : (
                <>
                  <Lock className="size-4" aria-hidden /> Bật khoá bài
                </>
              )}
            </button>
          </form>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Trạng thái hiện tại:</span>
            {lock.enabled ? (
              <span className="badge badge-ok">Đang bật khoá bài</span>
            ) : (
              <span className="badge badge-muted">Đang tắt — mọi bài đã đăng đều mở tự do</span>
            )}
            <span className="badge badge-gold">{fmt(freeSet.size)} bài miễn phí</span>
          </div>

          <div className="surface flex flex-col gap-2 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">Kim cương tối đa kiếm được từ các bài miễn phí (có Dictation)</span>
              <span className={`font-mono font-bold tabular-nums ${short ? "text-amber" : "text-ok-text"}`}>
                {fmt(earnable)} / {fmt(LESSON_PRICE)} 💎 ({ratio}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-card">
              <div className={`h-full rounded-full ${short ? "bg-gold" : "bg-ok"}`} style={{ width: `${ratio}%` }} />
            </div>
            {short ? (
              <p className="alert alert-warn mt-1 text-xs">
                Các bài “Miễn phí” có bật Dictation chưa kiếm đủ {fmt(LESSON_PRICE)} kim cương để mở 1 bài mới. Hãy chọn thêm bài miễn phí có Dictation bên dưới trước khi bật khoá.
              </p>
            ) : (
              <p className="text-xs text-muted">
                Đạt chuẩn cân bằng: học viên mới có thể tự kiếm đủ kim cương mở bài tiếp theo từ các bài miễn phí. Bài ai đang học dở lúc bật khoá vẫn học tiếp được.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* 4 KPI mở khoá từ DB */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard tone="de" label="Lượt chọn miễn phí" value={stats.pick} sub={`${fmt(stats.users)} học viên đã mở`} icon={<KeyRound className="size-4" aria-hidden />} />
        <KpiCard tone="gem" label="Lượt mua bằng 💎" value={stats.buy} sub={`Đã tiêu ${fmt(stats.spent)} kim cương`} icon={<Coins className="size-4" aria-hidden />} />
        <KpiCard tone="ink" label="Bài học dở giữ lại" value={stats.legacy} sub="Mở sẵn khi bật khoá" icon={<Unlock className="size-4" aria-hidden />} />
        <KpiCard tone="laixe" label="Bài riêng tự tạo" value={stats.own} sub="Từ video YouTube học viên dán" icon={<Sparkles className="size-4" aria-hidden />} />
      </div>

      {/* Chọn nhanh bài miễn phí */}
      <SectionCard
        title="Danh sách bài miễn phí cho khách"
        description={`Đang chọn ${fmt(freeSet.size)} / ${fmt(lessons.length)} bài đã đăng. Bấm nút để bật/tắt miễn phí ngay.`}
        aside={
          <Link href="/admin/lessons" className="text-xs font-semibold text-link hover:underline">
            Về danh sách bài học →
          </Link>
        }
        flush
      >
        {sorted.length ? (
          <ul className="divide-y divide-line">
            {sorted.map((l) => {
              const isFree = freeSet.has(l.id);
              const pts = l.dictation ? (l.wordCount ?? 0) * POINTS_CORRECT : 0;
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors hover:bg-card-2/50">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link href={`/admin/${l.id}`} className="truncate text-sm font-semibold text-foreground hover:text-sec-text">
                      {l.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <LevelBadge level={l.level} className="text-[11px]" />
                      {l.channel && <span className="truncate">{l.channel}</span>}
                      <span className="font-mono tabular-nums">{l.sentenceCount} câu</span>
                      {l.dictation ? (
                        <span className="font-mono font-semibold text-gem tabular-nums">+{fmt(pts)} 💎</span>
                      ) : (
                        <span className="text-muted">Tắt Dictation (0 💎)</span>
                      )}
                    </div>
                  </div>
                  <form action={toggleFreeLesson.bind(null, l.id, !isFree)}>
                    <button
                      aria-pressed={isFree}
                      className={`badge hit-44 min-h-8 cursor-pointer gap-1.5 px-3 transition-shadow hover:ring-1 hover:ring-current/40 ${isFree ? "badge-gold" : "badge-muted"}`}
                    >
                      {isFree ? <CircleCheck className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                      {isFree ? "Đang miễn phí" : "Chọn miễn phí"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-4 text-sm text-muted">Chưa có bài học nào đã đăng.</p>
        )}
      </SectionCard>
    </>
  );
}

export default function AdminAccessPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <AccessContent />
    </Suspense>
  );
}
