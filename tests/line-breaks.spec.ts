import { expect, test, visit } from './fixtures';

// Pairs that must stay on one line: «3-я», number ranges ("356–360",
// "10–14"), an abbreviation with a number ("NPK-2019"), «(см. «…»)», Russian
// two-letter prepositions with their word, a month with its year,
// «науч.-практ.» and «сб. ст.».
// The data keeps plain hyphens and spaces; typography.ts adds the joiners.
const PAIRS = {
  'number with a short ending': String.raw`\d-⁠?\p{L}`,
  'number range': String.raw`\d–⁠?\d`,
  'abbreviation with a number': String.raw`\p{Lu}{2,}-⁠?\d`,
  'see reference': String.raw`\(см\.\s\S`,
  'two-letter preposition': String.raw`(?<!\p{L})(?:по|на|за|из|от|до|со|во|ко|об)\s\S`,
  'month and year': String.raw`(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|январь|февраль|март|апрель|май|июнь|июль|август|сентябрь|октябрь|ноябрь|декабрь)\s\d`,
  'abbreviation with a hyphen': String.raw`\.-⁠?\p{L}`,
  'collection of papers': String.raw`сб\.\sст`,
};

const WIDTHS = [320, 340, 360, 375, 390, 414, 440, 480, 520, 560, 600, 640, 700, 768, 820, 900, 1024, 1100, 1180, 1280, 1366, 1440];

const PAGES = [
  { path: '', expected: ['number range', 'abbreviation with a number'] },
  { path: 'cv/', expected: ['number range', 'abbreviation with a number'] },
  { path: 'ru/', expected: Object.keys(PAIRS) },
  { path: 'ru/cv/', expected: Object.keys(PAIRS) },
];

test.describe('line breaks', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Layout sweep; one engine is enough');

  for (const { path, expected } of PAGES) {
    test(`/${path}: joined pairs never end a line from 320 to 1440px`, async ({ page }) => {
      await visit(page, path);
      await page.evaluate(() => document.fonts.ready);
      const broken: string[] = [];

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const result = await page.evaluate((pairs) => {
          const found: Record<string, number> = {};
          const split: string[] = [];
          const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent ?? '';
            for (const [name, source] of Object.entries(pairs)) {
              for (const match of text.matchAll(new RegExp(source, 'gu'))) {
                found[name] = (found[name] ?? 0) + 1;
                const range = document.createRange();
                range.setStart(node, match.index);
                range.setEnd(node, match.index + match[0].length);
                const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
                if (tops.size > 1) split.push(`${name}: "${match[0]}"`);
              }
            }
          }
          return { found, split };
        }, PAIRS);

        expect(Object.keys(result.found).sort(), `pairs present at ${width}px`).toEqual([...expected].sort());
        broken.push(...result.split.map((entry) => `${width}px ${entry}`));
      }
      expect(broken).toEqual([]);
    });
  }
});
