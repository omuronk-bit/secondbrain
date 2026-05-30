import { Podcast, Youtube, FileText, Mail, FileIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ContentType } from '../../types';

interface Props {
  type: ContentType | string;
  className?: string;
}

export const ContentIcon = ({ type, className }: Props) => {
  const cls = cn('shrink-0', className);
  switch (type) {
    case 'podcast':    return <Podcast    className={cls} />;
    case 'youtube':    return <Youtube    className={cls} />;
    case 'article':    return <FileText   className={cls} />;
    case 'newsletter': return <Mail       className={cls} />;
    default:           return <FileIcon   className={cls} />;
  }
};

export const CONTENT_TYPE_COLORS: Record<string, string> = {
  podcast:    'text-violet-500 bg-violet-500/10',
  youtube:    'text-rose-500   bg-rose-500/10',
  article:    'text-sky-500    bg-sky-500/10',
  newsletter: 'text-amber-500  bg-amber-500/10',
};

export const ContentTypeBadge = ({ type }: { type: string }) => (
  <span className={cn(
    'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0',
    CONTENT_TYPE_COLORS[type] ?? 'bg-muted text-muted-foreground'
  )}>
    <ContentIcon type={type} className="w-3 h-3" />
    {type}
  </span>
);
