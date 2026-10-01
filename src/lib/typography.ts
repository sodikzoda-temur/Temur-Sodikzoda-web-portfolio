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

/** Two-letter prepositions stay with the next word: по, на, за, из, от, до, со, во, ко, об (and capitalised). */
const RU_TWO_LETTER_PREPOSITION = /(?<=^|[\s(\u00AB\u201E"])(\u043F\u043E|\u041F\u043E|\u043D\u0430|\u041D\u0430|\u0437\u0430|\u0417\u0430|\u0438\u0437|\u0418\u0437|\u043E\u0442|\u041E\u0442|\u0434\u043E|\u0414\u043E|\u0441\u043E|\u0421\u043E|\u0432\u043E|\u0412\u043E|\u043A\u043E|\u041A\u043E|\u043E\u0431|\u041E\u0431) (?=\S)/gu;

/** A month stays with its year: «октября 2022», «по февраль 2026». */
const RU_MONTH_BEFORE_YEAR = /(?<=^|[\s(\u00A0])(\u044F\u043D\u0432\u0430\u0440[\u044C\u044F]|\u0444\u0435\u0432\u0440\u0430\u043B[\u044C\u044F]|\u043C\u0430\u0440\u0442\u0430?|\u0430\u043F\u0440\u0435\u043B[\u044C\u044F]|\u043C\u0430[\u0439\u044F]|\u0438\u044E\u043D[\u044C\u044F]|\u0438\u044E\u043B[\u044C\u044F]|\u0430\u0432\u0433\u0443\u0441\u0442\u0430?|\u0441\u0435\u043D\u0442\u044F\u0431\u0440[\u044C\u044F]|\u043E\u043A\u0442\u044F\u0431\u0440[\u044C\u044F]|\u043D\u043E\u044F\u0431\u0440[\u044C\u044F]|\u0434\u0435\u043A\u0430\u0431\u0440[\u044C\u044F]) (?=\d{4}(?!\d))/gu;

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

/** No break after the hyphen of an abbreviation such as «науч.-практ.». */
const ABBREVIATION_DOT_HYPHEN = /(\.)-(?=\p{L})/gu;

/** «сб. ст.» (collection of papers) stays together. */
const RU_COLLECTION = /(?<=^|[\s(:])(\u0441\u0431\.) (?=\u0441\u0442\.)/gu;

/** No break after the en dash of a number range in a citation: 356–360, 10–14. */
const NUMBER_RANGE_DASH = /(\d)\u2013(?=\d)/gu;

/** Running text in either language. */
export function typeset(text: string, lang: Locale): string {
  let result = text.replace(ABBREVIATION_HYPHEN, `$1-${WORD_JOINER}`);
  if (lang === 'ru') {
    result = result
      .replace(RU_ONE_LETTER_WORD, `$1${NBSP}`)
      .replace(RU_TWO_LETTER_PREPOSITION, `$1${NBSP}`)
      .replace(RU_MONTH_BEFORE_YEAR, `$1${NBSP}`)
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
    .replace(ABBREVIATION_DOT_HYPHEN, `$1-${WORD_JOINER}`)
    .replace(RU_COLLECTION, `$1${NBSP}`)
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
