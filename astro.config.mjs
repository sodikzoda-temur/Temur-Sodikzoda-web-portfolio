// @ts-check
import { defineConfig } from 'astro/config';
import { SITE } from './src/config.ts';

export default defineConfig({
  site: SITE.url,
  base: SITE.base,
  trailingSlash: 'always',
  i18n: {
    locales: ['en', 'ru'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  build: {
    format: 'directory',
    // The Content Security Policy allows only same-origin files: no inline <style>.
    inlineStylesheets: 'never',
  },
  devToolbar: { enabled: false },
  vite: {
    build: {
      // Never inline small scripts, fonts or images: `script-src 'self'` and
      // `font-src 'self'` would block inline scripts and data: fonts.
      assetsInlineLimit: 0,
      // One small stylesheet for the whole site: a single request, cached
      // across pages, instead of several per page.
      cssCodeSplit: false,
    },
  },
});
