"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkPlus, ChevronRight, Info } from "lucide-react";
import { saveOwnLessonAction } from "@/app/(app)/watch/actions";
import { emitPoints } from "@/lib/points";
import { lessonPath } from "@/lib/slug";
import { LoginLink } from "./auth/LoginDialog";
import { Gem } from "./PointsBadge";

const fmt = (n: number) => n.toLocaleString("vi-VN");

/**
 * Dưới video tự dán (/watch): học thử thì không lưu gì → mời lưu thành bài học riêng (trừ kim cương).
 * own: người này đã có bài riêng của video → link sang bài · price 0 = admin (miễn phí)
 */
export default function SaveOwnLesson({
  videoId,
  title,
  loggedIn,
  price,
  points,
  own,
}: {
  videoId: string;
  title: string;
  loggedIn: boolean;
  price: number;
  points: number;
  own: string | null; // slug bài riêng đã có
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const short = points < price;
  const busy = pending || done;

  if (own) {
    return (
      <div className="surface flex flex-wrap items-center gap-3 text-sm">
        <p className="min-w-0 flex-1">Bạn đã lưu video này thành bài học riêng — học ở đó để lưu tiến độ.</p>
        <Link href={lessonPath(own)} className="btn btn-primary btn-sm max-sm:w-full">
          Mở bài riêng <ChevronRight className="size-4" />
        </Link>
      </div>
    );
  }

  const save = () => {
    const ask = price
      ? `Đổi ${fmt(price)} kim cương để lưu “${title}” thành bài học riêng? Bạn đang có ${fmt(points)}.`
      : `Lưu “${title}” thành bài học riêng?`;
    if (!confirm(ask)) return;
    start(async () => {
      setError("");
      const r = await saveOwnLessonAction(videoId);
      if (r.error || !r.slug) return setError(r.error ?? "Không lưu được bài, thử lại sau.");
      if (r.points !== undefined) emitPoints({ total: r.points });
      setDone(true);
      router.push(lessonPath(r.slug));
    });
  };

  return (
    <div className="surface flex flex-col gap-2.5 text-sm">
      <p className="flex items-start gap-1.5 text-muted">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>Đang học thử — video tự dán không lưu tiến độ, đóng trang là mất.</span>
      </p>
      <p className="flex flex-wrap items-center gap-1 font-bold">
        <BookmarkPlus className="size-4 text-sec-text" /> Lưu thành bài học riêng
        {price > 0 && (
          <>
            {" "}
            · <Gem className="size-4" /> <span className="text-gem">{fmt(price)}</span>
          </>
        )}
      </p>
      <p className="text-muted">
        Phụ đề được làm kỹ hơn (Whisper AI nghe lại khi video chỉ có phụ đề tự động), lưu tiến độ, có chế độ Chính tả — chỉ mình bạn thấy. Bài riêng không tính kim cương xếp hạng.
      </p>
      {!loggedIn ? (
        <LoginLink href="/login" className="btn btn-primary self-start max-sm:w-full">
          Đăng nhập để lưu
        </LoginLink>
      ) : (
        <>
          {short && (
            <p className="text-muted">
              Bạn đang có <span className="font-bold text-gem">{fmt(points)}</span> kim cương — chép chính tả đúng mỗi từ ở các bài học được +1.
            </p>
          )}
          <button onClick={save} disabled={busy || short} className="btn btn-primary self-start max-sm:w-full">
            {done
              ? "Đang vào bài…"
              : pending
                ? "Đang tạo bài… (có thể mất 1–2 phút)"
                : short
                  ? `Cần thêm ${fmt(price - points)} kim cương`
                  : price
                    ? `Lưu bài · ${fmt(price)} kim cương`
                    : "Lưu thành bài học riêng"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="alert alert-err">
          {error}
        </p>
      )}
    </div>
  );
}
