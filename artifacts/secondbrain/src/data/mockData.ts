import { Item, Source, Segment, Synthesis, Feedback, CapturedItem } from '../types';

export const sources: Source[] = [
  {
    id: 'src_1',
    name: 'Lex Fridman Podcast',
    type: 'podcast',
    url: 'https://lexfridman.com/podcast',
    priority: 'high',
    trustLevel: 'high',
    active: true,
    topics: ['AI agents', 'LLMs', 'philosophy', 'robotics'],
    lastCheckedAt: new Date().toISOString()
  },
  {
    id: 'src_2',
    name: 'Y Combinator',
    type: 'youtube',
    url: 'https://youtube.com/ycombinator',
    priority: 'high',
    trustLevel: 'high',
    active: true,
    topics: ['venture capital', 'startups', 'pricing strategy', 'product management'],
    lastCheckedAt: new Date().toISOString()
  },
  {
    id: 'src_3',
    name: 'MIT Technology Review',
    type: 'article',
    url: 'https://technologyreview.com',
    priority: 'medium',
    trustLevel: 'medium',
    active: true,
    topics: ['enterprise software', 'AI', 'telecom churn', 'technology'],
    lastCheckedAt: new Date().toISOString()
  },
  {
    id: 'src_4',
    name: 'The Pragmatic Engineer',
    type: 'newsletter',
    url: 'https://pragmaticengineer.com',
    priority: 'high',
    trustLevel: 'high',
    active: true,
    topics: ['software engineering', 'leadership', 'tech culture'],
    lastCheckedAt: new Date().toISOString()
  }
];

export const items: Item[] = [
  {
    id: 'itm_1',
    sourceId: 'src_1',
    title: 'Sam Altman on the Future of AI Agents',
    creator: 'Lex Fridman',
    contentType: 'podcast',
    originalUrl: 'https://example.com/podcast/1',
    publishedAt: '2025-05-29T10:00:00Z',
    ingestedAt: '2025-05-30T08:00:00Z',
    durationMinutes: 145,
    status: 'new',
    recommendedAction: 'deep_consume',
    relevanceScore: 0.95,
    noveltyScore: 0.88,
    importanceScore: 0.96,
    confidence: 'high',
    summary: 'A deep dive into how autonomous AI agents will transform the next decade of software.',
    whyRecommended: 'Highly relevant to your ongoing research on autonomous systems.',
    topics: ['AI agents', 'LLMs', 'future']
  },
  {
    id: 'itm_2',
    sourceId: 'src_2',
    title: 'How to Price Your SaaS Product',
    creator: 'Y Combinator',
    contentType: 'youtube',
    originalUrl: 'https://example.com/yt/1',
    publishedAt: '2025-05-28T12:00:00Z',
    ingestedAt: '2025-05-29T08:00:00Z',
    durationMinutes: 45,
    status: 'new',
    recommendedAction: 'segment',
    relevanceScore: 0.82,
    noveltyScore: 0.65,
    importanceScore: 0.80,
    confidence: 'high',
    summary: 'Dalton Caldwell explains the most common pricing mistakes early-stage founders make.',
    whyRecommended: 'You requested insights on pricing strategy; contains two highly relevant segments.',
    topics: ['pricing strategy', 'SaaS', 'startups']
  },
  {
    id: 'itm_3',
    sourceId: 'src_3',
    title: 'Reducing Telecom Churn with Predictive Models',
    creator: 'MIT Technology Review',
    contentType: 'article',
    originalUrl: 'https://example.com/article/1',
    publishedAt: '2025-05-27T09:00:00Z',
    ingestedAt: '2025-05-28T09:00:00Z',
    status: 'new',
    recommendedAction: 'skim',
    relevanceScore: 0.75,
    noveltyScore: 0.50,
    importanceScore: 0.60,
    confidence: 'medium',
    summary: 'An overview of new techniques for predicting customer churn in the telecommunications industry.',
    whyRecommended: 'Matches your interest in telecom churn, but covers concepts you may already know.',
    topics: ['telecom churn', 'predictive modeling', 'data science']
  },
  {
    id: 'itm_4',
    sourceId: 'src_4',
    title: 'Engineering Leadership in 2025',
    creator: 'Gergely Orosz',
    contentType: 'newsletter',
    originalUrl: 'https://example.com/newsletter/1',
    publishedAt: '2025-05-30T07:00:00Z',
    ingestedAt: '2025-05-30T07:30:00Z',
    status: 'new',
    recommendedAction: 'deep_consume',
    relevanceScore: 0.90,
    noveltyScore: 0.85,
    importanceScore: 0.92,
    confidence: 'high',
    summary: 'New expectations for engineering managers handling hybrid teams and AI tools.',
    whyRecommended: 'Directly applicable to your current role and recent queries.',
    topics: ['leadership', 'engineering management', 'culture']
  },
  {
    id: 'itm_5',
    sourceId: 'src_2',
    title: 'Why Most Startups Fail at Product Management',
    creator: 'Y Combinator',
    contentType: 'youtube',
    originalUrl: 'https://example.com/yt/2',
    publishedAt: '2025-05-25T14:00:00Z',
    ingestedAt: '2025-05-26T10:00:00Z',
    durationMinutes: 32,
    status: 'new',
    recommendedAction: 'skip',
    relevanceScore: 0.40,
    noveltyScore: 0.20,
    importanceScore: 0.35,
    confidence: 'high',
    summary: 'General advice on finding product-market fit.',
    whyRecommended: 'Basic concepts you already know; novelty score is very low.',
    topics: ['product management', 'startups']
  },
  {
    id: 'itm_6',
    sourceId: 'src_1',
    title: 'The Evolution of Enterprise Software',
    creator: 'Lex Fridman',
    contentType: 'podcast',
    originalUrl: 'https://example.com/podcast/2',
    publishedAt: '2025-05-20T10:00:00Z',
    ingestedAt: '2025-05-21T08:00:00Z',
    durationMinutes: 180,
    status: 'new',
    recommendedAction: 'segment',
    relevanceScore: 0.85,
    noveltyScore: 0.70,
    importanceScore: 0.88,
    confidence: 'high',
    summary: 'Discussing the shift towards composable enterprise architectures.',
    whyRecommended: 'Contains specific insights on B2B sales cycles you track.',
    topics: ['enterprise software', 'B2B', 'architecture']
  },
  {
    id: 'itm_7',
    sourceId: 'src_3',
    title: 'Venture Capital Trends in Q2',
    creator: 'MIT Technology Review',
    contentType: 'article',
    originalUrl: 'https://example.com/article/2',
    publishedAt: '2025-05-29T11:00:00Z',
    ingestedAt: '2025-05-29T12:00:00Z',
    status: 'saved',
    recommendedAction: 'skim',
    relevanceScore: 0.65,
    noveltyScore: 0.80,
    importanceScore: 0.70,
    confidence: 'medium',
    summary: 'A look at shifting investment priorities towards AI infrastructure.',
    whyRecommended: 'Good to be aware of, but not critical for immediate tasks.',
    topics: ['venture capital', 'AI', 'investing']
  },
  {
    id: 'itm_8',
    sourceId: 'src_4',
    title: 'Building Reliable LLM Pipelines',
    creator: 'Gergely Orosz',
    contentType: 'newsletter',
    originalUrl: 'https://example.com/newsletter/2',
    publishedAt: '2025-05-28T07:00:00Z',
    ingestedAt: '2025-05-28T07:30:00Z',
    status: 'new',
    recommendedAction: 'deep_consume',
    relevanceScore: 0.88,
    noveltyScore: 0.90,
    importanceScore: 0.85,
    confidence: 'high',
    summary: 'Technical breakdown of implementing guardrails for production LLMs.',
    whyRecommended: 'Highly technical and novel; relevant to your upcoming project.',
    topics: ['LLMs', 'software engineering', 'AI agents']
  },
  {
    id: 'itm_9',
    sourceId: 'src_2',
    title: 'Scaling Engineering Teams',
    creator: 'Y Combinator',
    contentType: 'youtube',
    originalUrl: 'https://example.com/yt/3',
    publishedAt: '2025-05-24T12:00:00Z',
    ingestedAt: '2025-05-25T08:00:00Z',
    durationMinutes: 28,
    status: 'new',
    recommendedAction: 'skip',
    relevanceScore: 0.30,
    noveltyScore: 0.15,
    importanceScore: 0.40,
    confidence: 'high',
    summary: 'Standard advice on hiring the first 10 engineers.',
    whyRecommended: 'You have extensive experience here; low novelty.',
    topics: ['leadership', 'hiring', 'startups']
  },
  {
    id: 'itm_10',
    sourceId: 'src_1',
    title: 'The Math Behind AI Agents',
    creator: 'Lex Fridman',
    contentType: 'podcast',
    originalUrl: 'https://example.com/podcast/3',
    publishedAt: '2025-05-15T10:00:00Z',
    ingestedAt: '2025-05-16T08:00:00Z',
    durationMinutes: 120,
    status: 'saved',
    recommendedAction: 'skim',
    relevanceScore: 0.70,
    noveltyScore: 0.60,
    importanceScore: 0.65,
    confidence: 'medium',
    summary: 'Deep mathematical foundations of agentic reasoning.',
    whyRecommended: 'Interesting background, but perhaps too academic for current needs.',
    topics: ['AI agents', 'math', 'theory']
  },
  {
    id: 'itm_11',
    sourceId: 'src_3',
    title: 'New Regulations for Enterprise AI',
    creator: 'MIT Technology Review',
    contentType: 'article',
    originalUrl: 'https://example.com/article/3',
    publishedAt: '2025-05-30T09:00:00Z',
    ingestedAt: '2025-05-30T10:00:00Z',
    status: 'new',
    recommendedAction: 'deep_consume',
    relevanceScore: 0.92,
    noveltyScore: 0.95,
    importanceScore: 0.98,
    confidence: 'high',
    summary: 'Upcoming EU regulations affecting enterprise software companies.',
    whyRecommended: 'Critical compliance information for your product roadmap.',
    topics: ['enterprise software', 'AI', 'regulation']
  },
  {
    id: 'itm_12',
    sourceId: 'src_4',
    title: 'Re-evaluating Value-Based Pricing',
    creator: 'Gergely Orosz',
    contentType: 'newsletter',
    originalUrl: 'https://example.com/newsletter/3',
    publishedAt: '2025-05-10T07:00:00Z',
    ingestedAt: '2025-05-11T07:30:00Z',
    status: 'saved',
    recommendedAction: 'segment',
    relevanceScore: 0.80,
    noveltyScore: 0.50,
    importanceScore: 0.75,
    confidence: 'high',
    summary: 'Why some tech companies are moving back to tiered pricing.',
    whyRecommended: 'Contrarian take on pricing strategy you follow.',
    topics: ['pricing strategy', 'business']
  }
];

export const segments: Segment[] = [
  {
    id: 'seg_1',
    itemId: 'itm_2',
    startTime: '14:23',
    endTime: '18:10',
    title: 'The Freemium Trap',
    transcriptExcerpt: "The biggest mistake we see is companies offering a freemium tier before they have a solid enterprise motion. You end up supporting thousands of free users who will never convert, burning your support resources.",
    segmentSummary: 'Freemium models often fail for early-stage B2B startups due to high support costs and low conversion rates.',
    whyRecommended: 'Directly addresses your query on pricing strategy risks.',
    relevanceScore: 0.92,
    recommendedAction: 'deep_consume'
  },
  {
    id: 'seg_2',
    itemId: 'itm_2',
    startTime: '28:45',
    endTime: '32:15',
    title: 'Value-Based Pricing Metrics',
    transcriptExcerpt: "You need to find the specific metric that aligns with the value your customer gets. If you save them time, price based on users. If you make them money, price based on transaction volume. It has to scale linearly.",
    segmentSummary: 'Choose a pricing metric that scales linearly with the value the customer receives from your product.',
    whyRecommended: 'Useful framework for evaluating your current pricing model.',
    relevanceScore: 0.85,
    recommendedAction: 'segment'
  },
  {
    id: 'seg_3',
    itemId: 'itm_6',
    startTime: '45:10',
    endTime: '52:30',
    title: 'The Death of the Monolith',
    transcriptExcerpt: "We are moving away from the monolithic ERP systems. The new enterprise stack is highly composable, APIs first, allowing companies to swap out specific vendors without tearing out the whole system.",
    segmentSummary: 'Enterprise software is becoming more modular, reducing vendor lock-in but increasing integration complexity.',
    whyRecommended: 'Highlights a major shift in enterprise architecture.',
    relevanceScore: 0.88,
    recommendedAction: 'skim'
  },
  {
    id: 'seg_4',
    itemId: 'itm_6',
    startTime: '1:12:00',
    endTime: '1:18:45',
    title: 'Selling to the Developer',
    transcriptExcerpt: "The buying power has shifted to the developer. If your product doesn't have a great developer experience and simple API docs, you won't even get to the proof of concept stage, let alone the CTO.",
    segmentSummary: 'Developer experience is now a critical factor in B2B enterprise sales.',
    whyRecommended: 'Relevant to your product management strategy for developer tools.',
    relevanceScore: 0.90,
    recommendedAction: 'deep_consume'
  }
];

export const syntheses: Synthesis[] = [
  {
    id: 'syn_1',
    period: 'weekly',
    title: 'Weekly Intelligence Brief: AI & Pricing',
    date: '2025-05-24',
    keyInsights: [
      'Value-based pricing is evolving; tiered models are making a comeback in B2B SaaS.',
      'Autonomous AI agents will require new frameworks for mathematical reasoning and reliability.',
      'Enterprise architecture is shifting towards highly composable, API-first solutions.'
    ],
    mustConsumeItemIds: ['itm_1', 'itm_8', 'itm_11'],
    savedItemIds: ['itm_7', 'itm_10', 'itm_12'],
    openQuestions: [
      'How will the new EU regulations impact our current AI feature roadmap?',
      'Should we reconsider our freemium tier based on recent YC advice?'
    ],
    actions: [
      'Review EU compliance guidelines.',
      'Draft a memo on alternative pricing metrics.'
    ]
  }
];

export const defaultFeedback: Feedback[] = [];
export const defaultCaptures: CapturedItem[] = [];

// ─── Topic classification sets ────────────────────────────────────────────────
// Canonical topic lists used by Today, Library, and mockAI — single source of truth.

/** Exact-match Set used by Today's work/personal filter. */
export const WORK_TOPICS = new Set([
  'ai agents', 'llms', 'enterprise software', 'pricing strategy', 'leadership',
  'engineering management', 'regulation', 'product management', 'b2b', 'telecom churn',
  'venture capital', 'software engineering', 'saas', 'startups', 'ai', 'business',
]);

/** Exact-match Set used by Today's work/personal filter. */
export const PERSONAL_TOPICS = new Set([
  'philosophy', 'robotics', 'math', 'theory', 'culture', 'hiring', 'personal',
]);

/** Substring-match list used by mockAI scope filtering ("Work-related"). */
export const WORK_TOPIC_KEYWORDS: string[] = [
  'pricing', 'saas', 'enterprise', 'leadership', 'engineering',
  'ai agents', 'startups', 'b2b', 'architecture', 'regulation',
  'venture capital', 'product management', 'software', 'business',
  'data science', 'telecom', 'hiring',
];

/** Substring-match list used by mockAI scope filtering ("Personal curiosity"). */
export const PERSONAL_TOPIC_KEYWORDS: string[] = [
  'philosophy', 'math', 'theory', 'culture', 'tech culture',
  'investing', 'future', 'robotics',
];

// ─── Library: Themes ─────────────────────────────────────────────────────────

export interface ThemeDef {
  id: string;
  label: string;
  icon: string;
  topicKeywords: string[];
  description: string;
  openQuestions: string[];
}

export const THEME_DEFS: ThemeDef[] = [
  {
    id: 'agentic-ai', label: 'Agentic AI', icon: '◎',
    topicKeywords: ['AI agents', 'LLMs', 'math', 'future', 'robotics'],
    description: 'Autonomous agent systems, LLM reasoning, and agentic architectures.',
    openQuestions: ['How will agent autonomy affect our product roadmap?', 'What evaluation frameworks exist for agentic systems?'],
  },
  {
    id: 'pricing-strategy', label: 'Pricing Strategy', icon: '◈',
    topicKeywords: ['pricing strategy', 'SaaS', 'business', 'pricing'],
    description: 'Value-based pricing, freemium traps, and tiered models.',
    openQuestions: ['Should we move away from freemium?', 'What metric best aligns pricing with customer value?'],
  },
  {
    id: 'telecom-churn', label: 'Telecom Churn', icon: '◑',
    topicKeywords: ['telecom churn', 'churn', 'predictive modeling', 'data science'],
    description: 'Churn prediction, customer retention, and telecom-specific ML.',
    openQuestions: ['Are our current churn models capturing the right signals?'],
  },
  {
    id: 'enterprise-software', label: 'Enterprise Software', icon: '▣',
    topicKeywords: ['enterprise software', 'B2B', 'architecture', 'regulation', 'enterprise'],
    description: 'Composable enterprise stacks, developer-led growth, and regulation.',
    openQuestions: ['How will EU AI regulation change our compliance burden?', 'Is developer experience our biggest differentiator?'],
  },
  {
    id: 'engineering-leadership', label: 'Engineering Leadership', icon: '◉',
    topicKeywords: ['leadership', 'engineering management', 'culture', 'hiring'],
    description: 'Hybrid team management, AI tooling adoption, and culture.',
    openQuestions: ['What does good engineering management look like with AI-assisted coding?'],
  },
  {
    id: 'venture-capital', label: 'Venture Capital', icon: '◇',
    topicKeywords: ['venture capital', 'investing', 'startups', 'product management'],
    description: 'VC trends, startup models, and investment thesis shifts.',
    openQuestions: ['Which VC theses are most aligned with our product direction?'],
  },
  {
    id: 'personal-learning', label: 'Personal Learning', icon: '◌',
    topicKeywords: ['philosophy', 'math', 'theory', 'tech culture', 'future'],
    description: 'Long-horizon learning, theory, and intellectual curiosity.',
    openQuestions: ['Am I making time for foundational, non-instrumental learning?'],
  },
];

// ─── Library: Decisions ───────────────────────────────────────────────────────

export interface Decision {
  id: string;
  text: string;
  sourceContext: string;
  status: 'candidate' | 'committed' | 'done';
  createdAt: string;
  category: 'work' | 'personal';
}

export const MOCK_DECISIONS: Decision[] = [
  { id: 'd1', text: 'Test segment-level scoring logic on the next batch of podcasts.', sourceContext: 'Agentic AI research session', status: 'committed', createdAt: '2025-05-28', category: 'work' },
  { id: 'd2', text: 'Create a source quality dashboard to surface underperforming feeds.', sourceContext: 'Engineering Leadership in 2025', status: 'candidate', createdAt: '2025-05-30', category: 'work' },
  { id: 'd3', text: 'Prioritise share-sheet capture in Phase 2 of the Secondbrain build.', sourceContext: 'Productivity capture session', status: 'candidate', createdAt: '2025-05-29', category: 'work' },
  { id: 'd4', text: 'Separate work vs. personal relevance ranking in the Today view.', sourceContext: 'Media intelligence review', status: 'done', createdAt: '2025-05-25', category: 'work' },
  { id: 'd5', text: 'Draft a memo on alternative pricing metrics — test value-based approach.', sourceContext: 'How to Price Your SaaS Product (YC)', status: 'candidate', createdAt: '2025-05-30', category: 'work' },
];

// ─── Library: Feedback log ────────────────────────────────────────────────────

export interface FeedbackEntry {
  id: string;
  targetTitle: string;
  feedbackType: string;
  feedbackLabel: string;
  date: string;
  impact: string;
}

export const MOCK_FEEDBACK_LOG: FeedbackEntry[] = [
  { id: 'fb1', targetTitle: 'Sam Altman on the Future of AI Agents', feedbackType: 'more_like_this', feedbackLabel: 'More like this', date: '2025-05-28', impact: 'Boosted weight for Lex Fridman Podcast; increased AI agents topic signal.' },
  { id: 'fb2', targetTitle: 'Why Most Startups Fail at Product Management', feedbackType: 'already_known', feedbackLabel: 'Already known', date: '2025-05-29', impact: 'Reduced novelty weight for foundational startup advice; deprioritised PM basics.' },
  { id: 'fb3', targetTitle: 'Engineering Leadership in 2025', feedbackType: 'important_for_work', feedbackLabel: 'Important for work', date: '2025-05-30', impact: 'Elevated importance score for engineering leadership cluster.' },
  { id: 'fb4', targetTitle: 'Scaling Engineering Teams', feedbackType: 'less_like_this', feedbackLabel: 'Less like this', date: '2025-05-30', impact: 'Downweighted hiring / team-scaling content; flagged as known territory.' },
];
