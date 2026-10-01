import type { APIRoute } from 'astro';
import { absolutePageUrl, LOCALES, type PageKey } from '../lib/i18n';

// Every page in both languages, each with its language alternates. The 404
// page is left out.
const PAGES: readonly PageKey[] = ['home', 'cv'];

export const GET: APIRoute = () => {
  const urls = PAGES.flatMap((page) => {
    const links = [
      ...LOCALES.map((lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${absolutePageUrl(lang, page)}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${absolutePageUrl('en', page)}"/>`,
    ].join('\n');
    return LOCALES.map((lang) => `  <url>\n    <loc>${absolutePageUrl(lang, page)}</loc>\n${links}\n  </url>`);
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
