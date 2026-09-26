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
      // Zero-width format characters (the word joiner U+2060) need no glyph.
      const outside = [...new Set(text)].filter(
        (char) => !/\s/.test(char) && !/\p{Cf}/u.test(char) && !covered(char.codePointAt(0)!),
      );
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

  test('only the Latin and Cyrillic subset files are requested', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.woff2')) requested.push(request.url().split('/').pop()!);
    });
    for (const path of ['', 'ru/']) {
      await visit(page, path);
      await page.evaluate(() => document.fonts.ready);
    }
    expect(requested.length).toBeGreaterThan(0);
    for (const file of requested) expect(file).toMatch(/-(latin|cyrillic)-(wght|500)-normal\.[\w-]+\.woff2$/);
  });

  for (const path of ['', 'ru/']) {
    test(`every visible text on /${path} is drawn with the web fonts, not system fonts`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Uses the Chromium DevTools protocol');
      await visit(page, path);
      await page.evaluate(() => document.fonts.ready);

      // Mark every rendered element with its own text. The spoken language
      // names in the switch are hidden and use a system font on purpose.
      const count = await page.evaluate(() => {
        let index = 0;
        for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
          const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim());
          if (!ownText || element.closest('.lang-switch__name, noscript') || element.getClientRects().length === 0) continue;
          element.dataset.fontCheck = String(index++);
        }
        return index;
      });
      expect(count).toBeGreaterThan(20);

      const session = await page.context().newCDPSession(page);
      await session.send('DOM.enable');
      await session.send('CSS.enable');
      const { root } = await session.send('DOM.getDocument', { depth: -1 });
      const { nodeIds } = await session.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-font-check]' });
      expect(nodeIds).toHaveLength(count);

      const systemFonts: string[] = [];
      for (const nodeId of nodeIds) {
        const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
        for (const font of fonts) {
          if (!font.isCustomFont) {
            const { outerHTML } = await session.send('DOM.getOuterHTML', { nodeId });
            systemFonts.push(`${font.familyName}: ${outerHTML.slice(0, 120)}`);
          }
        }
      }
      expect(systemFonts).toEqual([]);
    });
  }
});
