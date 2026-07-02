# prashantgarg.org

Source code for [prashantgarg.org](https://prashantgarg.org), the personal
academic website of Prashant Garg.

The code is public and MIT licensed. You are welcome to use it as a starting
point for your own academic or portfolio site. Please replace my writing,
papers, photo, CV, metadata, and domain before publishing your version.

## What This Is

The home page is a 3D office scene built with
[Astro](https://astro.build), [React Three Fiber](https://r3f.docs.pmnd.rs/),
[three.js](https://threejs.org/), and [drei](https://github.com/pmndrs/drei).
Press Enter or click the CRT monitor and the camera moves into a
Windows 95-style desktop. The desktop is a real same-origin DOM iframe
composited into the 3D monitor with drei's `<Html transform>`.

The inner site has pages for research, talks, library, now, and CV. A plain
fallback lives at [`/standard`](https://prashantgarg.org/standard) for readers
who do not want the 3D interface or whose device does not handle it well.

## Adapting It

Most personal content is in [`src/data/site.ts`](src/data/site.ts):

- `site`, `affiliations`, `pageMeta` - name, bio, links, contact, metadata
- `papers` - publications, working papers, projects, coverage, links
- `talks` - seminars, conferences, workshops
- `library` and `datasets` - writing, public goods, open data
- `education`, `awards`, `teaching`, `experience` - CV sections

To make your own version:

1. Replace the content in `src/data/site.ts`.
2. Replace `public/photo.jpg`, `public/cv.pdf`, and any personal assets.
3. Change `site.origin` in `src/data/site.ts` and `site` in
   [`astro.config.mjs`](astro.config.mjs).
4. Remove or replace `public/CNAME` if you are not using `prashantgarg.org`.
5. Keep `/standard` working. It is useful for accessibility, search, and people
   who just want the information.
6. Make the visual world your own. The desktop/monitor pattern is reusable, but
   your site will be better if the scene reflects your own taste and subject.

## Local Development

Use Node 22. Astro 6 + Vite 7 can hang on Node 23+, so `predev` and `prebuild`
guard the version.

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # static build into dist/
npm run preview      # preview the built site
```

On a Dropbox-synced checkout, local builds can occasionally stall. The GitHub
Pages CI build is the deployment source of truth.

## Project Map

- `src/components/Office.tsx` - 3D office scene, camera, monitor projection,
  audio, room interactions
- `src/components/InnerDesktop.tsx` - Windows 95-style desktop, windows, start
  menu, tray, keyboard shortcuts
- `src/layouts/Win95Layout.astro` - inner-page chrome and embed mode
- `src/pages/*.astro` - public pages
- `src/pages/og/[...route].ts` - social image generation
- `public/textures/` - PBR textures
- `public/hdri/` - environment lighting
- `scripts/check-node.mjs` - Node-version guard
- `scripts/screenshot.mjs` - Playwright screenshot helper

## Deployment

This repository deploys to GitHub Pages from `main`. The live site is served at
`prashantgarg.org`, with `www` and `prashgarg.github.io` redirecting to the apex
domain. The custom domain is pinned by `public/CNAME`.

If you fork the repo, remove `public/CNAME` until you have configured your own
domain in GitHub Pages.

## Inspiration And Credits

This site sits in a small lineage of playful portfolio sites that treat the web
page as a place rather than a flat document.

- [Henry Heffernan's portfolio](https://henryheffernan.com) inspired the
  "boot, enter the room, move into the computer" structure. No code or assets
  from Henry's site are used here.
- [PostHog](https://posthog.com) influenced the taste for product-site play,
  old-computer UI, and a slightly mischievous interface.
- *Severance* provided the main visual reference for the green office, CRT
  monitor, fluorescent ceiling, and institutional mood. This is a fan-made
  visual reference, not an affiliation.
- [ambientCG](https://ambientcg.com) provides the CC0 PBR textures.
- The stack stands on Astro, React, three.js, React Three Fiber, drei,
  Tailwind CSS, Playwright, and `astro-og-canvas`.

If you adapt this, keep the MIT license notice and give credit to the projects
and sites that shaped your version. A short note in your README is enough.

## License

The code in this repository is released under the [MIT License](LICENSE).

The content is not part of that license. My papers, writing, talks, bio, photo,
CV, and research material are copyright Prashant Garg unless otherwise stated.
Remove or replace them before publishing a fork.
