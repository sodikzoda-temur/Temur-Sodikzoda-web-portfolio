import type { Locale } from '../data/types';

// Typographic non-breaking spaces, added when pages are built. The data files
// keep ordinary spaces, so the wording there is exactly what is shown.

const NBSP = ' ';

/**
 * Russian one-letter words stay with the word after them:
 * а, в, и, к, с, о, у, я and their capitals (Cyrillic, escaped to rule out
 * Latin look-alikes).
 */
const RU_ONE_LETTER_WORD =
  /(?<=^|[\s («„"])([авиксоуяАВИКСОУЯ]) (?=\S)/gu;

/** An initial: capital letter, optional lower-case letter, full stop ("Д.", "Kh."). */
const INITIAL = String.raw`\p{Lu}\p{Ll}?\.`;
const BETWEEN_INITIALS = new RegExp(`(${INITIAL}) (?=${INITIAL})`, 'gu');
const SURNAME_BEFORE_INITIAL = new RegExp(String.raw`(\p{L}{2,}) (?=${INITIAL})`, 'gu');

/** "С." and "Т." (Russian page and volume), "pp." and "vol." bind to the number after them. */
const PAGE_AND_VOLUME = /(?<=^|[\s (])(С|Т|pp|vol)\. /gu;

/** "2018 г." keeps the year and "г." together. */
const YEAR_ABBREVIATION = /(\d) (?=г\.)/gu;

/** Running text: Russian one-letter words; English is left as written. */
export function typeset(text: string, lang: Locale): string {
  return lang === 'ru' ? text.replace(RU_ONE_LETTER_WORD, `$1${NBSP}`) : text;
}

/** Bibliographic citations in either language. */
export function typesetCitation(text: string, lang: Locale): string {
  return typeset(text, lang)
    .replace(BETWEEN_INITIALS, `$1${NBSP}`)
    .replace(SURNAME_BEFORE_INITIAL, `$1${NBSP}`)
    .replace(PAGE_AND_VOLUME, `$1.${NBSP}`)
    .replace(YEAR_ABBREVIATION, `$1${NBSP}`);
}

/** Applies `typeset` to every string in a content object, keeping its shape. */
export function typesetAll<T>(value: T, lang: Locale): T {
  if (typeof value === 'string') return typeset(value, lang) as T;
  if (Array.isArray(value)) return value.map((item: unknown) => typesetAll(item, lang)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typesetAll(item, lang)])) as T;
  }
  return value;
}
