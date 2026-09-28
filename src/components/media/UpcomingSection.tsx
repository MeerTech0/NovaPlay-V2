import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Film, Tv } from 'lucide-react';
import { Movie, TVShow, Genre } from '../../types/media';
import { tmdbService } from '../../services/tmdb';
import { UpcomingCard } from './UpcomingCard';

interface UpcomingSectionProps {
  genresList?: Genre[];
}

export const UpcomingSection: React.FC<UpcomingSectionProps> = ({ genresList = [] }) => {
  const [activeTab, setActiveTab] = useState<'movie' | 'tv'>('movie');
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [upcomingTV, setUpcomingTV] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchUpcoming = async () => {
      try {
        setLoading(true);
        const [movies, tv] = await Promise.all([
          tmdbService.getUpcomingMovies(),
          tmdbService.getUpcomingTV(),
        ]);
        if (!isMounted) return;
        setUpcomingMovies(movies);
        setUpcomingTV(tv);
      } catch (err) {
        console.warn('Could not load upcoming releases:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUpcoming();
    return () => {
      isMounted = false;
    };
  }, []);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  const currentItems = activeTab === 'movie' ? upcomingMovies : upcomingTV;

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [currentItems, activeTab]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!loading && upcomingMovies.length === 0 && upcomingTV.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="py-8 sm:py-10 relative z-20"
      aria-label="Coming Soon Releases"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5 sm:mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[var(--nova-accent)]" />
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--nova-accent)]" />
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                  Coming Soon
                </h2>
              </div>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400 pl-3.5">
              Anticipated theatrical premieres and upcoming television broadcasts
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            {/* Category Toggle Tabs */}
            <div className="flex items-center bg-[#111319] p-1 rounded-xl border border-white/[0.08] shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('movie')}
                data-cursor="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'movie'
                    ? 'bg-[var(--nova-accent)] text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Upcoming Movies</span>
                {upcomingMovies.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'movie' ? 'bg-black/20 text-zinc-950' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {upcomingMovies.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tv')}
                data-cursor="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'tv'
                    ? 'bg-[var(--nova-accent)] text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Upcoming TV</span>
                {upcomingTV.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'tv' ? 'bg-black/20 text-zinc-950' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {upcomingTV.length}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop Carousel Navigation Controls */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll coming soon left"
                data-cursor="button"
                className={`p-2 rounded-full border transition-all ${
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
                aria-label="Scroll coming soon right"
                data-cursor="button"
                className={`p-2 rounded-full border transition-all ${
                  canScrollRight
                    ? 'bg-white/[0.05] text-white hover:bg-white/[0.1] border-white/10 active:scale-95'
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
          aria-label="Coming Soon carousel"
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`skel-up-${i}`}
                className="flex-none w-[180px] sm:w-[210px] md:w-[230px] rounded-2xl bg-[#111319] border border-white/[0.06] p-3 animate-pulse space-y-3"
              >
                <div className="aspect-[2/3] w-full rounded-xl bg-white/[0.04]" />
                <div className="h-4 w-3/4 rounded bg-white/[0.05]" />
                <div className="h-3 w-1/2 rounded bg-white/[0.03]" />
              </div>
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {currentItems.map((item) => (
                <div key={`upcoming-${activeTab}-${item.id}`} className="flex-none snap-start">
                  <UpcomingCard media={item} genresList={genresList} />
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.section>
  );
};
