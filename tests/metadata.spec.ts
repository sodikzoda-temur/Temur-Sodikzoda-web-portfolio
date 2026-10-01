import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SITE_URL } from '../src/config.ts';
import { PROFILE_LINKS } from '../src/data/shared.ts';
import { FOCUS_IDS } from '../src/data/types.ts';
import { BASE, MISSING_PATH, SITE_PAGES, expect, test, visit } from './fixtures';
import { PROFILES, data } from './sections';

const ABSOLUTE = new RegExp(`^${SITE_URL.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`);
const OG_LOCALE = { en: 'en_GB', ru: 'ru_RU' } as const;
const HAS_PORTRAIT = existsSync(fileURLToPath(new URL('../src/assets/portrait.jpg', import.meta.url)));

/** Width and height from a PNG header. */
const pngSize = (bytes: Buffer) => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });

test.describe('metadata', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Static markup; one engine is enough');

  for (const { name, path, lang, english } of SITE_PAGES) {
    test(`${name}: title, description, canonical, Open Graph and Twitter card`, async ({ page }) => {
      await visit(page, path);
      const t = PROFILES[lang];
      const meta = t.meta[path.endsWith('cv/') ? 'cv' : 'home'];
      const content = (selector: string) => page.locator(selector).getAttribute('content');

      await expect(page).toHaveTitle(data(meta.title));
      expect(data((await content('meta[name="description"]'))!)).toBe(data(meta.description));
      const url = `${SITE_URL}${path}`;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', url);
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', `${SITE_URL}${english}`);

      expect(await content('meta[property="og:url"]')).toBe(url);
      expect(await content('meta[property="og:type"]')).toBe(path.endsWith('cv/') ? 'website' : 'profile');
      expect(data((await content('meta[property="og:title"]'))!)).toBe(data(meta.title));
      expect(data((await content('meta[property="og:description"]'))!)).toBe(data(meta.description));
      expect(data((await content('meta[property="og:site_name"]'))!)).toBe(data(t.hero.name));
      expect(await content('meta[property="og:locale"]')).toBe(OG_LOCALE[lang]);
      expect(await content('meta[property="og:locale:alternate"]')).toBe(OG_LOCALE[lang === 'en' ? 'ru' : 'en']);

      const image = (await content('meta[property="og:image"]'))!;
      expect(image).toBe(`${SITE_URL}og-${lang}.png`);
      expect(await content('meta[property="og:image:width"]')).toBe('1200');
      expect(await content('meta[property="og:image:height"]')).toBe('630');
      expect(data((await content('meta[property="og:image:alt"]'))!)).toBe(`${data(t.hero.name)}. ${data(t.hero.lines[0]!)} ${data(t.hero.location)}.`);

      expect(await content('meta[name="twitter:card"]')).toBe('summary_large_image');
      expect(await content('meta[name="twitter:image"]')).toBe(image);
      expect(await content('meta[name="twitter:title"]')).toBe(await content('meta[property="og:title"]'));
      expect(await content('meta[name="twitter:description"]')).toBe(await content('meta[property="og:description"]'));
      expect(await content('meta[name="twitter:image:alt"]')).toBe(await content('meta[property="og:image:alt"]'));

      // The image is served from this site under the same path, at 1200x630.
      const response = await page.request.get(image.replace(SITE_URL, BASE));
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('image/png');
      expect(pngSize(await response.body())).toEqual({ width: 1200, height: 630 });
    });
  }

  test.describe('404', () => {
    test.use({ allowedConsoleErrors: [/status of 404/] });

    test('the 404 page is not indexed and has no social card', async ({ page }) => {
      await page.goto(MISSING_PATH);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      await expect(page.locator('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]')).toHaveCount(0);
    });
  });

  test('favicons resolve', async ({ page }) => {
    await visit(page, 'ru/cv/');
    const links = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((elements) =>
      elements.map((element) => ({ href: element.getAttribute('href')!, sizes: element.getAttribute('sizes') })),
    );
    expect(links.map((link) => link.href)).toEqual([`${BASE}favicon-32.png`, `${BASE}favicon.svg`, `${BASE}apple-touch-icon.png`]);
    for (const { href } of links) {
      const response = await page.request.get(href);
      expect(response.status(), href).toBe(200);
      if (href.endsWith('.png')) {
        const size = pngSize(await response.body());
        expect(size, href).toEqual(href.includes('apple') ? { width: 180, height: 180 } : { width: 32, height: 32 });
      }
    }
  });
});

test.describe('structured data', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Static markup; one engine is enough');

  // schema.org properties used for a Person; anything else is a typo.
  const PERSON = ['@context', '@type', '@id', 'name', 'alternateName', 'url', ...(HAS_PORTRAIT ? ['image'] : []), 'jobTitle', 'worksFor', 'alumniOf', 'knowsAbout', 'address', 'sameAs'];

  for (const { name, path, lang } of SITE_PAGES) {
    test(`${name}: JSON-LD Person on home pages only, valid and from the data`, async ({ page }) => {
      await visit(page, path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      if (path.endsWith('cv/')) {
        expect(blocks).toEqual([]);
        return;
      }
      expect(blocks).toHaveLength(1);
      const person = JSON.parse(blocks[0]!);
      const t = PROFILES[lang];
      const other = PROFILES[lang === 'en' ? 'ru' : 'en'];
      expect(Object.keys(person).sort()).toEqual([...PERSON].sort());
      expect(person['@context']).toBe('https://schema.org');
      expect(person['@type']).toBe('Person');
      expect(person['@id']).toBe(`${SITE_URL}#person`);
      expect(person.name).toBe(data(t.hero.name));
      expect(person.alternateName).toBe(data(other.hero.name));
      expect(person.url).toBe(`${SITE_URL}${path}`);
      // The portrait, if there is one: the same file as on the page, as an absolute URL.
      if (HAS_PORTRAIT) {
        expect(person.image).toMatch(ABSOLUTE);
        expect((await page.request.get(person.image.replace(SITE_URL, BASE))).status()).toBe(200);
      } else {
        expect(person.image).toBeUndefined();
      }
      expect(person.jobTitle).toBe(data(t.experience.isw.role));
      expect(person.worksFor).toEqual({ '@type': 'Organization', name: data(t.experience.isw.org) });
      expect(person.alumniOf).toEqual({ '@type': 'CollegeOrUniversity', name: data(t.education.degrees.msc.institution) });
      // Areas worked in, not interests, and the degree field in sentence case.
      const field = data(t.education.degrees.msc.field);
      expect(person.knowsAbout).toEqual([
        ...FOCUS_IDS.filter((id) => !t.focus[id].interest).map((id) => data(t.focus[id].title)),
        field.charAt(0).toLocaleUpperCase() + field.slice(1).toLocaleLowerCase(),
      ]);
      expect(person.knowsAbout).not.toContain(data(t.focus.recovery.title));
      expect(person.address).toEqual({ '@type': 'PostalAddress', addressLocality: data(t.hero.location).split(',')[0], addressCountry: 'TJ' });
      expect(person.sameAs).toEqual(PROFILE_LINKS.map((link) => link.href));
      expect(JSON.stringify(person)).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}|email|telephone|streetAddress|birthDate/i);
    });
  }
});

test.describe('sitemap and robots.txt', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Static files; one engine is enough');

  test('the sitemap lists the four pages with their language alternates', async ({ request }) => {
    const response = await request.get('sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => ({
      loc: /<loc>([^<]+)<\/loc>/.exec(match[1]!)![1],
      alternates: Object.fromEntries([...match[1]!.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]])),
    }));
    expect(urls.map((url) => url.loc).sort()).toEqual([SITE_URL, `${SITE_URL}cv/`, `${SITE_URL}ru/`, `${SITE_URL}ru/cv/`].sort());
    for (const { loc, alternates } of urls) {
      const cv = loc!.endsWith('cv/');
      expect(alternates, loc).toEqual({
        en: `${SITE_URL}${cv ? 'cv/' : ''}`,
        ru: `${SITE_URL}ru/${cv ? 'cv/' : ''}`,
        'x-default': `${SITE_URL}${cv ? 'cv/' : ''}`,
      });
    }
  });

  test('robots.txt points to the sitemap by its absolute URL', async ({ request }) => {
    const response = await request.get('robots.txt');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(`Sitemap: ${SITE_URL}sitemap.xml`);
  });
});
