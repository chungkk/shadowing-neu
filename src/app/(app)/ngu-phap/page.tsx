import type { Metadata } from "next";
import { ChristmasGrammarIcon as GraduationCap } from "@/components/FestiveIcons";
import PageHeader from "@/components/PageHeader";
import GrammarCatalog from "@/components/grammar/GrammarCatalog";
import { ALL_GRAMMAR_SUMMARIES, GRAMMAR_CATEGORIES } from "@/lib/grammar";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({
  title: "Ngữ pháp tiếng Đức A1–B2 – 9 chương chi tiết dễ hiểu bằng tiếng Việt",
  description:
    "Hệ thống ngữ pháp tiếng Đức từ A1 đến B2 chia thành 9 chương, 58 bài chuyên sâu: 4 Cách, mạo từ, đại từ, động từ, các thì, tính từ, giới từ và cấu trúc câu kèm phát âm & bài tập nhanh.",
  path: "/ngu-phap",
});

export default function GrammarIndexPage() {
  return (
    <main className="page gap-7" data-sec="de">
      <PageHeader
        sec="de"
        icon={GraduationCap}
        mascot
        title="Ngữ pháp tiếng Đức A1–B2"
        sub="Chắt lọc trọn bộ 9 chủ điểm cốt lõi từ căn bản đến nâng cao bằng tiếng Việt dễ hiểu — đánh màu 4 Cách, có phát âm câu ví dụ tiếng Đức và bài tập kiểm tra nhanh sau mỗi bài."
        meta={
          <>
            <span className="badge border border-line bg-sidebar font-semibold text-foreground">
              {GRAMMAR_CATEGORIES.length} chương
            </span>
            <span className="badge border border-line bg-sidebar font-semibold text-foreground">
              {ALL_GRAMMAR_SUMMARIES.length} bài học
            </span>
            <span className="badge border border-ok/25 bg-ok-soft font-semibold text-ok-text">
              Miễn phí
            </span>
          </>
        }
      />

      <GrammarCatalog categories={GRAMMAR_CATEGORIES} lessons={ALL_GRAMMAR_SUMMARIES} />
    </main>
  );
}
