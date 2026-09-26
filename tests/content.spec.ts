import { expect, test } from '@playwright/test';
import en from '../src/data/en.ts';
import { publications } from '../src/data/publications.ts';
import ru from '../src/data/ru.ts';

// A second guard next to the type check (ShapeOf in types.ts): walk both
// languages and compare keys, optional fields and list lengths.

const isText = (value: unknown) =>
  typeof value === 'string' || (typeof value === 'object' && value !== null && Array.isArray((value as { parts?: unknown }).parts));

function differences(a: unknown, b: unknown, path: string): string[] {
  if (isText(a) || isText(b)) return isText(a) && isText(b) ? [] : [`${path}: text in one language only`];
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return [`${path}: a list in one language only`];
    const lengths = a.length === b.length ? [] : [`${path}: ${a.length} items in English, ${b.length} in Russian`];
    const shared = a.slice(0, Math.min(a.length, b.length));
    return [...lengths, ...shared.flatMap((entry, index) => differences(entry, b[index], `${path}[${index}]`))];
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys.flatMap((key) => {
      if (!(key in b)) return [`${path}.${key}: English only`];
      if (!(key in a)) return [`${path}.${key}: Russian only`];
      return differences((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`);
    });
  }
  return typeof a === typeof b ? [] : [`${path}: ${typeof a} in English, ${typeof b} in Russian`];
}

test.describe('content parity', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Browser independent');

  test('English and Russian have the same entries, fields and list lengths', () => {
    expect(differences(en, ru, 'profile')).toEqual([]);
  });

  test('the walk notices a missing bullet and a missing optional field', () => {
    const trimmed = structuredClone(ru) as unknown as { work: { cowass: { points: string[]; funding?: string } } };
    trimmed.work.cowass.points.pop();
    delete trimmed.work.cowass.funding;
    expect(differences(en, trimmed, 'profile')).toEqual([
      'profile.work.cowass.funding: English only',
      'profile.work.cowass.points: 3 items in English, 2 in Russian',
    ]);
  });

  test('every publication has an English and a Russian citation', () => {
    for (const item of publications) {
      expect(item.citation.en.trim().length).toBeGreaterThan(20);
      expect(item.citation.ru.trim().length).toBeGreaterThan(20);
      expect(item.note.trim().length).toBeGreaterThan(0);
    }
  });
});
