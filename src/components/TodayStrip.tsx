import Link from "next/link";
import { CheckCircle2, Layers, Play } from "lucide-react";
import { dueCount } from "@/lib/db";
import { percent, unfinished } from "./ContinueLearning";
import TodayStreak from "./TodayStreak";

const TILE = "tile sticker-link flex min-w-0 flex-col gap-0.5";

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
          <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <Play className="size-4 text-accent-text" /> Học tiếp · {percent(cont.p)}%
          </span>
          <span className="line-clamp-2 text-sm leading-snug font-extrabold">{cont.title}</span>
        </Link>
      ) : (
        <a href="#lessons" className={TILE}>
          <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <Play className="size-4 text-accent-text" /> Bắt đầu
          </span>
          <span className="text-sm font-extrabold">Chọn một bài trong thư viện bên dưới</span>
        </a>
      )}
      {due ? (
        <Link href="/vocab/notebook?review=1" className={TILE}>
          <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <Layers className="size-4 text-red" /> Từ đến hạn ôn
          </span>
          <span className="text-xl font-extrabold tabular-nums">{due} từ</span>
          <span className="text-xs font-extrabold text-accent-text">Ôn ngay →</span>
        </Link>
      ) : (
        <Link href="/vocab" className={TILE}>
          <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <CheckCircle2 className="size-4 text-accent-text" /> Từ đến hạn ôn
          </span>
          <span className="text-xl font-extrabold">Xong hết!</span>
          <span className="text-xs text-muted">Học thêm bộ từ mới →</span>
        </Link>
      )}
      <TodayStreak />
    </div>
  );
}
