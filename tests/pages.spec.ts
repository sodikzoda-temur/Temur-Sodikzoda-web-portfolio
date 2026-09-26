import { BASE, EXPECTED_CSP, MISSING_PATH, SITE_PAGES, expect, test, visit } from './fixtures';
import { SITE } from '../src/config.ts';

const absolute = (path: string) => `${SITE.url}${BASE}${path}`;

for (const sitePage of SITE_PAGES) {
  test(`${sitePage.name} responds 200 with language, policy and alternates`, async ({ page }) => {
    const response = await visit(page, sitePage.path);
    expect(response?.status()).toBe(200);
    // Let late requests (fonts, icons) finish so their errors are caught too.
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveAttribute('lang', sitePage.htmlLang);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', EXPECTED_CSP);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin');
    await expect(page.locator('meta[name="generator"]')).toHaveCount(0);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', absolute(sitePage.path));
    const own = sitePage.lang === 'en' ? sitePage.path : sitePage.twin;
    const russian = sitePage.lang === 'ru' ? sitePage.path : sitePage.twin;
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', absolute(own));
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute('href', absolute(russian));
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      absolute(sitePage.english),
    );
  });
}

test.describe('404 page', () => {
  test.use({ allowedConsoleErrors: [/status of 404/] });

  test('is served for a missing path, styled, in both languages', async ({ page }) => {
    const response = await visit(page, MISSING_PATH);
    expect(response?.status()).toBe(404);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await expect(page.locator('[lang="ru"]').first()).toBeVisible();
    await expect(page.locator(`main a[href="${BASE}"]`)).toBeVisible();
    await expect(page.locator(`main a[href="${BASE}ru/"]`)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    // Stylesheets use absolute URLs, so the page is styled at any depth.
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe('rgb(246, 248, 244)');
  });
});
