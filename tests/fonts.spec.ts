import type { Page } from '@playwright/test';
import { ALL_PATHS, MISSING_PATH, expect, test, visit } from './fixtures';

// Unicode ranges of the Latin and Cyrillic subsets in src/styles/fonts.css.
const LATIN: Array<[number, number]> = [
  [0x0000, 0x00ff], [0x0131, 0x0131], [0x0152, 0x0153], [0x02bb, 0x02bc], [0x02c6, 0x02c6],
  [0x02da, 0x02da], [0x02dc, 0x02dc], [0x0304, 0x0304], [0x0308, 0x0308], [0x0329, 0x0329],
  [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193],
  [0x2212, 0x2212], [0x2215, 0x2215], [0xfeff, 0xfeff], [0xfffd, 0xfffd],
];
const CYRILLIC: Array<[number, number]> = [
  [0x0301, 0x0301], [0x0400, 0x045f], [0x0490, 0x0491], [0x04b0, 0x04b1], [0x2116, 0x2116],
];
const covered = (code: number) => [...LATIN, ...CYRILLIC].some(([from, to]) => code >= from && code <= to);

const FAMILIES = ['Source Serif 4 Variable', 'Inter Variable', 'JetBrains Mono'];

async function loadedFaces(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.status === 'loaded')
      .map((face) => ({ family: face.family.replace(/"/g, ''), cyrillic: /U\+0*400-/i.test(face.unicodeRange) }));
  });
}

test.describe('fonts', () => {
  test.use({ allowedConsoleErrors: [/status of 404/] });

  for (const path of ALL_PATHS) {
    test(`every character on /${path === MISSING_PATH ? '(404)' : path} is in the Latin or Cyrillic subset`, async ({ page }) => {
      await visit(page, path);
      const text = await page.evaluate(() => `${document.title} ${document.body.innerText}`);
      const outside = [...new Set(text)].filter((char) => !/\s/.test(char) && !covered(char.codePointAt(0)!));
      expect(outside, 'characters without a web font').toEqual([]);
    });
  }

  test('Russian pages load the Cyrillic files of all three families', async ({ page }) => {
    await visit(page, 'ru/');
    const faces = await loadedFaces(page);
    for (const family of FAMILIES) {
      expect(faces, `${family} Cyrillic`).toContainEqual({ family, cyrillic: true });
      expect(faces, `${family} Latin`).toContainEqual({ family, cyrillic: false });
    }
  });

  test('English pages do not download Cyrillic files', async ({ page }) => {
    await visit(page, 'cv/');
    const faces = await loadedFaces(page);
    expect(faces.filter((face) => face.cyrillic)).toEqual([]);
  });

  test('Russian text is drawn with the web fonts, not system fonts', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Uses the Chromium DevTools protocol');
    await visit(page, 'ru/');
    await page.evaluate(() => document.fonts.ready);

    const session = await page.context().newCDPSession(page);
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument', { depth: -1 });

    const selectors = ['.hero__name', '.hero__lines p', '.hero__location', '.section__label:not(.visually-hidden)', '.site-header__brand', '.site-footer__copy'];
    for (const selector of selectors) {
      const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      expect(nodeId, selector).toBeGreaterThan(0);
      const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
      expect(fonts.length, selector).toBeGreaterThan(0);
      for (const font of fonts) expect(font.isCustomFont, `${selector}: ${font.familyName}`).toBe(true);
    }
  });
});
