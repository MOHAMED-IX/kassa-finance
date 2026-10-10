/**
 * Centralized calendar year range configuration for Kassa Finance.
 * Selection range starts at 2026 (years 2024 and 2025 are excluded from picker selection).
 * Default upper limit is 2035, but users can extend future years (2036, 2037...) as needed.
 */

export const MIN_CALENDAR_YEAR = 2026;
export const DEFAULT_MAX_CALENDAR_YEAR = 2035;
export const MAX_CALENDAR_YEAR = DEFAULT_MAX_CALENDAR_YEAR;

/**
 * Retrieve UID-scoped or guest max calendar year preference from localStorage.
 */
export function getLocalMaxCalendarYear(userId?: string): number {
  if (typeof window === 'undefined') return DEFAULT_MAX_CALENDAR_YEAR;
  try {
    const key =
      userId && userId.trim()
        ? `kassa_max_calendar_year_${userId.trim()}`
        : 'kassa_max_calendar_year_guest';
    const val = localStorage.getItem(key);
    if (val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= DEFAULT_MAX_CALENDAR_YEAR && parsed <= 2100) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading max calendar year', e);
  }
  return DEFAULT_MAX_CALENDAR_YEAR;
}

/**
 * Save UID-scoped or guest max calendar year preference to localStorage.
 */
export function saveLocalMaxCalendarYear(maxYear: number, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key =
      userId && userId.trim()
        ? `kassa_max_calendar_year_${userId.trim()}`
        : 'kassa_max_calendar_year_guest';
    localStorage.setItem(key, String(maxYear));
  } catch (e) {
    console.warn('Error saving max calendar year', e);
  }
}

/**
 * Generate array of years from MIN_CALENDAR_YEAR (2026) up to specified maxYear.
 */
export function getAvailableCalendarYears(maxYear: number = DEFAULT_MAX_CALENDAR_YEAR): number[] {
  const safeMax = Math.max(MIN_CALENDAR_YEAR, maxYear);
  return Array.from(
    { length: safeMax - MIN_CALENDAR_YEAR + 1 },
    (_, index) => MIN_CALENDAR_YEAR + index
  );
}

export const AVAILABLE_YEARS: number[] = getAvailableCalendarYears(DEFAULT_MAX_CALENDAR_YEAR);
