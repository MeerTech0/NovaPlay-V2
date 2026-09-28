import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Check, ChevronDown, CheckCircle2 } from 'lucide-react';
import { TVSeason, TVEpisode } from '../../services/videoProvider';
import { getBackdropUrl } from '../../services/tmdbImage';

interface EpisodeListSectionProps {
  showId: number | string;
  seasons: TVSeason[];
  selectedSeasonNumber: number;
  selectedEpisodeNumber: number;
  onSelectSeason: (seasonNumber: number) => void;
  onSelectEpisode: (episodeNumber: number) => void;
  episodeProgressMap: Record<string, number>;
  fallbackBackdropPath?: string | null;
  fallbackPosterPath?: string | null;
}

export const EpisodeListSection: React.FC<EpisodeListSectionProps> = ({
  showId,
  seasons,
  selectedSeasonNumber,
  selectedEpisodeNumber,
  onSelectSeason,
  onSelectEpisode,
  episodeProgressMap,
  fallbackBackdropPath,
  fallbackPosterPath,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSeason = seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0];
  const episodes = currentSeason?.episodes || [];

  return (
    <div className="pt-8 border-t border-white/[0.08] space-y-6 select-none">
      {/* 1. HEADER & COMPACT GLASS SEASON DROPDOWN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Section Title & Season Meta */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-4 rounded-full bg-purple-500" />
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
              Episodes
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-zinc-400 pl-4 font-mono">
            <span className="text-white font-medium">Season {selectedSeasonNumber}</span>
            <span className="text-zinc-600">•</span>
            <span>{episodes.length} Episodes</span>
          </div>
        </div>

        {/* Right: Compact Glass Season Selector Dropdown */}
        {seasons.length > 1 && (
          <div ref={dropdownRef} className="relative self-start sm:self-auto">
            <button
              type="button"
              data-cursor="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              className="inline-flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-[#12141C]/90 hover:bg-[#181B26] border border-white/[0.1] hover:border-purple-500/50 backdrop-blur-md text-xs sm:text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
            >
              <span className="font-mono">Season {selectedSeasonNumber}</span>
              <ChevronDown
                className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Glass Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-48 rounded-xl bg-[#0E1017]/95 border border-white/[0.12] backdrop-blur-2xl shadow-2xl z-40 py-1.5 overflow-hidden"
                  role="listbox"
                >
                  <div className="max-h-60 overflow-y-auto scrollbar-none py-1">
                    {seasons.map((season) => {
                      const isSelected = season.seasonNumber === selectedSeasonNumber;
                      return (
                        <button
                          key={`season-opt-${season.seasonNumber}`}
                          type="button"
                          data-cursor="button"
                          onClick={() => {
                            onSelectSeason(season.seasonNumber);
                            onSelectEpisode(1);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-purple-500/15 text-purple-300 font-semibold'
                              : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <span>Season {season.seasonNumber}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 2. COMPACT VERTICAL EPISODES LIST */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.04,
            },
          },
        }}
        className="flex flex-col rounded-2xl bg-[#0B0D12]/60 border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden shadow-2xl backdrop-blur-sm"
      >
        {episodes.map((ep: TVEpisode) => {
          const isCurrent = ep.episodeNumber === selectedEpisodeNumber;
          const progressKey = `${showId}-s${selectedSeasonNumber}-e${ep.episodeNumber}`;
          const progressVal = episodeProgressMap[progressKey] || 0;
          const isFinished = progressVal >= 90;
          const isPartiallyWatched = progressVal > 0 && !isFinished;

          // Thumbnail URL: Episode still, with fallback to series backdrop or poster
          const thumbUrl = getBackdropUrl(
            ep.stillPath || fallbackBackdropPath || fallbackPosterPath,
            'w300'
          );

          // 2-digit formatted episode index
          const formattedIndex = String(ep.episodeNumber).padStart(2, '0');

          return (
            <motion.div
              key={`ep-row-${ep.id}`}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={() => onSelectEpisode(ep.episodeNumber)}
              data-cursor="button"
              className={`group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 transition-all duration-200 cursor-pointer ${
                isCurrent
                  ? 'bg-gradient-to-r from-purple-950/35 via-[#131520] to-[#0D0F16] border-l-4 border-l-purple-500 shadow-sm'
                  : 'hover:bg-white/[0.03]'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSelectEpisode(ep.episodeNumber);
              }}
            >
              {/* Index Column: [01] */}
              <div
                className={`hidden sm:flex w-7 flex-shrink-0 items-center justify-center font-mono text-xs sm:text-sm transition-colors ${
                  isCurrent ? 'text-purple-400 font-bold' : 'text-zinc-500 group-hover:text-zinc-300'
                }`}
              >
                {formattedIndex}
              </div>

              {/* Compact 16:9 Thumbnail (120–140px on mobile, ~140-160px on desktop) */}
              <div className="relative w-[120px] sm:w-[145px] md:w-[160px] aspect-[16/9] flex-shrink-0 rounded-lg overflow-hidden bg-[#151822] border border-white/[0.08] group-hover:border-purple-500/40 transition-colors shadow-md">
                <img
                  src={thumbUrl}
                  alt={ep.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Mobile Index Badge (Overlay) */}
                <div className="sm:hidden absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-zinc-300 border border-white/10">
                  {formattedIndex}
                </div>

                {/* Center Hover Play Icon / Playing Equalizer Indicator */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-black/35 opacity-100'
                      : 'bg-black/40 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                      isCurrent
                        ? 'bg-purple-500 text-white scale-100'
                        : 'bg-white/90 text-zinc-950 group-hover:scale-110'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Thumbnail Progress Bar for Continue Watching */}
                {isPartiallyWatched && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/70">
                    <div
                      className="h-full bg-purple-500 shadow-sm transition-all"
                      style={{ width: `${progressVal}%` }}
                    />
                  </div>
                )}
                {isFinished && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/80" />
                )}
              </div>

              {/* Content & Metadata Column */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                      isCurrent
                        ? 'text-purple-300 font-bold'
                        : 'text-white group-hover:text-purple-200'
                    }`}
                  >
                    {ep.title}
                  </h3>

                  {/* Active Playing Badge */}
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-mono text-purple-300 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      <span>Playing</span>
                    </span>
                  )}

                  {/* Finished Check Badge */}
                  {isFinished && !isCurrent && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400"
                      title="Completed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Watched</span>
                    </span>
                  )}
                </div>

                {/* Metadata & Progress Row */}
                <div className="flex items-center gap-2.5 mt-1 text-[11px] sm:text-xs text-zinc-400 font-mono">
                  <span>{ep.runtime || 55} min</span>

                  {/* Continue Watching Progress Text (e.g. ━━━━━━━━━━ 62%) */}
                  {isPartiallyWatched && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-400 font-semibold">{progressVal}% watched</span>
                        <span className="hidden md:inline-block text-purple-400/60 font-mono">
                          {'━'.repeat(Math.min(10, Math.max(3, Math.round(progressVal / 10))))}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Compact Description (1–2 lines) */}
                <p className="text-xs text-zinc-400 line-clamp-1 sm:line-clamp-2 mt-1 leading-relaxed">
                  {ep.overview}
                </p>
              </div>

              {/* Right Action: Play Chevron / Icon */}
              <div className="hidden sm:flex items-center justify-center w-8 flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
                      : 'text-zinc-600 group-hover:text-purple-400 group-hover:bg-white/[0.06]'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
