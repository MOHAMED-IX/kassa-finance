import { Expense, MonthRecord } from '../types/finance';

export interface ActiveMonthSelection {
  month: number;
  year: number;
}

const LOCAL_STORAGE_KEY_GLOBAL = 'kassa_active_month_year';

function isValidDateSelection(month?: number, year?: number): boolean {
  return (
    typeof month === 'number' &&
    month >= 1 &&
    month <= 12 &&
    typeof year === 'number' &&
    year >= 2000 &&
    year <= 2100
  );
}

/**
 * Retrieve saved local active month preference from localStorage
 */
export function getSavedLocalActiveMonth(userId?: string): ActiveMonthSelection | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Try user-specific local key first if userId provided
    if (userId) {
      const userSaved = localStorage.getItem(`${LOCAL_STORAGE_KEY_GLOBAL}_${userId}`);
      if (userSaved) {
        const parsed = JSON.parse(userSaved);
        if (isValidDateSelection(parsed.month, parsed.year)) {
          return { month: parsed.month, year: parsed.year };
        }
      }
    }

    // 2. Try global local key
    const globalSaved = localStorage.getItem(LOCAL_STORAGE_KEY_GLOBAL);
    if (globalSaved) {
      const parsed = JSON.parse(globalSaved);
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
 * Save active month preference to localStorage
 */
export function saveLocalActiveMonth(month: number, year: number, userId?: string): void {
  if (typeof window === 'undefined') return;
  if (!isValidDateSelection(month, year)) return;

  try {
    const payload = JSON.stringify({ month, year });
    localStorage.setItem(LOCAL_STORAGE_KEY_GLOBAL, payload);
    if (userId) {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_GLOBAL}_${userId}`, payload);
    }
  } catch (e) {
    console.warn('Error saving active month to localStorage', e);
  }
}

/**
 * Intelligently determine the active month on startup:
 * 1. Saved cloud user profile preference (highest priority)
 * 2. Saved local storage preference
 * 3. Most recent month with actual financial data (month records or expenses)
 * 4. Current real-world calendar month as default fallback (NEVER hardcoded to Sep 2026)
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

  // 2. Check local preference
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

  // 4. Default fallback: current real-world calendar month
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}
