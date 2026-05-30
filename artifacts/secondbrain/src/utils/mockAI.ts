import { Item, Segment, Source } from '../types';
import { sources, WORK_TOPIC_KEYWORDS as WORK_TOPICS, PERSONAL_TOPIC_KEYWORDS as PERSONAL_TOPICS } from '../data/mockData';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SearchScope =
  | 'Everything'
  | 'Media only'
  | 'My notes'
  | 'Saved items'
  | 'Last 7 days'
  | 'Work-related'
  | 'Personal curiosity';

export interface SupportingItemResult {
  item: Item;
  matchScore: number;      // 0–1 combined keyword + base relevance
  excerpt: string;
  keyMatches: string[];    // which keywords hit
  source: Source | undefined;
}

export interface AskResult {
  directAnswer: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceReason: string;
  uncertainties: string[];
  suggestedNextAction: string;
  supportingItems: SupportingItemResult[];
  relatedSegments: Segment[];
  topItem: Item | null;
  scopeLabel: string;
  totalScanned: number;
}

// ─── Suggested questions (static, based on mock data topics) ─────────────────

export const SUGGESTED_QUESTIONS: string[] = [
  'What are the best new ideas from this week?',
  'Which content should I skip?',
  'Which saved items should become actions?',
  'What changed in my thinking this week?',
  'Which sources are producing high-value insights?',
  'What should I consume today about AI agents?',
  'What are the strongest arguments against my current architecture?',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_NOW = new Date('2025-05-30T23:59:59Z');
const SEVEN_DAYS_AGO = new Date(MOCK_NOW.getTime() - 7 * 24 * 60 * 60 * 1000);

// WORK_TOPICS and PERSONAL_TOPICS imported from mockData as arrays (single source of truth)

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'was', 'that', 'this', 'with', 'from',
  'have', 'not', 'what', 'which', 'who', 'how', 'why', 'when', 'where',
  'its', 'any', 'can', 'all', 'been', 'but', 'had', 'has', 'his', 'her',
  'they', 'their', 'our', 'you', 'your', 'she', 'him', 'will', 'more',
  'about', 'should', 'would', 'could', 'into', 'than', 'then', 'them',
  'these', 'those', 'also', 'just', 'like', 'over', 'some', 'very',
  'may', 'each', 'most', 'such', 'only', 'both', 'per', 'new',
]);

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[.,?/#!$%^&*;:{}=\-_`~()'"]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function filterByScope(items: Item[], scope: SearchScope): Item[] {
  switch (scope) {
    case 'Media only':
      return items.filter(i => ['podcast', 'youtube', 'article'].includes(i.contentType));
    case 'My notes':
      return items.filter(i => i.contentType === 'newsletter');
    case 'Saved items':
      return items.filter(i => i.status === 'saved');
    case 'Last 7 days':
      return items.filter(i => new Date(i.ingestedAt) >= SEVEN_DAYS_AGO);
    case 'Work-related':
      return items.filter(i =>
        i.topics.some(t => WORK_TOPICS.some(wt => t.toLowerCase().includes(wt)))
      );
    case 'Personal curiosity':
      return items.filter(i =>
        i.topics.some(t => PERSONAL_TOPICS.some(pt => t.toLowerCase().includes(pt)))
      );
    default:
      return items;
  }
}

function scoreItem(item: Item, keywords: string[]): { score: number; hits: string[] } {
  const fields = [
    item.title,
    item.summary || '',
    item.whyRecommended || '',
    item.creator,
    ...(item.topics || []),
  ].join(' ').toLowerCase();

  const hits: string[] = [];
  let rawScore = 0;

  keywords.forEach(kw => {
    if (fields.includes(kw)) {
      hits.push(kw);
      rawScore += fields.includes(item.title.toLowerCase() + kw) ? 2 : 1;
    }
  });

  // Blend with item's own relevance signal
  const normalised = keywords.length > 0 ? rawScore / (keywords.length * 1.5) : 0;
  const score = Math.min(1, normalised * 0.65 + item.relevanceScore * 0.35);

  return { score, hits };
}

function buildDirectAnswer(
  query: string,
  items: Item[],
  scope: SearchScope
): string {
  if (items.length === 0) {
    return `No items in your Secondbrain match this query${scope !== 'Everything' ? ` within the "${scope}" scope` : ''}. Try broadening the scope or capturing more content on this topic.`;
  }

  const q = query.toLowerCase();
  const top = items[0];
  const topics = Array.from(new Set(items.flatMap(i => i.topics))).slice(0, 4).join(', ');
  const count = items.length;
  const pct = Math.round(top.relevanceScore * 100);

  // Intent: today / what to consume
  if (q.includes('today') || (q.includes('should') && q.includes('consume'))) {
    return `Your top recommendation for this topic is "${top.title}" by ${top.creator} — ${pct}% relevance, ${Math.round(top.importanceScore * 100)}% importance. ${top.whyRecommended} Across ${count} matching item${count > 1 ? 's' : ''}, the key themes are: ${topics}.`;
  }

  // Intent: what have I collected
  if (q.includes('collected') || q.includes('what have i') || q.includes('what did i') || q.includes('what do i have')) {
    return `You have ${count} item${count > 1 ? 's' : ''} in your knowledge base covering ${topics}. The strongest match is "${top.title}" from ${top.creator}. ${top.summary}`;
  }

  // Intent: which items relevant to X
  if (q.includes('relevant') || (q.includes('which') && q.includes('item'))) {
    return `${count} item${count > 1 ? 's are' : ' is'} relevant to this area. "${top.title}" ranks highest at ${pct}% relevance. ${top.whyRecommended}`;
  }

  // Intent: memo / saved for memo
  if (q.includes('memo') || q.includes('weekly') || q.includes('saved for')) {
    const saved = items.filter(i => i.status === 'saved');
    return saved.length > 0
      ? `${saved.length} item${saved.length > 1 ? 's are' : ' is'} saved in your knowledge base that could feed your weekly memo. The most relevant is "${saved[0].title}" — ${saved[0].summary}`
      : `No items are explicitly saved for the memo in this scope. "${top.title}" has the highest signal and would be a strong candidate.`;
  }

  // Intent: arguments / critique / architecture
  if (q.includes('argument') || q.includes('against') || q.includes('critique') || q.includes('architecture')) {
    return `Your Secondbrain contains ${count} item${count > 1 ? 's' : ''} touching on this area. "${top.title}" offers the most direct perspective: ${top.summary} Consider cross-referencing with "${items[1]?.title || 'other saved items'}" to surface contrarian signals.`;
  }

  // Intent: sources producing value
  if (q.includes('source') || q.includes('producing')) {
    const srcNames = Array.from(new Set(items.map(i =>
      sources.find(s => s.id === i.sourceId)?.name || i.creator
    ))).slice(0, 3).join(', ');
    return `The highest-value sources for this topic cluster are: ${srcNames}. They collectively cover ${topics}. "${top.title}" is the strongest individual item.`;
  }

  // Intent: skip / which to skip
  if (q.includes('skip') || q.includes('skip')) {
    const lowItems = items.filter(i => i.recommendedAction === 'skip' || i.relevanceScore < 0.5);
    if (lowItems.length > 0) {
      return `${lowItems.length} item${lowItems.length > 1 ? 's match' : ' matches'} the skip criteria. "${lowItems[0].title}" has the lowest novelty (${Math.round(lowItems[0].noveltyScore * 100)}%) and is marked as safe to skip. ${lowItems[0].whyRecommended}`;
    }
  }

  // Default
  return `Your Secondbrain has ${count} item${count > 1 ? 's' : ''} on this topic. The top match is "${top.title}" by ${top.creator} — ${top.summary} This carries ${top.confidence} confidence with ${pct}% relevance.`;
}

function buildConfidence(
  items: SupportingItemResult[],
  keywords: string[]
): { level: 'high' | 'medium' | 'low'; reason: string } {
  if (items.length === 0) {
    return { level: 'low', reason: 'No matching items found in your knowledge base.' };
  }
  const avgScore = items.reduce((s, i) => s + i.matchScore, 0) / items.length;
  const highConfItems = items.filter(i => i.item.confidence === 'high').length;

  if (avgScore > 0.55 && highConfItems >= 2) {
    return { level: 'high', reason: `${highConfItems} high-confidence sources with strong keyword alignment.` };
  }
  if (avgScore > 0.3 || highConfItems >= 1) {
    return { level: 'medium', reason: `Partial keyword match across ${items.length} source${items.length > 1 ? 's' : ''}. Some topics align, others are inferred.` };
  }
  return { level: 'low', reason: 'Weak keyword match. Results are based on tangential topic similarity.' };
}

function buildUncertainties(
  items: SupportingItemResult[],
  scope: SearchScope,
  keywords: string[]
): string[] {
  const u: string[] = [];
  const medLow = items.filter(i => i.item.confidence !== 'high');
  if (medLow.length > 0) {
    u.push(`${medLow.length} supporting item${medLow.length > 1 ? 's have' : ' has'} medium or low confidence ratings — treat with care.`);
  }
  if (scope !== 'Everything') {
    u.push(`Scope is limited to "${scope}" — other relevant items may exist outside this filter.`);
  }
  if (items.length < 3) {
    u.push('Limited evidence base — fewer than 3 items match. Capture more content on this topic to improve recall.');
  }
  const unmatchedKws = keywords.filter(kw =>
    items.every(r => !r.keyMatches.includes(kw))
  );
  if (unmatchedKws.length > 0) {
    u.push(`The term${unmatchedKws.length > 1 ? 's' : ''} "${unmatchedKws.slice(0, 2).join('", "')}" had no direct match — results may be partially inferred.`);
  }
  return u.slice(0, 3);
}

function buildSuggestedNextAction(items: SupportingItemResult[]): string {
  if (items.length === 0) {
    return 'Capture more content on this topic to build a stronger knowledge base for future queries.';
  }
  const top = items[0].item;
  switch (top.recommendedAction) {
    case 'deep_consume':
      return `Deep-consume "${top.title}" — it has the highest signal density for this query and is rated ${top.confidence} confidence.`;
    case 'segment':
      return `Review the key segments from "${top.title}" to extract the specific insight you need without consuming the full item.`;
    case 'skim':
      return `Skim "${top.title}" in ~${Math.round(((top.durationMinutes || 8) * 0.25))} min to validate its relevance before committing to a full session.`;
    case 'skip':
      return `The top match ("${top.title}") is already flagged as low-value. Consider capturing fresher content on this topic.`;
    default:
      return `Review "${top.title}" as your first priority for this topic.`;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────
// TODO Phase 2: Replace this function with a pgvector similarity search.
// Query flow: embed(query) → SELECT items ORDER BY embedding <-> $query_vec LIMIT 20
// Then rerank by recency, feedback signals, and scope filter using a Postgres function.
// TODO Phase 2: Recommendation scoring — use a trained model (BM25 + user feedback weights)
// to score items rather than keyword overlap. Store scores in a materialized view.

export function generateMockAIAnswer(
  query: string,
  scope: SearchScope,
  allItems: Item[],
  allSegments: Segment[]
): AskResult {
  const keywords = tokenizeQuery(query);
  const scopedItems = filterByScope(allItems, scope);

  // Score every item in scope
  const scored = scopedItems
    .map(item => {
      const { score, hits } = scoreItem(item, keywords);
      return { item, score, hits };
    })
    .filter(s => s.score > 0 || keywords.length === 0)
    .sort((a, b) => b.score - a.score);

  const topScored = scored.slice(0, 5);

  const supportingItems: SupportingItemResult[] = topScored.map(s => ({
    item: s.item,
    matchScore: Math.min(1, s.score),
    excerpt: (s.item.summary || '').slice(0, 140) + ((s.item.summary || '').length > 140 ? '…' : ''),
    keyMatches: s.hits,
    source: sources.find(src => src.id === s.item.sourceId),
  }));

  const topItemIds = supportingItems.map(r => r.item.id);
  const relatedSegments = allSegments
    .filter(seg => topItemIds.includes(seg.itemId))
    .slice(0, 3);

  const { level: confidence, reason: confidenceReason } = buildConfidence(supportingItems, keywords);
  const uncertainties = buildUncertainties(supportingItems, scope, keywords);
  const directAnswer = buildDirectAnswer(query, supportingItems.map(s => s.item), scope);
  const suggestedNextAction = buildSuggestedNextAction(supportingItems);

  return {
    directAnswer,
    confidence,
    confidenceReason,
    uncertainties,
    suggestedNextAction,
    supportingItems,
    relatedSegments,
    topItem: supportingItems[0]?.item || null,
    scopeLabel: scope,
    totalScanned: scopedItems.length,
  };
}
