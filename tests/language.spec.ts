import { atPath, BASE, expect, SITE_PAGES, test, visit } from './fixtures';

const switchLink = (code: 'en' | 'ru') => `.lang-switch a[hreflang="${code}"]`;

test.describe('language switch (wide screen)', () => {
  for (const sitePage of SITE_PAGES) {
    test(`${sitePage.name} links to the same page in the other language`, async ({ page }) => {
      await visit(page, sitePage.path);
      const other = sitePage.lang === 'en' ? 'ru' : 'en';

      await expect(page.locator(switchLink(sitePage.lang))).toHaveAttribute('aria-current', 'page');
      await expect(page.locator(switchLink(other))).not.toHaveAttribute('aria-current', /.*/);

      await page.locator(switchLink(other)).click();
      await expect(page).toHaveURL(atPath(`${BASE}${sitePage.twin}`));
      await expect(page.locator('html')).toHaveAttribute('lang', other === 'en' ? 'en-GB' : 'ru');
      await expect(page.locator(switchLink(other))).toHaveAttribute('aria-current', 'page');
    });
  }
});

test.describe('language names', () => {
  test('are spoken in their own language and keep the visible code', async ({ page }) => {
    for (const path of ['', 'ru/', 'cv/', 'ru/cv/']) {
      await visit(page, path);
      await expect(page.locator(switchLink('en'))).toHaveAccessibleName('EN English');
      await expect(page.locator(switchLink('ru'))).toHaveAccessibleName('RU Русский');
      await expect(page.locator(`${switchLink('en')} [lang="en"]`)).toHaveText(/English/);
      await expect(page.locator(`${switchLink('ru')} [lang="ru"]`)).toHaveText(/Русский/);
    }
  });
});

test.describe('language switch (small screen)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('is reachable through the menu', async ({ page }) => {
    await visit(page, 'cv/');
    await page.locator('[data-menu-toggle]').click();
    await page.locator(switchLink('ru')).click();
    await expect(page).toHaveURL(atPath(`${BASE}ru/cv/`));
  });
});
