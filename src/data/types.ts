/**
 * Shape of the site content. `en.ts` satisfies `Profile`; `ru.ts` satisfies
 * `Profile` and the shape of `en.ts` (see `ShapeOf`), so an entry, a bullet or
 * an optional field that exists in only one language fails `astro check`.
 *
 * Lists of entries are keyed records: the `*_IDS` arrays below fix the keys
 * and the display order. To add an entry, add its id here, then add the entry
 * to both language files.
 */

export const LOCALES = ['en', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];

/** A phrase in another language inside a text, e.g. an English term on a Russian page. */
export interface Foreign {
  readonly lang: Locale;
  readonly text: string;
}

/** Text with phrases in another language; write it with `rich()` from `markup.ts`. */
export interface RichText {
  readonly parts: readonly (string | Foreign)[];
}

/** Plain text, or text with marked phrases in another language. */
export type Text = string | RichText;

/**
 * The shape of the English content with every text widened to `Text`: the same
 * keys, the same optional fields and the same list lengths.
 */
export type ShapeOf<T> = T extends string | RichText
  ? Text
  : T extends boolean
    ? boolean
    : T extends number
      ? number
      : { readonly [K in keyof T]: ShapeOf<T[K]> };

/** Home page sections, in page order (the hero comes first and has no id). */
export const SECTION_IDS = [
  'about',
  'focus',
  'work',
  'publications',
  'experience',
  'education',
  'affiliations',
  'skills',
  'contact',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/** Header navigation, in display order. Each id is also a section id. */
export const NAV_IDS = ['focus', 'work', 'publications', 'experience', 'contact'] as const satisfies readonly SectionId[];
export type NavId = (typeof NAV_IDS)[number];

export const FOCUS_IDS = ['sludge', 'decentralised', 'recovery'] as const;
export const WORK_IDS = ['cowass', 'laboratories', 'wetland', 'sludge', 'standards', 'turbines'] as const;
export const EXPERIENCE_IDS = ['isw', 'kirovvodproekt', 'chpp4', 'vyatproektservice'] as const;
export const DEGREE_IDS = ['msc', 'bsc'] as const;
export const TRAINING_IDS = ['tsinghua', 'mitx', 'borda', 'fhnw', 'sha'] as const;
export const MEMBERSHIP_IDS = ['wypw', 'cay4w', 'cop4wash'] as const;
export const EVENT_IDS = ['wwf9', 'wwf10', 'dushanbe'] as const;
export const LANGUAGE_IDS = ['tajik', 'russian', 'english', 'german'] as const;
export const TOOL_IDS = ['python', 'gis', 'epanet', 'autocad', 'civil3d', 'kobo'] as const;

type Keyed<Ids extends readonly string[], T> = Readonly<Record<Ids[number], T>>;
type Lines = readonly string[];

export interface PageMeta {
  title: string;
  description: string;
}

export interface Hero {
  name: string;
  /** Positioning lines under the name. */
  lines: Lines;
  location: string;
  /** Labels of the two quiet links under the hero. */
  links: { research: string; cv: string };
}

export interface FocusArea {
  title: string;
  text: Text;
  /** Marks a research interest rather than completed work. */
  interest?: boolean;
}

export interface WorkItem {
  title: Text;
  /** Organisation or institutions; omit when the source gives none. */
  org?: string;
  /** Period as displayed; omit when the source gives none (nothing is rendered). */
  period?: string;
  /** Funding note, shown as a tag. */
  funding?: string;
  /** Partners line, including its lead-in word ("Partners: …"). */
  partners?: string;
  points: Lines;
}

export interface ExperienceItem {
  period: string;
  role: string;
  org: string;
  place: string;
  summary?: string;
}

export interface Degree {
  degree: string;
  field: string;
  institution: string;
  place: string;
  period: string;
  /** Major, thesis, grade, scholarship. */
  details: Lines;
}

export interface TrainingItem {
  year: string;
  /** A title kept in its original language is marked with `rich()`. */
  title: Text;
  provider: string;
  place?: string;
}

export interface LanguageSkill {
  name: string;
  level: string;
}

export interface UiStrings {
  skipLink: string;
  /** Accessible name of the main navigation. */
  navLabel: string;
  /** Visible label of the menu button on small screens. */
  menu: string;
  /** Accessible name of the theme toggle; its pressed state means dark. */
  themeToggle: string;
  /** Accessible name of the language switch. */
  languageLabel: string;
  /** Tag for a research focus area that is an interest, not completed work. */
  researchInterest: string;
  portraitAlt: string;
}

export interface Profile {
  meta: { home: PageMeta; cv: PageMeta };
  ui: UiStrings;
  nav: Readonly<Record<NavId, string>>;
  /** Section labels, used on the home page and the CV. */
  sections: Readonly<Record<SectionId, string>>;
  hero: Hero;
  /** Paragraphs of the About block. */
  about: Lines;
  focus: Keyed<typeof FOCUS_IDS, FocusArea>;
  work: Keyed<typeof WORK_IDS, WorkItem>;
  publications: {
    /** Closing line under the list. */
    closing: string;
  };
  experience: Keyed<typeof EXPERIENCE_IDS, ExperienceItem>;
  education: {
    degreesLabel: string;
    degrees: Keyed<typeof DEGREE_IDS, Degree>;
    trainingLabel: string;
    training: Keyed<typeof TRAINING_IDS, TrainingItem>;
  };
  affiliations: {
    membershipsLabel: string;
    memberships: Keyed<typeof MEMBERSHIP_IDS, Text>;
    eventsLabel: string;
    events: Keyed<typeof EVENT_IDS, string>;
  };
  skills: {
    languagesLabel: string;
    languages: Keyed<typeof LANGUAGE_IDS, LanguageSkill>;
    toolsLabel: string;
    tools: Keyed<typeof TOOL_IDS, string>;
  };
  contact: {
    /** Shared switch from `shared.ts`, so both languages agree. */
    showAvailability: boolean;
    availability: string;
    emailLabel: string;
    /** Word between name and domain in the no-script email fallback. */
    emailAt: string;
    profilesLabel: string;
  };
  cv: {
    /** Label above the name on the CV page. */
    heading: string;
    /** Label of the About text on the CV. */
    profile: string;
    /** Print button; it opens the browser's print dialog, where a PDF can be saved. */
    download: string;
    /** Closing line of the CV. */
    references: string;
  };
  notFound: {
    title: string;
    text: string;
    homeLink: string;
  };
  footer: {
    /** Name shown after the copyright sign. */
    copyright: string;
  };
}
