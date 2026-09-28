/**
 * Continue Watching Service for NovaPlay
 * Manages playback progress, automatic history persistence, and auto-cleanup.
 */

export interface ContinueWatchingItem {
  id: string | number;
  mediaType: 'movie' | 'tv';
  title: string;
  poster: string | null;
  backdrop?: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  currentPlaybackPosition: number; // in seconds
  totalDuration: number; // in seconds
  percentageWatched: number; // 0 - 100
  lastWatched: number; // unix timestamp in ms
}

const STORAGE_KEY = 'novaplay_continue_watching';
const HISTORY_KEY = 'novaplay_watch_history';
export const CONTINUE_WATCHING_EVENT = 'novaplay_continue_watching_updated';

/**
 * Format remaining time in a user-friendly cinematic format:
 * e.g., "42 min remaining", "1h 15m remaining", "5 min remaining"
 */
export function formatRemainingTime(currentSeconds: number, totalSeconds: number): string {
  const remaining = Math.max(0, totalSeconds - currentSeconds);
  const minutes = Math.floor(remaining / 60);

  if (minutes < 1) {
    return 'Less than a min remaining';
  }

  if (minutes < 60) {
    return `${minutes} min remaining`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m remaining` : `${hours}h remaining`;
}

/**
 * Get all Continue Watching items ordered by latest watched
 */
export function getContinueWatchingList(): ContinueWatchingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: ContinueWatchingItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // Sort descending by lastWatched
    return list.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
  } catch (err) {
    console.warn('Failed to read continue watching from localStorage:', err);
    return [];
  }
}

/**
 * Get single item by media ID and type
 */
export function getContinueWatchingItem(
  mediaId: string | number,
  mediaType: 'movie' | 'tv'
): ContinueWatchingItem | null {
  const list = getContinueWatchingList();
  const idStr = String(mediaId);
  return list.find((item) => String(item.id) === idStr && item.mediaType === mediaType) || null;
}

/**
 * Save or update a continue watching entry
 * Auto Cleanup:
 * If an item reaches 90% or higher completion, remove it from Continue Watching
 * and archive it in Watch History.
 */
export function saveContinueWatching(
  data: Omit<ContinueWatchingItem, 'lastWatched' | 'percentageWatched'> & {
    currentPlaybackPosition: number;
    totalDuration: number;
  }
): void {
  try {
    const currentPos = Math.max(0, data.currentPlaybackPosition || 0);
    const totalDur = Math.max(60, data.totalDuration || 1800); // minimum default duration fallback
    const percentage = Math.min(100, Math.round((currentPos / totalDur) * 100));

    const idStr = String(data.id);
    let list = getContinueWatchingList();

    // AUTO CLEANUP: 90% or higher is considered completed
    if (percentage >= 90) {
      // Remove from continue watching
      list = list.filter((item) => !(String(item.id) === idStr && item.mediaType === data.mediaType));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

      // Move to completed watch history
      archiveToHistory({
        ...data,
        percentageWatched: percentage,
        lastWatched: Date.now(),
      });

      dispatchUpdateEvent();
      return;
    }

    // Prepare updated item
    const updatedItem: ContinueWatchingItem = {
      ...data,
      id: data.id,
      mediaType: data.mediaType,
      currentPlaybackPosition: currentPos,
      totalDuration: totalDur,
      percentageWatched: Math.max(1, percentage),
      lastWatched: Date.now(),
    };

    // Remove previous entry if exists
    const filtered = list.filter(
      (item) => !(String(item.id) === idStr && item.mediaType === data.mediaType)
    );

    // Insert at front
    filtered.unshift(updatedItem);

    // Keep max 20 continue watching items
    const trimmed = filtered.slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    dispatchUpdateEvent();
  } catch (err) {
    console.warn('Failed to save continue watching progress:', err);
  }
}

/**
 * Archive finished item into Watch History
 */
function archiveToHistory(item: ContinueWatchingItem): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: ContinueWatchingItem[] = raw ? JSON.parse(raw) : [];
    const idStr = String(item.id);
    const filtered = history.filter(
      (h) => !(String(h.id) === idStr && h.mediaType === item.mediaType)
    );
    filtered.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch {
    // Ignore history archiving errors
  }
}

/**
 * Remove an item from Continue Watching
 */
export function removeContinueWatching(mediaId: string | number, mediaType?: 'movie' | 'tv'): void {
  try {
    const idStr = String(mediaId);
    let list = getContinueWatchingList();
    list = list.filter((item) => {
      if (mediaType) {
        return !(String(item.id) === idStr && item.mediaType === mediaType);
      }
      return String(item.id) !== idStr;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    dispatchUpdateEvent();
  } catch (err) {
    console.warn('Failed to remove continue watching item:', err);
  }
}

/**
 * Clear all continue watching history
 */
export function clearAllContinueWatching(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    dispatchUpdateEvent();
  } catch {
    // Ignore
  }
}

/**
 * Generate watch page resume route URL
 */
export function getResumeUrl(item: ContinueWatchingItem): string {
  const time = Math.max(0, Math.floor(item.currentPlaybackPosition || 0));
  if (item.mediaType === 'tv') {
    const s = item.seasonNumber || 1;
    const e = item.episodeNumber || 1;
    return `/watch/tv/${item.id}?s=${s}&e=${e}&t=${time}`;
  }
  return `/watch/movie/${item.id}?t=${time}`;
}

/**
 * Notify components of state changes
 */
function dispatchUpdateEvent(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONTINUE_WATCHING_EVENT));
  }
}
