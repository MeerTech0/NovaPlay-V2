import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Star, Bell, Check, Film, Tv, Info, ArrowRight } from 'lucide-react';
import { Movie, TVShow, MediaItem, Genre } from '../../types/media';
import { getPosterUrl } from '../../services/tmdbImage';
import {
  isReminderSet,
  toggleReminder,
  REMINDERS_UPDATED_EVENT,
} from '../../services/reminders';

interface UpcomingCardProps {
  media: Movie | TVShow | MediaItem;
  genresList?: Genre[];
}

export const UpcomingCard: React.FC<UpcomingCardProps> = ({ media, genresList = [] }) => {
  const navigate = useNavigate();

  const isMovie = 'title' in media;
  const mediaType: 'movie' | 'tv' = isMovie ? 'movie' : 'tv';
  const title = 'title' in media ? media.title : media.name;
  const dateStr = 'release_date' in media ? media.release_date : media.first_air_date;

  const [hasReminder, setHasReminder] = useState(() => isReminderSet(media.id, mediaType));

  useEffect(() => {
    const handleUpdate = () => {
      setHasReminder(isReminderSet(media.id, mediaType));
    };

    window.addEventListener(REMINDERS_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(REMINDERS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [media.id, mediaType]);

  const handleToggleReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isAdded = toggleReminder({
      id: media.id,
      mediaType,
      title,
      releaseDate: dateStr,
      poster: media.poster_path,
    });
    setHasReminder(isAdded);
  };

  // Format real release date for badge and text (Do not invent dates)
  const { badgeMonth, badgeDay, fullDate } = useMemo(() => {
    if (!dateStr) {
      return { badgeMonth: 'COMING', badgeDay: 'SOON', fullDate: 'Release Date TBA' };
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return { badgeMonth: 'COMING', badgeDay: 'SOON', fullDate: dateStr };
      }
      return {
        badgeMonth: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        badgeDay: String(d.getDate()).padStart(2, '0'),
        fullDate: d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    } catch {
      return { badgeMonth: 'COMING', badgeDay: 'SOON', fullDate: dateStr };
    }
  }, [dateStr]);

  // Primary Genre name
  const genreName = useMemo(() => {
    if (media.genres && media.genres.length > 0) {
      return media.genres[0].name;
    }
    if (media.genre_ids && media.genre_ids.length > 0 && genresList.length > 0) {
      const found = genresList.find((g) => g.id === media.genre_ids![0]);
      if (found) return found.name;
    }
    return null;
  }, [media, genresList]);

  const posterUrl = getPosterUrl(media.poster_path, 'w500');
  const detailsUrl = `/${mediaType}/${media.id}`;

  const rating =
    media.vote_average && media.vote_average > 0
      ? media.vote_average.toFixed(1)
      : null;

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group relative flex flex-col w-[180px] sm:w-[210px] md:w-[230px] rounded-2xl bg-[#111319] border border-white/[0.08] hover:border-[var(--nova-accent)]/50 transition-all duration-300 overflow-hidden shadow-card hover:shadow-card-hover select-none"
      onClick={() => navigate(detailsUrl)}
      data-cursor="card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(detailsUrl);
      }}
      aria-label={`Upcoming ${mediaType}: ${title}`}
    >
      {/* Poster Media Box */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#161922]">
        <img
          src={posterUrl}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Top-Left: Media Type Indicator */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
            {isMovie ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
            <span>{isMovie ? 'Movie' : 'Series'}</span>
          </span>
        </div>

        {/* Top-Right: Prominent Release Date Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <div className="flex flex-col items-center justify-center px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-md border border-[var(--nova-accent)]/40 shadow-xl text-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--nova-accent)]">
              COMING SOON
            </span>
            <span className="text-xs font-bold font-mono text-white mt-0.5 leading-none">
              {badgeMonth} {badgeDay}
            </span>
          </div>
        </div>

        {/* Rating Badge if available */}
        {rating && (
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-[var(--nova-accent)]">
              <Star className="w-3 h-3 fill-[var(--nova-accent)]" />
              <span>{rating}</span>
            </span>
          </div>
        )}

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex flex-col items-center justify-center gap-2 p-4 z-20">
          {/* Primary View Details Button */}
          <button
            type="button"
            data-cursor="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(detailsUrl);
            }}
            className="w-full max-w-[150px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-lg active:scale-95"
          >
            <Info className="w-3.5 h-3.5" />
            <span>View Details</span>
          </button>

          {/* Remind Me Button */}
          <button
            type="button"
            data-cursor="button"
            onClick={handleToggleReminder}
            className={`w-full max-w-[150px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-md transition-all active:scale-95 ${
              hasReminder
                ? 'bg-[var(--nova-accent)] text-zinc-950 font-semibold border-[var(--nova-accent)]'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
            title={hasReminder ? 'Reminder is set' : 'Notify me on premiere'}
          >
            {hasReminder ? <Check className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            <span>{hasReminder ? 'Reminder Set' : 'Remind Me'}</span>
          </button>
        </div>
      </div>

      {/* Card Info Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between bg-gradient-to-b from-[#141720] to-[#0E1017]">
        <div>
          <h3 className="font-semibold text-sm text-white group-hover:text-[var(--nova-accent)] line-clamp-1 transition-colors">
            {title}
          </h3>

          {/* Release Date Info */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-[var(--nova-accent)] flex-shrink-0" />
            <span className="truncate">{fullDate}</span>
          </div>
        </div>

        {/* Footer Row: Genre pill & Action */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/[0.06] text-xs">
          {genreName ? (
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[11px] text-zinc-400 truncate max-w-[100px]">
              {genreName}
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500 font-mono">Curated Premiere</span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 group-hover:text-[var(--nova-accent)] transition-colors">
            <span>Details</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </motion.div>
  );
};
