import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Film, Tv, Trash2, Play, Info } from 'lucide-react';
import { MyListItem, removeFromMyList } from '../../services/myList';
import { getPosterUrl } from '../../services/tmdbImage';

interface MyListCardProps {
  item: MyListItem;
  onRemoved?: () => void;
}

export const MyListCard: React.FC<MyListCardProps> = ({ item, onRemoved }) => {
  const navigate = useNavigate();
  const isMovie = item.mediaType === 'movie';
  const detailsUrl = `/${item.mediaType}/${item.id}`;
  const watchUrl = `/watch/${item.mediaType}/${item.id}`;
  const posterUrl = getPosterUrl(item.poster_path, 'w500');

  const rating =
    item.vote_average && item.vote_average > 0 ? item.vote_average.toFixed(1) : null;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromMyList(item.id, item.mediaType);
    onRemoved?.();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={() => navigate(detailsUrl)}
      data-cursor="card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(detailsUrl);
      }}
      className="group relative flex flex-col rounded-2xl bg-[#111319] border border-white/[0.08] hover:border-[var(--nova-accent)]/50 overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 select-none cursor-pointer"
      aria-label={`${item.title} (${item.year || ''}) in My List. Click to view details.`}
    >
      {/* Poster Media Box */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#161922]">
        <img
          src={posterUrl}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-70 group-hover:opacity-90 transition-opacity" />

        {/* Top-Left: Media Type Indicator */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
            {isMovie ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
            <span>{isMovie ? 'Movie' : 'Series'}</span>
          </span>
        </div>

        {/* Top-Right: Quick Remove Button */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <button
            type="button"
            data-cursor="button"
            onClick={handleRemove}
            title="Remove from My List"
            aria-label={`Remove ${item.title} from My List`}
            className="p-1.5 rounded-xl bg-black/75 hover:bg-rose-500/90 text-zinc-300 hover:text-white border border-white/15 hover:border-rose-500 backdrop-blur-md transition-all active:scale-90 shadow-md group/btn"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Rating Badge (Bottom-Left) */}
        {rating && (
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-[var(--nova-accent)]">
              <Star className="w-3 h-3 fill-[var(--nova-accent)]" />
              <span>{rating}</span>
            </span>
          </div>
        )}

        {/* Hover Quick Actions Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-[2px] p-4 z-10">
          <button
            type="button"
            data-cursor="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(detailsUrl);
            }}
            className="w-full max-w-[140px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-lg active:scale-95"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>

          <button
            type="button"
            data-cursor="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(watchUrl, {
                state: {
                  title: item.title,
                  overview: item.overview,
                  backdrop_path: item.backdrop_path,
                  poster_path: item.poster_path,
                },
              });
            }}
            className="w-full max-w-[140px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--nova-accent)] hover:opacity-90 text-zinc-950 text-xs font-semibold transition-all active:scale-95 shadow-md"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Watch</span>
          </button>
        </div>
      </div>

      {/* Card Info Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between bg-gradient-to-b from-[#141720] to-[#0E1017]">
        <div>
          <h3 className="font-semibold text-sm text-white group-hover:text-[var(--nova-accent)] line-clamp-1 transition-colors">
            {item.title}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.06] text-xs font-medium text-zinc-400">
          <span className="font-mono text-[11px]">{item.year || '—'}</span>

          <button
            type="button"
            onClick={handleRemove}
            className="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1"
          >
            <span>Remove</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
