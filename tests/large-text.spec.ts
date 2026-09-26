import { ALL_PATHS, expect, test, visit } from './fixtures';

// Larger default text, as set in the browser's appearance settings ("Very
// large" is 24px). Set through the DevTools protocol, so Chromium only; an
// injected stylesheet would need an exception in the Content Security Policy.
const SIZES = [24, 32];
const WIDTHS = [360, 390];

test.describe('large default text', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Uses the Chromium DevTools protocol');
  test.use({ allowedConsoleErrors: [/status of 404/] });

  for (const size of SIZES) {
    test(`${size}px: no sideways scroll, controls on screen, names not split mid-word`, async ({ page }) => {
      const session = await page.context().newCDPSession(page);
      await session.send('Page.enable');
      await session.send('Page.setFontSizes', { fontSizes: { standard: size, fixed: size } });

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        for (const path of ALL_PATHS) {
          await visit(page, path);
          await page.evaluate(() => document.fonts.ready);
          const where = `/${path} at ${width}px`;

          const rootSize = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
          expect(rootSize, where).toBe(`${size}px`);

          const report = await page.evaluate(() => {
            const viewport = document.documentElement.clientWidth;
            const offscreen = [...document.querySelectorAll<HTMLElement>('a, button')].flatMap((element) => {
              const rect = element.getBoundingClientRect();
              if (rect.width === 0 || element.closest('.visually-hidden') || element.matches('.skip-link')) return [];
              return rect.left < -0.5 || rect.right > viewport + 0.5 ? [element.textContent?.trim() ?? ''] : [];
            });

            // A word whose characters sit on more than one line was split.
            const split: string[] = [];
            for (const heading of document.querySelectorAll('h1, .site-header__brand')) {
              const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
              for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                const text = node.textContent ?? '';
                for (const match of text.matchAll(/[^\s ]+/g)) {
                  const range = document.createRange();
                  range.setStart(node, match.index);
                  range.setEnd(node, match.index + match[0].length);
                  const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
                  if (tops.size > 1) split.push(match[0]);
                }
              }
            }
            return { overflow: document.documentElement.scrollWidth - viewport, offscreen, split };
          });

          expect(report.overflow, `${where}: sideways scroll`).toBeLessThanOrEqual(0);
          expect(report.offscreen, `${where}: controls off screen`).toEqual([]);
          expect(report.split, `${where}: words split across lines`).toEqual([]);
        }
      }
    });
  }
});
