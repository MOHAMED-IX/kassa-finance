import { Category, Expense, MonthRecord, SpendingCycle, PeriodMode, BankTransaction, BankTarget, Currency } from '../types/finance';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_EXPENSES,
  DEFAULT_MONTH_RECORDS,
} from './initialData';

const DB_VERSION = 2;
const STORE_EXPENSES = 'expenses';
const STORE_CATEGORIES = 'categories';
const STORE_MONTHS = 'month_records';
const STORE_CYCLES = 'spending_cycles';

const LEGACY_DB_NAME = 'kasa_finance_db';
const LEGACY_LS_EXPENSES = 'kasa_expenses_v1';
const LEGACY_LS_CATEGORIES = 'kasa_categories_v1';
const LEGACY_LS_MONTHS = 'kasa_months_v1';
const LEGACY_MIGRATED_KEY = 'kasa_legacy_migrated_to';
const LEGACY_ACTIVE_MONTH_KEY = 'kassa_active_month_year';

export interface StoredData {
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
  spendingCycles: SpendingCycle[];
  bankTransactions?: BankTransaction[];
  bankTargets?: BankTarget[];
}

/**
 * Permanently purges unscoped legacy browser stores from pre-UID versions of Kassa Finance.
 * Guarantees that legacy data from prior sessions can never leak to any newly authenticated user.
 * Preserves all user-scoped stores (kasa_finance_db_${uid}, kasa_expenses_${uid}, etc.).
 */
export function purgeLegacyUnscopedStores(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(LEGACY_LS_EXPENSES);
    localStorage.removeItem(LEGACY_LS_CATEGORIES);
    localStorage.removeItem(LEGACY_LS_MONTHS);
    localStorage.removeItem(LEGACY_MIGRATED_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_MONTH_KEY);
    localStorage.removeItem('kassa_bank_privacy_mode');
    localStorage.removeItem('kassa_bank_privacy');

    if (window.indexedDB) {
      try {
        window.indexedDB.deleteDatabase(LEGACY_DB_NAME);
      } catch (e) {
        console.warn('Could not delete legacy database:', e);
      }
    }
  } catch (e) {
    console.warn('Error purging legacy unscoped stores:', e);
  }
}

// Automatically purge legacy unscoped storage on module load
purgeLegacyUnscopedStores();

function getUserDBName(userId?: string): string {
  if (userId && userId.trim()) {
    return `kasa_finance_db_${userId.trim()}`;
  }
  return 'kasa_finance_db_guest';
}

function getUserLSKeys(userId?: string) {
  if (userId && userId.trim()) {
    const id = userId.trim();
    return {
      exp: `kasa_expenses_${id}`,
      cat: `kasa_categories_${id}`,
      mon: `kasa_months_${id}`,
      cyc: `kasa_cycles_${id}`,
      activeCycle: `kassa_active_cycle_${id}`,
      periodMode: `kassa_period_mode_${id}`,
      activeTab: `kassa_active_tab_${id}`,
      bankTx: `kassa_bank_transactions_${id}`,
      bankTargets: `kassa_bank_targets_${id}`,
      bankPrompts: `kassa_bank_prompts_handled_${id}`,
      bankPrivacy: `kassa_bank_privacy_mode_${id}`,
      currency: `kassa_currency_${id}`,
      categoryOrder: `kassa_category_order_${id}`,
    };
  }
  return {
    exp: 'kasa_expenses_guest',
    cat: 'kasa_categories_guest',
    mon: 'kasa_months_guest',
    cyc: 'kasa_cycles_guest',
    activeCycle: 'kassa_active_cycle_guest',
    periodMode: 'kassa_period_mode_guest',
    activeTab: 'kassa_active_tab_guest',
    bankTx: 'kassa_bank_transactions_guest',
    bankTargets: 'kassa_bank_targets_guest',
    bankPrompts: 'kassa_bank_prompts_handled_guest',
    bankPrivacy: 'kassa_bank_privacy_mode_guest',
    currency: 'kassa_currency_guest',
    categoryOrder: 'kassa_category_order_guest',
  };
}

const activeConnections = new Map<string, IDBDatabase>();

export function closeUserDB(userId?: string): void {
  const dbName = getUserDBName(userId);
  const conn = activeConnections.get(dbName);
  if (conn) {
    try {
      conn.close();
    } catch (e) {
      console.warn('Error closing IndexedDB connection:', e);
    }
    activeConnections.delete(dbName);
  }
}

function openUserDB(userId?: string): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  const dbName = getUserDBName(userId);
  const existingConn = activeConnections.get(dbName);
  if (existingConn) {
    return Promise.resolve(existingConn);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(dbName, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_EXPENSES)) {
          db.createObjectStore(STORE_EXPENSES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
          db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_MONTHS)) {
          db.createObjectStore(STORE_MONTHS, { keyPath: ['year', 'month'] });
        }
        if (!db.objectStoreNames.contains(STORE_CYCLES)) {
          db.createObjectStore(STORE_CYCLES, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          activeConnections.delete(dbName);
        };
        activeConnections.set(dbName, db);
        resolve(db);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Load user-isolated financial data from IndexedDB or localStorage.
 * Guaranteed to only query the specific user's partition.
 * Never injects default starter expenses into an existing empty user store.
 */
export async function loadStoredData(userId?: string): Promise<StoredData | null> {
  if (!userId) {
    return null;
  }

  const keys = getUserLSKeys(userId);

  // 1. Try User-Scoped IndexedDB
  try {
    const db = await openUserDB(userId);
    if (db) {
      const stores = [STORE_EXPENSES, STORE_CATEGORIES, STORE_MONTHS];
      const hasCyclesStore = db.objectStoreNames.contains(STORE_CYCLES);
      if (hasCyclesStore) stores.push(STORE_CYCLES);

      const tx = db.transaction(stores, 'readonly');
      const expReq = tx.objectStore(STORE_EXPENSES).getAll();
      const catReq = tx.objectStore(STORE_CATEGORIES).getAll();
      const monReq = tx.objectStore(STORE_MONTHS).getAll();
      const cycReq = hasCyclesStore ? tx.objectStore(STORE_CYCLES).getAll() : null;

      const [expenses, categories, monthRecords, cycles] = await Promise.all([
        new Promise<Expense[]>((res) => {
          expReq.onsuccess = () => res(expReq.result || []);
          expReq.onerror = () => res([]);
        }),
        new Promise<Category[]>((res) => {
          catReq.onsuccess = () => res(catReq.result || []);
          catReq.onerror = () => res([]);
        }),
        new Promise<MonthRecord[]>((res) => {
          monReq.onsuccess = () => res(monReq.result || []);
          monReq.onerror = () => res([]);
        }),
        new Promise<SpendingCycle[]>((res) => {
          if (!cycReq) {
            const lsCyc = localStorage.getItem(keys.cyc);
            res(lsCyc ? JSON.parse(lsCyc) : []);
            return;
          }
          cycReq.onsuccess = () => res(cycReq.result || []);
          cycReq.onerror = () => res([]);
        }),
      ]);

      if (expenses.length > 0 || categories.length > 0 || monthRecords.length > 0 || cycles.length > 0) {
        let finalCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
        if (!finalCategories.some((c) => c.id === 'cat-saving')) {
          const savingCat = DEFAULT_CATEGORIES.find((c) => c.id === 'cat-saving');
          if (savingCat) {
            finalCategories = [...finalCategories, savingCat];
          }
        }
        return {
          expenses: expenses || [],
          categories: finalCategories,
          monthRecords: monthRecords || [],
          spendingCycles: cycles || [],
        };
      }
    }
  } catch (e) {
    console.warn(`User-scoped IndexedDB load failed for ${userId}:`, e);
  }

  // 2. Try User-Scoped localStorage
  try {
    const lsExp = localStorage.getItem(keys.exp);
    const lsCat = localStorage.getItem(keys.cat);
    const lsMon = localStorage.getItem(keys.mon);
    const lsCyc = localStorage.getItem(keys.cyc);

    if (lsExp !== null || lsCat !== null || lsMon !== null || lsCyc !== null || localStorage.getItem(keys.bankTx) !== null) {
      let loadedCats = lsCat ? JSON.parse(lsCat) : DEFAULT_CATEGORIES;
      if (!loadedCats.some((c: Category) => c.id === 'cat-saving')) {
        const savingCat = DEFAULT_CATEGORIES.find((c) => c.id === 'cat-saving');
        if (savingCat) {
          loadedCats = [...loadedCats, savingCat];
        }
      }
      const lsBankTx = localStorage.getItem(keys.bankTx);
      const lsBankTargets = localStorage.getItem(keys.bankTargets);
      return {
        expenses: lsExp ? JSON.parse(lsExp) : [],
        categories: loadedCats,
        monthRecords: lsMon ? JSON.parse(lsMon) : [],
        spendingCycles: lsCyc ? JSON.parse(lsCyc) : [],
        bankTransactions: lsBankTx ? JSON.parse(lsBankTx) : [],
        bankTargets: lsBankTargets ? JSON.parse(lsBankTargets) : [],
      };
    }
  } catch (e) {
    console.warn(`User-scoped localStorage parse failed for ${userId}:`, e);
  }

  return null;
}

/**
 * Save user-isolated financial data to IndexedDB and localStorage.
 * Strictly prevents writing to any global or other user's store.
 */
export async function saveStoredData(
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[],
  userId?: string,
  spendingCycles?: SpendingCycle[],
  bankTransactions?: BankTransaction[],
  bankTargets?: BankTarget[]
): Promise<void> {
  if (!userId) {
    return;
  }

  const keys = getUserLSKeys(userId);

  // 1. Mirror in User-Scoped localStorage
  try {
    localStorage.setItem(keys.exp, JSON.stringify(expenses));
    localStorage.setItem(keys.cat, JSON.stringify(categories));
    localStorage.setItem(keys.mon, JSON.stringify(monthRecords));
    if (spendingCycles !== undefined) {
      localStorage.setItem(keys.cyc, JSON.stringify(spendingCycles));
    }
    if (bankTransactions !== undefined) {
      localStorage.setItem(keys.bankTx, JSON.stringify(bankTransactions));
    }
    if (bankTargets !== undefined) {
      localStorage.setItem(keys.bankTargets, JSON.stringify(bankTargets));
    }
  } catch (e) {
    console.warn('localStorage user write warning', e);
  }

  // 2. Persist in User-Scoped IndexedDB
  try {
    const db = await openUserDB(userId);
    if (!db) return;

    const stores = [STORE_EXPENSES, STORE_CATEGORIES, STORE_MONTHS];
    const hasCyclesStore = db.objectStoreNames.contains(STORE_CYCLES);
    if (hasCyclesStore && spendingCycles !== undefined) stores.push(STORE_CYCLES);

    const tx = db.transaction(stores, 'readwrite');

    const expStore = tx.objectStore(STORE_EXPENSES);
    expStore.clear();
    expenses.forEach((e) => expStore.put(e));

    const catStore = tx.objectStore(STORE_CATEGORIES);
    catStore.clear();
    categories.forEach((c) => catStore.put(c));

    const monStore = tx.objectStore(STORE_MONTHS);
    monStore.clear();
    monthRecords.forEach((m) => monStore.put(m));

    if (hasCyclesStore && spendingCycles !== undefined) {
      const cycStore = tx.objectStore(STORE_CYCLES);
      cycStore.clear();
      spendingCycles.forEach((cyc) => cycStore.put(cyc));
    }
  } catch (e) {
    console.warn('User IndexedDB write warning', e);
  }
}

/**
 * Save bank transactions locally (isolated by userId)
 */
export function saveBankTransactionsLocally(txs: BankTransaction[], userId?: string): void {
  if (typeof window === 'undefined') return;
  const keys = getUserLSKeys(userId);
  try {
    localStorage.setItem(keys.bankTx, JSON.stringify(txs));
  } catch (e) {
    console.warn('Error saving local bank transactions:', e);
  }
}

/**
 * Save bank targets locally (isolated by userId)
 */
export function saveBankTargetsLocally(targets: BankTarget[], userId?: string): void {
  if (typeof window === 'undefined') return;
  const keys = getUserLSKeys(userId);
  try {
    localStorage.setItem(keys.bankTargets, JSON.stringify(targets));
  } catch (e) {
    console.warn('Error saving local bank targets:', e);
  }
}

/**
 * Load bank privacy mode (isolated by userId)
 */
export function loadBankPrivacyMode(userId?: string): boolean {
  if (typeof window === 'undefined') return false;
  const keys = getUserLSKeys(userId);
  try {
    return localStorage.getItem(keys.bankPrivacy) === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Save bank privacy mode (isolated by userId)
 */
export function saveBankPrivacyMode(isPrivate: boolean, userId?: string): void {
  if (typeof window === 'undefined') return;
  const keys = getUserLSKeys(userId);
  try {
    localStorage.setItem(keys.bankPrivacy, isPrivate ? 'true' : 'false');
  } catch (e) {
    console.warn('Error saving local bank privacy mode:', e);
  }
}

/**
 * Load user currency preference (isolated by userId: kassa_currency_${userId} or kassa_currency_guest)
 * Defaults to 'EUR' for new and existing users without a set preference.
 */
export function loadUserCurrency(userId?: string): Currency {
  if (typeof window === 'undefined') return 'EUR';
  const keys = getUserLSKeys(userId);
  try {
    const saved = localStorage.getItem(keys.currency);
    if (saved === 'EUR' || saved === 'USD' || saved === 'EGP') {
      return saved;
    }
  } catch (e) {
    console.warn('Error reading local user currency:', e);
  }
  return 'EUR';
}

/**
 * Save user currency preference (isolated by userId: kassa_currency_${userId} or kassa_currency_guest)
 */
export function saveUserCurrency(currency: Currency, userId?: string): void {
  if (typeof window === 'undefined') return;
  const keys = getUserLSKeys(userId);
  try {
    localStorage.setItem(keys.currency, currency);
  } catch (e) {
    console.warn('Error saving local user currency:', e);
  }
}

/**
 * Save active spending cycle ID locally (isolated by userId)
 */
export function saveLocalActiveCycle(cycleId: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  const keys = getUserLSKeys(userId);
  try {
    localStorage.setItem(keys.activeCycle, cycleId);
  } catch (e) {
    console.warn('Error saving local active cycle:', e);
  }
}

/**
 * Get saved active spending cycle ID locally (isolated by userId)
 */
export function getSavedLocalActiveCycle(userId?: string): string | null {
  if (typeof window === 'undefined') return null;
  const keys = getUserLSKeys(userId);
  try {
    return localStorage.getItem(keys.activeCycle);
  } catch (e) {
    return null;
  }
}

/**
 * Save user period mode ('month' | 'cycle') locally (isolated by userId)
 */
export function saveLocalPeriodMode(mode: PeriodMode, userId?: string): void {
  if (typeof window === 'undefined') return;
  const keys = getUserLSKeys(userId);
  try {
    localStorage.setItem(keys.periodMode, mode);
  } catch (e) {
    console.warn('Error saving local period mode:', e);
  }
}

/**
 * Get saved user period mode ('month' | 'cycle') locally (isolated by userId)
 */
export function getSavedLocalPeriodMode(userId?: string): PeriodMode {
  if (typeof window === 'undefined') return 'month';
  const keys = getUserLSKeys(userId);
  try {
    const val = localStorage.getItem(keys.periodMode);
    if (val === 'cycle') return 'cycle';
    return 'month';
  } catch (e) {
    return 'month';
  }
}

/**
 * Save user custom category display order locally (isolated by userId)
 */
export function saveLocalCategoryOrder(order: string[], userId?: string): void {
  if (typeof window === 'undefined') return;
  const keys = getUserLSKeys(userId);
  try {
    localStorage.setItem(keys.categoryOrder, JSON.stringify(order));
  } catch (e) {
    console.warn('Error saving local category order:', e);
  }
}

/**
 * Get saved user custom category display order locally (isolated by userId)
 */
export function getSavedLocalCategoryOrder(userId?: string): string[] | null {
  if (typeof window === 'undefined') return null;
  const keys = getUserLSKeys(userId);
  try {
    const val = localStorage.getItem(keys.categoryOrder);
    if (!val) return null;
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
      return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Clear local active navigation state (used on logout and account deletion)
 */
export function clearLocalNavigationState(userId?: string): void {
  if (typeof window === 'undefined') return;
  const keys = getUserLSKeys(userId);
  try {
    localStorage.removeItem(keys.activeTab);
    localStorage.removeItem('kassa_active_tab');
  } catch (e) {
    console.warn('Error clearing local navigation state:', e);
  }
}

/**
 * Permanently delete all local browser storage for a specific user ID:
 * - UID-scoped localStorage keys
 * - UID-scoped IndexedDB database
 */
export async function deleteUserLocalData(userId: string): Promise<void> {
  if (!userId) return;
  const cleanId = userId.trim();

  // 1. Close any open IndexedDB connection so deletion is not blocked
  closeUserDB(cleanId);

  // 2. Remove all UID-scoped localStorage keys
  try {
    const keys = getUserLSKeys(cleanId);
    localStorage.removeItem(keys.exp);
    localStorage.removeItem(keys.cat);
    localStorage.removeItem(keys.mon);
    localStorage.removeItem(keys.cyc);
    localStorage.removeItem(keys.activeCycle);
    localStorage.removeItem(keys.periodMode);
    localStorage.removeItem(keys.activeTab);
    localStorage.removeItem(keys.bankTx);
    localStorage.removeItem(keys.bankTargets);
    localStorage.removeItem(keys.bankPrompts);
    localStorage.removeItem(keys.bankPrivacy);
    localStorage.removeItem(keys.currency);
    localStorage.removeItem(keys.categoryOrder);
    localStorage.removeItem(`kassa_active_month_year_${cleanId}`);
    localStorage.removeItem(`kasa_active_month_year_${cleanId}`);

    // Scan for any other key belonging to or referencing this user
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.includes(cleanId) || k.includes(userId))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));

    // Also purge legacy unscoped stores
    purgeLegacyUnscopedStores();
  } catch (err) {
    console.warn('Error clearing user localStorage:', err);
  }

  // 3. Delete UID-scoped IndexedDB database and handle unblocking
  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      const dbName = getUserDBName(cleanId);
      await new Promise<void>((resolve) => {
        let isResolved = false;
        const finish = () => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        };

        const req = window.indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => finish();
        req.onerror = () => finish();
        req.onblocked = () => {
          console.warn(`[storage] IndexedDB delete blocked for ${dbName}, forcing connection closure...`);
          closeUserDB(cleanId);
          setTimeout(finish, 150);
        };

        // Safety timeout so deletion never hangs
        setTimeout(finish, 1000);
      });
    }
  } catch (err) {
    console.warn('Error deleting user IndexedDB:', err);
  }

  // 4. Verify local storage deletion
  const keys = getUserLSKeys(cleanId);
  const remainingKeys: string[] = [];
  if (localStorage.getItem(keys.exp) !== null) remainingKeys.push(keys.exp);
  if (localStorage.getItem(keys.cat) !== null) remainingKeys.push(keys.cat);
  if (localStorage.getItem(keys.mon) !== null) remainingKeys.push(keys.mon);
  if (localStorage.getItem(keys.cyc) !== null) remainingKeys.push(keys.cyc);
  if (localStorage.getItem(keys.activeCycle) !== null) remainingKeys.push(keys.activeCycle);
  if (localStorage.getItem(keys.periodMode) !== null) remainingKeys.push(keys.periodMode);
  if (localStorage.getItem(keys.activeTab) !== null) remainingKeys.push(keys.activeTab);
  if (localStorage.getItem(keys.bankTx) !== null) remainingKeys.push(keys.bankTx);
  if (localStorage.getItem(keys.bankTargets) !== null) remainingKeys.push(keys.bankTargets);
  if (localStorage.getItem(keys.bankPrivacy) !== null) remainingKeys.push(keys.bankPrivacy);
  if (localStorage.getItem(keys.categoryOrder) !== null) remainingKeys.push(keys.categoryOrder);
  if (localStorage.getItem(`kassa_active_month_year_${cleanId}`) !== null) {
    remainingKeys.push(`kassa_active_month_year_${cleanId}`);
  }
  if (remainingKeys.length > 0) {
    console.warn('[storage] Warning: Some user localStorage keys could not be deleted:', remainingKeys);
  } else {
    console.info(`[storage] Local storage and IndexedDB successfully wiped for user ${cleanId}`);
  }
}

/**
 * Delete a specific month's data from user-isolated local cache:
 * Removes matching expenses and monthRecord from both localStorage and IndexedDB.
 */
export async function deleteMonthLocalData(
  userId: string,
  year: number,
  month: number
): Promise<{ expenses: Expense[]; monthRecords: MonthRecord[] }> {
  if (!userId) return { expenses: [], monthRecords: [] };

  const current = await loadStoredData(userId);
  if (!current) {
    return { expenses: [], monthRecords: [] };
  }

  const updatedExpenses = current.expenses.filter(
    (e) => !(e.year === year && e.month === month)
  );
  const updatedMonthRecords = current.monthRecords.filter(
    (m) => !(m.year === year && m.month === month)
  );

  await saveStoredData(
    updatedExpenses,
    current.categories,
    updatedMonthRecords,
    userId
  );

  return { expenses: updatedExpenses, monthRecords: updatedMonthRecords };
}

