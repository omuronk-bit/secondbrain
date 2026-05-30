// TODO Phase 2: Replace localStorage with Supabase client calls.
// Each helper below maps 1-to-1 to a Supabase table query.
// Auth context (user ID) must be injected once Supabase auth is set up.

import { Item, Feedback, CapturedItem, Source } from '../types';
import { items, sources, defaultFeedback, defaultCaptures } from '../data/mockData';

// ─── Generic storage helpers ─────────────────────────────────────────────────

export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or unavailable — fail silently in prototype
  }
};

// ─── Items ───────────────────────────────────────────────────────────────────
// TODO Phase 2: SELECT * FROM items WHERE user_id = auth.uid() ORDER BY ingested_at DESC
export const getItems = (): Item[] =>
  getStorageItem('secondbrain_items', items);

// TODO Phase 2: UPSERT items with conflict resolution on (id, user_id)
export const saveItems = (newItems: Item[]): void =>
  setStorageItem('secondbrain_items', newItems);

/** Update a single item's status and persist atomically. */
export const updateItemStatus = (id: string, status: Item['status']): void => {
  const current = getItems();
  const updated = current.map(i => (i.id === id ? { ...i, status } : i));
  saveItems(updated);
};

/** Update a single item's recommended action and persist atomically. */
export const updateItemAction = (id: string, action: Item['recommendedAction']): void => {
  const current = getItems();
  const updated = current.map(i => (i.id === id ? { ...i, recommendedAction: action } : i));
  saveItems(updated);
};

// ─── Sources ─────────────────────────────────────────────────────────────────
// TODO Phase 2: SELECT * FROM sources WHERE user_id = auth.uid()
export const getSources = (): Source[] =>
  getStorageItem('secondbrain_sources', sources);

// TODO Phase 2: UPSERT sources
export const saveSources = (newSources: Source[]): void =>
  setStorageItem('secondbrain_sources', newSources);

// ─── Captures ─────────────────────────────────────────────────────────────────
// TODO Phase 2: SELECT * FROM captures WHERE user_id = auth.uid() ORDER BY captured_at DESC
// TODO Phase 2 (ingestion): POST /api/captures → triggers transcription + AI summarization job
// TODO Phase 2 (share-sheet): iOS/Android share extension posts directly to this endpoint
export const getCaptures = (): CapturedItem[] =>
  getStorageItem('secondbrain_captures', defaultCaptures);

export const saveCaptures = (newCaptures: CapturedItem[]): void =>
  setStorageItem('secondbrain_captures', newCaptures);

// ─── Feedback ────────────────────────────────────────────────────────────────
// TODO Phase 2: INSERT INTO feedback — feeds recommendation scoring pipeline
// TODO Phase 2: pgvector: feedback signals adjust embedding weights per user
export const getFeedback = (): Feedback[] =>
  getStorageItem('secondbrain_feedback', defaultFeedback);

export const saveFeedback = (newFeedback: Feedback[]): void =>
  setStorageItem('secondbrain_feedback', newFeedback);

// ─── Ask history ─────────────────────────────────────────────────────────────
// TODO Phase 2: SELECT query_text FROM ask_history WHERE user_id = auth.uid()
export const getAskHistory = (): string[] =>
  getStorageItem('secondbrain_ask_history', []);

export const saveAskHistory = (history: string[]): void =>
  setStorageItem('secondbrain_ask_history', history);
