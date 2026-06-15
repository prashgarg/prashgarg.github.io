import { OGImageRoute } from 'astro-og-canvas';
import { papers, pageMeta } from '../../data/site';

type Page = { title: string; description: string };

// Page descriptions come from the shared pageMeta map (src/data/site.ts)
// so the OG card and the HTML meta description stay in lockstep.
const pages: Record<string, Page> = { ...pageMeta };

for (const p of papers) {
  pages[`research/${p.slug}`] = { title: p.title, description: p.blurb };
}

export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'route',
  pages,
  getImageOptions: (_path: string, page: Page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [[232, 224, 203], [220, 211, 188]],
    border: { color: [245, 78, 0], width: 14, side: 'inline-start' },
    padding: 70,
    font: {
      title:       { color: [20, 17, 13], weight: 'Bold',   size: 78, lineHeight: 1.05 },
      description: { color: [60, 50, 40], weight: 'Normal', size: 30, lineHeight: 1.3 },
    },
  }),
});
