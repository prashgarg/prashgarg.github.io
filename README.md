# prashantgarg.org

The personal academic website of Prashant Garg, economist. Live at
[prashantgarg.org](https://prashantgarg.org).

The home page is a 3D "Severance"-style office built with
[Astro](https://astro.build), [React Three Fiber](https://r3f.docs.pmnd.rs/),
and [drei](https://github.com/pmndrs/drei). Press Enter or click the monitor
and the camera dollies in; the screen is a real Windows 95-style desktop
(`/os`) composited into the 3D scene as a same-origin DOM iframe via drei's
`<Html transform>`. The inner pages (research, talks, library, now, CV) live
inside that desktop, with a plain, no-JS fallback at
[`/standard`](https://prashantgarg.org/standard).

Also built with [Tailwind CSS](https://tailwindcss.com) and per-page social
images from [astro-og-canvas](https://github.com/delucis/astro-og-canvas).
The PBR surface textures are CC0 from [ambientCG](https://ambientcg.com). The
"boot → camera into the monitor → inner site" pattern is inspired by
[Henry Heffernan's portfolio](https://henryheffernan.com); none of his code or
assets are reproduced. The visual register tips its hat to
[PostHog](https://posthog.com).

## Local development

> Use **Node 22**. Astro 6 + Vite 7 hang on Node 23+, so `predev`/`prebuild`
> guard the version. On a Dropbox-synced checkout the local `astro build` can
> stall at 0% CPU; CI builds it cleanly.

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # static build into dist/
npm run preview      # preview the built site
```

## Editing content

Almost everything lives in [`src/data/site.ts`](src/data/site.ts):

- `papers` — publications, working papers, R&Rs, essays
- `talks` — seminars, conferences, workshops
- `tools` — companion sites (causal.claims, frontiergraph.com, …)
- `library` — public-goods writing (LLM guide, Dylan essay)
- `site`, `affiliations`, `pageMeta` — bio, email, socials, per-page metadata

Adding a paper or a talk is a one-line addition there; the Research, Talks,
Library, and per-paper pages all re-render from it. Page text lives in
`src/pages/*.astro`. The 3D scene is `src/components/Office.tsx` and the Win95
desktop is `src/components/InnerDesktop.tsx`.

## Deployment

A static build, deployed to GitHub Pages from `main` via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push.
It's served at the apex `prashantgarg.org` (with `www` and
`prashgarg.github.io` 301-redirecting to it); the custom domain is pinned by
`public/CNAME`.

## Site map

- `/` — the 3D office (bio, recent research, contact, inside the monitor)
- `/research`, `/research/[slug]` — papers, filterable, one page each
- `/talks` — talks timeline
- `/library`, `/now`, `/cv` — writing, current focus, CV
- `/standard` — plain, no-JS version of everything (the accessible fallback)
- `/og/*.png`, `/sitemap-index.xml`, `/robots.txt`, `/404`

## License

The **code** in this repo is released under the [MIT License](LICENSE). The
**content** (papers, talks, writing, bio, photo, CV) is © Prashant Garg and is
not covered by that license.
