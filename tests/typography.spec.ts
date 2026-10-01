import en from '../src/data/en.ts';
import { publications } from '../src/data/publications.ts';
import ru from '../src/data/ru.ts';
import { typeset, typesetAll, typesetCitation } from '../src/lib/typography.ts';
import { expect, test, visit } from './fixtures';

const NBSP = '\u00A0';
const WJ = '\u2060';
/** Undo the typography: non-breaking spaces back to spaces, word joiners removed. */
const plain = (text: string) => text.replaceAll(NBSP, ' ').replaceAll(WJ, '');

/** Every string in a content object. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

test.describe('typography', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Browser independent');

  test('changes only the type of space, never the wording', () => {
    for (const [lang, profile] of [['en', en], ['ru', ru]] as const) {
      const before = strings(profile);
      const after = strings(typesetAll(profile, lang));
      expect(after.map(plain)).toEqual(before);
    }
    for (const item of publications) {
      for (const lang of ['en', 'ru'] as const) {
        expect(plain(typesetCitation(item.citation[lang], lang))).toBe(item.citation[lang]);
      }
    }
  });

  test('binds Russian one-letter words to the next word', () => {
    expect(typeset('качеству воды в Центральной Азии', 'ru')).toBe(`качеству воды в${NBSP}Центральной Азии`);
    expect(typeset('и в сфере, а ключевым, к безопасному, с 2022 года, о соответствии, у нас, я инженер', 'ru')).toBe(
      `и${NBSP}в${NBSP}сфере, а${NBSP}ключевым, к${NBSP}безопасному, с${NBSP}2022${NBSP}года, о${NBSP}соответствии, у${NBSP}нас, я${NBSP}инженер`,
    );
    expect(typeset('В Международном секретариате (и в университетах)', 'ru')).toBe(
      `В${NBSP}Международном секретариате (и${NBSP}в${NBSP}университетах)`,
    );
    expect(typeset('по 4 направлениям, с октября 2022 года, 3-я Международная, 10–14 декабря', 'ru')).toBe(
      `по${NBSP}4${NBSP}направлениям, с${NBSP}октября${NBSP}2022${NBSP}года, 3-${WJ}я${NBSP}Международная, 10–14${NBSP}декабря`,
    );
    expect(typeset('3-я Международная конференция; 9-й и 10-й Всемирный форум', 'ru')).toBe(
      `3-${WJ}я${NBSP}Международная конференция; 9-${WJ}й${NBSP}и${NBSP}10-${WJ}й${NBSP}Всемирный форум`,
    );
    expect(typeset('4 статьи (см. «Публикации»)', 'ru')).toBe(`4${NBSP}статьи (см.${NBSP}«Публикации»)`);
    expect(typeset('Кировская ТЭЦ-4', 'ru')).toBe(`Кировская ТЭЦ-${WJ}4`);
    expect(typeset('Kirov CHPP-4 (T Plus)', 'en')).toBe(`Kirov CHPP-${WJ}4 (T Plus)`);
    // Latin look-alike letters and English text are left alone.
    expect(typeset('a c o y', 'ru')).toBe('a c o y');
    expect(typeset('I work at a university', 'en')).toBe('I work at a university');
  });

  test('binds two-letter prepositions to the next word and months to their years', () => {
    expect(typeset('за воду, по исследовательскому, на основе, из сточных, от FHNW, до 2026, со специалистами, во время, ко дню, об этом', 'ru')).toBe(
      `за${NBSP}воду, по${NBSP}исследовательскому, на${NBSP}основе, из${NBSP}сточных, от${NBSP}FHNW, до${NBSP}2026, со${NBSP}специалистами, во${NBSP}время, ко${NBSP}дню, об${NBSP}этом`,
    );
    expect(typeset('По образованию я инженер', 'ru')).toBe(`По${NBSP}образованию я${NBSP}инженер`);
    expect(typeset('с марта 2021 года по октябрь 2022 года', 'ru')).toBe(
      `с${NBSP}марта${NBSP}2021${NBSP}года по${NBSP}октябрь${NBSP}2022${NBSP}года`,
    );
    // Only whole words: «покрытие», «надзор» and English text are left alone.
    expect(typeset('покрытие надзор', 'ru')).toBe('покрытие надзор');
    expect(typeset('go to it', 'en')).toBe('go to it');
  });

  test('keeps initials, page and volume numbers together in citations', () => {
    const [newest, , third, oldest] = publications;
    const ruNewest = typesetCitation(newest!.citation.ru, 'ru');
    expect(ruNewest).toContain(`Суворов${NBSP}Д.${NBSP}М., Сущих${NBSP}В.${NBSP}М., Содикзода${NBSP}Т.${NBSP}Х.`);
    expect(ruNewest).toContain(`с${NBSP}использованием`);

    const enNewest = typesetCitation(newest!.citation.en, 'en');
    expect(enNewest).toContain(`Suvorov${NBSP}D.${NBSP}M., Sushchikh${NBSP}V.${NBSP}M., Sodikzoda${NBSP}T.${NBSP}Kh.`);

    expect(enNewest).toContain(`(NPK-${WJ}2020)`);
    expect(enNewest).toContain(`pp.${NBSP}356–${WJ}360`);
    expect(ruNewest).toContain(`(НПК-${WJ}2020)`);
    expect(ruNewest).toContain(`С.${NBSP}356–${WJ}360`);
    expect(typesetCitation(oldest!.citation.en, 'en')).toContain(`10–${WJ}14 December`);
    expect(typesetCitation(oldest!.citation.ru, 'ru')).toContain(`10–${WJ}14${NBSP}декабря`);
    expect(typesetCitation(third!.citation.en, 'en')).toContain(`vol.${NBSP}2`);
    expect(typesetCitation(third!.citation.ru, 'ru')).toContain(`Т.${NBSP}2`);
    expect(typesetCitation(oldest!.citation.ru, 'ru')).toContain(`2018${NBSP}г.`);
    expect(typesetCitation(oldest!.citation.ru, 'ru')).toContain(`науч.-${WJ}практ.`);
    expect(typesetCitation(third!.citation.ru, 'ru')).toContain(`сб.${NBSP}ст.`);
    expect(typesetCitation(third!.citation.ru, 'ru')).toContain(`науч.-${WJ}практ.`);
  });

  test('is applied to the rendered Russian page', async ({ page }) => {
    await visit(page, 'ru/');
    const lines = await page.locator('.hero__lines p').allTextContents();
    expect(lines.map(plain)).toEqual(ru.hero.lines);
    expect(lines[1]).toContain(`в${NBSP}Центральной`);
  });
});
