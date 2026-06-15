import type { APIRoute } from 'astro';
import { site } from '../data/site';

// robots.txt is generated from site.origin so the Sitemap line can never
// drift from astro.config `site` again (it previously hard-coded the
// not-cut-over prashantgarg.org host, which 404s — crawlers never found
// the real sitemap). Flip site.origin at the DNS cutover and this follows.
const body = `User-agent: *
Allow: /

Sitemap: ${site.origin}/sitemap-index.xml
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
