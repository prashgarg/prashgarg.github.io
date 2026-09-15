import type { Paper, PaperStatus } from '../data/site';

/**
 * Publisher-verified metadata for papers that have a version of record.
 * Keep this separate from the editorial records in site.ts: a paper's page
 * can be useful before its bibliographic metadata is final, but a citation
 * export should never turn an R&R or working paper into a journal article.
 */
export interface VerifiedCitation {
  kind: 'article' | 'preprint' | 'working-paper' | 'draft';
  authors: string[];
  journal?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  articleNumber?: string;
  doi?: string;
  eprint?: string;
  archivePrefix?: string;
  institution?: string;
  workingPaperNumber?: string;
  sourceUrl: string;
}

export const verifiedCitations: Record<string, VerifiedCitation> = {
  'political-expression-academics': {
    kind: 'article',
    authors: ['Garg, Prashant', 'Fetzer, Thiemo'],
    journal: 'Nature Human Behaviour',
    year: 2025,
    volume: '9',
    pages: '1815--1832',
    doi: '10.1038/s41562-025-02199-1',
    sourceUrl: 'https://www.nature.com/articles/s41562-025-02199-1',
  },
  'local-decline-populism': {
    kind: 'article',
    authors: ['Fetzer, Thiemo', 'Edenhofer, Jacob', 'Garg, Prashant'],
    journal: 'Economics Letters',
    year: 2025,
    volume: '252',
    articleNumber: '112360',
    doi: '10.1016/j.econlet.2025.112360',
    sourceUrl: 'https://www.sciencedirect.com/science/article/pii/S0165176525001971',
  },
  'cross-border-media-disasters': {
    kind: 'article',
    authors: ['Fetzer, Thiemo', 'Garg, Prashant'],
    journal: 'Nature Human Behaviour',
    year: 2026,
    doi: '10.1038/s41562-026-02512-6',
    sourceUrl: 'https://www.nature.com/articles/s41562-026-02512-6',
  },
  'global-automation-atlas': {
    kind: 'preprint',
    authors: ['Garg, Prashant', 'Crosta, Tommaso', 'Baier, Jasmin'],
    year: 2026,
    sourceUrl: 'https://automationatlas.org/paper/',
  },
  'causal-claims-economics': {
    kind: 'preprint',
    authors: ['Garg, Prashant', 'Fetzer, Thiemo'],
    year: 2025,
    eprint: '2501.06873',
    archivePrefix: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2501.06873',
  },
  'what-should-economics-ask-next': {
    kind: 'draft',
    authors: ['Garg, Prashant'],
    year: 2026,
    sourceUrl: 'https://frontiergraph.com/paper/',
  },
  'politicized-scientists': {
    kind: 'preprint',
    authors: ['Alabrese, Eleonora', 'Capozza, Francesco', 'Garg, Prashant'],
    year: 2026,
    doi: '10.21203/rs.3.rs-9354892/v1',
    sourceUrl: 'https://www.researchsquare.com/article/rs-9354892/v1',
  },
  'ai-production-networks': {
    kind: 'working-paper',
    authors: ['Fetzer, Thiemo', 'Lambert, Peter John', 'Feld, Bennet', 'Garg, Prashant'],
    year: 2024,
    institution: 'CEPR',
    workingPaperNumber: '19708',
    sourceUrl: 'https://cepr.org/publications/dp19708',
  },
  'health-shocks-research': {
    kind: 'working-paper',
    authors: ['Zhou, Hongyu', 'Garg, Prashant', 'Fetzer, Thiemo'],
    year: 2026,
    institution: 'CEPR',
    workingPaperNumber: '21230',
    sourceUrl: 'https://cepr.org/publications/dp21230',
  },
  'platform-migration': {
    kind: 'preprint',
    authors: ['Quelle, Dorian', 'Denker, Frederic', 'Garg, Prashant', 'Bovet, Alexandre'],
    year: 2026,
    eprint: '2505.24801',
    archivePrefix: 'arXiv',
    doi: '10.48550/arXiv.2505.24801',
    sourceUrl: 'https://arxiv.org/abs/2505.24801',
  },
  'ai-health-advice': {
    kind: 'preprint',
    authors: ['Garg, Prashant', 'Fetzer, Thiemo'],
    year: 2025,
    doi: '10.21203/rs.3.rs-7460273/v1',
    sourceUrl: 'https://www.researchsquare.com/article/rs-7460273/v1',
  },
};

function bibName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length < 2 ? full : `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
}

function fallbackAuthors(paper: Paper): string[] {
  return ['Prashant Garg', ...paper.coauthors].map(bibName);
}

function statusNote(status: PaperStatus, venue?: string): string | undefined {
  if (status === 'rr') return venue ? `Revise and resubmit at ${venue}` : 'Revise and resubmit';
  if (status === 'accepted') return venue ? `Forthcoming in ${venue}` : 'Forthcoming';
  if (status === 'working') return 'Working paper';
  if (status === 'other') return 'Essay or technical paper';
  return undefined;
}

function recordNote(paper: Paper, verified?: VerifiedCitation): string | undefined {
  if (!verified) return statusNote(paper.status, paper.venue);
  if (verified.kind === 'draft') return 'Draft for comments';
  if (verified.kind === 'preprint') {
    return paper.status === 'rr'
      ? `${statusNote(paper.status, paper.venue)}; preprint`
      : 'Preprint';
  }
  return statusNote(paper.status, paper.venue);
}

/** Return the metadata used by both JSON-LD and BibTeX when available. */
export function citationForPaper(paper: Paper): VerifiedCitation | undefined {
  return verifiedCitations[paper.slug];
}

/**
 * Generate a conservative BibTeX record. Only publisher-verified published
 * records receive an `@article` entry and journal fields; all other statuses
 * remain `@misc` with an explicit note.
 */
export function bibtexForPaper(paper: Paper, pageUrl: string): string {
  const verified = citationForPaper(paper);
  const type = verified?.kind === 'article' ? 'article' : 'misc';
  const key = `garg_${paper.slug.replace(/-/g, '_')}`;
  const authors = verified?.authors ?? fallbackAuthors(paper);
  const url = verified?.doi ? `https://doi.org/${verified.doi}` : (verified?.sourceUrl || paper.links[0]?.url || pageUrl);
  const fields = [
    `  author = {${authors.join(' and ')}},`,
    // Double braces preserve title case in styles that downcase BibTeX titles.
    `  title = {{${paper.title}}},`,
  ];

  if (verified?.kind === 'article' && verified.journal) {
    fields.push(`  journal = {${verified.journal}},`);
    fields.push(`  year = {${verified.year}},`);
    if (verified.volume) fields.push(`  volume = {${verified.volume}},`);
    if (verified.issue) fields.push(`  number = {${verified.issue}},`);
    if (verified.pages) fields.push(`  pages = {${verified.pages}},`);
    if (verified.articleNumber) fields.push(`  eid = {${verified.articleNumber}},`);
    if (verified.doi) fields.push(`  doi = {${verified.doi}},`);
  } else {
    const note = recordNote(paper, verified);
    if (note) fields.push(`  note = {${note}},`);
    if (verified) {
      fields.push(`  year = {${verified.year}},`);
      if (verified.institution) fields.push(`  institution = {${verified.institution}},`);
      if (verified.workingPaperNumber) fields.push(`  number = {${verified.workingPaperNumber}},`);
      if (verified.eprint) fields.push(`  eprint = {${verified.eprint}},`);
      if (verified.archivePrefix) fields.push(`  archivePrefix = {${verified.archivePrefix}},`);
      if (verified.doi) fields.push(`  doi = {${verified.doi}},`);
    }
  }

  fields.push(`  url = {${url}}`);
  return [`@${type}{${key},`, ...fields, '}'].join('\n');
}

/** Build a scholarly JSON-LD object without implying publication status. */
export function scholarlyArticleForPaper(paper: Paper, pageUrl: string) {
  const verified = citationForPaper(paper);
  const journal = { '@type': 'Periodical', name: verified?.journal };
  const volume = verified?.volume
    ? { '@type': 'PublicationVolume', volumeNumber: verified.volume, isPartOf: journal }
    : journal;
  const publication = verified?.issue
    ? { '@type': 'PublicationIssue', issueNumber: verified.issue, isPartOf: volume }
    : volume;
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: paper.title,
    abstract: paper.blurb.slice(0, 600),
    author: (verified?.authors ?? fallbackAuthors(paper)).map(name => ({
      '@type': 'Person',
      name: name.replace(/^([^,]+),\s*(.+)$/, '$2 $1'),
    })),
    ...(verified?.kind === 'article' && verified.journal ? {
      datePublished: String(verified.year),
      isPartOf: publication,
      ...(verified.doi ? { identifier: `https://doi.org/${verified.doi}` } : {}),
    } : {}),
    url: pageUrl,
  };
}
