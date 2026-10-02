import { readFileSync } from 'node:fs';
import jsQR from 'jsqr';
import type { Page } from '@playwright/test';
import { EMAIL, PHONE_PARTS, PROFILE_LINKS } from '../src/data/shared.ts';
import { SITE_URL } from '../src/config.ts';
import { expect, test, visit } from './fixtures';
import { PROFILES, data } from './sections';

const PAGES = [
  { name: 'home (en)', path: '', lang: 'en' },
  { name: 'cv (en)', path: 'cv/', lang: 'en' },
  { name: 'home (ru)', path: 'ru/', lang: 'ru' },
  { name: 'cv (ru)', path: 'ru/cv/', lang: 'ru' },
] as const;

const button = (page: Page, lang: 'en' | 'ru') => page.getByRole('button', { name: PROFILES[lang].ui.saveContact });

/** The card a language should produce, written out from the data. */
function expectedLines(lang: 'en' | 'ru', { compact = false } = {}): string[] {
  const t = PROFILES[lang];
  const [given, family] = data(t.hero.name).split(' ');
  const [locality, country] = data(t.hero.location).split(', ');
  const escape = (value: string) => value.replace(/[\\,;]/g, (char) => `\\${char}`);
  const phone = PHONE_PARTS.join('');
  const links = [
    ...PROFILE_LINKS.map((link) => ({ label: link.label, href: link.href })),
    { label: 'WhatsApp', href: `https://wa.me/${phone.slice(1)}` },
    { label: 'Telegram', href: `https://t.me/${phone}` },
  ];
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${family};${given};;;`,
    `FN:${given} ${family}`,
    `ORG:${escape(data(t.experience.isw.org))}`,
    `TITLE:${escape(data(t.experience.isw.role))}`,
    `TEL;TYPE=CELL:${phone}`,
    `EMAIL;TYPE=INTERNET:${EMAIL.user}@${EMAIL.domain}`,
    `URL:${SITE_URL}${lang === 'en' ? '' : 'ru/'}`,
    ...(compact ? [] : [`ADR;TYPE=WORK:;;;${locality};;;${country}`]),
    ...(compact ? [] : links).flatMap((link, index) => [`item${index + 1}.URL:${link.href}`, `item${index + 1}.X-ABLabel:${link.label}`]),
    'END:VCARD',
  ];
}

async function download(page: Page, lang: 'en' | 'ru') {
  const [file] = await Promise.all([page.waitForEvent('download'), button(page, lang).click()]);
  expect(file.suggestedFilename()).toBe('temur-sodikzoda.vcf');
  return readFileSync((await file.path())!, 'utf8');
}

test.describe('contact card', () => {
  for (const { name, path, lang } of PAGES) {
    test(`${name}: "Save contact" downloads the card from the data`, async ({ page }) => {
      await visit(page, path);
      await expect(button(page, lang)).toBeVisible();
      await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
      const box = (await button(page, lang).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);

      const card = await download(page, lang);
      // CRLF only, ends with a line break, lines of at most 75 bytes
      expect(card.endsWith('\r\n')).toBe(true);
      expect(card.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
      for (const line of card.split('\r\n')) expect(Buffer.byteLength(line), line).toBeLessThanOrEqual(75);
      // Unfolded, the lines are exactly the expected ones: the messenger number, no birthday, photo or product id
      const lines = card.replace(/\r\n /g, '').split('\r\n').slice(0, -1);
      expect(lines).toEqual(expectedLines(lang));
    });

    test(`${name}: the button works from the keyboard`, async ({ page }) => {
      await visit(page, path);
      await button(page, lang).focus();
      const [file] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
      expect(file.suggestedFilename()).toBe('temur-sodikzoda.vcf');
    });
  }

  test('the phone number is in the card only, never in a page', async ({ page }) => {
    const phone = PHONE_PARTS.join('');
    for (const { path, lang } of PAGES) {
      await visit(page, path);
      const html = await page.evaluate(() => document.documentElement.outerHTML.replace(/[\s\-()]/g, ''));
      expect(html, path).not.toContain(phone.slice(1));
      expect(await download(page, lang)).toContain(`TEL;TYPE=CELL:${phone}`);
    }
  });

  test('the button and the QR code are hidden in print', async ({ page }) => {
    await visit(page, 'cv/');
    await page.emulateMedia({ media: 'print' });
    await expect(button(page, 'en')).toBeHidden();
    await expect(page.locator('.contact-qr')).toBeHidden();
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('there is no save button', async ({ page }) => {
      for (const { path } of PAGES) {
        await visit(page, path);
        await expect(page.locator('.save-contact')).toBeHidden();
      }
    });
  });
});

test.describe('contact QR code', () => {
  for (const { name, path, lang } of PAGES) {
    test(`${name}: encodes the compact card`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await visit(page, path);
      const qr = page.getByRole('img', { name: PROFILES[lang].ui.contactQr });
      await expect(qr).toBeVisible();
      const box = (await qr.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(220);
      expect(box.width).toBeLessThanOrEqual(260);

      // Draw the code onto a canvas, then decode it here.
      const image = await qr.evaluate(async (svg) => {
        const scale = 6;
        const size = (svg as SVGSVGElement).viewBox.baseVal.width * scale;
        const picture = new Image();
        picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
        await picture.decode();
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;
        context.imageSmoothingEnabled = false;
        context.drawImage(picture, 0, 0, size, size);
        return { size, pixels: Array.from(context.getImageData(0, 0, size, size).data) };
      });
      const decoded = jsQR(Uint8ClampedArray.from(image.pixels), image.size, image.size);
      expect(decoded, 'QR code decodes').not.toBeNull();
      const text = new TextDecoder().decode(Uint8Array.from(decoded!.binaryData));
      // Exactly the compact card: CRLF lines, nothing beyond name, role, phone, email and site
      expect(text.endsWith('\r\n')).toBe(true);
      expect(text.replace(/\r\n /g, '').split('\r\n').slice(0, -1)).toEqual(expectedLines(lang, { compact: true }));
      // The download stays the full card
      expect(await download(page, lang)).toContain('X-ABLabel');
    });
  }

  test('is not shown on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, 'ru/');
    await expect(page.locator('.contact-qr')).toBeHidden();
  });

  test.describe('on a wide touch screen', () => {
    test.skip(({ browserName }) => browserName === 'firefox', 'isMobile is not supported in Firefox');
    test.use({ viewport: { width: 1280, height: 900 }, isMobile: true, hasTouch: true });

    test('is not shown', async ({ page }) => {
      await visit(page, 'cv/');
      await expect(page.locator('.contact-qr')).toBeHidden();
    });
  });
});
