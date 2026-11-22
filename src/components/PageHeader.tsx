import type { ComponentType, ReactNode } from "react";
import Mascot from "./Mascot";

export type Sec = "de" | "laixe" | "lid" | "dub" | "ink";

/**
 * Đầu trang tối giản kiểu Linear / Notion:
 * - Không bìa màu lớn hay nhãn chồng; giải phóng không gian dọc trên điện thoại.
 * - sec:      màu nhấn nhẹ cho ô biểu tượng và thanh tiến độ bên trong (de · laixe · lid · ink)
 * - icon:     biểu tượng lucide nhỏ đặt cạnh tiêu đề
 * - meta:     thông tin bổ sung gọn (nhãn hạng, bang, lời nhắc…)
 * - actions:  cụm nút hành động nằm gọn bên phải (trên điện thoại tự xếp dưới)
 * - children: nội dung mở rộng ngay dưới đầu trang (thanh tiến độ, bộ lọc trình độ…)
 * - mascot:   linh vật nhỏ trang trí tiết chế ở trang tổng quan
 * - compact:  đệm dọc gọn hơn cho trang con
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
    <header
      data-sec={sec}
      className={`page-head flex flex-col gap-4 border-b border-line ${compact ? "pb-4" : "pb-5 sm:pb-6"} ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
          {Icon && (
            <span
              className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-xl border border-line bg-sec-soft text-sec-text ${
                compact ? "size-9" : "size-10 sm:size-11"
              }`}
              aria-hidden
            >
              <Icon className={compact ? "size-[18px]" : "size-5"} strokeWidth={2} />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="page-title">{title}</h1>
              {meta && (
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-muted">
                  {meta}
                </div>
              )}
            </div>
            {sub && <div className="max-w-[62ch] text-sm leading-relaxed text-muted sm:text-[0.9375rem]">{sub}</div>}
          </div>
        </div>

        {(actions || mascot) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:justify-end">
            {actions}
            {mascot && <Mascot className="pointer-events-none hidden size-12 opacity-90 sm:block" />}
          </div>
        )}
      </div>

      {children && <div className="flex flex-col gap-3">{children}</div>}
    </header>
  );
}
