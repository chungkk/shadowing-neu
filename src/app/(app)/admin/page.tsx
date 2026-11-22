import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Plus,
} from "lucide-react";
import {
  ChristmasCarIcon as Car,
  ChristmasCatalogIcon as BookOpenCheck,
  ChristmasChannelIcon as Tv,
  ChristmasChatIcon as MessageSquare,
  ChristmasLockIcon as Lock,
  ChristmasUsersIcon as Users,
  ChristmasVideoIcon as ListVideo,
} from "@/components/FestiveIcons";
import { requireAdmin } from "@/lib/auth";
import { earnableFreePoints, lockSettings } from "@/lib/access";
import { LESSON_PRICE } from "@/lib/lesson-lock";
import {
  adminActivityDays,
  adminDashboardStats,
  adminListUsers,
  LEVELS,
  listFeedback,
  type FeedbackKind,
  type Level,
} from "@/lib/db";
import Avatar from "@/components/Avatar";
import LevelBadge from "@/components/LevelBadge";
import { ListSkeleton } from "@/components/Skeleton";
import AdminPageHeader from "./_components/AdminPageHeader";
import DashboardActivityChart from "./_components/DashboardActivityChart";
import KpiCard from "./_components/KpiCard";
import SectionCard from "./_components/SectionCard";
import { ago, nowMs } from "./users/format";

const fmt = (n: number) => n.toLocaleString("vi-VN");
const pct = (ok: number, n: number) => (n ? `${Math.round((ok / n) * 100)}%` : "—");

const LEVEL_BAR: Record<Level, string> = {
  A1: "bg-accent",
  A2: "bg-accent/80",
  B1: "bg-link",
  B2: "bg-link/80",
  C1: "bg-grape",
  C2: "bg-grape/80",
};

const FEEDBACK_BADGE: Record<FeedbackKind, { label: string; className: string }> = {
  bug: { label: "Báo lỗi", className: "badge-red" },
  idea: { label: "Góp ý", className: "badge-link" },
  content: { label: "Nội dung", className: "badge-gold" },
  other: { label: "Khác", className: "badge-muted" },
};

async function Overview() {
  await requireAdmin();
  const now = nowMs();
  const stats = adminDashboardStats(now);
  const days = adminActivityDays(30, now);
  const lock = lockSettings();
  const earnable = earnableFreePoints();
  const lockShort = earnable < LESSON_PRICE;

  const recentUsers = adminListUsers().slice(0, 5);
  const recentFeedback = listFeedback(5);

  const totalLevelLessons = Math.max(1, stats.lessons.total);
  const queueItems: { id: string; tone: "red" | "warn" | "ink"; title: string; sub: string; href: string; cta: string }[] = [];
  if (stats.feedback.open > 0) {
    queueItems.push({
      id: "fb",
      tone: stats.feedback.bugOpen > 0 ? "red" : "warn",
      title: `${fmt(stats.feedback.open)} góp ý chưa xử lý`,
      sub: stats.feedback.bugOpen > 0 ? `Trong đó có ${fmt(stats.feedback.bugOpen)} báo lỗi cần kiểm tra sớm.` : "Xem và đánh dấu đã xử lý sau khi phản hồi.",
      href: "/admin/feedback?status=open",
      cta: "Xử lý",
    });
  }
  if (stats.lessons.draft > 0) {
    queueItems.push({
      id: "draft",
      tone: "warn",
      title: `${fmt(stats.lessons.draft)} bài học đang ở bản nháp`,
      sub: "Kiểm tra phụ đề, bật Dictation và đăng công khai khi sẵn sàng.",
      href: "/admin/lessons?f=draft",
      cta: "Xem nháp",
    });
  }
  if (lockShort) {
    queueItems.push({
      id: "lock",
      tone: "warn",
      title: "Bài miễn phí chưa đủ kim cương để bật khoá",
      sub: `Hiện kiếm tối đa ${fmt(earnable)} / ${fmt(LESSON_PRICE)} kim cương cần để mở 1 bài.`,
      href: "/admin/access",
      cta: "Cấu hình",
    });
  }
  if (stats.users.unverified > 0) {
    queueItems.push({
      id: "unverified",
      tone: "ink",
      title: `${fmt(stats.users.unverified)} tài khoản chưa xác minh email`,
      sub: "Có thể rà soát hoặc xác minh thủ công trong mục Người dùng.",
      href: "/admin/users?f=unverified",
      cta: "Kiểm tra",
    });
  }

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Bảng điều khiển" }]}
        title="Bảng điều khiển"
        description="Toàn cảnh hoạt động học tập, nội dung 3 trụ cột và các đầu việc cần quản trị trên HalloVN."
        actions={
          <>
            <Link href="/admin/channels" className="btn btn-sm">
              <Tv className="size-4" aria-hidden /> Kênh YouTube
            </Link>
            <Link href="/admin/new" className="btn btn-primary btn-sm">
              <Plus className="size-4" aria-hidden /> Bài học mới
            </Link>
          </>
        }
      />

      {/* Tầng 1: 4 thẻ KPI cốt lõi */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          href="/admin/users"
          tone="ink"
          label="Người dùng"
          icon={<Users className="size-4" aria-hidden />}
          value={stats.users.total}
          sub={`+${fmt(stats.users.new7)} mới 7 ngày · ${fmt(stats.users.active7)} hoạt động`}
        />
        <KpiCard
          href="/admin/lessons"
          tone="de"
          label="Bài học Tiếng Đức"
          icon={<ListVideo className="size-4" aria-hidden />}
          value={`${fmt(stats.lessons.published)}/${fmt(stats.lessons.total)}`}
          sub={`${fmt(stats.lessons.channels)} kênh · ${fmt(stats.lessons.dictation)} Dictation · ${fmt(stats.lessons.ownTotal)} bài riêng`}
        />
        <KpiCard
          href="/admin/catalog"
          tone="laixe"
          label="Thi thử 30 ngày"
          icon={<Car className="size-4" aria-hidden />}
          value={stats.quizzes.exams30}
          sub={`Đậu ${pct(stats.quizzes.passed30, stats.quizzes.exams30)} · ${fmt(stats.quizzes.answersTotal)} lượt trả lời`}
        />
        <KpiCard
          href={stats.feedback.open > 0 ? "/admin/feedback?status=open" : "/admin/access"}
          tone={stats.feedback.open > 0 ? "red" : lock.enabled ? "ok" : "muted"}
          label="Góp ý & Khoá bài"
          icon={stats.feedback.open > 0 ? <MessageSquare className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
          value={stats.feedback.open > 0 ? `${fmt(stats.feedback.open)} mới` : lock.enabled ? "Khoá: Bật" : "Khoá: Tắt"}
          sub={
            stats.feedback.open > 0
              ? `Tổng ${fmt(stats.feedback.total)} góp ý · Khoá bài ${lock.enabled ? "đang bật" : "đang tắt"}`
              : `Không có góp ý tồn · ${fmt(lock.free.length)} bài miễn phí`
          }
        />
      </div>

      {/* Tầng 2: Xu hướng 30 ngày (2/3) + Phân bổ trình độ (1/3) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Hoạt động học tập 30 ngày"
          description="Tổng hợp lượt ôn từ vựng, chép chính tả, học bộ từ, trả lời câu hỏi & thi thử (UTC)."
          aside={
            <span className="font-mono text-xs text-muted tabular-nums">
              {fmt(stats.learning.vocabTotal)} từ · {fmt(stats.learning.reviewEvents30)} lượt ôn/30n
            </span>
          }
        >
          <DashboardActivityChart days={days} />
        </SectionCard>

        <SectionCard
          title="Phân bổ trình độ A1–C2"
          description="Số bài học Tiếng Đức của HalloVN theo từng khung tham chiếu."
          aside={
            <Link href="/admin/lessons" className="text-xs font-semibold text-link hover:underline">
              Quản lý →
            </Link>
          }
        >
          <div className="flex flex-col gap-3">
            {LEVELS.map((lv) => {
              const n = stats.lessons.byLevel[lv] ?? 0;
              const width = n > 0 ? Math.max(4, Math.round((n / totalLevelLessons) * 100)) : 0;
              return (
                <Link
                  key={lv}
                  href={`/admin/lessons?lv=${lv}`}
                  className="group flex items-center gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-card-2/60"
                >
                  <LevelBadge level={lv} className="w-10 justify-center text-xs" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-2">
                    <div className={`h-full rounded-full ${LEVEL_BAR[lv]}`} style={{ width: `${width}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono text-xs font-semibold text-foreground tabular-nums">{fmt(n)}</span>
                </Link>
              );
            })}
            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
              <div className="surface flex flex-col gap-0.5 px-3 py-2">
                <span className="text-muted">Lái xe đã thi</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {fmt(stats.quizzes.laixeExams)} đề ({pct(stats.quizzes.laixePassed, stats.quizzes.laixeExams)})
                </span>
              </div>
              <div className="surface flex flex-col gap-0.5 px-3 py-2">
                <span className="text-muted">LiD đã thi</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {fmt(stats.quizzes.lidExams)} đề ({pct(stats.quizzes.lidPassed, stats.quizzes.lidExams)})
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Tầng 3: Hộp việc cần xử lý + Lối tắt quản trị */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Việc cần chú ý"
          description="Các đầu việc đang chờ kiểm tra hoặc cần hành động."
          flush
        >
          {queueItems.length > 0 ? (
            <ul className="divide-y divide-line">
              {queueItems.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-card-2/40">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      item.tone === "red"
                        ? "bg-red-soft text-red-400"
                        : item.tone === "warn"
                          ? "bg-gold-soft text-amber"
                          : "bg-link-soft text-link"
                    }`}
                  >
                    <AlertTriangle className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted">{item.sub}</p>
                  </div>
                  <Link href={item.href} className="btn btn-sm shrink-0">
                    {item.cta} <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 p-5 text-sm text-muted">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ok-soft text-ok-text">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-foreground">Mọi thứ đang gọn gàng</p>
                <p className="text-xs text-muted">Không có góp ý tồn, bản nháp hay cảnh báo vận hành nào.</p>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Thao tác nhanh" description="Lối tắt các tác vụ dùng thường xuyên.">
          <div className="grid grid-cols-1 gap-2">
            {[
              { href: "/admin/new", label: "Tạo bài học YouTube mới", sub: "Dán link & lấy phụ đề tự động", icon: Plus },
              { href: "/admin/channels", label: "Duyệt video từ Kênh", sub: `${fmt(stats.lessons.channels)} kênh đã lưu`, icon: Tv },
              { href: "/admin/access", label: "Khoá bài & Kim cương", sub: lock.enabled ? `Đang bật · ${lock.free.length} bài miễn phí` : "Đang tắt — mở toàn bộ", icon: Lock },
              { href: "/admin/catalog", label: "Kho nội dung chuẩn", sub: "Lái xe · LiD · Từ vựng · Ngữ pháp", icon: BookOpenCheck },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex items-center gap-3 rounded-lg border border-line bg-sidebar/60 px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-card-2"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sec-soft text-sec-text">
                  <q.icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{q.label}</p>
                  <p className="truncate text-xs text-muted">{q.sub}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Tầng 4: Người dùng mới nhất & Góp ý mới nhất */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="Người dùng gần đây"
          aside={
            <Link href="/admin/users" className="text-xs font-semibold text-link hover:underline">
              Tất cả ({fmt(stats.users.total)}) →
            </Link>
          }
          flush
        >
          {recentUsers.length ? (
            <ul className="divide-y divide-line">
              {recentUsers.map((u) => (
                <li key={u.id}>
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-card-2/50">
                    <Avatar user={u} className="size-9 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <p className={u.lastActive ? "font-medium text-foreground" : "text-muted"}>{ago(u.lastActive, now)}</p>
                      <p className="font-mono text-[11px] text-muted tabular-nums">ĐK {u.createdAt.slice(0, 10)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted">Chưa có người dùng nào.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Góp ý & Báo lỗi mới nhất"
          aside={
            <Link href="/admin/feedback" className="text-xs font-semibold text-link hover:underline">
              Tất cả ({fmt(stats.feedback.total)}) →
            </Link>
          }
          flush
        >
          {recentFeedback.length ? (
            <ul className="divide-y divide-line">
              {recentFeedback.map((f) => (
                <li key={f.id} className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className={`badge ${FEEDBACK_BADGE[f.kind]?.className ?? "badge-muted"}`}>{FEEDBACK_BADGE[f.kind]?.label ?? f.kind}</span>
                    {f.status === "resolved" && <span className="badge badge-ok">Đã xử lý</span>}
                    <span className="font-medium text-foreground">{f.userName ?? "Khách"}</span>
                    <span className="ml-auto font-mono text-[11px] tabular-nums">{f.createdAt.slice(0, 10)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted">{f.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted">Chưa có góp ý nào.</p>
          )}
        </SectionCard>
      </div>
    </>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<ListSkeleton thumb />}>
      <Overview />
    </Suspense>
  );
}
