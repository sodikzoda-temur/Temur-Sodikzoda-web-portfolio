import { ALL_PATHS, MISSING_PATH, expect, test, visit } from './fixtures';

const WIDTHS = [320, 360, 390, 768, 1024, 1440];

test.describe('layout at 320, 360, 390, 768, 1024 and 1440px, light and dark', () => {
  test.use({ allowedConsoleErrors: [/status of 404/] });

  for (const path of ALL_PATHS) {
    test(`/${path === MISSING_PATH ? '(404)' : path} has no horizontal scroll and a one-line header`, async ({ page }) => {
      await page.setViewportSize({ width: WIDTHS[0]!, height: 800 });
      await visit(page, path);
      await page.evaluate(() => document.fonts.ready);
      const brand = page.locator('.site-header__brand');
      const hasHeader = (await brand.count()) > 0;

      for (const [scheme, width] of (['light', 'dark'] as const).flatMap((s) => WIDTHS.map((w) => [s, w] as const))) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize({ width, height: 800 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `horizontal overflow at ${width}px (${scheme})`).toBeLessThanOrEqual(0);

        if (hasHeader) {
          const lines = await brand.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
          });
          expect(lines, `name in the header wraps at ${width}px (${scheme})`).toBe(1);
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
  test('sections fade in and colours transition, unless reduced motion is requested', async ({ page }) => {
    await visit(page, '');
    const section = page.locator('main > section').nth(1);
    const link = page.locator('.site-nav__link').first();
    const button = page.locator('[data-theme-toggle]');
    const animation = () => section.evaluate((el) => getComputedStyle(el).animationName);
    const transition = (locator: typeof link) =>
      locator.evaluate((el) => getComputedStyle(el).transitionDuration.split(',').map((value) => value.trim()));

    expect(await animation()).toBe('reveal');
    expect(await transition(link)).not.toEqual(['0s']);
    expect(await transition(button)).not.toEqual(['0s']);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await animation()).toBe('none');
    for (const locator of [link, button]) {
      expect((await transition(locator)).every((value) => value === '0s')).toBe(true);
    }
  });
});
