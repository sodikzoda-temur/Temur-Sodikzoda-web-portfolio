import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test, visit } from './fixtures';
import { readPdf, type Element as PdfElement, type PrintedPdf } from './pdf';

const PAGES = [
  { name: 'cv-en', path: 'cv/', maxPages: 5, cv: true },
  { name: 'cv-ru', path: 'ru/cv/', maxPages: 5, cv: true },
  { name: 'home-en', path: '', maxPages: 6, cv: false },
  { name: 'home-ru', path: 'ru/', maxPages: 6, cv: false },
] as const;

/** Printed PDFs are kept here for a look, outside the repository. */
const ARTEFACTS = process.env.PRINT_ARTEFACTS ?? join(tmpdir(), 'qa-artefacts', 'print');

/** Page margins from @page in src/styles/print.css, in points. */
const MM = 72 / 25.4;
const MARGIN = { top: 15 * MM, right: 16 * MM, bottom: 16 * MM, left: 16 * MM };

/** Width of the A4 text area in CSS pixels (210mm less both side margins), rounded down. */
const PRINT_WIDTH = Math.floor(((210 - 32) * 96) / 25.4);

const DARK_BODY = 'rgb(11, 20, 16)';
const WHITE = 'rgb(255, 255, 255)';

/** Open a page in a dark theme, stored by the toggle or taken from the system. */
async function openDark(page: Page, path: string, theme: 'stored dark' | 'system dark') {
  if (theme === 'stored dark') {
    await page.addInitScript(() => {
      if (location.protocol.startsWith('http')) localStorage.setItem('portfolio-theme', 'dark');
    });
  } else {
    await page.emulateMedia({ colorScheme: 'dark' });
  }
  await visit(page, path);
  await expect(page.locator('body')).toHaveCSS('background-color', DARK_BODY);
}

test.describe('print styles', () => {
  for (const { name, path } of PAGES) {
    for (const theme of ['stored dark', 'system dark'] as const) {
      test(`${name} in ${theme}: no site chrome, dark text on white, no backgrounds`, async ({ page }) => {
        await openDark(page, path, theme);
        // Dark by choice or by system on screen (Firefox reports print media as light, so check before printing)
        const darkOnScreen = await page.evaluate(() => ({
          stored: document.documentElement.dataset.theme === 'dark',
          system: matchMedia('(prefers-color-scheme: dark)').matches,
        }));
        expect(theme === 'stored dark' ? darkOnScreen.stored : darkOnScreen.system).toBe(true);
        await page.emulateMedia({ media: 'print' });
        // The stored choice is still in place, yet the page prints light
        if (theme === 'stored dark') expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
        await expect(page.locator('body')).toHaveCSS('background-color', WHITE);

        const chrome = ['.skip-link', '.site-header', '[data-menu-toggle]', '[data-theme-toggle]', '.lang-switch', '.site-footer', '[data-print]', '.hero__links'];
        for (const selector of chrome) {
          for (const element of await page.locator(selector).all()) await expect(element, selector).toBeHidden();
        }

        const problems = await page.evaluate(() => {
          const channel = (value: number) => {
            const c = value / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          };
          const contrastOnWhite = (color: string) => {
            const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number);
            return 1.05 / (0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) + 0.05);
          };
          const found: string[] = [];
          for (const element of [document.documentElement, ...document.querySelectorAll('body, body *')]) {
            if (!element.checkVisibility()) continue;
            const style = getComputedStyle(element);
            const where = `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
            if (!['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)', 'transparent'].includes(style.backgroundColor)) {
              found.push(`${where}: background ${style.backgroundColor}`);
            }
            if (style.backgroundImage !== 'none') found.push(`${where}: background image`);
            const hasText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
            if (hasText && contrastOnWhite(style.color) < 4.5) found.push(`${where}: text ${style.color}`);
          }
          return found;
        });
        expect(problems).toEqual([]);
      });
    }

    test(`${name}: links print as text, external ones with their address`, async ({ page }) => {
      await visit(page, path);
      await page.emulateMedia({ media: 'print' });
      const links = await page.locator('a[href]').evaluateAll((anchors) =>
        anchors.map((anchor) => {
          const label = document.createRange();
          label.selectNodeContents(anchor);
          // The element's boxes include generated text; the range covers the label only.
          const boxes = [...anchor.getClientRects()].reduce((sum, rect) => sum + rect.width, 0);
          return {
            href: anchor.getAttribute('href') ?? '',
            text: anchor.textContent?.trim() ?? '',
            after: getComputedStyle(anchor, '::after').content,
            shown: anchor.checkVisibility(),
            generatedWidth: boxes - label.getBoundingClientRect().width,
          };
        }),
      );

      const external = links.filter((link) => /^https?:/.test(link.href));
      expect(external.length).toBeGreaterThan(0);
      for (const link of links) {
        if (/^https?:/.test(link.href)) {
          // As written or resolved, depending on the engine
          expect(link.after, link.href).toMatch(/attr\(href\)|https?:/);
          expect(link.text, link.href).not.toBe(link.href);
          if (link.shown) expect(link.generatedWidth, link.href).toBeGreaterThan(link.href.length * 3);
        } else {
          // Internal links and the email address add nothing
          expect(['none', 'normal'], link.href).toContain(link.after);
        }
      }
      const email = links.find((link) => link.href.startsWith('mailto:'));
      expect(email?.shown).toBe(true);
      expect(email?.text).toBe(email?.href.slice('mailto:'.length));
    });

    test(`${name}: printed section labels start at the margin, printed years match the other dates`, async ({ page }) => {
      await page.setViewportSize({ width: PRINT_WIDTH, height: 1000 });
      await visit(page, path);
      await page.emulateMedia({ media: 'print' });
      const report = await page.evaluate(() => {
        const shown = (element: Element) => element.checkVisibility() && !element.closest('.visually-hidden');
        const labels = [...document.querySelectorAll('main .section__label')].filter(shown).map((label) => ({
          text: label.textContent?.trim() ?? '',
          offset: Math.round(label.getBoundingClientRect().left - label.closest('.section')!.querySelector('.container')!.getBoundingClientRect().left),
        }));
        const fontOf = (selector: string) =>
          [...new Set([...document.querySelectorAll(selector)].filter(shown).map((element) => getComputedStyle(element).fontFamily))];
        return {
          labels,
          years: fontOf('main .pubs__year'),
          dates: fontOf('main #experience .entry__aside, main #education .entry__aside'),
        };
      });
      expect(report.labels.length).toBeGreaterThan(5);
      expect(report.labels.filter((label) => label.offset !== 0)).toEqual([]);
      expect(report.dates).toHaveLength(1);
      expect(report.years).toEqual(report.dates);
    });

    test(`${name}: fits the width of an A4 page`, async ({ page }) => {
      await page.setViewportSize({ width: PRINT_WIDTH, height: 1000 });
      await visit(page, path);
      await page.emulateMedia({ media: 'print' });
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        const limit = root.clientWidth + 0.5;
        const found: string[] = [];
        if (root.scrollWidth > root.clientWidth) found.push(`page is ${root.scrollWidth}px wide`);
        const check = (rects: DOMRectList, where: string) => {
          for (const rect of rects) {
            if (rect.width > 0 && (rect.left < -0.5 || rect.right > limit)) found.push(`${where}: ${Math.round(rect.left)} to ${Math.round(rect.right)}`);
          }
        };
        for (const element of document.querySelectorAll('main *')) {
          if (!element.checkVisibility() || element.closest('.visually-hidden')) continue;
          check(element.getClientRects(), `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`);
        }
        const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.parentElement?.checkVisibility() || node.parentElement.closest('.visually-hidden')) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          check(range.getClientRects(), `text "${node.textContent?.trim().slice(0, 30)}"`);
        }
        return found;
      });
      expect(overflow).toEqual([]);
    });
  }
});

const INVISIBLE = new RegExp(`[\\s${String.fromCodePoint(0x2060, 0xad)}]`, 'g');
const compact = (text: string) => text.replace(INVISIBLE, '').toLocaleUpperCase();

/** Print the open page to A4 the way the "Download PDF" button leads to, and keep a copy. */
async function printPdf(page: Page, file: string) {
  await page.evaluate(() => document.fonts.ready);
  const buffer = await page.pdf({ format: 'A4', printBackground: false, tagged: true, outline: true });
  mkdirSync(ARTEFACTS, { recursive: true });
  writeFileSync(join(ARTEFACTS, file), buffer);
  return readPdf(buffer);
}

/** List items nearest below an element. */
const listItemsBelow = (element: PdfElement): PdfElement[] =>
  element.children.flatMap((child) => (child.type === 'LI' ? [child] : listItemsBelow(child)));

/**
 * Page breaks: no heading is the last text on its page, the last page has a
 * heading (closing lines never stand alone), and no list item runs across
 * pages. A list item that groups other items, such as a publication year,
 * may continue between them, with anything of its own on its first item's page. Page furniture (glyphs without marked
 * content) is not counted.
 */
function breakProblems(pdf: PrintedPdf): string[] {
  const problems: string[] = [];
  const content = pdf.glyphs.filter((glyph) => glyph.mcid !== undefined);
  for (const entry of pdf.outline) {
    const onPage = content.filter((glyph) => glyph.page === entry.page);
    const own = new Set(entry.element?.content.filter((part) => part.page === entry.page).map((part) => part.mcid));
    const heading = onPage.filter((glyph) => own.has(glyph.mcid!));
    if (heading.length === 0) {
      problems.push(`"${entry.title}" not drawn on page ${entry.page + 1}`);
      continue;
    }
    const bottom = Math.min(...heading.map((glyph) => glyph.y));
    if (!onPage.some((glyph) => glyph.y < bottom - 1)) problems.push(`"${entry.title}" alone at the bottom of page ${entry.page + 1}`);
  }
  if (!pdf.outline.some((entry) => entry.page === pdf.pages.length - 1)) problems.push('last page has no heading');

  for (const item of pdf.elements.filter((element) => element.type === 'LI')) {
    const nested = listItemsBelow(item);
    const inNested = new Set(nested.flatMap((child) => child.content.map((part) => `${part.page}:${part.mcid}`)));
    const ownParts = item.content.filter((part) => !inNested.has(`${part.page}:${part.mcid}`));
    const pages = new Set(item.content.map((part) => part.page));
    if (pages.size < 2) continue;
    // A group's own parts, if any, stay on the page where its first item starts.
    const groupStart = Math.min(...(nested[0]?.content.map((part) => part.page) ?? [Infinity]));
    if (nested.length === 0 || ownParts.some((part) => part.page !== groupStart)) {
      problems.push(`list item split across pages ${[...pages].map((p) => p + 1).join(', ')}`);
    }
  }
  return problems;
}

test.describe('printed PDF', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'page.pdf() needs Chromium');

  for (const { name, path, maxPages, cv } of PAGES) {
    test(`${name}: A4, at most ${maxPages} pages, no heading left at a page bottom, nothing split or clipped`, async ({ page }, testInfo) => {
      await visit(page, path);
      const pdf = await printPdf(page, `${name}.pdf`);
      const count = pdf.pages.length;
      const content = pdf.glyphs.filter((glyph) => glyph.mcid !== undefined);

      // A4 portrait, a reasonable length, no blank page, and none but the last under 40% used
      for (const { width, height } of pdf.pages) {
        expect(width).toBeCloseTo(595.92, 0);
        expect(height).toBeCloseTo(842.88, 0);
      }
      const used = pdf.pages.map(({ height }, index) => {
        const ys = content.filter((glyph) => glyph.page === index).map((glyph) => glyph.y);
        return ys.length ? (height - MARGIN.top - Math.min(...ys)) / (height - MARGIN.top - MARGIN.bottom) : 0;
      });
      const percentages = used.map((share) => `${Math.round(share * 100)}%`);
      testInfo.annotations.push({ type: 'pdf', description: `${count} pages (${percentages.join(', ')} used), ${join(ARTEFACTS, `${name}.pdf`)}` });
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(maxPages);
      expect(Math.min(...used), `page use: ${percentages.join(', ')}`).toBeGreaterThan(0);
      expect(Math.min(...used.slice(0, -1)), `page use: ${percentages.join(', ')}`).toBeGreaterThanOrEqual(0.4);

      // Every heading shown in print is in the PDF, in order. The outline leaves
      // out what assistive technology skips, such as the section numbers.
      await page.emulateMedia({ media: 'print' });
      const headings = await page.locator('main :is(h1, h2, h3, h4)').evaluateAll((elements) =>
        elements
          .filter((element) => element.checkVisibility() && !element.closest('.visually-hidden'))
          .map((element) => {
            const copy = element.cloneNode(true) as Element;
            for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
            return copy.textContent ?? '';
          }),
      );
      // Some Chromium versions also put a home section's number ("06") in its
      // bookmark, which is harmless: it is part of the printed heading.
      const bookmark = (title: string) => compact(title).replace(/^\d{2}(?=\p{L})/u, '');
      expect(pdf.outline.map((entry) => bookmark(entry.title))).toEqual(headings.map(compact));

      expect(breakProblems(pdf)).toEqual([]);
      expect(pdf.elements.filter((element) => element.type === 'LI').length).toBeGreaterThan(0);

      // Printed at full size: anything too wide would make Chromium shrink the whole page to fit
      expect([...new Set(content.map((glyph) => glyph.scale.toFixed(2)))]).toEqual(['0.75']);

      // Text and links stay inside the page margins
      const outside = [
        ...content
          .filter(({ page: index, x, y }) => {
            const { width, height } = pdf.pages[index]!;
            return x < MARGIN.left - 1 || x > width - MARGIN.right + 1 || y < MARGIN.bottom - 1 || y > height - MARGIN.top + 1;
          })
          .map(({ page: index, x, y }) => `text on page ${index + 1} at ${Math.round(x)}, ${Math.round(y)}`),
        ...pdf.links
          .filter(({ page: index, rect: [x1 = 0, , x2 = 0] }) => x1 < MARGIN.left - 1 || x2 > pdf.pages[index]!.width - MARGIN.right + 1)
          .map(({ page: index, rect }) => `link on page ${index + 1} at ${rect.map(Math.round).join(' ')}`),
      ];
      expect(outside).toEqual([]);

      // CV sheets carry the name and page number in the bottom margin, nothing at the top
      const furniture = pdf.glyphs.filter((glyph) => glyph.mcid === undefined);
      for (const [index, { height }] of pdf.pages.entries()) {
        const onPage = furniture.filter((glyph) => glyph.page === index);
        expect(onPage.filter((glyph) => glyph.y > height - MARGIN.top), `page ${index + 1} header`).toEqual([]);
        if (cv) {
          expect(onPage.some((glyph) => glyph.y < MARGIN.bottom && glyph.x < 200), `page ${index + 1} name`).toBe(true);
          expect(onPage.some((glyph) => glyph.y < MARGIN.bottom && glyph.x > 400), `page ${index + 1} number`).toBe(true);
        }
      }

      // The site's fonts, embedded
      expect(pdf.fonts.length).toBeGreaterThan(0);
      // Names as embedded by Chromium; spaces and suffixes vary between versions.
      expect(pdf.fonts.filter((font) => !/^(Inter|Source ?Serif ?4|JetBrains ?Mono)/i.test(font))).toEqual([]);
    });
  }
});

/*
 * The same page-break checks without any break-before or break-after rule, as
 * in Firefox, which ignores them: the headings must still stay with what
 * follows through break-inside alone. The stylesheet is rewritten on its way
 * to the page.
 */
test.describe('printed PDF without break-before and break-after', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'page.pdf() needs Chromium');

  for (const { name, path } of PAGES) {
    test(`${name}: headings still stay with what follows`, async ({ page }) => {
      const removed: string[] = [];
      await page.route('**/*.css', async (route) => {
        const response = await route.fetch();
        const css = (await response.text()).replace(/(?:page-)?break-(?:before|after)\s*:\s*avoid(?:-page)?\s*(?:!important)?\s*;?/g, (rule) => {
          removed.push(rule);
          return '';
        });
        await route.fulfill({ response, body: css });
      });
      await visit(page, path);
      expect(removed.length, 'rules removed').toBeGreaterThan(0);
      const pdf = await printPdf(page, `${name}-without-break-rules.pdf`);
      expect(breakProblems(pdf)).toEqual([]);
    });
  }
});
