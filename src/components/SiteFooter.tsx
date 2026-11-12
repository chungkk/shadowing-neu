import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { contactEmail } from "@/lib/mail";
import Mascot from "./Mascot";

const COLUMNS = [
  {
    title: "Luyện tập",
    links: [
      { href: "/", label: "Tiếng Đức – bài học video" },
      { href: "/vocab", label: "Từ vựng" },
      { href: "/lai-xe", label: "Lý thuyết lái xe" },
      { href: "/leben-in-deutschland", label: "Leben in Deutschland" },
      { href: "/games", label: "Game" },
    ],
  },
  {
    title: "Pháp lý",
    links: [
      { href: "/deutsch-shadowing/privacy", label: "Chính sách quyền riêng tư" },
      { href: "/deutsch-shadowing/terms", label: "Điều khoản sử dụng" },
      { href: "/privacy", label: "Datenschutz (ckk.biz)" },
      { href: "/impressum", label: "Impressum" },
      { href: "/about", label: "Về CKK · App & dịch vụ" },
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
        <div className="footer-inner mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 md:py-10">
          {/* footer-cols: màn học ẩn phần cột link (globals.css) — chỉ còn dòng bản quyền */}
          <div className="footer-cols grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[2fr_1fr_1fr]">
            <div className="col-span-2 flex flex-col gap-2 md:col-span-1">
              <Link href="/" className="flex w-fit items-center gap-1.5 font-display text-xl font-extrabold">
                <Mascot className="size-12" /> CKK
              </Link>
              <p className="max-w-sm text-sm text-muted">Học tiếng Đức với video thật, ôn thi lái xe và Leben in Deutschland — một tài khoản cho tất cả.</p>
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
          <div className="footer-legal flex flex-col gap-1 border-t border-border pt-5 text-xs text-muted sm:flex-row sm:justify-between sm:gap-4">
            <p>
              ©{" "}
              <Suspense>
                <CurrentYear />
              </Suspense>{" "}
              CKK ·{" "}
              <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
                ckk.biz
              </Link>
            </p>
            <p>Video thuộc quyền sở hữu của tác giả trên YouTube.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
