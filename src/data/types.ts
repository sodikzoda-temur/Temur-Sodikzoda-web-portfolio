/**
 * Shape of the site content. `en.ts` and `ru.ts` must both satisfy `Profile`,
 * so a field missing in either language fails `astro check`.
 *
 * Lists whose entries must exist in both languages are keyed records: the
 * `*_IDS` arrays below fix the keys and the display order. To add an entry,
 * add its id here, then add the entry to both language files.
 */

export const LOCALES = ['en', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];

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
  text: string;
  /** Marks a research interest rather than completed work. */
  interest?: boolean;
}

export interface WorkItem {
  title: string;
  /** Organisation or institutions; omit when the source gives none. */
  org?: string;
  /** Period as displayed; omit when the source gives none. */
  period?: string;
  /** Short facts such as funding and partners. */
  meta?: Lines;
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
  title: string;
  /** Set when the title keeps its original language. */
  titleLang?: Locale;
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
    memberships: Keyed<typeof MEMBERSHIP_IDS, string>;
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
    download: string;
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
