/**
 * Official TMDB API Service for NovaPlay
 *
 * Handles API requests, rate-limiting, in-flight deduplication,
 * and memory caching. Credentials are securely loaded via Vite environment variables.
 */

import {
  Movie,
  TVShow,
  MediaItem,
  MediaDetails,
  Genre,
  PaginatedResponse,
  CreditsResponse,
  VideosResponse,
} from '../types/media';
import {
  PLACEHOLDER_HERO,
  PLACEHOLDER_TRENDING,
  PLACEHOLDER_POPULAR_MOVIES,
  PLACEHOLDER_POPULAR_TV,
  PLACEHOLDER_TOP_RATED,
  PLACEHOLDER_UPCOMING_MOVIES,
  PLACEHOLDER_UPCOMING_TV,
  PLACEHOLDER_EXTENDED_MOVIES,
  PLACEHOLDER_EXTENDED_TV,
  PLACEHOLDER_GENRES,
  getPlaceholderDetails,
} from '../data/placeholderData';

export * from './tmdbImage';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Read API credentials from Vite env without hardcoding
const RAW_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TMDB_API_KEY
  ? String(import.meta.env.VITE_TMDB_API_KEY)
  : ''
).trim();
const RAW_ACCESS_TOKEN = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TMDB_ACCESS_TOKEN
  ? String(import.meta.env.VITE_TMDB_ACCESS_TOKEN)
  : ''
).trim();

export const isApiKeyConfigured = Boolean(
  RAW_API_KEY && RAW_API_KEY !== 'YOUR_TMDB_KEY' && RAW_API_KEY.length > 5
);

export const isAccessTokenConfigured = Boolean(
  RAW_ACCESS_TOKEN && RAW_ACCESS_TOKEN !== 'YOUR_TMDB_TOKEN' && RAW_ACCESS_TOKEN.length > 10
);

export const isTMDBConfigured = isApiKeyConfigured || isAccessTokenConfigured;

/**
 * Cache Entry Interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory response cache & in-flight request map for deduplication
const apiCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class TmdbApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'TmdbApiError';
    this.status = status;
  }
}

/**
 * Core TMDB HTTP Client
 * - Deduplicates concurrent requests for the exact same endpoint
 * - Caches successful responses with TTL to avoid rate limit spikes
 */
async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
  ttl = DEFAULT_CACHE_TTL
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  if (isApiKeyConfigured && !RAW_ACCESS_TOKEN) {
    url.searchParams.set('api_key', RAW_API_KEY!);
  }

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const cacheKey = url.toString();

  // 1. Check in-memory cache
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }

  // 2. Check in-flight requests (deduplication)
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  // 3. Perform network fetch
  const fetchPromise = (async () => {
    try {
      if (!isTMDBConfigured) {
        throw new TmdbApiError(
          'TMDB API key is not yet configured or contains the placeholder "YOUR_TMDB_KEY". Add your valid key in .env to access live TMDB data.',
          401
        );
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (isAccessTokenConfigured) {
        headers['Authorization'] = `Bearer ${RAW_ACCESS_TOKEN}`;
      }

      // Add a 6-second timeout to prevent requests from hanging forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(url.toString(), {
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            throw new TmdbApiError(
              'Invalid TMDB API Key. Please verify the VITE_TMDB_API_KEY in your .env file.',
              401
            );
          }
          if (response.status === 429) {
            throw new TmdbApiError(
              'TMDB rate limit reached. Please wait a moment before retrying.',
              429
            );
          }
          throw new TmdbApiError(
            `TMDB API Error (${response.status}): ${response.statusText}`,
            response.status
          );
        }

        const data = await response.json();
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
        return data as T;
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Reusable TMDB API Functions
 */

/**
 * Trending movies & shows (Day or Week)
 */
export async function getTrending(
  timeWindow: 'day' | 'week' = 'week'
): Promise<MediaItem[]> {
  try {
    const data = await tmdbFetch<PaginatedResponse<MediaItem>>(`/trending/all/${timeWindow}`);
    return data.results.filter(
      (item) => item.media_type === 'movie' || item.media_type === 'tv'
    );
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_TRENDING;
    }
    throw err;
  }
}

/**
 * Popular Movies
 */
export async function getPopularMovies(page = 1): Promise<Movie[]> {
  try {
    const data = await tmdbFetch<PaginatedResponse<Movie>>('/movie/popular', {
      page: String(page),
    });
    return data.results.map((m) => ({ ...m, media_type: 'movie' as const }));
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_POPULAR_MOVIES;
    }
    throw err;
  }
}

/**
 * Popular TV Shows
 */
export async function getPopularTV(page = 1): Promise<TVShow[]> {
  try {
    const data = await tmdbFetch<PaginatedResponse<TVShow>>('/tv/popular', {
      page: String(page),
    });
    return data.results.map((t) => ({ ...t, media_type: 'tv' as const }));
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_POPULAR_TV;
    }
    throw err;
  }
}

/**
 * Top Rated Movies
 */
export async function getTopRatedMovies(page = 1): Promise<Movie[]> {
  try {
    const data = await tmdbFetch<PaginatedResponse<Movie>>('/movie/top_rated', {
      page: String(page),
    });
    return data.results.map((m) => ({ ...m, media_type: 'movie' as const }));
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_TOP_RATED;
    }
    throw err;
  }
}

/**
 * Top Rated TV Shows
 */
export async function getTopRatedTV(page = 1): Promise<TVShow[]> {
  try {
    const data = await tmdbFetch<PaginatedResponse<TVShow>>('/tv/top_rated', {
      page: String(page),
    });
    return data.results.map((t) => ({ ...t, media_type: 'tv' as const }));
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_POPULAR_TV;
    }
    throw err;
  }
}

/**
 * Upcoming Movies
 */
export async function getUpcomingMovies(page = 1): Promise<Movie[]> {
  try {
    const data = await tmdbFetch<PaginatedResponse<Movie>>('/movie/upcoming', {
      page: String(page),
    });
    return data.results.map((m) => ({ ...m, media_type: 'movie' as const }));
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_UPCOMING_MOVIES;
    }
    throw err;
  }
}

/**
 * Upcoming TV Shows
 */
export async function getUpcomingTV(page = 1): Promise<TVShow[]> {
  try {
    const data = await tmdbFetch<PaginatedResponse<TVShow>>('/tv/on_the_air', {
      page: String(page),
    });
    return data.results.map((t) => ({ ...t, media_type: 'tv' as const }));
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_UPCOMING_TV;
    }
    throw err;
  }
}

/**
 * Helper to extract age rating/certification from TMDB response
 */
function extractCertification(data: any, type: 'movie' | 'tv'): string | undefined {
  try {
    if (type === 'movie' && data.release_dates?.results) {
      const us = data.release_dates.results.find((r: any) => r.iso_3166_1 === 'US') || data.release_dates.results[0];
      const cert = us?.release_dates?.find((d: any) => d.certification)?.certification;
      if (cert) return cert;
    }
    if (type === 'tv' && data.content_ratings?.results) {
      const us = data.content_ratings.results.find((r: any) => r.iso_3166_1 === 'US') || data.content_ratings.results[0];
      if (us?.rating) return us.rating;
    }
  } catch {
    // Graceful fallback
  }
  return undefined;
}

/**
 * Movie Details
 */
export async function getMovieDetails(id: number | string): Promise<MediaDetails> {
  try {
    const data = await tmdbFetch<any>(`/movie/${id}`, {
      append_to_response: 'credits,videos,similar,recommendations,release_dates',
    });
    return {
      ...data,
      media_type: 'movie',
      title: data.title || data.original_title,
      original_title: data.original_title,
      release_date: data.release_date,
      certification: extractCertification(data, 'movie'),
    };
  } catch (err) {
    console.warn(`TMDB getMovieDetails(${id}) failed or offline; using resilient fallback:`, err);
    return getPlaceholderDetails(Number(id), 'movie');
  }
}

/**
 * TV Details
 */
export async function getTVDetails(id: number | string): Promise<MediaDetails> {
  try {
    const data = await tmdbFetch<any>(`/tv/${id}`, {
      append_to_response: 'credits,videos,similar,recommendations,content_ratings',
    });
    return {
      ...data,
      media_type: 'tv',
      title: data.name || data.original_name,
      original_title: data.original_name,
      release_date: data.first_air_date,
      certification: extractCertification(data, 'tv'),
    };
  } catch (err) {
    console.warn(`TMDB getTVDetails(${id}) failed or offline; using resilient fallback:`, err);
    return getPlaceholderDetails(Number(id), 'tv');
  }
}

/**
 * Movie Credits (Cast & Crew)
 */
export async function getMovieCredits(id: number | string): Promise<CreditsResponse> {
  try {
    return await tmdbFetch<CreditsResponse>(`/movie/${id}/credits`);
  } catch (err) {
    if (!isTMDBConfigured) {
      const details = getPlaceholderDetails(Number(id), 'movie');
      return { id: Number(id), cast: details.credits?.cast || [], crew: details.credits?.crew || [] };
    }
    throw err;
  }
}

/**
 * TV Credits (Cast & Crew)
 */
export async function getTVCredits(id: number | string): Promise<CreditsResponse> {
  try {
    return await tmdbFetch<CreditsResponse>(`/tv/${id}/credits`);
  } catch (err) {
    if (!isTMDBConfigured) {
      const details = getPlaceholderDetails(Number(id), 'tv');
      return { id: Number(id), cast: details.credits?.cast || [], crew: details.credits?.crew || [] };
    }
    throw err;
  }
}

/**
 * Similar Movies
 */
export async function getSimilarMovies(id: number | string, page = 1): Promise<Movie[]> {
  try {
    const data = await tmdbFetch<PaginatedResponse<Movie>>(`/movie/${id}/similar`, {
      page: String(page),
    });
    return data.results.map((m) => ({ ...m, media_type: 'movie' as const }));
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_POPULAR_MOVIES.slice(0, 4);
    }
    throw err;
  }
}

/**
 * Similar TV Shows
 */
export async function getSimilarTV(id: number | string, page = 1): Promise<TVShow[]> {
  try {
    const data = await tmdbFetch<PaginatedResponse<TVShow>>(`/tv/${id}/similar`, {
      page: String(page),
    });
    return data.results.map((t) => ({ ...t, media_type: 'tv' as const }));
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_POPULAR_TV.slice(0, 4);
    }
    throw err;
  }
}

/**
 * Search Multi (Movies & TV Shows)
 */
export async function searchMulti(query: string, page = 1): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const data = await tmdbFetch<PaginatedResponse<any>>('/search/multi', {
      query: trimmed,
      page: String(page),
    });

    const moviesAndTv: MediaItem[] = [];
    data.results.forEach((item: any) => {
      if (item.media_type === 'movie' || item.media_type === 'tv') {
        moviesAndTv.push(item);
      } else if (item.media_type === 'person' && Array.isArray(item.known_for)) {
        item.known_for.forEach((kf: any) => {
          if (kf.media_type === 'movie' || kf.media_type === 'tv') {
            if (!moviesAndTv.some((m) => m.id === kf.id && m.media_type === kf.media_type)) {
              moviesAndTv.push(kf);
            }
          }
        });
      }
    });
    return moviesAndTv;
  } catch (err) {
    if (!isTMDBConfigured) {
      const q = trimmed.toLowerCase();
      const all = [
        ...PLACEHOLDER_TRENDING,
        ...PLACEHOLDER_POPULAR_MOVIES,
        ...PLACEHOLDER_POPULAR_TV,
        ...PLACEHOLDER_TOP_RATED,
        ...PLACEHOLDER_EXTENDED_MOVIES,
        ...PLACEHOLDER_EXTENDED_TV,
        ...PLACEHOLDER_UPCOMING_MOVIES,
      ];

      const matchedGenreIds = PLACEHOLDER_GENRES.filter((g) =>
        g.name.toLowerCase().includes(q)
      ).map((g) => g.id);

      return all.filter((item) => {
        const title = 'title' in item ? item.title : item.name;
        const overview = item.overview || '';
        const hasGenre = item.genre_ids?.some((id) => matchedGenreIds.includes(id));
        return (
          title.toLowerCase().includes(q) ||
          overview.toLowerCase().includes(q) ||
          hasGenre
        );
      });
    }
    throw err;
  }
}

/**
 * Get Genres
 */
export async function getGenres(type: 'movie' | 'tv' = 'movie'): Promise<Genre[]> {
  try {
    const data = await tmdbFetch<{ genres: Genre[] }>(`/genre/${type}/list`, {}, 24 * 60 * 60 * 1000);
    return data.genres;
  } catch (err) {
    if (!isTMDBConfigured) {
      return PLACEHOLDER_GENRES;
    }
    throw err;
  }
}

/**
 * Movie Videos (Trailers, Teasers)
 */
export async function getMovieVideos(id: number | string): Promise<VideosResponse> {
  try {
    return await tmdbFetch<VideosResponse>(`/movie/${id}/videos`);
  } catch (err) {
    if (!isTMDBConfigured) {
      return { id: Number(id), results: [] };
    }
    throw err;
  }
}

/**
 * TV Videos (Trailers, Teasers)
 */
export async function getTVVideos(id: number | string): Promise<VideosResponse> {
  try {
    return await tmdbFetch<VideosResponse>(`/tv/${id}/videos`);
  } catch (err) {
    if (!isTMDBConfigured) {
      return { id: Number(id), results: [] };
    }
    throw err;
  }
}

/**
 * Filter criteria for TMDB Discover & Search operations
 */
export interface DiscoverFilters {
  mediaType?: 'movie' | 'tv';
  genreIds?: number[];
  withOriginalLanguage?: string;
  year?: number;
  yearGte?: number;
  yearLte?: number;
  voteAverageGte?: number;
  withRuntimeLte?: number;
  searchQuery?: string;
  similarToTitle?: string;
  sortBy?: 'popularity.desc' | 'vote_average.desc';
  page?: number;
}

/**
 * Intelligent Media Discovery & Filtering (Used by Nova AI)
 * Queries real TMDB discover/search endpoints or performs intelligent catalog filtration.
 */
export async function discoverMedia(filters: DiscoverFilters = {}): Promise<MediaItem[]> {
  const {
    mediaType,
    genreIds,
    withOriginalLanguage,
    year,
    yearGte,
    yearLte,
    voteAverageGte,
    withRuntimeLte,
    searchQuery,
    similarToTitle,
    sortBy = 'popularity.desc',
    page = 1,
  } = filters;

  // 1. If similar to title requested, find parent title and get similar items
  if (similarToTitle && similarToTitle.trim()) {
    try {
      const candidates = await searchMulti(similarToTitle.trim());
      if (candidates.length > 0) {
        const topMatch = candidates[0];
        const isTv = topMatch.media_type === 'tv';
        const similar = isTv
          ? await getSimilarTV(topMatch.id)
          : await getSimilarMovies(topMatch.id);
        if (similar && similar.length > 0) {
          return [topMatch, ...similar.filter((s) => s.id !== topMatch.id)].slice(0, 6);
        }
        return [topMatch];
      }
    } catch {
      // Continue to next discover strategy
    }
  }

  // 2. If searchQuery provided, run multi-search and apply filters
  if (searchQuery && searchQuery.trim()) {
    try {
      const searchResults = await searchMulti(searchQuery.trim(), page);
      const filtered = searchResults.filter((item) => {
        if (mediaType && item.media_type !== mediaType) return false;
        if (withOriginalLanguage && item.original_language && item.original_language !== withOriginalLanguage) return false;
        if (voteAverageGte && item.vote_average < voteAverageGte) return false;
        if (genreIds && genreIds.length > 0) {
          const itemGenres = item.genre_ids || [];
          const matchesGenre = genreIds.some((g) => itemGenres.includes(g));
          if (!matchesGenre) return false;
        }
        return true;
      });
      return filtered.slice(0, 8);
    } catch {
      return [];
    }
  }

  // 3. Live TMDB Discover API
  if (isTMDBConfigured) {
    const targetType = mediaType || 'movie';
    const endpoint = targetType === 'movie' ? '/discover/movie' : '/discover/tv';
    const params: Record<string, string> = {
      page: String(page),
      sort_by: sortBy,
      'vote_count.gte': '25',
    };

    if (genreIds && genreIds.length > 0) {
      params['with_genres'] = genreIds.join(',');
    }
    if (withOriginalLanguage) {
      params['with_original_language'] = withOriginalLanguage;
    }
    if (year) {
      if (targetType === 'movie') {
        params['primary_release_year'] = String(year);
      } else {
        params['first_air_date_year'] = String(year);
      }
    }
    if (yearGte) {
      const dateKey = targetType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
      params[dateKey] = `${yearGte}-01-01`;
    }
    if (yearLte) {
      const dateKey = targetType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
      params[dateKey] = `${yearLte}-12-31`;
    }
    if (voteAverageGte) {
      params['vote_average.gte'] = String(voteAverageGte);
    }
    if (withRuntimeLte && targetType === 'movie') {
      params['with_runtime.lte'] = String(withRuntimeLte);
    }

    try {
      const data = await tmdbFetch<PaginatedResponse<any>>(endpoint, params);
      return data.results.map((item) => ({
        ...item,
        media_type: targetType,
      }));
    } catch (err) {
      console.warn('Live TMDB discover failed, falling back to local pool:', err);
    }
  }

  // 4. Catalog Filtration Pool (when offline or unconfigured)
  const allMovies: MediaItem[] = [
    ...PLACEHOLDER_POPULAR_MOVIES,
    ...PLACEHOLDER_TOP_RATED,
    ...PLACEHOLDER_EXTENDED_MOVIES,
    ...PLACEHOLDER_TRENDING.filter((item): item is Movie => item.media_type === 'movie'),
    ...PLACEHOLDER_UPCOMING_MOVIES,
  ];

  const allTV: MediaItem[] = [
    ...PLACEHOLDER_POPULAR_TV,
    ...PLACEHOLDER_EXTENDED_TV,
    ...PLACEHOLDER_TRENDING.filter((item): item is TVShow => item.media_type === 'tv'),
    ...PLACEHOLDER_UPCOMING_TV,
  ];

  let candidatePool = mediaType === 'movie'
    ? allMovies
    : mediaType === 'tv'
    ? allTV
    : [...allMovies, ...allTV];

  // Deduplicate by id + media_type
  const seen = new Set<string>();
  candidatePool = candidatePool.filter((item) => {
    const key = `${item.media_type || 'movie'}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Apply filters
  const results = candidatePool.filter((item) => {
    // Language filter
    if (withOriginalLanguage) {
      const itemLang = item.original_language || 'en';
      if (itemLang !== withOriginalLanguage) return false;
    }

    // Genre filter
    if (genreIds && genreIds.length > 0) {
      const itemGenres = item.genre_ids || [];
      const hasGenre = genreIds.some((g) => itemGenres.includes(g));
      if (!hasGenre) return false;
    }

    // Rating filter
    if (voteAverageGte && item.vote_average < voteAverageGte) {
      return false;
    }

    // Runtime filter (for movies)
    if (withRuntimeLte && item.media_type === 'movie') {
      const itemRuntime = 'runtime' in item && typeof item.runtime === 'number' ? item.runtime : null;
      if (itemRuntime && itemRuntime > withRuntimeLte) {
        return false;
      }
    }

    // Year filter
    const dateStr = 'release_date' in item ? item.release_date : item.first_air_date;
    if (dateStr) {
      const itemYear = parseInt(dateStr.slice(0, 4), 10);
      if (year && itemYear !== year) return false;
      if (yearGte && itemYear < yearGte) return false;
      if (yearLte && itemYear > yearLte) return false;
    }

    return true;
  });

  // Sort by rating or popularity
  results.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

  return results.slice(0, 8);
}

/**
 * Dynamically select featured hero item
 */
export async function getHeroItem(): Promise<MediaItem> {
  try {
    const trending = await getTrending('week');
    if (trending && trending.length > 0) {
      // Pick a featured item with a high quality backdrop
      const candidate = trending.find((item) => item.backdrop_path && item.overview) || trending[0];
      return candidate;
    }
    return PLACEHOLDER_HERO;
  } catch {
    return PLACEHOLDER_HERO;
  }
}

/**
 * Unified tmdbService object
 */
export const tmdbService = {
  isConfigured: () => isTMDBConfigured,
  getTrending,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
  getUpcomingMovies,
  getUpcomingTV,
  getMovieDetails,
  getTVDetails,
  getMovieCredits,
  getTVCredits,
  getSimilarMovies,
  getSimilarTV,
  searchMulti,
  discoverMedia,
  getGenres,
  getMovieVideos,
  getTVVideos,
  getHeroItem,
  // Helper for single details resolution
  getDetails: async (id: number | string, type: 'movie' | 'tv'): Promise<MediaDetails> => {
    return type === 'movie' ? getMovieDetails(id) : getTVDetails(id);
  },
};
