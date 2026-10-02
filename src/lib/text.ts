import type { Text } from '../data/types';

/** The characters of a text without its language markup. */
export const plainText = (value: Text): string =>
  typeof value === 'string' ? value : value.parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');

const WORD_JOINER = String.fromCodePoint(0x2060);

/** A typeset text as written in the data: no-break spaces as spaces, word joiners removed. */
export const dataText = (value: Text): string => plainText(value).replaceAll(WORD_JOINER, '').replace(/\s+/g, ' ');
