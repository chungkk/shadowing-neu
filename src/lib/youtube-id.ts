const VIDEO_ID = /^[\w-]{11}$/;

const isDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** Lấy videoId từ 1 link, có hoặc không có https:// */
function videoIdFromLink(link: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`);
    const host = url.hostname;
    if (isDomain(host, "youtu.be")) return url.pathname.match(/^\/([\w-]{11})\/?$/)?.[1] ?? null;
    if (isDomain(host, "youtube.com") || isDomain(host, "youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && VIDEO_ID.test(v)) return v;
      return url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})\/?$/)?.[1] ?? null;
    }
  } catch {}
  return null;
}

/** Lấy videoId từ link YouTube (watch, youtu.be, shorts, embed, live), từ chính ID, hoặc đoạn chữ có kèm link (nút chia sẻ). */
export function extractVideoId(input: string): string | null {
  const s = input.trim();
  if (VIDEO_ID.test(s)) return s;
  for (const word of s.split(/\s+/)) {
    const id = videoIdFromLink(word.replace(/^[(<["']+|[)>\]"'.,;!?]+$/g, ""));
    if (id) return id;
  }
  return null;
}
