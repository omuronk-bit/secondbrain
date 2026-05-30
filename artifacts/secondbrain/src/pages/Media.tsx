import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Podcast, Youtube, FileText, Mail, FileIcon,
  Play, Bookmark, Star, X, ChevronLeft, ChevronDown,
  Clock, Calendar, Tag, TrendingUp, Zap, BarChart2,
  CheckCircle, Circle, Timer, RefreshCw, Filter
} from 'lucide-react';
import { Item, Segment, Source } from '../types';
import { getItems, getStorageItem, setStorageItem } from '../utils/storage';
import { segments as allSegments, sources } from '../data/mockData';
import { RecommendationBadge } from '../components/shared/RecommendationBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { ScoreDisplay } from '../components/shared/ScoreDisplay';
import { SegmentDetail, SegmentState } from '../components/media/SegmentDetail';
import { PlayerBar, FeedbackKey } from '../components/media/PlayerBar';
import { cn } from '../lib/utils';

// ─── types ───────────────────────────────────────────────────────────────────

type ConsumeState = 'not_started' | 'in_progress' | 'consumed' | 'saved' | 'dismissed';
type FilterKey = 'all' | 'podcast' | 'youtube' | 'article' | 'saved_segments' | 'deep_consume' | 'skim' | 'dismissed';
type SortKey = 'relevance' | 'newest' | 'shortest_segment' | 'novelty' | 'importance';

interface ItemMediaState {
  consumeState: ConsumeState;
}

interface MediaStorage {
  items: Record<string, ItemMediaState>;
  segments: Record<string, SegmentState>;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseTimeToSeconds(t: string): number {
  const parts = t.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function segmentDuration(seg: Segment): number {
  return Math.abs(parseTimeToSeconds(seg.endTime) - parseTimeToSeconds(seg.startTime));
}

function minSegmentDuration(item: Item): number {
  const segs = allSegments.filter(s => s.itemId === item.id);
  if (!segs.length) return item.durationMinutes ? item.durationMinutes * 60 : 9999;
  return Math.min(...segs.map(segmentDuration));
}

function formatDuration(mins?: number): string {
  if (!mins) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STORAGE_KEY = 'secondbrain_media_state';

function loadMediaStorage(): MediaStorage {
  return getStorageItem<MediaStorage>(STORAGE_KEY, { items: {}, segments: {} });
}

function saveMediaStorage(s: MediaStorage): void {
  setStorageItem(STORAGE_KEY, s);
}

// ─── icons ───────────────────────────────────────────────────────────────────

const ContentIcon = ({ type, className }: { type: string; className?: string }) => {
  const cls = cn('shrink-0', className);
  switch (type) {
    case 'podcast': return <Podcast className={cls} />;
    case 'youtube': return <Youtube className={cls} />;
    case 'article': return <FileText className={cls} />;
    case 'newsletter': return <Mail className={cls} />;
    default: return <FileIcon className={cls} />;
  }
};

// ─── consume state badge ──────────────────────────────────────────────────────

const ConsumeBadge = ({ state }: { state: ConsumeState }) => {
  const styles: Record<ConsumeState, { icon: React.ReactNode; label: string; cls: string }> = {
    not_started: { icon: <Circle className="w-3 h-3" />, label: 'Not started', cls: 'text-muted-foreground bg-secondary border-border' },
    in_progress: { icon: <RefreshCw className="w-3 h-3" />, label: 'In progress', cls: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40' },
    consumed: { icon: <CheckCircle className="w-3 h-3" />, label: 'Consumed', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40' },
    saved: { icon: <Bookmark className="w-3 h-3 fill-current" />, label: 'Saved', cls: 'text-primary bg-primary/10 border-primary/20' },
    dismissed: { icon: <X className="w-3 h-3" />, label: 'Dismissed', cls: 'text-muted-foreground bg-secondary border-border' },
  };
  const { icon, label, cls } = styles[state];
  return (
    <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border', cls)}>
      {icon}{label}
    </span>
  );
};

// ─── media queue card ─────────────────────────────────────────────────────────

interface QueueCardProps {
  item: Item;
  source?: Source;
  consumeState: ConsumeState;
  segmentCount: number;
  savedSegCount: number;
  onOpen: (id: string) => void;
  onSetConsumeState: (id: string, s: ConsumeState) => void;
}

const QueueCard = ({ item, source, consumeState, segmentCount, savedSegCount, onOpen, onSetConsumeState }: QueueCardProps) => {
  const isDismissed = consumeState === 'dismissed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'rounded-xl border bg-card shadow-sm overflow-hidden transition-colors',
        consumeState === 'consumed' && 'opacity-60',
        isDismissed && 'opacity-40',
      )}
      data-testid={`queue-card-${item.id}`}
    >
      <div className="p-4 space-y-3">
        {/* header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <ContentIcon type={item.contentType} className="w-3.5 h-3.5" />
              <span className="truncate max-w-[130px]">{source?.name ?? item.creator}</span>
              {item.durationMinutes && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{formatDuration(item.durationMinutes)}</span>
                </>
              )}
              <span className="text-muted-foreground/40">·</span>
              <span>{formatDate(item.publishedAt)}</span>
            </div>
            <h3 className="font-bold text-[15px] leading-snug text-foreground">{item.title}</h3>
          </div>
          <RecommendationBadge action={item.recommendedAction} confidence={item.confidence} className="shrink-0 mt-0.5" />
        </div>

        {/* summary */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{item.summary}</p>

        {/* scores */}
        <ScoreDisplay relevance={item.relevanceScore} novelty={item.noveltyScore} importance={item.importanceScore} />

        {/* footer */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40 flex-wrap">
          <ConsumeBadge state={consumeState} />

          {segmentCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 px-2 py-0.5 rounded-full">
              <Timer className="w-3 h-3" />
              {segmentCount} segment{segmentCount !== 1 ? 's' : ''}
            </span>
          )}

          {savedSegCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 px-2 py-0.5 rounded-full">
              <Star className="w-3 h-3 fill-current" />
              {savedSegCount} saved
            </span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {!isDismissed && consumeState !== 'consumed' && (
              <button
                onClick={() => onSetConsumeState(item.id, consumeState === 'in_progress' ? 'consumed' : 'in_progress')}
                data-testid={`consume-state-btn-${item.id}`}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-all active:scale-95"
              >
                {consumeState === 'in_progress' ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Done</> : <><Play className="w-3.5 h-3.5" /> Start</>}
              </button>
            )}
            <button
              onClick={() => onOpen(item.id)}
              data-testid={`open-item-btn-${item.id}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── item detail panel ────────────────────────────────────────────────────────

interface DetailPanelProps {
  item: Item;
  source?: Source;
  itemSegs: Segment[];
  allItems: Item[];
  consumeState: ConsumeState;
  segStates: Record<string, SegmentState>;
  onBack: () => void;
  onSetConsumeState: (id: string, s: ConsumeState) => void;
  onPlaySegment: (seg: Segment) => void;
  onSegmentAction: (action: 'save' | 'dismiss' | 'memo' | 'more' | 'less', segId: string) => void;
}

const DetailPanel = ({
  item, source, itemSegs, allItems, consumeState,
  segStates, onBack, onSetConsumeState, onPlaySegment, onSegmentAction
}: DetailPanelProps) => {
  const relatedItems = allItems
    .filter(i => i.id !== item.id && i.topics.some(t => item.topics.includes(t)))
    .slice(0, 3);

  return (
    <motion.div
      key="detail"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute inset-0 bg-background overflow-y-auto z-20"
    >
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-5">
        {/* back + actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            data-testid="detail-back-btn"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to queue
          </button>
          <ConsumeBadge state={consumeState} />
        </div>

        {/* title block */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium flex-wrap">
                <ContentIcon type={item.contentType} className="w-3.5 h-3.5" />
                <span className="font-semibold text-foreground">{source?.name ?? item.creator}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{item.creator}</span>
                {item.durationMinutes && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDuration(item.durationMinutes)}</span>
                  </>
                )}
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDate(item.publishedAt)}</span>
              </div>
              <h2 className="text-xl font-bold leading-snug text-foreground">{item.title}</h2>
            </div>
            <RecommendationBadge action={item.recommendedAction} confidence={item.confidence} className="shrink-0 mt-1" />
          </div>
        </div>

        {/* scores */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <ScoreDisplay relevance={item.relevanceScore} novelty={item.noveltyScore} importance={item.importanceScore} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold">Confidence:</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wide border',
              item.confidence === 'high' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40',
              item.confidence === 'medium' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40',
              item.confidence === 'low' && 'bg-secondary text-muted-foreground border-border',
            )}>{item.confidence}</span>
          </div>
        </div>

        {/* summary */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Summary</h3>
          <p className="text-sm text-foreground leading-relaxed">{item.summary}</p>
        </div>

        {/* why recommended */}
        <div className="flex gap-2.5 rounded-xl bg-primary/6 border border-primary/12 px-4 py-3">
          <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Why recommended</p>
            <p className="text-sm text-primary/90 leading-snug">{item.whyRecommended}</p>
          </div>
        </div>

        {/* topics */}
        {item.topics.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Topics</h3>
            <div className="flex flex-wrap gap-1.5">
              {item.topics.map(t => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border font-medium">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* consume state controls */}
        <div className="flex gap-2 flex-wrap">
          {(['not_started', 'in_progress', 'consumed', 'saved'] as ConsumeState[]).map(s => (
            <button
              key={s}
              onClick={() => onSetConsumeState(item.id, s)}
              data-testid={`detail-state-${s}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95',
                consumeState === s
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-secondary',
              )}
            >
              {s === 'not_started' && <Circle className="w-3.5 h-3.5" />}
              {s === 'in_progress' && <RefreshCw className="w-3.5 h-3.5" />}
              {s === 'consumed' && <CheckCircle className="w-3.5 h-3.5" />}
              {s === 'saved' && <Bookmark className="w-3.5 h-3.5" />}
              {s.replace('_', ' ')}
            </button>
          ))}
          <button
            onClick={() => onSetConsumeState(item.id, 'dismissed')}
            data-testid="detail-state-dismissed"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95',
              consumeState === 'dismissed'
                ? 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-card text-muted-foreground border-border hover:bg-secondary',
            )}
          >
            <X className="w-3.5 h-3.5" /> Dismiss
          </button>
        </div>

        {/* segments */}
        {itemSegs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recommended segments</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">{itemSegs.length}</span>
            </div>
            <div className="space-y-3">
              {itemSegs.map(seg => (
                <SegmentDetail
                  key={seg.id}
                  segment={seg}
                  state={segStates[seg.id] ?? { saved: false, dismissed: false, memo: false, consumed: false }}
                  onPlay={onPlaySegment}
                  onSave={id => onSegmentAction('save', id)}
                  onDismiss={id => onSegmentAction('dismiss', id)}
                  onMemo={id => onSegmentAction('memo', id)}
                  onMoreLikeThis={id => onSegmentAction('more', id)}
                  onLessLikeThis={id => onSegmentAction('less', id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* related items */}
        {relatedItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />Related items
            </h3>
            <div className="space-y-2">
              {relatedItems.map(rel => {
                const relSrc = sources.find(s => s.id === rel.sourceId);
                return (
                  <div key={rel.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/60">
                    <ContentIcon type={rel.contentType} className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground line-clamp-1">{rel.title}</p>
                      <p className="text-xs text-muted-foreground">{relSrc?.name ?? rel.creator}</p>
                    </div>
                    <RecommendationBadge action={rel.recommendedAction} className="shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── main page ────────────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'podcast', label: 'Podcasts' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'article', label: 'Articles' },
  { key: 'saved_segments', label: 'Saved segments' },
  { key: 'deep_consume', label: 'Deep consume' },
  { key: 'skim', label: 'Skim only' },
  { key: 'dismissed', label: 'Dismissed' },
];

const SORTS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'relevance', label: 'Highest relevance', icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { key: 'newest', label: 'Newest', icon: <Calendar className="w-3.5 h-3.5" /> },
  { key: 'shortest_segment', label: 'Shortest segment', icon: <Timer className="w-3.5 h-3.5" /> },
  { key: 'novelty', label: 'Highest novelty', icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'importance', label: 'Highest importance', icon: <TrendingUp className="w-3.5 h-3.5" /> },
];

export const Media = () => {
  const [allItems] = useState<Item[]>(getItems());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [mediaStorage, setMediaStorage] = useState<MediaStorage>(loadMediaStorage);
  const [playingSegment, setPlayingSegment] = useState<{ seg: Segment; itemTitle: string } | null>(null);

  const getItemState = (id: string): ConsumeState =>
    mediaStorage.items[id]?.consumeState ?? 'not_started';

  const getSegState = (id: string): SegmentState =>
    mediaStorage.segments[id] ?? { saved: false, dismissed: false, memo: false, consumed: false };

  const updateStorage = useCallback((next: MediaStorage) => {
    setMediaStorage(next);
    saveMediaStorage(next);
  }, []);

  const setConsumeState = useCallback((itemId: string, state: ConsumeState) => {
    const next: MediaStorage = {
      ...mediaStorage,
      items: { ...mediaStorage.items, [itemId]: { consumeState: state } },
    };
    updateStorage(next);
  }, [mediaStorage, updateStorage]);

  const handleSegmentAction = useCallback((action: 'save' | 'dismiss' | 'memo' | 'more' | 'less', segId: string) => {
    const cur = getSegState(segId);
    let next: SegmentState;
    switch (action) {
      case 'save': next = { ...cur, saved: !cur.saved }; break;
      case 'dismiss': next = { ...cur, dismissed: true }; break;
      case 'memo': next = { ...cur, memo: !cur.memo }; break;
      default: next = cur;
    }
    const nextStorage: MediaStorage = {
      ...mediaStorage,
      segments: { ...mediaStorage.segments, [segId]: next },
    };
    updateStorage(nextStorage);
  }, [mediaStorage, updateStorage, getSegState]);

  const handleMarkConsumed = useCallback((segId: string, feedback: Partial<Record<FeedbackKey, boolean>>) => {
    const cur = getSegState(segId);
    const next: SegmentState = { ...cur, consumed: true };
    const nextStorage: MediaStorage = {
      ...mediaStorage,
      segments: { ...mediaStorage.segments, [segId]: next },
    };
    updateStorage(nextStorage);
    console.info('Segment feedback', segId, feedback);
    setPlayingSegment(null);
  }, [mediaStorage, updateStorage, getSegState]);

  const handlePlaySegment = useCallback((seg: Segment) => {
    const item = allItems.find(i => i.id === seg.itemId);
    setPlayingSegment({ seg, itemTitle: item?.title ?? '' });
    if (getItemState(seg.itemId) === 'not_started') {
      setConsumeState(seg.itemId, 'in_progress');
    }
  }, [allItems, getItemState, setConsumeState]);

  // Saved segment item IDs
  const savedSegItemIds = useMemo(() => {
    const ids = new Set<string>();
    Object.entries(mediaStorage.segments).forEach(([segId, state]) => {
      if (state.saved) {
        const seg = allSegments.find(s => s.id === segId);
        if (seg) ids.add(seg.itemId);
      }
    });
    return ids;
  }, [mediaStorage.segments]);

  // Filtered + sorted items
  const displayItems = useMemo(() => {
    let filtered = allItems.filter(item => {
      const cs = getItemState(item.id);
      if (filter === 'dismissed') return cs === 'dismissed';
      if (cs === 'dismissed') return false; // hide dismissed from other tabs
      if (filter === 'all') return true;
      if (filter === 'podcast') return item.contentType === 'podcast';
      if (filter === 'youtube') return item.contentType === 'youtube';
      if (filter === 'article') return item.contentType === 'article' || item.contentType === 'newsletter';
      if (filter === 'saved_segments') return savedSegItemIds.has(item.id);
      if (filter === 'deep_consume') return item.recommendedAction === 'deep_consume';
      if (filter === 'skim') return item.recommendedAction === 'skim';
      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'relevance': return b.relevanceScore - a.relevanceScore;
        case 'newest': return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'shortest_segment': return minSegmentDuration(a) - minSegmentDuration(b);
        case 'novelty': return b.noveltyScore - a.noveltyScore;
        case 'importance': return b.importanceScore - a.importanceScore;
        default: return 0;
      }
    });

    return filtered;
  }, [allItems, filter, sort, savedSegItemIds, mediaStorage.items]);

  const selectedItem = selectedItemId ? allItems.find(i => i.id === selectedItemId) : null;
  const selectedSource = selectedItem ? sources.find(s => s.id === selectedItem.sourceId) : undefined;
  const selectedSegments = selectedItem ? allSegments.filter(s => s.itemId === selectedItem.id) : [];
  const selectedSegStates: Record<string, SegmentState> = {};
  if (selectedItem) {
    selectedSegments.forEach(seg => { selectedSegStates[seg.id] = getSegState(seg.id); });
  }

  const activeSort = SORTS.find(s => s.key === sort)!;

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-background" data-testid="media-page">

      {/* ── filter + sort bar ── */}
      <div className="sticky top-[56px] z-30 bg-background/90 backdrop-blur-md border-b border-border">
        {/* filter pills */}
        <div className="flex overflow-x-auto gap-1.5 px-4 pt-3 pb-2 no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              data-testid={`filter-${f.key}`}
              className={cn(
                'whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border transition-all shrink-0',
                filter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-secondary',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* sort row */}
        <div className="flex items-center justify-between px-4 pb-2.5">
          <span className="text-xs text-muted-foreground">
            {displayItems.length} item{displayItems.length !== 1 ? 's' : ''}
          </span>
          <div className="relative">
            <button
              onClick={() => setSortOpen(o => !o)}
              data-testid="sort-toggle"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              {activeSort.label}
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', sortOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[190px] py-1 overflow-hidden"
                  data-testid="sort-dropdown"
                >
                  {SORTS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => { setSort(s.key); setSortOpen(false); }}
                      data-testid={`sort-${s.key}`}
                      className={cn(
                        'flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-xs font-medium transition-colors',
                        sort === s.key
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-secondary',
                      )}
                    >
                      {s.icon}{s.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── queue list ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {displayItems.length === 0 ? (
            <EmptyState
              icon={<FileIcon className="w-5 h-5" />}
              title={
                filter === 'dismissed'      ? 'No dismissed items' :
                filter === 'saved_segments' ? 'No saved segments' :
                filter === 'deep_consume'   ? 'No deep-read candidates' :
                filter === 'skim'           ? 'No skim candidates' :
                filter === 'all'            ? 'Queue is empty' :
                `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase() ?? filter} items`
              }
              description={
                filter === 'dismissed'      ? 'Items you dismiss will appear here for review.' :
                filter === 'saved_segments' ? 'Open an item in the player and save segments to build this list.' :
                filter === 'deep_consume'   ? 'No items are currently scored as must-read.' :
                filter === 'skim'           ? 'No items are currently scored as skim-only.' :
                'Try a different filter, or add new sources in the Library.'
              }
              className="mt-6"
            />
          ) : (
            <AnimatePresence>
              {displayItems.map(item => {
                const segs = allSegments.filter(s => s.itemId === item.id);
                const savedSegs = segs.filter(s => getSegState(s.id).saved).length;
                return (
                  <QueueCard
                    key={item.id}
                    item={item}
                    source={sources.find(s => s.id === item.sourceId)}
                    consumeState={getItemState(item.id)}
                    segmentCount={segs.length}
                    savedSegCount={savedSegs}
                    onOpen={setSelectedItemId}
                    onSetConsumeState={setConsumeState}
                  />
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── item detail slide-in ── */}
      <AnimatePresence>
        {selectedItem && (
          <DetailPanel
            item={selectedItem}
            source={selectedSource}
            itemSegs={selectedSegments}
            allItems={allItems}
            consumeState={getItemState(selectedItem.id)}
            segStates={selectedSegStates}
            onBack={() => setSelectedItemId(null)}
            onSetConsumeState={setConsumeState}
            onPlaySegment={handlePlaySegment}
            onSegmentAction={handleSegmentAction}
          />
        )}
      </AnimatePresence>

      {/* ── player bar ── */}
      <AnimatePresence>
        {playingSegment && (
          <PlayerBar
            segment={playingSegment.seg}
            itemTitle={playingSegment.itemTitle}
            onClose={() => setPlayingSegment(null)}
            onMarkConsumed={handleMarkConsumed}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
