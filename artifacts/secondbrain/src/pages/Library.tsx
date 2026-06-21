import { useState } from 'react';
import { Link } from 'wouter';
import { getItems, getSources, getFeedback, getCaptures, getAskHistory, getStorageItem } from '../utils/storage';
import { syntheses, THEME_DEFS, MOCK_DECISIONS, MOCK_FEEDBACK_LOG as MOCK_FEEDBACK } from '../data/mockData';
import { segments } from '../utils/mediaStore';
import { EmptyState } from '../components/shared/EmptyState';
import {
  Hash, Database, Bookmark, Newspaper, CheckSquare, MessageSquare, Download,
  ChevronDown, ChevronUp, ChevronRight,
  ArrowUp, ArrowDown, Power, Eye, BarChart2,
  Clock, HelpCircle, Sparkles, Tag, Play,
  CheckCircle2, Circle, AlertTriangle, ExternalLink, Package,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { openItemLink, setSourceActive } from '../lib/api';
import { toast } from '../hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Item, Source } from '../types';
import { ContentIcon } from '../components/shared/ContentIcon';

// THEME_DEFS, MOCK_DECISIONS, MOCK_FEEDBACK imported from mockData (single source of truth)

// ─── Small helpers ────────────────────────────────────────────────────────────

function dateFmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PriorityBadge({ level }: { level: string }) {
  const cfg = {
    high: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    low: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
  }[level] ?? 'bg-muted text-muted-foreground border-border';
  return <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border', cfg)}>{level}</span>;
}

function SignalBar({ quality }: { quality: 'high' | 'medium' | 'low' }) {
  const map = { high: { w: '85%', cls: 'bg-emerald-500', label: 'High' }, medium: { w: '55%', cls: 'bg-amber-500', label: 'Med' }, low: { w: '25%', cls: 'bg-rose-500', label: 'Low' } };
  const { w, cls, label } = map[quality];
  return (
    <div className="flex items-center gap-2">
      <BarChart2 className="w-3 h-3 text-muted-foreground/50 shrink-0" />
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', cls)} style={{ width: w }} />
      </div>
      <span className={cn('text-[10px] font-bold', cls === 'bg-emerald-500' ? 'text-emerald-500' : cls === 'bg-amber-500' ? 'text-amber-500' : 'text-rose-500')}>{label}</span>
    </div>
  );
}

// ─── Themes section ───────────────────────────────────────────────────────────

function ThemesSection({ items }: { items: Item[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<Set<string>>(new Set());

  // Themes derived from the real topics on your items (not hardcoded keyword sets).
  const pretty = (t: string) => t.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const byTopic: Record<string, Item[]> = {};
  items.forEach((item) => item.topics.forEach((t) => { (byTopic[t] = byTopic[t] || []).push(item); }));
  const themes = Object.entries(byTopic)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([topic, matched]) => {
      const def = { id: topic, icon: pretty(topic).charAt(0), label: pretty(topic),
        description: `${matched.length} item${matched.length !== 1 ? 's' : ''} from your feeds`,
        openQuestions: [] as string[] };
      const saved = matched.filter((i) => i.status === 'saved');
      const freq: Record<string, number> = {};
      matched.forEach((i) => { freq[i.creator] = (freq[i.creator] || 0) + 1; });
      const topSrc = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      const recent = [...matched].sort((a, b) => new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime())[0];
      return { def, matched, saved, topSrc, recent };
    });

  return (
    <div className="space-y-2">
      {themes.map(({ def, matched, saved, topSrc, recent }) => (
        <div key={def.id} className="bg-card border border-border/70 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
            onClick={() => setExpanded(e => e === def.id ? null : def.id)}
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-base shrink-0">
              {def.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold text-sm text-foreground">{def.label}</h3>
                <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{matched.length} items</span>
                {saved.length > 0 && <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{saved.length} saved</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{def.description}</p>
            </div>
            <div className="shrink-0 text-muted-foreground">
              {expanded === def.id ? <ChevronUp className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </button>

          <AnimatePresence>
            {expanded === def.id && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="border-t border-border/50 p-4 space-y-4 bg-muted/10">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Top source', value: topSrc },
                      { label: 'Last activity', value: recent ? dateFmt(recent.ingestedAt) : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-background border border-border/50 rounded-lg p-2.5 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                        <p className="text-xs font-bold text-foreground truncate">{value}</p>
                      </div>
                    ))}
                  </div>

                  {def.openQuestions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <HelpCircle className="w-3 h-3 text-amber-500" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Open Questions</p>
                      </div>
                      <ul className="space-y-1.5">
                        {def.openQuestions.map((q, i) => (
                          <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                            <span className="mt-1 w-1 h-1 rounded-full bg-amber-500/70 shrink-0" />
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Items preview */}
                  {matched.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Items in this theme</p>
                      <div className="space-y-1.5">
                        {(showAll.has(def.id) ? matched : matched.slice(0, 3)).map(item => (
                          <div key={item.id} className="flex items-center gap-1 bg-background border border-border/40 rounded-lg overflow-hidden">
                            <Link
                              href={`/media?item=${item.id}`}
                              data-testid={`theme-item-${item.id}`}
                              className="flex items-center gap-2 p-2 flex-1 min-w-0 hover:bg-muted/30 active:scale-[.99] transition-colors"
                            >
                              <ContentIcon type={item.contentType} />
                              <span className="text-xs flex-1 truncate">{item.title}</span>
                              <PriorityBadge level={item.confidence} />
                            </Link>
                            {item.originalUrl && (
                              <button
                                onClick={() => openItemLink(item)}
                                title="Open source"
                                aria-label="Open source"
                                data-testid={`theme-item-src-${item.id}`}
                                className="p-2 text-muted-foreground/60 hover:text-primary shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {matched.length > 3 && (
                          <button
                            onClick={() => setShowAll(s => { const n = new Set(s); if (n.has(def.id)) n.delete(def.id); else n.add(def.id); return n; })}
                            data-testid={`theme-more-${def.id}`}
                            className="w-full text-xs text-center text-primary font-medium pt-1 hover:underline"
                          >
                            {showAll.has(def.id) ? 'Show less' : `+${matched.length - 3} more`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─── Sources section ──────────────────────────────────────────────────────────

function SourcesSection({ initialSources, items }: { initialSources: Source[]; items: Item[] }) {
  const [sources, setSources] = useState(initialSources);
  const [expandedSrc, setExpandedSrc] = useState<string | null>(null);

  const setPriority = (id: string, dir: 'up' | 'down') => {
    setSources(ss => ss.map(s => {
      if (s.id !== id) return s;
      const levels: Source['priority'][] = ['low', 'medium', 'high'];
      const idx = levels.indexOf(s.priority);
      const next = dir === 'up' ? Math.min(2, idx + 1) : Math.max(0, idx - 1);
      return { ...s, priority: levels[next] };
    }));
  };

  const toggleActive = (id: string) => {
    const src = sources.find(s => s.id === id);
    if (!src) return;
    const next = !src.active;
    setSources(ss => ss.map(s => s.id === id ? { ...s, active: next } : s)); // optimistic
    setSourceActive(id, next)
      .then(() => toast({ title: next ? 'Source resumed' : 'Source paused', description: src.name }))
      .catch(() => {
        setSources(ss => ss.map(s => s.id === id ? { ...s, active: !next } : s)); // revert
        toast({ title: 'Could not update source', description: 'Try again.' });
      });
  };

  return (
    <div className="space-y-3">
      {sources.map(src => {
        const srcItems = items.filter(i => i.sourceId === src.id);
        const useful = srcItems.filter(i => i.relevanceScore > 0.7).length;
        const dismissed = srcItems.filter(i => i.recommendedAction === 'skip').length;
        const avgRel = srcItems.length ? srcItems.reduce((s, i) => s + i.relevanceScore, 0) / srcItems.length : 0;
        const quality: 'high' | 'medium' | 'low' = avgRel > 0.79 ? 'high' : avgRel > 0.59 ? 'medium' : 'low';
        const lastChecked = dateFmt(src.lastCheckedAt);

        return (
          <div key={src.id} className={cn('bg-card border rounded-xl p-4 space-y-3 transition-opacity', !src.active && 'opacity-60')}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() => setExpandedSrc(e => e === src.id ? null : src.id)}
                disabled={srcItems.length === 0}
                data-testid={`source-header-${src.id}`}
                className="flex-1 min-w-0 flex items-center gap-2 text-left disabled:cursor-default"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-foreground">{src.name}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wide bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{src.type}</span>
                    {!src.active && <span className="text-[10px] font-bold text-rose-500 uppercase">Inactive</span>}
                  </div>
                </div>
                {srcItems.length > 0 && (
                  expandedSrc === src.id
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
              <PriorityBadge level={src.priority} />
            </div>

            {/* Topics */}
            <div className="flex flex-wrap gap-1">
              {src.topics.slice(0, 5).map(t => (
                <span key={t} className="flex items-center gap-1 text-[10px] bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">
                  <Tag className="w-2.5 h-2.5" />{t}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Useful', value: useful, color: 'text-emerald-500' },
                { label: 'Dismissed', value: dismissed, color: 'text-rose-500' },
                { label: 'Total', value: srcItems.length, color: 'text-foreground' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted/30 rounded-lg p-2 text-center">
                  <p className={cn('text-base font-black', color)}>{value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            {/* Signal quality */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Signal Quality</p>
              <SignalBar quality={quality} />
            </div>

            {/* Expanded items — tap to read/watch in-app, ↗ for the source */}
            {expandedSrc === src.id && srcItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Items from this source</p>
                {srcItems.slice(0, 10).map(item => (
                  <div key={item.id} className="flex items-center gap-1 bg-background border border-border/40 rounded-lg overflow-hidden">
                    <Link href={`/media?item=${item.id}`} data-testid={`source-item-${item.id}`} className="flex items-center gap-2 p-2 flex-1 min-w-0 hover:bg-muted/30 transition-colors">
                      <ContentIcon type={item.contentType} />
                      <span className="text-xs flex-1 truncate">{item.title}</span>
                    </Link>
                    {item.originalUrl && (
                      <button onClick={() => openItemLink(item)} title="Open source" aria-label="Open source" data-testid={`source-item-src-${item.id}`} className="p-2 text-muted-foreground/60 hover:text-primary shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Footer row */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border/40">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" /> Last checked {lastChecked}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPriority(src.id, 'up')} title="Increase priority" disabled={src.priority === 'high'}
                  className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted disabled:opacity-30 transition-colors">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button onClick={() => setPriority(src.id, 'down')} title="Decrease priority" disabled={src.priority === 'low'}
                  className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted disabled:opacity-30 transition-colors">
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button onClick={() => toggleActive(src.id)} title={src.active ? 'Deactivate' : 'Activate'}
                  className={cn('p-1.5 rounded-lg transition-colors', src.active ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500')}>
                  <Power className="w-3 h-3" />
                </button>
                <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold transition-colors">
                  <Eye className="w-3 h-3" /> View
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Saved section ────────────────────────────────────────────────────────────

type SavedFilter = 'All' | 'Media' | 'Notes' | 'Articles' | 'Segments' | 'Memo candidates';

function SavedSection({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<SavedFilter>('All');
  const FILTERS: SavedFilter[] = ['All', 'Media', 'Notes', 'Articles', 'Segments', 'Memo candidates'];
  const saved = items.filter(i => i.status === 'saved');
  const memoIds = new Set(syntheses.flatMap(s => s.savedItemIds));
  // Real saved segments: ids the user saved in the Media detail view (same storage Media uses).
  const media = getStorageItem<{ segments: Record<string, { saved?: boolean }> }>('secondbrain_media_state', { segments: {} });
  const savedSegIds = new Set(Object.entries(media.segments || {}).filter(([, st]) => st?.saved).map(([id]) => id));
  const savedSegments = segments.filter(s => savedSegIds.has(s.id));

  const filtered: Item[] = filter === 'All' ? saved
    : filter === 'Media' ? saved.filter(i => ['podcast', 'youtube'].includes(i.contentType))
    : filter === 'Notes' ? saved.filter(i => i.contentType === 'newsletter')
    : filter === 'Articles' ? saved.filter(i => i.contentType === 'article')
    : filter === 'Memo candidates' ? saved.filter(i => memoIds.has(i.id))
    : [];

  const showSegments = filter === 'Segments' || filter === 'All';

  return (
    <div className="space-y-4">
      <div className="flex overflow-x-auto gap-1.5 pb-1 no-scrollbar">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 transition-all',
              filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted'
            )}>{f}</button>
        ))}
      </div>

      {filter !== 'Segments' && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <EmptyState icon={<Bookmark className="w-5 h-5" />} title="No items match this filter" description="Adjust filters or save more items from your feed." />
          ) : filtered.map(item => (
            <div key={item.id} className="flex items-start gap-2 p-3 bg-card border border-border/60 rounded-xl">
              <Link href={`/media?item=${item.id}`} data-testid={`saved-item-${item.id}`} className="flex items-start gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <div className="p-1.5 bg-muted rounded-lg shrink-0 mt-0.5"><ContentIcon type={item.contentType} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold line-clamp-2">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.creator} · {dateFmt(item.publishedAt)}</p>
                  {item.summary && <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{item.summary}</p>}
                </div>
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                {memoIds.has(item.id) && (
                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">Memo</span>
                )}
                {item.originalUrl && (
                  <button onClick={() => openItemLink(item)} title="Open source" aria-label="Open source" data-testid={`saved-item-src-${item.id}`} className="p-1.5 text-muted-foreground/60 hover:text-primary">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSegments && savedSegments.length > 0 && (
        <div className="space-y-2">
          {filter === 'All' && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-2">Saved Segments</p>}
          {savedSegments.map(seg => (
            <Link key={seg.id} href={`/media?item=${seg.itemId}`} data-testid={`saved-segment-${seg.id}`} className="block p-3 bg-card border border-border/60 rounded-xl space-y-2 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{seg.title}</p>
                <span className="text-[10px] font-mono text-muted-foreground">{seg.startTime}–{seg.endTime}</span>
              </div>
              <p className="text-xs text-muted-foreground italic line-clamp-2">"{seg.transcriptExcerpt}"</p>
              <p className="text-xs text-foreground/80">{seg.segmentSummary}</p>
            </Link>
          ))}
        </div>
      )}
      {filter === 'Segments' && savedSegments.length === 0 && (
        <EmptyState icon={<Bookmark className="w-5 h-5" />} title="No saved segments yet" description="Save standout segments from a podcast or video and they'll show up here." />
      )}
    </div>
  );
}

// ─── Memos section ────────────────────────────────────────────────────────────

function MemosSection({ items }: { items: Item[] }) {
  const [expanded, setExpanded] = useState<string>(syntheses[0]?.id ?? '');

  return (
    <div className="space-y-3">
      {syntheses.map(syn => {
        const mustItems = items.filter(i => syn.mustConsumeItemIds.includes(i.id));
        const isOpen = expanded === syn.id;
        return (
          <div key={syn.id} className="bg-card border border-border/70 rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(isOpen ? '' : syn.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground line-clamp-1">{syn.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{syn.period} · {dateFmt(syn.date)}</p>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="border-t border-border/50 p-4 space-y-4 bg-muted/10">

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Key Insights</p>
                      <ul className="space-y-2">
                        {syn.keyInsights.map((ins, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{ins}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {mustItems.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Must-Consume</p>
                        <div className="space-y-1.5">
                          {mustItems.map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-2 bg-background border border-border/40 rounded-lg">
                              <ContentIcon type={item.contentType} />
                              <span className="text-xs flex-1 truncate">{item.title}</span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground/50" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {syn.openQuestions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <HelpCircle className="w-3 h-3 text-amber-500" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Open Questions</p>
                        </div>
                        <ul className="space-y-1.5">
                          {syn.openQuestions.map((q, i) => (
                            <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                              <span className="mt-1 w-1 h-1 rounded-full bg-amber-500/60 shrink-0" />{q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {syn.actions.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Actions</p>
                        <ul className="space-y-1.5">
                          {syn.actions.map((a, i) => (
                            <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />{a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── Decisions section ────────────────────────────────────────────────────────

function DecisionsSection() {
  const [decisions, setDecisions] = useState(MOCK_DECISIONS);

  const markDone = (id: string) => setDecisions(ds => ds.map(d => d.id === id ? { ...d, status: 'done' } : d));
  const discard = (id: string) => setDecisions(ds => ds.filter(d => d.id !== id));

  const groups = [
    { label: 'Committed', items: decisions.filter(d => d.status === 'committed'), color: 'text-primary' },
    { label: 'Candidates', items: decisions.filter(d => d.status === 'candidate'), color: 'text-amber-500' },
    { label: 'Done', items: decisions.filter(d => d.status === 'done'), color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-5">
      {groups.map(({ label, items, color }) => items.length > 0 && (
        <div key={label}>
          <p className={cn('text-[10px] font-bold uppercase tracking-widest mb-2', color)}>{label} · {items.length}</p>
          <div className="space-y-2">
            {items.map(d => (
              <div key={d.id} className={cn('bg-card border rounded-xl p-3 space-y-2', d.status === 'done' && 'opacity-60')}>
                <div className="flex items-start gap-2">
                  {d.status === 'done'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    : d.status === 'committed'
                    ? <CheckSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    : <Circle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  }
                  <p className={cn('text-sm flex-1', d.status === 'done' && 'line-through text-muted-foreground')}>{d.text}</p>
                </div>
                <div className="flex items-center justify-between pl-6">
                  <div className="text-[11px] text-muted-foreground">
                    From: <span className="text-foreground/70 italic">{d.sourceContext}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    {dateFmt(d.createdAt)}
                  </div>
                  {d.status !== 'done' && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => markDone(d.id)}
                        className="px-2 py-1 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors">Done</button>
                      <button onClick={() => discard(d.id)}
                        className="px-2 py-1 text-[10px] font-bold bg-muted/50 hover:bg-muted text-muted-foreground rounded-lg transition-colors">Discard</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Feedback section ─────────────────────────────────────────────────────────

function FeedbackSection() {
  const TYPE_COLORS: Record<string, string> = {
    more_like_this: 'text-emerald-500 bg-emerald-500/10',
    less_like_this: 'text-rose-500 bg-rose-500/10',
    already_known: 'text-amber-500 bg-amber-500/10',
    important_for_work: 'text-primary bg-primary/10',
    too_basic: 'text-orange-500 bg-orange-500/10',
    useful: 'text-emerald-500 bg-emerald-500/10',
    not_useful: 'text-rose-500 bg-rose-500/10',
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Feedback shapes future recommendations. Each signal adjusts topic weights and source trust scores.
      </p>
      {MOCK_FEEDBACK.map(fb => (
        <div key={fb.id} className="bg-card border border-border/60 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground flex-1 line-clamp-2">{fb.targetTitle}</p>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0', TYPE_COLORS[fb.feedbackType] ?? 'text-muted-foreground bg-muted')}>
              {fb.feedbackLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" /> {dateFmt(fb.date)}
          </div>
          <div className="flex items-start gap-2 bg-muted/30 rounded-lg p-2.5">
            <AlertTriangle className="w-3 h-3 text-amber-500/70 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">{fb.impact}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Export section ───────────────────────────────────────────────────────────

function ExportSection() {
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      items: getItems(),
      sources: getSources(),
      captures: getCaptures(),
      feedback: getFeedback(),
      askHistory: getAskHistory(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secondbrain-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const items = getItems();
  const srcs = getSources();
  const caps = getCaptures();

  const stats = [
    { label: 'Media items', value: items.length },
    { label: 'Sources', value: srcs.length },
    { label: 'Captures', value: caps.length },
    { label: 'Feedback', value: getFeedback().length },
    { label: 'Ask history', value: getAskHistory().length },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border/70 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Export Secondbrain data</h3>
            <p className="text-xs text-muted-foreground">All local data exported as a single JSON file</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-muted/30 border border-border/40 rounded-lg p-2.5 text-center">
              <p className="text-lg font-black text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-muted/20 border border-border/40 rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The export includes all items, sources, captures, feedback signals, and ask history stored in your browser. No data is sent to any server.
          </p>
        </div>

        <button
          onClick={handleExport}
          className={cn(
            'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all',
            exported
              ? 'bg-emerald-500 text-white'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'
          )}
        >
          {exported ? (
            <><CheckCircle2 className="w-4 h-4" /> Exported successfully</>
          ) : (
            <><Download className="w-4 h-4" /> Export as JSON</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = 'themes' | 'sources' | 'saved' | 'memos' | 'decisions' | 'feedback' | 'export';

const TABS: { id: Tab; icon: typeof Hash; label: string }[] = [
  { id: 'themes',    icon: Hash,          label: 'Themes' },
  { id: 'sources',   icon: Database,      label: 'Sources' },
  { id: 'saved',     icon: Bookmark,      label: 'Saved' },
  { id: 'memos',     icon: Newspaper,     label: 'Memos' },
  { id: 'decisions', icon: CheckSquare,   label: 'Decisions' },
  { id: 'feedback',  icon: MessageSquare, label: 'Feedback' },
  { id: 'export',    icon: Download,      label: 'Export' },
];

export const Library = () => {
  const [activeTab, setActiveTab] = useState<Tab>('themes');
  // Hide items already handled (consumed/dismissed) so they don't linger in Library.
  const [items] = useState(getItems().filter(i => i.status !== 'consumed' && i.status !== 'dismissed'));
  const [sources] = useState(getSources());

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Tab bar */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-3 border-b-2 whitespace-nowrap transition-colors shrink-0',
                  active ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {/* Media queue gateway — the reading/listening feed lives under Library */}
        <Link
          href="/media"
          className="flex items-center gap-3 mb-4 rounded-2xl border bg-card shadow-sm px-4 py-3 hover:border-primary/40 transition-colors active:scale-[.99]"
          data-testid="library-media-link"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center shrink-0 text-primary">
            <Play className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Media queue</p>
            <p className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'} to read &amp; listen</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Link>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'themes'    && <ThemesSection items={items} />}
            {activeTab === 'sources'   && <SourcesSection initialSources={sources} items={items} />}
            {activeTab === 'saved'     && <SavedSection items={items} />}
            {activeTab === 'memos'     && <MemosSection items={items} />}
            {activeTab === 'decisions' && <DecisionsSection />}
            {activeTab === 'feedback'  && <FeedbackSection />}
            {activeTab === 'export'    && <ExportSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
