import { fileURLToPath } from 'node:url';
import { test as base, expect, type Page } from '@playwright/test';
import { SITE } from '../src/config.ts';

export { expect };

/** Base path of the site: "/" at the domain root, or e.g. "/repository-name/" on a github.io project site. */
export const BASE = SITE.base;

export interface SitePage {
  name: string;
  /** Path relative to the base path. */
  path: string;
  lang: 'en' | 'ru';
  htmlLang: 'en-GB' | 'ru';
  /** Same page in the other language. */
  twin: string;
  /** Same page in English, used for x-default. */
  english: string;
}

export const SITE_PAGES: readonly SitePage[] = [
  { name: 'home (en)', path: '', lang: 'en', htmlLang: 'en-GB', twin: 'ru/', english: '' },
  { name: 'cv (en)', path: 'cv/', lang: 'en', htmlLang: 'en-GB', twin: 'ru/cv/', english: 'cv/' },
  { name: 'home (ru)', path: 'ru/', lang: 'ru', htmlLang: 'ru', twin: '', english: '' },
  { name: 'cv (ru)', path: 'ru/cv/', lang: 'ru', htmlLang: 'ru', twin: 'cv/', english: 'cv/' },
];

/** A path that does not exist, served with the 404 page. */
export const MISSING_PATH = 'ru/no-such-page/deeper/';

/** Every page including the 404 page, for checks that apply everywhere. */
export const ALL_PATHS: readonly string[] = [...SITE_PAGES.map((p) => p.path), MISSING_PATH];

/** Navigate relative to the base URL; '' is the English home page. */
export const visit = (page: Page, path: string) => page.goto(path === '' ? './' : path);

export const EXPECTED_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; " +
  "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests";

interface Fixtures {
  /** Console messages that a test expects, e.g. the 404 status of a missing page. */
  allowedConsoleErrors: RegExp[];
  /** Collected problems: console errors, uncaught errors, CSP violations, failed requests. */
  pageProblems: string[];
}

/**
 * Every test fails if the page logs a console error, throws, violates the
 * Content Security Policy or requests a same-origin file that fails.
 */
export const test = base.extend<Fixtures>({
  allowedConsoleErrors: [[], { option: true }],
  pageProblems: [
    async ({ page, allowedConsoleErrors, browserName, baseURL }, use) => {
      const problems: string[] = [];

      // The policy's upgrade-insecure-requests makes WebKit ask for every
      // same-site file over https, also on the local http test server, where
      // that fails. Serve those requests from the http server instead, so the
      // tests run with the production policy unchanged.
      if (browserName === 'webkit' && baseURL?.startsWith('http://')) {
        const origin = new URL(baseURL).origin;
        const upgraded = origin.replace('http://', 'https://');
        await page.context().route(`${upgraded}/**`, async (route) => {
          const response = await route.fetch({ url: route.request().url().replace(upgraded, origin) });
          await route.fulfill({ response });
        });
      }

      const allowed = (text: string) => allowedConsoleErrors.some((pattern) => pattern.test(text));

      page.on('console', (message) => {
        if (message.type() === 'error' && !allowed(message.text())) {
          problems.push(`console error: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => problems.push(`uncaught error: ${error.message}`));
      page.on('requestfailed', (request) => {
        const reason = request.failure()?.errorText ?? 'unknown';
        // Requests cancelled by a navigation or reload are not failures.
        if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(reason)) {
          problems.push(`request failed: ${request.url()} (${reason})`);
        }
      });
      page.on('response', (response) => {
        const isDocument = response.request().resourceType() === 'document';
        if (response.status() >= 400 && !isDocument) {
          problems.push(`HTTP ${response.status()}: ${response.url()}`);
        }
      });

      await page.exposeFunction('__reportCspViolation', (violation: string) => {
        problems.push(`CSP violation: ${violation}`);
      });
      await page.addInitScript({ path: fileURLToPath(new URL('./csp-listener.js', import.meta.url)) });

      await use(problems);

      expect(problems, 'page problems').toEqual([]);
    },
    { auto: true },
  ],
});
