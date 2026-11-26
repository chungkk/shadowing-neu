"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkPlus, ChevronRight, Info } from "lucide-react";
import { saveOwnLessonAction } from "@/app/(app)/watch/actions";
import { emitPoints } from "@/lib/points";
import { lessonPath } from "@/lib/slug";
import { LoginLink } from "./auth/LoginDialog";

/**
 * Dưới video tự dán (/watch): học thử thì không lưu tiến độ → mời lưu miễn phí thành bài học riêng.
 * own: người này đã có bài riêng của video → link sang bài.
 */
export default function SaveOwnLesson({
  videoId,
  loggedIn,
  own,
}: {
  videoId: string;
  loggedIn: boolean;
  own: string | null; // slug bài riêng đã có
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const busy = pending || done;

  if (own) {
    return (
      <div className="surface flex flex-wrap items-center gap-3 text-sm">
        <p className="min-w-0 flex-1">Bạn đã lưu video này thành bài học riêng — học ở đó để lưu tiến độ và luyện Chính tả.</p>
        <Link href={lessonPath(own)} className="btn btn-primary btn-sm max-sm:w-full">
          Mở bài riêng <ChevronRight className="size-4" />
        </Link>
      </div>
    );
  }

  const save = () => {
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
        <span>
          Đang xem thử — lưu thành bài học riêng (miễn phí) để lưu tiến độ từng câu và mở chế độ Chính tả. Từ vựng bạn bấm lưu vẫn vào Sổ từ.
        </span>
      </p>
      <p className="flex flex-wrap items-center gap-1.5 font-bold">
        <BookmarkPlus className="size-4 text-sec-text" /> Lưu thành bài học riêng (miễn phí)
      </p>
      <p className="text-muted">
        Phụ đề được làm kỹ hơn (Whisper AI nghe lại khi video chỉ có phụ đề tự động), lưu tiến độ, có chế độ Chính tả — chỉ mình bạn thấy. Bài riêng không tính kim cương xếp hạng.
      </p>
      {!loggedIn ? (
        <LoginLink href="/login" className="btn btn-primary self-start max-sm:w-full">
          Đăng nhập để lưu miễn phí
        </LoginLink>
      ) : (
        <button onClick={save} disabled={busy} className="btn btn-primary self-start max-sm:w-full">
          {done
            ? "Đang vào bài…"
            : pending
              ? "Đang tạo bài… (có thể mất 1–2 phút)"
              : "Lưu thành bài học riêng"}
        </button>
      )}
      {error && (
        <p role="alert" className="alert alert-err">
          {error}
        </p>
      )}
    </div>
  );
}
