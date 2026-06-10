export const site = {
  name: 'Prashant Garg',
  tagline:
    'Economist working on science, innovation, production, and media using machine learning, causal inference, and network science.',
  email: 'prashant.garg@imperial.ac.uk',
  cv: 'https://drive.google.com/file/d/1loWtmOeOwDtSSJ2WHKf7n_PzpQiP6rgF/view?usp=drive_link',
  scholar: 'https://scholar.google.com/citations?hl=en&user=C3o_l0IAAAAJ',
  twitter: 'https://x.com/Prashant_Garg_',
  twitterHandle: '@Prashant_Garg_',
  bluesky: 'https://bsky.app/profile/prashantgarg.bsky.social',
  blueskyHandle: '@prashantgarg.bsky.social',
  github: 'https://github.com/prashgarg',
};

export const affiliations = [
  {
    role: 'Research Associate',
    org: 'University of Cambridge',
    url: 'https://www.econ.cam.ac.uk/',
    current: true,
  },
  {
    role: 'Associate Fellow',
    org: 'INET Oxford',
    url: 'https://www.inet.ox.ac.uk/',
    current: true,
  },
  {
    role: 'PhD Economics',
    org: 'Imperial College London',
    url: 'https://www.imperial.ac.uk/business-school/faculty-research/academic-areas/economics-public-policy/',
    current: false,
  },
  {
    role: 'Postdoctoral Researcher (from Sept 2026)',
    org: 'Bocconi University',
    url: 'https://www.unibocconi.it/en',
    incoming: true,
  },
];

export type PaperStatus = 'published' | 'accepted' | 'working' | 'rr' | 'other';

export interface PaperLink { label: string; url: string }
export interface Coverage { outlet: string; url: string }

export interface Paper {
  slug: string;
  title: string;
  status: PaperStatus;
  venue?: string;
  year?: number;
  coauthors: string[];
  blurb: string;
  links: PaperLink[];
  coverage?: Coverage[];
  tools?: string[];
}

export const papers: Paper[] = [
  {
    slug: 'political-expression-academics',
    title: 'Political Expression of Academics on Twitter',
    status: 'published',
    venue: 'Nature Human Behaviour',
    year: 2025,
    coauthors: ['Thiemo Fetzer'],
    blurb:
      "Academics have traditionally played a vital role in both the generation and dissemination of knowledge, ideas and narratives. Social media, relative to traditional media, provides for new and more direct ways of science communication. Yet, since not all academics may engage with social media, the sample that does so may have an outsize influence on shaping public perceptions of academia more broadly through at least two channels: the set topics they engage with and through the particular style and tone of communication. This paper describes patterns in academics' expression online found in a newly constructed global dataset covering over 100,000 scholars linking their social media content to academic record. We document large and systematic variation in politically salient academic expression concerning climate action, cultural, and economic concepts. We show that these appear to often diverge from general public opinion in both topic focus and style.",
    links: [
      { label: 'Paper (open access)', url: 'https://www.nature.com/articles/s41562-025-02199-1' },
      { label: 'Project site', url: 'https://sites.google.com/view/politics-in-academia/' },
      { label: 'Twitter thread', url: 'https://twitter.com/Prashant_Garg_/status/1803353773697335514' },
      { label: 'Backstory', url: 'https://communities.springernature.com/posts/political-expression-of-academics-on-twitter' },
    ],
    coverage: [
      { outlet: 'Marginal Revolution', url: 'https://marginalrevolution.com/marginalrevolution/2024/06/us-based-academics-and-those-at-top-ranked-institutions-exhibit-higher-egocentrism-and-toxicity-in-their-tweets.html' },
      { outlet: 'Matthew Yglesias', url: 'https://x.com/mattyglesias/status/1808387332543787045' },
      { outlet: 'Noahpinion', url: 'https://www.noahpinion.blog/p/at-least-five-interesting-things-554' },
      { outlet: 'VoxEU', url: 'https://cepr.org/voxeu/columns/political-expression-academics-social-media' },
      { outlet: 'Times Higher Education', url: 'https://www.timeshighereducation.com/news/political-social-media-posts-harm-academics-credibility' },
      { outlet: 'The American Saga', url: 'https://www.theamericansaga.com/' },
    ],
    tools: ['academicexpression'],
  },
  {
    slug: 'local-decline-populism',
    title: 'Local Decline and Populism',
    status: 'published',
    venue: 'Economics Letters',
    year: 2025,
    coauthors: ['Thiemo Fetzer', 'Jacob Edenhofer'],
    blurb:
      "Support for right-wing populist parties is characterised by considerable regional heterogeneity and especially concentrated in regions that have experienced economic decline. It remains unclear, however, whether the spatial externalities of local decline, including homelessness and crime, boost support for populist parties, even among those not directly affected by such decline. In this paper, we contribute to filling this gap in two ways. First, we gather novel data on a particularly visible form of local decline, high-street vacancies, that comprise 83,000 premises in England and Wales. Second, we investigate the influence of local decline on support for the right-wing populist UK Independence Party (UKIP) between 2009 and 2019. We find a significant positive association between high-street vacancy rates and UKIP support. These results enhance our understanding of how changes in the lived environment shape political preferences and behaviour, particularly in relation to right-wing populism.",
    links: [
      { label: 'Paper (open access)', url: 'https://www.sciencedirect.com/science/article/pii/S0165176525001971' },
      { label: 'Twitter thread', url: 'https://twitter.com/edenhofer_jacob/status/1816157318255644977' },
    ],
    coverage: [
      { outlet: 'The Guardian', url: 'https://www.theguardian.com/' },
      { outlet: 'FAZ', url: 'https://www.faz.net/' },
      { outlet: 'LSE Business Review', url: 'https://blogs.lse.ac.uk/businessreview/' },
      { outlet: 'The Conversation', url: 'https://theconversation.com/' },
      { outlet: 'VoxEU', url: 'https://cepr.org/voxeu' },
      { outlet: 'CAGE', url: 'https://warwick.ac.uk/fac/soc/economics/research/centres/cage/' },
    ],
  },
  {
    slug: 'cross-border-media-disasters',
    title: 'Network Determinants of Cross-Border Media Coverage of Natural Disasters',
    status: 'accepted',
    venue: 'Nature Human Behaviour (Acceptance-in-Principle)',
    coauthors: ['Thiemo Fetzer'],
    blurb:
      "Climate change is increasing the frequency and severity of natural disasters worldwide. Media coverage of these events may be vital to generate empathy and mobilize global populations to address the common threat posed by climate change. Using a dataset of 466 news sources from 123 countries, covering 135 million news articles since 2016, we apply an event study framework to measure cross-border media activity following natural disasters. Our results shows that while media attention rises after disasters, it is heavily skewed towards certain events, notably earthquakes, accidents, and wildfires. In contrast, climatologically salient events such as floods, droughts, or extreme temperatures receive less coverage. This cross-border disaster reporting is strongly related to the number of deaths associated with the event, especially when the affected populations share strong social ties or genetic similarities with those in the reporting country. Achieving more balanced media coverage across different types of natural disasters may be essential to counteract skewed perceptions. Further, fostering closer social connections between countries may enhance empathy and mobilize the resources necessary to confront the global threat of climate change.",
    links: [
      { label: 'Preprint', url: 'https://www.researchsquare.com/article/rs-6057848/v1' },
    ],
  },
  {
    slug: 'global-automation-atlas',
    title: 'Global Automation Atlas',
    status: 'working',
    coauthors: ['Tommaso Crosta', 'Jasmin Baier'],
    blurb:
      "Automation affects the labour content of work differently across different contexts. Yet, most existing exposure measures assign fixed scores to tasks or occupations, limiting comparisons of automation exposure across countries. We develop a task-based and country-specific approach to classify automation exposure across the world to disentangle labor-substituting from labor-augmenting automation, the relevant technology channel, and the material role of AI. Our measure spans 124 countries, generating an atlas of 2.33 million task-country labels for economies covering 99% of world population and GDP. We present five descriptive results. First, exposure is highly uneven, ranging from 3.3% of tasks in South Sudan to 61.6% in China, and rises strongly with income, although substantial variation remains within income groups. Second, across countries, exposed tasks are skewed towards substitution rather than augmentation, but low-income countries are disproportionately exposed to substitution, whereas middle-income countries are more heterogeneous. Third, less technologically advanced forms of automation account for more than half of exposed tasks in low-income countries but about one quarter in high-income countries; while other more complex channels generally rise with income levels. Fourth, AI tends to be less prevalent in simpler channels of automation, but also more prevalent in labour-substituting margins in lower income settings and to augment labour in higher income settings. Fifth, we find that females seem to be disproportionately more exposed to labour-substituting automation than males. Our methodology provides a basis for comparing automation exposure across development stages, linking it with cross-country data and allowing us to treat exposure levels, labour margins, technological channels and AI involvement as separate dimensions.",
    links: [
      { label: 'Live paper', url: 'https://automationatlas.org/paper/' },
      { label: 'Interactive explorer', url: 'https://automationatlas.org/' },
    ],
    tools: ['automationatlas'],
  },
  {
    slug: 'causal-claims-economics',
    title: 'Causal Claims in Economics',
    status: 'working',
    coauthors: ['Thiemo Fetzer'],
    blurb:
      "As economics scales, a key bottleneck is representing what papers claim in a comparable, aggregable form. We introduce evidence-annotated claim graphs that map each paper into a directed network of standardized economic concepts (nodes) and stated relationships (edges), with each edge labeled by evidentiary basis, including whether it is supported by causal inference designs or by non-causal evidence. Using a structured multi-stage AI workflow, we construct claim graphs for 44,852 economics papers from 1980–2023. The share of causal edges rises from 7.7% in 1990 to 31.7% in 2020. Measures of causal narrative structure and causal novelty are positively associated with top-five publication and long-run citations, whereas non-causal counterparts are weakly related or negative.",
    links: [
      { label: 'Paper', url: 'https://arxiv.org/abs/2501.06873' },
      { label: 'Project site', url: 'https://www.causal.claims' },
      { label: 'Open data', url: 'https://drive.google.com/drive/folders/1JY3OpICSjvaG__6pJYcEtdovuN_t5-Ba?usp=drive_link' },
      { label: 'GitHub', url: 'https://github.com/prashgarg/CausalClaimsInEconomics' },
      { label: 'VoxEU summary', url: 'https://cepr.org/voxeu/columns/causal-claims-economics' },
      { label: 'Methods guide', url: 'https://cepr.org/voxeu/columns/leveraging-large-language-models-large-scale-information-retrieval-economics' },
      { label: 'Twitter thread', url: 'https://x.com/Prashant_Garg_/status/1853392260257182152' },
    ],
    coverage: [
      { outlet: 'The Economist', url: 'https://www.economist.com/' },
      { outlet: 'Marginal Revolution', url: 'https://marginalrevolution.com/' },
      { outlet: 'Noahpinion', url: 'https://www.noahpinion.blog/' },
      { outlet: 'World Bank', url: 'https://www.worldbank.org/' },
      { outlet: 'VoxEU', url: 'https://cepr.org/voxeu' },
      { outlet: 'VoxDev', url: 'https://voxdev.org/' },
      { outlet: 'Australian Treasury', url: 'https://treasury.gov.au/' },
      { outlet: 'Nada es Gratis', url: 'https://nadaesgratis.es/' },
    ],
    tools: ['causalclaims'],
  },
  {
    slug: 'what-should-economics-ask-next',
    title: 'What Should Economics Ask Next?',
    status: 'working',
    coauthors: [],
    blurb:
      "Choosing what to work on is one of the least formalized decisions in science. I study whether the local structure of past research helps screen which still-open questions are worth reading first. I build a directed literature graph from 242,595 published economics-facing papers from 1976 to 2026, rank open questions using only the literature available at each date, and test those rankings against which questions later enter published work. On realistic shortlists, graph-based screening outperforms ranking by popularity alone, and a second-stage model built on the same graph improves further. The gains differ across two broad kinds of question. Questions that deepen existing claims with clearer mechanisms produce more later realizations per inspected shortlist, while questions that close missing direct relations cover a larger share of the links the literature eventually adds. More broadly, the historical record suggests that economics more often adds mechanisms around existing claims than closes locally implied direct relations. The paper therefore contributes in two ways. Practically, it shows that local literature structure contains useful screening information. Descriptively, it uses that screen to characterize how economics more often moves.",
    links: [
      { label: 'Live paper', url: 'https://frontiergraph.com/paper/' },
      { label: 'Frontier Graph', url: 'https://frontiergraph.com/' },
    ],
    coverage: [
      { outlet: 'Marginal Revolution', url: 'https://marginalrevolution.com/' },
    ],
    tools: ['frontiergraph'],
  },
  {
    slug: 'politicized-scientists',
    title: 'Politicized Scientists: Credibility Cost of Political Expression on Twitter',
    status: 'working',
    coauthors: ['Eleonora Alabrese', 'Francesco Capozza'],
    blurb:
      "As social media becomes prominent within academia, we examine its reputational costs for academics. Analyzing Twitter posts from 98,000 scientists (2016–22), we uncover substantial political expression. Online experiments with 6,000 U.S. respondents and 135 journalists, rating synthetic academic profiles with different political affiliations, reveal that politically neutral scientists are seen as the most credible. Strikingly, political expressions result in monotonic penalties: Stronger posts reduce perceived credibility of scientists and their research and audience engagement more, particularly among oppositely aligned respondents. Two surveys with scientists highlight their awareness to penalties, their perceived benefits, and a consensus on limiting political expression outside their expertise.",
    links: [
      { label: 'Preprint', url: 'https://www.researchsquare.com/article/rs-9354892/v1' },
      { label: 'CESifo working paper', url: 'https://www.cesifo.org/en/publications/2024/working-paper/politicized-scientists-credibility-cost-political-expression' },
      { label: 'Twitter thread', url: 'https://twitter.com/EleAla/status/1821124625616474165' },
    ],
    coverage: [
      { outlet: 'Times Higher Education', url: 'https://www.timeshighereducation.com/' },
      { outlet: 'University of Bath', url: 'https://www.bath.ac.uk/announcements/political-posts-on-x-could-harm-academics-credibility-new-study-finds/' },
      { outlet: 'The American Saga', url: 'https://www.theamericansaga.com/' },
    ],
    tools: ['academicexpression'],
  },
  {
    slug: 'ai-production-networks',
    title: 'AI-Generated Production Networks: Measurement and Applications to Global Trade',
    status: 'working',
    coauthors: ['Thiemo Fetzer', 'Peter John Lambert', 'Bennet Feld'],
    blurb:
      "This paper leverages generative AI to build a network structure over 5,000 product nodes, where directed edges represent input-output relationships in production. We layout a two-step 'build-prune' approach using an ensemble of prompt-tuned generative AI classifications. The 'build' step provides an initial distribution of edge predictions, the 'prune' step then re-evaluates all edges. With our AI-generated Production Network (AIPNET) in toe, we document a host of shifts in the network position of products and countries during the 21st century. Finally, we study production network spillovers using the natural experiment presented by the 2017 blockade of Qatar. We find strong evidence of such spill-overs, suggestive of on-shoring of critical production. This descriptive and causal evidence demonstrates some of the many research possibilities opened up by our granular measurement of product linkages, including studies of on-shoring, industrial policy, and other recent shifts in global trade.",
    links: [
      { label: 'Paper (CEPR DP19708)', url: 'https://cepr.org/publications/dp19708' },
      { label: 'Interactive site', url: 'https://aipnet.io/' },
      { label: 'Twitter thread', url: 'https://twitter.com/Prashant_Garg_/status/1858799879557890189' },
    ],
    coverage: [
      { outlet: 'VoxEU', url: 'https://cepr.org/voxeu' },
      { outlet: 'SCMP interview', url: 'https://www.scmp.com/' },
      { outlet: 'The Ecologist', url: 'https://theecologist.org/' },
    ],
    tools: ['aipnet'],
  },
  {
    slug: 'platform-migration',
    title: 'Simple Contagion Drives Population-Scale Platform Migration',
    status: 'working',
    coauthors: ['Dorian Quelle', 'Frederic Denker', 'Alexandre Bovet'],
    blurb:
      "Social media platforms mediate professional communication, political expression, and community formation, making the rare instances when users collectively abandon an incumbent platform particularly consequential. Strong network effects raise switching costs and strengthen incumbents' positions, making coordinated exit difficult. Here we link 276,431 scholars on Twitter/X to their respective new profiles among the universe of all 16.7 million Bluesky accounts, tracked from January 2023 to December 2024, using a scalable, high-precision cross-platform matching pipeline. Exploiting exogenous variation from Brazil's court-ordered suspension of Twitter/X and a dynamic matching design, we show that adoption is peer-driven, treatment effects are short-lived and dose-dependent, and contagion is simple, not complex. Three patterns characterize adoption and retention. Adoption concentrates among users deeply embedded in Twitter's social graph. Public political expression predicts migration, consistent with homophilous inflows into a largely left-of-center Bluesky information space. Early reconnection with prior contacts predicts longer tenure and engagement. Our findings provide the first population-scale causal evidence of peer influence in a social media platform migration by exploiting exogenous exposure variation in a natural experiment and using daily dynamic matching. Rather than the complex contagion mechanism often emphasized in the literature, contagion is predominantly simple. Our findings recast migration as a multi-homing strategy that insures against governance uncertainty and show that users who quickly reconnect with prior contacts remain active longer on Bluesky.",
    links: [
      { label: 'Paper', url: 'https://arxiv.org/abs/2505.24801' },
    ],
    coverage: [
      { outlet: 'Clarivate', url: 'https://clarivate.com/' },
      { outlet: 'Cybernews', url: 'https://cybernews.com/' },
      { outlet: 'Aporia Magazine', url: 'https://www.aporiamagazine.com/' },
    ],
  },
  {
    slug: 'health-shocks-research',
    title: '(How) Do Health Shocks Reallocate Research Direction?',
    status: 'working',
    coauthors: ['Hongyu Zhou', 'Thiemo Fetzer'],
    blurb:
      "We examine whether research systems reallocate scientific effort as health needs change. We assemble a global disease-location panel for 204 countries and territories (1990-2021) by linking disease-specific publication output to disease burden in the same place and year. Using large language models, we extract diseases from article text, map them into a standardized disease classification, and classify research funders by type. Empirically, we estimate how publication output co-moves with disease burden within countries and diseases over time, and we use event-study difference-in-differences designs that exploit plausibly exogenous variation from the timing of outbreak alerts. We find that responsiveness to endemic burden has increased over time but remains highly uneven across locations; outbreak alerts trigger rapid, statistically significant research surges that have strengthened in recent years; and funding composition is strongly associated with adjustment dynamics, with philanthropic and government-supported research contributing disproportionately to responsiveness growth in lower-income settings.",
    links: [
      { label: 'Paper (CEPR DP21230)', url: 'https://cepr.org/publications/dp21230' },
    ],
  },
  {
    slug: 'ai-health-advice',
    title: 'AI Health Advice Accuracy Varies Across Languages and Contexts',
    status: 'rr',
    venue: 'BMJ Health & Care Informatics (R&R)',
    coauthors: ['Thiemo Fetzer'],
    blurb:
      "Using basic health statements authorized by UK and EU registers and ~9,100 journalist-vetted public-health assertions on topics such as abortion, COVID-19 and politics from sources ranging from peer-reviewed journals and government advisories to social media and news across the political spectrum, we benchmark seven leading large language models in 21 languages. We find that, despite high accuracy on English-centric textbook claims, performance falls in multiple non-European languages and fluctuates by topic and source. This highlights the urgency of comprehensive multilingual, domain-aware validation before deploying AI in global health communication.",
    links: [
      { label: 'Preprint', url: 'https://www.researchsquare.com/article/rs-7460273/v1' },
    ],
  },
  {
    slug: 'mapping-dylans-mind',
    title: 'Mapping Bob Dylan’s Mind',
    status: 'other',
    venue: 'Aeon · arXiv',
    coauthors: [],
    blurb:
      "For six decades, Bob Dylan has challenged listeners with songs that reward interpretation. Critics and fans have long pored over his words, treating them as literary texts worthy of a slow, devotional reading, line by line, image by image. In 2016, Dylan even won the Nobel Prize in Literature. As the Swedish Academy put it, the prize honoured him for 'having created new poetic expressions within the great American song tradition'. But what more might we discover if, instead of a human scholar, we asked an artificial intelligence to sift through every word Dylan ever wrote? What patterns, connections or evolution in Dylan's massive body of lyrics might reveal themselves to a machine's analysis, and what could that tell us about the man and his music?",
    links: [
      { label: 'Aeon essay', url: 'https://aeon.co/essays/can-ai-tell-us-anything-meaningful-about-bob-dylans-songs' },
      { label: 'Technical paper', url: 'https://arxiv.org/abs/2502.01772' },
      { label: 'Twitter thread', url: 'https://x.com/Prashant_Garg_/status/1887097154696564917' },
      { label: 'Bluesky thread', url: 'https://bsky.app/profile/prashantgarg.bsky.social/post/3lhggu2tcas2e' },
    ],
    coverage: [
      { outlet: 'Financial Times', url: 'https://www.ft.com/' },
    ],
    tools: ['dylan'],
  },
];

export const statusMeta: Record<PaperStatus, { label: string; badge: string }> = {
  published: { label: 'Published', badge: 'badge-red' },
  accepted:  { label: 'Accepted',  badge: 'badge-blue' },
  rr:        { label: 'R&R',       badge: 'badge-yellow' },
  working:   { label: 'Working',   badge: 'badge-cream' },
  other:     { label: 'Essay',     badge: 'badge-teal' },
};

export interface Tool {
  slug: string;
  name: string;
  url: string;
  blurb: string;
  longBlurb: string;
  paperSlug?: string;
  accent: 'red' | 'yellow' | 'blue' | 'teal' | 'purple';
}

export const tools: Tool[] = [
  {
    slug: 'causalclaims',
    name: 'Causal Claims',
    url: 'https://www.causal.claims',
    blurb: 'A claim graph over 44,852 economics papers.',
    longBlurb:
      'Browse causal and non-causal relationships extracted from four decades of economics. Filter by field, search a concept, follow the graph from one claim to its neighbours.',
    paperSlug: 'causal-claims-economics',
    accent: 'red',
  },
  {
    slug: 'frontiergraph',
    name: 'Frontier Graph',
    url: 'https://frontiergraph.com',
    blurb: 'Ranking the open questions in economics.',
    longBlurb:
      'A literature graph of 242,595 papers (1976–2026). Predicts which open questions get pursued next, surfaces frontier topics, and lets you explore the structure of the discipline.',
    paperSlug: 'what-should-economics-ask-next',
    accent: 'blue',
  },
  {
    slug: 'automationatlas',
    name: 'Global Automation Atlas',
    url: 'https://automationatlas.org',
    blurb: 'Country-specific automation exposure across 124 countries.',
    longBlurb:
      'Task-based exposure measures separating labor-substituting from labor-augmenting automation. 2.33M task–country labels covering ~99% of global GDP. Choropleth maps, occupation views, and full open data.',
    paperSlug: 'global-automation-atlas',
    accent: 'yellow',
  },
  {
    slug: 'aipnet',
    name: 'AI Production Network',
    url: 'https://aipnet.io',
    blurb: '5,000 products, mapped end-to-end.',
    longBlurb:
      'A product-to-product input–output network built with generative AI. Interactive viewer with full data download; used in our work on the 2017 Qatar blockade.',
    paperSlug: 'ai-production-networks',
    accent: 'teal',
  },
  {
    slug: 'academicexpression',
    name: 'Academic Expression Online',
    url: 'https://www.academicexpression.online',
    blurb: '100,000+ academics, their voices on social media.',
    longBlurb:
      'The companion site for Political Expression of Academics on Twitter and Politicized Scientists. Filters by field, country, and topic; lets you see how scholars actually speak online.',
    paperSlug: 'political-expression-academics',
    accent: 'purple',
  },
];

export interface Talk {
  title: string;
  venue: string;
  location: string;
  date: string;
  year: number;
  url?: string;
}

export const talks: Talk[] = [
  // 2026
  { year: 2026, title: 'What Should Economics Ask Next?', venue: 'MPWZ–CEPR Text-as-Data', location: 'Virtual', date: '13–14 Apr 2026', url: 'https://cepr.org' },
  { year: 2026, title: 'Causal Claims in Economics', venue: 'MIT FutureTech Seminar', location: 'Virtual', date: '12 Mar 2026', url: 'https://futuretech.mit.edu/' },
  { year: 2026, title: 'AI-Generated Production Networks', venue: 'CMA Seminar', location: 'London', date: '20 Jan 2026', url: 'https://www.gov.uk/government/collections/microeconomics-unit-research' },
  { year: 2026, title: 'AI-Generated Production Networks', venue: 'U.S. International Trade Commission', location: 'Virtual', date: '15 Jan 2026', url: 'https://www.usitc.gov/research_and_analysis/office_economics.htm' },

  // 2025
  { year: 2025, title: 'Causal Claims in Economics', venue: 'CEPR Paris Symposium — Growth Programme', location: 'Paris', date: '5–8 Dec 2025', url: 'https://cepr.org/events/event-series/cepr-paris-symposium/cepr-paris-symposium-2025' },
  { year: 2025, title: 'Chatting About Innovation', venue: 'Long-Run Productivity Conference', location: 'Cambridge', date: '20 Nov 2025', url: 'https://cepr.org/events/long-run-productivity-conference' },
  { year: 2025, title: 'Conspiratorial Thinking', venue: 'AYEW Big Data/ML Workshop', location: 'Virtual', date: '12 Nov 2025', url: 'https://www.monash.edu/business/impact-labs/soda-labs/our-events/applied-young-economists' },
  { year: 2025, title: 'Politicized Scientists', venue: 'Imperial Finance Seminar', location: 'London', date: '11 Nov 2025', url: 'https://www.imperial.ac.uk/business-school/faculty-research/academic-areas/finance/' },
  { year: 2025, title: 'Politicized Scientists', venue: 'Oxford Behavioural Group Seminar', location: 'Oxford', date: '7 Nov 2025', url: 'https://www.economics.ox.ac.uk/' },
  { year: 2025, title: 'Retrieving and Generating Data using LLMs', venue: 'C-SEB / ECONtribute Mini Course', location: 'Cologne', date: '28 Oct 2025', url: 'https://econtribute.de/event/econtribute-c-seb-mini-course-with-prashant-garg-imperial-college-business-school-london/' },
  { year: 2025, title: 'Politicized Scientists', venue: 'University of Cologne Seminar', location: 'Cologne', date: '28 Oct 2025', url: 'https://www.uni-koeln.de/en/' },
  { year: 2025, title: 'Conspiratorial Thinking', venue: 'CESifo Area Conference on Behavioural Economics', location: 'Munich', date: '24–25 Oct 2025', url: 'https://www.ifo.de/en/cesifo/event/2025-10-24/cesifo-area-conference-behavioral-economics-2025' },
  { year: 2025, title: 'Cross-Border Enforcement and Product Innovation', venue: 'Imperial Economics Seminar', location: 'London', date: '9 Oct 2025', url: 'https://www.imperial.ac.uk/business-school/faculty-research/academic-areas/economics-public-policy/' },
  { year: 2025, title: 'Chatting About Innovation', venue: 'LSE POID/PRINZ Seminar', location: 'London', date: '30 Sep 2025', url: 'https://poid.lse.ac.uk/events/prinz-seminars.asp' },
  { year: 2025, title: 'Conspiratorial Thinking', venue: 'MPWZ–CEPR Text-as-Data', location: 'Virtual', date: '15–16 Sep 2025', url: 'https://cepr.org/events/10th-monash-paris-warwick-zurich-cepr-text-data-workshop' },
  { year: 2025, title: 'Geography of Medical Knowledge', venue: 'LSE QueerConf', location: 'London', date: '15 Aug 2025' },
  { year: 2025, title: 'Retrieving and Generating Data using LLMs', venue: 'Public Governance Workshop, PSL', location: 'Virtual', date: '7 Jul 2025', url: 'https://acss-dig.psl.eu/fr/seminaires/public-governance' },
  { year: 2025, title: 'AI-Generated Production Networks', venue: 'RES Annual Conference', location: 'Birmingham', date: '1–2 Jul 2025', url: 'https://res.org.uk/event-listing/res-2025-annual-conference/' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'Metascience 2025', location: 'London', date: '30 Jun 2025', url: 'https://metascience.info/' },
  { year: 2025, title: 'Cross-Border Enforcement and Product Innovation', venue: 'Imperial Economics Seminar', location: 'London', date: '19 Jun 2025', url: 'https://www.imperial.ac.uk/business-school/faculty-research/academic-areas/economics-public-policy/' },
  { year: 2025, title: 'Political Expression of Academics on Twitter', venue: 'Text as Data in Behavioural Economics', location: 'Potsdam', date: '10–11 Jun 2025', url: 'https://sites.google.com/view/text-as-data-workshop/home' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'Networks in Science of Science', location: 'Maastricht', date: '2–6 Jun 2025', url: 'https://netscisci.github.io/papers' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'EAYE Annual Meeting', location: 'London', date: '29–31 May 2025' },
  { year: 2025, title: 'AI-Generated Production Networks · LLMs Workshop', venue: 'University of Groningen', location: 'Groningen', date: '27 May 2025', url: 'https://www.rug.nl/bachelors/economics-and-business-economics/?lang=en' },
  { year: 2025, title: 'Causal ML & Text-as-Data Roundtable', venue: 'AYEW', location: 'Virtual', date: '21 May 2025', url: 'https://www.monash.edu/business/impact-labs/soda-labs/our-events/applied-young-economists' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'ZBW Seminar', location: 'Hamburg', date: '20 May 2025', url: 'https://www.zbw.eu/en/' },
  { year: 2025, title: 'Network Determinants of Cross-Border Media Coverage of Natural Disasters', venue: 'LSE–IGC Environmental Populism Conference', location: 'London', date: '15–16 May 2025' },
  { year: 2025, title: 'Network Determinants of Cross-Border Media Coverage of Natural Disasters', venue: 'Economics of Media Bias Workshop', location: 'Frankfurt', date: '8–9 May 2025', url: 'https://mediabiasworkshop.org/event/8th-economics-of-media-bias-workshop/' },
  { year: 2025, title: 'Retrieving and Generating Data using LLMs in Python', venue: 'Workshop for Ukraine (charity)', location: 'Virtual', date: '8 May 2025', url: 'https://sites.google.com/view/dariia-mykhailyshyna/main/r-workshops-for-ukraine' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'MPWZ–CEPR Text-as-Data', location: 'Virtual', date: '28–29 Apr 2025', url: 'https://cepr.org/events/9th-monash-paris-warwick-zurich-cepr-text-data-workshop' },
  { year: 2025, title: 'Network Determinants of Cross-Border Media Coverage of Natural Disasters', venue: 'AERE @ OSWEET', location: 'Virtual', date: '11 Apr 2025', url: 'https://www.aere.org/osweet-paper-sessions' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'PolMeth Europe', location: 'London', date: '7–8 Apr 2025', url: 'https://polmeth.eu/' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'Text-as-Data (TaDa) Seminar', location: 'Virtual', date: '13 Mar 2025', url: 'https://sites.google.com/view/polsci-ml-initiative/talks' },
  { year: 2025, title: 'AI-Generated Production Networks', venue: 'OECD Trade Seminar', location: 'Virtual', date: '3 Mar 2025', url: 'https://www.oecd.org/en/about/directorates/trade-and-agriculture-directorate.html' },
  { year: 2025, title: 'AI-Generated Production Networks', venue: 'HM Treasury', location: 'London', date: 'Feb 2025', url: 'https://www.gov.uk/government/organisations/hm-treasury' },
  { year: 2025, title: 'AI-Generated Production Networks', venue: 'STEG Annual Conference', location: 'Oxford', date: '8–11 Jan 2025', url: 'https://steg.cepr.org/news/steg-annual-conference-2025-university-oxford' },

  // 2024
  { year: 2024, title: 'AI-Generated Production Networks', venue: 'CEPR Paris Symposium', location: 'Paris', date: '12–18 Dec 2024', url: 'https://cepr.org/events/event-series/cepr-paris-symposium/cepr-paris-symposium-2024' },
  { year: 2024, title: 'AI-Generated Production Networks', venue: 'RES PhD Conference', location: 'Portsmouth', date: '4 Dec 2024', url: 'https://res.org.uk/event-listing/res-phd-conference-2024/' },
  { year: 2024, title: 'Causal Claims in Economics', venue: 'Leibniz Open Science Day', location: 'Berlin', date: '25 Nov 2024', url: 'https://www.zbw.eu/de/ueber-uns/veranstaltungen/leibniz-open-science-day' },
  { year: 2024, title: 'AI-Generated Production Networks', venue: 'UniBZ Political Economy Workshop', location: 'Bruneck', date: '18–19 Nov 2024', url: 'https://wspoleco.events.unibz.it/' },
  { year: 2024, title: 'AI-Generated Production Networks', venue: 'AYEW AI/Alternative Data Workshop', location: 'Virtual', date: '6 Nov 2024', url: 'https://x.com/ayew2021/status/1853727725166711047' },
  { year: 2024, title: 'Causal Claims in Economics', venue: 'Causal Data Science Meeting', location: 'Virtual', date: '5–6 Nov 2024', url: 'https://www.causalscience.org/' },
  { year: 2024, title: 'AI-Generated Production Networks', venue: 'Cambridge Janeway Networks Workshop', location: 'Cambridge', date: '25 Oct 2024', url: 'https://www.janeway.econ.cam.ac.uk/event/networks-workshop-prashant-garg-imperial-college-business-school' },
  { year: 2024, title: 'AI-Generated Production Networks', venue: '3rd KIEL–CEPR Conference on Geoeconomics', location: 'Berlin', date: '17–18 Oct 2024', url: 'https://hub.cepr.org/event/4275' },
  { year: 2024, title: 'Causal Claims in Economics', venue: 'Imperial Internal Seminar', location: 'London', date: '10 Oct 2024', url: 'https://www.imperial.ac.uk/business-school/faculty-research/academic-areas/economics-public-policy/' },
  { year: 2024, title: 'Politicized Scientists', venue: 'Advances with Field Experiments (AFE)', location: 'London', date: '5–6 Sep 2024', url: 'https://socialsciences.uchicago.edu/advances-field-experiments-conference-2024' },
  { year: 2024, title: 'AI-Generated Production Networks', venue: 'EUR–CEPR Trade, Geography and IO Workshop', location: 'Amsterdam', date: '25 Aug 2024' },
  { year: 2024, title: 'Who Influences Whom About What?', venue: '7th CESifo Doctoral Workshop on Economics of Digitization', location: 'Munich', date: '13–14 Jun 2024', url: 'https://www.cesifo.org/en/event/2024-06-13/7th-doctoral-workshop-economics-digitization' },
  { year: 2024, title: 'Politicized Scientists', venue: 'QPE Early Career Workshop', location: 'London', date: '16–17 May 2024', url: 'https://sites.google.com/view/kingsqpe/qpe-early-career-workshop' },
  { year: 2024, title: 'Shocking Views on Climate Action', venue: 'Workshop on Political Economy of Environmental Policy', location: 'Stockholm', date: '19 Apr 2024', url: 'https://www.hhs.se/en/about-us/calendar/site-external-events/2024/freece-workshop-2024/' },
  { year: 2024, title: 'Who Influences Whom About What?', venue: 'RES Annual Conference', location: 'Belfast', date: '25–27 Mar 2024', url: 'https://res.org.uk/event-listing/res-2024-annual-conference/' },
  { year: 2024, title: 'Who Influences Whom About What?', venue: 'PhD Workshop in Networks and Political Economy', location: 'Paris', date: '24–25 Jan 2024', url: 'https://ysi.ineteconomics.org/event/phd-workshop-on-networks-and-political-economy-paris-1-pantheon-sorbonne/' },

  // 2023
  { year: 2023, title: 'Who Influences Whom About What?', venue: '2nd Digital Economy Network', location: 'Cambridge', date: '24 Nov 2023', url: 'https://www.bennettinstitute.cam.ac.uk/events/digecon-workshop/' },
  { year: 2023, title: 'Who Influences Whom About What?', venue: 'AYEW AI/Text-as-Data Workshop', location: 'Virtual', date: '1 Nov 2023', url: 'https://bsky.app/profile/ayew.bsky.social/post/3kczysthmod2v' },
  { year: 2023, title: 'Who Influences Whom About What?', venue: '6th MWZ Text-as-Data Workshop', location: 'Virtual', date: '18–19 Sep 2023' },
  { year: 2023, title: 'Who Influences Whom About What?', venue: 'XII IBEO Workshop in Complexity Economics', location: 'Ibeo', date: '21–23 Jun 2023', url: 'https://crenoslef.wixsite.com/ibeo/corte-program-1' },
  { year: 2023, title: 'Who Influences Whom About What?', venue: '5th QMUL Economics and Finance Workshop', location: 'London', date: '25 May 2023' },
  { year: 2023, title: 'Who Influences Whom About What?', venue: 'RES Easter Training School', location: 'Bristol', date: '27–29 Mar 2023', url: 'https://res.org.uk/events/easter-training-school/' },
  { year: 2023, title: 'Who Influences Whom About What?', venue: 'Warwick PhD Conference', location: 'Warwick', date: '13 Jan 2023', url: 'https://warwick.ac.uk/fac/soc/economics/events/2022/6/economics_phd_conference/' },
];

/**
 * Map a talk title to a paper slug (if it presents a paper in `papers`)
 * or to a topic slug (for in-progress projects without a public paper yet).
 */
export interface Topic { slug: string; label: string; paperSlug?: string }

export const topics: Topic[] = [
  { slug: 'causal-claims-economics',          label: 'Causal Claims in Economics',          paperSlug: 'causal-claims-economics' },
  { slug: 'ai-production-networks',           label: 'AI-Generated Production Networks',    paperSlug: 'ai-production-networks' },
  { slug: 'what-should-economics-ask-next',   label: 'What Should Economics Ask Next?',     paperSlug: 'what-should-economics-ask-next' },
  { slug: 'politicized-scientists',           label: 'Politicized Scientists',              paperSlug: 'politicized-scientists' },
  { slug: 'political-expression-academics',   label: 'Political Expression of Academics',   paperSlug: 'political-expression-academics' },
  { slug: 'cross-border-media-disasters',     label: 'Cross-Border Media Coverage of Disasters', paperSlug: 'cross-border-media-disasters' },
  { slug: 'chatting-about-innovation',        label: 'Chatting About Innovation' },
  { slug: 'conspiratorial-thinking',          label: 'Conspiratorial Thinking' },
  { slug: 'llm-tutorial',                     label: 'Retrieving & Generating Data with LLMs' },
  { slug: 'cross-border-enforcement',         label: 'Cross-Border Enforcement and Product Innovation' },
  { slug: 'geography-medical-knowledge',      label: 'Geography of Medical Knowledge' },
  { slug: 'who-influences-whom',              label: 'Who Influences Whom About What?' },
  { slug: 'climate-views',                    label: 'Shocking Views on Climate Action' },
];

// ──────────────────────────────────────────────────────────────────
// Topic tags (broad themes inferred from paper title + blurb keywords)
// Used by the /research page topic-filter chips and the cmdk palette.
// ──────────────────────────────────────────────────────────────────
export const TOPIC_TAGS = [
  { slug: 'ai',         label: 'AI & automation' },
  { slug: 'academia',   label: 'Academia & science' },
  { slug: 'networks',   label: 'Networks' },
  { slug: 'media',      label: 'Media & platforms' },
  { slug: 'health',     label: 'Health' },
  { slug: 'politics',   label: 'Political economy' },
  { slug: 'methods',    label: 'Methods' },
] as const;
export type TopicTag = (typeof TOPIC_TAGS)[number]['slug'];

export function topicsForPaper(p: Paper): TopicTag[] {
  const text = `${p.title} ${p.blurb}`.toLowerCase();
  const tags: TopicTag[] = [];
  if (/\b(ai|llm|automation|automating|machine learning|chatgpt|language model)\b/.test(text)) tags.push('ai');
  if (/\b(academic|academia|scholar|scientist|economics paper|economics scales|publication)\b/.test(text)) tags.push('academia');
  if (/\b(network|graph|production network|citation|claim graph|literature graph)\b/.test(text)) tags.push('networks');
  if (/\b(twitter|bluesky|social media|platform|media coverage)\b/.test(text)) tags.push('media');
  if (/\b(health|medical|covid|disease)\b/.test(text)) tags.push('health');
  if (/\b(populism|populist|political|vote|election|ukip|partisan)\b/.test(text)) tags.push('politics');
  if (/\b(causal|causal inference|instrument|difference-in-differences|regression|empirical|natural experiment)\b/.test(text)) tags.push('methods');
  return tags;
}

export function topicForTalk(title: string): Topic {
  const t = title.toLowerCase();
  if (t.includes('what should economics ask next')) return topics.find(x => x.slug === 'what-should-economics-ask-next')!;
  if (t.includes('causal claims'))                  return topics.find(x => x.slug === 'causal-claims-economics')!;
  if (t.includes('production network'))             return topics.find(x => x.slug === 'ai-production-networks')!;
  if (t.includes('politicized scientists'))         return topics.find(x => x.slug === 'politicized-scientists')!;
  if (t.includes('political expression'))           return topics.find(x => x.slug === 'political-expression-academics')!;
  if (t.includes('cross-border media') || t.includes('network determinants')) return topics.find(x => x.slug === 'cross-border-media-disasters')!;
  if (t.includes('chatting about innovation'))      return topics.find(x => x.slug === 'chatting-about-innovation')!;
  if (t.includes('conspiratorial'))                 return topics.find(x => x.slug === 'conspiratorial-thinking')!;
  if (t.includes('retrieving and generating') || t.includes('llms'))          return topics.find(x => x.slug === 'llm-tutorial')!;
  if (t.includes('cross-border enforcement'))       return topics.find(x => x.slug === 'cross-border-enforcement')!;
  if (t.includes('geography of medical'))           return topics.find(x => x.slug === 'geography-medical-knowledge')!;
  if (t.includes('who influences whom'))            return topics.find(x => x.slug === 'who-influences-whom')!;
  if (t.includes('shocking views') || t.includes('climate action')) return topics.find(x => x.slug === 'climate-views')!;
  // Workshops/roundtables without a single paper title
  return { slug: 'other', label: 'Other talks & workshops' };
}

export interface LibraryItem {
  slug: string;
  title: string;
  blurb: string[];
  links: PaperLink[];
  tag: string;
}

export const library: LibraryItem[] = [
  {
    slug: 'llm-guide',
    title: 'Retrieving and Generating Data using LLMs',
    blurb: [
      "Python code notebooks and slides to use API to access LLMs.",
      "This open-source notebook collection and slides demonstrate two complementary LLM paradigms, retrieval and generation, for turning raw text into structured, research-ready data.",
      "Retrieval notebooks show how to mine large document corpora to extract causal edges, stance labels, demographic attributes and other key fields (e.g., the pipeline powering www.causal.claims).",
      "Generation notebooks start from minimal seed prompts and leverage the model's prior to build production networks, innovation profiles and context-aware keyword dictionaries (see aipnet.io and www.academicexpression.online).",
      "Across both strands you will find hands-on modules for prompt engineering, JSON-schema enforcement, cost-efficient batch calling, embedding-based code mapping (HS6 / JEL) and validation routines such as modal voting and cosine sanity checks.",
      "By the end, users can scale or adapt each workflow — whether analysing messy policy PDFs or constructing supply-chain graphs — while keeping costs predictable and outputs auditable.",
    ],
    tag: 'Code & methods',
    links: [
      { label: 'GitHub repository', url: 'https://github.com/prashgarg/LLM-retrieval-generation' },
      { label: 'VoxEU methods guide', url: 'https://cepr.org/voxeu/columns/leveraging-large-language-models-large-scale-information-retrieval-economics' },
    ],
  },
  {
    slug: 'dylan',
    title: "Mapping Bob Dylan's mind",
    blurb: [
      "I construct a Knowledge Graph from Dylan's lyrics (1962–2012).",
      "I tracked the evolution of key themes over time — from protest/political to mythic/biblical and movement/travel. The trends align closely with pivotal moments in Dylan's career.",
      "Next, I mapped transitions between different concept types (like person → abstract) and color-coded them by sentiment. This alluvial diagram uncovers the emotional dynamics woven into Dylan's lyrical connections.",
      "Dylan's lyrics shift from literal expression to an increasingly metaphorical style over the decades. This trend highlights his growing reliance on symbolic, emotionally charged language in his 70s.",
      "Finally, by measuring the variance in eigenvector centrality, I quantified \"dishabituation\" — the mix of mainstream vs. peripheral concepts. The mid-career peak reveals Dylan's most eclectic and disruptive phase. Note, this is relative to his dishabituation state in the 60s.",
    ],
    tag: 'Essay',
    links: [
      { label: 'Aeon essay', url: 'https://aeon.co/essays/can-ai-tell-us-anything-meaningful-about-bob-dylans-songs' },
      { label: 'Technical paper', url: 'https://arxiv.org/abs/2502.01772' },
    ],
  },
];
