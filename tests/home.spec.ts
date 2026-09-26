import type { Locator, Page } from '@playwright/test';
import en from '../src/data/en.ts';
import { publications } from '../src/data/publications.ts';
import ru from '../src/data/ru.ts';
import { CITATION_AUTHOR, EMAIL, PROFILE_LINKS, SHOW_AVAILABILITY } from '../src/data/shared.ts';
import {
  DEGREE_IDS,
  EVENT_IDS,
  EXPERIENCE_IDS,
  FOCUS_IDS,
  LANGUAGE_IDS,
  MEMBERSHIP_IDS,
  TOOL_IDS,
  TRAINING_IDS,
  WORK_IDS,
  type Profile,
  type Text,
} from '../src/data/types.ts';
import { joinParts } from '../src/lib/format.ts';
import { plainText } from '../src/lib/text.ts';
import { BASE, expect, test, visit } from './fixtures';

// Section 7 of the brief, written out here on purpose instead of imported.
const SECTION_ORDER = ['about', 'focus', 'work', 'publications', 'experience', 'education', 'affiliations', 'skills', 'contact'];
const NAV_ORDER = ['focus', 'work', 'publications', 'experience', 'contact'];

const PAGES: ReadonlyArray<{ lang: 'en' | 'ru'; path: string; t: Profile }> = [
  { lang: 'en', path: '', t: en },
  { lang: 'ru', path: 'ru/', t: ru },
];

const WORD_JOINER = String.fromCodePoint(0x2060);

/** Rendered text in data form: no-break spaces as spaces, word joiners removed, spaces collapsed. */
const plain = (text: string) => text.replaceAll(WORD_JOINER, '').replace(/\s+/g, ' ').trim();
const data = (value: Text) => plain(plainText(value));

const texts = async (locator: Locator) => (await locator.allTextContents()).map(plain);
const text = async (locator: Locator) => plain((await locator.textContent()) ?? '');
const item = (page: Page, section: string, id: string) => page.locator(`#${section} [data-item="${id}"]`);

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

    test('About and Research focus match the data', async ({ page }) => {
      await visit(page, path);
      expect(await texts(page.locator('#about .about p'))).toEqual(t.about.map(data));
      expect(await page.locator('#focus [data-item]').evaluateAll((els) => els.map((e) => e.getAttribute('data-item')))).toEqual([...FOCUS_IDS]);
      for (const id of FOCUS_IDS) {
        const area = t.focus[id];
        expect(await text(item(page, 'focus', id).locator('h3'))).toBe(data(area.title));
        expect(await text(item(page, 'focus', id).locator('p:not(.focus__tag)'))).toBe(data(area.text));
        const tags = await texts(item(page, 'focus', id).locator('.tag'));
        expect(tags, id).toEqual(area.interest ? [data(t.ui.researchInterest)] : []);
      }
    });

    test('Selected work shows every field of every item', async ({ page }) => {
      await visit(page, path);
      expect(await page.locator('#work [data-item]').evaluateAll((els) => els.map((e) => e.getAttribute('data-item')))).toEqual([...WORK_IDS]);
      for (const id of WORK_IDS) {
        const work = t.work[id];
        const entry = item(page, 'work', id);
        expect(await text(entry.locator('h3')), id).toBe(data(work.title));
        expect(await texts(entry.locator('.work__org')), id).toEqual(work.org ? [data(work.org)] : []);
        expect(await texts(entry.locator('.tag')), id).toEqual([work.period, work.funding].filter((v) => v !== undefined).map(data));
        expect(await texts(entry.locator('.work__partners')), id).toEqual(work.partners ? [data(work.partners)] : []);
        expect(await texts(entry.locator('.work__points > li')), id).toEqual(work.points.map(data));
      }
    });

    test('Publications: newest first, exact citations, notes and closing line', async ({ page }) => {
      await visit(page, path);
      const years = await page.locator('#publications [data-year]').evaluateAll((groups) => groups.map((g) => g.getAttribute('data-year')));
      expect(years).toEqual(['2020', '2019', '2018']);
      const ordered = [...publications].sort((a, b) => b.year - a.year);
      expect(await texts(page.locator('#publications .pub__citation'))).toEqual(ordered.map((p) => data(p.citation[lang])));
      expect(await texts(page.locator('#publications .pub__note'))).toEqual(lang === 'en' ? ordered.map((p) => p.note) : []);
      expect(await texts(page.locator('#publications .pub__author'))).toEqual(ordered.map(() => data(CITATION_AUTHOR[lang])));
      expect(await text(page.locator('#publications .pubs__closing'))).toBe(data(t.publications.closing));
    });

    test('Experience shows period, role, organisation, place and summary', async ({ page }) => {
      await visit(page, path);
      for (const id of EXPERIENCE_IDS) {
        const role = t.experience[id];
        const entry = item(page, 'experience', id);
        expect(await text(entry.locator('.entry__aside')), id).toBe(data(role.period));
        expect(await text(entry.locator('h3')), id).toBe(data(role.role));
        expect(await text(entry.locator('.experience__org')), id).toBe(data(joinParts(role.org, role.place)));
        expect(await texts(entry.locator('.entry__main > p.muted')), id).toEqual(role.summary ? [data(role.summary)] : []);
      }
    });

    test('Education and training show every field', async ({ page }) => {
      await visit(page, path);
      for (const id of DEGREE_IDS) {
        const degree = t.education.degrees[id];
        const entry = item(page, 'education', id);
        expect(await text(entry.locator('.entry__aside')), id).toBe(data(degree.period));
        expect(await text(entry.locator('h4')), id).toBe(data(joinParts(degree.degree, degree.field)));
        expect(await text(entry.locator('.education__school')), id).toBe(data(joinParts(degree.institution, degree.place)));
        expect(await texts(entry.locator('.education__details > li')), id).toEqual(degree.details.map(data));
      }
      for (const id of TRAINING_IDS) {
        const course = t.education.training[id];
        const entry = item(page, 'education', id);
        expect(await text(entry.locator('.entry__aside')), id).toBe(data(course.year));
        expect(await text(entry.locator('.education__course')), id).toBe(data(course.title));
        expect(await text(entry.locator('.entry__main > p.muted')), id).toBe(data(joinParts(course.provider, course.place)));
      }
    });

    test('Affiliations, languages and tools match the data', async ({ page }) => {
      await visit(page, path);
      for (const id of MEMBERSHIP_IDS) expect(await text(item(page, 'affiliations', id)), id).toBe(data(t.affiliations.memberships[id]));
      for (const id of EVENT_IDS) expect(await text(item(page, 'affiliations', id)), id).toBe(data(t.affiliations.events[id]));
      for (const id of LANGUAGE_IDS) {
        expect(await text(item(page, 'skills', id).locator('dt')), id).toBe(data(t.skills.languages[id].name));
        expect(await text(item(page, 'skills', id).locator('dd')), id).toBe(data(t.skills.languages[id].level));
      }
      for (const id of TOOL_IDS) expect(await text(item(page, 'skills', id)), id).toBe(data(t.skills.tools[id]));
      expect(await texts(page.locator('#affiliations .subhead'))).toEqual([t.affiliations.membershipsLabel, t.affiliations.eventsLabel].map(data));
      expect(await texts(page.locator('#skills .subhead'))).toEqual([t.skills.languagesLabel, t.skills.toolsLabel].map(data));
    });

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

    test('has no em dashes', async ({ page }) => {
      await visit(page, path);
      expect(await page.evaluate(() => document.body.innerText.includes(String.fromCodePoint(0x2014)))).toBe(false);
    });
  });
}

test.describe('language of parts', () => {
  test('English phrases and course titles on the Russian page are marked lang="en"', async ({ page }) => {
    await visit(page, 'ru/');
    await expect(item(page, 'focus', 'decentralised').locator('[lang="en"]')).toHaveText('constructed wetlands');
    await expect(item(page, 'work', 'wetland').locator('[lang="en"]')).toHaveText('constructed wetland');
    await expect(item(page, 'affiliations', 'cop4wash').locator('[lang="en"]')).toHaveText('Cooperation of Practices for WASH (CoP4WASH)');
    for (const id of ['tsinghua', 'mitx'] as const) {
      await expect(item(page, 'education', id).locator('.education__course [lang="en"]')).toHaveText(data(ru.education.training[id].title));
    }
  });

  test('the English page needs no language marks', async ({ page }) => {
    await visit(page, '');
    await expect(page.locator('main [lang]')).toHaveCount(0);
  });
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
