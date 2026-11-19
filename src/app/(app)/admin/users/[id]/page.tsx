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
import { ArrowLeft, BadgeCheck, Download, LogOut, RotateCcw, ShieldCheck, ShieldOff } from "lucide-react";
import AdminNav from "../../AdminNav";
import DeleteButton from "../../DeleteButton";
import { changeUserRole, logoutUser, removeUserAndBack, resetUserQuiz, setEmailVerified } from "../../actions";
import PasswordButton from "../PasswordButton";
import ConfirmButton from "../ConfirmButton";
import EditUserForm from "../EditUserForm";
import { ago, dateTime, nowMs, PROVIDER_LABEL, sqlTime } from "../format";

const MODULE_LABEL: Record<QuizModule, string> = { fuehrerschein: "Lái xe", lid: "Leben in Deutschland" };
const FEEDBACK_LABEL: Record<FeedbackKind, string> = { idea: "Góp ý", bug: "Báo lỗi", content: "Nội dung", other: "Khác" };
const MASTERY_LABEL = { saved: "Mới lưu", learning: "Đang học", active: "Đang nhớ", mastered: "Thuộc" } as const;

const pct = (ok: number, n: number) => (n ? `${Math.round((ok / n) * 100)}%` : "—");

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="section-title flex-1">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="tile stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

/** Dòng "nhãn: giá trị" trong khối thông tin tài khoản */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 py-2 text-sm">
      <dt className="w-40 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium break-words">{children}</dd>
    </div>
  );
}

async function Detail({ params }: PageProps<"/admin/users/[id]">) {
  const me = await requireAdmin();
  const user = getUserById(Number((await params).id));
  if (!user) notFound();
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
  const maxDay = Math.max(1, ...activity.map((d) => d.n));
  const activeDays = activity.filter((d) => d.n).length;

  return (
    <>
      <Link href="/admin/users" className="btn btn-ghost btn-sm self-start">
        <ArrowLeft className="size-4" aria-hidden /> Danh sách người dùng
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <Avatar user={user} className="size-16 text-2xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="page-title flex flex-wrap items-center gap-2">
            <span className="min-w-0 truncate">{user.name}</span>
            {user.id === me.id && <span className="text-sm font-medium text-muted">(bạn)</span>}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <a href={`mailto:${user.email}`} className="min-w-0 truncate font-semibold text-link hover:underline">
              {user.email}
            </a>
            <span className={`badge ${user.role === "admin" ? "badge-gold" : "badge-muted"}`}>{user.role === "admin" ? "Admin" : "Học viên"}</span>
            {user.emailVerified ? <span className="badge badge-ok">Email đã xác minh</span> : <span className="badge badge-coral">Email chưa xác minh</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          value={
            <span className="inline-flex items-center gap-1 text-gem">
              <Gem className="size-6" /> {stats.points.total}
            </span>
          }
          label="Kim cương"
        />
        <Stat value={stats.streak} label={`Chuỗi ngày${stats.studiedToday ? " · hôm nay đã học" : ""}`} />
        <Stat value={words} label={`Từ trong sổ · ${stats.dueToday} tới hạn`} />
        <Stat value={progress.length} label={`Bài / video · ${sentences} câu chép`} />
      </div>

      <Section title="Tài khoản">
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
      </Section>

      <Section title="Hoạt động 30 ngày" aside={<span className="text-xs text-muted">{activeDays} ngày có học · UTC</span>}>
        <div className="flex h-20 items-end gap-[3px]" role="img" aria-label={`Số lượt học mỗi ngày trong 30 ngày qua, ${activeDays} ngày có học`}>
          {activity.map((d) => (
            <div
              key={d.day}
              title={`${d.day}: ${d.n} lượt`}
              className={`min-w-0 flex-1 rounded-t-sm ${d.n ? "bg-sec" : "bg-card-2"}`}
              style={{ height: `${d.n ? Math.max(8, (d.n / maxDay) * 100) : 4}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[0.7rem] text-muted tabular-nums">
          <span>{activity[0].day.slice(5)}</span>
          <span>hôm nay</span>
        </div>
      </Section>

      <Section title="Từ vựng & ôn tập">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(MASTERY_LABEL) as (keyof typeof MASTERY_LABEL)[]).map((k) => (
            <Stat key={k} value={stats.mastery[k]} label={MASTERY_LABEL[k]} />
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
      </Section>

      <Section title="Bài đang học" aside={<span className="text-xs text-muted tabular-nums">{progress.length}</span>}>
        {progress.length ? (
          <ul className="divide-y divide-line">
            {progress.slice(0, 15).map((p) => {
              const done = p.total ? Math.min(100, Math.round((p.seen.length / p.total) * 100)) : 0;
              return (
                <li key={p.source} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <Link href={p.source} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                    {p.title || p.source}
                  </Link>
                  <span className="badge badge-muted">{p.mode === "dictation" ? "Chính tả" : "Shadowing"}</span>
                  <div className="progress w-20" aria-label={`${done}%`}>
                    <div className="progress-bar" style={{ width: `${done}%` }} />
                  </div>
                  <span className="w-24 text-right text-xs text-muted tabular-nums">{ago(p.updatedAt, now)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Chưa học bài nào.</p>
        )}
        {progress.length > 15 && <p className="text-xs text-muted">… và {progress.length - 15} bài khác</p>}
      </Section>

      <Section title="Lái xe · Leben in Deutschland">
        <div className="grid gap-2 sm:grid-cols-2">
          {QUIZ_MODULES.map((m) => {
            const s = quiz[m];
            return (
              <div key={m} className="tile flex flex-col gap-2">
                <div className="font-semibold">{MODULE_LABEL[m]}</div>
                <div className="text-sm tabular-nums">
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
                    className="btn btn-sm self-start"
                  >
                    <RotateCcw className="size-3.5" aria-hidden /> Xoá tiến độ
                  </ConfirmButton>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {feedback.length > 0 && (
        <Section title="Góp ý đã gửi" aside={<span className="text-xs text-muted tabular-nums">{feedback.length}</span>}>
          <ul className="divide-y divide-line">
            {feedback.map((f) => (
              <li key={f.id} className="flex flex-col gap-1 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="badge badge-muted">{FEEDBACK_LABEL[f.kind] ?? f.kind}</span>
                  <span className="tabular-nums">{f.createdAt.slice(0, 16)} UTC</span>
                  {f.device && <span>{f.device}</span>}
                </div>
                <p className="text-sm whitespace-pre-line">{f.message}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Quản lý">
        {locked ? (
          <p className="text-sm text-muted">
            {user.id === me.id ? "Đây là tài khoản của bạn — sửa ở trang Cài đặt." : "Tài khoản admin chính (ADMIN_EMAIL) không sửa được ở đây."}
          </p>
        ) : (
          <>
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
              <a href={`/api/v1/admin/users/${user.id}/export`} className="btn btn-sm" download>
                <Download className="size-4" aria-hidden /> Tải dữ liệu (JSON)
              </a>
              <span className="ml-auto">
                <DeleteButton action={removeUserAndBack.bind(null, user.id)} confirmText={`Xoá tài khoản ${user.email} cùng toàn bộ dữ liệu học?`} />
              </span>
            </div>
          </>
        )}
        {locked && (
          <a href={`/api/v1/admin/users/${user.id}/export`} className="btn btn-sm self-start" download>
            <Download className="size-4" aria-hidden /> Tải dữ liệu (JSON)
          </a>
        )}
      </Section>
    </>
  );
}

export default function UserDetailPage(props: PageProps<"/admin/users/[id]">) {
  return (
    <main className="page page-narrow">
      <AdminNav />
      <Suspense fallback={<ListSkeleton />}>
        <Detail {...props} />
      </Suspense>
    </main>
  );
}
