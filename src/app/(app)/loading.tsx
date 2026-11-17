import Mascot from "@/components/Mascot";

/** Màn chờ khi chuyển trang mà trang đích chưa kịp hiện (trang đã có sẵn khung sẽ hiện skeleton của nó thay vì màn này) */
export default function Loading() {
  return (
    <main role="status" className="page-loader flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <Mascot loading className="size-32 sm:size-40" />
      <p className="font-display text-2xl font-extrabold tracking-[-0.02em]">Einen Moment…</p>
      {/* Băng ba màu của ba cuốn vở chạy dần — như đang lật trang */}
      <span className="progress h-2 w-40" aria-hidden>
        <span className="candy-bar gap-bar block h-full rounded-full [animation-duration:4s]" />
      </span>
      <p className="text-sm text-muted">Đang mở trang, chờ chút nhé</p>
    </main>
  );
}
