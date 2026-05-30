import { ThumbsUp, ThumbsDown, Plus, Minus, Briefcase, User } from 'lucide-react';
import { FeedbackType } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  onFeedback: (type: FeedbackType) => void;
  className?: string;
}

export const FeedbackButtons = ({ onFeedback, className }: Props) => {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <button 
        onClick={() => onFeedback('more_like_this')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md text-xs font-medium transition-colors active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" /> More like this
      </button>
      <button 
        onClick={() => onFeedback('less_like_this')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md text-xs font-medium transition-colors active:scale-95"
      >
        <Minus className="w-3.5 h-3.5" /> Less like this
      </button>
      <button 
        onClick={() => onFeedback('important_for_work')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md text-xs font-medium transition-colors active:scale-95"
      >
        <Briefcase className="w-3.5 h-3.5" /> Work
      </button>
      <button 
        onClick={() => onFeedback('personal_curiosity')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md text-xs font-medium transition-colors active:scale-95"
      >
        <User className="w-3.5 h-3.5" /> Personal
      </button>
    </div>
  );
};
