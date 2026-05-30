import { Segment } from '../../types';
import { RecommendationBadge } from '../shared/RecommendationBadge';
import { Play } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  segment: Segment;
  itemTitle?: string;
  compact?: boolean;
  onPlay?: (segment: Segment) => void;
}

export const SegmentCard = ({ segment, itemTitle, compact = false, onPlay }: Props) => {
  return (
    <div className="bg-card border rounded-lg p-3 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-primary/10 text-primary rounded shrink-0">
            {segment.startTime}-{segment.endTime}
          </span>
          <h4 className="font-semibold text-sm line-clamp-1">{segment.title}</h4>
        </div>
        {!compact && <RecommendationBadge action={segment.recommendedAction} />}
      </div>
      
      {itemTitle && (
        <p className="text-xs text-muted-foreground truncate">From: {itemTitle}</p>
      )}
      
      <p className="text-xs italic text-muted-foreground line-clamp-2 border-l-2 border-border pl-2">
        "{segment.transcriptExcerpt}"
      </p>

      {!compact && onPlay && (
        <div className="pt-2">
          <button 
            onClick={() => onPlay(segment)}
            className="flex items-center justify-center w-full gap-1.5 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded text-xs font-medium transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Play Segment
          </button>
        </div>
      )}
    </div>
  );
};
