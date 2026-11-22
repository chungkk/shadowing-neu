import { Fragment, type ReactNode } from "react";

type CaseTag = "nom" | "akk" | "dat" | "gen";

const CASE_STYLES: Record<CaseTag, string> = {
  nom: "font-semibold text-ok-text",
  akk: "font-semibold text-grape-text",
  dat: "font-semibold text-red-400",
  gen: "font-semibold text-amber",
};

const CASE_META: { id: CaseTag; label: string; question: string; badgeClass: string; dotClass: string }[] = [
  {
    id: "nom",
    label: "Nominativ",
    question: "Wer? / Was?",
    badgeClass: "border-ok/30 bg-ok-soft text-ok-text",
    dotClass: "bg-ok",
  },
  {
    id: "akk",
    label: "Akkusativ",
    question: "Wen? / Was?",
    badgeClass: "border-grape/30 bg-grape-soft text-grape-text",
    dotClass: "bg-grape",
  },
  {
    id: "dat",
    label: "Dativ",
    question: "Wem?",
    badgeClass: "border-red/30 bg-red-soft text-red-400",
    dotClass: "bg-red-400",
  },
  {
    id: "gen",
    label: "Genitiv",
    question: "Wessen?",
    badgeClass: "border-amber/30 bg-amber-soft text-amber",
    dotClass: "bg-amber",
  },
];

function findClosingBrace(text: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  let buf = "";
  let keyCounter = 0;

  const flush = () => {
    if (buf) {
      nodes.push(<Fragment key={`${keyPrefix}-t-${keyCounter++}`}>{buf}</Fragment>);
      buf = "";
    }
  };

  while (i < text.length) {
    // 1. Thẻ màu cách: {nom:...}, {akk:...}, {dat:...}, {gen:...}
    if (text[i] === "{") {
      const m = text.slice(i).match(/^\{(nom|akk|dat|gen):/);
      if (m) {
        const closeIdx = findClosingBrace(text, i);
        if (closeIdx !== -1) {
          flush();
          const tag = m[1] as CaseTag;
          const inner = text.slice(i + m[0].length, closeIdx);
          const k = `${keyPrefix}-c-${keyCounter++}`;
          nodes.push(
            <span key={k} className={CASE_STYLES[tag]}>
              {parseInline(inner, k)}
            </span>,
          );
          i = closeIdx + 1;
          continue;
        }
      }
    }

    // 2. In đậm: **...**
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1 && end > i + 2) {
        flush();
        const inner = text.slice(i + 2, end);
        const k = `${keyPrefix}-b-${keyCounter++}`;
        nodes.push(
          <strong key={k} className="font-semibold text-foreground">
            {parseInline(inner, k)}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // 3. In nghiêng: *...* (không bắt đầu bằng dấu cách)
    if (text[i] === "*" && text[i + 1] !== "*" && text[i + 1] !== " ") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1 && end > i + 1 && text[end - 1] !== " ") {
        flush();
        const inner = text.slice(i + 1, end);
        const k = `${keyPrefix}-i-${keyCounter++}`;
        nodes.push(
          <em key={k} className="italic">
            {parseInline(inner, k)}
          </em>,
        );
        i = end + 1;
        continue;
      }
    }

    buf += text[i];
    i++;
  }

  flush();
  return nodes;
}

/**
 * Hiển thị chuỗi ngữ pháp có hỗ trợ:
 * - Màu 4 cách: {nom:...}, {akk:...}, {dat:...}, {gen:...}
 * - **in đậm**, *in nghiêng*, và xuống dòng (\n)
 */
export function GrammarText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const rendered = lines.map((line, idx) => (
    <Fragment key={idx}>
      {idx > 0 && <br />}
      {parseInline(line, `l${idx}`)}
    </Fragment>
  ));

  return className ? <span className={className}>{rendered}</span> : <>{rendered}</>;
}

/** Chú giải màu 4 Cách (Nominativ · Akkusativ · Dativ · Genitiv) */
export function CaseLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-1.5"
          : "flex flex-wrap items-center gap-2 rounded-xl border border-line bg-sidebar/80 px-3.5 py-2.5"
      }
      aria-label="Chú giải màu 4 cách tiếng Đức"
    >
      {!compact && <span className="mr-1 text-xs font-semibold text-muted">Màu 4 Cách:</span>}
      {CASE_META.map((c) => (
        <span
          key={c.id}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.badgeClass}`}
        >
          <span className={`size-1.5 rounded-full ${c.dotClass}`} aria-hidden />
          <span>{c.label}</span>
          {!compact && <span className="font-normal opacity-80">({c.question})</span>}
        </span>
      ))}
    </div>
  );
}
