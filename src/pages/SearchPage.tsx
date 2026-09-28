import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Film,
  Tv,
  Star,
  Sparkles,
  ChevronDown,
  RotateCcw,
  Compass,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { MovieCard } from '../components/media/MovieCard';
import { MovieCardSkeleton } from '../components/feedback/SkeletonLoaders';
import { tmdbService, getPosterUrl } from '../services/tmdb';
import { MediaItem, Genre, Movie, TVShow } from '../types/media';

interface SuggestionItem {
  id: number;
  type: 'movie' | 'tv' | 'genre';
  title: string;
  year?: string;
  rating?: number;
  posterPath?: string | null;
  genreId?: number;
}

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();

  // Search input & results state
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState<MediaItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Suggestions typeahead panel state
  const [suggestions, setSuggestions] = useState<{
    movies: SuggestionItem[];
    tvShows: SuggestionItem[];
    genres: SuggestionItem[];
  }>({ movies: [], tvShows: [], genres: [] });
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Filter States
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedGenreId, setSelectedGenreId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Sorting State
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'release_date'>('popularity');

  // Available genres
  const [genresList, setGenresList] = useState<Genre[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load available genres on mount
  useEffect(() => {
    let isMounted = true;
    const fetchGenres = async () => {
      try {
        const [movieG, tvG] = await Promise.all([
          tmdbService.getGenres('movie'),
          tmdbService.getGenres('tv'),
        ]);
        if (!isMounted) return;
        // Merge & deduplicate genres
        const map = new Map<number, Genre>();
        [...movieG, ...tvG].forEach((g) => map.set(g.id, g));
        setGenresList(Array.from(map.values()));
      } catch (err) {
        console.warn('Could not load genres for search filter:', err);
      }
    };
    fetchGenres();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close suggestion panel when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSuggestionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Main search operation (using existing TMDB service)
  const performSearch = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setRawResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const data = await tmdbService.searchMulti(trimmed);
      setRawResults(data);
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err?.message || 'Failed to complete search query.');
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search trigger & suggestions population
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setRawResults([]);
      setSuggestions({ movies: [], tvShows: [], genres: [] });
      setIsSuggestionOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      // 1. Run main search query
      performSearch(trimmed);

      // 2. Build categorized suggestions for the typeahead panel
      try {
        const previewResults = await tmdbService.searchMulti(trimmed);

        const movieSuggestions: SuggestionItem[] = previewResults
          .filter((item): item is Movie => item.media_type === 'movie' || 'title' in item)
          .slice(0, 3)
          .map((item) => ({
            id: item.id,
            type: 'movie',
            title: item.title,
            year: item.release_date ? item.release_date.slice(0, 4) : undefined,
            rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
            posterPath: item.poster_path,
          }));

        const tvSuggestions: SuggestionItem[] = previewResults
          .filter((item): item is TVShow => item.media_type === 'tv' || 'name' in item)
          .slice(0, 3)
          .map((item) => ({
            id: item.id,
            type: 'tv',
            title: item.name,
            year: item.first_air_date ? item.first_air_date.slice(0, 4) : undefined,
            rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
            posterPath: item.poster_path,
          }));

        const qLower = trimmed.toLowerCase();
        const genreSuggestions: SuggestionItem[] = genresList
          .filter((g) => g.name.toLowerCase().includes(qLower))
          .slice(0, 3)
          .map((g) => ({
            id: g.id,
            type: 'genre',
            title: g.name,
            genreId: g.id,
          }));

        setSuggestions({
          movies: movieSuggestions,
          tvShows: tvSuggestions,
          genres: genreSuggestions,
        });

        const hasAny =
          movieSuggestions.length > 0 ||
          tvSuggestions.length > 0 ||
          genreSuggestions.length > 0;
        setIsSuggestionOpen(hasAny);
        setHighlightedIndex(-1);
      } catch (err) {
        console.warn('Suggestion preview error:', err);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, performSearch, genresList]);

  // Flatten suggestions for linear keyboard navigation
  const flattenedSuggestions = useMemo(() => {
    return [
      ...suggestions.movies,
      ...suggestions.tvShows,
      ...suggestions.genres,
    ];
  }, [suggestions]);

  // Keyboard navigation handler (Arrow Up, Arrow Down, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionOpen || flattenedSuggestions.length === 0) {
      if (e.key === 'Enter') {
        setIsSuggestionOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < flattenedSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : flattenedSuggestions.length - 1
      );
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSuggestionOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < flattenedSuggestions.length) {
        handleSelectSuggestion(flattenedSuggestions[highlightedIndex]);
      } else {
        setIsSuggestionOpen(false);
      }
    }
  };

  const handleSelectSuggestion = (suggestion: SuggestionItem) => {
    setIsSuggestionOpen(false);
    if (suggestion.type === 'genre' && suggestion.genreId) {
      setSelectedGenreId(String(suggestion.genreId));
      setQuery('');
    } else {
      navigate(`/${suggestion.type}/${suggestion.id}`);
    }
  };

  // Filter & Sort Pipeline
  const filteredAndSortedResults = useMemo(() => {
    let list = [...rawResults];

    // 1. Movie / TV Filter
    if (filterType !== 'all') {
      list = list.filter((item) => {
        const isMovie = item.media_type === 'movie' || 'title' in item;
        return filterType === 'movie' ? isMovie : !isMovie;
      });
    }

    // 2. Genre Filter
    if (selectedGenreId !== 'all') {
      const gId = parseInt(selectedGenreId, 10);
      list = list.filter((item) => {
        if (item.genre_ids && item.genre_ids.includes(gId)) return true;
        if (item.genres && item.genres.some((g) => g.id === gId)) return true;
        return false;
      });
    }

    // 3. Year Filter
    if (selectedYear !== 'all') {
      list = list.filter((item) => {
        const dateStr = 'release_date' in item ? item.release_date : item.first_air_date;
        if (!dateStr) return false;
        const year = parseInt(dateStr.slice(0, 4), 10);
        if (isNaN(year)) return false;

        if (selectedYear === '2026') return year === 2026;
        if (selectedYear === '2025') return year === 2025;
        if (selectedYear === '2024') return year === 2024;
        if (selectedYear === '2023') return year === 2023;
        if (selectedYear === '2022') return year === 2022;
        if (selectedYear === '2021') return year === 2021;
        if (selectedYear === '2020') return year === 2020;
        if (selectedYear === '2010s') return year >= 2010 && year <= 2019;
        if (selectedYear === '2000s') return year >= 2000 && year <= 2009;
        if (selectedYear === '1990s') return year >= 1990 && year <= 1999;
        if (selectedYear === 'classic') return year < 1990;
        return true;
      });
    }

    // 4. Rating Filter
    if (selectedRating !== 'all') {
      const minRating = parseFloat(selectedRating);
      if (!isNaN(minRating)) {
        list = list.filter((item) => (item.vote_average || 0) >= minRating);
      }
    }

    // 5. Language Filter
    if (selectedLanguage !== 'all') {
      list = list.filter((item) => {
        const lang = item.original_language || 'en';
        return lang.toLowerCase() === selectedLanguage.toLowerCase();
      });
    }

    // 6. Sorting
    list.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      if (sortBy === 'release_date') {
        const dateA = 'release_date' in a ? a.release_date : a.first_air_date;
        const dateB = 'release_date' in b ? b.release_date : b.first_air_date;
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        return timeB - timeA;
      }
      // Default: Popularity
      const popA = a.popularity || a.vote_count || 0;
      const popB = b.popularity || b.vote_count || 0;
      return popB - popA;
    });

    return list;
  }, [
    rawResults,
    filterType,
    selectedGenreId,
    selectedYear,
    selectedRating,
    selectedLanguage,
    sortBy,
  ]);

  const hasActiveFilters =
    filterType !== 'all' ||
    selectedGenreId !== 'all' ||
    selectedYear !== 'all' ||
    selectedRating !== 'all' ||
    selectedLanguage !== 'all' ||
    sortBy !== 'popularity';

  const resetAllFilters = () => {
    setFilterType('all');
    setSelectedGenreId('all');
    setSelectedYear('all');
    setSelectedRating('all');
    setSelectedLanguage('all');
    setSortBy('popularity');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-20 min-h-[80vh] selection:bg-[var(--nova-accent)]/20 selection:text-[var(--nova-accent)]"
    >
      {/* 1. SEARCH INPUT & INSTANT SUGGESTION PANEL */}
      <div ref={searchContainerRef} className="max-w-3xl mx-auto mb-6 relative z-30">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-5 h-5 text-[var(--nova-accent)]" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (flattenedSuggestions.length > 0) setIsSuggestionOpen(true);
            }}
            placeholder="Search movies, TV shows, genres, or cast..."
            autoFocus
            className="w-full pl-12 sm:pl-14 pr-12 py-4 rounded-2xl bg-[#111319]/90 border border-white/[0.12] focus:border-[var(--nova-accent)]/60 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--nova-accent)]/20 transition-all text-sm sm:text-base shadow-2xl backdrop-blur-xl"
            aria-label="Search movies, TV shows, and cast"
            aria-autocomplete="list"
            aria-expanded={isSuggestionOpen}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              data-cursor="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Compact Typeahead Suggestion Panel */}
        <AnimatePresence>
          {isSuggestionOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute left-0 right-0 mt-2 rounded-2xl bg-[#0E1017]/95 border border-white/[0.12] backdrop-blur-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/[0.06]"
              role="listbox"
            >
              {/* Movies Group */}
              {suggestions.movies.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-1.5 px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    <Film className="w-3.5 h-3.5 text-[var(--nova-accent)]" />
                    <span>Movies</span>
                  </div>
                  <div className="space-y-1">
                    {suggestions.movies.map((item) => {
                      const itemIndex = flattenedSuggestions.indexOf(item);
                      const isHighlighted = itemIndex === highlightedIndex;
                      const thumb = getPosterUrl(item.posterPath, 'w92');

                      return (
                        <div
                          key={`sugg-movie-${item.id}`}
                          onClick={() => handleSelectSuggestion(item)}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-white/[0.1] text-white border-l-2 border-[var(--nova-accent)]'
                              : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                          role="option"
                          aria-selected={isHighlighted}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/10">
                              <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold truncate">{item.title}</p>
                              <span className="text-[11px] text-zinc-400 font-mono">{item.year || 'Film'}</span>
                            </div>
                          </div>
                          {item.rating !== undefined && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--nova-accent)] font-mono flex-shrink-0 pl-2">
                              <Star className="w-3 h-3 fill-[var(--nova-accent)]" />
                              <span>{item.rating}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TV Shows Group */}
              {suggestions.tvShows.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-1.5 px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    <Tv className="w-3.5 h-3.5 text-purple-400" />
                    <span>TV Series</span>
                  </div>
                  <div className="space-y-1">
                    {suggestions.tvShows.map((item) => {
                      const itemIndex = flattenedSuggestions.indexOf(item);
                      const isHighlighted = itemIndex === highlightedIndex;
                      const thumb = getPosterUrl(item.posterPath, 'w92');

                      return (
                        <div
                          key={`sugg-tv-${item.id}`}
                          onClick={() => handleSelectSuggestion(item)}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-white/[0.1] text-white border-l-2 border-purple-400'
                              : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                          role="option"
                          aria-selected={isHighlighted}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/10">
                              <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold truncate">{item.title}</p>
                              <span className="text-[11px] text-zinc-400 font-mono">{item.year || 'Series'}</span>
                            </div>
                          </div>
                          {item.rating !== undefined && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--nova-accent)] font-mono flex-shrink-0 pl-2">
                              <Star className="w-3 h-3 fill-[var(--nova-accent)]" />
                              <span>{item.rating}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matching Genres Group */}
              {suggestions.genres.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-1.5 px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    <Compass className="w-3.5 h-3.5 text-blue-400" />
                    <span>Explore Genres</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {suggestions.genres.map((g) => {
                      const itemIndex = flattenedSuggestions.indexOf(g);
                      const isHighlighted = itemIndex === highlightedIndex;
                      return (
                        <button
                          key={`sugg-genre-${g.id}`}
                          type="button"
                          onClick={() => handleSelectSuggestion(g)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isHighlighted
                              ? 'bg-[var(--nova-accent)] text-zinc-950 font-semibold'
                              : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white'
                          }`}
                        >
                          {g.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer hint */}
              <div className="px-4 py-2 bg-black/40 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
                <span>Use ↑ ↓ to navigate, Enter to select, Esc to close</span>
                <span className="hidden sm:inline">Press Enter to view all results</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. FILTERS & SORTING CONTROLS */}
      <div className="max-w-4xl mx-auto mb-8 bg-[#111319]/70 border border-white/[0.08] p-4 sm:p-5 rounded-2xl backdrop-blur-md shadow-lg space-y-4">
        {/* Top Filter Row: Type Switcher & Sort Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Media Type Pills */}
          <div className="flex items-center bg-[#0B0D12] p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto">
            <button
              type="button"
              data-cursor="button"
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-[var(--nova-accent)] text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              data-cursor="button"
              onClick={() => setFilterType('movie')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'movie'
                  ? 'bg-[var(--nova-accent)] text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movies</span>
            </button>
            <button
              type="button"
              data-cursor="button"
              onClick={() => setFilterType('tv')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'tv'
                  ? 'bg-[var(--nova-accent)] text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV Shows</span>
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <span className="text-zinc-400 font-mono hidden sm:inline">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort search results"
                className="appearance-none bg-[#0B0D12] text-zinc-200 border border-white/[0.1] hover:border-white/[0.2] pl-3 pr-8 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--nova-accent)] cursor-pointer"
              >
                <option value="popularity">Popularity (Most Popular)</option>
                <option value="rating">Rating (Highest Rated)</option>
                <option value="release_date">Release Date (Newest)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Detailed Secondary Filters Row: Genre, Year, Rating, Language */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/[0.06]">
          {/* Genre Filter */}
          <div className="relative">
            <label htmlFor="search-genre-filter" className="block text-[10px] uppercase font-mono text-zinc-500 mb-1 pl-1">
              Genre
            </label>
            <select
              id="search-genre-filter"
              value={selectedGenreId}
              onChange={(e) => setSelectedGenreId(e.target.value)}
              className="w-full appearance-none bg-[#0B0D12] text-zinc-200 border border-white/[0.08] hover:border-white/[0.15] pl-3 pr-8 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--nova-accent)] cursor-pointer truncate"
            >
              <option value="all">All Genres</option>
              {genresList.map((g) => (
                <option key={`genre-opt-${g.id}`} value={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-7 pointer-events-none" />
          </div>

          {/* Year Filter */}
          <div className="relative">
            <label htmlFor="search-year-filter" className="block text-[10px] uppercase font-mono text-zinc-500 mb-1 pl-1">
              Release Year
            </label>
            <select
              id="search-year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full appearance-none bg-[#0B0D12] text-zinc-200 border border-white/[0.08] hover:border-white/[0.15] pl-3 pr-8 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--nova-accent)] cursor-pointer"
            >
              <option value="all">All Years</option>
              <option value="2026">2026 Releases</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
              <option value="2010s">2010 – 2019</option>
              <option value="2000s">2000 – 2009</option>
              <option value="1990s">1990 – 1999</option>
              <option value="classic">Classics (Pre-1990)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-7 pointer-events-none" />
          </div>

          {/* Rating Filter */}
          <div className="relative">
            <label htmlFor="search-rating-filter" className="block text-[10px] uppercase font-mono text-zinc-500 mb-1 pl-1">
              Minimum Rating
            </label>
            <select
              id="search-rating-filter"
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="w-full appearance-none bg-[#0B0D12] text-zinc-200 border border-white/[0.08] hover:border-white/[0.15] pl-3 pr-8 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--nova-accent)] cursor-pointer"
            >
              <option value="all">All Ratings</option>
              <option value="8.0">8.0+ ⭐ Exceptional</option>
              <option value="7.0">7.0+ ⭐ High Quality</option>
              <option value="6.0">6.0+ ⭐ Good</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-7 pointer-events-none" />
          </div>

          {/* Language Filter */}
          <div className="relative">
            <label htmlFor="search-language-filter" className="block text-[10px] uppercase font-mono text-zinc-500 mb-1 pl-1">
              Language
            </label>
            <select
              id="search-language-filter"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full appearance-none bg-[#0B0D12] text-zinc-200 border border-white/[0.08] hover:border-white/[0.15] pl-3 pr-8 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--nova-accent)] cursor-pointer"
            >
              <option value="all">All Languages</option>
              <option value="en">English (en)</option>
              <option value="ko">Korean (ko)</option>
              <option value="ja">Japanese (ja)</option>
              <option value="hi">Hindi (hi)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
              <option value="de">German (de)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-7 pointer-events-none" />
          </div>
        </div>

        {/* Active Filters Clear Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs">
            <span className="text-zinc-400 text-[11px] font-mono">
              Filtered to {filteredAndSortedResults.length} matching titles
            </span>
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--nova-accent)] hover:underline font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. RESULTS OR EMPTY STATE */}
      {query || hasActiveFilters ? (
        <div>
          {/* Status Header */}
          <div className="flex items-center justify-between mb-6 border-b border-white/[0.06] pb-3">
            <h2 className="text-sm font-medium text-zinc-400">
              {searching ? (
                `Searching TMDB for "${query}"...`
              ) : (
                <span>
                  Showing <strong className="text-white">{filteredAndSortedResults.length}</strong> title
                  {filteredAndSortedResults.length === 1 ? '' : 's'}
                  {query && (
                    <span>
                      {' '}
                      for "<span className="text-[var(--nova-accent)]">{query}</span>"
                    </span>
                  )}
                </span>
              )}
            </h2>
          </div>

          {searchError ? (
            <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center max-w-lg mx-auto">
              <p className="text-sm text-red-300 mb-3">{searchError}</p>
              <button
                type="button"
                onClick={() => performSearch(query)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.1] hover:bg-white/[0.15] text-white text-xs font-medium border border-white/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Search</span>
              </button>
            </div>
          ) : searching ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <MovieCardSkeleton key={`search-skel-${i}`} />
              ))}
            </div>
          ) : filteredAndSortedResults.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6"
            >
              {filteredAndSortedResults.map((item) => (
                <MovieCard key={`search-item-${item.media_type || 'm'}-${item.id}`} media={item} />
              ))}
            </motion.div>
          ) : (
            /* No Results Fallback */
            <div className="text-center py-20 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No titles matched your query</h3>
              <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                Try adjusting your filters, searching for an actor, or explore suggested titles like "Dune", "Batman", "Severance", or "Interstellar".
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--nova-accent)] text-zinc-950 text-xs font-semibold shadow-md transition-all active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Default Empty State / Suggested Searches & Discovery */
        <div className="text-center py-12 sm:py-20 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--nova-accent)]/20 to-[var(--nova-accent)]/5 border border-[var(--nova-accent)]/30 flex items-center justify-center mx-auto text-[var(--nova-accent)] mb-4 shadow-lg shadow-[var(--nova-accent)]/10">
            <Search className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white mb-2">
            Explore the Cinema Universe
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6 max-w-lg mx-auto">
            Search across thousands of movies, television series, awards nominees, and actors in real-time.
          </p>

          {/* Quick Suggested Searches */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
              Trending Searches
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Batman', 'Dune: Part Two', 'Interstellar', 'Shōgun', 'Breaking Bad', 'Severance', 'Parasite'].map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <TrendingUp className="w-3 h-3 text-[var(--nova-accent)]" />
                    <span>{s}</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Nova AI Helper Banner */}
          <div className="mt-10 p-4 rounded-2xl bg-[#111319]/80 border border-white/[0.08] flex items-center justify-between text-left max-w-lg mx-auto shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--nova-accent)]/15 border border-[var(--nova-accent)]/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[var(--nova-accent)]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Looking for something specific?</p>
                <p className="text-[11px] text-zinc-400">Ask Nova AI in plain words or Roman Urdu.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/nova-ai')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--nova-accent)] text-zinc-950 font-semibold text-xs transition-transform active:scale-95"
            >
              <span>Ask AI</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
