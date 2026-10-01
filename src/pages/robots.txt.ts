import type { APIRoute } from 'astro';
import { SITE_URL } from '../config';

// Built from SITE_URL, so a custom domain needs no change here. On a project
// site (under a path) crawlers read robots.txt only at the domain root; this
// file starts to count once the site has its own domain.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', SITE_URL).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
