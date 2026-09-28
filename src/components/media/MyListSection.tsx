import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { getMyList, MyListItem, MY_LIST_UPDATED_EVENT } from '../../services/myList';
import { MyListCard } from './MyListCard';

export const MyListSection: React.FC = () => {
  const [items, setItems] = useState<MyListItem[]>(() => getMyList());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const refreshList = () => {
    setItems(getMyList());
  };

  useEffect(() => {
    window.addEventListener(MY_LIST_UPDATED_EVENT, refreshList);
    window.addEventListener('storage', refreshList);

    return () => {
      window.removeEventListener(MY_LIST_UPDATED_EVENT, refreshList);
      window.removeEventListener('storage', refreshList);
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

  // Only show section if user has saved titles
  if (items.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
      className="py-6 sm:py-8 relative z-20"
      aria-label="My List Collection"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Controls */}
        <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[var(--nova-accent)]" />
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[var(--nova-accent)]" />
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
                  My List
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300">
                  {items.length}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400 pl-3.5">
              Your saved collection of movies and television series
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/my-list"
              data-cursor="hover"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-400 hover:text-[var(--nova-accent)] transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Desktop Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                data-cursor="button"
                className={`p-2 rounded-full border transition-all ${
                  canScrollLeft
                    ? 'bg-white/[0.06] text-white hover:bg-white/[0.12] border-white/10 active:scale-95'
                    : 'text-zinc-600 bg-transparent border-white/[0.03] cursor-not-allowed opacity-30'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                data-cursor="button"
                className={`p-2 rounded-full border transition-all ${
                  canScrollRight
                    ? 'bg-white/[0.06] text-white hover:bg-white/[0.12] border-white/10 active:scale-95'
                    : 'text-zinc-600 bg-transparent border-white/[0.03] cursor-not-allowed opacity-30'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel / Swipe Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x focus:outline-none"
          tabIndex={0}
          role="region"
          aria-label="My List carousel"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <div
                key={`home-mylist-${item.mediaType}-${item.id}`}
                className="flex-none w-[170px] sm:w-[200px] md:w-[220px] snap-start"
              >
                <MyListCard item={item} onRemoved={refreshList} />
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
};
