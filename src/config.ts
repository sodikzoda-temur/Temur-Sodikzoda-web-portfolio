/**
 * Public address of the site, including the trailing slash.
 * To move to a custom domain, change this one line (for example to
 * 'https://example.org/'); `site` and `base` are derived from it.
 */
export const SITE_URL = 'https://tsodikzoda.com/';

const url = new URL(SITE_URL);

export const SITE = {
  /** Origin only, used as Astro's `site`. */
  url: url.origin,
  /** Path prefix with leading and trailing slash, used as Astro's `base`. */
  base: url.pathname,
} as const;
