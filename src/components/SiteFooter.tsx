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

const linkClass = "text-sm text-white/75 underline-offset-4 transition-colors hover:text-white hover:underline";

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
    // Bìa sau cuốn vở: nền mực, gáy ba màu (Tiếng Đức · Lái xe · LiD) dọc mép trên
    <footer data-sec="ink" className="relative mt-12 bg-[#16203a] text-white dark:bg-sidebar">
      <div className="candy-stripe absolute inset-x-0 top-0 h-1.5" aria-hidden />
      <div className="share-gutter">
        <div className="footer-inner mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pt-12 pb-8 md:px-6 md:pt-14">
          {/* footer-cols: màn học ẩn phần cột link (globals.css) — chỉ còn dòng bản quyền */}
          <div className="footer-cols grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.6fr_1fr_1fr]">
            <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
              <Link href="/" className="flex w-fit items-center gap-2 font-display text-2xl font-extrabold tracking-[-0.03em]">
                <Mascot className="size-12" /> Hallo
                <span className="-ml-2 -rotate-3 rounded-[5px] bg-gold px-1 text-[0.8em] text-[#16203a]">VN</span>
              </Link>
              <p className="max-w-xs font-display text-lg leading-snug font-semibold text-white/90">Tiếng Đức, bằng lái, quốc tịch — một cuốn vở cho người Việt ở Đức.</p>
            </div>
            {COLUMNS.map((c) => (
              <nav key={c.title} aria-label={c.title} className="flex flex-col items-start gap-3">
                <p className="text-xs font-bold tracking-[0.06em] text-gold uppercase">{c.title}</p>
                {c.links.map((l) => (
                  <Link key={l.href} href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                ))}
                {c.title === "Về HalloVN" && (
                  <>
                    {/* Mở lại hộp đồng ý quảng cáo của Google (rút lại đồng ý phải dễ như khi đồng ý — Art. 7 Abs. 3 DSGVO) */}
                    <ConsentSettings label="Cài đặt quyền riêng tư (Datenschutz-Einstellungen)" className={`${linkClass} text-left`} />
                    <Contact />
                  </>
                )}
              </nav>
            ))}
          </div>
          <div className="footer-legal flex flex-col gap-1 border-t border-white/15 pt-5 text-xs text-white/60 sm:flex-row sm:justify-between sm:gap-4">
            <p>
              ©{" "}
              <Suspense>
                <CurrentYear />
              </Suspense>{" "}
              HalloVN ·{" "}
              <Link href="/about" className="underline underline-offset-2 hover:text-white">
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
