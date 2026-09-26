import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from 'astro:i18n';
import en from '../data/en';
import { publications } from '../data/publications';
import ru from '../data/ru';
import { LOCALES, SECTION_IDS, type Locale, type Profile, type SectionId } from '../data/types';
import { typesetAll, typesetCitation } from './typography';

export { LOCALES, type Locale };

// Content is typeset once here, so every page gets the same non-breaking spaces.
const profiles: Readonly<Record<Locale, Profile>> = { en: typesetAll(en, 'en'), ru: typesetAll(ru, 'ru') };

/** Value of `<html lang>` for each locale. */
export const HTML_LANG: Readonly<Record<Locale, string>> = { en: 'en-GB', ru: 'ru' };

/** Pages that exist in both languages. */
export type PageKey = 'home' | 'cv';
const PAGE_PATHS: Readonly<Record<PageKey, string>> = { home: '', cv: 'cv' };

export const getProfile = (lang: Locale): Profile => profiles[lang];

export interface PublicationEntry {
  year: number;
  citation: string;
  /** Language note, shown on English pages only. */
  note?: string;
}

/** Publications for one language, newest first, with typeset citations. */
export const getPublications = (lang: Locale): readonly PublicationEntry[] =>
  publications.map((item) => ({
    year: item.year,
    citation: typesetCitation(item.citation[lang], lang),
    ...(lang === 'en' ? { note: item.note } : {}),
  }));

/** Root-relative URL of a page, including `base` and the trailing slash. */
export const pageUrl = (lang: Locale, page: PageKey): string =>
  getRelativeLocaleUrl(lang, PAGE_PATHS[page]);

/** Link to a home page section, e.g. "/base/ru/#focus"; the id is checked against SECTION_IDS. */
export const sectionUrl = (lang: Locale, id: SectionId): string => `${pageUrl(lang, 'home')}#${id}`;

/** Absolute URL of a page, for canonical and hreflang links. */
export const absolutePageUrl = (lang: Locale, page: PageKey): string =>
  getAbsoluteLocaleUrl(lang, PAGE_PATHS[page]);

/** URL of a file in `public/`, including `base`. */
export const publicUrl = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

/** About opens the home page as an introduction and carries no number. */
const NUMBERED_SECTIONS: readonly SectionId[] = SECTION_IDS.filter((id) => id !== 'about');

/** Two-digit number shown in a home section label ("01 Research focus"). */
export function sectionNumber(id: SectionId): string | undefined {
  const index = NUMBERED_SECTIONS.indexOf(id);
  return index < 0 ? undefined : String(index + 1).padStart(2, '0');
}
