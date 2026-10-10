import { Category } from '../types/finance';

/**
 * Reconciles a saved category ordering against active categories.
 * 
 * Rules:
 * - Preserves user's custom ordering for all existing categories.
 * - Safely discards obsolete or deleted category IDs.
 * - Appends newly created categories to the end of the order.
 * - Ignores duplicates and invalid strings.
 * - Guarantees every active category ID is present exactly once.
 */
export function reconcileCategoryOrder(
  activeCategories: Array<{ id: string }>,
  savedOrder?: string[] | null
): string[] {
  const activeIds = activeCategories.map((c) => c.id);
  const activeIdSet = new Set(activeIds);

  if (!savedOrder || !Array.isArray(savedOrder) || savedOrder.length === 0) {
    return activeIds;
  }

  const result: string[] = [];
  const seen = new Set<string>();

  // 1. Preserve order for categories that still exist
  for (const id of savedOrder) {
    if (typeof id === 'string' && activeIdSet.has(id) && !seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }

  // 2. Append newly added categories not yet in the saved order
  for (const id of activeIds) {
    if (!seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }

  return result;
}

/**
 * Sorts an array of items containing category objects according to a specific category ID order.
 */
export function sortItemsByCategoryOrder<T extends { category: { id: string } }>(
  items: T[],
  categoryOrder: string[]
): T[] {
  if (!items || items.length === 0) return [];
  if (!categoryOrder || categoryOrder.length === 0) return [...items];

  const orderMap = new Map<string, number>();
  categoryOrder.forEach((id, index) => {
    orderMap.set(id, index);
  });

  return [...items].sort((a, b) => {
    const idxA = orderMap.has(a.category.id) ? orderMap.get(a.category.id)! : 99999;
    const idxB = orderMap.has(b.category.id) ? orderMap.get(b.category.id)! : 99999;
    return idxA - idxB;
  });
}
