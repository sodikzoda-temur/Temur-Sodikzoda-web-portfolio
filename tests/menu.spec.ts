import type { Page } from '@playwright/test';
import { BASE, expect, test, visit } from './fixtures';

const toggle = (page: Page) => page.locator('[data-menu-toggle]');
const panel = (page: Page) => page.locator('#site-menu');
const firstLink = (page: Page) => panel(page).locator('.site-nav a').first();

async function expectOpen(page: Page, open: boolean) {
  await expect(toggle(page)).toHaveAttribute('aria-expanded', String(open));
  if (open) await expect(firstLink(page)).toBeVisible();
  else await expect(panel(page)).toBeHidden();
}

test.describe('mobile menu at 360px', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

  test('button is labelled and controls the closed panel', async ({ page }) => {
    await visit(page, '');
    await expect(toggle(page)).toBeVisible();
    await expect(toggle(page)).toHaveAccessibleName('Menu');
    await expect(toggle(page)).toHaveAttribute('aria-controls', 'site-menu');
    await expectOpen(page, false);
  });

  test('opens and closes by mouse click', async ({ page }) => {
    await visit(page, 'cv/');
    await toggle(page).click();
    await expectOpen(page, true);
    await toggle(page).click();
    await expectOpen(page, false);
  });

  test('opens and closes by tap', async ({ page }) => {
    await visit(page, 'ru/');
    await expect(toggle(page)).toHaveAccessibleName('Меню');
    await toggle(page).tap();
    await expectOpen(page, true);
    await toggle(page).tap();
    await expectOpen(page, false);
  });

  test('opens with Enter, closes with Space', async ({ page }) => {
    await visit(page, '');
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expectOpen(page, true);
    await page.keyboard.press('Space');
    await expectOpen(page, false);
  });

  test('closes on Escape and returns focus to the button', async ({ page }) => {
    await visit(page, '');
    await toggle(page).click();
    await firstLink(page).focus();
    await page.keyboard.press('Escape');
    await expectOpen(page, false);
    await expect(toggle(page)).toBeFocused();
  });

  test('closes when a link is chosen', async ({ page }) => {
    await visit(page, '');
    await toggle(page).click();
    await firstLink(page).click();
    await expectOpen(page, false);
    await expect(page).toHaveURL(`${BASE}#focus`);
  });

  test('closes on a click or tap outside the header', async ({ page }) => {
    await visit(page, 'cv/');
    await toggle(page).click();
    await expectOpen(page, true);
    await page.mouse.click(180, 700);
    await expectOpen(page, false);

    await toggle(page).tap();
    await expectOpen(page, true);
    await page.touchscreen.tap(180, 700);
    await expectOpen(page, false);
  });

  test('focus rings fit inside the open panel', async ({ page }) => {
    for (const path of ['', 'ru/']) {
      await visit(page, path);
      await toggle(page).click();
      // The ring reaches 7px beyond each target (2px offset, 3px outline, 2px edge).
      const clipped = await panel(page).evaluate((element) => {
        const box = element.getBoundingClientRect();
        return [...element.querySelectorAll<HTMLElement>('a, button')].flatMap((target) => {
          const rect = target.getBoundingClientRect();
          const inside =
            rect.left - 7 >= box.left && rect.right + 7 <= box.right && rect.top - 7 >= box.top && rect.bottom + 7 <= box.bottom;
          return inside ? [] : [target.textContent?.trim() ?? ''];
        });
      });
      expect(clipped, path).toEqual([]);
    }
  });

  test('closes when focus leaves the header', async ({ page }) => {
    await visit(page, '');
    await toggle(page).click();
    await firstLink(page).focus();
    await page.locator('main a').first().focus();
    await expectOpen(page, false);
  });
});

test.describe('tablet header at 768px', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('uses the menu button', async ({ page }) => {
    await visit(page, 'ru/');
    await expectOpen(page, false);
    await toggle(page).click();
    await expectOpen(page, true);
  });
});

test.describe('wide screen header', () => {
  test('shows the navigation without a menu button', async ({ page }) => {
    await visit(page, '');
    await expect(toggle(page)).toBeHidden();
    await expect(firstLink(page)).toBeVisible();
  });
});

test.describe('mobile navigation without JavaScript', () => {
  test.use({ viewport: { width: 360, height: 740 }, javaScriptEnabled: false });

  test('links are shown and the menu button is hidden', async ({ page }) => {
    await visit(page, 'ru/cv/');
    await expect(toggle(page)).toBeHidden();
    await expect(panel(page).locator('.site-nav a')).toHaveCount(5);
    for (const link of await panel(page).locator('a').all()) await expect(link).toBeVisible();
  });
});
