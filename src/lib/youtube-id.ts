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

/**
 * Nhận diện link hoặc mã kênh YouTube (@handle, UC…, youtube.com/@…, youtube.com/channel/UC…).
 * Trả về dạng chuẩn để gửi lên API kênh, hoặc null nếu là link video / không hợp lệ.
 */
export function extractChannelInput(input: string): string | null {
  const s = input.trim();
  if (!s || extractVideoId(s)) return null;
  if (/^@[\w.-]{2,}$/.test(s)) return s;
  if (/^UC[\w-]{22}$/.test(s)) return s;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (!isDomain(url.hostname.toLowerCase(), "youtube.com")) return null;
  const m = url.pathname.match(/^\/(@[^/?#]+|channel\/UC[\w-]{22}|c\/[^/?#]+|user\/[^/?#]+)/);
  return m ? `https://www.youtube.com/${m[1]}` : null;
}
