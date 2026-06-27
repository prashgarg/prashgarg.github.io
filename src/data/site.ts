export const site = {
  name: 'Prashant Garg',
  tagline:
    'Economist working on economic and social measurement of science, innovation, production, and the media, with machine learning, econometrics, and network science.',
  // Short first-person bio for the home/desktop surfaces. Facts (affiliations,
  // dates) are kept in sync with `affiliations` below.
  bio: "Hi, I'm Prashant Garg, an economist. My main research identity is economic and social measurement, using the latest tools from machine learning, econometrics, and network science. I have a keen interest in science & innovation, economic and social networks, production, and information & media. I'm currently a Research Associate at the University of Cambridge and an Associate Fellow at INET Oxford, having completed my PhD in Economics at Imperial College London. In September 2026 I move to Bocconi University as a postdoctoral researcher.",
  // Public contact address — intentionally has NO trailing digit. Do not
  // "correct" it by adding a digit; the digit-suffixed variant is a separate
  // private account and must never appear anywhere on the site. (Confirmed.)
  email: 'prashantgargib@gmail.com',
  // Canonical origin for share/canonical/BibTeX URLs. DNS cutover done
  // (2026-06-24): prashantgarg.org now serves this site over HTTPS, with
  // www + prashgarg.github.io 301-redirecting to it. Keep in sync with
  // astro.config `site`.
  origin: 'https://prashantgarg.org',
  cv: 'https://drive.google.com/file/d/1loWtmOeOwDtSSJ2WHKf7n_PzpQiP6rgF/view?usp=drive_link',
  scholar: 'https://scholar.google.com/citations?hl=en&user=C3o_l0IAAAAJ',
  twitter: 'https://x.com/Prashant_Garg_',
  twitterHandle: '@Prashant_Garg_',
  bluesky: 'https://bsky.app/profile/prashantgarg.bsky.social',
  blueskyHandle: '@prashantgarg.bsky.social',
  github: 'https://github.com/prashgarg',
};

// Per-page meta — single source of truth shared by the OG image route
// (og/[...route].ts) and the HTML <title>/<meta description> in the
// layouts, so the social card and the SERP snippet can't disagree (each
// inner page previously inherited the identical site tagline).
export const pageMeta: Record<string, { title: string; description: string }> = {
  index:    { title: site.name,            description: site.tagline },
  research: { title: 'Research',           description: 'Papers, projects, and the questions behind them.' },
  talks:    { title: 'Talks',              description: 'Each paper, and where it has gone.' },
  library:  { title: 'Library',            description: 'Code, notes, and the occasional essay.' },
  now:      { title: 'Now',                description: 'What I am thinking about right now.' },
  cv:       { title: 'CV — Prashant Garg', description: 'Curriculum vitae and academic record.' },
  standard: { title: site.name,            description: site.tagline },
};

export const affiliations = [
  {
    role: 'Research Associate (since May 2026)',
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

export interface PaperFigure { src: string; caption: string }

export interface Paper {
  slug: string;
  title: string;
  status: PaperStatus;
  venue?: string;
  year?: number;
  coauthors: string[];
  blurb: string;
  /** Plain-English 3-sentence summary (G31) — drafts pending user review */
  tldr?: string;
  links: PaperLink[];
  coverage?: Coverage[];
  tools?: string[];
  award?: { label: string; url?: string };
  figures?: PaperFigure[];
}

export const papers: Paper[] = [
  {
    slug: 'political-expression-academics',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'We linked the Twitter accounts of over 100,000 academics to their publication records to see how scholars actually talk online. Many engage heavily with politically charged topics — climate, culture, the economy — and their tone and focus often differ sharply from the general public\'s. That matters because the academics who tweet are the public face of academia, even though they aren\'t a representative sample of it.',
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
      { outlet: 'THE op-ed', url: 'https://www.timeshighereducation.com/campus/how-preserve-academic-credibility-when-engaging-social-media' },
      { outlet: 'The American Saga', url: 'https://www.theamericansaga.com/p/scientists-getting-political-on-social' },
    ],
    tools: ['academicexpression'],
  },
  {
    slug: 'local-decline-populism',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'Boarded-up shops are more than an eyesore: we tracked 83,000 vacant high-street premises in England and Wales and matched them to election results. Places with more empty shopfronts voted more heavily for UKIP between 2009 and 2019, even among people not directly hurt by the decline. Visible decay in the everyday environment appears to feed populist support on its own.',
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
      // NOTE: the old site's "Guardian" chip points at this Bluesky post
      // (which quotes the Guardian piece) — kept old-site-faithful; swap
      // in the direct Guardian URL when the user supplies it.
      { outlet: 'The Guardian', url: 'https://bsky.app/profile/jacobedenhofer.bsky.social/post/3mdna4xq4yc2y' },
      { outlet: 'FAZ', url: 'https://zeitung.faz.net/faz/wirtschaft/2025-04-07/naehrboden-fuer-populisten/1151252.html' },
      { outlet: 'LSE Business Review', url: 'https://blogs.lse.ac.uk/businessreview/2026/05/11/how-empty-high-streets-contribute-to-support-for-populist-parties-in-england/' },
      { outlet: 'The Conversation', url: 'https://theconversation.com/to-fend-off-reform-mainstream-parties-must-address-the-tangible-decline-of-british-towns-256249' },
      { outlet: 'VoxEU', url: 'https://cepr.org/voxeu/columns/local-decline-and-populism' },
      { outlet: 'University of Warwick', url: 'https://warwick.ac.uk/fac/soc/economics/news/2025/5/the_visual_politics_of_decline_how_empty_high_streets_fuel_populism/' },
      { outlet: 'CAGE', url: 'https://warwick.ac.uk/fac/soc/economics/research/centres/cage/news/08-04-25-nurturing_grounds_for_populists' },
      { outlet: 'CAGE (2)', url: 'https://warwick.ac.uk/fac/soc/economics/research/centres/cage/news/08-05-25-how_empty_high_streets_increase_support_for_populist_candidates/' },
    ],
  },
  {
    slug: 'cross-border-media-disasters',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'Foreign news coverage of disasters is wildly uneven: earthquakes and volcanic eruptions make headlines worldwide, while floods and droughts — the disasters most tied to climate change — barely register. We measured this with 135 million articles from 466 outlets in 123 countries. Coverage also rises with death tolls, especially between countries with close social or ancestral ties.',
    title: 'Uneven Patterns of Cross-Border Media Coverage Following Natural Disasters',
    status: 'accepted',
    venue: 'Nature Human Behaviour',
    coauthors: ['Thiemo Fetzer'],
    blurb:
      "Many natural disasters central to climate-policy debates are hydro-meteorological hazards, yet it remains unclear how global media attention is distributed across disaster types. Using a dataset of 466 news sources from 123 countries, covering 135 million news articles since 2016, we apply an event study framework to measure cross-border reporting following natural disasters. Cross-border attention rises after disasters but is highly uneven across hazards, with the largest short-run increases following earthquakes (b = 0.0785, 95% CI [0.0758, 0.0812]), dry-mass movements (b = 0.0531, 95% CI [0.0349, 0.0713]), and volcanic eruptions (b = 0.0425, 95% CI [0.0359, 0.0490]). In contrast, climatologically salient hazards such as floods (b = 0.0069, 95% CI [0.0062, 0.0076]) and droughts (b = 0.0001, 95% CI [−0.0036, 0.0039]) receive substantially less coverage. Conditional on severity and duration, hydro-meteorological (“climate-linked”) disasters receive less cross-border attention than geophysical disasters (θ = −0.0065, 95% CI [−0.0115, −0.0015]). Attention also increases with fatalities: disasters with 100+ deaths receive more coverage than those with 0–9 deaths (b = 0.0360, 95% CI [0.0231, 0.0490]), and this fatality gradient is stronger for country pairs with tighter social ties and deeper ancestral links. These patterns highlight systematic cross-border differences in attention to disaster risks.",
    links: [
      { label: 'Preprint', url: 'https://www.researchsquare.com/article/rs-6057848/v1' },
    ],
  },
  {
    slug: 'global-automation-atlas',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'Which tasks machines can take over varies country by country, so we built a world atlas of automation exposure covering 2.33 million task-country combinations in 124 countries. Exposure ranges from about 3% of tasks in South Sudan to over 60% in China, and poorer countries face more job-replacing (rather than job-assisting) automation. The atlas makes exposure, technology channels, and AI\'s role comparable across development stages.',
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
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'We taught an AI pipeline to read 45,000 economics papers and map exactly what each one claims causes what. The share of causal claims has roughly quadrupled since 1990 — about a third of claims in recent papers are causal. Papers making novel, well-identified causal claims are more likely to land in top journals and gather citations.',
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
      { label: 'Twitter thread (v1)', url: 'https://x.com/Prashant_Garg_/status/1853392260257182152' },
      { label: 'Twitter thread (v2)', url: 'https://x.com/Prashant_Garg_/status/1879101708174864562' },
    ],
    coverage: [
      { outlet: 'The Economist', url: 'https://www.economist.com/finance-and-economics/2025/05/22/what-the-failure-of-a-superstar-student-reveals-about-economics' },
      { outlet: 'Marginal Revolution', url: 'https://marginalrevolution.com/marginalrevolution/2024/11/causal-claims-in-economics.html' },
      { outlet: 'Marginal Revolution (2)', url: 'https://marginalrevolution.com/marginalrevolution/2025/05/sunday-assorted-links-518.html' },
      { outlet: 'Noahpinion', url: 'https://www.noahpinion.blog/i/167476849/macroeconomics-is-falling-microeconomics-is-rising' },
      { outlet: 'World Bank', url: 'https://blogs.worldbank.org/en/impactevaluations/weekly-links-june-13--causal-claims--work-is-not-just-disutility' },
      { outlet: 'VoxDev', url: 'https://voxdev.org/topic/week-development-economics-voxdev-08112024' },
      { outlet: 'Australian Treasury', url: 'https://evaluation.treasury.gov.au/learn-and-connect/impact-evaluation-practitioners-network/iepn-newsletter-3' },
      { outlet: 'Nada es Gratis', url: 'https://nadaesgratis.es/andreu-arenas/los-costes-visibles-y-los-beneficios-invisibles-del-comercio-con-china' },
    ],
    tools: ['causalclaims'],
  },
  {
    slug: 'what-should-economics-ask-next',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'Can the structure of past research tell us which open questions are worth pursuing next? I built a graph of 242,595 economics papers and ranked open questions using only what was known at each point in time. Graph-based screening beats ranking by popularity at predicting which questions later enter published work — and it shows economics more often deepens existing claims than closes obvious gaps.',
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
      { outlet: 'Marginal Revolution', url: 'https://marginalrevolution.com/marginalrevolution/2026/03/thursday-assorted-links-544.html' },
    ],
    tools: ['frontiergraph'],
  },
  {
    slug: 'politicized-scientists',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'When scientists tweet about politics, does the public trust them less? In experiments where 6,000 Americans and 135 journalists rated realistic academic profiles, politically neutral scientists were judged most credible — and the stronger the political expression, the bigger the credibility penalty, for the scientist and their research alike. Surveys show scientists are well aware of the trade-off.',
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
      { outlet: 'Times Higher Education', url: 'https://www.timeshighereducation.com/news/political-social-media-posts-harm-academics-credibility' },
      { outlet: 'THE op-ed', url: 'https://www.timeshighereducation.com/campus/how-preserve-academic-credibility-when-engaging-social-media' },
      { outlet: 'University of Bath', url: 'https://www.bath.ac.uk/announcements/political-posts-on-x-could-harm-academics-credibility-new-study-finds/' },
      { outlet: 'The American Saga', url: 'https://www.theamericansaga.com/p/scientists-getting-political-on-social' },
      { outlet: 'Nada es Gratis', url: 'https://nadaesgratis.es/admin/el-impacto-de-que-los-cientificos-opinen-sobre-politica-en-redes-sociales' },
      { outlet: 'A Fuoco', url: 'https://www.a-fuoco.it/p/parlare-di-politica-sui-social-media' },
      { outlet: 'iL Post', url: 'https://www.ilpost.it/2024/12/20/politica-scienza/' },
    ],
    tools: ['academicexpression'],
  },
  {
    slug: 'ai-production-networks',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'We used generative AI to map which of 5,000 products feed into the production of which others — a level of supply-chain detail official statistics don\'t capture. The 2017 blockade of Qatar acts as a natural experiment: trade shocks rippled along exactly the links the network predicts. The full data is open at aipnet.io.',
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
      { outlet: 'VoxEU', url: 'https://cepr.org/voxeu/columns/leveraging-ai-navigate-deglobalisation' },
      { outlet: 'SCMP interview', url: 'https://www.scmp.com/news/china/diplomacy/article/3289237/us-silent-china-decision-ban-export-rare-dual-use-materials-gallium-and-germanium' },
      { outlet: 'The Ecologist', url: 'https://theecologist.org/2024/dec/23/china-syndrome' },
    ],
    tools: ['aipnet'],
  },
  {
    slug: 'platform-migration',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'When academics fled Twitter/X for Bluesky, we tracked 276,431 scholars across both platforms to see what actually makes people abandon a social network. Adoption spreads through simple peer exposure — seeing a colleague move is enough, no complex social reinforcement needed — with Brazil\'s court-ordered Twitter suspension providing the causal evidence. Users who quickly rebuilt their old connections stayed active; the rest drifted back.',
    title: 'Simple Contagion Drives Population-Scale Platform Migration',
    status: 'working',
    coauthors: ['Dorian Quelle', 'Frederic Denker', 'Alexandre Bovet'],
    blurb:
      "Social media platforms mediate professional communication, political expression, and community formation, making the rare instances when users collectively abandon an incumbent platform particularly consequential. Strong network effects raise switching costs and strengthen incumbents' positions, making coordinated exit difficult. Here we link 276,431 scholars on Twitter/X to their respective new profiles among the universe of all 16.7 million Bluesky accounts, tracked from January 2023 to December 2024, using a scalable, high-precision cross-platform matching pipeline. Exploiting exogenous variation from Brazil's court-ordered suspension of Twitter/X and a dynamic matching design, we show that adoption is peer-driven, treatment effects are short-lived and dose-dependent, and contagion is simple, not complex. Three patterns characterize adoption and retention. Adoption concentrates among users deeply embedded in Twitter's social graph. Public political expression predicts migration, consistent with homophilous inflows into a largely left-of-center Bluesky information space. Early reconnection with prior contacts predicts longer tenure and engagement. Our findings provide the first population-scale causal evidence of peer influence in a social media platform migration by exploiting exogenous exposure variation in a natural experiment and using daily dynamic matching. Rather than the complex contagion mechanism often emphasized in the literature, contagion is predominantly simple. Our findings recast migration as a multi-homing strategy that insures against governance uncertainty and show that users who quickly reconnect with prior contacts remain active longer on Bluesky.",
    links: [
      { label: 'Paper', url: 'https://arxiv.org/abs/2505.24801' },
    ],
    award: { label: 'Best Student Paper, NetSciSci2025', url: 'https://netscisci.github.io/' },
    coverage: [
      // the old site labelled this "Clarivate" but the link is a
      // Research Professional News piece — use the real outlet name
      { outlet: 'Research Professional News', url: 'https://www.researchprofessionalnews.com/rr-news-uk-universities-2026-4-will-the-academic-exodus-from-x-silence-research/' },
      { outlet: 'Cybernews', url: 'https://cybernews.com/tech/social-platform-w-users/' },
      { outlet: 'Aporia Magazine', url: 'https://www.aporiamagazine.com/p/round-up-kinship-and-honour-in-china' },
    ],
  },
  {
    slug: 'health-shocks-research',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'Does medical research follow the diseases that actually burden people? Linking publication output to disease burden across 204 countries over three decades, we find research now responds faster to outbreaks than it used to — but responsiveness remains highly uneven across places, and philanthropic and government funding account for much of the improvement in lower-income settings.',
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
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'We tested seven leading AI models on thousands of vetted health statements in 21 languages. They are accurate on English-language textbook material but slip in many non-European languages and on contested topics. Thorough multilingual validation should come before anyone relies on AI for health advice at global scale.',
    title: 'AI Health Advice Accuracy Varies Across Languages and Contexts',
    status: 'rr',
    venue: 'BMJ Health & Care Informatics',
    coauthors: ['Thiemo Fetzer'],
    blurb:
      "Using basic health statements authorized by UK and EU registers and ~9,100 journalist-vetted public-health assertions on topics such as abortion, COVID-19 and politics from sources ranging from peer-reviewed journals and government advisories to social media and news across the political spectrum, we benchmark seven leading large language models in 21 languages. We find that, despite high accuracy on English-centric textbook claims, performance falls in multiple non-European languages and fluctuates by topic and source. This highlights the urgency of comprehensive multilingual, domain-aware validation before deploying AI in global health communication.",
    links: [
      { label: 'Preprint', url: 'https://www.researchsquare.com/article/rs-7460273/v1' },
    ],
  },
  {
    slug: 'mapping-dylans-mind',
    // DRAFT plain-English summary (G31) — flagged for user review
    tldr: 'I asked an AI to read every Bob Dylan lyric from 1962 to 2012 and map the concepts and connections inside them. The patterns track his career: protest gives way to myth and travel, metaphor steadily crowds out literal language, and his most disruptive, eclectic period shows up as a measurable mid-career peak.',
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
      { label: "Listen: 'Jokerman'", url: 'https://www.youtube.com/watch?v=1XSvsFgvWr0' },
    ],
    coverage: [
      { outlet: 'Financial Times', url: 'https://www.ft.com/content/8bf3e57a-e196-495b-b7b0-8d3b2ef142d5' },
    ],
    figures: [
      { src: '/library/dylan/jokerman-graph.webp', caption: 'Knowledge graph extracted from "Jokerman" — concepts in Dylan\'s lyrics and the stated relationships between them.' },
      { src: '/library/dylan/theme-evolution.webp', caption: 'Evolution of key themes (1962–2012): protest/political gives way to mythic/biblical and movement/travel, tracking pivotal career moments.' },
      { src: '/library/dylan/alluvial-sentiment.webp', caption: 'Transitions between concept types (person → abstract, …), colour-coded by sentiment — the emotional dynamics of Dylan\'s lyrical connections.' },
      { src: '/library/dylan/metaphor-trend.webp', caption: 'Literal vs. metaphorical expression by decade: an increasingly symbolic style, strongest in his 70s.' },
      { src: '/library/dylan/dishabituation.webp', caption: '"Dishabituation" — variance in eigenvector centrality, mixing mainstream and peripheral concepts. The mid-career peak is Dylan\'s most eclectic phase (relative to the 60s).' },
    ],
    tools: ['dylan'],
  },
];

// (declutter) Dropped the per-status `badge` colour field — colored status
// pills were removed from the rendered pages, so this had zero consumers
// (only `label` is read). Removing it + the orphaned `.badge-*` CSS keeps
// the pills from quietly returning.
export const statusMeta: Record<PaperStatus, { label: string }> = {
  published: { label: 'Published' },
  // 'accepted' renders as Forthcoming — matches how the old site (and
  // the discipline) frames accepted-but-unpublished journal papers.
  accepted:  { label: 'Forthcoming' },
  rr:        { label: 'R&R' },
  working:   { label: 'Working' },
  other:     { label: 'Essay' },
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
  { year: 2026, title: 'Title TBA', venue: 'Universitat de València Seminar', location: 'València', date: '4 Dec 2026', url: 'https://www.uv.es/uvweb/economic-analysis-department/en/department-economic-analysis-1285854461277.html' },
  { year: 2026, title: 'Panel: AI as a Scientific Instrument for Economics', venue: 'Oxford INET Meeting', location: 'Oxford', date: '11 Jun 2026', url: 'https://www.inet.ox.ac.uk/' },
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
  { year: 2025, title: 'Geography of Medical Knowledge', venue: 'LSE QueerConf', location: 'London', date: '15 Aug 2025', url: 'https://www.lsequeerconf.com/home' },
  { year: 2025, title: 'Retrieving and Generating Data using LLMs', venue: 'Public Governance Workshop, PSL', location: 'Virtual', date: '7 Jul 2025', url: 'https://acss-dig.psl.eu/fr/seminaires/public-governance' },
  { year: 2025, title: 'AI-Generated Production Networks', venue: 'RES Annual Conference', location: 'Birmingham', date: '1–2 Jul 2025', url: 'https://res.org.uk/event-listing/res-2025-annual-conference/' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'Metascience 2025', location: 'London', date: '30 Jun 2025', url: 'https://metascience.info/' },
  { year: 2025, title: 'Cross-Border Enforcement and Product Innovation', venue: 'Imperial Economics Seminar', location: 'London', date: '19 Jun 2025', url: 'https://www.imperial.ac.uk/business-school/faculty-research/academic-areas/economics-public-policy/' },
  { year: 2025, title: 'Political Expression of Academics on Twitter', venue: 'Text as Data in Behavioural Economics', location: 'Potsdam', date: '10–11 Jun 2025', url: 'https://sites.google.com/view/text-as-data-workshop/home' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'Networks in Science of Science', location: 'Maastricht', date: '2–6 Jun 2025', url: 'https://netscisci.github.io/papers' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'EAYE Annual Meeting', location: 'London', date: '29–31 May 2025', url: 'https://www.eaye.info/eayeam/2025-edition' },
  { year: 2025, title: 'AI-Generated Production Networks · LLMs Workshop', venue: 'University of Groningen', location: 'Groningen', date: '27 May 2025', url: 'https://www.rug.nl/bachelors/economics-and-business-economics/?lang=en' },
  { year: 2025, title: 'Causal ML & Text-as-Data Roundtable', venue: 'AYEW', location: 'Virtual', date: '21 May 2025', url: 'https://www.monash.edu/business/impact-labs/soda-labs/our-events/applied-young-economists' },
  { year: 2025, title: 'Causal Claims in Economics', venue: 'ZBW Seminar', location: 'Hamburg', date: '20 May 2025', url: 'https://www.zbw.eu/en/' },
  { year: 2025, title: 'Uneven Patterns of Cross-Border Media Coverage Following Natural Disasters', venue: 'LSE–IGC Environmental Populism Conference', location: 'London', date: '15–16 May 2025', url: 'https://www.lse-environment-week.com/env-pop-conf' },
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
  { year: 2023, title: 'Who Influences Whom About What?', venue: 'XII IBEO Workshop in Complexity Economics', location: 'Corte, Corsica', date: '21–23 Jun 2023', url: 'https://crenoslef.wixsite.com/ibeo/corte-program-1' },
  { year: 2023, title: 'Who Influences Whom About What?', venue: '5th QMUL Economics and Finance Workshop', location: 'London', date: '25 May 2023', url: 'https://www.qmul.ac.uk/sef/events/conferences/items/call-for-papers---5th-qmul-economics-and-finance-workshop-for-phd--post-doctoral-students.html' },
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
      { label: "Listen: 'Jokerman'", url: 'https://www.youtube.com/watch?v=1XSvsFgvWr0' },
    ],
  },
];

/* ── Open data / public goods ──────────────────────────────────────
   Mirrors the old site's "Public Goods → Data" section: the three
   datasets released alongside papers, presented as first-class,
   downloadable public goods (not just companion-tool chips). */
export interface Dataset {
  name: string;
  with: string[];
  blurb: string;
  links: PaperLink[];
  paperSlug?: string;
}

export const datasets: Dataset[] = [
  {
    name: 'Causal Claims in Economics — claim graphs',
    with: ['Thiemo Fetzer'],
    blurb: 'Evidence-annotated knowledge graph of ~45,000 economics papers (1980–2023): standardized concepts as nodes, stated causal and non-causal relationships as edges.',
    links: [
      { label: 'causal.claims', url: 'https://www.causal.claims' },
      { label: 'Data & code (GitHub)', url: 'https://github.com/prashgarg/CausalClaimsInEconomics' },
    ],
    paperSlug: 'causal-claims-economics',
  },
  {
    name: 'AIPNET — product-level input–output data',
    with: ['Thiemo Fetzer', 'Peter John Lambert', 'Bennet Feld'],
    blurb: 'AI-generated production network over 5,000 HS products: directed input–output edges plus measures of product importance, with full data download.',
    links: [
      { label: 'aipnet.io', url: 'https://aipnet.io/' },
    ],
    paperSlug: 'ai-production-networks',
  },
  {
    name: 'Academic Expression — academics on social media',
    with: ['Thiemo Fetzer'],
    blurb: 'Data on the political stance and expression of 100,000+ academics (2016–2022), linking social media content to academic records.',
    links: [
      { label: 'academicexpression.online', url: 'https://www.academicexpression.online' },
    ],
    paperSlug: 'political-expression-academics',
  },
];

/* ── CV sections (education / awards / teaching / experience) ──────
   Extracted from the Drive CV PDF + the old-site bio. The PhD entry
   has no month-precise dates in any source — flagged for review. */
export interface CvEntry {
  period: string;
  title: string;
  org?: string;
  detail?: string;
  url?: string;
}

export const education: CvEntry[] = [
  { period: '2022–2026', title: 'PhD in Economics (incl. MRes, Distinction)', org: 'Imperial College London' },
  { period: '2018', title: 'BSc Economics', org: 'Cardiff University', detail: 'First-class honours; Helen Robinson Memorial Prize for the highest score in microeconomic theory.' },
  { period: '2015', title: 'International Baccalaureate', org: 'GD Goenka World School, Gurgaon', detail: "Chairman's Award for the highest overall score in the school (43/45), 99th percentile globally." },
];

export const awards: CvEntry[] = [
  { period: '2025', title: 'Best Student Paper', org: 'NetSciSci2025', detail: 'For "Simple Contagion Drives Population-Scale Platform Migration".', url: 'https://netscisci.github.io/' },
  { period: '2018', title: 'Helen Robinson Memorial Prize', org: 'Cardiff University', detail: 'Highest score in microeconomic theory.' },
];

export const teaching: CvEntry[] = [
  { period: '2025', title: 'Mini-course: Retrieving and Generating Data using LLMs', org: 'C-SEB / ECONtribute, University of Cologne', url: 'https://econtribute.de/event/econtribute-c-seb-mini-course-with-prashant-garg-imperial-college-business-school-london/' },
  { period: '2019–2021', title: 'Research & Teaching Assistant', org: 'Imperial College London', detail: 'Executive MBA managerial economics; MSc Economics & Strategy for Business (digital economics & strategy); BPES managerial and business economics.' },
];

export const experience: CvEntry[] = [
  { period: '2025–', title: 'Visiting Researcher', org: 'University of Cambridge, Computer Science Department', detail: 'Hosted by Neil Lawrence.' },
  { period: '2024–2025', title: 'Visiting Researcher', org: 'International Finance Corporation (IFC), Paris / Washington DC', detail: 'Economics Research Unit; hosted by Ralf Martin.' },
];
