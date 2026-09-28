import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, X, Tv, Film } from 'lucide-react';
import {
  ContinueWatchingItem,
  formatRemainingTime,
  getResumeUrl,
} from '../../services/continueWatching';

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onRemove: (id: string | number, type: 'movie' | 'tv') => void;
}

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({
  item,
  onRemove,
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(getResumeUrl(item), {
      state: {
        title: item.title,
        poster_path: item.poster,
        backdrop_path: item.backdrop,
      },
    });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(item.id, item.mediaType);
  };

  const remainingText = formatRemainingTime(
    item.currentPlaybackPosition,
    item.totalDuration
  );

  const isTV = item.mediaType === 'tv';
  const episodeTag = isTV
    ? `S${item.seasonNumber || 1} • E${item.episodeNumber || 1}`
    : null;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="group relative flex-none w-[290px] sm:w-[330px] md:w-[360px] h-[120px] sm:h-[130px] rounded-2xl bg-gradient-to-br from-[#151821] to-[#0E1017] border border-white/[0.08] hover:border-[var(--nova-accent)]/40 p-2.5 sm:p-3 flex items-center gap-3 cursor-pointer shadow-card hover:shadow-card-hover overflow-hidden transition-all select-none"
      onClick={handleCardClick}
      data-cursor="card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`Resume watching ${item.title}`}
    >
      {/* Background ambient accent glow on card hover */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--nova-accent)]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[var(--nova-accent)]/10 transition-colors" />

      {/* Poster Thumbnail */}
      <div className="relative flex-none w-[72px] sm:w-[78px] h-full rounded-xl overflow-hidden bg-black/50 border border-white/10 shadow-md">
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-[#161922]">
            {isTV ? <Tv className="w-6 h-6" /> : <Film className="w-6 h-6" />}
          </div>
        )}

        {/* Small Play overlay badge on thumbnail */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-[var(--nova-accent)] text-zinc-950 flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform">
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Content Info & Progress Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5 relative z-10">
        <div>
          {/* Header Row: Title & Remove button */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-white group-hover:text-[var(--nova-accent)] transition-colors truncate">
              {item.title}
            </h3>

            {/* Small Remove button */}
            <button
              type="button"
              onClick={handleRemove}
              data-cursor="button"
              className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors opacity-70 group-hover:opacity-100 flex-shrink-0"
              aria-label={`Remove ${item.title} from Continue Watching`}
              title="Remove from Continue Watching"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subtitle / Season info */}
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400 font-mono">
            {isTV ? (
              <span className="text-zinc-300 font-semibold">{episodeTag}</span>
            ) : (
              <span className="text-zinc-400">{remainingText}</span>
            )}
            {isTV && item.episodeTitle && (
              <span className="truncate text-zinc-500 text-[11px] max-w-[120px]">
                • {item.episodeTitle}
              </span>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-1.5 pt-1">
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--nova-accent)] shadow-sm transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(3, item.percentageWatched))}%` }}
            />
          </div>

          {/* Time & Percentage stats / Action */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="font-mono text-zinc-400 font-medium">
              {isTV ? remainingText : `${item.percentageWatched}% watched`}
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--nova-accent)] group-hover:underline">
              <span>Resume</span>
              <Play className="w-2.5 h-2.5 fill-current" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
