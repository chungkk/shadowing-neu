import type { ComponentType, ReactNode } from "react";
import Mascot from "./Mascot";

export type Sec = "de" | "laixe" | "lid" | "game" | "ink";

/**
 * Đầu trang theo thế giới "Nhãn vở" (DESIGN.md): một khối bìa vở màu phẳng của khu vực, có gáy băng dính bên trái,
 * và một nhãn vở trắng viền đôi dán chồng lên mép dưới của bìa — tiêu đề trang nằm trên nhãn.
 *
 * - sec:      màu bìa — de (xanh lam) · laixe (vàng) · lid (coral) · game (tím) · ink (tài khoản, quản trị, thông tin)
 * - icon:     biểu tượng lucide lớn in trên bìa (góc trái)
 * - meta:     nội dung nhỏ trên bìa, góc phải (vd. số liệu, .cover-tag) — chữ màu --on-sec; tự ẩn trên điện thoại khi có mascot
 * - actions:  nút hành động, đặt dưới tiêu đề trong nhãn
 * - children: nội dung thêm trong nhãn (thanh tiến độ, chip…)
 * - mascot:   linh vật ngồi trên mép nhãn (chỉ dùng ở trang tổng quan của khu, không dùng ở mọi trang)
 * - compact:  bìa thấp hơn — cho trang con / màn danh sách
 */
export default function PageHeader({
  sec = "de",
  title,
  sub,
  icon: Icon,
  meta,
  actions,
  children,
  mascot = false,
  compact = false,
  className = "",
}: {
  sec?: Sec;
  title: ReactNode;
  sub?: ReactNode;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  mascot?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <header data-sec={sec} className={`page-head relative ${className}`}>
      <div className={`cover flex items-start justify-between gap-4 pr-4 pl-7 sm:pr-6 sm:pl-9 ${compact ? "min-h-20 pt-4 pb-12" : "min-h-28 pt-5 pb-14 sm:min-h-32"}`}>
        {Icon ? <Icon className={`${compact ? "size-7" : "size-9 sm:size-10"} shrink-0 opacity-90`} strokeWidth={2.25} /> : <span />}
        {/* Điện thoại: linh vật ngồi đúng chỗ meta → ẩn meta (thông tin này nên có trong sub) */}
        {meta && <div className={`flex min-w-0 flex-wrap items-center justify-end gap-2 text-sm font-semibold ${mascot ? "max-sm:hidden" : ""}`}>{meta}</div>}
      </div>
      <div className="relative z-10 mx-3 -mt-10 sm:mx-6 sm:max-w-[min(100%,44rem)]">
        {mascot && <Mascot className="pointer-events-none absolute -top-[4.2rem] right-3 size-20 sm:right-6 sm:size-24" />}
        <div className="nhan flex flex-col gap-2">
          <h1 className="page-title">{title}</h1>
          {sub && <div className="max-w-[60ch] text-[0.95rem] leading-relaxed text-muted">{sub}</div>}
          {children}
          {actions && <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
