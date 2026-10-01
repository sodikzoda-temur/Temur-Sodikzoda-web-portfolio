import type { Locator, Page } from '@playwright/test';
import en from '../src/data/en.ts';
import { publications } from '../src/data/publications.ts';
import ru from '../src/data/ru.ts';
import { CITATION_AUTHOR } from '../src/data/shared.ts';
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
import { expect, test, visit } from './fixtures';

/*
 * Per-field checks for the sections that the home page and the CV share. Both
 * pages render them from the same data, so both run the same checks.
 */

export const PROFILES: Record<'en' | 'ru', Profile> = { en, ru };

const WORD_JOINER = String.fromCodePoint(0x2060);

/** Rendered text in data form: no-break spaces as spaces, word joiners removed, spaces collapsed. */
export const plain = (text: string) => text.replaceAll(WORD_JOINER, '').replace(/\s+/g, ' ').trim();
export const data = (value: Text) => plain(plainText(value));

export const texts = async (locator: Locator) => (await locator.allTextContents()).map(plain);
export const text = async (locator: Locator) => plain((await locator.textContent()) ?? '');
export const item = (page: Page, section: string, id: string) => page.locator(`#${section} [data-item="${id}"]`);

/** Declares the per-field tests for one page; call inside a describe block. */
export function sharedSectionTests(lang: 'en' | 'ru', path: string) {
  const t = PROFILES[lang];

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
    expect(await page.locator('#experience [data-item]').evaluateAll((els) => els.map((e) => e.getAttribute('data-item')))).toEqual([...EXPERIENCE_IDS]);
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
    expect(await texts(page.locator('#education .subhead:not(.print-copy)'))).toEqual([t.education.degreesLabel, t.education.trainingLabel].map(data));
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
    expect(await texts(page.locator('#affiliations .subhead:not(.print-copy)'))).toEqual([t.affiliations.membershipsLabel, t.affiliations.eventsLabel].map(data));
    expect(await texts(page.locator('#skills .subhead:not(.print-copy)'))).toEqual([t.skills.languagesLabel, t.skills.toolsLabel].map(data));
  });

  test('has no em dashes', async ({ page }) => {
    await visit(page, path);
    expect(await page.evaluate(() => document.body.innerText.includes(String.fromCodePoint(0x2014)))).toBe(false);
  });
}
