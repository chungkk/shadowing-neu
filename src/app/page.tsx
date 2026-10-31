import { Suspense } from "react";
import { connection } from "next/server";
import { Headphones, Mic, PenLine } from "lucide-react";
import { listLessons } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import ContinueLearning from "@/components/ContinueLearning";
import { RecentVideos } from "@/components/RecentVideos";

const NEW_MS = 3 * 86_400_000; // bài đăng trong 3 ngày → nhãn "Mới" (lâu hơn thì gần như bài nào cũng "Mới")

/** Dữ liệu thẻ bài: chỉ gửi xuống trình duyệt những gì thẻ cần */
function lessonItems() {
  const now = Date.now();
  return listLessons().map((l) => ({
    id: l.id,
    title: l.title,
    videoId: l.videoId,
    level: l.level,
    description: l.description,
    sentences: l.sentenceCount ?? l.segmentCount,
    isNew: now - +new Date(l.createdAt.replace(" ", "T") + "Z") < NEW_MS,
  }));
}

async function Lessons() {
  await connection(); // đọc DB lúc request, không prerender
  return <LessonGrid lessons={lessonItems()} />;
}

/** Đã đăng nhập: bài đang học dở (lưu trên server) · khách: video đã mở trong trình duyệt này */
async function Continue() {
  const user = await getCurrentUser();
  return user ? <ContinueLearning userId={user.id} /> : <RecentVideos />;
}

const FEATURES = [
  { icon: Headphones, label: "Nghe từng câu" },
  { icon: Mic, label: "Nói theo, ghi âm, so sánh" },
  { icon: PenLine, label: "Chép chính tả" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 p-4 md:p-6">
      <section className="card relative flex flex-col gap-5 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold md:text-3xl">Luyện nói tiếng Đức với video thật</h1>
          <p className="max-w-3xl text-muted">
            Chọn một bài trong thư viện bên dưới, hoặc dán link YouTube bất kỳ — phụ đề được lấy tự động.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <li key={f.label} className="pill bg-card-2 py-1 text-sm text-foreground">
              <f.icon className="size-4 text-accent" /> {f.label}
            </li>
          ))}
        </ul>
        <YouTubeUrlForm />
      </section>

      <Suspense>
        <Continue />
      </Suspense>

      <Suspense fallback={<p className="text-sm text-muted">Đang tải bài học…</p>}>
        <Lessons />
      </Suspense>
    </main>
  );
}
