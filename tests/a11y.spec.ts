import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { ALL_PATHS, MISSING_PATH, expect, test, visit } from './fixtures';

// axe scans in each theme. Serious and critical violations fail the test.
type Theme = 'light' | 'system dark' | 'toggled dark';
const THEMES: readonly Theme[] = ['light', 'system dark', 'toggled dark'];
const BACKGROUND: Record<'light' | 'dark', string> = { light: 'rgb(246, 248, 244)', dark: 'rgb(11, 20, 16)' };

async function openInTheme(page: Page, path: string, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme === 'system dark' ? 'dark' : 'light' });
  const toggle = page.locator('[data-theme-toggle]');
  if (theme === 'toggled dark' && path === MISSING_PATH) {
    // The 404 page has no toggle; it applies a saved choice like every page.
    await page.addInitScript(() => localStorage.setItem('portfolio-theme', 'dark'));
  }
  await visit(page, path);
  if (theme === 'toggled dark' && path !== MISSING_PATH) await toggle.click();
  const expected = theme === 'light' ? 'light' : 'dark';
  await expect(page.locator('body')).toHaveCSS('background-color', BACKGROUND[expected]);
}

async function seriousViolations(page: Page) {
  // Scan the settled page: fonts loaded and the fade-in finished.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
  });
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`);
}

test.describe('axe', () => {
  test.use({ allowedConsoleErrors: [/status of 404/] });

  for (const path of ALL_PATHS) {
    for (const theme of THEMES) {
      test(`/${path === MISSING_PATH ? '(404)' : path} in ${theme}`, async ({ page }) => {
        await openInTheme(page, path, theme);
        expect(await seriousViolations(page)).toEqual([]);
      });
    }
  }

  for (const theme of ['light', 'toggled dark'] as const) {
    test(`open menu panel at 360px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await openInTheme(page, 'ru/', theme);
      await page.locator('[data-menu-toggle]').click();
      await expect(page.locator('#site-menu')).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});
