import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { envAdminEmail, requireAdmin } from "@/lib/auth";
import {
  getStats,
  getUserById,
  listProgress,
  listStarred,
  QUIZ_MODULES,
  userActivityDays,
  userFeedback,
  userLastActive,
  userOAuthAccounts,
  userQuizSummary,
  userUnlockSummary,
  type FeedbackKind,
  type QuizModule,
} from "@/lib/db";
import { ListSkeleton } from "@/components/Skeleton";
import Avatar from "@/components/Avatar";
import { Gem } from "@/components/PointsBadge";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Download,
  LayoutGrid,
  LogOut,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import DeleteButton from "../../DeleteButton";
import { changeUserRole, logoutUser, removeUserAndBack, resetUserQuiz, setEmailVerified } from "../../actions";
import PasswordButton from "../PasswordButton";
import ConfirmButton from "../ConfirmButton";
import EditUserForm from "../EditUserForm";
import AdminPageHeader from "../../_components/AdminPageHeader";
import KpiCard from "../../_components/KpiCard";
import MiniBarChart from "../../_components/MiniBarChart";
import SectionCard from "../../_components/SectionCard";
import { ago, dateTime, nowMs, PROVIDER_LABEL, sqlTime } from "../format";

const MODULE_LABEL: Record<QuizModule, string> = { fuehrerschein: "Lái xe", lid: "Leben in Deutschland" };
const FEEDBACK_LABEL: Record<FeedbackKind, string> = { idea: "Góp ý", bug: "Báo lỗi", content: "Nội dung", other: "Khác" };
const MASTERY_LABEL = { saved: "Mới lưu", learning: "Đang học", active: "Đang nhớ", mastered: "Thuộc" } as const;

const pct = (ok: number, n: number) => (n ? `${Math.round((ok / n) * 100)}%` : "—");

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 py-2.5 text-sm">
      <dt className="w-44 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium break-words">{children}</dd>
    </div>
  );
}

type UserTab = "overview" | "learning" | "manage";

async function Detail({ params, searchParams }: PageProps<"/admin/users/[id]">) {
  const me = await requireAdmin();
  const user = getUserById(Number((await params).id));
  if (!user) notFound();
  const sp = await searchParams;
  const tab: UserTab = sp.tab === "learning" || sp.tab === "manage" ? sp.tab : "overview";
  const locked = user.id === me.id || user.email === envAdminEmail();
  const now = nowMs();

  const stats = getStats(user.id, 0, now);
  const progress = listProgress(user.id);
  const oauth = userOAuthAccounts(user.id);
  const quiz = userQuizSummary(user.id);
  const feedback = userFeedback(user.id);
  const unlocks = userUnlockSummary(user.id);
  const starred = listStarred(user.id).length;
  const activity = userActivityDays(user.id, 30, now);
  const words = Object.values(stats.mastery).reduce((a, b) => a + b, 0);
  const sentences = progress.reduce((n, p) => n + Object.keys(p.dictDone).length, 0);
  const lastActive = userLastActive(user.id);
  const base = `/admin/users/${user.id}`;

  return (
    <>
      <AdminPageHeader
        crumbs={[
          { label: "Người dùng & Cộng đồng" },
          { label: "Người dùng", href: "/admin/users" },
          { label: `#${user.id}` },
        ]}
        title={user.name}
        description={user.email}
        actions={
          <>
            <a href={`/api/v1/admin/users/${user.id}/export`} className="btn btn-sm" download>
              <Download className="size-4" aria-hidden /> Xuất JSON
            </a>
            <Link href="/admin/users" className="btn btn-ghost btn-sm">
              <ArrowLeft className="size-4" aria-hidden /> Danh sách
            </Link>
          </>
        }
      />

      {/* Hồ sơ tóm tắt */}
      <div className="card flex flex-wrap items-center gap-4 p-4">
        <Avatar user={user} className="size-14 text-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-foreground">{user.name}</span>
            {user.id === me.id && <span className="text-xs text-muted">(bạn)</span>}
            <span className={`badge ${user.role === "admin" ? "badge-gold" : "badge-muted"}`}>{user.role === "admin" ? "Admin" : "Học viên"}</span>
            {user.emailVerified ? <span className="badge badge-ok">Email đã xác minh</span> : <span className="badge badge-coral">Email chưa xác minh</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <a href={`mailto:${user.email}`} className="font-semibold text-link hover:underline">
              {user.email}
            </a>
            <span className="font-mono tabular-nums">ID #{user.id}</span>
            <span>Hoạt động: {ago(lastActive, now)}</span>
          </div>
        </div>
      </div>

      {/* 4 KPI lõi */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          tone="gem"
          label="Kim cương"
          value={
            <span className="inline-flex items-center gap-1.5 text-gem">
              <Gem className="size-5" /> {stats.points.total.toLocaleString("vi-VN")}
            </span>
          }
          sub={`Mở khoá ${unlocks.count} bài (${unlocks.spent} 💎)`}
        />
        <KpiCard tone="laixe" label="Chuỗi ngày học" value={stats.streak} sub={stats.studiedToday ? "Hôm nay đã học" : "Hôm nay chưa học"} />
        <KpiCard tone="de" label="Sổ từ vựng" value={words} sub={`${stats.dueToday} từ đến hạn ôn`} />
        <KpiCard tone="ink" label="Bài / video học" value={progress.length} sub={`${sentences} câu chép chính tả`} />
      </div>

      {/* 3 tab con rõ ràng */}
      <div className="tabs-line">
        <Link href={base} className="tab" aria-current={tab === "overview" ? "page" : undefined}>
          <LayoutGrid className="size-4" aria-hidden /> Tổng quan
        </Link>
        <Link href={`${base}?tab=learning`} className="tab" aria-current={tab === "learning" ? "page" : undefined}>
          <BookOpen className="size-4" aria-hidden /> Tiến độ học
        </Link>
        <Link href={`${base}?tab=manage`} className="tab" aria-current={tab === "manage" ? "page" : undefined}>
          <Settings2 className="size-4" aria-hidden /> Góp ý & Quản trị
          {feedback.length > 0 && <span className="font-mono text-xs opacity-70 tabular-nums">{feedback.length}</span>}
        </Link>
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard title="Hoạt động 30 ngày" description="Ôn từ, chép chính tả, học bộ từ và thi thử (UTC).">
            <MiniBarChart data={activity.map((d) => ({ day: d.day, value: d.n }))} barClass="bg-sec" unit="lượt" heightClass="h-32" />
          </SectionCard>

          <SectionCard title="Thông tin tài khoản">
            <dl className="divide-y divide-line">
              <Row label="ID">#{user.id}</Row>
              <Row label="Đăng ký">
                {dateTime(sqlTime(user.createdAt))} <span className="text-muted">({ago(sqlTime(user.createdAt), now)})</span>
              </Row>
              <Row label="Hoạt động gần nhất">{lastActive ? `${dateTime(lastActive)} (${ago(lastActive, now)})` : "Chưa học gì"}</Row>
              <Row label="Đăng nhập bằng">
                <div className="flex flex-col gap-1">
                  <span>{user.hasPassword ? "Email + mật khẩu" : <span className="text-muted">Chưa đặt mật khẩu</span>}</span>
                  {oauth.map((o) => (
                    <span key={o.provider}>
                      {PROVIDER_LABEL[o.provider]} <span className="text-muted">· {o.email || "ẩn email"} · liên kết {o.createdAt.slice(0, 10)}</span>
                    </span>
                  ))}
                </div>
              </Row>
              <Row label="Ngôn ngữ app">{user.lang ?? <span className="text-muted">chưa chọn</span>}</Row>
              <Row label="Mở khoá bài">
                {unlocks.count} bài · đã trả {unlocks.spent} kim cương
              </Row>
            </dl>
          </SectionCard>
        </div>
      )}

      {tab === "learning" && (
        <div className="flex flex-col gap-4">
          <SectionCard title="Từ vựng & ôn tập SRS">
            <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(Object.keys(MASTERY_LABEL) as (keyof typeof MASTERY_LABEL)[]).map((k) => (
                <div key={k} className="surface flex flex-col gap-0.5 px-3 py-2.5">
                  <span className="text-xs text-muted">{MASTERY_LABEL[k]}</span>
                  <span className="font-mono text-lg font-bold tabular-nums">{stats.mastery[k]}</span>
                </div>
              ))}
            </div>
            <dl className="divide-y divide-line">
              <Row label="Nhớ lại 30 ngày">
                {pct(stats.recall30.ok, stats.recall30.n)} <span className="text-muted">({stats.recall30.n} lượt ôn)</span>
              </Row>
              <Row label="Còn nhớ sau 7 / 30 ngày">
                {pct(stats.retention7.ok, stats.retention7.n)} / {pct(stats.retention30.ok, stats.retention30.n)}
              </Row>
              <Row label="Câu ⭐ · luyện nói">
                {starred} câu · {stats.speaking.reps} lượt nói ({stats.speaking.sentences} câu)
              </Row>
              {stats.forgotten.length > 0 && (
                <Row label="Hay quên nhất">
                  {stats.forgotten.map((f) => (
                    <span key={f.id} className="mr-3 inline-block">
                      <b>{f.word}</b> <span className="text-muted">×{f.lapses}</span>
                    </span>
                  ))}
                </Row>
              )}
            </dl>
          </SectionCard>

          <SectionCard title="Lái xe · Leben in Deutschland">
            <div className="grid gap-3 sm:grid-cols-2">
              {QUIZ_MODULES.map((m) => {
                const s = quiz[m];
                return (
                  <div key={m} className="surface flex flex-col gap-2 p-3.5">
                    <div className="font-bold text-foreground">{MODULE_LABEL[m]}</div>
                    <div className="font-mono text-xs leading-relaxed tabular-nums">
                      {s.answered} câu đã làm · đúng {pct(s.ok, s.answered)}
                      <br />
                      {s.exams} bài thi · đậu {s.passed} · {s.bookmarks} câu ⭐
                    </div>
                    <div className="text-xs text-muted">{s.lastAt ? `Làm gần nhất ${ago(s.lastAt, now)}` : "Chưa làm"}</div>
                    {!locked && (s.answered > 0 || s.exams > 0 || s.bookmarks > 0) && (
                      <ConfirmButton
                        action={resetUserQuiz.bind(null, user.id, m, true)}
                        title={`Xoá tiến độ ${MODULE_LABEL[m]} của ${user.name}?`}
                        text="Xoá mọi câu đã làm, câu đánh dấu và lịch sử thi. Không hoàn tác được."
                        ok="Xoá tiến độ"
                        tone="red"
                        className="btn btn-sm mt-1 self-start"
                      >
                        <RotateCcw className="size-3.5" aria-hidden /> Xoá tiến độ
                      </ConfirmButton>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Bài học & video gần đây" aside={<span className="font-mono text-xs text-muted tabular-nums">{progress.length}</span>} flush>
            {progress.length ? (
              <ul className="divide-y divide-line">
                {progress.slice(0, 20).map((p) => {
                  const done = p.total ? Math.min(100, Math.round((p.seen.length / p.total) * 100)) : 0;
                  return (
                    <li key={p.source} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                      <Link href={p.source} className="min-w-0 flex-1 truncate font-semibold hover:text-sec-text hover:underline">
                        {p.title || p.source}
                      </Link>
                      <span className="badge badge-muted">{p.mode === "dictation" ? "Chính tả" : "Shadowing"}</span>
                      <div className="progress w-24" aria-label={`${done}%`}>
                        <div className="progress-bar" style={{ width: `${done}%` }} />
                      </div>
                      <span className="w-24 text-right font-mono text-xs text-muted tabular-nums">{ago(p.updatedAt, now)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-4 text-sm text-muted">Chưa học bài nào.</p>
            )}
          </SectionCard>
        </div>
      )}

      {tab === "manage" && (
        <div className="flex flex-col gap-4">
          {feedback.length > 0 && (
            <SectionCard title="Góp ý đã gửi" aside={<span className="font-mono text-xs text-muted tabular-nums">{feedback.length}</span>} flush>
              <ul className="divide-y divide-line">
                {feedback.map((f) => (
                  <li key={f.id} className="flex flex-col gap-1 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="badge badge-muted">{FEEDBACK_LABEL[f.kind] ?? f.kind}</span>
                      <span className="font-mono tabular-nums">{f.createdAt.slice(0, 16)} UTC</span>
                      {f.device && <span>{f.device}</span>}
                    </div>
                    <p className="text-sm whitespace-pre-line">{f.message}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard title="Quản lý & Bảo mật tài khoản">
            {locked ? (
              <p className="text-sm text-muted">
                {user.id === me.id ? "Đây là tài khoản của bạn — sửa ở trang Cài đặt cá nhân." : "Tài khoản admin chính (ADMIN_EMAIL) được bảo vệ, không sửa ở đây."}
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <EditUserForm userId={user.id} name={user.name} email={user.email} />
                <div className="divider" />
                <div className="flex flex-wrap items-center gap-2">
                  <PasswordButton userId={user.id} email={user.email} />
                  <form action={changeUserRole.bind(null, user.id, user.role === "admin" ? "user" : "admin")}>
                    <button className="btn btn-sm">
                      {user.role === "admin" ? <ShieldOff className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
                      {user.role === "admin" ? "Bỏ quyền admin" : "Cấp quyền admin"}
                    </button>
                  </form>
                  <form action={setEmailVerified.bind(null, user.id, !user.emailVerified)}>
                    <button className="btn btn-sm">
                      <BadgeCheck className="size-4" aria-hidden />
                      {user.emailVerified ? "Bỏ xác minh email" : "Đánh dấu đã xác minh"}
                    </button>
                  </form>
                  <ConfirmButton
                    action={logoutUser.bind(null, user.id)}
                    title={`Đăng xuất ${user.email} khỏi mọi thiết bị?`}
                    text="Người này phải đăng nhập lại trên web và app."
                    ok="Đăng xuất"
                    icon={<LogOut className="size-5" />}
                  >
                    <LogOut className="size-4" aria-hidden /> Đăng xuất mọi thiết bị
                  </ConfirmButton>
                  <span className="ml-auto">
                    <DeleteButton action={removeUserAndBack.bind(null, user.id)} confirmText={`Xoá tài khoản ${user.email} cùng toàn bộ dữ liệu học?`} />
                  </span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </>
  );
}

export default function UserDetailPage(props: PageProps<"/admin/users/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Detail {...props} />
    </Suspense>
  );
}
