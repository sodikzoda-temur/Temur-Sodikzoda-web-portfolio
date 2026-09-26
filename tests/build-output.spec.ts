import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { SITE } from '../src/config.ts';
import { EMAIL } from '../src/data/shared.ts';

// Static checks on the build. The Content Security Policy allows only
// same-origin files, so the markup must not contain inline code or styles.
// Files are read inside the tests: the web server builds the site first.
const DIST = join(process.cwd(), 'dist');

function filesEndingWith(dir: string, extension: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesEndingWith(path, extension);
    return entry.name.endsWith(extension) ? [path] : [];
  });
}

const htmlFiles = () => filesEndingWith(DIST, '.html');

test.describe('build output', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Browser independent');

  test('contains every page', () => {
    const pages = htmlFiles().map((file) => relative(DIST, file)).sort();
    expect(pages).toEqual(['404.html', 'cv/index.html', 'index.html', 'ru/cv/index.html', 'ru/index.html']);
  });

  test('has no inline scripts, styles, handlers, generator tag or insecure URLs', () => {
    for (const file of htmlFiles()) {
      const name = relative(DIST, file);
      const html = readFileSync(file, 'utf8');
      const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
      expect.soft(scripts.filter((tag) => !/\ssrc=/i.test(tag)), `${name}: inline <script>`).toEqual([]);
      expect.soft(html, `${name}: <style> element`).not.toMatch(/<style\b/i);
      expect.soft(html, `${name}: style attribute`).not.toMatch(/\sstyle=/i);
      expect.soft(html, `${name}: event handler attribute`).not.toMatch(/\son[a-z]+=/i);
      expect.soft(html, `${name}: generator meta`).not.toMatch(/name=["']?generator/i);
      expect.soft(html, `${name}: insecure URL`).not.toMatch(/(src|href)=["']?http:/i);
    }
  });

  test('never contains the full email address', () => {
    const address = `${EMAIL.user}@${EMAIL.domain}`;
    const files = [...htmlFiles(), ...filesEndingWith(DIST, '.js')];
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      expect.soft(readFileSync(file, 'utf8'), relative(DIST, file)).not.toContain(address);
    }
  });

  test('declares six font faces, Latin and Cyrillic only, all with font-display: swap', () => {
    const css = filesEndingWith(DIST, '.css').map((file) => readFileSync(file, 'utf8')).join('\n');
    const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
    expect(faces).toHaveLength(6);
    for (const face of faces) {
      expect.soft(face).toMatch(/font-display:\s*swap/);
      expect.soft(face).toMatch(/-(latin|cyrillic)-(wght|500)-normal\.[\w-]+\.woff2/);
    }
  });

  test('preloads Inter on every page, and its Cyrillic file on Russian pages', () => {
    const css = filesEndingWith(DIST, '.css').map((file) => readFileSync(file, 'utf8')).join('\n');
    for (const file of htmlFiles()) {
      const name = relative(DIST, file);
      const html = readFileSync(file, 'utf8');
      const russian = /<html[^>]*\slang="ru"/.test(html);
      const preloads = (html.match(/<link rel="preload"[^>]*>/g) ?? []).map((tag) => ({
        tag,
        href: tag.match(/href="([^"]+)"/)?.[1] ?? '',
      }));
      const latin = preloads.filter(({ href }) => /\/inter-latin-wght-normal\.[\w-]+\.woff2$/.test(href));
      const cyrillic = preloads.filter(({ href }) => /\/inter-cyrillic-wght-normal\.[\w-]+\.woff2$/.test(href));
      expect.soft(latin, `${name}: Inter Latin preload`).toHaveLength(1);
      expect.soft(cyrillic, `${name}: Inter Cyrillic preload`).toHaveLength(russian ? 1 : 0);

      for (const { tag, href } of preloads) {
        expect.soft(tag, `${name}: preload attributes`).toMatch(/as="font"/);
        expect.soft(tag, `${name}: preload attributes`).toMatch(/type="font\/woff2"/);
        expect.soft(tag, `${name}: preload attributes`).toMatch(/\scrossorigin[\s>=]/);
        expect.soft(css, `${name}: preloaded file is the one the stylesheet uses`).toContain(`url(${href})`);
        expect.soft(existsSync(join(DIST, href.slice(SITE.base.length))), `${name}: ${href} exists`).toBe(true);
      }
    }
  });
});
