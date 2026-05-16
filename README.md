# prashantgarg.org

Personal website for Prashant Garg.

Built with [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com),
[Pagefind](https://pagefind.app) (search), and [astro-og-canvas](https://github.com/delucis/astro-og-canvas) (per-page social images).
Visual design tips its hat to [PostHog](https://posthog.com).

## Local development

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # static build into dist/
npm run preview      # preview the built site
```

## Editing content

All content lives in [`src/data/site.ts`](src/data/site.ts):

- `papers`     — the publications, working papers, R&Rs, and essays
- `talks`      — every seminar, conference, and workshop
- `tools`      — the live companion sites (causal.claims, frontiergraph.com, …)
- `library`    — public-goods writing (LLM guide, Dylan essay)
- `affiliations`, `site` (bio, email, socials)

Adding a paper or a talk is a one-line addition to that file. The Research,
Talks, Library, and per-paper detail pages all re-render from it.

To edit page text directly:

| Page              | File                                    |
| ----------------- | --------------------------------------- |
| Home              | `src/pages/index.astro`                 |
| Research listing  | `src/pages/research/index.astro`        |
| Paper detail page | `src/pages/research/[slug].astro`       |
| Talks             | `src/pages/talks.astro`                 |
| Library           | `src/pages/library.astro`               |
| Now               | `src/pages/now.astro`                   |
| 404               | `src/pages/404.astro`                   |

## Deployment

This repo is private. GitHub Pages on the free plan only deploys from public
repos, so pick one of the following:

### Option A — Cloudflare Pages (free, recommended for private repos)

1. Sign in to <https://dash.cloudflare.com/?to=/:account/pages>.
2. Create application → **Connect to Git** → authorise GitHub → pick this repo.
3. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version (env var `NODE_VERSION`): `22`
4. Save and deploy. Cloudflare will give a `*.pages.dev` URL.
5. Add the custom domain `prashantgarg.org` in **Custom domains** → follow
   Cloudflare's CNAME instructions. They handle TLS automatically.

### Option B — GitHub Pages

Requires either (a) making this repo public, or (b) a GitHub Pro plan. Once
either is true, the workflow at `.github/workflows/deploy.yml` will build and
publish on every push to `main`. Enable Pages in repo settings (Source: GitHub
Actions).

### Cutting `prashantgarg.org` over

Once the new site is live on a `*.pages.dev` or `*.github.io` URL and you have
checked every page, update the DNS records on the domain registrar:

- Replace the current Google Sites A/CNAME records with the host the new
  provider gives you (Cloudflare Pages provides a CNAME target; GitHub Pages
  uses four A records pointing at `185.199.108–111.153`).
- Verify the apex (`prashantgarg.org`) and `www.prashantgarg.org` both resolve.
- Re-issue TLS certificates if needed (Cloudflare automatic; GitHub Pages via
  repo settings → **Enforce HTTPS**).

After cut-over, leave the Google Site up for a week as a fallback in case
someone has cached the old DNS.

## Site map

- `/`              — Home (bio + recent research + contact)
- `/research`      — All papers, filterable, with expandable cards
- `/research/[slug]` — One page per paper: abstract, links, coverage, talks-given-on-it diagram
- `/talks`         — Interactive timeline + per-paper branching networks
- `/library`       — LLM guide, Dylan essay, future notes
- `/now`           — What I'm thinking about right now
- `/og/*.png`      — Auto-generated social preview images for every page
- `/sitemap-index.xml`, `/robots.txt`, `/404`

## License

The code in this repo is released under the MIT license. The content (papers,
talks list, bios, writing) belongs to Prashant Garg.
