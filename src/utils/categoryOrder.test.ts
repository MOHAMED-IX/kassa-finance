import { describe, it, expect } from 'vitest';
import { reconcileCategoryOrder, sortItemsByCategoryOrder } from './categoryOrder';
import { exportToJSON, parseJSONBackup } from './exportImport';
import { Category, Expense, MonthRecord } from '../types/finance';

describe('categoryOrder utils', () => {
  const activeCats = [
    { id: 'cat-fixed', name: 'Fixed Expenses' },
    { id: 'cat-saving', name: 'Saving' },
    { id: 'cat-personal', name: 'Personal' },
    { id: 'cat-food', name: 'Food & Supermarket' },
  ];

  it('preserves saved order when all categories are present', () => {
    const saved = ['cat-food', 'cat-saving', 'cat-fixed', 'cat-personal'];
    const result = reconcileCategoryOrder(activeCats, saved);
    expect(result).toEqual(['cat-food', 'cat-saving', 'cat-fixed', 'cat-personal']);
  });

  it('safely drops deleted/obsolete category IDs', () => {
    const saved = ['cat-food', 'cat-deleted-99', 'cat-saving', 'cat-fixed', 'cat-personal'];
    const result = reconcileCategoryOrder(activeCats, saved);
    expect(result).toEqual(['cat-food', 'cat-saving', 'cat-fixed', 'cat-personal']);
    expect(result).not.toContain('cat-deleted-99');
  });

  it('appends newly created categories at the end', () => {
    const saved = ['cat-personal', 'cat-fixed'];
    const result = reconcileCategoryOrder(activeCats, saved);
    // cat-personal and cat-fixed first, then cat-saving and cat-food at the end
    expect(result).toEqual(['cat-personal', 'cat-fixed', 'cat-saving', 'cat-food']);
  });

  it('returns default order if saved order is empty, null, or undefined', () => {
    expect(reconcileCategoryOrder(activeCats, undefined)).toEqual([
      'cat-fixed',
      'cat-saving',
      'cat-personal',
      'cat-food',
    ]);
    expect(reconcileCategoryOrder(activeCats, [])).toEqual([
      'cat-fixed',
      'cat-saving',
      'cat-personal',
      'cat-food',
    ]);
    expect(reconcileCategoryOrder(activeCats, null)).toEqual([
      'cat-fixed',
      'cat-saving',
      'cat-personal',
      'cat-food',
    ]);
  });

  it('deduplicates duplicate IDs in saved order', () => {
    const saved = ['cat-food', 'cat-food', 'cat-saving', 'cat-fixed'];
    const result = reconcileCategoryOrder(activeCats, saved);
    expect(result).toEqual(['cat-food', 'cat-saving', 'cat-fixed', 'cat-personal']);
  });

  it('sortItemsByCategoryOrder sorts items according to specified order', () => {
    const items = [
      { category: { id: 'cat-fixed' }, totalSpent: 100 },
      { category: { id: 'cat-saving' }, totalSpent: 200 },
      { category: { id: 'cat-food' }, totalSpent: 300 },
    ];
    const order = ['cat-food', 'cat-fixed', 'cat-saving'];
    const sorted = sortItemsByCategoryOrder(items, order);
    expect(sorted.map((s) => s.category.id)).toEqual(['cat-food', 'cat-fixed', 'cat-saving']);
  });

  it('parseJSONBackup parses categoryOrder when present and handles older backups gracefully', () => {
    const modernBackup = JSON.stringify({
      version: '1.0.0',
      expenses: [
        {
          id: 'exp-1',
          name: 'Groceries',
          amount: 50,
          categoryId: 'cat-food',
          store: 'Rewe',
          date: '2026-10-01',
          month: 10,
          year: 2026,
          isRecurring: false,
          type: 'variable',
        },
      ],
      categories: [{ id: 'cat-food', name: 'Food' }],
      monthRecords: [{ year: 2026, month: 10, income: 3000, budgets: {} }],
      categoryOrder: ['cat-saving', 'cat-food'],
    });

    const parsedModern = parseJSONBackup(modernBackup);
    expect(parsedModern.success).toBe(true);
    expect(parsedModern.data?.categoryOrder).toEqual(['cat-saving', 'cat-food']);

    const olderBackup = JSON.stringify({
      version: '1.0.0',
      expenses: [
        {
          id: 'exp-1',
          name: 'Groceries',
          amount: 50,
          categoryId: 'cat-food',
          store: 'Rewe',
          date: '2026-10-01',
          month: 10,
          year: 2026,
          isRecurring: false,
          type: 'variable',
        },
      ],
      categories: [{ id: 'cat-food', name: 'Food' }],
      monthRecords: [{ year: 2026, month: 10, income: 3000, budgets: {} }],
    });

    const parsedOlder = parseJSONBackup(olderBackup);
    expect(parsedOlder.success).toBe(true);
    expect(parsedOlder.data?.categoryOrder).toBeUndefined();
  });
});
