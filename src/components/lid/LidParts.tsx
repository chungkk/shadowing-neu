import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BarChart3, LogIn, Star } from "lucide-react";
import { LoginLink } from "../auth/LoginDialog";
import Mascot from "../Mascot";

/**
 * Khung trang chung của phần Leben in Deutschland — cùng kiểu với tab Lái xe:
 * khung .page (max-w-6xl, thẳng hàng thanh subnav) cho mọi tab để chuyển tab không nhảy khung.
 */
export function LidShell({ children }: { children: ReactNode }) {
  return (
    <main className="page" data-sec="lid">
      {children}
    </main>
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
    <section className="card flex flex-col gap-5 sm:p-8">
      <Link href={next} className="btn btn-ghost btn-sm hit-44 -ml-2 self-start text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Thi thử
      </Link>
      <div className="flex items-center gap-4">
        <Mascot className="size-20 sm:size-24" />
        <h1 className="page-title">Thi thử cần tài khoản</h1>
      </div>
      <p className="lead max-w-[52ch]">Đăng ký miễn phí để làm bài thi thử 33 câu như thật, xem điểm và ôn lại câu sai sau mỗi lần thi.</p>
      <ul className="flex flex-col text-[0.95rem] font-medium">
        <li className="flex items-center gap-3 border-b border-line py-3 dark:border-border">
          <BarChart3 className="size-5 shrink-0 text-sec-text" aria-hidden />
          Lưu lịch sử các lần thi và tiến độ học
        </li>
        <li className="flex items-center gap-3 py-3">
          <Star className="size-5 shrink-0 text-sec-text" aria-hidden />
          Tự đánh dấu câu làm sai để ôn lại
        </li>
      </ul>
      <LoginLink href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary btn-lg self-stretch sm:self-start">
        <LogIn className="size-4" /> Đăng nhập / Đăng ký
      </LoginLink>
    </section>
  );
}
