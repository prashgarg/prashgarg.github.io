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
// Use the most-recent paper's year as the feed's updated stamp.
// Atom 1.0 requires ISO-8601 datetime; fall back to first of January.
const feedUpdated = new Date(`${sorted[0]?.year || new Date().getFullYear()}-01-01T00:00:00Z`).toISOString();

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
    const yearStr  = p.year ? String(p.year) : String(new Date().getFullYear());
    const updated  = new Date(`${yearStr}-01-01T00:00:00Z`).toISOString();
    const authors  = ['Prashant Garg', ...p.coauthors];
    return `  <entry>
    <id>${url}</id>
    <title>${esc(p.title)}</title>
    <link rel="alternate" type="text/html" href="${url}"/>
    <updated>${updated}</updated>
    <published>${updated}</published>
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
