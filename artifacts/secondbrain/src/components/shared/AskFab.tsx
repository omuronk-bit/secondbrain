import { useLocation } from 'wouter';
import { Sparkles } from 'lucide-react';

// Floating "ask from anywhere" button. Hidden on /ask (redundant) and /today
// (Today already has the ask hero, and the FAB overlapped the carry-over controls).
export function AskFab() {
  const [loc, navigate] = useLocation();
  if (loc.startsWith('/ask') || loc.startsWith('/today')) return null;
  return (
    <button
      onClick={() => navigate('/ask')}
      aria-label="Ask your second brain"
      className="fixed right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 md:hidden"
      style={{ bottom: 'calc(60px + env(safe-area-inset-bottom) + 14px)' }}
    >
      <Sparkles className="w-5 h-5" />
    </button>
  );
}
