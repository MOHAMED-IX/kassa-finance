import { Expense, MonthRecord } from '../types/finance';
import { MIN_CALENDAR_YEAR, MAX_CALENDAR_YEAR } from './calendarRange';

export interface ActiveMonthSelection {
  month: number;
  year: number;
}

function isValidDateSelection(month?: number, year?: number): boolean {
  return (
    typeof month === 'number' &&
    month >= 1 &&
    month <= 12 &&
    typeof year === 'number' &&
    year >= MIN_CALENDAR_YEAR &&
    year <= MAX_CALENDAR_YEAR
  );
}

/**
 * Retrieve saved local active month preference from localStorage.
 * When userId is provided, it is strictly scoped to that user and will NEVER
 * fall back to a shared global key belonging to another user.
 */
export function getSavedLocalActiveMonth(userId?: string): ActiveMonthSelection | null {
  if (typeof window === 'undefined') return null;

  try {
    if (userId && userId.trim()) {
      const userSaved = localStorage.getItem(`kassa_active_month_year_${userId.trim()}`);
      if (userSaved) {
        const parsed = JSON.parse(userSaved);
        if (isValidDateSelection(parsed.month, parsed.year)) {
          return { month: parsed.month, year: parsed.year };
        }
      }
      // Strictly isolated: do NOT fall back to any other user's or global key
      return null;
    }

    // Guest fallback
    const guestSaved = localStorage.getItem('kassa_active_month_year_guest');
    if (guestSaved) {
      const parsed = JSON.parse(guestSaved);
      if (isValidDateSelection(parsed.month, parsed.year)) {
        return { month: parsed.month, year: parsed.year };
      }
    }
  } catch (e) {
    console.warn('Error reading saved active month from localStorage', e);
  }

  return null;
}

/**
 * Save active month preference to localStorage.
 * Isolated strictly by userId. Purges legacy global key to prevent leakage.
 */
export function saveLocalActiveMonth(month: number, year: number, userId?: string): void {
  if (typeof window === 'undefined') return;
  if (!isValidDateSelection(month, year)) return;

  try {
    const payload = JSON.stringify({ month, year });
    if (userId && userId.trim()) {
      localStorage.setItem(`kassa_active_month_year_${userId.trim()}`, payload);
      // Remove any legacy unpartitioned key so other users never read it
      localStorage.removeItem('kassa_active_month_year');
    } else {
      localStorage.setItem('kassa_active_month_year_guest', payload);
    }
  } catch (e) {
    console.warn('Error saving active month to localStorage', e);
  }
}

/**
 * Intelligently determine the active month on startup for a specific user:
 * 1. Saved cloud user profile preference (highest priority)
 * 2. Saved local storage preference (isolated by userId)
 * 3. Most recent month with actual financial data in the user's ledger
 * 4. Current real-world calendar month as default fallback
 */
export function determineInitialActiveMonth(options: {
  cloudMonth?: number;
  cloudYear?: number;
  userId?: string;
  expenses?: Expense[];
  monthRecords?: MonthRecord[];
}): ActiveMonthSelection {
  const { cloudMonth, cloudYear, userId, expenses, monthRecords } = options;

  // 1. Prefer authenticated user's cloud preference
  if (isValidDateSelection(cloudMonth, cloudYear)) {
    return { month: cloudMonth!, year: cloudYear! };
  }

  // 2. Check user-isolated local preference
  const localPref = getSavedLocalActiveMonth(userId);
  if (localPref) {
    return localPref;
  }

  // 3. Find most recent month with actual data in the ledger
  const candidates: { month: number; year: number }[] = [];

  if (Array.isArray(monthRecords)) {
    for (const mr of monthRecords) {
      if (isValidDateSelection(mr.month, mr.year)) {
        candidates.push({ month: mr.month, year: mr.year });
      }
    }
  }

  if (Array.isArray(expenses)) {
    for (const exp of expenses) {
      if (isValidDateSelection(exp.month, exp.year)) {
        candidates.push({ month: exp.month, year: exp.year });
      }
    }
  }

  if (candidates.length > 0) {
    // Sort descending by year, then month
    candidates.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
    return candidates[0];
  }

  // 4. Default fallback: current real-world calendar month, clamped to available range
  const now = new Date();
  const currentYear = Math.max(MIN_CALENDAR_YEAR, Math.min(MAX_CALENDAR_YEAR, now.getFullYear()));
  return {
    month: now.getMonth() + 1,
    year: currentYear,
  };
}
