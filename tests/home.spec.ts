import en from '../src/data/en.ts';
import ru from '../src/data/ru.ts';
import { EMAIL, PROFILE_LINKS, SHOW_AVAILABILITY } from '../src/data/shared.ts';
import type { Profile } from '../src/data/types.ts';
import { BASE, expect, test, visit } from './fixtures';
import { data, item, plain, sharedSectionTests, text, texts } from './sections';

// Section 7 of the brief, written out here on purpose instead of imported.
const SECTION_ORDER = ['about', 'focus', 'work', 'publications', 'experience', 'education', 'affiliations', 'skills', 'contact'];
const NAV_ORDER = ['focus', 'work', 'publications', 'experience', 'contact'];

const PAGES: ReadonlyArray<{ lang: 'en' | 'ru'; path: string; t: Profile }> = [
  { lang: 'en', path: '', t: en },
  { lang: 'ru', path: 'ru/', t: ru },
];

for (const { lang, path, t } of PAGES) {
  test.describe(`home page (${lang})`, () => {
    test('sections and navigation follow the brief order', async ({ page }) => {
      await visit(page, path);
      const ids = await page.locator('main > section[id]').evaluateAll((sections) => sections.map((s) => s.id));
      expect(ids).toEqual(SECTION_ORDER);

      const navTargets = await page.locator('.site-nav a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(navTargets).toEqual(NAV_ORDER.map((id) => `${BASE}${path}#${id}`));
      expect(await texts(page.locator('.site-nav a'))).toEqual(NAV_ORDER.map((id) => plain(t.nav[id as keyof Profile['nav']])));

      let number = 0;
      for (const id of SECTION_ORDER) {
        const heading = page.locator(`#${id}-label`);
        await expect(heading).toHaveAccessibleName(plain(t.sections[id as keyof Profile['sections']]));
        if (id === 'about') continue;
        number += 1;
        await expect(heading.locator('.section__num')).toHaveText(String(number).padStart(2, '0'));
      }
    });

    test('hero shows the data and links to Research and the CV', async ({ page }) => {
      await visit(page, path);
      expect(await text(page.locator('.hero__name'))).toBe(data(t.hero.name));
      expect(await texts(page.locator('.hero__lines p'))).toEqual(t.hero.lines.map(data));
      expect(await text(page.locator('.hero__location'))).toBe(data(t.hero.location));
      const [research, cv] = await page.locator('.hero__links a').all();
      await expect(research!).toHaveAttribute('href', `${BASE}${path}#focus`);
      await expect(research!).toHaveText(t.hero.links.research);
      await expect(cv!).toHaveAttribute('href', `${BASE}${path}cv/`);
      await expect(cv!).toHaveText(t.hero.links.cv);
    });

    sharedSectionTests(lang, path);

    test('contact: email built by the script, profile links, availability off', async ({ page }) => {
      await visit(page, path);
      const address = `${EMAIL.user}@${EMAIL.domain}`;
      const email = page.locator('#contact a[href^="mailto:"]');
      await expect(email).toHaveAttribute('href', `mailto:${address}`);
      await expect(email).toHaveText(address);
      expect(await texts(page.locator('#contact dt'))).toEqual([t.contact.emailLabel, t.contact.profilesLabel].map(data));

      // The fallback stays in the markup for browsers without JavaScript.
      const html = await (await page.request.get(page.url())).text();
      expect(html).toContain(`<noscript>${EMAIL.user} ${t.contact.emailAt} ${EMAIL.domain}</noscript>`);
      expect(html).not.toContain(address);

      for (const link of PROFILE_LINKS) {
        const anchor = page.locator(`#contact a[data-profile="${link.id}"]`);
        await expect(anchor).toHaveAttribute('href', link.href);
        await expect(anchor).toHaveText(link.label);
        await expect(anchor).toHaveAttribute('rel', /(?=.*\bnoopener\b)(?=.*\bnoreferrer\b)/);
        await expect(anchor).not.toHaveAttribute('target', /.*/);
      }

      const availability = await page.locator('#contact').evaluate((el) => el.textContent ?? '');
      expect(plain(availability).includes(data(t.contact.availability))).toBe(SHOW_AVAILABILITY);
    });
  });
}

test.describe('language of parts', () => {
  for (const path of ['ru/', 'ru/cv/']) {
    test(`English phrases and course titles on /${path} are marked lang="en"`, async ({ page }) => {
      await visit(page, path);
      await expect(item(page, 'focus', 'decentralised').locator('[lang="en"]')).toHaveText('constructed wetlands');
      await expect(item(page, 'work', 'wetland').locator('[lang="en"]')).toHaveText('constructed wetland');
      await expect(item(page, 'affiliations', 'cop4wash').locator('[lang="en"]')).toHaveText('Cooperation of Practices for WASH (CoP4WASH)');
      for (const id of ['tsinghua', 'mitx'] as const) {
        await expect(item(page, 'education', id).locator('.education__course [lang="en"]')).toHaveText(data(ru.education.training[id].title));
      }
    });
  }

  for (const path of ['', 'cv/']) {
    test(`English page /${path} needs no language marks`, async ({ page }) => {
      await visit(page, path);
      await expect(page.locator('main [lang]')).toHaveCount(0);
    });
  }
});

test.describe('layout grid and hyphenation', () => {
  test('main grid has 12 tracks from 768px and one below; body text hyphenates', async ({ page }) => {
    await visit(page, 'ru/');
    for (const [width, tracks] of [[360, 1], [390, 1], [767, 1], [768, 12], [1024, 12], [1440, 12]] as const) {
      await page.setViewportSize({ width, height: 900 });
      const count = await page.locator('#work > .grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
      expect(count, `${width}px`).toBe(tracks);
    }
    expect(await page.evaluate(() => getComputedStyle(document.body).hyphens)).toBe('auto');
    expect(await page.locator('#about p').first().evaluate((p) => getComputedStyle(p).hyphens)).toBe('auto');
  });
});

test.describe('navigation anchors', () => {
  for (const { lang, path, t } of PAGES) {
    test(`land on their sections below the sticky header (${lang})`, async ({ page }) => {
      await visit(page, path);
      for (const id of NAV_ORDER) {
        await page.locator('.site-nav__link', { hasText: plain(t.nav[id as keyof Profile['nav']]) }).click();
        await expect(page).toHaveURL(`${BASE}${path}#${id}`);
        const { headerBottom, top, atEnd } = await page.evaluate((sectionId) => {
          const root = document.documentElement;
          return {
            headerBottom: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
            top: document.getElementById(sectionId)!.getBoundingClientRect().top,
            atEnd: window.scrollY + window.innerHeight >= root.scrollHeight - 1,
          };
        }, id);
        // Never hidden under the header; right below it unless the page cannot scroll further.
        expect(top, id).toBeGreaterThanOrEqual(headerBottom - 1);
        if (!atEnd) expect(top, id).toBeLessThanOrEqual(headerBottom + 48);
      }
    });
  }
});

test.describe('contact without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the address in "name at domain" form', async ({ page }) => {
    await visit(page, '');
    // Rendered text: Playwright's text matching skips <noscript> content.
    const rendered = await page.locator('#contact').evaluate((element: HTMLElement) => element.innerText);
    expect(rendered).toContain(`${EMAIL.user} ${en.contact.emailAt} ${EMAIL.domain}`);
    await expect(page.locator('#contact a[href^="mailto:"]')).toHaveCount(0);
  });
});
