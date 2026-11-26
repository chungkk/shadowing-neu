import Link from "next/link";
import { ArrowRight, BookMarked, Car, GraduationCap, Landmark, Languages } from "lucide-react";
import Mascot from "@/components/Mascot";

const PLACES = [
  { href: "/tieng-duc", label: "Tiếng Đức – bài học video", icon: Languages },
  { href: "/ngu-phap", label: "Ngữ pháp tiếng Đức A1–B2", icon: GraduationCap },
  { href: "/vocab", label: "Kho từ vựng A1–C1", icon: BookMarked },
  { href: "/lai-xe", label: "Lý thuyết lái xe Đức", icon: Car },
  { href: "/leben-in-deutschland", label: "Leben in Deutschland", icon: Landmark },
];

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-14">
      <div className="card flex w-full flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <Mascot className="size-16 shrink-0" />
          <div>
            <p className="font-mono text-xs font-semibold tracking-widest text-muted uppercase">404 · Seite nicht gefunden</p>
            <h1 className="page-title mt-1 text-2xl">Không tìm thấy trang này</h1>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Đường dẫn có thể đã đổi hoặc nội dung đã được chuyển đi. Bạn có thể quay về trang chủ hoặc mở nhanh một khu học:
        </p>
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line">
          {PLACES.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="group flex min-h-11 items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-card-2">
                <p.icon className="size-4 text-muted group-hover:text-foreground" aria-hidden />
                <span className="flex-1">{p.label}</span>
                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/" className="btn btn-primary max-sm:w-full sm:self-start">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
