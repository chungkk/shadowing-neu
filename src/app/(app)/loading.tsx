import Mascot from "@/components/Mascot";

export default function Loading() {
  return (
    <main role="status" className="page-loader flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <Mascot loading className="size-24 sm:size-28" />
      <p className="font-display text-lg font-bold tracking-[-0.02em]">Einen Moment…</p>
      <span className="progress h-1.5 w-36" aria-hidden>
        <span className="gap-bar block h-full rounded-full bg-accent [animation-duration:4s]" />
      </span>
      <p className="text-xs text-muted">Đang mở trang, chờ chút nhé</p>
    </main>
  );
}
