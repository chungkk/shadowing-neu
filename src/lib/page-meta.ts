import type { Metadata } from "next";
import type { Deck, DeckTopic } from "@/lib/decks";

type PageMetaInput = {
  /** Tiêu đề trang (template của layout tự thêm tên thương hiệu); dùng `absolute` khi đã tự ghi tên thương hiệu */
  title: string | { absolute: string };
  description: string;
  /** Đường dẫn tương đối, vd "/tieng-duc" — metadataBase của layout ghép thành URL đầy đủ */
  path: string;
  image?: { url: string; width?: number; height?: number; alt?: string };
  type?: "website" | "article" | "video.other";
};

/**
 * Metadata SEO chung cho trang công khai: canonical + Open Graph + Twitter.
 * openGraph của trang THAY HẲN openGraph của layout (gộp nông) → ghi lại siteName / locale.
 * Không ghi og:title / og:description: Next tự lấy từ title (đã qua template, có tên thương hiệu) và description.
 */
export function pageMeta({ title, description, path, image, type = "website" }: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, url: path, siteName: "HalloVN", locale: "vi_VN", ...(image && { images: [image] }) },
    // Không có ảnh riêng → og:image / twitter:image lấy ảnh mặc định src/app/(app)/opengraph-image.tsx
    twitter: { card: "summary_large_image", ...(image && { images: [image.url] }) },
  };
}

/** Ảnh thumbnail YouTube (hqdefault luôn có, 480×360) */
export const youtubeThumb = (videoId: string, alt?: string) => ({ url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, width: 480, height: 360, alt });

/** Cắt mô tả về ≤160 ký tự (gọn một dòng), cắt thì thêm "…" */
export function clip(text: string, max = 160) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Metadata trang 1 bộ từ (/vocab/decks/<slug>) hoặc 1 chủ đề trong bộ (/vocab/decks/<slug>/<chủ đề>) */
export function deckMeta(deck: Pick<Deck, "slug" | "title" | "description" | "level" | "words">, topic?: DeckTopic): Metadata {
  const name = deck.level && !deck.title.includes(deck.level) ? `${deck.title} ${deck.level}` : deck.title;
  if (topic) {
    return pageMeta({
      title: `${topic.title} – ${name}`,
      description: clip(
        `Học từ vựng tiếng Đức chủ đề “${topic.title}” trong bộ ${name}: nghĩa tiếng Việt, phát âm, der die das, câu ví dụ và ôn lặp lại ngắt quãng. Miễn phí.`,
      ),
      path: `/vocab/decks/${deck.slug}/${topic.id}`,
    });
  }
  return pageMeta({
    title: `${name} – ${deck.words.length.toLocaleString("vi-VN")} từ kèm nghĩa tiếng Việt`,
    description: clip(deck.description || `Học ${deck.words.length} từ vựng tiếng Đức ${name} kèm nghĩa tiếng Việt, phát âm, câu ví dụ và ôn lặp lại ngắt quãng.`),
    path: `/vocab/decks/${deck.slug}`,
  });
}
