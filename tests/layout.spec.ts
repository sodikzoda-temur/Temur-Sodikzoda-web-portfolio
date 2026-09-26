import { ALL_PATHS, MISSING_PATH, expect, test, visit } from './fixtures';

const WIDTHS = [360, 390, 768, 1024, 1440];

test.describe('layout at 360, 390, 768, 1024 and 1440px', () => {
  test.use({ allowedConsoleErrors: [/status of 404/] });

  for (const path of ALL_PATHS) {
    test(`/${path === MISSING_PATH ? '(404)' : path} has no horizontal scroll and a one-line header`, async ({ page }) => {
      await page.setViewportSize({ width: WIDTHS[0]!, height: 800 });
      await visit(page, path);
      await page.evaluate(() => document.fonts.ready);
      const brand = page.locator('.site-header__brand');
      const hasHeader = (await brand.count()) > 0;

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);

        if (hasHeader) {
          const lines = await brand.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
          });
          expect(lines, `name in the header wraps at ${width}px`).toBe(1);
        }
      }
    });
  }
});

/** Links and buttons narrower or shorter than 44px. Running text (`.prose`) is exempt. */
const smallTargets = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a, button')].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const rendered = rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
      if (!rendered || element.closest('.prose')) return [];
      return rect.width < 43.5 || rect.height < 43.5
        ? [`"${element.textContent?.trim()}" ${Math.round(rect.width)}x${Math.round(rect.height)}`]
        : [];
    }),
  );

test.describe('tap targets are at least 44px', () => {
  test.use({ allowedConsoleErrors: [/status of 404/] });

  test('on a wide screen', async ({ page }) => {
    for (const path of ALL_PATHS) {
      await visit(page, path);
      expect(await smallTargets(page), `/${path}`).toEqual([]);
    }
  });

  test('on a small screen with the menu open', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const path of ALL_PATHS) {
      await visit(page, path);
      const toggle = page.locator('[data-menu-toggle]');
      if (await toggle.count()) await toggle.click();
      expect(await smallTargets(page), `/${path}`).toEqual([]);
    }
  });
});

test.describe('motion', () => {
  test('sections fade in once, unless reduced motion is requested', async ({ page }) => {
    await visit(page, '');
    const animation = () => page.locator('main > section').nth(1).evaluate((el) => getComputedStyle(el).animationName);
    expect(await animation()).toBe('reveal');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await animation()).toBe('none');
  });
});
