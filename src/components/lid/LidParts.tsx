import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Info } from "lucide-react";

/**
 * Khung trang chung của phần Leben in Deutschland — cùng kiểu với tab Lái xe:
 * khung giữa màn hình, dùng màu theo giao diện sáng / tối của trang.
 */
export function LidShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main className={`mx-auto flex w-full flex-col gap-5 p-4 md:p-6 ${wide ? "max-w-4xl" : "max-w-3xl"}`}>{children}</main>;
}

/** Thanh đầu màn con như Lái xe: [←] Tiêu đề  [nút phải] */
export function LidTopBar({ back, title, right }: { back: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={back} className="btn-icon" aria-label="Quay lại">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold">{title}</h1>
      {right}
    </div>
  );
}

/** Huy hiệu bang (ảnh từ app) */
export function Wappen({ code, className = "h-10 w-8" }: { code: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/lid/wappen/${code}.png`} alt="" className={`${className} rounded-sm object-contain`} loading="lazy" />;
}

/** Hộp nhắc nhỏ (điều kiện đậu…) */
export function LidInfo({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-gold/50 bg-gold/10 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-gold/15 text-gold" aria-hidden>
        <Info className="size-4" />
      </span>
      <p className="text-sm font-bold">{children}</p>
    </div>
  );
}
