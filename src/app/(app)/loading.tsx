import Mascot from "@/components/Mascot";

/** Màn chờ khi chuyển trang mà trang đích chưa kịp hiện (trang đã có sẵn khung sẽ hiện skeleton của nó thay vì màn này) */
export default function Loading() {
  return (
    <main role="status" className="page-loader flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <Mascot loading className="size-36 sm:size-44" />
      <p className="font-display text-xl font-extrabold">Einen Moment…</p>
      <span className="progress mt-1 h-1.5 w-32 overflow-hidden" aria-hidden>
        <span className="candy-bar gap-bar block h-full rounded-full [animation-duration:4s]" />
      </span>
      <p className="text-sm text-muted">Đang tải trang</p>
    </main>
  );
}
