import type { ReactNode } from "react";
import type { Block } from "@/lib/news";

/** **đậm**, [chữ](https://…) và link trần https://… → phần tử React (không dùng HTML thô: nội dung do người gõ) */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g;
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
    else {
      const href = m[3] ?? m[4];
      out.push(
        <a key={k++} href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-link underline underline-offset-2">
          {m[2] ?? m[4]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function NewsText({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-4 text-[1.05rem] leading-relaxed">
      {blocks.map((b, i) =>
        b.kind === "h" ? (
          <h2 key={i} className="pt-2 text-xl font-extrabold">
            {inline(b.text)}
          </h2>
        ) : b.kind === "ul" ? (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-6">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {inline(b.text)}
          </p>
        ),
      )}
    </div>
  );
}
