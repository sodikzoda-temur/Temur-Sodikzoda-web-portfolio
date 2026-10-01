// Renders the social preview images, public/og-en.png and public/og-ru.png
// (1200x630), from the profile data with the site's own font files.
// Run with `npm run og` after changing the name, positioning line or location.
// Needs Chromium from Playwright (`npx playwright install chromium`), or a
// local Chromium given in PW_CHROMIUM_PATH.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import en from '../src/data/en.ts';
import ru from '../src/data/ru.ts';
import { typeset } from '../src/lib/typography.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const font = (path) => pathToFileURL(join(root, 'node_modules', path)).href;

// Same subsets and ranges as src/styles/fonts.css
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const CYRILLIC = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const faces = [
  ['Source Serif 4 Variable', '@fontsource-variable/source-serif-4/files/source-serif-4', 'wght', '200 900'],
  ['Inter Variable', '@fontsource-variable/inter/files/inter', 'wght', '100 900'],
  ['JetBrains Mono', '@fontsource/jetbrains-mono/files/jetbrains-mono', '500', '500'],
]
  .flatMap(([family, base, axis, weight]) =>
    [['latin', LATIN], ['cyrillic', CYRILLIC]].map(
      ([subset, range]) =>
        `@font-face { font-family: '${family}'; font-weight: ${weight}; src: url('${font(`${base}-${subset}-${axis}-normal.woff2`)}') format('woff2'); unicode-range: ${range}; }`,
    ),
  )
  .join('\n');

const escape = (text) => text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

function page(profile, lang) {
  const [line] = profile.hero.lines;
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><style>
${faces}
* { margin: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; }
body { position: relative; overflow: hidden; background: #1d5b43; color: #ffffff; font-family: 'Inter Variable', sans-serif; }
.text { position: absolute; left: 96px; right: 96px; top: 150px; }
.location { font: 500 22px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; color: #a8e3c4; }
h1 { margin-top: 28px; font: 500 96px/1.02 'Source Serif 4 Variable', serif; letter-spacing: -0.02em; }
p.line { margin-top: 32px; max-width: 900px; font: 400 36px/1.35 'Inter Variable', sans-serif; color: #e4f2e9; }
svg { position: absolute; left: 0; bottom: 64px; width: 1200px; height: 72px; color: #3db27a; opacity: 0.6; }
</style></head><body>
<div class="text">
  <p class="location">${escape(typeset(profile.hero.location, lang))}</p>
  <h1>${escape(typeset(profile.hero.name, lang))}</h1>
  <p class="line">${escape(typeset(line, lang))}</p>
</div>
<svg viewBox="0 0 1200 48" preserveAspectRatio="none" aria-hidden="true"><path d="M0 34C160 34 250 12 420 12S700 40 880 36 1100 14 1200 18" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>
</body></html>`;
}

const dir = mkdtempSync(join(tmpdir(), 'og-'));
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [lang, profile] of [['en', en], ['ru', ru]]) {
  const file = join(dir, `${lang}.html`);
  writeFileSync(file, page(profile, lang));
  await tab.goto(pathToFileURL(file).href);
  await tab.evaluate(() => document.fonts.ready);
  const missing = await tab.evaluate(() => [...document.fonts].filter((face) => face.status === 'error').length);
  if (missing) throw new Error(`${missing} font files failed to load`);
  await tab.screenshot({ path: join(root, 'public', `og-${lang}.png`) });
  console.log(`public/og-${lang}.png`);
}
await browser.close();
