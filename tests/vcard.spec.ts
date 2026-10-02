// The card builder on its own, with awkward synthetic values: folding,
// escaping and line endings, independent of the site's data.
import { expect, test } from '@playwright/test';
import { buildVcard, type ContactFields } from '../src/lib/vcard.ts';

const FIELDS: ContactFields = {
  givenName: 'Анна-Мария',
  familyName: 'Иванова; Петрова',
  org: 'Международный научно-исследовательский институт водоснабжения, водоотведения и санитарии; отдел 3\\Б',
  title: 'Ведущий инженер,\nкоординатор\r\nпроектов\rи исследований',
  url: 'https://example.org/ru/',
  locality: 'Худжанд, Согд',
  country: 'Таджикистан',
  links: [{ label: 'Профиль; ResearchGate, основной', href: 'https://example.org/profile?a=1;b=2' }],
};
const EMAIL = 'someone@example.org';
const PHONE = '+10000000000';

const encoder = new TextEncoder();
const unfold = (card: string) => card.replace(/\r\n /g, '');

/** Splits a text value on unescaped separators and undoes RFC 2426 escaping. */
function values(value: string, separator: ';' | null = null): string[] {
  const out = [''];
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === '\\') {
      const next = value[i + 1] ?? '';
      out[out.length - 1] += next === 'n' || next === 'N' ? '\n' : next;
      i += 1;
    } else if (separator && char === separator) out.push('');
    else out[out.length - 1] += char;
  }
  return out;
}

const property = (card: string, name: string) => {
  const line = unfold(card).split('\r\n').find((candidate) => candidate.startsWith(`${name}:`));
  expect(line, name).toBeDefined();
  return (line ?? '').slice(name.length + 1);
};

for (const compact of [false, true]) {
  test.describe(`buildVcard${compact ? ' (compact)' : ''}`, () => {
    const card = buildVcard(FIELDS, EMAIL, PHONE, { compact });

    test('uses CRLF only and keeps every physical line within 75 bytes', () => {
      expect(card.endsWith('\r\n')).toBe(true);
      expect(card.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
      const lines = card.slice(0, -2).split('\r\n');
      expect(lines.some((line) => line.startsWith(' ')), 'long Cyrillic values are folded').toBe(true);
      for (const line of lines) expect(encoder.encode(line).length, line).toBeLessThanOrEqual(75);
    });

    test('folds only between characters, so every piece is valid UTF-8 on its own', () => {
      for (const line of card.slice(0, -2).split('\r\n')) {
        const bytes = encoder.encode(line);
        // A strict decoder throws on a split multi-byte character
        expect(() => new TextDecoder('utf-8', { fatal: true }).decode(bytes), line).not.toThrow();
        expect(new TextDecoder().decode(bytes)).toBe(line);
      }
    });

    test('unfolds back to whole properties with every value intact', () => {
      const names = unfold(card).slice(0, -2).split('\r\n').map((line) => line.split(/[:]/)[0]);
      expect(names).toEqual([
        'BEGIN', 'VERSION', 'N', 'FN', 'ORG', 'TITLE', 'TEL;TYPE=CELL', 'EMAIL;TYPE=INTERNET', 'URL',
        ...(compact ? [] : ['ADR;TYPE=WORK', 'item1.URL', 'item1.X-ABLabel', 'item2.URL', 'item2.X-ABLabel', 'item3.URL', 'item3.X-ABLabel']),
        'END',
      ]);
      expect(values(property(card, 'N'), ';')).toEqual([FIELDS.familyName, FIELDS.givenName, '', '', '']);
      expect(values(property(card, 'FN'))).toEqual([`${FIELDS.givenName} ${FIELDS.familyName}`]);
      expect(values(property(card, 'ORG'))).toEqual([FIELDS.org]);
      // Every kind of line break, a bare CR included, comes back as one newline
      expect(values(property(card, 'TITLE'))).toEqual(['Ведущий инженер,\nкоординатор\nпроектов\nи исследований']);
      expect(property(card, 'TEL;TYPE=CELL')).toBe(PHONE);
      expect(property(card, 'EMAIL;TYPE=INTERNET')).toBe(EMAIL);
      expect(property(card, 'URL')).toBe(FIELDS.url);
      if (!compact) {
        expect(values(property(card, 'ADR;TYPE=WORK'), ';')).toEqual(['', '', '', FIELDS.locality, '', '', FIELDS.country]);
        expect(property(card, 'item1.URL')).toBe(FIELDS.links[0]?.href);
        expect(values(property(card, 'item1.X-ABLabel'))).toEqual([FIELDS.links[0]?.label]);
        expect(property(card, 'item2.URL')).toBe('https://wa.me/10000000000');
        expect(property(card, 'item3.URL')).toBe(`https://t.me/${PHONE}`);
      }
    });

    test('escapes separators in text values', () => {
      const unfolded = unfold(card);
      expect(unfolded).toContain('N:Иванова\\; Петрова;Анна-Мария;;;\r\n');
      expect(unfolded).toContain('отдел 3\\\\Б\r\n');
      expect(unfolded).toContain('TITLE:Ведущий инженер\\,\\nкоординатор\\nпроектов\\nи исследований\r\n');
      if (!compact) expect(unfolded).toContain('ADR;TYPE=WORK:;;;Худжанд\\, Согд;;;Таджикистан\r\n');
    });
  });
}
