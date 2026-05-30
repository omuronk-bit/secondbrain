import { useEffect, useRef, useState } from 'react';
import { Play, Pause, X, CheckCircle, ChevronUp } from 'lucide-react';
import { Segment } from '../../types';
import { cn } from '../../lib/utils';

function parseTimeToSeconds(t: string): number {
  const parts = t.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export type FeedbackKey = 'useful' | 'wrongWindow' | 'tooBasic' | 'moreLikeThis' | 'lessLikeThis';

interface Props {
  segment: Segment;
  itemTitle: string;
  onClose: () => void;
  onMarkConsumed: (segmentId: string, feedback: Partial<Record<FeedbackKey, boolean>>) => void;
}

export const PlayerBar = ({ segment, itemTitle, onClose, onMarkConsumed }: Props) => {
  const startSec = parseTimeToSeconds(segment.startTime);
  const endSec = parseTimeToSeconds(segment.endTime);
  const durationSec = Math.max(endSec - startSec, 1);

  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const [feedback, setFeedback] = useState<Partial<Record<FeedbackKey, boolean>>>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when segment changes
  useEffect(() => {
    setElapsed(0);
    setIsPlaying(true);
    setShowFeedback(false);
    setConsumed(false);
    setFeedback({});
    setFeedbackSubmitted(false);
  }, [segment.id]);

  useEffect(() => {
    if (isPlaying && !consumed) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= durationSec) {
            setIsPlaying(false);
            return durationSec;
          }
          return e + 0.5;
        });
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, consumed, durationSec]);

  const progress = Math.min((elapsed / durationSec) * 100, 100);
  const currentTime = formatSeconds(startSec + elapsed);
  const endTime = formatSeconds(endSec);

  const handleMarkConsumed = () => {
    setConsumed(true);
    setIsPlaying(false);
    setShowFeedback(true);
  };

  const toggleFeedback = (key: FeedbackKey) => {
    setFeedback(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmitFeedback = () => {
    onMarkConsumed(segment.id, feedback);
    setFeedbackSubmitted(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-40 shadow-2xl" data-testid="player-bar">
      {/* Feedback panel */}
      {showFeedback && !feedbackSubmitted && (
        <div className="bg-card border-t border-x border-border/80 mx-0 px-4 py-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Segment feedback</p>
            <button
              onClick={() => setShowFeedback(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="feedback-collapse"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'useful' as FeedbackKey, label: 'Useful' },
              { key: 'wrongWindow' as FeedbackKey, label: 'Wrong time window' },
              { key: 'tooBasic' as FeedbackKey, label: 'Too basic' },
              { key: 'moreLikeThis' as FeedbackKey, label: 'More like this' },
              { key: 'lessLikeThis' as FeedbackKey, label: 'Less like this' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleFeedback(key)}
                data-testid={`feedback-${key}`}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95",
                  feedback[key]
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/70"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmitFeedback}
            data-testid="feedback-submit"
            className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95"
          >
            Submit feedback
          </button>
        </div>
      )}

      {feedbackSubmitted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-900/40 px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Marked as consumed. Feedback recorded.</p>
        </div>
      )}

      {/* Player strip */}
      <div className="bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          {/* play/pause */}
          <button
            onClick={() => !consumed && setIsPlaying(p => !p)}
            data-testid="player-playpause"
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95",
              consumed
                ? "bg-emerald-500 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {consumed
              ? <CheckCircle className="w-4 h-4" />
              : isPlaying
                ? <Pause className="w-4 h-4" />
                : <Play className="w-4 h-4 ml-0.5" />
            }
          </button>

          {/* info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">{segment.title}</p>
            <p className="text-xs text-muted-foreground truncate">{itemTitle}</p>
          </div>

          {/* mark consumed */}
          {!consumed && (
            <button
              onClick={handleMarkConsumed}
              data-testid="mark-consumed-btn"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-all active:scale-95 shrink-0"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Done
            </button>
          )}

          {/* close */}
          <button
            onClick={onClose}
            data-testid="player-close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* progress bar */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="w-10 text-right">{currentTime}</span>
          <div
            className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden cursor-pointer"
            data-testid="player-progress"
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-10">{endTime}</span>
        </div>

        {/* time window label */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <span className="font-mono px-1.5 py-0.5 bg-secondary rounded text-[10px]">
            {segment.startTime}–{segment.endTime}
          </span>
          <span className="truncate max-w-[200px]">{itemTitle}</span>
        </div>
      </div>
    </div>
  );
};
