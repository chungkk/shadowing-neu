import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BarChart3, Info, LogIn, Star } from "lucide-react";
import { LoginLink } from "../auth/LoginDialog";

/**
 * Khung trang chung của phần Leben in Deutschland — cùng kiểu với tab Lái xe:
 * khung .page (max-w-6xl, thẳng hàng thanh subnav) cho mọi tab để chuyển tab không nhảy khung.
 */
export function LidShell({ children }: { children: ReactNode }) {
  return <main className="page">{children}</main>;
}

/** Thanh đầu màn con như Lái xe: [←] Tiêu đề  [nút phải] */
export function LidTopBar({ back, title, right }: { back: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={back} className="btn-icon" aria-label="Quay lại">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="page-title min-w-0 flex-1 truncate">{title}</h1>
      {right}
    </div>
  );
}

/** Huy hiệu bang (ảnh từ app) */
export function Wappen({ code, className = "h-10 w-8" }: { code: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/lid/wappen/${code}.png`} alt="" width={64} height={80} className={`${className} rounded-sm object-contain`} loading="lazy" />;
}

/** Khách mở trang làm bài thi: mời đăng nhập ngay (không phát đề, không chạy đồng hồ) */
export function ExamLoginGate({ next }: { next: string }) {
  return (
    <section className="card flex flex-col gap-4 sm:p-6">
      <LidTopBar back={next} title="Thi thử cần tài khoản" />
      <p className="lead">Đăng ký miễn phí để làm bài thi thử 33 câu như thật, xem điểm và ôn lại câu sai sau mỗi lần thi.</p>
      <ul className="surface flex flex-col gap-2.5 text-sm font-semibold">
        <li className="flex items-center gap-3">
          <span className="icon-bubble tint-gold size-8 shrink-0" aria-hidden>
            <BarChart3 className="size-4" />
          </span>
          Lưu lịch sử các lần thi và tiến độ học
        </li>
        <li className="flex items-center gap-3">
          <span className="icon-bubble tint-gold size-8 shrink-0" aria-hidden>
            <Star className="size-4" />
          </span>
          Tự đánh dấu câu làm sai để ôn lại
        </li>
      </ul>
      <LoginLink href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary btn-lg self-stretch sm:self-start">
        <LogIn className="size-4" /> Đăng nhập / Đăng ký
      </LoginLink>
    </section>
  );
}

/** Hộp nhắc nhỏ (điều kiện đậu…) */
export function LidInfo({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-warn items-center">
      <span className="icon-bubble tint-gold size-8 shrink-0" aria-hidden>
        <Info className="size-4" />
      </span>
      <p className="font-bold">{children}</p>
    </div>
  );
}
