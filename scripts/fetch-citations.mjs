// G40: refresh per-paper citation counts from OpenAlex.
// Matches the economist's OWN works by DOI/title (the author profile is
// conflated with an unrelated ophthalmologist — never use the total).
// Usage: node scripts/fetch-citations.mjs   → prints the citationsByPaper map.
const WORKS = [
  ['political-expression-academics', 'doi', '10.1038/s41562-025-02199-1'],
  ['local-decline-populism', 'doi', '10.1016/j.econlet.2025.112370'],
  ['causal-claims-economics', 'title', 'Causal Claims in Economics'],
  ['ai-production-networks', 'title', 'AI-Generated Production Networks'],
  ['platform-migration', 'title', 'Simple Contagion Drives Population-Scale Platform Migration'],
];
const UA = { headers: { 'User-Agent': 'mailto:prashantgargib@gmail.com' } };
const out = {};
for (const [slug, kind, val] of WORKS) {
  try {
    let cands = [];
    if (kind === 'doi') {
      const r = await fetch(`https://api.openalex.org/works/https://doi.org/${val}`, UA);
      if (r.ok) cands = [await r.json()];
    } else {
      const r = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(val)}&per_page=5`, UA);
      if (r.ok) cands = (await r.json()).results || [];
    }
    const hit = cands.find(c => (c.authorships || []).some(a => /Prashant Garg|Garg Prashant/.test(a.author?.display_name || '')));
    if (hit) { out[slug] = hit.cited_by_count; console.error(`${slug}: ${hit.cited_by_count}`); }
    else console.error(`${slug}: NO MATCH`);
  } catch (e) { console.error(`${slug}: ERR ${e.message}`); }
  await new Promise(r => setTimeout(r, 300));
}
console.log(JSON.stringify(out, null, 2));
