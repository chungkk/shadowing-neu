export type Segment = {
  start: number; // giây
  end: number; // giây
  text: string;
  words?: Word[]; // phụ đề tự động YouTube (srv3) có thời gian từng từ → cắt câu chính xác
  turn?: true; // dòng này mở đầu lượt người nói mới (`>>`, `- `, `Sprecher:`…) — dấu đã bị lọc khỏi `text`
};

// end: thời điểm hết từ (chỉ Whisper v2 có). Không có → coi như kéo tới lúc bắt đầu từ kế tiếp
export type Word = [start: number, text: string, end?: number];

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));

const SDH_DESC_RE =
  /musik|klänge|klang|melodie|gesang|singt|singen|gesungen|summt|summen|lied|song|jingle|intro|outro|abspann|vorspann|titelmelodie|gitarre|klavier|piano|trommel|geige|bass|beat|takt|chor|orchester|streicher|synthesizer|rhythmus|rhythmisch|elektronisch|instrument|musikstück|soundtrack|music|singing|sings|humming|hums|choral|choir|guitar|violin|drums|melody|tune|theme|bgm|nhạc|âm\s+nhạc|ca\s+hát|ngân\s+nga|musique|música|音楽|歌|音乐|음악|applaus|beifall|klatsch\w*|jubel\w*|gelächter|lach\w*|kicher\w*|schmunzel\w*|seufz\w*|stöhn\w*|keuch\w*|hust\w*|nies\w*|räusper\w*|schnauf\w*|schnaub\w*|schnarch\w*|gähn\w*|pfeif\w*|weint|weinen|schluchz\w*|schreit|schreien|brüllt|brüllen|flüster\w*|murmel\w*|nuschel\w*|stotter\w*|kreisch\w*|zisch\w*|knurr\w*|bellt|bellen|miaut|zwitscher\w*|piep\w*|klingel\w*|läute\w*|klopf\w*|hämmert|knall\w*|krach\w*|donner\w*|raschel\w*|rauschen|rauscht|brumm\w*|surr\w*|klick\w*|ticken|tickt|quiet\w*|hupt|hupen|sirene|motor|schritte|tür|fenster|wind|regen|explosion|schuss|schüsse|stille|pause|ruhe|geräusch\w*|lärm|krächz\w*|knarr\w*|polter\w*|klirr\w*|plätsch\w*|schmatz\w*|atmet|atmen|unverständlich|undeutlich|durcheinander|stimmengewirr|gemurmel|hintergrund\w*|applause|clapping|claps|cheering|cheers|laughter|laughing|laughs|chuckles|chuckling|giggles|giggling|sighs|sighing|groans|groaning|gasps|gasping|coughs|coughing|sneezes|sneezing|clears\s+throat|snorts|snores|yawns|whistles|whistling|crying|cries|sobbing|sobs|weeping|screaming|screams|shouting|shouts|yelling|yells|whispering|whispers|mumbling|mumbles|murmuring|murmurs|stuttering|shrieks|hisses|growls|barking|barks|meows|chirping|beeping|beeps|ringing|rings|knocking|knocks|banging|bangs|slamming|slams|crashing|thunder|rustling|buzzing|clicking|clicks|ticking|honking|siren|engine|footsteps|explosion|gunshot|silence|silent|pause|noise|sound|sfx|inaudible|indistinct|unintelligible|crosstalk|chatter|overlapping|vỗ\s+tay|reo\s+hò|hoan\s+hô|tiếng\s+cười|\bcười\b|khúc\s+khích|thở\s+dài|rên|thở\s+hổn\s+hển|\bho\b|hắt\s+hơi|hắng\s+giọng|ngáy|ngáp|huýt\s+sáo|khóc|nức\s+nở|\bhét\b|la\s+hét|thì\s+thầm|lẩm\s+bẩm|tiếng\s+động|tiếng\s+ồn|âm\s+thanh|tiếng\s+\p{L}+|im\s+lặng|tĩnh\s+lặng|không\s+nghe\s+rõ|nghe\s+không\s+rõ|拍手|笑い|歓声|ため息|効果音|無音|掌声|笑声|박수|웃음|sprecher\w*|erzähler\w*|moderator\w*|reporter\w*|ansager\w*|kommentator\w*|stimme\w*|off[\s-]?stimme|aus\s+dem\s+off|^off$|voice[\s-]?over|narrator|announcer|commentator|speaker|interviewer|anchor|male\s+voice|female\s+voice|child'?s\s+voice|robotic\s+voice|computer\s+voice|automated\s+voice|on\s+(?:phone|radio|tv)|over\s+(?:speaker|radio|pa)|through\s+phone|im\s+(?:radio|fernsehen)|am\s+telefon|übers\s+telefon|durch\s+lautsprecher|archiv\w*|o-?ton|einspieler|untertitel|amara\.org|fremdsprach\w*|spricht\s+(?:englisch|französisch|spanisch|italienisch|türkisch|arabisch|russisch|chinesisch|japanisch|polnisch|deutsch|leise|laut|schnell|langsam|hektisch|aufgeregt|traurig|wütend|fröhlich|ernst|ironisch|sarkastisch)|speaking\s+(?:foreign|in\s+\p{L}+|softly|loudly|quietly|quickly|slowly|angrily|sadly|happily|sarcastically|german|english|french|spanish|arabic|russian|chinese|japanese|vietnamese)|giọng\s+(?:đọc|nói|nam|nữ|trẻ\s+em|người\s+dẫn|thuyết\s+minh|máy|nhỏ|lớn|trầm|cao|run|khàn|tức\s+giận|buồn|vui)|người\s+dẫn\s+chuyện|thuyết\s+minh|lồng\s+tiếng|bình\s+luận\s+viên|phát\s+thanh\s+viên|ngoại\s+ngữ|tiếng\s+nước\s+ngoài|nói\s+(?:nhỏ|to|nhanh|chậm)|qua\s+(?:điện\s+thoại|loa)|phụ\s+đề|^(?:leise|laut|ironisch|sarkastisch|ernst|traurig|wütend|fröhlich|erstaunt|überrascht|verwirrt|genervt|aufgeregt|entsetzt|skeptisch|nachdenklich|zögernd|spöttisch|energisch|sanft|ruhig|dynamisch|dramatisch|bedrohlich|düster|heiter|beschwingt|rockig|melancholisch|spannend|spannungsvoll|softly|quietly|loudly|sarcastically|angrily|sadly|happily|excitedly|nervously|hesitantly|mockingly|dramatically|whispered|muffled)$/iu;

const SPEAKER_PREFIX_RE =
  /^(?:[-–—]\s*)?(?:off[\s-]?stimme|stimme\s+aus\s+dem\s+off|stimme|off|sprecher(?:in)?|erzähler(?:in)?|moderator(?:in)?|reporter(?:in)?|ansager(?:in)?|kommentator(?:in)?|frauenstimme|männerstimme|kinderstimme|computerstimme|roboterstimme|narrator|voice[\s-]?over|voiceover|announcer|commentator|host|speaker(?:\s*\d+)?|interviewer|male\s+voice|female\s+voice|giọng\s+đọc|giọng\s+nói|giọng\s+nam|giọng\s+nữ|giọng\s+thuyết\s+minh|người\s+dẫn\s+chuyện|người\s+dẫn|thuyết\s+minh|lồng\s+tiếng|bình\s+luận\s+viên|phát\s+thanh\s+viên|mc)\s*:\s*/iu;

const CREDIT_LINE_RE =
  /^(?:untertitel\s+(?:von|im\s+auftrag|der|des|:)|subtitles?\s+(?:by|:)|captions?\s+(?:by|:)|closed\s+captions?\b|phụ\s+đề\s+(?:bởi|:)|việt\s*sub\b|amara\.org)/iu;

/** Kiểm tra dòng phụ đề thô có dấu hiệu đổi người nói (`>>`, `- ...`, hoặc tiền tố vai đọc) trước khi bị lọc sạch. */
export function hasSpeakerTurnMarker(s: string): boolean {
  const plain = decodeEntities(s.replace(/<[^>]+>/g, "").replace(/\{[^}]*\}/g, "")).trimStart();
  return /^>>+/.test(plain) || /^[-–—]\s+\S/.test(plain) || SPEAKER_PREFIX_RE.test(plain);
}

/**
 * Làm sạch 1 dòng phụ đề YouTube: giải mã HTML, bỏ tag, bỏ mô tả nhạc/tiếng động/giọng đọc/người dẫn
 * (`[Musik]`, `♪ ... ♪`, `(Sanfte Musik)`, `(Off-Stimme)`, `Sprecher:`, `Untertitel ...`) nhưng giữ nguyên lời thoại thật.
 */
export function cleanSubtitleText(s: string): string {
  let out = decodeEntities(s.replace(/<[^>]+>/g, "").replace(/\{[^}]*\}/g, ""))
    .replace(/\[[^\]]*\]|［[^］]*］|【[^】]*】/g, " ")
    .replace(/[♪♫♬🎵🎶][^♪♫♬🎵🎶]*[♪♫♬🎵🎶]/g, " ");

  if (/^[\s–—-]*[♪♫♬🎵🎶]/.test(out)) return "";
  out = out.replace(/[♪♫♬🎵🎶]+/g, " ");

  if (/^[\s–—-]*([（(][^()（）]{1,140}[）)][\s–—.,!?;:]*)+$/.test(out)) return "";

  out = out
    .replace(/[（(]([^()（）]{1,120})[）)]/g, (full, inner: string) => (SDH_DESC_RE.test(inner.trim()) ? " " : full))
    .replace(/(^|\s)\*([^*]{1,60})\*(?=\s|$|[.,!?;:])/g, (full, sp: string, inner: string) =>
      SDH_DESC_RE.test(inner.trim()) ? sp : full,
    )
    .replace(/(?:^|\s)>>+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(SPEAKER_PREFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!out || CREDIT_LINE_RE.test(out) || !/[\p{L}\p{N}]/u.test(out)) return "";
  return out;
}

/**
 * Làm sạch phụ đề có thời gian từng từ (srv3 / json3 / Whisper): lọc theo cả câu trước để bắt được mô tả nhiều từ
 * như `(Sanfte Musik)` hoặc `[Ruhige Musik spielt]`, rồi khớp lại các từ còn giữ với mốc thời gian gốc.
 */
export function cleanSegmentWords(words: Word[], rawJoined?: string): { text: string; words?: Word[] } {
  const rawTokens: Word[] = [];
  for (const w of words) {
    const t = decodeEntities(w[1].replace(/<[^>]+>/g, "").replace(/\{[^}]*\}/g, "")).trim();
    if (t) rawTokens.push(w[2] === undefined ? [w[0], t] : [w[0], t, w[2]]);
  }
  const joined = rawJoined !== undefined ? rawJoined : rawTokens.map((w) => w[1]).join(" ");
  const cleaned = cleanSubtitleText(joined);
  if (!cleaned) return { text: "" };
  if (rawTokens.length && rawTokens.map((w) => w[1]).join(" ") === cleaned) {
    return { text: cleaned, words: rawTokens };
  }
  if (!rawTokens.length) return { text: cleaned };

  const cleanTokens = cleaned.split(/\s+/);
  const aligned: Word[] = [];
  let ri = 0;
  for (const tok of cleanTokens) {
    while (ri < rawTokens.length && rawTokens[ri][1] !== tok && !rawTokens[ri][1].includes(tok)) {
      ri++;
    }
    if (ri >= rawTokens.length) return { text: cleaned };
    const src = rawTokens[ri];
    aligned.push(src[2] === undefined ? [src[0], tok] : [src[0], tok, src[2]]);
    ri++;
  }
  return { text: cleaned, words: aligned };
}

// Dấu đổi lượt nói nằm GIỮA dòng: `>>` (phụ đề tự động YouTube) hoặc ` - ` sau dấu hết câu (phụ đề hội thoại "- A. - B.")
const MID_TURN_ARROW_RE = /\s*(?:>|&gt;){2,}\s*/i;
const MID_TURN_DASH_RE = /(?<=[.!?…]["»“”'’)]*)\s+[-–—]\s+(?=\S)/;
const ARROW_TOKEN_RE = /^(?:>|&gt;){2,}/i;

/**
 * Làm sạch 1 dòng phụ đề THÔ và tách theo lượt người nói.
 * Phải chạy trước khi làm sạch vì `cleanSubtitleText` xoá luôn `>>` / `- ` / `Sprecher:` → mất dấu đổi người.
 * Mỗi mảnh trả về có `turn: true` nếu mở đầu lượt nói mới. Đơn vị thời gian giữ nguyên như đầu vào (`words` luôn là giây).
 */
export function cleanSubtitleLine(
  start: number,
  end: number,
  raw: string,
  rawWords?: Word[],
  rawJoined?: string,
): Segment[] {
  const firstTurn = hasSpeakerTurnMarker(rawJoined ?? raw);
  const out: Segment[] = [];
  let carry = false;
  const emit = (seg: Segment, turn: boolean) => {
    carry = carry || turn;
    if (!seg.text) return;
    out.push(carry ? { ...seg, turn: true } : seg);
    carry = false;
  };

  if (rawWords?.length) {
    // Tách nhóm từ tại token `>>` nằm giữa dòng (token đầu dòng đã tính trong firstTurn)
    const groups: Word[][] = [[]];
    for (const w of rawWords) {
      const tok = w[1].replace(/<[^>]+>/g, "").trim();
      if (ARROW_TOKEN_RE.test(tok) && groups[groups.length - 1].length) groups.push([]);
      groups[groups.length - 1].push(w);
    }
    if (groups.length === 1) {
      const cleaned = cleanSegmentWords(rawWords, rawJoined);
      emit(
        {
          start: cleaned.words?.[0]?.[0] ?? start,
          end,
          text: cleaned.text,
          ...(cleaned.words?.length ? { words: cleaned.words } : {}),
        },
        firstTurn,
      );
      return out;
    }
    groups.forEach((g, i) => {
      // srv3 giữ khoảng trắng đầu từ (" word") → nối liền; token đã cắt khoảng trắng → nối bằng dấu cách
      const joined = g.some((w) => /^\s/.test(w[1])) ? g.map((w) => w[1]).join("") : undefined;
      const cleaned = cleanSegmentWords(g, joined);
      const gEnd = groups[i + 1]?.[0]?.[0] ?? end;
      emit(
        {
          start: cleaned.words?.[0]?.[0] ?? g[0][0],
          end: Math.max(gEnd, g[0][0]),
          text: cleaned.text,
          ...(cleaned.words?.length ? { words: cleaned.words } : {}),
        },
        i === 0 ? firstTurn : true,
      );
    });
    return out;
  }

  const plain = raw.replace(/<[^>]+>/g, " ");
  let parts = plain.split(MID_TURN_ARROW_RE);
  // Gạch hội thoại giữa dòng chỉ tính khi dòng mở đầu bằng gạch (tránh tách nhầm dấu gạch nối trong câu)
  if (/^\s*[-–—]\s+\S/.test(plain)) {
    parts = parts.flatMap((p) => p.split(MID_TURN_DASH_RE)).map((p) => p.replace(/^\s*[-–—]\s+/, ""));
  }
  const total = parts.reduce((n, p) => n + p.length, 0) || 1;
  let t = start;
  parts.forEach((p, i) => {
    const dt = ((end - start) * p.length) / total;
    emit({ start: t, end: t + dt, text: cleanSubtitleText(p) }, i === 0 ? firstTurn : true);
    t += dt;
  });
  if (out.length) out[out.length - 1].end = end;
  return out;
}

/** "00:01:02,500" | "01:02.5" -> giây */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().replace(",", ".").split(":");
  return parts.reduce((acc, p) => acc * 60 + parseFloat(p), 0);
}

/** Chuẩn hoá: sắp xếp, bỏ dòng rỗng, cắt phần chồng lên dòng sau (sub tự động của YouTube hay bị chồng). */
export function normalize(segs: Segment[]): Segment[] {
  const sorted = segs.filter((s) => s.text).sort((a, b) => a.start - b.start);
  return sorted.map((s, i) => {
    const next = sorted[i + 1];
    const end = next ? Math.min(s.end, next.start) : s.end;
    return { ...s, end: Math.max(end, s.start + 0.3) };
  });
}

/** Đọc file .srt hoặc .vtt */
export function parseSubtitleFile(content: string): Segment[] {
  const blocks = content.replace(/\r/g, "").split(/\n{2,}/);
  const segs: Segment[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const idx = lines.findIndex((l) => l.includes("-->"));
    if (idx === -1) continue;
    const [a, b] = lines[idx].split("-->");
    segs.push(
      ...cleanSubtitleLine(parseTimestamp(a), parseTimestamp(b.trim().split(/\s+/)[0]), lines.slice(idx + 1).join(" ")),
    );
  }
  return normalize(segs);
}

/** Đọc XML timedtext của YouTube (<text start dur>) */
export function parseYouTubeXml(xml: string): Segment[] {
  const segs: Segment[] = [];
  // format cũ: <text start="1.2" dur="3.4">...</text>
  for (const m of xml.matchAll(/<text start="([\d.]+)"(?: dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g)) {
    const start = parseFloat(m[1]);
    segs.push(...cleanSubtitleLine(start, start + parseFloat(m[2] ?? "3"), m[3]));
  }
  // format srv3: <p t="1200" d="3400">...</p> (mili giây).
  // Phụ đề tự động có thêm từng từ: <s t="160">kann</s> (t = mili giây tính từ đầu dòng)
  if (!segs.length) {
    for (const m of xml.matchAll(/<p t="(\d+)"(?: d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g)) {
      const start = Number(m[1]) / 1000;
      const end = start + Number(m[2] ?? 3000) / 1000;
      const rawMatches = [...m[3].matchAll(/<s(?: t="(\d+)")?[^>]*>([\s\S]*?)<\/s>/g)];
      if (rawMatches.length) {
        const rawJoined = rawMatches.map(([, , w]) => w).join("");
        const rawWords: Word[] = rawMatches
          .map(([, t, w]): Word => [start + Number(t ?? 0) / 1000, w])
          .filter(([, w]) => w.trim());
        segs.push(...cleanSubtitleLine(start, end, rawJoined, rawWords, rawJoined));
      } else {
        segs.push(...cleanSubtitleLine(start, end, m[3]));
      }
    }
  }
  return normalize(segs);
}

// Viết tắt tiếng Đức có dấu chấm nhưng không phải hết câu
const ABBREVIATIONS = new Set(
  "z.b. d.h. u.a. usw. bzw. ca. dr. nr. str. etc. evtl. ggf. vgl. bspw. inkl. max. min. mio. mrd. prof. hr. fr. z.t. o.ä. u.ä. sog. mr. mrs.".split(" "),
);

/** Từ này có kết thúc câu không? ("glauben." có, "z.B." / "3." (am 3. Oktober) thì không) */
function endsSentence(word: string): boolean {
  const w = word.replace(/["»«“”'’)]+$/, "").toLowerCase();
  if (/[!?…]$/.test(w)) return true;
  if (!w.endsWith(".")) return false;
  return !ABBREVIATIONS.has(w) && !/^\d{1,2}\.$/.test(w);
}

// Độ dài câu dễ nói theo nhất: khoảng 2–8 giây, 4–16 từ
const MAX_SEC = 8; // dài hơn → tách ở dấu phẩy
const MAX_WORDS = 16;
const MIN_SEC = 1.5; // ngắn hơn → ghép với câu bên cạnh
const MIN_WORDS = 3;
const LONG_SEC = 12; // dài thế này mà không có dấu phẩy → tách ở chỗ ngừng hơi dài nhất
const SILENCE = 2; // im lặng lâu hơn → luôn ngắt câu
const END_PAD = 0.15; // đệm sau thời điểm hết từ (Whisper hay báo hơi sớm → khỏi cụt âm cuối)

export type Tok = { t: number; end: number; w: string };

/** Trải mọi dòng phụ đề thành từng từ có thời gian (không có thời gian từng từ → chia theo số ký tự) */
export function tokenize(segs: Segment[]): Tok[] {
  const toks: Tok[] = [];
  for (const s of segs) {
    let words = s.words;
    if (!words) {
      const ws = s.text.split(/\s+/).filter(Boolean);
      const total = ws.reduce((n, w) => n + w.length + 1, 0);
      let t = s.start;
      words = ws.map((w): Word => {
        const start = t;
        t += ((s.end - s.start) * (w.length + 1)) / total;
        return [start, w];
      });
    }
    words.forEach(([t, w, e], i) => {
      const next = i < words.length - 1 ? words[i + 1][0] : s.end;
      // Có thời điểm hết từ → câu dừng đúng lúc dứt lời, không kéo theo khoảng lặng phía sau
      toks.push({ t, end: e === undefined ? next : Math.max(t, Math.min(e + END_PAD, next)), w });
    });
  }
  return toks;
}

const dur = (g: Tok[]) => g[g.length - 1].end - g[0].t;

/** Chỗ tách hợp lý trước từ thứ k: sau dấu phẩy / chấm phẩy / hai chấm, hoặc trước "–" (đổi người nói) */
const isBreak = (g: Tok[], k: number) => /[,;:]["»“”']?$/.test(g[k - 1].w) || /^[–-]/.test(g[k].w);

/** Tách câu quá dài ở dấu phẩy gần giữa nhất (đệ quy); không có dấu phẩy mà rất dài → chỗ ngừng hơi dài nhất */
function splitLong(g: Tok[]): Tok[][] {
  if (dur(g) <= MAX_SEC && g.length <= MAX_WORDS) return [g];
  // vị trí tách k: mỗi nửa còn ít nhất MIN_WORDS từ
  const ks: number[] = [];
  for (let k = MIN_WORDS; k <= g.length - MIN_WORDS; k++) ks.push(k);
  const mid = (g[0].t + g[g.length - 1].end) / 2;
  let best = ks.filter((k) => isBreak(g, k)).sort((a, b) => Math.abs(g[a].t - mid) - Math.abs(g[b].t - mid))[0];
  if (best === undefined && (dur(g) > LONG_SEC || g.length > MAX_WORDS * 1.5)) {
    best = ks.sort((a, b) => g[b].t - g[b - 1].end - (g[a].t - g[a - 1].end))[0];
  }
  if (best === undefined) return [g];
  return [...splitLong(g.slice(0, best)), ...splitLong(g.slice(best))];
}

/** Ghép câu quá ngắn ("Und Ihnen?") với câu kế bên nếu sát nhau và ghép xong không quá dài */
function mergeShort(groups: Tok[][]): Tok[][] {
  const isShort = (g: Tok[]) => dur(g) < MIN_SEC || g.length <= MIN_WORDS;
  const fits = (a: Tok[], b: Tok[]) =>
    b[0].t - a[a.length - 1].end <= 1 && b[b.length - 1].end - a[0].t <= MAX_SEC && a.length + b.length <= MAX_WORDS;
  const out: Tok[][] = [];
  for (const g of groups) {
    const prev = out[out.length - 1];
    if (prev && (isShort(prev) || isShort(g)) && fits(prev, g)) out[out.length - 1] = [...prev, ...g];
    else out.push(g);
  }
  return out;
}

/**
 * Gộp các dòng phụ đề thành câu để luyện: ngắt ở dấu kết thúc câu (. ! ? …) hoặc khoảng im lặng dài,
 * rồi tách câu quá dài ở dấu phẩy và ghép câu quá ngắn với câu bên cạnh.
 */
export function mergeIntoSentences(segs: Segment[]): Segment[] {
  const toks = tokenize(segs);
  const groups: Tok[][] = [];
  let cur: Tok[] = [];
  for (const tok of toks) {
    if (cur.length && tok.t - cur[cur.length - 1].end > SILENCE) {
      groups.push(cur);
      cur = [];
    }
    cur.push(tok);
    if (endsSentence(tok.w)) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);

  return mergeShort(groups.flatMap(splitLong)).map((g) => ({
    start: g[0].t,
    end: g[g.length - 1].end,
    text: g.map((x) => x.w).join(" "),
  }));
}

/**
 * SRT không chứa thời gian từng từ → sau khi admin sửa, dòng nào giữ nguyên (cùng thời gian + nội dung)
 * thì lấy lại bản gốc (có `words`) để gộp câu cho người học vẫn như cũ. Dòng đã sửa thì dùng bản mới.
 */
export function keepWordTimings(edited: Segment[], ...originals: Segment[][]): Segment[] {
  const key = (s: Segment) => `${Math.round(s.start * 1000)}|${Math.round(s.end * 1000)}|${cleanSubtitleText(s.text)}`;
  const byKey = new Map<string, Segment>();
  for (const list of originals) {
    for (const s of normalize(list)) {
      // Chỉ lấy bản thật sự có thời gian từng từ — tránh track không có `words` che mất track có `words`
      if (s.words?.length && !byKey.has(key(s))) byKey.set(key(s), s);
    }
  }
  return edited.map((s) => byKey.get(key(s)) ?? s);
}

export function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function srtTime(t: number): string {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

/** Xuất ra định dạng SRT (để admin chỉnh sửa / người dùng tải về) */
export function toSrt(segs: Segment[]): string {
  return segs.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join("\n");
}
