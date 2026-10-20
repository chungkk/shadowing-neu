/**
 * Tìm video YouTube theo từ khoá (Innertube, client WEB, ưu tiên kết quả tiếng Đức).
 * TypeScript thuần (chỉ dùng fetch) — app di động gọi thẳng từ điện thoại, server dùng làm dự phòng.
 */

export type VideoHit = {
  videoId: string;
  title: string;
  channel: string;
  duration: string; // "20:49" ("" khi đang phát trực tiếp)
  views: string; // "460.138 Aufrufe"
  published: string; // "vor 12 Tagen"
  captions: boolean; // có phụ đề do người làm (nhãn "Untertitel" / CC)
};

type Text = { simpleText?: string; runs?: { text: string }[] };
const text = (t?: Text) => t?.simpleText ?? t?.runs?.map((r) => r.text).join("") ?? "";

type Renderer = {
  videoId?: string;
  title?: Text;
  ownerText?: Text;
  lengthText?: Text;
  viewCountText?: Text;
  publishedTimeText?: Text;
  badges?: { metadataBadgeRenderer?: { label?: string } }[];
};

/** Mọi videoRenderer trong JSON kết quả (cấu trúc lồng nhau YouTube hay đổi → duyệt cả cây) */
function collect(node: unknown, out: Renderer[]) {
  if (Array.isArray(node)) for (const x of node) collect(x, out);
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (o.videoRenderer) out.push(o.videoRenderer as Renderer);
    else for (const v of Object.values(o)) collect(v, out);
  }
}

export async function searchYouTube(query: string): Promise<VideoHit[]> {
  const res = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion: "2.20250101.00.00", hl: "de", gl: "DE" } },
      query,
      params: "EgIQAQ%3D%3D", // chỉ video (bỏ kênh, playlist)
    }),
  });
  if (!res.ok) throw new Error(`YouTube: HTTP ${res.status}`);
  const found: Renderer[] = [];
  collect(await res.json(), found);
  const seen = new Set<string>();
  return found.flatMap((v) => {
    if (!v.videoId || seen.has(v.videoId)) return [];
    seen.add(v.videoId);
    return [
      {
        videoId: v.videoId,
        title: text(v.title),
        channel: text(v.ownerText),
        duration: text(v.lengthText),
        views: text(v.viewCountText),
        published: text(v.publishedTimeText),
        captions: !!v.badges?.some((b) => /untertitel|^cc$|subtitles/i.test(b.metadataBadgeRenderer?.label ?? "")),
      },
    ];
  });
}
