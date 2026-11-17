import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";
import { FAIL_TEXT, formatDuration, type ExamRecord } from "@/lib/laixe/rules";

/** Bảng các bài thi đã làm (bấm cả dòng để xem lại). Điện thoại: gộp ngày giờ vào cột bài thi */
export function ExamHistory({ exams, module = "fuehrerschein", stateName }: { exams: ExamRecord[]; module?: "fuehrerschein" | "lid"; stateName?: (code: string) => string }) {
  const base = module === "lid" ? "/leben-in-deutschland" : "/lai-xe";
  const lid = module === "lid";
  return (
    <div className="card table-wrap p-0">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Kết quả</th>
            <th scope="col">Bài thi</th>
            <th scope="col" className="text-right">
              {lid ? "Đúng" : "Điểm lỗi"}
            </th>
            <th scope="col" className="hidden sm:table-cell">
              Thời gian
            </th>
            <th scope="col" className="w-8">
              <span className="sr-only">Xem lại</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {exams.map((e) => {
            const when = new Date(e.at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
            const name = lid ? `Thi thử · ${stateName?.(e.cls) ?? e.cls}` : e.kind === "bogen" ? `Đề mẫu ${e.ref}` : `Thi thử hạng ${e.cls}`;
            return (
              <tr key={e.id} className="relative cursor-pointer">
                <td>
                  {e.passed ? (
                    <span className="badge badge-ok">
                      <Check className="size-3.5" aria-hidden /> Đậu
                    </span>
                  ) : (
                    <span className="badge badge-red">
                      <X className="size-3.5" aria-hidden /> Trượt
                    </span>
                  )}
                </td>
                <td className="min-w-0">
                  {/* Link phủ cả dòng (after:inset-0) → bấm chỗ nào trên dòng cũng mở bài */}
                  <Link href={`${base}/thi-thu/${e.id}`} className="font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-ui focus-visible:after:ring-2 focus-visible:after:ring-accent">
                    {name}
                  </Link>
                  <span className="block text-xs text-muted">
                    <span className="sm:hidden">
                      {when} · {formatDuration(e.durationS)}
                      {!lid && e.failReason ? " · " : ""}
                    </span>
                    {!lid && e.failReason ? <span className="text-red-400">{FAIL_TEXT[e.failReason]}</span> : null}
                  </span>
                </td>
                <td className="text-right font-extrabold whitespace-nowrap tabular-nums">
                  {lid ? (
                    `${e.correct}/${e.total}`
                  ) : (
                    <>
                      {e.errorPoints}/{e.maxErrorPoints}
                      <span className="block text-xs font-semibold text-muted">
                        đúng {e.correct}/{e.total}
                      </span>
                    </>
                  )}
                </td>
                <td className="hidden text-sm whitespace-nowrap text-muted tabular-nums sm:table-cell">
                  {when} · {formatDuration(e.durationS)}
                </td>
                <td className="pl-0">
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
