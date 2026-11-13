import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listQuizExams } from "@/lib/db";
import { EXAM, EXAM_TOTAL, getState, prefs } from "@/lib/lid";
import { ExamHistory } from "@/components/lai-xe/ExamHistory";
import { LidShell, LidTopBar, Wappen } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Thi thử Leben in Deutschland", description: "Thi thử Leben in Deutschland / Einbürgerungstest như thật: 33 câu, 60 phút, đúng 17 câu là đậu." };

/** Màn bắt đầu thi như app: biểu tượng vàng, 3 dòng luật thi, nút đỏ "Bắt đầu thi" */
async function Start() {
  const { state } = await prefs();
  const user = await getCurrentUser();
  const history = user ? listQuizExams(user.id, "lid", 10) : [];
  return (
    <>
      <section className="flex flex-col items-center px-4 py-12 text-center sm:py-16">
        <FileText className="size-20 fill-[#ffcc00] text-[#080812]" strokeWidth={1.25} />
        <h2 className="mt-6 text-2xl font-bold">Thi thử Leben in Deutschland</h2>
        <p className="mt-6 leading-6 text-[#999]">
          • {EXAM_TOTAL} câu hỏi ({EXAM.general} chung + {EXAM.state} theo bang)
          <br />• Cần đạt {EXAM.pass}/{EXAM_TOTAL} để đậu
          <br />• Thời gian: {EXAM.minutes} phút
        </p>
        <Link href="/leben-in-deutschland/thi-thu/lam-bai" className="mt-8 rounded-full bg-[#dd0000] px-12 py-5 text-lg font-semibold text-white transition hover:brightness-110 active:scale-95">
          Bắt đầu thi
        </Link>
        <Link href="/leben-in-deutschland" className="mt-4 flex items-center gap-2 text-sm text-[#999] hover:text-white">
          <Wappen code={state.code} className="h-6 w-5" /> Câu theo bang: {state.name} · đổi ở màn chính
        </Link>
      </section>
      {user && history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold tracking-[0.1em] text-white/35">BÀI THI GẦN ĐÂY</h2>
          <ExamHistory exams={history} module="lid" stateName={(c) => getState(c)?.name ?? c} />
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <LidShell>
      <LidTopBar back="/leben-in-deutschland" title="Test" />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Start />
      </Suspense>
    </LidShell>
  );
}
