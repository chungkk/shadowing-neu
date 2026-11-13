import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Khung chung của phần Leben in Deutschland — giống app "LiD Ckk":
 * nền đen xanh đêm, hai đốm sáng xanh / đỏ, chữ trắng. Luôn tối (lớp .theme-lid).
 */
export function LidShell({ children, glow = false, wide = false }: { children: ReactNode; glow?: boolean; wide?: boolean }) {
  return (
    <main className="theme-lid relative isolate min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      {glow && (
        <>
          <span aria-hidden className="pointer-events-none absolute -top-24 -right-20 -z-10 size-80 rounded-full bg-[#003399]/40 blur-[90px]" />
          <span aria-hidden className="pointer-events-none absolute bottom-20 -left-24 -z-10 size-64 rounded-full bg-[#dd0000]/15 blur-[80px]" />
        </>
      )}
      <div className={`mx-auto flex w-full flex-col gap-4 p-4 md:p-6 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>{children}</div>
    </main>
  );
}

/** Nút tròn xám như app ("Quay lại", "Đánh dấu", "‹ trước"…) */
export const pill = "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#333] px-4 py-2 text-sm text-white transition hover:bg-[#3d3d3d] active:bg-[#2a2a2a] disabled:cursor-default disabled:opacity-30";

/** Thanh đầu màn con: [Quay lại]  Tiêu đề  [nút phải] */
export function LidTopBar({ back, title, right }: { back: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={back} className={pill}>
        Quay lại
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-center text-base">{title}</h1>
      {right ?? <span className="w-20 shrink-0" aria-hidden />}
    </div>
  );
}

/** Huy hiệu bang (ảnh từ app) */
export function Wappen({ code, className = "h-10 w-8" }: { code: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/lid/wappen/${code}.png`} alt="" className={`${className} rounded-sm object-contain`} loading="lazy" />;
}

/** Hộp nhắc vàng ở cuối màn chính */
export function LidInfo({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-[#ffcc00]/20 bg-[#ffcc00]/[0.07] p-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ffcc00]/15 text-[#ffcc00]" aria-hidden>
        ✓
      </span>
      <p className="text-sm leading-5 text-[#ffcc00]/80">{children}</p>
    </div>
  );
}
