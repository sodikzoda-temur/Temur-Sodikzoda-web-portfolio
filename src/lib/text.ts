import type { Text } from '../data/types';

/** The characters of a text without its language markup. */
export const plainText = (value: Text): string =>
  typeof value === 'string' ? value : value.parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');
