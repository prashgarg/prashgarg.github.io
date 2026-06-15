import type { APIRoute } from 'astro';
import { papers, site } from '../data/site';

// Atom feed for paper updates. Subscribers (RSS readers, scholar
// aggregators) get pinged whenever a paper is added or its status
// changes. Sorted newest first.

const STATUS_RANK: Record<string, number> = {
  published: 5, accepted: 4, rr: 3, working: 2, other: 1,
};

const sorted = [...papers].sort((a, b) => {
  const yearDiff = (b.year || 0) - (a.year || 0);
  if (yearDiff !== 0) return yearDiff;
  return (STATUS_RANK[b.status] || 0) - (STATUS_RANK[a.status] || 0);
});

const SITE_URL = site.origin;
const FEED_URL = `${SITE_URL}/papers.xml`;
// Feed <updated>: the most recent REAL publication year (sorted desc, so
// the first paper that has a year). Undated working/forthcoming papers
// don't drive this — we fall back to build time rather than fabricating a
// January-1 date that implies a publication that hasn't happened (M21).
const buildNow = new Date().toISOString();
const latestYear = sorted.find(p => typeof p.year === 'number')?.year;
const feedUpdated = latestYear ? new Date(`${latestYear}-01-01T00:00:00Z`).toISOString() : buildNow;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = () => {
  const entries = sorted.map(p => {
    const url      = `${SITE_URL}/research/${p.slug}`;
    const venue    = p.venue || 'Working paper';
    const hasYear  = typeof p.year === 'number';
    // Only papers with a real publication year get a <published> date and
    // a year-based <updated>. Undated working/forthcoming papers use build
    // time and omit <published> — never fabricate a publication date (M21).
    const updated  = hasYear ? new Date(`${p.year}-01-01T00:00:00Z`).toISOString() : buildNow;
    const publishedTag = hasYear ? `\n    <published>${updated}</published>` : '';
    const authors  = ['Prashant Garg', ...p.coauthors];
    return `  <entry>
    <id>${url}</id>
    <title>${esc(p.title)}</title>
    <link rel="alternate" type="text/html" href="${url}"/>
    <updated>${updated}</updated>${publishedTag}
    <category term="${esc(p.status)}"/>
    ${authors.map(a => `<author><name>${esc(a)}</name></author>`).join('\n    ')}
    <summary type="html">${esc(`${venue}${p.year ? ' · ' + p.year : ''}. ${p.blurb.slice(0, 500)}${p.blurb.length > 500 ? '…' : ''}`)}</summary>
  </entry>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(site.name)} — papers</title>
  <subtitle>${esc(site.tagline)}</subtitle>
  <link rel="alternate" type="text/html" href="${SITE_URL}/research"/>
  <link rel="self" type="application/atom+xml" href="${FEED_URL}"/>
  <id>${FEED_URL}</id>
  <updated>${feedUpdated}</updated>
  <author><name>${esc(site.name)}</name><email>${esc(site.email)}</email></author>
${entries}
</feed>
`;
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
