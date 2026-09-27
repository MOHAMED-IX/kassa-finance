import { Category, Expense, MonthRecord } from '../types/finance';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-fixed',
    name: 'Fixed Expenses',
    nameAr: 'المصروفات الثابتة',
    color: '#3B82F6', // Blue
    iconName: 'Home',
    defaultType: 'fixed',
    stores: ['Rent', 'Health Insurance', 'Barmer', 'TK', 'Internet', 'Radio/TV Fee', 'GEZ', 'Mobile Contract'],
  },
  {
    id: 'cat-supermarket',
    name: 'Food & Supermarket',
    nameAr: 'طعام وسوبرماركت',
    color: '#10B981', // Emerald
    iconName: 'ShoppingCart',
    defaultType: 'variable',
    stores: ['Lidl', 'Aldi', 'Rewe', 'Edeka', 'Euroshop', 'Penny', 'Netto', 'Kaufland', 'Other Supermarket'],
  },
  {
    id: 'cat-study',
    name: 'Study',
    nameAr: 'الدراسة والجامعة',
    color: '#8B5CF6', // Purple
    iconName: 'GraduationCap',
    defaultType: 'variable',
    stores: ['University Fees', 'Student ID', 'German Course', 'Books', 'Semesterticket', 'Other Study'],
  },
  {
    id: 'cat-transport',
    name: 'Transportation',
    nameAr: 'المواصلات',
    color: '#F59E0B', // Amber
    iconName: 'Bus',
    defaultType: 'variable',
    stores: ['Deutschlandticket', 'Deutsche Bahn', 'Flixbus', 'Local Transit', 'Other Transportation'],
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    nameAr: 'التسوق والمشتريات',
    color: '#EC4899', // Pink
    iconName: 'ShoppingBag',
    defaultType: 'variable',
    stores: ['Amazon', 'Temu', 'Clothing', 'Electronics', 'Zalando', 'Ikea', 'Other Shopping'],
  },
  {
    id: 'cat-personal',
    name: 'Personal',
    nameAr: 'شخصي وترفيه',
    color: '#06B6D4', // Cyan
    iconName: 'User',
    defaultType: 'variable',
    stores: ['Hygiene', 'Entertainment', 'Games', 'Restaurant', 'Cafe', 'Pharmacy', 'Other Personal'],
  },
  {
    id: 'cat-saving',
    name: 'Saving',
    nameAr: 'الادخار',
    color: '#10B981', // Emerald
    iconName: 'PiggyBank',
    defaultType: 'fixed',
    stores: ['Emergency Fund', 'Savings Account', 'Long-term Savings'],
  },
];

export const DEFAULT_MONTH_RECORDS: MonthRecord[] = [
  {
    year: 2026,
    month: 7, // July 2026
    income: 1186.0,
    budgets: {
      'cat-supermarket': 250.0,
      'cat-personal': 100.0,
      'cat-shopping': 100.0,
      'cat-transport': 50.0,
    },
    notes: 'July budget and expenses',
  },
  {
    year: 2026,
    month: 8, // August 2026
    income: 1186.0,
    budgets: {
      'cat-supermarket': 250.0,
      'cat-personal': 100.0,
      'cat-shopping': 100.0,
      'cat-transport': 50.0,
    },
    notes: 'August budget and expenses',
  },
  {
    year: 2026,
    month: 9, // September 2026 (The Official Test Case)
    income: 1186.0,
    budgets: {
      'cat-supermarket': 250.0,
      'cat-personal': 100.0,
      'cat-shopping': 100.0,
      'cat-transport': 50.0,
    },
    notes: 'Official verification test dataset (Income: 1186 €, Budget: 250 €)',
  },
];

// September 2026 exact transactions matching prompt item 22
const lidlAmounts = [
  66.25, 17.83, 5.90, 3.87, 7.15, 2.99, 31.50, 20.44, 4.56, 26.15,
  30.90, 1.49, 2.99, 41.74, 2.49, 9.88, 17.56, 25.12, 5.00, 6.24,
];

export const DEFAULT_EXPENSES: Expense[] = [
  // --- September 2026 Fixed Expenses (Total: 486.77 €) ---
  {
    id: 'exp-sep-rent',
    name: 'Apartment Rent',
    amount: 307.0,
    categoryId: 'cat-fixed',
    store: 'Rent',
    date: '2026-09-01',
    year: 2026,
    month: 9,
    isRecurring: true,
    type: 'fixed',
    notes: 'Monthly room rent',
    createdAt: 1725148800000,
  },
  {
    id: 'exp-sep-barmer',
    name: 'Health Insurance',
    amount: 151.42,
    categoryId: 'cat-fixed',
    store: 'Barmer',
    date: '2026-09-05',
    year: 2026,
    month: 9,
    isRecurring: true,
    type: 'fixed',
    notes: 'Barmer student health insurance',
    createdAt: 1725494400000,
  },
  {
    id: 'exp-sep-internet',
    name: 'Home Internet',
    amount: 9.99,
    categoryId: 'cat-fixed',
    store: 'Internet',
    date: '2026-09-10',
    year: 2026,
    month: 9,
    isRecurring: true,
    type: 'fixed',
    notes: 'High speed fiber share',
    createdAt: 1725926400000,
  },
  {
    id: 'exp-sep-radio',
    name: 'Radio/TV Fee',
    amount: 18.36,
    categoryId: 'cat-fixed',
    store: 'Radio/TV Fee',
    date: '2026-09-15',
    year: 2026,
    month: 9,
    isRecurring: true,
    type: 'fixed',
    notes: 'Rundfunkbeitrag fee',
    createdAt: 1726358400000,
  },

  // --- September 2026 Study Expense (7.00 €) ---
  {
    id: 'exp-sep-studentid',
    name: 'Student ID Validation',
    amount: 7.0,
    categoryId: 'cat-study',
    store: 'Student ID',
    date: '2026-09-18',
    year: 2026,
    month: 9,
    isRecurring: false,
    type: 'variable',
    notes: 'Card replacement stamp',
    createdAt: 1726617600000,
  },

  // --- September 2026 Supermarket: Lidl Transactions (20 items -> 330.05 €) ---
  ...lidlAmounts.map((amt, idx) => {
    // Generate dates staggered across September 2026
    const day = Math.min(28, Math.max(1, (idx * 1.3 + 2) | 0));
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    return {
      id: `exp-sep-lidl-${idx + 1}`,
      name: idx === 9 ? 'Groceries' : `Groceries #${idx + 1}`,
      amount: amt,
      categoryId: 'cat-supermarket',
      store: 'Lidl',
      date: `2026-09-${dayStr}`,
      year: 2026,
      month: 9,
      isRecurring: false,
      type: 'variable' as const,
      notes: idx === 9 ? 'Lidl weekly cart' : undefined,
      createdAt: 1726000000000 + idx * 3600000,
    };
  }),

  // --- September 2026 Supermarket: Euroshop (15.10 €) ---
  {
    id: 'exp-sep-euroshop',
    name: 'Household Supplies',
    amount: 15.1,
    categoryId: 'cat-supermarket',
    store: 'Euroshop',
    date: '2026-09-24',
    year: 2026,
    month: 9,
    isRecurring: false,
    type: 'variable',
    notes: 'Cleaning items & paper goods',
    createdAt: 1727136000000,
  },

  // --- July 2026 Data (Income: 1186 €, Expenses: 937.52 €, Remaining: 248.48 €) ---
  {
    id: 'exp-jul-fixed',
    name: 'Rent & Utilities',
    amount: 486.77,
    categoryId: 'cat-fixed',
    store: 'Rent',
    date: '2026-07-01',
    year: 2026,
    month: 7,
    isRecurring: true,
    type: 'fixed',
    createdAt: 1719792000000,
  },
  {
    id: 'exp-jul-food',
    name: 'Supermarket Groceries',
    amount: 320.75,
    categoryId: 'cat-supermarket',
    store: 'Rewe',
    date: '2026-07-14',
    year: 2026,
    month: 7,
    isRecurring: false,
    type: 'variable',
    createdAt: 1720915200000,
  },
  {
    id: 'exp-jul-trans',
    name: 'Deutschlandticket',
    amount: 49.0,
    categoryId: 'cat-transport',
    store: 'Deutschlandticket',
    date: '2026-07-01',
    year: 2026,
    month: 7,
    isRecurring: true,
    type: 'fixed',
    createdAt: 1719792000000,
  },
  {
    id: 'exp-jul-shop',
    name: 'Summer essentials',
    amount: 81.0,
    categoryId: 'cat-shopping',
    store: 'Amazon',
    date: '2026-07-20',
    year: 2026,
    month: 7,
    isRecurring: false,
    type: 'variable',
    createdAt: 1721433600000,
  },

  // --- August 2026 Data (Income: 1186 €, Expenses: 953.30 €, Remaining: 232.70 €) ---
  {
    id: 'exp-aug-fixed',
    name: 'Rent & Utilities',
    amount: 486.77,
    categoryId: 'cat-fixed',
    store: 'Rent',
    date: '2026-08-01',
    year: 2026,
    month: 8,
    isRecurring: true,
    type: 'fixed',
    createdAt: 1722470400000,
  },
  {
    id: 'exp-aug-food',
    name: 'Supermarket Groceries',
    amount: 342.53,
    categoryId: 'cat-supermarket',
    store: 'Aldi',
    date: '2026-08-12',
    year: 2026,
    month: 8,
    isRecurring: false,
    type: 'variable',
    createdAt: 1723420800000,
  },
  {
    id: 'exp-aug-trans',
    name: 'Deutschlandticket',
    amount: 49.0,
    categoryId: 'cat-transport',
    store: 'Deutschlandticket',
    date: '2026-08-01',
    year: 2026,
    month: 8,
    isRecurring: true,
    type: 'fixed',
    createdAt: 1722470400000,
  },
  {
    id: 'exp-aug-study',
    name: 'German Course Book',
    amount: 75.0,
    categoryId: 'cat-study',
    store: 'Books',
    date: '2026-08-25',
    year: 2026,
    month: 8,
    isRecurring: false,
    type: 'variable',
    createdAt: 1724544000000,
  },
];
