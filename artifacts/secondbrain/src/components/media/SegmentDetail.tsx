import { useState } from "react";
import {
  Play, Bookmark, X, Star, ThumbsUp, ThumbsDown,
  MessageSquare, ChevronDown, ChevronUp, CheckCircle
} from "lucide-react";
import { Segment } from "../../types";
import { RecommendationBadge } from "../shared/RecommendationBadge";
import { cn } from "../../lib/utils";

export interface SegmentState {
  saved: boolean;
  dismissed: boolean;
  memo: boolean;
  consumed: boolean;
}

interface Props {
  segment: Segment;
  state: SegmentState;
  onPlay: (segment: Segment) => void;
  onSave: (id: string) => void;
  onDismiss: (id: string) => void;
  onMemo: (id: string) => void;
  onMoreLikeThis: (id: string) => void;
  onLessLikeThis: (id: string) => void;
}

export const SegmentDetail = ({
  segment, state, onPlay, onSave, onDismiss, onMemo, onMoreLikeThis, onLessLikeThis
}: Props) => {
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);

  if (state.dismissed) return null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm overflow-hidden transition-colors",
        "border-l-4",
        state.consumed
          ? "border-l-emerald-500 border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10"
          : state.saved
            ? "border-l-primary border-primary/20"
            : "border-l-border"
      )}
      data-testid={`segment-detail-${segment.id}`}
    >
      <div className="p-4 space-y-3">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md shrink-0">
                {segment.startTime}–{segment.endTime}
              </span>
              {state.consumed && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3 h-3" /> Consumed
                </span>
              )}
            </div>
            <h4 className="font-bold text-sm leading-snug text-foreground">{segment.title}</h4>
          </div>
          <RecommendationBadge action={segment.recommendedAction} className="shrink-0 mt-0.5" />
        </div>

        {/* why this segment */}
        <div className="flex gap-2 rounded-lg bg-primary/6 border border-primary/12 px-3 py-2 text-xs text-primary font-medium leading-snug">
          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {segment.whyRecommended}
        </div>

        {/* segment summary */}
        <p className="text-sm text-foreground leading-relaxed">{segment.segmentSummary}</p>

        {/* transcript excerpt */}
        <div className="space-y-1">
          <p className={cn(
            "text-xs italic text-muted-foreground leading-relaxed border-l-2 border-border pl-3",
            !transcriptExpanded && "line-clamp-3"
          )}>
            "{segment.transcriptExcerpt}"
          </p>
          <button
            onClick={() => setTranscriptExpanded(e => !e)}
            data-testid={`transcript-toggle-${segment.id}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {transcriptExpanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse transcript</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Show full transcript</>
            }
          </button>
        </div>

        {/* relevance score */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <span className="font-medium">Relevance</span>
          <span className="font-mono text-foreground">{segment.relevanceScore.toFixed(2)}</span>
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
          <button
            onClick={() => onPlay(segment)}
            data-testid={`play-btn-${segment.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Play segment
          </button>

          <button
            onClick={() => onSave(segment.id)}
            data-testid={`seg-save-btn-${segment.id}`}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95",
              state.saved
                ? "bg-primary/15 text-primary"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            )}
          >
            <Bookmark className={cn("w-3.5 h-3.5", state.saved && "fill-current")} />
            {state.saved ? "Saved" : "Save"}
          </button>

          <button
            onClick={() => onMemo(segment.id)}
            data-testid={`seg-memo-btn-${segment.id}`}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95",
              state.memo
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", state.memo && "fill-current")} />
            Memo
          </button>

          <button
            onClick={() => {
              setFeedbackSent('more');
              onMoreLikeThis(segment.id);
            }}
            data-testid={`seg-more-btn-${segment.id}`}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95",
              feedbackSent === 'more'
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" /> More
          </button>

          <button
            onClick={() => {
              setFeedbackSent('less');
              onLessLikeThis(segment.id);
            }}
            data-testid={`seg-less-btn-${segment.id}`}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95",
              feedbackSent === 'less'
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" /> Less
          </button>

          <button
            onClick={() => onDismiss(segment.id)}
            data-testid={`seg-dismiss-btn-${segment.id}`}
            className="ml-auto flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-secondary/70 transition-all active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
