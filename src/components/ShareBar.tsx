"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Link2, Share2 } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

/** Logo các mạng xã hội (đường vẽ từ simple-icons, khung 24×24) */
const NETWORKS = [
  {
    name: "Facebook",
    color: "bg-[#1877F2]",
    path: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
    url: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  },
  {
    name: "X",
    color: "bg-black ring-1 ring-white/20",
    path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
    url: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
  },
  {
    name: "LinkedIn",
    color: "bg-[#0A66C2]",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    url: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  },
  {
    name: "Telegram",
    color: "bg-[#26A5E4]",
    path: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
    url: (u: string, t: string) => `https://t.me/share/url?url=${u}&text=${t}`,
  },
  {
    name: "WhatsApp",
    color: "bg-[#25D366]",
    path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
    url: (u: string, t: string) => `https://wa.me/?text=${t}%20${u}`,
  },
];

/** Chỉ hiện ở nơi có nội dung đáng chia sẻ: bài học (/watch/…, /<slug>) và bộ từ (/vocab/decks/…) */
const RESERVED = /^\/(admin|settings|stats|vocab|games|leaderboard|sprechen|login|register|forgot-password|privacy|terms)(\/|$)/;
const shareable = (p: string) => /^\/(watch|vocab\/decks)\/./.test(p) || (/^\/[^/]+$/.test(p) && !RESERVED.test(p));

/** Link trang đang xem (bỏ ?query) + tiêu đề trang */
const current = () => ({ url: location.origin + location.pathname, title: document.title });

const round = "flex size-10 cursor-pointer items-center justify-center rounded-full transition";

/**
 * Thanh chia sẻ nổi ở mép phải (máy tính): nút chia sẻ của hệ điều hành, các mạng xã hội, chép link, thu gọn.
 * Đang mở → body có [data-share-open] → nội dung chừa lề phải (globals.css) để thanh không che.
 */
export default function ShareBar() {
  const pathname = usePathname();
  const [open, setOpen] = useLocalStorage("share-bar-open", false); // mặc định thu gọn thành 1 nút
  const [copied, setCopied] = useState(false);
  if (!shareable(pathname)) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current().url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  // Có bảng chia sẻ của hệ điều hành (Safari, Edge…) → mở bảng đó (có cả Zalo, Messenger, Mail…); không thì chép link
  const shareNative = () => {
    const { url, title } = current();
    if (navigator.share) navigator.share({ url, title }).catch(() => {});
    else void copy();
  };
  const openNetwork = (n: (typeof NETWORKS)[number]) => {
    const { url, title } = current();
    window.open(n.url(encodeURIComponent(url), encodeURIComponent(title)), "_blank", "noopener,noreferrer,width=640,height=600");
  };

  if (!open) {
    return (
      <button
        title="Hiện nút chia sẻ"
        className="fixed top-1/2 right-0 z-30 flex -translate-y-1/2 cursor-pointer flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-border bg-card px-1.5 py-3 text-muted shadow-lg transition hover:text-foreground max-md:hidden"
        onClick={() => setOpen(true)}
      >
        <ChevronLeft className="size-4" />
        <Share2 className="size-4" />
      </button>
    );
  }

  return (
    <aside
      data-share-open
      aria-label="Chia sẻ trang này"
      className="fixed top-1/2 right-0 z-30 flex -translate-y-1/2 flex-col items-center gap-2.5 rounded-l-2xl border border-r-0 border-border bg-card/95 p-2.5 shadow-xl shadow-black/40 backdrop-blur max-md:hidden"
    >
      <button title="Chia sẻ" className={`${round} border-2 border-border text-foreground hover:border-accent hover:text-accent-text`} onClick={shareNative}>
        <Share2 className="size-[18px]" />
      </button>
      <div className="h-px w-6 bg-border" />
      {NETWORKS.map((n) => (
        <button key={n.name} title={`Chia sẻ lên ${n.name}`} className={`${round} ${n.color} text-white hover:scale-110`} onClick={() => openNetwork(n)}>
          <svg viewBox="0 0 24 24" className="size-[18px] fill-current" aria-hidden>
            <path d={n.path} />
          </svg>
        </button>
      ))}
      <button
        title={copied ? "Đã chép link" : "Chép link"}
        className={`${round} ${copied ? "bg-accent text-white" : "bg-card-2 text-foreground hover:bg-foreground/15"}`}
        onClick={copy}
      >
        {copied ? <Check className="size-[18px]" /> : <Link2 className="size-[18px]" />}
      </button>
      <div className="h-px w-6 bg-border" />
      <button title="Thu gọn" className={`${round} border-2 border-border text-muted hover:text-foreground`} onClick={() => setOpen(false)}>
        <ChevronRight className="size-[18px]" />
      </button>
    </aside>
  );
}
