// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Drives canonicals, og:url, and sitemap URLs. DNS cutover done
  // (2026-06-24): prashantgarg.org serves the site over HTTPS (www +
  // prashgarg.github.io 301-redirect to it). Keep in sync with
  // site.origin (src/data/site.ts).
  site: 'https://prashantgarg.org',
  vite: {
    plugins: [tailwindcss()]
  },
  build: {
    format: 'directory',
  },
  // Exclude the iframe-only desktop shell (/os) from the sitemap — it is
  // noindex and not content. Everything else is included.
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/os/'),
      // Stamp a build-time lastmod so crawlers get a freshness signal that
      // refreshes on each deploy (per-page content dates would be better but
      // need a date source; build date is a cheap, reasonable baseline).
      serialize: (item) => ({ ...item, lastmod: new Date().toISOString() }),
    }),
    react(),
  ]
});