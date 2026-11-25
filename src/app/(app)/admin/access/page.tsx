import { Suspense } from "react";
import Link from "next/link";
import { Coins, LockOpen, Sparkles, Trophy, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { earnableFreePoints } from "@/lib/access";
import { POINTS_CORRECT } from "@/lib/dictation";
import { getLeaderboard, lessonUnlockStats, listLessons } from "@/lib/db";
import LevelBadge from "@/components/LevelBadge";
import { ListSkeleton } from "@/components/Skeleton";
import AdminPageHeader from "../_components/AdminPageHeader";
import KpiCard from "../_components/KpiCard";
import SectionCard from "../_components/SectionCard";

const fmt = (n: number) => n.toLocaleString("vi-VN");

async function AccessContent() {
  const admin = await requireAdmin();
  const lessons = listLessons({ includeDrafts: false });
  const earnable = earnableFreePoints();
  const dictLessons = lessons.filter((l) => l.dictation).length;
  const board = getLeaderboard(admin.id, 10);
  const stats = lessonUnlockStats();

  const sorted = [...lessons].sort(
    (a, b) => (b.dictation ? b.wordCount ?? 0 : 0) - (a.dictation ? a.wordCount ?? 0 : 0),
  );

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Vận hành & Hệ thống" }, { label: "Kim cương & Xếp hạng" }]}
        title="Kim cương & Bảng xếp hạng"
        description="Toàn bộ bài học đã đăng đều mở tự do. Kim cương chỉ dùng để tích điểm chính tả trên bảng xếp hạng."
        actions={
          <Link href="/leaderboard" className="btn btn-sm">
            <Trophy className="size-4" aria-hidden /> Xem bảng xếp hạng
          </Link>
        }
      />

      <SectionCard
        title="Chế độ truy cập bài học"
        description="Mọi bài học đã đăng đều mở tự do cho tất cả người học. Gõ đúng mỗi từ chính tả được +1 💎, bấm xem gợi ý −2 💎."
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="badge badge-ok gap-1.5">
            <LockOpen className="size-3.5" aria-hidden /> Mở toàn bộ bài học (không khoá)
          </span>
          <span className="badge badge-gem">{fmt(dictLessons)} bài có tính điểm Dictation</span>
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard tone="gem" label="Tổng 💎 tối đa thư viện" value={earnable} sub={`Từ ${fmt(dictLessons)} bài bật Dictation`} icon={<Coins className="size-4" aria-hidden />} />
        <KpiCard tone="de" label="Học viên có hạng" value={board.players} sub="Có điểm chính tả > 0" icon={<Users className="size-4" aria-hidden />} href="/leaderboard" />
        <KpiCard tone="ink" label="Dẫn đầu hiện tại" value={board.top[0]?.total ?? 0} sub={board.top[0] ? board.top[0].name : "Chưa có ai"} icon={<Trophy className="size-4" aria-hidden />} href="/leaderboard" />
        <KpiCard tone="laixe" label="Bài riêng tự tạo" value={stats.own} sub="Không tính điểm xếp hạng" icon={<Sparkles className="size-4" aria-hidden />} href="/admin/lessons?tab=own" />
      </div>

      <SectionCard
        title="Điểm kim cương tối đa theo từng bài học"
        description={`Tổng cộng ${fmt(lessons.length)} bài đã đăng, sắp xếp theo lượng kim cương tối đa từ cao xuống thấp.`}
        aside={
          <Link href="/admin/lessons" className="text-xs font-semibold text-link hover:underline">
            Về danh sách bài học →
          </Link>
        }
        flush
      >
        {sorted.length ? (
          <ul className="divide-y divide-line">
            {sorted.map((l) => {
              const pts = l.dictation ? (l.wordCount ?? 0) * POINTS_CORRECT : 0;
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors hover:bg-card-2/50">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link href={`/admin/${l.id}`} className="truncate text-sm font-semibold text-foreground hover:text-sec-text">
                      {l.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <LevelBadge level={l.level} className="text-[11px]" />
                      {l.channel && <span className="truncate">{l.channel}</span>}
                      <span className="font-mono tabular-nums">{l.sentenceCount} câu</span>
                    </div>
                  </div>
                  {l.dictation ? (
                    <span className="badge badge-gem font-mono tabular-nums">+{fmt(pts)} 💎</span>
                  ) : (
                    <span className="badge badge-muted">Tắt Dictation (0 💎)</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-4 text-sm text-muted">Chưa có bài học nào đã đăng.</p>
        )}
      </SectionCard>
    </>
  );
}

export default function AdminAccessPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <AccessContent />
    </Suspense>
  );
}
