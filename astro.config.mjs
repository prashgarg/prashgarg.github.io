// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.prashantgarg.org',
  vite: {
    plugins: [tailwindcss()]
  },
  build: {
    format: 'directory',
  },
  integrations: [sitemap(), react()]
});