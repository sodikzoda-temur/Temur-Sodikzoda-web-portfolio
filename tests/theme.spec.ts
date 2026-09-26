import { expect, test, visit } from './fixtures';
import type { Page } from '@playwright/test';

const LIGHT_BG = 'rgb(246, 248, 244)';
const DARK_BG = 'rgb(11, 20, 16)';

const toggle = (page: Page) => page.locator('[data-theme-toggle]');
const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function expectTheme(page: Page, theme: 'light' | 'dark') {
  await expect(toggle(page)).toHaveAttribute('aria-pressed', String(theme === 'dark'));
  await expect.poll(() => background(page)).toBe(theme === 'dark' ? DARK_BG : LIGHT_BG);
}

test.describe('theme toggle', () => {
  test('has an accessible name and follows the system setting by default', async ({ page }) => {
    await visit(page, '');
    await expect(toggle(page)).toHaveAccessibleName('Dark theme');
    await expectTheme(page, 'light');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expectTheme(page, 'dark');
  });

  test('switches by mouse click and remembers the choice after reload', async ({ page }) => {
    await visit(page, 'cv/');
    await toggle(page).click();
    await expectTheme(page, 'dark');

    await page.reload();
    await expectTheme(page, 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // The choice carries over to other pages.
    await visit(page, 'ru/');
    await expectTheme(page, 'dark');
    await expect(toggle(page)).toHaveAccessibleName('Тёмная тема');

    await toggle(page).click();
    await expectTheme(page, 'light');
    await page.reload();
    await expectTheme(page, 'light');
  });

  test('switches with Enter and Space', async ({ page }) => {
    await visit(page, '');
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expectTheme(page, 'dark');
    await page.keyboard.press('Space');
    await expectTheme(page, 'light');
  });

  test('overrides the system setting in either direction', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await visit(page, '');
    await expectTheme(page, 'dark');
    await toggle(page).click();
    await expectTheme(page, 'light');
    await page.reload();
    await expectTheme(page, 'light');
  });

  test('still switches when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Blocked', 'SecurityError');
        },
      });
    });
    await visit(page, '');
    await toggle(page).click();
    await expectTheme(page, 'dark');
    await page.reload();
    await expectTheme(page, 'light');
  });
});

test.describe('theme toggle on a touch screen', () => {
  test.use({ hasTouch: true });

  test('switches by tap', async ({ page }) => {
    await visit(page, 'ru/cv/');
    await toggle(page).tap();
    await expectTheme(page, 'dark');
    await toggle(page).tap();
    await expectTheme(page, 'light');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the toggle is hidden and the system theme applies', async ({ page }) => {
    await visit(page, '');
    await expect(toggle(page)).toBeHidden();
    await expect(page.locator('body')).toHaveCSS('background-color', LIGHT_BG);
  });
});

