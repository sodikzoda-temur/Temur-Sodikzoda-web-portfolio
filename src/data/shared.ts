import type { Locale } from './types';

/**
 * Show the availability line in the Contact section (both languages).
 * The line itself is written in `en.ts` and `ru.ts`.
 */
export const SHOW_AVAILABILITY = false;

/** Split so the address never appears whole in the HTML. */
export const EMAIL = { user: 'sodikzoda.temur', domain: 'gmail.com' } as const;

export const PROFILE_LINKS = [
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/tsodikzoda' },
  { id: 'researchgate', label: 'ResearchGate', href: 'https://www.researchgate.net/profile/Temur-Sodikzoda' },
  { id: 'orcid', label: 'ORCID', href: 'https://orcid.org/0009-0008-4719-1146' },
] as const;

/** Each language named in its own language, read after "EN" and "RU" in the switch. */
export const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = {
  en: 'English',
  ru: 'Русский',
};

/** The owner's name as it appears in citations; emphasised in the publication list. */
export const CITATION_AUTHOR: Readonly<Record<Locale, string>> = {
  en: 'Sodikzoda T. Kh.',
  ru: 'Содикзода Т. Х.',
};
