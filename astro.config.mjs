// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Drives canonicals, og:url, and sitemap URLs. prashantgarg.org still
  // serves the old Google Site — keep this on the host that actually
  // serves the site; flip together with site.origin (src/data/site.ts)
  // when the DNS cutover happens.
  site: 'https://prashgarg.github.io',
  vite: {
    plugins: [tailwindcss()]
  },
  build: {
    format: 'directory',
  },
  // Exclude the iframe-only desktop shell (/os) from the sitemap — it is
  // noindex and not content. Everything else is included.
  integrations: [sitemap({ filter: (page) => !page.includes('/os/') }), react()]
});