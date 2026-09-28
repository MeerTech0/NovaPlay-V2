import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Film, Tv, ArrowRight, Sparkles, Calendar } from 'lucide-react';
import { RecommendationItem } from '../../services/novaAI';
import { getPosterUrl } from '../../services/tmdbImage';

interface NovaRecommendationCardProps {
  item: RecommendationItem;
}

export const NovaRecommendationCard: React.FC<NovaRecommendationCardProps> = ({ item }) => {
  const navigate = useNavigate();
  const isMovie = item.mediaType === 'movie';
  const detailUrl = `/${item.mediaType}/${item.id}`;
  const posterSrc = getPosterUrl(item.posterPath, 'w500');

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="group relative flex flex-col sm:flex-row w-full rounded-2xl bg-[#12151D]/90 border border-white/[0.08] hover:border-[var(--nova-accent)]/45 transition-all duration-300 overflow-hidden shadow-lg select-none"
    >
      {/* Poster Media Box */}
      <div
        className="relative sm:w-36 flex-shrink-0 aspect-[2/3] sm:aspect-auto overflow-hidden bg-[#161922] cursor-pointer"
        onClick={() => navigate(detailUrl)}
      >
        <img
          src={posterSrc}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Media Type Indicator */}
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
            {isMovie ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
            <span>{isMovie ? 'Movie' : 'Series'}</span>
          </span>
        </div>
      </div>

      {/* Card Info & Reason */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5 bg-gradient-to-br from-[#12151D] via-[#0F1118] to-[#0A0C10]">
        <div>
          {/* Top Row: Year & Rating */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {item.year && (
                <span className="inline-flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span>{item.year}</span>
                </span>
              )}
              {item.genre && (
                <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] text-zinc-300 text-[10px] font-medium truncate max-w-[140px]">
                  {item.genre}
                </span>
              )}
            </div>

            {item.rating > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--nova-accent)]/15 border border-[var(--nova-accent)]/30 text-[var(--nova-accent)] text-xs font-semibold">
                <Star className="w-3 h-3 fill-[var(--nova-accent)]" />
                <span>{item.rating.toFixed(1)}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h4
            onClick={() => navigate(detailUrl)}
            className="text-base font-bold text-white group-hover:text-[var(--nova-accent)] transition-colors mt-1.5 cursor-pointer line-clamp-1"
          >
            {item.title}
          </h4>

          {/* Short Reason ("Why Nova Recommends This") */}
          <div className="mt-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
            <div className="flex items-start gap-1.5 text-xs text-zinc-300 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-[var(--nova-accent)] flex-shrink-0 mt-0.5" />
              <p className="line-clamp-2 italic font-light text-zinc-300/95">
                "{item.reason}"
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: View Details */}
        <div className="pt-2 flex items-center justify-between border-t border-white/[0.05]">
          <span className="text-[11px] text-zinc-500 font-mono">
            {item.runtime ? `${item.runtime}m runtime` : item.seasons ? `${item.seasons} Seasons` : 'Nova Pick'}
          </span>

          <button
            type="button"
            data-cursor="button"
            onClick={() => navigate(detailUrl)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-[var(--nova-accent)] text-white hover:text-zinc-950 text-xs font-semibold border border-white/[0.1] hover:border-[var(--nova-accent)] transition-all duration-200 shadow-sm active:scale-95"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
