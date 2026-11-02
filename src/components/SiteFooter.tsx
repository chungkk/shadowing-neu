import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { contactEmail } from "@/lib/mail";
import Mascot from "./Mascot";

const COLUMNS = [
  {
    title: "Luyện tập",
    links: [
      { href: "/", label: "Bài học video" },
      { href: "/vocab", label: "Từ vựng" },
      { href: "/sprechen", label: "Luyện nói" },
      { href: "/games", label: "Game" },
    ],
  },
  {
    title: "Pháp lý",
    links: [
      { href: "/privacy", label: "Chính sách quyền riêng tư" },
      { href: "/terms", label: "Điều khoản sử dụng" },
    ],
  },
];

const linkClass = "text-sm text-foreground/85 transition hover:text-foreground hover:underline";

/** Email liên hệ đọc lúc chạy (biến môi trường trên VPS, không phải lúc build); chưa cấu hình thì ẩn */
async function Contact() {
  await connection();
  const email = contactEmail();
  if (!email) return null;
  return (
    <a href={`mailto:${email}`} className={`${linkClass} break-all`}>
      {email}
    </a>
  );
}

async function CurrentYear() {
  await connection();
  return new Date().getFullYear();
}

/** Chân trang toàn site — nền và dải cờ tràn hết chiều ngang, chỉ nội dung chừa lề khi thanh chia sẻ đang mở (share-gutter) */
export default function SiteFooter() {
  return (
    <footer className="bg-sidebar">
      <div className="candy-stripe h-2.5" />
      <div className="share-gutter">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 md:py-10">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[2fr_1fr_1fr]">
            <div className="col-span-2 flex flex-col gap-2 md:col-span-1">
              <Link href="/" className="flex w-fit items-center gap-1.5 font-display text-xl font-extrabold">
                <Mascot className="size-12" /> Deutsch Shadowing
              </Link>
              <p className="max-w-sm text-sm text-muted">Luyện nghe, nói và chép chính tả tiếng Đức với video thật.</p>
            </div>
            {COLUMNS.map((c) => (
              <nav key={c.title} aria-label={c.title} className="flex flex-col items-start gap-2.5">
                <p className="text-xs font-extrabold tracking-wider text-muted uppercase">{c.title}</p>
                {c.links.map((l) => (
                  <Link key={l.href} href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                ))}
                {c.title === "Pháp lý" && (
                  <Suspense>
                    <Contact />
                  </Suspense>
                )}
              </nav>
            ))}
          </div>
          <div className="flex flex-col gap-1 border-t border-border pt-5 text-xs text-muted sm:flex-row sm:justify-between sm:gap-4">
            <p>
              ©{" "}
              <Suspense>
                <CurrentYear />
              </Suspense>{" "}
              Deutsch Shadowing
            </p>
            <p>Video thuộc quyền sở hữu của tác giả trên YouTube.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
