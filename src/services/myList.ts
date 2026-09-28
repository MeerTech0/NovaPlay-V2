/**
 * Centralized My List (Watchlist) Service for NovaPlay
 * Stores user saved titles locally in localStorage with duplicate prevention,
 * event-driven cross-component reactivity, and migration support.
 */

export interface MyListItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  year?: string;
  genre_ids?: number[];
  overview?: string;
  addedAt: string;
}

const STORAGE_KEY = 'novaplay_my_list_v1';
const LEGACY_STORAGE_KEY = 'novaplay_watchlist';

export const MY_LIST_UPDATED_EVENT = 'novaplay_my_list_updated';

function notifyChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MY_LIST_UPDATED_EVENT));
  }
}

/**
 * Retrieve all items in My List, migrating legacy items if present
 */
export function getMyList(): MyListItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: MyListItem[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }

    // Check legacy watchlist
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (Array.isArray(legacy) && legacy.length > 0) {
        const migrated: MyListItem[] = legacy.map((item: any) => ({
          id: Number(item.id),
          mediaType: (item.type || item.mediaType || 'movie') === 'tv' ? 'tv' : 'movie',
          title: item.title || item.name || 'Untitled',
          poster_path: item.poster_path || null,
          backdrop_path: item.backdrop_path || null,
          vote_average: typeof item.vote_average === 'number' ? item.vote_average : 0,
          addedAt: item.addedAt || new Date().toISOString(),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch (err) {
    console.warn('Failed to parse My List from localStorage:', err);
  }

  return [];
}

/**
 * Check if a title is currently saved in My List
 */
export function isInMyList(id: number | string, mediaType: 'movie' | 'tv'): boolean {
  const list = getMyList();
  const numId = Number(id);
  return list.some((item) => item.id === numId && item.mediaType === mediaType);
}

/**
 * Add a title to My List (Strictly prevents duplicates)
 */
export function addToMyList(item: Omit<MyListItem, 'addedAt'>): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const list = getMyList();
    const numId = Number(item.id);

    // Prevent duplicate entries
    const existingIndex = list.findIndex(
      (entry) => entry.id === numId && entry.mediaType === item.mediaType
    );

    if (existingIndex !== -1) {
      return false; // Already in list
    }

    const dateStr = item.release_date || item.first_air_date;
    const year = item.year || (dateStr ? dateStr.slice(0, 4) : '');

    const newItem: MyListItem = {
      ...item,
      id: numId,
      year,
      addedAt: new Date().toISOString(),
    };

    const updated = [newItem, ...list];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Keep legacy key in sync for backward compatibility
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify(
        updated.map((i) => ({
          id: i.id,
          type: i.mediaType,
          title: i.title,
          poster_path: i.poster_path,
          vote_average: i.vote_average,
          addedAt: i.addedAt,
        }))
      )
    );

    notifyChange();
    return true;
  } catch (err) {
    console.error('Error adding to My List:', err);
    return false;
  }
}

/**
 * Remove an item from My List
 */
export function removeFromMyList(id: number | string, mediaType: 'movie' | 'tv'): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const list = getMyList();
    const numId = Number(id);
    const updated = list.filter((item) => !(item.id === numId && item.mediaType === mediaType));

    if (updated.length === list.length) {
      return false; // Not found
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify(
        updated.map((i) => ({
          id: i.id,
          type: i.mediaType,
          title: i.title,
          poster_path: i.poster_path,
          vote_average: i.vote_average,
          addedAt: i.addedAt,
        }))
      )
    );

    notifyChange();
    return true;
  } catch (err) {
    console.error('Error removing from My List:', err);
    return false;
  }
}

/**
 * Toggle an item in My List (adds if missing, removes if present)
 * Returns true if added, false if removed
 */
export function toggleMyList(item: Omit<MyListItem, 'addedAt'>): boolean {
  if (isInMyList(item.id, item.mediaType)) {
    removeFromMyList(item.id, item.mediaType);
    return false;
  } else {
    addToMyList(item);
    return true;
  }
}

/**
 * Clear all items in My List
 */
export function clearMyList(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    notifyChange();
  } catch (err) {
    console.error('Error clearing My List:', err);
  }
}
