export type SourceType = 'podcast' | 'youtube' | 'article' | 'newsletter' | 'document' | 'manual' | 'rss';
export type Priority = 'high' | 'medium' | 'low';
export type TrustLevel = 'high' | 'medium' | 'low';
export type ContentType = 'podcast' | 'youtube' | 'article' | 'newsletter' | 'document' | 'note';
export type ItemStatus = 'new' | 'reviewed' | 'saved' | 'dismissed' | 'consumed';
export type RecommendedAction = 'skip' | 'skim' | 'segment' | 'deep_consume';
export type Confidence = 'high' | 'medium' | 'low';
export type FeedbackType = 'useful' | 'not_useful' | 'too_basic' | 'already_known' | 'more_like_this' | 'less_like_this' | 'wrong_reason' | 'important_for_work' | 'personal_curiosity';
export type Period = 'daily' | 'weekly' | 'monthly';
export type CaptureStatus = 'captured' | 'processing' | 'summarized' | 'ready';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  priority: Priority;
  trustLevel: TrustLevel;
  active: boolean;
  topics: string[];
  lastCheckedAt: string;
}

export interface Item {
  id: string;
  sourceId: string;
  title: string;
  creator: string;
  contentType: ContentType;
  originalUrl: string;
  publishedAt: string;
  ingestedAt: string;
  durationMinutes?: number;
  status: ItemStatus;
  recommendedAction: RecommendedAction;
  relevanceScore: number;
  noveltyScore: number;
  importanceScore: number;
  confidence: Confidence;
  summary: string;
  whyRecommended: string;
  topics: string[];
}

export interface Segment {
  id: string;
  itemId: string;
  startTime: string;
  endTime: string;
  title: string;
  transcriptExcerpt: string;
  segmentSummary: string;
  whyRecommended: string;
  relevanceScore: number;
  recommendedAction: RecommendedAction;
}

export interface Feedback {
  id: string;
  targetType: 'item' | 'segment' | 'source' | 'topic' | 'synthesis';
  targetId: string;
  feedbackType: FeedbackType;
  comment?: string;
  createdAt: string;
}

export interface Synthesis {
  id: string;
  period: Period;
  title: string;
  date: string;
  keyInsights: string[];
  mustConsumeItemIds: string[];
  savedItemIds: string[];
  openQuestions: string[];
  actions: string[];
}

export type CaptureCategory = 'work' | 'personal' | 'both';
export type SourceTypeExtended = 'podcast' | 'youtube' | 'newsletter' | 'rss' | 'substack' | 'article_site' | 'manual';

export interface VoiceExtraction {
  title: string;
  summary: string;
  topics: string[];
  possibleAction: string;
  suggestedCategory: string;
}

export interface CapturedItem {
  id: string;
  type: 'link' | 'text' | 'voice' | 'source';
  title: string;
  url?: string;
  note?: string;
  content?: string;
  topics: string[];
  status: CaptureStatus;
  capturedAt: string;
  priority?: Priority;
  category?: CaptureCategory;
  dismissed?: boolean;
  convertedToItem?: boolean;
  voiceExtraction?: VoiceExtraction;
}
