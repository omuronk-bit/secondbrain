import { ReactNode } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Bookmark, X } from 'lucide-react';

const haptic = () => {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* unsupported */
  }
};

// Swipe a card right to Save, left to Dismiss. The action surfaces appear behind
// the card as it drags; crossing the threshold fires the callback + a haptic tick.
export function Swipeable({
  onSwipeRight,
  onSwipeLeft,
  children,
}: {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  children: ReactNode;
}) {
  const controls = useAnimationControls();
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center justify-between px-5 rounded-xl overflow-hidden pointer-events-none">
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
          <Bookmark className="w-4 h-4 fill-current" /> Save
        </span>
        <span className="flex items-center gap-1.5 text-rose-500 font-bold text-sm">
          Dismiss <X className="w-4 h-4" />
        </span>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        animate={controls}
        onDragEnd={(_e, info) => {
          if (info.offset.x > 96) {
            haptic();
            onSwipeRight?.();
          } else if (info.offset.x < -96) {
            haptic();
            onSwipeLeft?.();
          }
          controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 38 } });
        }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}
