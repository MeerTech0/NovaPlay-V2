import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ContinueWatchingItem,
  getContinueWatchingList,
  removeContinueWatching,
  CONTINUE_WATCHING_EVENT,
} from '../../services/continueWatching';
import { ContinueWatchingCard } from './ContinueWatchingCard';

export const ContinueWatchingSection: React.FC = () => {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const loadItems = () => {
    const list = getContinueWatchingList();
    setItems(list);
  };

  useEffect(() => {
    loadItems();

    const handleUpdate = () => {
      loadItems();
    };

    window.addEventListener(CONTINUE_WATCHING_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(CONTINUE_WATCHING_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleRemove = (id: string | number, type: 'movie' | 'tv') => {
    removeContinueWatching(id, type);
    setItems((prev) => prev.filter((i) => !(String(i.id) === String(id) && i.mediaType === type)));
  };

  // Only show this section when the user actually has watch history
  if (items.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="py-6 sm:py-8 relative z-20"
      aria-label="Continue Watching"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-4 rounded-full bg-[var(--nova-accent)]" />
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-[var(--nova-accent)]" />
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display">
                Continue Watching
              </h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
              ({items.length} in progress)
            </span>
          </div>

          {/* Desktop Carousel Scroll Controls */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll continue watching left"
              data-cursor="button"
              className={`p-1.5 rounded-full border transition-all ${
                canScrollLeft
                  ? 'bg-white/[0.05] text-white hover:bg-white/[0.1] border-white/10 active:scale-95'
                  : 'text-zinc-600 bg-transparent border-white/[0.03] cursor-not-allowed opacity-30'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll continue watching right"
              data-cursor="button"
              className={`p-1.5 rounded-full border transition-all ${
                canScrollRight
                  ? 'bg-white/[0.05] text-white hover:bg-white/[0.1] border-white/10 active:scale-95'
                  : 'text-zinc-600 bg-transparent border-white/[0.03] cursor-not-allowed opacity-30'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel / Row Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x focus:outline-none"
          tabIndex={0}
          role="region"
          aria-label="Continue Watching carousel"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={`cw-${item.mediaType}-${item.id}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="snap-start"
              >
                <ContinueWatchingCard item={item} onRemove={handleRemove} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
};
