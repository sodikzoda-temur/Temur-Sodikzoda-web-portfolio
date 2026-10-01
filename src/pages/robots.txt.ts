import type { APIRoute } from 'astro';
import { SITE_URL } from '../config';

// Built from SITE_URL, so a change of address needs no change here. Crawlers
// read robots.txt only at the root of a domain, which is where it is served
// while the site has its own domain.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', SITE_URL).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
