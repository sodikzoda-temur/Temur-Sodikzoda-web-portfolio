import type { Page } from '@playwright/test';
import { EMAIL, PROFILE_LINKS, SHOW_AVAILABILITY } from '../src/data/shared.ts';
import type { Profile } from '../src/data/types.ts';
import { expect, test, visit } from './fixtures';
import { PROFILES, data, plain, sharedSectionTests, text, texts } from './sections';

// The CV order and fixed wording, written out here on purpose instead of imported.
const CV_ORDER = ['about', 'focus', 'experience', 'work', 'education', 'publications', 'affiliations', 'skills'];
const REFERENCES = { en: 'References available on request.', ru: 'Рекомендации предоставляются по запросу.' };
const DOWNLOAD = { en: 'Download PDF', ru: 'Скачать PDF' };

const PAGES = [
  { lang: 'en', path: 'cv/' },
  { lang: 'ru', path: 'ru/cv/' },
] as const;

/** Replaces window.print with a counter, so the print dialog never opens. */
async function stubPrint(page: Page) {
  await page.addInitScript(() => {
    window.print = () => {
      const root = document.documentElement;
      root.dataset.printCalls = String(Number(root.dataset.printCalls ?? 0) + 1);
    };
  });
  return () => page.evaluate(() => Number(document.documentElement.dataset.printCalls ?? 0));
}

for (const { lang, path } of PAGES) {
  const t = PROFILES[lang];

  test.describe(`CV (${lang})`, () => {
    test('header: name, positioning lines, location and contacts', async ({ page }) => {
      await visit(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await text(page.locator('.cv-head .label').first())).toBe(data(t.cv.heading));
      expect(await text(page.locator('.cv-head h1'))).toBe(data(t.hero.name));
      expect(await texts(page.locator('.cv-head__lines p'))).toEqual(t.hero.lines.map(data));
      expect(await text(page.locator('.cv-head__location'))).toBe(data(t.hero.location));

      const address = `${EMAIL.user}@${EMAIL.domain}`;
      const email = page.locator('.cv-head a[href^="mailto:"]');
      await expect(email).toHaveAttribute('href', `mailto:${address}`);
      await expect(email).toHaveText(address);
      const html = await (await page.request.get(page.url())).text();
      expect(html).toContain(`<noscript>${EMAIL.user} ${t.contact.emailAt} ${EMAIL.domain}</noscript>`);
      expect(html).not.toContain(address);

      for (const link of PROFILE_LINKS) {
        const anchor = page.locator(`.cv-head a[data-profile="${link.id}"]`);
        await expect(anchor).toHaveAttribute('href', link.href);
        await expect(anchor).toHaveText(link.label);
        await expect(anchor).toHaveAttribute('rel', /(?=.*\bnoopener\b)(?=.*\bnoreferrer\b)/);
        await expect(anchor).not.toHaveAttribute('target', /.*/);
      }
    });

    test('sections follow the CV order, without numbers, About labelled as the profile', async ({ page }) => {
      await visit(page, path);
      const ids = await page.locator('main section[id]').evaluateAll((sections) => sections.map((s) => s.id));
      expect(ids).toEqual(CV_ORDER);
      for (const id of CV_ORDER) {
        const label = id === 'about' ? t.cv.profile : t.sections[id as keyof Profile['sections']];
        await expect(page.locator(`#${id}-label`), id).toBeVisible();
        await expect(page.locator(`#${id}-label`), id).toHaveAccessibleName(plain(label));
      }
      await expect(page.locator('main .section__num')).toHaveCount(0);
    });

    sharedSectionTests(lang, path);

    test('ends with the references line', async ({ page }) => {
      await visit(page, path);
      expect(data(t.cv.references)).toBe(REFERENCES[lang]);
      expect(await text(page.locator('main > :last-child > :last-child'))).toBe(REFERENCES[lang]);
    });

    test('shows availability only when switched on, and no private details', async ({ page }) => {
      await visit(page, path);
      const body = plain(await page.locator('body').innerText());
      expect(body.includes(data(t.contact.availability))).toBe(SHOW_AVAILABILITY);
      await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
      expect(body).not.toMatch(/(?:\+|\b00)\d[\d\s()-]{6,}\d/);
      expect(body).not.toMatch(/date of birth|marital|дата рождения|семейное положение/i);
    });

    test('sections use 12 grid columns from 768px and one below', async ({ page }) => {
      await visit(page, path);
      for (const [width, tracks] of [[360, 1], [767, 1], [768, 12], [1440, 12]] as const) {
        await page.setViewportSize({ width, height: 900 });
        const count = await page.locator('#work > .grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
        expect(count, `${width}px`).toBe(tracks);
      }
    });

    test('"Download PDF" prints by click, Enter and Space', async ({ page }) => {
      const printCalls = await stubPrint(page);
      await visit(page, path);
      const button = page.getByRole('button', { name: DOWNLOAD[lang] });
      await expect(button).toBeVisible();
      await expect(button).toHaveText(t.cv.download);
      // Measure after the 700ms fade-in, which slides the header block into place.
      await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);

      await button.click();
      expect(await printCalls()).toBe(1);
      await button.focus();
      await expect(button).toBeFocused();
      await page.keyboard.press('Enter');
      expect(await printCalls()).toBe(2);
      await page.keyboard.press('Space');
      expect(await printCalls()).toBe(3);
    });
  });
}

test.describe('"Download PDF" on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('prints by tap', async ({ page }) => {
    const printCalls = await stubPrint(page);
    await visit(page, 'ru/cv/');
    await page.getByRole('button', { name: DOWNLOAD.ru }).tap();
    expect(await printCalls()).toBe(1);
  });
});

test.describe('CV without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const { lang, path } of PAGES) {
    test(`/${path} has no print button and shows the address as "name at domain"`, async ({ page }) => {
      await visit(page, path);
      await expect(page.locator('[data-print]')).toBeHidden();
      await expect(page.getByRole('button', { name: DOWNLOAD[lang] })).toHaveCount(0);
      const rendered = await page.locator('.cv-head').evaluate((element: HTMLElement) => element.innerText);
      expect(rendered).toContain(`${EMAIL.user} ${PROFILES[lang].contact.emailAt} ${EMAIL.domain}`);
      await expect(page.locator('.cv-head a[href^="mailto:"]')).toHaveCount(0);
    });
  }
});
