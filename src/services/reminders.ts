/**
 * Reminders Service for NovaPlay
 * Manages local user notifications and preferences for upcoming movies & TV shows.
 */

export interface ReminderItem {
  id: string | number;
  mediaType: 'movie' | 'tv';
  title: string;
  releaseDate?: string;
  poster?: string | null;
  createdAt: number;
}

const REMINDERS_KEY = 'novaplay_reminders';
export const REMINDERS_UPDATED_EVENT = 'novaplay_reminders_updated';

/**
 * Get all saved reminders
 */
export function getReminders(): ReminderItem[] {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Check if a reminder is active for a title
 */
export function isReminderSet(id: string | number, mediaType: 'movie' | 'tv'): boolean {
  const reminders = getReminders();
  const idStr = String(id);
  return reminders.some((r) => String(r.id) === idStr && r.mediaType === mediaType);
}

/**
 * Toggle reminder for an upcoming title
 * Returns true if reminder was added, false if removed
 */
export function toggleReminder(item: {
  id: string | number;
  mediaType: 'movie' | 'tv';
  title: string;
  releaseDate?: string;
  poster?: string | null;
}): boolean {
  try {
    const idStr = String(item.id);
    const reminders = getReminders();
    const exists = reminders.some((r) => String(r.id) === idStr && r.mediaType === item.mediaType);

    let updated: ReminderItem[];
    let isAdded = false;

    if (exists) {
      updated = reminders.filter(
        (r) => !(String(r.id) === idStr && r.mediaType === item.mediaType)
      );
    } else {
      updated = [
        ...reminders,
        {
          id: item.id,
          mediaType: item.mediaType,
          title: item.title,
          releaseDate: item.releaseDate,
          poster: item.poster,
          createdAt: Date.now(),
        },
      ];
      isAdded = true;
    }

    localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(REMINDERS_UPDATED_EVENT, { detail: { id: item.id, isAdded } }));
    }

    return isAdded;
  } catch (err) {
    console.warn('Failed to toggle reminder:', err);
    return false;
  }
}
