import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers, Play } from "lucide-react";
import { dueCount } from "@/lib/db";
import { percent, unfinished } from "@/lib/progress";
import TodayStreak from "./TodayStreak";

const TILE = "group tile sticker-link flex min-h-24 min-w-0 flex-col gap-1 p-3.5";
const HEAD = "flex items-center gap-2 text-xs font-semibold text-muted";

/**
 * Dải "Hôm nay" trong hero trang chủ (đã đăng nhập): học tiếp bài dở · số từ đến hạn ôn · chuỗi ngày + điểm hôm nay.
 * Trả lời ngay "hôm nay học gì" — mỗi ô 1 chạm là vào việc.
 */
export default function TodayStrip({ userId }: { userId: number }) {
  const [cont] = unfinished(userId, 1);
  const due = dueCount(userId);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      {cont ? (
        <Link href={cont.href} className={`${TILE} max-sm:col-span-2`}>
          <span className={HEAD}>
            <span className="icon-bubble tint-accent size-7 rounded-xl">
              <Play className="size-4" />
            </span> Học tiếp · {percent(cont.p)}%
          </span>
          <span className="line-clamp-2 text-sm leading-snug font-bold">{cont.title}</span>
        </Link>
      ) : (
        <a href="#lessons" className={`${TILE} max-sm:col-span-2`}>
          <span className={HEAD}>
            <span className="icon-bubble tint-accent size-7 rounded-xl">
              <Play className="size-4" />
            </span> Bắt đầu
          </span>
          <span className="text-sm font-bold">Chọn một bài trong thư viện bên dưới</span>
        </a>
      )}
      {due ? (
        <Link href="/vocab/notebook?review=1" className={TILE}>
          <span className={HEAD}>
            <span className="icon-bubble tint-red size-7 rounded-xl">
              <Layers className="size-4" />
            </span> Từ đến hạn ôn
          </span>
          <span className="font-display text-xl leading-tight font-bold tabular-nums">{due} từ</span>
          <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-link">
            Ôn ngay <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      ) : (
        <Link href="/vocab" className={TILE}>
          <span className={HEAD}>
            <span className="icon-bubble tint-ok size-7 rounded-xl">
              <CheckCircle2 className="size-4" />
            </span> Từ đến hạn ôn
          </span>
          <span className="font-display text-xl leading-tight font-bold text-ok-text">Xong hết!</span>
          <span className="mt-auto inline-flex items-center gap-1 text-xs text-muted">
            Học thêm bộ từ mới <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}
      <TodayStreak />
    </div>
  );
}
