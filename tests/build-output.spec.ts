import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { SITE } from '../src/config.ts';
import { EMAIL, PHONE_PARTS } from '../src/data/shared.ts';
import { unscrambleParts } from '../src/lib/scramble.ts';

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
      // Inline scripts: only JSON-LD, a data block that never runs.
      const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
      const inline = scripts.filter((tag) => !/\ssrc=/i.test(tag));
      expect.soft(inline.filter((tag) => tag !== '<script type="application/ld+json">'), `${name}: inline <script>`).toEqual([]);
      expect.soft(inline.length, `${name}: JSON-LD blocks`).toBe(/^(ru\/)?index\.html$/.test(name) ? 1 : 0);
      expect.soft(html, `${name}: <style> element`).not.toMatch(/<style\b/i);
      expect.soft(html, `${name}: style attribute`).not.toMatch(/\sstyle=/i);
      expect.soft(html, `${name}: event handler attribute`).not.toMatch(/\son[a-z]+=/i);
      expect.soft(html, `${name}: generator meta`).not.toMatch(/name=["']?generator/i);
      expect.soft(html, `${name}: insecure URL`).not.toMatch(/(src|href)=["']?http:/i);
    }
  });

  test('never contains the full email address or phone number', () => {
    const address = `${EMAIL.user}@${EMAIL.domain}`;
    const phone = PHONE_PARTS.join('');
    const digits = phone.slice(1);
    const files = [...htmlFiles(), ...filesEndingWith(DIST, '.js'), ...filesEndingWith(DIST, '.css'), ...filesEndingWith(DIST, '.xml'), ...filesEndingWith(DIST, '.txt')];
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect.soft(text, relative(DIST, file)).not.toContain(address);
      // The number, its digits from the area code on, and any spaced or dashed form
      expect.soft(text, relative(DIST, file)).not.toContain(digits.slice(1));
      expect.soft(text.replace(/[\s\-()]/g, ''), relative(DIST, file)).not.toContain(digits);
    }
  });

  test('pages give away neither the number nor the address when their digits or attributes are read in a row', () => {
    const address = `${EMAIL.user}@${EMAIL.domain}`;
    const phone = PHONE_PARTS.join('');
    // The number with and without the country code
    const numbers = [phone.slice(1), phone.slice(2)];
    const decode = (value: string) =>
      value
        .replace(/&#x([\da-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/%40/gi, '@');
    const digitsOf = (text: string) => text.replace(/\D/g, '');
    let scrambled = 0;
    for (const file of htmlFiles()) {
      const name = relative(DIST, file);
      const html = readFileSync(file, 'utf8');
      const attributes = [...html.matchAll(/\s([\w:.-]+)=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)].map((match) => ({
        name: match[1] ?? '',
        value: decode(match[2] ?? match[3] ?? match[4] ?? ''),
      }));
      const text = decode(html.replace(/<[^>]*>/g, ''));
      const streams = {
        'all digits': digitsOf(decode(html)),
        'all attribute digits': digitsOf(attributes.map((attribute) => attribute.value).join('')),
        'text digits': digitsOf(text),
      };
      for (const [stream, digits] of Object.entries(streams)) {
        for (const number of numbers) expect.soft(digits, `${name}: ${stream}`).not.toContain(number);
      }
      for (const attribute of attributes) {
        for (const number of numbers) expect.soft(digitsOf(attribute.value), `${name}: ${attribute.name}`).not.toContain(number);
        expect.soft(attribute.value, `${name}: ${attribute.name}`).not.toContain(address);
      }
      expect.soft(attributes.map((attribute) => attribute.value).join(''), `${name}: attributes in a row`).not.toContain(address);
      expect.soft(text, `${name}: text`).not.toContain(address);

      // The email parts are separate attributes; the number is stored scrambled and still decodes to itself
      for (const attribute of attributes.filter((candidate) => candidate.name === 'data-vcard-phone')) {
        scrambled += 1;
        expect(attribute.value, `${name}: scrambled number`).not.toBe(JSON.stringify(PHONE_PARTS));
        expect(unscrambleParts(attribute.value), `${name}: scrambled number`).toBe(phone);
      }
    }
    // The save button is on both home pages and both CVs
    expect(scrambled).toBe(4);
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
