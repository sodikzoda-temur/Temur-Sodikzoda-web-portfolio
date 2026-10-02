import { EMAIL, PHONE_PARTS, PROFILE_LINKS } from '../data/shared';
import { absolutePageUrl, getProfile, type Locale } from './i18n';
import { dataText } from './text';
import type { ContactFields } from './vcard';

/** File name of the downloaded card, from the English name: temur-sodikzoda.vcf. */
export const VCARD_FILE = `${dataText(getProfile('en').hero.name).toLowerCase().replace(/\s+/g, '-')}.vcf`;

/** The full address and number, only for the QR code image; never written into a page as text. */
export const emailAddress = () => `${EMAIL.user}@${EMAIL.domain}`;
export const phoneNumber = () => PHONE_PARTS.join('');

/** Contact card fields in a language, all from the data. */
export function contactFields(lang: Locale): ContactFields {
  const t = getProfile(lang);
  const [givenName = '', ...family] = dataText(t.hero.name).split(' ');
  const [locality = '', country = ''] = dataText(t.hero.location).split(/,\s*/);
  return {
    givenName,
    familyName: family.join(' '),
    org: dataText(t.experience.isw.org),
    title: dataText(t.experience.isw.role),
    url: absolutePageUrl(lang, 'home'),
    locality,
    country,
    links: PROFILE_LINKS.map((link) => ({ label: link.label, href: link.href })),
  };
}
