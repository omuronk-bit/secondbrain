import { cn } from '../../lib/utils';

interface Props {
  relevance: number;
  novelty: number;
  importance: number;
  className?: string;
}

export const ScoreDisplay = ({ relevance, novelty, importance, className }: Props) => {
  return (
    <div className={cn("flex items-center gap-2 text-xs font-mono text-muted-foreground", className)}>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        R: {relevance.toFixed(2)}
      </span>
      <span className="opacity-50">|</span>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
        N: {novelty.toFixed(2)}
      </span>
      <span className="opacity-50">|</span>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        I: {importance.toFixed(2)}
      </span>
    </div>
  );
};
