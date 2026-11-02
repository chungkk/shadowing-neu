import { Fragment, Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { LEGAL, legalPath, type LegalDoc, type LegalLang } from "@/lib/legal";
import { contactEmail } from "@/lib/mail";

/** Email liên hệ đọc lúc chạy (biến môi trường trên VPS, không phải lúc build) */
async function ContactEmail() {
  await connection();
  const email = contactEmail();
  return email ? (
    <a href={`mailto:${email}`} className="font-bold text-accent hover:underline">
      {email}
    </a>
  ) : (
    <span>—</span>
  );
}

/** Chuỗi có "{email}" → chèn link email liên hệ */
function Text({ s }: { s: string }) {
  const parts = s.split("{email}");
  return parts.map((p, i) => (
    <Fragment key={i}>
      {p}
      {i < parts.length - 1 && (
        <Suspense fallback={<span>…</span>}>
          <ContactEmail />
        </Suspense>
      )}
    </Fragment>
  ));
}

const OTHER: Record<LegalDoc, { doc: LegalDoc; vi: string; de: string }> = {
  privacy: { doc: "terms", vi: "Điều khoản sử dụng", de: "Nutzungsbedingungen" },
  terms: { doc: "privacy", vi: "Chính sách quyền riêng tư", de: "Datenschutzerklärung" },
};

/** Trang Chính sách quyền riêng tư / Điều khoản sử dụng (app mở trang này trong trình duyệt nhúng) */
export default function LegalPage({ doc, lang }: { doc: LegalDoc; lang: LegalLang }) {
  const c = LEGAL[doc][lang];
  const other = OTHER[doc];
  return (
    <main lang={lang} className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{c.updated}</p>
        <nav className="flex rounded-xl bg-card-2 p-1 text-sm font-bold">
          {(["vi", "de"] as const).map((l) => (
            <Link
              key={l}
              href={legalPath(doc, l)}
              className={`rounded-lg px-3 py-1 ${l === lang ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
            >
              {l === "vi" ? "Tiếng Việt" : "Deutsch"}
            </Link>
          ))}
        </nav>
      </div>
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold">{c.title}</h1>
        <p className="leading-relaxed text-foreground/85">{c.intro}</p>
      </header>
      {c.sections.map((s) => (
        <section key={s.h} className="card flex flex-col gap-3 p-5">
          <h2 className="text-lg font-extrabold">{s.h}</h2>
          {s.body.map((b, i) =>
            typeof b === "string" ? (
              <p key={i} className="leading-relaxed text-foreground/85">
                <Text s={b} />
              </p>
            ) : (
              <ul key={i} className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-foreground/85 marker:text-accent">
                {b.map((li) => (
                  <li key={li}>
                    <Text s={li} />
                  </li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
      <p className="text-sm text-muted">
        <Link href={legalPath(other.doc, lang)} className="font-bold text-link hover:underline">
          {other[lang]} →
        </Link>
      </p>
    </main>
  );
}
