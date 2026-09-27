import { Category, Expense, MonthRecord } from '../types/finance';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_EXPENSES,
  DEFAULT_MONTH_RECORDS,
} from './initialData';

const DB_NAME = 'kasa_finance_db';
const DB_VERSION = 1;
const STORE_EXPENSES = 'expenses';
const STORE_CATEGORIES = 'categories';
const STORE_MONTHS = 'month_records';

const LS_EXPENSES_KEY = 'kasa_expenses_v1';
const LS_CATEGORIES_KEY = 'kasa_categories_v1';
const LS_MONTHS_KEY = 'kasa_months_v1';

export interface StoredData {
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

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
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadStoredData(): Promise<{
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
}> {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(
        [STORE_EXPENSES, STORE_CATEGORIES, STORE_MONTHS],
        'readonly'
      );
      const expReq = tx.objectStore(STORE_EXPENSES).getAll();
      const catReq = tx.objectStore(STORE_CATEGORIES).getAll();
      const monReq = tx.objectStore(STORE_MONTHS).getAll();

      const [expenses, categories, monthRecords] = await Promise.all([
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
      ]);

      if (expenses.length > 0 || categories.length > 0) {
        let finalCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
        if (!finalCategories.some((c) => c.id === 'cat-saving')) {
          const savingCat = DEFAULT_CATEGORIES.find((c) => c.id === 'cat-saving');
          if (savingCat) {
            finalCategories = [...finalCategories, savingCat];
          }
        }
        return {
          expenses: expenses.length > 0 ? expenses : DEFAULT_EXPENSES,
          categories: finalCategories,
          monthRecords: monthRecords.length > 0 ? monthRecords : DEFAULT_MONTH_RECORDS,
        };
      }
    }
  } catch (e) {
    console.warn('IndexedDB load failed, trying localStorage fallback', e);
  }

  // Fallback to localStorage
  try {
    const lsExp = localStorage.getItem(LS_EXPENSES_KEY);
    const lsCat = localStorage.getItem(LS_CATEGORIES_KEY);
    const lsMon = localStorage.getItem(LS_MONTHS_KEY);

    if (lsExp || lsCat) {
      let loadedCats = lsCat ? JSON.parse(lsCat) : DEFAULT_CATEGORIES;
      if (!loadedCats.some((c: Category) => c.id === 'cat-saving')) {
        const savingCat = DEFAULT_CATEGORIES.find((c) => c.id === 'cat-saving');
        if (savingCat) {
          loadedCats = [...loadedCats, savingCat];
        }
      }
      return {
        expenses: lsExp ? JSON.parse(lsExp) : DEFAULT_EXPENSES,
        categories: loadedCats,
        monthRecords: lsMon ? JSON.parse(lsMon) : DEFAULT_MONTH_RECORDS,
      };
    }
  } catch (e) {
    console.warn('localStorage parse failed', e);
  }

  // Default initial seed data (includes exact Sep 2026 test case)
  return {
    expenses: DEFAULT_EXPENSES,
    categories: DEFAULT_CATEGORIES,
    monthRecords: DEFAULT_MONTH_RECORDS,
  };
}

/**
 * Check if the browser has existing local data (IndexedDB or localStorage)
 * that is eligible for one-time cloud migration.
 */
export async function detectExistingLocalData(): Promise<StoredData | null> {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(
        [STORE_EXPENSES, STORE_CATEGORIES, STORE_MONTHS],
        'readonly'
      );
      const expReq = tx.objectStore(STORE_EXPENSES).getAll();
      const catReq = tx.objectStore(STORE_CATEGORIES).getAll();
      const monReq = tx.objectStore(STORE_MONTHS).getAll();

      const result = await new Promise<StoredData | null>((resolve) => {
        tx.oncomplete = () => {
          const expenses: Expense[] = expReq.result || [];
          const categories: Category[] = catReq.result || [];
          const monthRecords: MonthRecord[] = monReq.result || [];
          if (expenses.length > 0) {
            resolve({
              expenses,
              categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
              monthRecords: monthRecords.length > 0 ? monthRecords : DEFAULT_MONTH_RECORDS,
            });
          } else {
            resolve(null);
          }
        };
        tx.onerror = () => resolve(null);
      });

      if (result) return result;
    }
  } catch (e) {
    // Fall back to checking localStorage
  }

  try {
    const lsExp = localStorage.getItem(LS_EXPENSES_KEY);
    const lsCat = localStorage.getItem(LS_CATEGORIES_KEY);
    const lsMon = localStorage.getItem(LS_MONTHS_KEY);
    if (lsExp) {
      const parsedExp = JSON.parse(lsExp);
      if (Array.isArray(parsedExp) && parsedExp.length > 0) {
        return {
          expenses: parsedExp,
          categories: lsCat ? JSON.parse(lsCat) : DEFAULT_CATEGORIES,
          monthRecords: lsMon ? JSON.parse(lsMon) : DEFAULT_MONTH_RECORDS,
        };
      }
    }
  } catch (e) {
    // Ignore
  }

  return null;
}

export async function saveStoredData(
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[]
): Promise<void> {
  // Always mirror in localStorage for immediate sync
  try {
    localStorage.setItem(LS_EXPENSES_KEY, JSON.stringify(expenses));
    localStorage.setItem(LS_CATEGORIES_KEY, JSON.stringify(categories));
    localStorage.setItem(LS_MONTHS_KEY, JSON.stringify(monthRecords));
  } catch (e) {
    console.warn('localStorage write warning', e);
  }

  // Also persist in IndexedDB
  try {
    const db = await openDB();
    if (!db) return;

    const tx = db.transaction(
      [STORE_EXPENSES, STORE_CATEGORIES, STORE_MONTHS],
      'readwrite'
    );

    const expStore = tx.objectStore(STORE_EXPENSES);
    expStore.clear();
    expenses.forEach((e) => expStore.put(e));

    const catStore = tx.objectStore(STORE_CATEGORIES);
    catStore.clear();
    categories.forEach((c) => catStore.put(c));

    const monStore = tx.objectStore(STORE_MONTHS);
    monStore.clear();
    monthRecords.forEach((m) => monStore.put(m));
  } catch (e) {
    console.warn('IndexedDB write warning', e);
  }
}

export async function resetToDefaultDataset(): Promise<{
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
}> {
  await saveStoredData(
    DEFAULT_EXPENSES,
    DEFAULT_CATEGORIES,
    DEFAULT_MONTH_RECORDS
  );
  return {
    expenses: [...DEFAULT_EXPENSES],
    categories: [...DEFAULT_CATEGORIES],
    monthRecords: [...DEFAULT_MONTH_RECORDS],
  };
}
