/** Independent, deliberately bounded Vietnamese speech text rules. */
export const MMS_NORMALIZER_REVISION = 'vi-numbers-latin-v5';
const MAX_TEXT_CHARACTERS = 10_000;
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'] as const;
// Authored Vietnamese letter names, not a foreign-word pronunciation dictionary.
const LATIN_LETTER_NAMES = [
  'a',
  'bê',
  'xê',
  'dê',
  'e',
  'ép',
  'giê',
  'hát',
  'i',
  'giây',
  'ca',
  'e lờ',
  'em mờ',
  'en nờ',
  'o',
  'pê',
  'quy',
  'e rờ',
  'ét',
  'tê',
  'u',
  'vê',
  'vê kép',
  'ích',
  'i dài',
  'dét',
] as const;

function spellUnsupportedLatinWords(text: string): string {
  return text.replace(/[\p{L}\p{M}]+/gu, (word) => {
    if (!/^[a-z]+$/i.test(word) || !/[fjwz]/iu.test(word)) return word;
    return Array.from(
      word.toLowerCase(),
      (letter) => LATIN_LETTER_NAMES[letter.charCodeAt(0) - 97],
    ).join(' ');
  });
}

function digitSequence(value: string): string {
  return Array.from(value, (digit) => DIGITS[Number(digit)] ?? '').join(' ');
}

function group(value: number, full: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  const words: string[] = [];
  if (hundreds > 0 || full) words.push(DIGITS[hundreds] ?? '', 'trăm');
  if (tens > 1) words.push(DIGITS[tens] ?? '', 'mươi');
  else if (tens === 1) words.push('mười');
  else if (ones > 0 && (hundreds > 0 || full)) words.push('lẻ');
  if (ones > 0) {
    words.push(
      ones === 1 && tens > 1 ? 'mốt' : ones === 5 && tens > 0 ? 'lăm' : (DIGITS[ones] ?? ''),
    );
  }
  return words.join(' ');
}

function integer(value: string): string {
  if (value.length > 12)
    throw new Error(
      'Speech numbers support at most twelve digits. Write longer numbers or codes in words.',
    );
  if (value.length > 1 && value.startsWith('0')) return digitSequence(value);
  let remaining = Number(value);
  if (remaining === 0) return DIGITS[0];
  const words: string[] = [];
  for (const [scale, name] of [
    [1_000_000_000, 'tỷ'],
    [1_000_000, 'triệu'],
    [1_000, 'nghìn'],
    [1, ''],
  ] as const) {
    const part = Math.floor(remaining / scale);
    remaining %= scale;
    if (part === 0) continue;
    words.push(group(part, words.length > 0 && part < 100));
    if (name !== '') words.push(name);
  }
  return words.join(' ');
}

function date(day: string, month: string, year: string): string {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > (days[m - 1] ?? 0))
    throw new Error(
      'Invalid speech date. Use a valid ISO date or an explicit ngày day/month/year.',
    );
  return `ngày ${integer(String(d))} tháng ${integer(String(m))} năm ${integer(String(y))}`;
}

/**
 * Preserve display text separately. Run this on the full translated cue BEFORE
 * speech chunking: number expansion must never bypass the model/token budget.
 * Ambiguous grouping, mixed codes and unsupported numeric formats fail explicitly.
 * ASCII words containing f/j/w/z use letter names because the Vietnamese model
 * cannot encode those letters. Other words remain unchanged; display text stays separate.
 */
export function normalizeVietnameseSpeech(text: string): string {
  if (text.length > MAX_TEXT_CHARACTERS)
    throw new Error('Use at most 10000 characters before speech normalization.');
  let spoken = text.normalize('NFC');
  if (/[\p{L}][+#]|[+#][\p{L}]/u.test(spoken))
    throw new Error('Technical names containing symbols need an explicit spoken form.');
  spoken = spoken.replace(
    /(?<![\p{L}\p{N}])(?:ngày\s+)?(\d{4})-(\d{2})-(\d{2})(?![\p{L}\p{N}])/giu,
    (_match, year: string, month: string, day: string) => date(day, month, year),
  );
  spoken = spoken.replace(
    /(?<![\p{L}\p{N}])ngày\s+(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\p{L}\p{N}])/giu,
    (_match, day: string, month: string, year: string) => date(day, month, year),
  );
  spoken = spoken.replace(
    /(?<![\p{L}\p{N}:])(\d{1,2}):(\d{2})(?::(\d{2}))?(?![\p{L}\p{N}:])/gu,
    (_match, hour: string, minute: string, second: string | undefined) => {
      if (Number(hour) > 23 || Number(minute) > 59 || (second !== undefined && Number(second) > 59))
        throw new Error('Speech times use a valid 24-hour HH:MM or HH:MM:SS value.');
      const result = `${integer(String(Number(hour)))} giờ ${integer(String(Number(minute)))} phút`;
      return second === undefined ? result : `${result} ${integer(String(Number(second)))} giây`;
    },
  );
  if (/\d\s*[:/]\s*\d/u.test(spoken))
    throw new Error(
      'Ambiguous date, ratio or fraction. Use an ISO date, explicit ngày day/month/year, or words.',
    );
  // Explicitly spaced arithmetic avoids treating a prose hyphen as subtraction.
  spoken = spoken.replace(/(\d)\s+-\s+(?=\d)/gu, '$1 trừ ');
  spoken = spoken.replace(/−(?=\d)/gu, '-');
  spoken = spoken.replace(/(\d)\+(?=\d)/gu, '$1 cộng ');
  spoken = spoken.replace(/(\d)\s*\*\s*(?=\d)/gu, '$1 nhân ');
  spoken = spoken.replace(
    /[+-]?\d+(?:[.,]\d+)?/gu,
    (value: string, offset: number, source: string) => {
      const before = source.slice(0, offset).at(-1) ?? '';
      const after = source.slice(offset + value.length, offset + value.length + 1);
      const previous = source.slice(0, offset - 1).at(-1) ?? '';
      const following = source.slice(offset + value.length + 1, offset + value.length + 2);
      if (
        /[\p{L}\p{N}:/-]/u.test(before) ||
        /[\p{L}\p{N}:/-]/u.test(after) ||
        (/[.,]/u.test(before) && /[\p{L}\p{N}]/u.test(previous)) ||
        (/[.,]/u.test(after) && /\d/u.test(following))
      )
        throw new Error(
          'Ambiguous speech number or code. Write codes, ranges, fractions and grouping in words.',
        );
      const sign = value.startsWith('-') ? 'âm ' : value.startsWith('+') ? 'dương ' : '';
      const unsigned = value.replace(/^[+-]/u, '');
      const [whole = '', fraction] = unsigned.split(/[.,]/u);
      if (fraction === undefined) return sign + integer(whole);
      if (fraction.length === 3 && whole !== '0')
        throw new Error('Ambiguous decimal or thousands separator. Write this number in words.');
      if (fraction.length > 6)
        throw new Error(
          'Speech decimals support at most six fractional digits. Write this number in words.',
        );
      return `${sign}${integer(whole)} phẩy ${digitSequence(fraction)}`;
    },
  );
  spoken = spoken
    .replace(/%/gu, ' phần trăm ')
    .replace(/&/gu, ' và ')
    .replace(/\+/gu, ' cộng ')
    .replace(/=/gu, ' bằng ')
    .replace(/×/gu, ' nhân ')
    .replace(/÷/gu, ' chia ')
    .replace(/℃|°\s*C(?![\p{L}\p{N}])/giu, ' độ xê ')
    .replace(/℉|°\s*F(?![\p{L}\p{N}])/giu, ' độ ép ')
    .replace(/°/gu, ' độ ');
  // Resolve units before letter spelling so planning and tokenization see the
  // same final spoken form, including explicit Celsius/Fahrenheit unit names.
  spoken = spellUnsupportedLatinWords(spoken).replace(/\s+/gu, ' ').trim();
  if (spoken.length > MAX_TEXT_CHARACTERS)
    throw new Error(
      'Expanded speech exceeds 10000 characters. Split the source caption before dubbing.',
    );
  return spoken;
}
