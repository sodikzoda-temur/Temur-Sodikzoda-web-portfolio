import type { Foreign, RichText } from './types';

/**
 * Text with phrases in another language, so pages can mark them with `lang`:
 * rich('Мониторинг ветланда (', inEnglish('constructed wetland'), '), больница Дехмой')
 */
export const rich = (...parts: ReadonlyArray<string | Foreign>): RichText => ({ parts });

/** A phrase in English inside Russian text. */
export const inEnglish = (text: string): Foreign => ({ lang: 'en', text });
