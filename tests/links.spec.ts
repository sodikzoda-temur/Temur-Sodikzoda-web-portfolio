import { ALL_PATHS, BASE, expect, test, visit } from './fixtures';
import { SITE } from '../src/config.ts';

// Crawl every page: same-origin links return 200 and their #fragments exist;
// links to other sites carry rel="noopener noreferrer"; canonical and hreflang
// URLs (absolute, for the live site) map to pages that exist here.
test.describe('links', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Browser independent');
  test.use({ allowedConsoleErrors: [/status of 404/] });

  test('internal links resolve, fragments exist, external links are safe', async ({ page, request, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const live = `${SITE.url}${BASE}`;
    const local = `${origin}${BASE}`;
    const withoutHash = (url: URL) => `${url.origin}${url.pathname}`;

    const targets = new Set<string>();
    const fragments = new Map<string, Set<string>>();
    const unsafe: string[] = [];
    const missingHere: string[] = [];

    for (const path of ALL_PATHS) {
      await visit(page, path);
      const current = withoutHash(new URL(page.url()));
      const found = await page.evaluate(() => ({
        anchors: [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((a) => ({ href: a.href, rel: a.rel })),
        head: [...document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"], link[rel="alternate"]')].map((l) => l.href),
        ids: [...document.querySelectorAll('[id]')].map((element) => element.id),
      }));

      for (const { href, rel } of found.anchors) {
        const url = new URL(href);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
        if (url.origin !== origin) {
          const tokens = rel.split(/\s+/);
          if (!tokens.includes('noopener') || !tokens.includes('noreferrer')) unsafe.push(`${href} on /${path}`);
          continue;
        }
        const target = withoutHash(url);
        const id = url.hash.length > 1 ? decodeURIComponent(url.hash.slice(1)) : '';
        if (target === current) {
          // Same-page link: check the fragment on the page already loaded.
          if (id && !found.ids.includes(id)) missingHere.push(`#${id} on /${path}`);
          continue;
        }
        targets.add(target);
        if (id) fragments.set(target, (fragments.get(target) ?? new Set<string>()).add(id));
      }
      for (const href of found.head) {
        expect(href.startsWith(live), `${href} is on the live site`).toBe(true);
        targets.add(local + href.slice(live.length));
      }
    }

    expect(unsafe, 'external links without rel="noopener noreferrer"').toEqual([]);
    expect(missingHere, 'same-page fragment targets').toEqual([]);

    for (const url of targets) {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status(), url).toBe(200);
    }

    for (const [url, ids] of fragments) {
      await page.goto(url);
      const missing = await page.evaluate((wanted) => wanted.filter((id) => !document.getElementById(id)), [...ids]);
      expect(missing, `missing fragment targets on ${url}`).toEqual([]);
    }
  });
});
