import { OGImageRoute } from 'astro-og-canvas';
import { papers, site as siteData } from '../../data/site';

type Page = { title: string; description: string };

const pages: Record<string, Page> = {
  'index':    { title: 'Prashant Garg', description: siteData.tagline },
  'research': { title: 'Research', description: 'Papers, projects, and the questions behind them.' },
  'talks':    { title: 'Talks', description: 'Each paper, and where it has gone.' },
  'library':  { title: 'Library', description: 'Code, notes, and the occasional essay.' },
  'now':      { title: 'Now', description: 'What I am thinking about right now.' },
};

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
