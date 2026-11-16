import Link from "next/link";
import { CheckCircle2, Layers, Play } from "lucide-react";
import { dueCount } from "@/lib/db";
import { percent, unfinished } from "@/lib/progress";
import TodayStreak from "./TodayStreak";

const TILE = "tile sticker-link flex min-w-0 flex-col gap-1";
const HEAD = "flex items-center gap-2 text-xs font-bold text-muted";

/**
 * Dải "Hôm nay" trong hero trang chủ (đã đăng nhập): học tiếp bài dở · số từ đến hạn ôn · chuỗi ngày + điểm hôm nay.
 * Trả lời ngay "hôm nay học gì" — mỗi ô 1 chạm là vào việc.
 */
export default function TodayStrip({ userId }: { userId: number }) {
  const [cont] = unfinished(userId, 1);
  const due = dueCount(userId);
  return (
    <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      {cont ? (
        <Link href={cont.href} className={TILE}>
          <span className={HEAD}>
            <span className="icon-bubble tint-accent size-7 rounded-xl">
              <Play className="size-4" />
            </span> Học tiếp · {percent(cont.p)}%
          </span>
          <span className="line-clamp-2 text-sm leading-snug font-extrabold">{cont.title}</span>
        </Link>
      ) : (
        <a href="#lessons" className={TILE}>
          <span className={HEAD}>
            <span className="icon-bubble tint-accent size-7 rounded-xl">
              <Play className="size-4" />
            </span> Bắt đầu
          </span>
          <span className="text-sm font-extrabold">Chọn một bài trong thư viện bên dưới</span>
        </a>
      )}
      {due ? (
        <Link href="/vocab/notebook?review=1" className={TILE}>
          <span className={HEAD}>
            <span className="icon-bubble tint-red size-7 rounded-xl">
              <Layers className="size-4" />
            </span> Từ đến hạn ôn
          </span>
          <span className="font-display text-xl leading-tight font-extrabold tabular-nums">{due} từ</span>
          <span className="text-xs font-extrabold text-accent-text">Ôn ngay →</span>
        </Link>
      ) : (
        <Link href="/vocab" className={TILE}>
          <span className={HEAD}>
            <span className="icon-bubble tint-accent size-7 rounded-xl">
              <CheckCircle2 className="size-4" />
            </span> Từ đến hạn ôn
          </span>
          <span className="font-display text-xl leading-tight font-extrabold">Xong hết!</span>
          <span className="text-xs text-muted">Học thêm bộ từ mới →</span>
        </Link>
      )}
      <TodayStreak />
    </div>
  );
}
