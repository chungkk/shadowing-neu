import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import ConsentSettings from "@/components/company/ConsentSettings";
import { SITE } from "@/lib/company/site";
import Mascot from "./Mascot";

const COLUMNS = [
  {
    title: "Sản phẩm",
    links: [
      { href: "/tieng-duc", label: "Tiếng Đức – bài học video" },
      { href: "/vocab", label: "Từ vựng Goethe A1–B1" },
      { href: "/lai-xe", label: "Lý thuyết lái xe Đức" },
      { href: "/leben-in-deutschland", label: "Leben in Deutschland" },
      { href: "/games", label: "Trò chơi luyện từ" },
    ],
  },
  {
    title: "Về HalloVN & Pháp lý",
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

const linkClass = "text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline";

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

/** Chân trang tối giản: bề mặt trung tính, đồng bộ sáng & tối, giữ đầy đủ liên kết pháp lý Đức */
export default function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-line bg-card dark:bg-sidebar">
      <div className="share-gutter">
        <div className="footer-inner mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10 pb-8 md:px-6 md:pt-12">
          <div className="footer-cols grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.5fr_1fr_1fr]">
            <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
              <Link href="/" className="flex w-fit items-center gap-2 font-display text-lg font-extrabold tracking-[-0.03em]">
                <Mascot className="size-8" />
                <span className="flex items-center gap-1">
                  Hallo
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[0.68em] font-bold tracking-normal text-white">VN</span>
                </span>
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-muted">
                Nền tảng học tiếng Đức, ôn bằng lái xe và Leben in Deutschland miễn phí cho người Việt tại Đức.
              </p>
            </div>
            {COLUMNS.map((c) => (
              <nav key={c.title} aria-label={c.title} className="flex flex-col items-start gap-2.5">
                <p className="label">{c.title}</p>
                {c.links.map((l) => (
                  <Link key={l.href} href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                ))}
                {c.title === "Về HalloVN & Pháp lý" && (
                  <>
                    <ConsentSettings label="Cài đặt quyền riêng tư (Datenschutz-Einstellungen)" className={`${linkClass} text-left`} />
                    <Contact />
                  </>
                )}
              </nav>
            ))}
          </div>
          <div className="footer-legal flex flex-col gap-1 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:justify-between sm:gap-4">
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
