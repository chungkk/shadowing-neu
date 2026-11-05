import type { ReactNode } from "react";

/** Khung giữ chỗ (fallback của <Suspense>): dáng giống nội dung thật để trang không nhảy khi dữ liệu tới */

const Bone = ({ className = "" }: { className?: string }) => <div className={`skeleton ${className}`} />;

/** Lưới thẻ bài học (trang chủ) — khớp LessonGrid */
export function LessonGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section className="flex flex-col gap-4 sm:gap-5" aria-busy="true" aria-label="Đang tải bài học">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Bone className="h-7 w-52 md:h-8" />
        <div className="flex gap-2 max-sm:w-full sm:ml-auto">
          {Array.from({ length: 4 }, (_, i) => (
            <Bone key={i} className="h-9 w-16 rounded-xl" />
          ))}
        </div>
      </div>
      {/* Điện thoại: 1 hàng vuốt ngang như thẻ thật */}
      <div className="max-sm:-mx-4 max-sm:flex max-sm:gap-3 max-sm:overflow-hidden max-sm:px-4 sm:grid sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card max-sm:w-[78vw] max-sm:shrink-0">
            <Bone className="aspect-video rounded-none" />
            <div className="flex flex-col gap-2 p-3 sm:p-4">
              <div className="flex min-h-[2.75em] flex-col gap-1.5">
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-2/3" />
              </div>
              <Bone className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Trang luyện (bài học / video YouTube) — khớp 3 cột của ShadowPlayer */
export function PlayerSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6" aria-busy="true">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Bone className="h-9 w-10 rounded-xl sm:w-28" />
        <Bone className="h-6 min-w-0 flex-1 sm:max-w-md" />
        <div className="flex gap-2 max-sm:basis-full">
          {Array.from({ length: 3 }, (_, i) => (
            <Bone key={i} className="h-9 w-24 rounded-xl" />
          ))}
        </div>
      </div>
      {children}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* Cột 1: video + thanh điều khiển */}
        <div className="card flex flex-col gap-3 self-start max-sm:p-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <Bone className="h-4 w-14" />
            <Bone className="h-8 w-20" />
          </div>
          <Bone className="aspect-video rounded-2xl" />
          <Bone className="h-13 rounded-2xl" />
        </div>
        {/* Cột 2: câu hiện tại */}
        <div className="card flex flex-col gap-3 self-start max-sm:p-3 sm:gap-4">
          <Bone className="mx-auto h-9 w-52 rounded-xl" />
          <div className="flex min-h-40 flex-col gap-3 rounded-2xl border border-border bg-background/60 p-4 sm:min-h-48 sm:p-5">
            <Bone className="h-4 w-24" />
            <Bone className="h-5 w-full" />
            <Bone className="h-5 w-3/4" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Bone className="h-12 rounded-xl" />
            <Bone className="h-12 rounded-xl" />
          </div>
        </div>
        {/* Cột 3: transcript */}
        <div className="card flex flex-col gap-3 max-sm:p-3 lg:col-span-2 xl:col-span-1">
          <Bone className="h-6 w-32" />
          <Bone className="h-3 rounded-full" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2">
              <Bone className="size-7 shrink-0 rounded-full" />
              <Bone className={`h-4 ${i % 2 ? "w-4/5" : "w-full"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sổ từ vựng — khớp VocabList */
export function VocabSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Đang tải từ vựng">
      <div className="flex flex-col gap-1.5">
        <Bone className="h-8 w-44" />
        <Bone className="h-4 w-56" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Bone className="h-11 w-full rounded-xl sm:w-auto sm:flex-1" />
        <Bone className="h-11 flex-1 rounded-xl sm:w-44 sm:flex-none" />
        <Bone className="h-11 w-28 rounded-xl" />
        <Bone className="h-11 w-11 rounded-xl" />
      </div>
      {[4, 3].map((rows, s) => (
        <section key={s} className="flex flex-col gap-2">
          <Bone className="h-5 w-32" />
          <ul className="card divide-y divide-border p-0">
            {Array.from({ length: rows }, (_, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-4 py-3 lg:grid-cols-[13rem_15rem_minmax(0,1fr)_auto]">
                <div className="flex flex-col gap-1.5">
                  <Bone className="h-5 w-28" />
                  <Bone className="h-3 w-20" />
                </div>
                <div className="col-start-2 row-start-1 flex gap-1 lg:col-start-4">
                  {Array.from({ length: 3 }, (_, j) => (
                    <Bone key={j} className="size-8" />
                  ))}
                </div>
                <Bone className="col-span-2 h-9 rounded-xl lg:col-span-1" />
                <Bone className="col-span-2 h-4 self-center lg:col-span-1" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Trang cài đặt — khớp SettingsForms (hồ sơ + các khung) */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <section className="card flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-6">
        <Bone className="size-24 rounded-full" />
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Bone className="h-6 w-40" />
          <Bone className="h-4 w-52" />
          <Bone className="h-9 w-28 rounded-xl" />
        </div>
      </section>
      {Array.from({ length: 2 }, (_, i) => (
        <section key={i} className="card flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <Bone className="h-6 w-40" />
            <Bone className="h-4 w-64 max-w-full" />
          </div>
          <Bone className="h-12 rounded-xl" />
          <Bone className="h-12 rounded-xl" />
        </section>
      ))}
    </div>
  );
}

/** Danh sách hàng trong 1 khung (trang quản trị) */
export function ListSkeleton({ rows = 6, thumb = false, title = true }: { rows?: number; thumb?: boolean; title?: boolean }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {title && <Bone className="h-8 w-48" />}
      <div className="card divide-y divide-border p-0">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            {thumb && <Bone className="h-12 w-20" />}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Bone className={`h-4 ${i % 2 ? "w-1/2" : "w-2/3"}`} />
              <Bone className="h-3 w-32" />
            </div>
            <Bone className="h-9 w-16 rounded-xl max-sm:hidden" />
            <Bone className="h-9 w-16 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Biểu mẫu (thêm / sửa bài học, sửa phụ đề) */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="card flex flex-col gap-4" aria-busy="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Bone className="h-4 w-24" />
          <Bone className="h-12 rounded-xl" />
        </div>
      ))}
      <Bone className="h-60 rounded-xl" />
      <Bone className="h-11 w-32 self-end rounded-xl" />
    </div>
  );
}

/** Trang Từ vựng (kho bộ từ) — khớp src/app/vocab/page.tsx */
export function DecksSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải bộ từ vựng">
      <section className="flex flex-col gap-3">
        <Bone className="h-7 w-44" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-2.5 sm:p-3">
              <Bone className="aspect-[16/10] w-full rounded-xl" />
              <Bone className="h-5 w-3/4" />
              <Bone className="h-4 w-12" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Bảng xếp hạng — khớp trang /leaderboard */
export function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Đang tải bảng xếp hạng">
      <Bone className="h-20 rounded-2xl" />
      <div className="card flex flex-col divide-y divide-border overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <Bone className="size-8 rounded-full" />
            <Bone className="size-9 rounded-full" />
            <Bone className="h-4 flex-1" />
            <Bone className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
