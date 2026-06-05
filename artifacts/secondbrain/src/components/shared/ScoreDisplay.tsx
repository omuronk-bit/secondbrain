import { cn } from '../../lib/utils';

interface Props {
  relevance: number;
  novelty: number;
  importance: number;
  className?: string;
}

// The three sub-scores are all derived from one overall score, so showing
// "R / N / I" as three identical cryptic numbers was just noise. Surface a
// single, human value instead.
export const ScoreDisplay = ({ relevance, novelty, importance, className }: Props) => {
  const pct = Math.round(Math.max(relevance, novelty, importance) * 100);
  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
      <span className="font-medium">{pct}% relevant</span>
    </div>
  );
};
