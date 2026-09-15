/**
 * Curated paper figures for the paper pages.
 *
 * The image files are crops of the authors' original published/preprint
 * figures. Keep the short caption and alt text here so the source credit and
 * accessibility text travel with the asset when a paper page is wired up.
 */
export interface PaperFigure {
  src: string;
  caption: string;
  alt?: string;
  source?: string;
  sourceUrl?: string;
}

export const paperFigures: Record<string, PaperFigure[]> = {
  'global-automation-atlas': [
    {
      src: '/images/papers/global-automation-atlas-figure-1.png',
      alt: 'World map and scatter plot showing economically exposed task share across 124 countries and its relationship with GDP per capita.',
      caption: 'Automation exposure rises with income, but countries at similar income levels still differ substantially.',
      source: 'Figure 1, Global Automation Atlas',
      sourceUrl: 'https://automationatlas.org/downloads/automation-atlas-paper.pdf',
    },
  ],
  'causal-claims-economics': [
    {
      src: '/images/papers/causal-claims-figure-2.png',
      alt: 'Two-panel chart showing the average proportion of causal edges rising over time and increasing across economics fields after 2000.',
      caption: 'The average share of causal edges rises from 7.7% in 1990 to 31.7% in 2020, with increases across fields.',
      source: 'Figure 2, Causal Claims in Economics',
      sourceUrl: 'https://arxiv.org/pdf/2501.06873',
    },
  ],
};

