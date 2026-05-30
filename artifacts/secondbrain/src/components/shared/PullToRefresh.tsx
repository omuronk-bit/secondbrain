import { ReactNode, useRef, useState } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

// Lightweight pull-to-refresh: when the page is scrolled to the top and the user
// drags down past a threshold, run onRefresh. Native scroll is left untouched.
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);

  const atTop = () =>
    (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) <= 0;

  function onTouchStart(e: React.TouchEvent) {
    if (!refreshing && atTop()) {
      startY.current = e.touches[0].clientY;
      active.current = true;
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!active.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && atTop()) setPull(Math.min(dy * 0.5, 72));
    else active.current = false;
  }
  async function onTouchEnd() {
    if (!active.current) return;
    active.current = false;
    if (pull > 52) {
      setRefreshing(true);
      setPull(36);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }

  const ready = pull > 52;
  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ overscrollBehaviorY: 'contain' }}>
      <div
        className="flex items-center justify-center text-muted-foreground overflow-hidden transition-[height] duration-150"
        style={{ height: refreshing ? 36 : pull }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : pull > 4 ? (
          <ArrowDown className={`w-5 h-5 transition-transform ${ready ? 'rotate-180 text-primary' : ''}`} />
        ) : null}
      </div>
      {children}
    </div>
  );
}
