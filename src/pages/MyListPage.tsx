import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Bookmark, Film, Tv, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import { getMyList, clearMyList, MyListItem, MY_LIST_UPDATED_EVENT } from '../services/myList';
import { MyListCard } from '../components/media/MyListCard';

export const MyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MyListItem[]>(() => getMyList());
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');

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

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return items;
    return items.filter((item) => item.mediaType === filterType);
  }, [items, filterType]);

  const movieCount = useMemo(
    () => items.filter((i) => i.mediaType === 'movie').length,
    [items]
  );
  const tvCount = useMemo(
    () => items.filter((i) => i.mediaType === 'tv').length,
    [items]
  );

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your entire watchlist?')) {
      clearMyList();
      refreshList();
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F8FAFC] pt-24 sm:pt-28 pb-20 selection:bg-[var(--nova-accent)]/20 selection:text-[var(--nova-accent)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--nova-accent)]/15 border border-[var(--nova-accent)]/30 text-[var(--nova-accent)] shadow-sm">
                <Bookmark className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-display text-white">
                My List
              </h1>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
              Manage your saved movies and TV shows for easy access and binge watching
            </p>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-3">
              {/* Category Filter Tabs */}
              <div className="flex items-center bg-[#111319] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  data-cursor="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterType === 'all'
                      ? 'bg-[var(--nova-accent)] text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  data-cursor="button"
                  onClick={() => setFilterType('movie')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterType === 'movie'
                      ? 'bg-[var(--nova-accent)] text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Movies ({movieCount})</span>
                </button>
                <button
                  type="button"
                  data-cursor="button"
                  onClick={() => setFilterType('tv')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterType === 'tv'
                      ? 'bg-[var(--nova-accent)] text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Series ({tvCount})</span>
                </button>
              </div>

              {/* Clear All Trigger */}
              <button
                type="button"
                data-cursor="button"
                onClick={handleClearAll}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 text-xs font-medium transition-colors"
                title="Clear all saved titles"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="pt-8">
          {items.length === 0 ? (
            /* Empty State: No Items Saved */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="py-16 sm:py-24 max-w-md mx-auto text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 text-zinc-500">
                <Bookmark className="w-8 h-8 text-zinc-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                Your list is empty
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Explore movies and television series, and use <strong className="text-[var(--nova-accent)]">+ My List</strong> to save titles you want to watch later.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  data-cursor="button"
                  onClick={() => navigate('/movies')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-95"
                >
                  <Film className="w-4 h-4" />
                  <span>Browse Movies</span>
                </button>
                <button
                  type="button"
                  data-cursor="button"
                  onClick={() => navigate('/tv')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 font-semibold text-xs sm:text-sm transition-all active:scale-95"
                >
                  <Tv className="w-4 h-4" />
                  <span>Explore TV Series</span>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.06] w-full">
                <Link
                  to="/nova-ai"
                  className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-[var(--nova-accent)] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--nova-accent)]" />
                  <span>Need inspiration? Ask Nova AI for personalized recommendations</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          ) : filteredItems.length === 0 ? (
            /* Filter Category Empty */
            <div className="py-16 text-center">
              <p className="text-zinc-400 text-sm">
                No {filterType === 'movie' ? 'movies' : 'series'} in your list.
              </p>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className="mt-3 text-xs text-[var(--nova-accent)] hover:underline font-medium"
              >
                View all saved titles
              </button>
            </div>
          ) : (
            /* Populated Grid */
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <MyListCard
                    key={`page-mylist-${item.mediaType}-${item.id}`}
                    item={item}
                    onRemoved={refreshList}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
