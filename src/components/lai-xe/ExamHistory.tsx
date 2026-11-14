import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FAIL_TEXT, formatDuration, type ExamRecord } from "@/lib/fuehrerschein-rules";

/** Danh sách bài thi đã làm (bấm để xem lại) */
export function ExamHistory({ exams, module = "fuehrerschein", stateName }: { exams: ExamRecord[]; module?: "fuehrerschein" | "lid"; stateName?: (code: string) => string }) {
  const base = module === "lid" ? "/leben-in-deutschland" : "/lai-xe";
  return (
    <ul className="flex flex-col gap-2">
      {exams.map((e) => (
        <li key={e.id}>
          <Link href={`${base}/thi-thu/${e.id}`} className="tile sticker-link flex items-center gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink text-lg font-extrabold ${e.passed ? "bg-accent text-white" : "bg-red text-white"}`} aria-label={e.passed ? "Đậu" : "Trượt"}>
              {e.passed ? "✓" : "✗"}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-extrabold">
                {module === "lid"
                  ? `Thi thử · ${stateName?.(e.cls) ?? e.cls} · đúng ${e.correct}/${e.total}`
                  : `${e.kind === "bogen" ? `Đề mẫu ${e.ref}` : `Thi thử hạng ${e.cls}`} · ${e.errorPoints}/${e.maxErrorPoints} điểm lỗi`}
              </span>
              <span className="text-sm text-muted">
                {new Date(e.at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" })}{module === "lid" ? "" : ` · đúng ${e.correct}/${e.total}`} · {formatDuration(e.durationS)}
                {e.failReason && module !== "lid" ? ` · ${FAIL_TEXT[e.failReason]}` : ""}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
