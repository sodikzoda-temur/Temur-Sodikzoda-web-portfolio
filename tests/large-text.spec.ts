import { ALL_PATHS, expect, test, visit } from './fixtures';

// Larger default text, as set in the browser's appearance settings ("Very
// large" is 24px). Set through the DevTools protocol, so Chromium only; an
// injected stylesheet would need an exception in the Content Security Policy.
const SIZES = [24, 32];
const WIDTHS = [320, 360, 390];

test.describe('large default text', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Uses the Chromium DevTools protocol');
  test.use({ allowedConsoleErrors: [/status of 404/] });

  for (const size of SIZES) {
    test(`${size}px: no sideways scroll, controls on screen, no words broken without a hyphen`, async ({ page }) => {
      const session = await page.context().newCDPSession(page);
      await session.send('Page.enable');
      await session.send('Page.setFontSizes', { fontSizes: { standard: size, fixed: size } });

      // Does this engine hyphenate Russian? A long word in a narrow box with
      // hyphens: auto either wraps (hyphenation works) or stays on one line.
      await visit(page, 'ru/');
      const hyphenatesRussian = await page.evaluate(() => {
        const probe = document.createElement('p');
        probe.lang = 'ru';
        probe.textContent = 'теплоэнергетика';
        Object.assign(probe.style, {
          position: 'absolute',
          visibility: 'hidden',
          width: '5em',
          fontSize: '16px',
          lineHeight: '20px',
          hyphens: 'auto',
          overflowWrap: 'normal',
        });
        document.body.append(probe);
        const lines = Math.round(probe.getBoundingClientRect().height / 20);
        probe.remove();
        return lines > 1;
      });
      test.info().annotations.push({ type: 'hyphenation', description: hyphenatesRussian ? 'available' : 'not available' });

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        for (const path of ALL_PATHS) {
          await visit(page, path);
          await page.evaluate(() => document.fonts.ready);
          const where = `/${path} at ${width}px`;

          const rootSize = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
          expect(rootSize, where).toBe(`${size}px`);

          const report = await page.evaluate((trustHyphenation) => {
            const viewport = document.documentElement.clientWidth;
            const offscreen = [...document.querySelectorAll<HTMLElement>('a, button')].flatMap((element) => {
              const rect = element.getBoundingClientRect();
              if (rect.width === 0 || element.closest('.visually-hidden') || element.matches('.skip-link')) return [];
              return rect.left < -0.5 || rect.right > viewport + 0.5 ? [element.textContent?.trim() ?? ''] : [];
            });

            // A word whose characters sit on more than one line was split. Breaks after
            // a hyphen are fine. Hyphenated breaks (hyphens: auto) are fine only if the
            // engine really hyphenates Russian; otherwise they are plain splits too.
            const split: string[] = [];
            for (const heading of document.querySelectorAll('h1, h2, h3, h4, .site-header__brand')) {
              if (trustHyphenation && getComputedStyle(heading).hyphens === 'auto') continue;
              const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
              for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                const text = node.textContent ?? '';
                for (const match of text.matchAll(/[^\s-]+-?/g)) {
                  const range = document.createRange();
                  range.setStart(node, match.index);
                  range.setEnd(node, match.index + match[0].length);
                  const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
                  if (tops.size > 1) split.push(match[0]);
                }
              }
            }
            return { overflow: document.documentElement.scrollWidth - viewport, offscreen, split };
          }, hyphenatesRussian);

          expect(report.overflow, `${where}: sideways scroll`).toBeLessThanOrEqual(0);
          expect(report.offscreen, `${where}: controls off screen`).toEqual([]);
          expect(report.split, `${where}: words split across lines`).toEqual([]);
        }
      }
    });
  }
});
