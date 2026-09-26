import type { Locale, RichText } from '../data/types';

// Typographic spaces and joiners, added when pages are built. The data files
// keep ordinary spaces and hyphens, so their words are exactly what is shown.
// Non-ASCII characters in the code are written as \u escapes (comments keep
// readable examples); in the patterns \s already includes the non-breaking space.

const NBSP = '\u00A0';

/** U+2060 WORD JOINER: forbids a line break at its position and has no glyph. */
const WORD_JOINER = '\u2060';

/**
 * Russian one-letter words stay with the next word: а, в, и, к, с, о, у, я and
 * their capitals. The pattern lists them as \u escapes so that Latin look-alikes
 * (a, c, o, y) cannot slip in.
 */
const RU_ONE_LETTER_WORD =
  /(?<=^|[\s(\u00AB\u201E"])([\u0430\u0432\u0438\u043A\u0441\u043E\u0443\u044F\u0410\u0412\u0418\u041A\u0421\u041E\u0423\u042F]) (?=\S)/gu;

/** A number, with an optional short ending, stays with the next word: «4 статьи», «3-я Международная». */
const RU_NUMBER_BEFORE_WORD = /(?<=^|[\s(\u00AB\u201E"\u2013])(\d+(?:-\p{L}{1,3})?) (?=\p{L})/gu;

/** «см.» stays with what it points to: «(см. «Публикации»)». */
const RU_SEE = /(?<=^|[\s(])(\u0441\u043C\.) /gu;

/** No break after the hyphen of a number with a short ending: «3-я», «10-й». */
const RU_ORDINAL_HYPHEN = /(\d)-(?=\p{L}{1,3}(?!\p{L}))/gu;

/** No break after the hyphen between an abbreviation and a number: NPK-2019, ТЭЦ-4. */
const ABBREVIATION_HYPHEN = /(\p{Lu}{2,})-(?=\d)/gu;

/** An initial: capital letter, optional lower-case letter, full stop ("Д.", "Kh."). */
const INITIAL = String.raw`\p{Lu}\p{Ll}?\.`;
const BETWEEN_INITIALS = new RegExp(`(${INITIAL}) (?=${INITIAL})`, 'gu');
const SURNAME_BEFORE_INITIAL = new RegExp(String.raw`(\p{L}{2,}) (?=${INITIAL})`, 'gu');

/** «С.» and «Т.» (Russian page and volume), "pp." and "vol." bind to the number after them. */
const PAGE_AND_VOLUME = /(?<=^|[\s(])(\u0421|\u0422|pp|vol)\. /gu;

/** «2018 г.» keeps the year and «г.» together. */
const YEAR_ABBREVIATION = /(\d) (?=\u0433\.)/gu;

/** No break after the en dash of a number range in a citation: 356–360, 10–14. */
const NUMBER_RANGE_DASH = /(\d)\u2013(?=\d)/gu;

/** Running text in either language. */
export function typeset(text: string, lang: Locale): string {
  let result = text.replace(ABBREVIATION_HYPHEN, `$1-${WORD_JOINER}`);
  if (lang === 'ru') {
    result = result
      .replace(RU_ONE_LETTER_WORD, `$1${NBSP}`)
      .replace(RU_NUMBER_BEFORE_WORD, `$1${NBSP}`)
      .replace(RU_SEE, `$1${NBSP}`)
      // After the number rule, which matches the plain hyphen in «3-я».
      .replace(RU_ORDINAL_HYPHEN, `$1-${WORD_JOINER}`);
  }
  return result;
}

/** Bibliographic citations in either language. */
export function typesetCitation(text: string, lang: Locale): string {
  return typeset(text, lang)
    .replace(BETWEEN_INITIALS, `$1${NBSP}`)
    .replace(SURNAME_BEFORE_INITIAL, `$1${NBSP}`)
    .replace(PAGE_AND_VOLUME, `$1.${NBSP}`)
    .replace(YEAR_ABBREVIATION, `$1${NBSP}`)
    .replace(NUMBER_RANGE_DASH, `$1\u2013${WORD_JOINER}`);
}

const isRichText = (value: unknown): value is RichText =>
  typeof value === 'object' && value !== null && Array.isArray((value as RichText).parts);

/**
 * Applies `typeset` to every text in a content object, keeping its shape.
 * Phrases marked as another language are typeset by that language's rules.
 */
export function typesetAll<T>(value: T, lang: Locale): T {
  if (typeof value === 'string') return typeset(value, lang) as T;
  if (isRichText(value)) {
    const parts = value.parts.map((part) =>
      typeof part === 'string' ? typeset(part, lang) : { lang: part.lang, text: typeset(part.text, part.lang) },
    );
    return { parts } as T;
  }
  if (Array.isArray(value)) return value.map((item: unknown) => typesetAll(item, lang)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typesetAll(item, lang)])) as T;
  }
  return value;
}
