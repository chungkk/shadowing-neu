import { germanWordToIpa, isGermanWord, isPriorityGermanWord } from './german-g2p';
import { normalizeVietnameseSpeech } from './normalize-text';

export const FRONTEND_REVISION = 'sea-seap-v2-independent-kokoro-adapter-v6';
export interface FrontendChunk {
  readonly text: string;
  readonly phonemes: string;
  readonly tokens: readonly number[];
}

/** Reader for the public SEA-G2P SEAP dictionary format, not a vendor lexicon.
 * Format attribution: pnnbao97/sea-g2p src/core/dict.rs (Apache-2.0).
 * Context routing and model adaptation below are an experimental independent
 * frontend; they do not claim equivalence to upstream vig2p.
 */
export class SeaDictionary {
  private readonly view: DataView;
  private readonly decoder = new TextDecoder('utf-8', { fatal: true });
  constructor(private readonly bytes: Uint8Array<ArrayBuffer>) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (
      bytes.length < 48 ||
      new TextDecoder().decode(bytes.subarray(0, 4)) !== 'SEAP' ||
      this.u32(4) !== 2
    )
      throw new Error('A pinned SEAP v2 dictionary is required.');
    for (const [countAt, offsetAt, stride] of [
      [8, 20, 4],
      [12, 24, 8],
      [16, 28, 12],
    ]) {
      if (
        countAt === undefined ||
        offsetAt === undefined ||
        stride === undefined ||
        this.u32(offsetAt) + this.u32(countAt) * stride > bytes.length
      )
        throw new Error('Invalid SEAP index bounds.');
    }
  }
  private u32(at: number): number {
    return this.view.getUint32(at, true);
  }
  private string(id: number): string {
    if (id >= this.u32(8)) throw new Error('Invalid dictionary string ID.');
    const start = 48 + this.u32(this.u32(20) + id * 4);
    const end = this.bytes.indexOf(0, start);
    if (start < 48 || end < start || end - start > 4096)
      throw new Error('Invalid dictionary string.');
    return this.decoder.decode(this.bytes.subarray(start, end));
  }
  private search(word: string, common: boolean): readonly string[] | null {
    const stride = common ? 12 : 8;
    const position = this.u32(common ? 28 : 24);
    let low = 0,
      high = this.u32(common ? 16 : 12) - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2),
        at = position + mid * stride;
      const key = this.string(this.u32(at));
      if (key === word)
        return common
          ? [this.string(this.u32(at + 4)), this.string(this.u32(at + 8))]
          : [this.string(this.u32(at + 4))];
      if (key < word) low = mid + 1;
      else high = mid - 1;
    }
    return null;
  }
  lookup(word: string, preferEnglish = false): string | null {
    const key = word.toLowerCase().normalize('NFC');
    const common = this.search(key, true);
    return common
      ? (common[preferEnglish ? 1 : 0] ?? null)
      : (this.search(key, false)?.[0] ?? null);
  }
}

// Authored letter readings for explicit acronyms and OOV spelling. Dictionary
// words retain their lexical readings; warnings identify every spelled OOV.
const LETTERS: Readonly<Record<string, string>> = {
  a: 'eɪ',
  b: 'biː',
  c: 'siː',
  d: 'diː',
  e: 'iː',
  f: 'ɛf',
  g: 'ʤiː',
  h: 'eɪʧ',
  i: 'aɪ',
  j: 'ʤeɪ',
  k: 'keɪ',
  l: 'ɛl',
  m: 'ɛm',
  n: 'ɛn',
  o: 'oʊ',
  p: 'piː',
  q: 'kjuː',
  r: 'ɑːɹ',
  s: 'ɛs',
  t: 'tiː',
  u: 'juː',
  v: 'viː',
  w: 'dʌbəljuː',
  x: 'ɛks',
  y: 'waɪ',
  z: 'ziː',
};
const TONES: Readonly<Record<string, string>> = {
  '1': '→',
  '7': '→',
  '2': '↘',
  '3': '↗',
  ɜ: '↗',
  '4': '↓',
  '5': 'ʔ↗',
  '6': 'ʔ↓',
};

// Names the dictionary lacks or cannot split into English words, in its own phone style.
// ponytail: grows by hand from the spelled-word warnings; a G2P model if the list sprawls.
// Null prototype: a spoken word such as "constructor" must not resolve to an Object method.
export const PRONUNCIATIONS: Readonly<Record<string, string>> = Object.assign(
  Object.create(null) as Record<string, string>,
  {
    qwen: '<en>kwˈɛn',
    ollama: '<en>oʊlˈɑːmə',
    nemotron: '<en>nˈɛmətɹɑːn',
    supabase: '<en>sˈuːpəbeɪs',
    groq: '<en>ɡɹˈɑːk',
    langgraph: '<en>lˈæŋɡɹæf',
    langfuse: '<en>lˈæŋfjuːz',
    runpod: '<en>ɹˈʌnpɑːd',
    'dall-e': '<en>dˈɑːli',
    chatgpt: '<en>ʧˈæt ʤˌiːpˌiːtˈiː',
    openai: '<en>ˈoʊpən eɪ ˈaɪ',
    youtube: '<en>jˈuːtuːb',
    tiktok: '<en>tˈɪktɑːk',
    github: '<en>ɡˈɪthʌb',
    docker: '<en>dˈɑːkɚ',
    kubernetes: '<en>kuːbɚnˈɛtiːz',
    nextjs: '<en>nˈɛkst ʤeɪ ɛs',
    typescript: '<en>tˈaɪpskɹɪpt',
    javascript: '<en>ʤˈɑːvəskɹɪpt',
    python: '<en>pˈaɪθɑːn',
    iphone: '<en>ˈaɪfoʊn',
    macbook: '<en>mˈækbʊk',
    colab: '<en>kˈoʊlæb',
    // All-caps words said as words, not letters.
    ram: '<en>ɹˈæm',
    sim: '<en>sˈɪm',
    tech: '<en>tˈɛk',
  },
);

/** Acronyms said letter by letter although the dictionary has a (wrong) word reading for them. */
const SPELLED: ReadonlySet<string> = new Set(['aws', 'ide', 'otp', 'adk', 'adlc']);

type Lookup = Pick<SeaDictionary, 'lookup'>;
const ACRONYM = /^[A-Z]{2,}$/u;
const spell = (word: string): string | null => {
  const letters = Array.from(word.toLowerCase(), (char) => LETTERS[char]);
  return letters.every(Boolean) ? letters.join(' ') : null;
};

/** English reading of a word's parts when the whole word is missing: explicit boundaries
 * (DeepSeek, fine-tuning, GPTModel), else the fewest dictionary words that spell it
 * (openrouter, edwarddonner). Null when it does not split into known parts. */
export function compoundReading(word: string, dictionary: Lookup): string | null {
  const english = (part: string): string | null => {
    const reading = PRONUNCIATIONS[part.toLowerCase()] ?? dictionary.lookup(part, true);
    return reading?.startsWith('<en>') ? adapt(reading, part) : null;
  };
  const parts = word.split(/-|(?<=\p{Ll})(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})/u).filter(Boolean);
  // Inside an explicit compound a short part's English reading may lack the <en> tag (to, in, e).
  const untagged = (part: string): string | null => {
    const reading = /^[a-z]+$/iu.test(part) ? dictionary.lookup(part, true) : null;
    return reading ? adapt(reading.startsWith('<en>') ? reading : `<en>${reading}`, part) : null;
  };
  if (parts.length > 1) {
    const readings = parts.map((part) =>
      ACRONYM.test(part) ? spell(part) : (english(part) ?? joined(part) ?? untagged(part)),
    );
    return readings.every((reading) => reading !== null) ? readings.join(' ') : null;
  }
  return joined(word);

  // Fewest known English words of three or more letters, by dynamic programming.
  function joined(part: string): string | null {
    const text = part.toLowerCase();
    if (!/^[a-z]{6,24}$/u.test(text)) return null;
    const best: (readonly string[] | null)[] = [[]];
    for (let end = 3; end <= text.length; end++) {
      best[end] = null;
      for (let start = 0; start <= end - 3; start++) {
        const before = best[start];
        if (before === null || before === undefined) continue;
        if (best[end] !== null && best[end]!.length <= before.length + 1) continue;
        const reading = english(text.slice(start, end));
        if (reading !== null) best[end] = [...before, reading];
      }
    }
    const found = best[text.length];
    return found && found.length > 1 ? found.join(' ') : null;
  }
}

const DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** Loose reading of text the strict reader rejects (see normalizeKokoroText). */
const SOUND_TAG = /\[[^\]\d]{1,30}\]/gu;
const VERSION =
  /(?<=(?:(?<![\p{L}\p{M}\d])[A-Za-z0-9+#]*[A-Z][A-Za-z0-9+#]*|phiên bản|version|bản|(?<![\p{L}\p{M}])v)[\s-]?)(\d+)\.(\d{1,3})(?!\d|[.,]\d)/gu;

function loosen(text: string): string {
  return text
    .replace(/(\p{L})\+\+/gu, '$1 plus plus')
    .replace(/(\p{L})#/gu, '$1 sharp')
    .replace(/\d+(?:\.\d+){2,}/gu, (version) => version.split('.').join(' chấm '))
    .replace(/(\d),(?=\d{3}(?!\d))/gu, '$1')
    .replace(/(\d)\s*\/\s*(?=\d)/gu, '$1 trên ')
    .replace(/(\d)\s*[-–]\s*(?=\d)/gu, '$1 đến ')
    .replace(/(\p{L})(?=\d)|(\d)(?=\p{L})/gu, '$1$2 ')
    .replace(/(?<!\d):|:(?!\d)/gu, ' ')
    .replace(/[-_/\\@#~`*<>[\]{}|^$=+]/gu, ' ');
}

function protectedReading(text: string): string {
  const protectedWords: string[] = [];
  const protectedText = text.replace(/\b[a-z]*[fjwz][a-z]*\b/giu, (word) => {
    protectedWords.push(word);
    return String.fromCharCode(0xe000 + protectedWords.length - 1);
  });
  const normalized = normalizeVietnameseSpeech(protectedText);
  return normalized.replace(
    /[\ue000-\uefff]/gu,
    (marker) => protectedWords[marker.charCodeAt(0) - 0xe000] ?? marker,
  );
}

/**
 * A dub must never refuse a line. Text the strict reader rejects as ambiguous (codes,
 * versions, commands, "C++") is read loosely: digits apart from letters, version dots as
 * "chấm", thousands commas dropped, code punctuation as a pause; finally digit by digit.
 */
export function normalizeKokoroText(text: string): string {
  if (!text.trim() || text.length > 2000)
    throw new Error('Use 1–2000 characters for Kokoro speech.');
  // Caption sound tags ([Music], [Nhạc], [संगीत]) are not speech; a tag-only line is a pause.
  text = text.replace(SOUND_TAG, ' ').trim() || '.';
  // Versions after a product name or "phiên bản" are read with "chấm" (Python 3.12, GLM-5.3, Qwen2.5); a plain
  // decimal after a Vietnamese word keeps "phẩy" (tăng 2.5 lần).
  text = text.replace(VERSION, '$1 chấm $2');
  try {
    return protectedReading(text);
  } catch {
    // Read it loosely below.
  }
  const loose = loosen(text);
  try {
    return protectedReading(loose);
  } catch {
    return loose
      .replace(/\d/gu, (digit) => ` ${DIGIT_WORDS[Number(digit)]} `)
      .replace(/[^\p{L}\p{M}\s.,!?;]/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim();
  }
}

function adapt(raw: string, source: string): string {
  const english = raw.startsWith('<en>');
  let phones = raw
    .replace(/<\/?en>/gu, '')
    .replace(/tʃ/gu, 'ʧ')
    .replace(/dʒ/gu, 'ʤ')
    .replace(/t̪/gu, 't')
    .replace(/ɗ/gu, 'd')
    .replace(/ʐ/gu, 'ʒ')
    .replace(/e-/gu, 'æ')
    .replace(/[\u032a\u0329]/gu, '');
  if (!english) {
    phones = phones.replace(/[1-7ɜ]/gu, (tone) => TONES[tone] ?? tone);
    const word = source.toLowerCase();
    if (word.startsWith('th')) phones = phones.replace('t', 'θ');
    else if (word.startsWith('tr')) phones = phones.replace('ʧ', 'ʈʂ');
    else if (word.startsWith('gi')) phones = phones.replace('z', 'ʝ');
    else if (/^s(?![chklmnptw])/u.test(word)) phones = phones.replace('s', 'ʂ');
  }
  return phones;
}

export function phonemizeChunks(
  text: string,
  dictionary: Pick<SeaDictionary, 'lookup'>,
  vocab: Readonly<Record<string, number>>,
  options?: { enableGerman?: boolean },
): { normalized: string; chunks: readonly FrontendChunk[]; warnings: readonly string[] } {
  const enableGerman = Boolean(options?.enableGerman);
  const normalized = normalizeKokoroText(text),
    warnings: string[] = [],
    chunks: FrontendChunk[] = [];
  // Each inference adds its own leading/trailing quiet and resets prosody, so a
  // cue stays one inference until the phoneme budget forces a split.
  let words: string[] = [],
    raws: string[] = [];
  const length = (items: readonly string[]) => Array.from(items.join(' ')).length;
  const flush = (count = words.length) => {
    const phonemes = raws.slice(0, count).join(' ').trim();
    const text = words.slice(0, count).join(' ');
    words = words.slice(count);
    raws = raws.slice(count);
    if (!phonemes) return;
    chunks.push({
      text,
      phonemes,
      tokens: [
        0,
        ...Array.from(phonemes, (char) => {
          const id = vocab[char];
          if (id === undefined)
            throw new Error(`Unsupported phoneme ${JSON.stringify(char)}. No text was discarded.`);
          return id;
        }),
        0,
      ],
    });
  };
  // Prefer the last sentence end, then clause punctuation, then any word boundary.
  const split = () => {
    for (const boundary of [/[.!?]$/u, /[,;:]$/u])
      for (let index = words.length - 1; index > 0; index--)
        if (boundary.test(words[index - 1] ?? '')) return index;
    return words.length;
  };
  for (const token of normalized.match(/[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*|[^\s\p{L}\p{M}]/gu) ??
    []) {
    let raw: string;
    if (/^\p{L}/u.test(token)) {
      // Six or more capitals is a shouted word (OPENROUTER, NVIDIA), not letters to spell.
      const acronym = ACRONYM.test(token) && token.length <= 5;
      const dePriority = enableGerman && !acronym && isPriorityGermanWord(token) ? germanWordToIpa(token) : '';
      const known = dePriority ? null : (PRONUNCIATIONS[token.toLowerCase()] ?? dictionary.lookup(token, acronym));
      const compound = dePriority || known || acronym ? null : compoundReading(token, dictionary);
      const deFallback =
        enableGerman && !dePriority && !known && !acronym && compound === null && isGermanWord(token)
          ? germanWordToIpa(token)
          : '';
      if (dePriority) raw = dePriority;
      else if ((acronym && !known?.startsWith('<en>')) || SPELLED.has(token.toLowerCase()))
        raw = Array.from(token.toLowerCase(), (char) => LETTERS[char] ?? '').join(' ');
      else if (known) raw = adapt(known, token);
      else if (deFallback) raw = deFallback;
      else if (compound !== null) raw = compound;
      else {
        warnings.push(`Spelled out-of-dictionary token: ${token}`);
        // Letters the voice cannot say (other scripts) are left out rather than failing the line.
        raw = Array.from(token.toLowerCase(), (char) => LETTERS[char] ?? '')
          .filter(Boolean)
          .join(' ');
        if (!raw) {
          warnings.push(`Unpronounceable token left out: ${token}`);
          continue;
        }
      }
    } else if (/^[.,!?;:—…"()“”]$/u.test(token)) raw = token;
    else {
      // A stray symbol (a command's "-b", "→", an emoji) is a pause, not a failed line.
      warnings.push(`Symbol left out: ${token}`);
      continue;
    }
    if (Array.from(raw).length > 480) throw new Error('One token exceeds the model context.');
    while (words.length > 0 && length([...raws, raw]) > 480) flush(split());
    words.push(token);
    raws.push(raw);
  }
  flush();
  // Nothing sayable (only symbols): a short pause keeps the line in sequence.
  if (!chunks.length) {
    words.push('.');
    raws.push('.');
    flush();
  }
  return { normalized, chunks, warnings };
}
