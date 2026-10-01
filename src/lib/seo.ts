import { getImage } from 'astro:assets';
import { SITE_URL } from '../config';
import { PROFILE_LINKS } from '../data/shared';
import { FOCUS_IDS, type Text } from '../data/types';
import { absolutePageUrl, getProfile, publicUrl, type Locale } from './i18n';
import { portrait } from './portrait';
import { plainText } from './text';

const WORD_JOINER = String.fromCodePoint(0x2060);

/** A typeset text in data form: no-break spaces as spaces, word joiners removed. */
const text = (value: Text): string => plainText(value).replaceAll(WORD_JOINER, '').replace(/\s+/g, ' ');

/** Open Graph locale of each language. */
export const OG_LOCALE: Readonly<Record<Locale, string>> = { en: 'en_GB', ru: 'ru_RU' };

/** Social preview image of a language: public/og-en.png or og-ru.png, made by `npm run og`. */
export function socialImage(lang: Locale) {
  const t = getProfile(lang);
  return {
    url: new URL(publicUrl(`og-${lang}.png`), SITE_URL).href,
    width: 1200,
    height: 630,
    alt: `${text(t.hero.name)}. ${text(t.hero.lines[0] ?? '')} ${text(t.hero.location)}.`,
  };
}


/** Country of the location in the profile, as an ISO 3166 code. */
const COUNTRY = 'TJ';

/** A label in sentence case: "Thermal Power and Heat Engineering" becomes "Thermal power and heat engineering". */
const sentenceCase = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1).toLocaleLowerCase();

/**
 * schema.org Person for the home page of a language. No email: the full
 * address must not appear in any built file. knowsAbout lists the research
 * areas worked in (not those marked as interests) and the degree field. The
 * image is the portrait, when there is one.
 */
export async function personJsonLd(lang: Locale) {
  const t = getProfile(lang);
  const other = getProfile(lang === 'en' ? 'ru' : 'en');
  const job = t.experience.isw;
  const degree = t.education.degrees.msc;
  const image = portrait && (await getImage({ src: portrait, width: 480, height: 480, fit: 'cover', position: 'top', format: 'webp' }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${absolutePageUrl('en', 'home')}#person`,
    name: text(t.hero.name),
    alternateName: text(other.hero.name),
    url: absolutePageUrl(lang, 'home'),
    ...(image ? { image: new URL(image.src, SITE_URL).href } : {}),
    jobTitle: text(job.role),
    worksFor: { '@type': 'Organization', name: text(job.org) },
    alumniOf: { '@type': 'CollegeOrUniversity', name: text(degree.institution) },
    knowsAbout: [
      ...FOCUS_IDS.filter((id) => !t.focus[id].interest).map((id) => text(t.focus[id].title)),
      sentenceCase(text(degree.field)),
    ],
    address: { '@type': 'PostalAddress', addressLocality: text(t.hero.location).split(',')[0]!.trim(), addressCountry: COUNTRY },
    sameAs: PROFILE_LINKS.map((link) => link.href),
  };
}
