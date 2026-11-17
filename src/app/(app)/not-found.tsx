import Link from "next/link";
import { ArrowRight, Car, Landmark, Languages } from "lucide-react";
import Mascot from "@/components/Mascot";

const PLACES = [
  { href: "/tieng-duc", label: "Tiếng Đức", icon: Languages },
  { href: "/lai-xe", label: "Lái xe", icon: Car },
  { href: "/leben-in-deutschland", label: "Leben in DE", icon: Landmark },
];

/** 404 trong khung app: bìa vở mực in số 404, nhãn vở có lời nhắn + lối về ba khu học, linh vật ngồi trên mép nhãn */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:py-16">
      <div data-sec="ink" className="relative">
        <div className="cover flex min-h-36 flex-col items-start gap-1.5 pt-5 pr-5 pb-16 pl-9 sm:pl-11">
          <span className="font-display text-6xl leading-none font-extrabold tracking-[-0.05em] tabular-nums sm:text-7xl">404</span>
          <span className="text-sm font-semibold opacity-80">Seite nicht gefunden</span>
        </div>
        <div className="relative z-10 mx-3 -mt-11 sm:mx-6">
          <Mascot className="bob pointer-events-none absolute -top-[4.6rem] right-4 size-24 sm:right-6" />
          <div className="nhan flex flex-col gap-3 pb-5">
            <h1 className="page-title">Trang này không có trong vở</h1>
            <p className="leading-relaxed text-muted">Có thể đường dẫn đã đổi, hoặc bài học đã được dời sang chỗ khác. Về trang chủ, hoặc mở thẳng một khu học:</p>
            <ul className="flex flex-col">
              {PLACES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="nhan-line group flex min-h-11 items-center gap-2.5 py-2 font-semibold hover:text-link">
                    <p.icon className="size-[18px] text-muted group-hover:text-link" aria-hidden />
                    {p.label}
                    <ArrowRight className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-link" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/" className="btn btn-primary btn-lg mt-2 max-sm:w-full sm:self-start">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
