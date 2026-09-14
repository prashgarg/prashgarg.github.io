import {
  datasets,
  library,
  pageMeta,
  papers,
  talks,
  TOPIC_TAGS,
  topicForTalk,
  topicsForPaper,
  type Paper,
  type Talk,
} from '../data/site';

export type SearchKind = 'paper' | 'talk' | 'dataset' | 'page' | 'library';

export interface SearchRecord {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  /** Searchable text is kept separate so the renderer never needs HTML. */
  searchText: string;
  external?: boolean;
}

const slugPart = (value: string): string => fold(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Stable DOM/hash target shared by the Talks page and Find results. */
export function talkAnchor(talk: Pick<Talk, 'year' | 'date' | 'venue' | 'location' | 'title'>): string {
  return ['talk', talk.year, talk.date, talk.venue, talk.location, talk.title]
    .filter(Boolean)
    .map(value => slugPart(String(value)))
    .join('-');
}

const fold = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const paperText = (paper: Paper): string => [
  paper.title,
  paper.venue,
  paper.year,
  paper.status,
  ...paper.coauthors,
  paper.blurb,
  paper.tldr,
  ...paper.links.map(link => link.label),
  ...topicsForPaper(paper).flatMap(tag => [tag, TOPIC_TAGS.find(item => item.slug === tag)?.label ?? tag]),
].map(fold).join(' ');

const talkText = (talk: Talk): string => {
  const topic = topicForTalk(talk.title);
  return [talk.title, talk.venue, talk.location, talk.date, talk.year, topic.label].map(fold).join(' ');
};

/**
 * One small, shared index for every search surface. Keep result hrefs stable
 * and same-origin where there is a useful page to land on; the dialog handles
 * external dataset destinations separately.
 */
export const searchIndex: SearchRecord[] = [
  ...(['index', 'research', 'talks', 'library', 'now', 'cv'] as const).map(id => ({
    id: `page-${id}`,
    kind: 'page' as const,
    title: pageMeta[id].title,
    subtitle: 'Page',
    href: id === 'index' ? '/' : `/${id}`,
    searchText: fold(`${pageMeta[id].title} ${pageMeta[id].description} ${id}`),
  })),
  ...papers.map(paper => ({
    id: `paper-${paper.slug}`,
    kind: 'paper' as const,
    title: paper.title,
    subtitle: [paper.venue, paper.year, paper.coauthors.length ? `with ${paper.coauthors.join(', ')}` : ''].filter(Boolean).join(' · '),
    href: `/research/${paper.slug}`,
    searchText: paperText(paper),
  })),
  ...talks.map((talk, index) => ({
    id: `talk-${index}`,
    kind: 'talk' as const,
    title: talk.title || talk.venue,
    subtitle: [talk.venue, talk.location, talk.date].filter(Boolean).join(' · '),
    href: `/talks#${talkAnchor(talk)}`,
    searchText: talkText(talk),
  })),
  ...datasets.map(dataset => ({
    id: `dataset-${fold(dataset.name).replace(/[^a-z0-9]+/g, '-')}`,
    kind: 'dataset' as const,
    title: dataset.name,
    subtitle: `Open data${dataset.with.length ? ` · with ${dataset.with.join(', ')}` : ''}`,
    href: dataset.links[0]?.url || '/library#data',
    external: Boolean(dataset.links[0]?.url),
    searchText: fold([dataset.name, dataset.blurb, ...dataset.with, dataset.paperSlug].join(' ')),
  })),
  ...library.map(item => ({
    id: `library-${item.slug}`,
    kind: 'library' as const,
    title: item.title,
    subtitle: item.tag,
    href: `/library#${item.slug}`,
    searchText: fold([item.title, item.tag, ...item.blurb, ...item.links.map(link => link.label)].join(' ')),
  })),
];

const tokenise = (query: string): string[] => fold(query).split(/[^a-z0-9]+/).filter(token => token.length > 0);

/** Return ranked results; all query tokens must occur somewhere useful. */
export function searchSite(query: string, limit = 12, records = searchIndex): SearchRecord[] {
  const tokens = tokenise(query);
  if (!tokens.length) {
    return records
      .filter(record => record.kind === 'page' || record.kind === 'paper')
      .slice(0, limit);
  }

  return records
    .map((record, sourceIndex) => {
      const title = fold(record.title);
      const subtitle = fold(record.subtitle);
      const text = record.searchText;
      let score = 0;
      for (const token of tokens) {
        if (title === token) score += 120;
        else if (title.startsWith(token)) score += 80;
        else if (title.includes(token)) score += 54;
        else if (subtitle.includes(token)) score += 30;
        else if (text.includes(token)) score += 12;
        else return { record, score: -1, sourceIndex };
      }
      // Prefer a result whose title contains the complete query phrase.
      if (title.includes(fold(query).trim())) score += 45;
      if (record.kind === 'paper') score += 2;
      return { record, score, sourceIndex };
    })
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex)
    .slice(0, limit)
    .map(item => item.record);
}
