// G40: per-paper citation counts as indexed by OpenAlex, fetched at
// build time and cached here (no client-side API calls).
//
// IMPORTANT — why this is per-paper and not an author total:
// OpenAlex conflates this Prashant Garg's profile with an unrelated
// ophthalmologist (L V Prasad Eye Institute), so the author-level
// "works_count"/"cited_by_count" (~299/8500) is wrong. These counts are
// matched to the economist's OWN works by DOI/title and are therefore
// accurate but conservative (OpenAlex undercounts very recent preprints).
// Google Scholar is the authoritative source — see site.scholar.
//
// Refresh: re-run scripts/fetch-citations.mjs and paste the result.
export const citationsAsOf = '2026-06';
export const citationSource = 'OpenAlex (indexed; per-work)';
export const citationsByPaper: Record<string, number> = {
  'political-expression-academics': 2,
  'causal-claims-economics': 6,
  'ai-production-networks': 8,
  'platform-migration': 1,
};
