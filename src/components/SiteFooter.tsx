import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import ConsentSettings from "@/components/company/ConsentSettings";
import { SITE } from "@/lib/company/site";
import Mascot from "./Mascot";

const COLUMNS = [
  {
    title: "Luyện tập",
    links: [
      { href: "/tieng-duc", label: "Tiếng Đức – bài học video" },
      { href: "/vocab", label: "Từ vựng" },
      { href: "/lai-xe", label: "Lý thuyết lái xe" },
      { href: "/leben-in-deutschland", label: "Leben in Deutschland" },
      { href: "/games", label: "Game" },
    ],
  },
  {
    title: "Về HalloVN",
    // Trang chung của website hallovn.de; ?lang=vi để mở sẵn bản tiếng Việt (mặc định tiếng Đức)
    links: [
      { href: "/about?lang=vi", label: "Giới thiệu HalloVN" },
      { href: "/support?lang=vi", label: "Hỗ trợ & câu hỏi thường gặp" },
      { href: "/terms?lang=vi", label: "Điều khoản sử dụng" },
      { href: "/privacy?lang=vi", label: "Chính sách bảo mật" },
      { href: "/refund?lang=vi", label: "Mua hàng & hoàn tiền" },
      { href: "/impressum?lang=vi", label: "Thông tin pháp lý (Impressum)" },
    ],
  },
];

const linkClass = "text-sm text-foreground/85 transition hover:text-foreground hover:underline";

/** Email liên hệ công khai — cố định theo SITE.contactEmail (khớp trang doanh nghiệp), không đọc biến môi trường SMTP */
function Contact() {
  return (
    <a href={`mailto:${SITE.contactEmail}`} className={`${linkClass} break-all`}>
      {SITE.contactEmail}
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
        <div className="footer-inner mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 md:py-10">
          {/* footer-cols: màn học ẩn phần cột link (globals.css) — chỉ còn dòng bản quyền */}
          <div className="footer-cols grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[2fr_1fr_1fr]">
            <div className="col-span-2 flex flex-col gap-2 md:col-span-1">
              <Link href="/" className="flex w-fit items-center gap-1.5 font-display text-xl font-extrabold">
                <Mascot className="size-12" /> HalloVN
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
                {c.title === "Về HalloVN" && (
                  <>
                    {/* Mở lại hộp đồng ý quảng cáo của Google (rút lại đồng ý phải dễ như khi đồng ý — Art. 7 Abs. 3 DSGVO) */}
                    <ConsentSettings label="Cài đặt quyền riêng tư (Datenschutz-Einstellungen)" className={linkClass} />
                    <Contact />
                  </>
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
              HalloVN ·{" "}
              <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
                hallovn.de
              </Link>
            </p>
            <p>Video thuộc quyền sở hữu của tác giả trên YouTube.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
