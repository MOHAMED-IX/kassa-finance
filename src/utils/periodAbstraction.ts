import {
  AllocatedCategoryBudgetResult,
  AllocatedMonthBudgetsResult,
  AnalysisPeriod,
  AnalysisPeriodRange,
  BankTransaction,
  Category,
  CategoryBudgetCycleAllocation,
  CategorySummary,
  CycleComparisonItem,
  Expense,
  FinancialSummary,
  MonthRecord,
  SpendingCycle,
  StoreSummary,
} from '../types/finance';
import {
  formatDateRange,
  getPreviousDayString,
  MONTH_NAMES_AR,
  MONTH_NAMES_DE,
  MONTH_NAMES_EN,
  round2,
} from './formatters';
import { Language } from './i18n';
import { getPeriodSavingTransferInfo } from './bankCalculations';
export { getPeriodSavingTransferInfo };

/**
 * Returns today's ISO date string (YYYY-MM-DD) based on local client clock.
 */
export function getTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalizes and heals spending cycles against race conditions, offline collisions, or improper overlaps.
 * Invariants enforced:
 * 1. Cycles are sorted strictly by startDate descending (newest first).
 * 2. At most ONE cycle can be open (endDate === null), which is the newest cycle.
 * 3. Any older open cycles have their endDate automatically set to the day before the subsequent cycle.
 * 4. No duplicate start dates.
 * 5. Closed cycles have endDate >= startDate.
 */
export function sanitizeAndHealCycles(cycles: SpendingCycle[]): SpendingCycle[] {
  if (!cycles || cycles.length === 0) return [];

  // Sort newest start date first
  const sorted = [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate));

  // Remove exact duplicate startDates (keep newest createdAt)
  const uniqueByDate: SpendingCycle[] = [];
  const seenDates = new Set<string>();

  for (const c of sorted) {
    if (!seenDates.has(c.startDate)) {
      seenDates.add(c.startDate);
      uniqueByDate.push(c);
    }
  }

  const healed: SpendingCycle[] = [];

  for (let i = 0; i < uniqueByDate.length; i++) {
    const current = { ...uniqueByDate[i] };
    const newerCycle = i > 0 ? healed[i - 1] : null;

    if (newerCycle) {
      // Must be closed before the newer cycle starts
      const expectedEndDate = getPreviousDayString(newerCycle.startDate);
      if (current.endDate === null || current.endDate >= newerCycle.startDate) {
        current.endDate = expectedEndDate;
      }
    }

    // Ensure endDate is not earlier than startDate
    if (current.endDate && current.endDate < current.startDate) {
      current.endDate = current.startDate;
    }

    healed.push(current);
  }

  return healed;
}

/**
 * Resolves the concrete date boundaries, label, and ongoing status of any AnalysisPeriod.
 */
export function getAnalysisPeriodRange(
  period: AnalysisPeriod,
  cycles: SpendingCycle[],
  lang: Language = 'en'
): AnalysisPeriodRange {
  const months =
    lang === 'ar'
      ? MONTH_NAMES_AR
      : lang === 'de'
      ? MONTH_NAMES_DE
      : MONTH_NAMES_EN;

  if (period.mode === 'month') {
    const { year, month } = period;
    const mStr = String(month).padStart(2, '0');
    const startDate = `${year}-${mStr}-01`;
    // Last day of month
    const lastDayNum = new Date(year, month, 0).getDate();
    const endDate = `${year}-${mStr}-${String(lastDayNum).padStart(2, '0')}`;

    const now = new Date();
    const isOngoing = now.getFullYear() === year && now.getMonth() + 1 === month;
    const label = `${months[month - 1]} ${year}`;

    return {
      mode: 'month',
      startDate,
      endDate,
      isOngoing,
      label,
      year,
      month,
    };
  } else {
    // Spending Cycle mode
    const resolvedCycle =
      (period.cycleId && cycles.find((c) => c.id === period.cycleId)) ||
      cycles.find((c) => c.endDate === null) ||
      (cycles.length > 0 ? cycles[0] : null);

    if (!resolvedCycle) {
      const today = getTodayISO();
      return {
        mode: 'cycle',
        startDate: today,
        endDate: today,
        isOngoing: false,
        label: lang === 'ar' ? 'لا توجد دورة إنفاق' : 'No Spending Cycle',
      };
    }

    const isOngoing = resolvedCycle.endDate === null;
    const effectiveEndDate = resolvedCycle.endDate || getTodayISO();
    const label = formatDateRange(resolvedCycle.startDate, resolvedCycle.endDate, lang);

    return {
      mode: 'cycle',
      startDate: resolvedCycle.startDate,
      endDate: effectiveEndDate,
      isOngoing,
      label,
      sublabel: resolvedCycle.notes,
      cycle: resolvedCycle,
    };
  }
}

/**
 * Checks if an expense belongs to a specific calendar month (year, month).
 * Uses the actual transaction date (YYYY-MM-DD) if present, falling back to exp.year & exp.month.
 */
export function isExpenseInCalendarMonth(
  exp: Expense,
  year: number,
  month: number
): boolean {
  if (exp.date && typeof exp.date === 'string') {
    const parts = exp.date.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) {
        return y === year && m === month;
      }
    }
  }
  return exp.year === year && exp.month === month;
}

/**
 * Centralized filter: Returns only the expenses that fall within the given AnalysisPeriod.
 */
export function filterExpensesByAnalysisPeriod(
  expenses: Expense[],
  period: AnalysisPeriod,
  cycles: SpendingCycle[]
): Expense[] {
  if (period.mode === 'month') {
    const { year, month } = period;
    return expenses.filter((exp) => isExpenseInCalendarMonth(exp, year, month));
  } else {
    const targetCycle =
      (period.cycleId && cycles.find((c) => c.id === period.cycleId)) ||
      cycles.find((c) => c.endDate === null) ||
      (cycles.length > 0 ? cycles[0] : null);

    if (!targetCycle || !targetCycle.startDate) return [];

    return expenses.filter((exp) => {
      if (!exp.date) return false;
      if (exp.date < targetCycle.startDate) return false;
      if (targetCycle.endDate && exp.date > targetCycle.endDate) return false;
      return true;
    });
  }
}

/**
 * Finds the specific SpendingCycle that a given expense belongs to, based on the expense date.
 * Returns null if the expense has no date or falls outside all recorded spending cycles.
 */
export function findCycleForExpense(
  exp: Expense,
  cycles: SpendingCycle[]
): SpendingCycle | null {
  if (!exp.date || !cycles || cycles.length === 0) return null;
  const sanitized = sanitizeAndHealCycles(cycles);
  for (const c of sanitized) {
    if (!c.startDate) continue;
    if (exp.date >= c.startDate && (!c.endDate || exp.date <= c.endDate)) {
      return c;
    }
  }
  return null;
}

export interface UnassignedExpensesResult {
  unassignedExpenses: Expense[];
  count: number;
  totalAmount: number;
}

/**
 * Identifies all transactions that do not fall into any recorded spending cycle date range.
 * Does not modify transaction records, dates, or source-period metadata.
 */
export function getUnassignedCycleExpenses(
  expenses: Expense[],
  cycles: SpendingCycle[]
): UnassignedExpensesResult {
  if (!expenses || expenses.length === 0) {
    return { unassignedExpenses: [], count: 0, totalAmount: 0 };
  }
  if (!cycles || cycles.length === 0) {
    const totalAmount = round2(expenses.reduce((s, e) => s + (e.amount || 0), 0));
    return {
      unassignedExpenses: [...expenses],
      count: expenses.length,
      totalAmount,
    };
  }

  const sanitized = sanitizeAndHealCycles(cycles);
  const unassigned = expenses.filter((exp) => {
    if (!exp.date) return true;
    const match = sanitized.some((c) => {
      if (!c.startDate) return false;
      if (exp.date < c.startDate) return false;
      if (c.endDate && exp.date > c.endDate) return false;
      return true;
    });
    return !match;
  });

  const totalAmount = round2(unassigned.reduce((s, e) => s + (e.amount || 0), 0));
  return {
    unassignedExpenses: unassigned,
    count: unassigned.length,
    totalAmount,
  };
}

/**
 * Calculates inclusive calendar days between two ISO date strings (YYYY-MM-DD).
 */
export function calculateInclusiveDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = endDate.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  if (utc2 < utc1) return 0;
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Adds a specific number of days to an ISO date string (YYYY-MM-DD).
 */
export function addDaysISO(startDate: string, days: number): string {
  const [y, m, d] = startDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const resY = date.getUTCFullYear();
  const resM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(date.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

export interface MonthCycleAllocation {
  cycle: SpendingCycle;
  overlapDays: number;
  totalCycleDays: number;
  allocatedAmount: number;
  isProjected: boolean;
}

export interface AllocatedMonthIncomeResult {
  allocatedIncome: number;
  isProjected: boolean;
  hasCycleAllocation: boolean;
  cycleAllocations: MonthCycleAllocation[];
}

/**
 * Calculates the allocated income for a specific calendar month (year, month)
 * derived from all spending cycles overlapping that month.
 *
 * Invariants:
 * 1. Day-based calendar overlap (no 4-week approximation).
 * 2. Exact cent conservation for closed cycles (sum of allocations across spanned months == cycle actual income).
 * 3. Projected allocation for active cycle based on most recent completed cycle's duration (default 30 days).
 * 4. Sums all applicable spending cycle allocations for months with multiple cycles.
 */
export function calculateAllocatedIncomeForMonth(
  targetYear: number,
  targetMonth: number,
  cycles: SpendingCycle[]
): AllocatedMonthIncomeResult {
  const healed = sanitizeAndHealCycles(cycles);
  if (!healed || healed.length === 0) {
    return {
      allocatedIncome: 0,
      isProjected: false,
      hasCycleAllocation: false,
      cycleAllocations: [],
    };
  }

  const targetMStr = String(targetMonth).padStart(2, '0');
  const targetMonthStart = `${targetYear}-${targetMStr}-01`;
  const lastDayNum = new Date(targetYear, targetMonth, 0).getDate();
  const targetMonthEnd = `${targetYear}-${targetMStr}-${String(lastDayNum).padStart(2, '0')}`;

  // Find most recent completed cycle duration for active cycle estimation
  const completedCycles = healed.filter((c) => c.endDate !== null);
  const defaultCycleDays =
    completedCycles.length > 0
      ? calculateInclusiveDays(completedCycles[0].startDate, completedCycles[0].endDate!)
      : 30;

  const cycleAllocations: MonthCycleAllocation[] = [];
  let totalAllocated = 0;
  let isAnyProjected = false;

  for (const cycle of healed) {
    const cycleIncome = typeof cycle.income === 'number' && cycle.income > 0 ? cycle.income : 0;
    if (cycleIncome <= 0) continue;

    const isActive = cycle.endDate === null;
    let effectiveEndDate: string;
    let totalCycleDays: number;

    if (isActive) {
      // Projected duration based on best available cycle-length information
      totalCycleDays = defaultCycleDays > 0 ? defaultCycleDays : 30;
      effectiveEndDate = addDaysISO(cycle.startDate, totalCycleDays - 1);
    } else {
      effectiveEndDate = cycle.endDate!;
      totalCycleDays = calculateInclusiveDays(cycle.startDate, effectiveEndDate);
      if (totalCycleDays <= 0) totalCycleDays = 1;
    }

    // Check if cycle overlaps with target month
    if (cycle.startDate > targetMonthEnd || effectiveEndDate < targetMonthStart) {
      continue;
    }

    // Generate all calendar months spanned by this cycle
    const [sy, sm] = cycle.startDate.split('-').map(Number);
    const [ey, em] = effectiveEndDate.split('-').map(Number);

    const spannedMonths: Array<{ year: number; month: number; days: number }> = [];
    let curY = sy;
    let curM = sm;

    while (curY < ey || (curY === ey && curM <= em)) {
      const curMStr = String(curM).padStart(2, '0');
      const mStart = `${curY}-${curMStr}-01`;
      const mDays = new Date(curY, curM, 0).getDate();
      const mEnd = `${curY}-${curMStr}-${String(mDays).padStart(2, '0')}`;

      const overlapStart = cycle.startDate > mStart ? cycle.startDate : mStart;
      const overlapEnd = effectiveEndDate < mEnd ? effectiveEndDate : mEnd;
      const overlapDays = overlapStart <= overlapEnd ? calculateInclusiveDays(overlapStart, overlapEnd) : 0;

      if (overlapDays > 0) {
        spannedMonths.push({ year: curY, month: curM, days: overlapDays });
      }

      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    if (!isActive) {
      // Closed cycle: exact cent conservation
      let accumulated = 0;
      let targetMonthAllocation = 0;
      let targetMonthOverlapDays = 0;

      for (let i = 0; i < spannedMonths.length; i++) {
        const item = spannedMonths[i];
        let monthAmount: number;
        if (i === spannedMonths.length - 1) {
          // Final month receives exact remainder so sum equals cycle actual income exactly
          monthAmount = round2(cycleIncome - accumulated);
        } else {
          monthAmount = round2((item.days / totalCycleDays) * cycleIncome);
          accumulated = round2(accumulated + monthAmount);
        }

        if (item.year === targetYear && item.month === targetMonth) {
          targetMonthAllocation = monthAmount;
          targetMonthOverlapDays = item.days;
        }
      }

      if (targetMonthOverlapDays > 0) {
        totalAllocated = round2(totalAllocated + targetMonthAllocation);
        cycleAllocations.push({
          cycle,
          overlapDays: targetMonthOverlapDays,
          totalCycleDays,
          allocatedAmount: targetMonthAllocation,
          isProjected: false,
        });
      }
    } else {
      // Active cycle: daily rate based on estimated cycle length
      const overlapStart = cycle.startDate > targetMonthStart ? cycle.startDate : targetMonthStart;
      const overlapEnd = effectiveEndDate < targetMonthEnd ? effectiveEndDate : targetMonthEnd;
      const overlapDays = overlapStart <= overlapEnd ? calculateInclusiveDays(overlapStart, overlapEnd) : 0;

      if (overlapDays > 0) {
        const targetMonthAllocation = round2((overlapDays / totalCycleDays) * cycleIncome);
        totalAllocated = round2(totalAllocated + targetMonthAllocation);
        isAnyProjected = true;
        cycleAllocations.push({
          cycle,
          overlapDays,
          totalCycleDays,
          allocatedAmount: targetMonthAllocation,
          isProjected: true,
        });
      }
    }
  }

  return {
    allocatedIncome: totalAllocated,
    isProjected: isAnyProjected,
    hasCycleAllocation: cycleAllocations.length > 0,
    cycleAllocations,
  };
}

/**
 * Calculates the allocated category budgets for a specific calendar month (targetYear, targetMonth)
 * derived from all spending cycles overlapping that month.
 *
 * Invariants:
 * 1. Day-based calendar overlap (no 4-week approximation).
 * 2. Exact cent conservation for closed cycles: sum of allocations for a category across all spanned months == cycle category budget.
 * 3. Projected allocation for active cycle based on most recent completed cycle's duration (default 30 days).
 * 4. Sums all applicable spending cycle allocations for months with multiple overlapping cycles.
 * 5. Handles cross-year spans (e.g. Dec -> Jan) seamlessly.
 * 6. Category-by-category independence (each category is computed separately).
 */
export function calculateAllocatedCategoryBudgetsForMonth(
  targetYear: number,
  targetMonth: number,
  cycles: SpendingCycle[],
  expenses: Expense[] = [],
  categories: Category[] = []
): AllocatedMonthBudgetsResult {
  const healed = sanitizeAndHealCycles(cycles);
  if (!healed || healed.length === 0) {
    return {
      budgets: {},
      categoryDetails: {},
      hasAnyCycleAllocation: false,
      isAnyProjected: false,
    };
  }

  const isFixedCategory = (catId: string) => {
    if (catId === 'cat-fixed') return true;
    const cat = categories.find((c) => c.id === catId);
    return cat?.defaultType === 'fixed';
  };

  const targetMStr = String(targetMonth).padStart(2, '0');
  const targetMonthStart = `${targetYear}-${targetMStr}-01`;
  const lastDayNum = new Date(targetYear, targetMonth, 0).getDate();
  const targetMonthEnd = `${targetYear}-${targetMStr}-${String(lastDayNum).padStart(2, '0')}`;

  // Find most recent completed cycle duration for active cycle estimation
  const completedCycles = healed.filter((c) => c.endDate !== null);
  const defaultCycleDays =
    completedCycles.length > 0
      ? calculateInclusiveDays(completedCycles[0].startDate, completedCycles[0].endDate!)
      : 30;

  // Track per-category allocations across all overlapping cycles
  const catAllocationsMap: Record<
    string,
    {
      totalAllocated: number;
      isProjected: boolean;
      allocations: CategoryBudgetCycleAllocation[];
    }
  > = {};

  let hasAnyCycleAllocation = false;
  let isAnyProjected = false;
  const fixedCatIdsWithCycleBudget = new Set<string>();

  for (const cycle of healed) {
    if (!cycle.budgets || Object.keys(cycle.budgets).length === 0) {
      continue;
    }

    const isActive = cycle.endDate === null;
    let effectiveEndDate: string;
    let totalCycleDays: number;

    if (isActive) {
      totalCycleDays = defaultCycleDays > 0 ? defaultCycleDays : 30;
      effectiveEndDate = addDaysISO(cycle.startDate, totalCycleDays - 1);
    } else {
      effectiveEndDate = cycle.endDate!;
      totalCycleDays = calculateInclusiveDays(cycle.startDate, effectiveEndDate);
      if (totalCycleDays <= 0) totalCycleDays = 1;
    }

    // Check if cycle overlaps with target month
    if (cycle.startDate > targetMonthEnd || effectiveEndDate < targetMonthStart) {
      continue;
    }

    // Identify fixed categories configured on this overlapping cycle
    for (const [catId, rawBudget] of Object.entries(cycle.budgets)) {
      if (isFixedCategory(catId) && typeof rawBudget === 'number' && rawBudget > 0) {
        fixedCatIdsWithCycleBudget.add(catId);
      }
    }

    // Generate all calendar months spanned by this cycle
    const [sy, sm] = cycle.startDate.split('-').map(Number);
    const [ey, em] = effectiveEndDate.split('-').map(Number);

    const spannedMonths: Array<{ year: number; month: number; days: number }> = [];
    let curY = sy;
    let curM = sm;

    while (curY < ey || (curY === ey && curM <= em)) {
      const curMStr = String(curM).padStart(2, '0');
      const mStart = `${curY}-${curMStr}-01`;
      const mDays = new Date(curY, curM, 0).getDate();
      const mEnd = `${curY}-${curMStr}-${String(mDays).padStart(2, '0')}`;

      const overlapStart = cycle.startDate > mStart ? cycle.startDate : mStart;
      const overlapEnd = effectiveEndDate < mEnd ? effectiveEndDate : mEnd;
      const overlapDays = overlapStart <= overlapEnd ? calculateInclusiveDays(overlapStart, overlapEnd) : 0;

      if (overlapDays > 0) {
        spannedMonths.push({ year: curY, month: curM, days: overlapDays });
      }

      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    // For each variable category configured in this cycle:
    // Fixed expenses are excluded here because they represent discrete contractual obligations
    // tied to explicit calendar dates and must not be day-prorated.
    for (const [catId, rawBudget] of Object.entries(cycle.budgets)) {
      const catBudget = typeof rawBudget === 'number' && rawBudget > 0 ? rawBudget : 0;
      if (catBudget <= 0) continue;

      if (isFixedCategory(catId)) {
        continue;
      }

      if (!catAllocationsMap[catId]) {
        catAllocationsMap[catId] = {
          totalAllocated: 0,
          isProjected: false,
          allocations: [],
        };
      }

      if (!isActive) {
        // Closed cycle: exact cent conservation across spanned months
        let accumulated = 0;
        let targetMonthAllocation = 0;
        let targetMonthOverlapDays = 0;

        for (let i = 0; i < spannedMonths.length; i++) {
          const item = spannedMonths[i];
          let monthAmount: number;
          if (i === spannedMonths.length - 1) {
            // Final month receives exact remainder so sum equals cycle actual budget exactly
            monthAmount = round2(catBudget - accumulated);
          } else {
            monthAmount = round2((item.days / totalCycleDays) * catBudget);
            accumulated = round2(accumulated + monthAmount);
          }

          if (item.year === targetYear && item.month === targetMonth) {
            targetMonthAllocation = monthAmount;
            targetMonthOverlapDays = item.days;
          }
        }

        if (targetMonthOverlapDays > 0 && targetMonthAllocation > 0) {
          catAllocationsMap[catId].totalAllocated = round2(
            catAllocationsMap[catId].totalAllocated + targetMonthAllocation
          );
          catAllocationsMap[catId].allocations.push({
            cycleId: cycle.id,
            amount: targetMonthAllocation,
            overlapDays: targetMonthOverlapDays,
            totalCycleDays,
            isProjected: false,
          });
          hasAnyCycleAllocation = true;
        }
      } else {
        // Active cycle: daily rate based on estimated cycle length
        const overlapStart = cycle.startDate > targetMonthStart ? cycle.startDate : targetMonthStart;
        const overlapEnd = effectiveEndDate < targetMonthEnd ? effectiveEndDate : targetMonthEnd;
        const overlapDays = overlapStart <= overlapEnd ? calculateInclusiveDays(overlapStart, overlapEnd) : 0;

        if (overlapDays > 0) {
          const targetMonthAllocation = round2((overlapDays / totalCycleDays) * catBudget);
          if (targetMonthAllocation > 0) {
            catAllocationsMap[catId].totalAllocated = round2(
              catAllocationsMap[catId].totalAllocated + targetMonthAllocation
            );
            catAllocationsMap[catId].isProjected = true;
            isAnyProjected = true;
            hasAnyCycleAllocation = true;
            catAllocationsMap[catId].allocations.push({
              cycleId: cycle.id,
              amount: targetMonthAllocation,
              overlapDays,
              totalCycleDays,
              isProjected: true,
            });
          }
        }
      }
    }
  }

  // Handle Fixed Expense Categories:
  // Instead of generic day-overlap proration, attribute actual/scheduled fixed expenses
  // dated within targetYear & targetMonth.
  for (const fixedCatId of fixedCatIdsWithCycleBudget) {
    const monthFixedExpenses = expenses.filter((exp) => {
      if (!isExpenseInCalendarMonth(exp, targetYear, targetMonth)) return false;
      return (
        exp.categoryId === fixedCatId ||
        (fixedCatId === 'cat-fixed' && (exp.type === 'fixed' || exp.isRecurring))
      );
    });

    const monthFixedTotal = round2(
      monthFixedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    );

    catAllocationsMap[fixedCatId] = {
      totalAllocated: monthFixedTotal,
      isProjected: false,
      allocations: [
        {
          cycleId: 'dated-obligations',
          amount: monthFixedTotal,
          overlapDays: 0,
          totalCycleDays: 0,
          isProjected: false,
        },
      ],
    };
    hasAnyCycleAllocation = true;
  }

  const budgets: Record<string, number> = {};
  const categoryDetails: Record<string, AllocatedCategoryBudgetResult> = {};

  for (const [catId, data] of Object.entries(catAllocationsMap)) {
    budgets[catId] = data.totalAllocated;
    categoryDetails[catId] = {
      allocatedBudget: data.totalAllocated,
      isProjected: data.isProjected,
      hasCycleAllocation: data.allocations.length > 0,
      cycleAllocations: data.allocations,
    };
  }

  return {
    budgets,
    categoryDetails,
    hasAnyCycleAllocation,
    isAnyProjected,
  };
}

/**
 * Computes complete financial summary (KPIs, category totals, store clusters, budgets)
 * for ANY analysis period (Calendar Month or Spending Cycle) using a single authoritative pipeline.
 */
export function calculatePeriodFinancialSummary(
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[],
  period: AnalysisPeriod,
  cycles: SpendingCycle[],
  lang: Language = 'en',
  bankTransactions: BankTransaction[] = []
): FinancialSummary {
  const range = getAnalysisPeriodRange(period, cycles, lang);
  const periodExpenses = filterExpensesByAnalysisPeriod(expenses, period, cycles);

  let income = 0;
  let incomeNotSet = false;
  let customBudgets: Record<string, number> = {};
  let cycleContext: SpendingCycle | undefined;
  let allocationResult: AllocatedMonthIncomeResult | undefined;
  let allocatedBudgetsResult: AllocatedMonthBudgetsResult | undefined;

  if (period.mode === 'month') {
    const record = monthRecords.find(
      (m) => m.year === period.year && m.month === period.month
    );

    allocationResult = calculateAllocatedIncomeForMonth(
      period.year,
      period.month,
      cycles
    );

    if (record && typeof record.income === 'number' && !isNaN(record.income)) {
      income = record.income;
      incomeNotSet = income <= 0;
    } else if (allocationResult.hasCycleAllocation) {
      income = allocationResult.allocatedIncome;
      incomeNotSet = income <= 0;
    } else {
      income = record && typeof record.income === 'number' ? record.income : 0;
      incomeNotSet = income <= 0;
    }

    allocatedBudgetsResult = calculateAllocatedCategoryBudgetsForMonth(
      period.year,
      period.month,
      cycles,
      expenses,
      categories
    );

    const legacyBudgets = record ? record.budgets || {} : {};

    // For customBudgets: if a category has a derived cycle budget, use it.
    // Otherwise fallback to legacy standalone custom budget if set.
    customBudgets = { ...legacyBudgets, ...allocatedBudgetsResult.budgets };
  } else {
    cycleContext = range.cycle;
    if (cycleContext) {
      income = typeof cycleContext.income === 'number' ? cycleContext.income : 0;
      incomeNotSet =
        cycleContext.income === undefined ||
        cycleContext.income === null ||
        cycleContext.income <= 0;

      // Use cycle's specific budgets if set, otherwise fallback to the month budget for cycle's start date
      if (cycleContext.budgets && Object.keys(cycleContext.budgets).length > 0) {
        customBudgets = cycleContext.budgets;
      } else {
        const [cy, cm] = (cycleContext.startDate || '').split('-').map(Number);
        if (cy && cm) {
          const rec = monthRecords.find((m) => m.year === cy && m.month === cm);
          if (rec?.budgets) {
            customBudgets = rec.budgets;
          }
        }
      }
    }
  }

  let totalExpenses = 0;
  let fixedExpenses = 0;
  let variableExpenses = 0;
  let recurringTotal = 0;
  let oneTimeTotal = 0;

  const catSpentMap: Record<string, { total: number; count: number }> = {};
  categories.forEach((cat) => {
    catSpentMap[cat.id] = { total: 0, count: 0 };
  });

  const storeMap: Record<
    string,
    {
      store: string;
      categoryId: string;
      categoryName: string;
      total: number;
      count: number;
      expenses: Expense[];
    }
  > = {};

  periodExpenses.forEach((exp) => {
    const amt = exp.amount;
    totalExpenses += amt;

    if (exp.type === 'fixed') {
      fixedExpenses += amt;
    } else {
      variableExpenses += amt;
    }

    if (exp.isRecurring) {
      recurringTotal += amt;
    } else {
      oneTimeTotal += amt;
    }

    if (!catSpentMap[exp.categoryId]) {
      catSpentMap[exp.categoryId] = { total: 0, count: 0 };
    }
    catSpentMap[exp.categoryId].total += amt;
    catSpentMap[exp.categoryId].count += 1;

    const storeKey = (exp.store || 'Unknown').trim();
    const cat = categories.find((c) => c.id === exp.categoryId);
    const catName = cat ? cat.name : 'Other';

    if (!storeMap[storeKey]) {
      storeMap[storeKey] = {
        store: storeKey,
        categoryId: exp.categoryId,
        categoryName: catName,
        total: 0,
        count: 0,
        expenses: [],
      };
    }
    storeMap[storeKey].total += amt;
    storeMap[storeKey].count += 1;
    storeMap[storeKey].expenses.push(exp);
  });

  totalExpenses = round2(totalExpenses);
  fixedExpenses = round2(fixedExpenses);
  variableExpenses = round2(variableExpenses);
  recurringTotal = round2(recurringTotal);
  oneTimeTotal = round2(oneTimeTotal);

  const unspentIncome = round2(income - totalExpenses);
  const remainingIncome = unspentIncome; // Backwards-compatible alias
  const spendingWithoutOneTime = round2(totalExpenses - oneTimeTotal);

  // Authoritative Period Saving & Spendable Balance from Bank Transaction Ledger:
  const periodId =
    period.mode === 'cycle'
      ? (period.cycleId || cycleContext?.id || '')
      : `${period.year}-${period.month}`;

  let actualSavings = 0;
  let grossTransfers = 0;
  let grossReturns = 0;
  let availableSpendingBalance = unspentIncome;

  if (bankTransactions && bankTransactions.length > 0) {
    const transferInfo = getPeriodSavingTransferInfo(
      unspentIncome,
      period.mode,
      periodId,
      bankTransactions,
      range.startDate,
      range.endDate || undefined
    );
    grossTransfers = transferInfo.grossTransferredAmount;
    grossReturns = transferInfo.grossReturnedAmount;
    actualSavings = Math.max(0, transferInfo.netTransferredAmount);
    availableSpendingBalance = transferInfo.stillAvailable;
  }

  const categorySummaries: CategorySummary[] = categories.map((cat) => {
    const spentData = catSpentMap[cat.id] || { total: 0, count: 0 };
    const totalSpent = round2(spentData.total);
    const budget = customBudgets[cat.id] !== undefined ? customBudgets[cat.id] : 0;
    const remainingBudget = round2(budget - totalSpent);
    const percentageUsed = budget > 0 ? round2((totalSpent / budget) * 100) : 0;
    const isOverBudget = budget > 0 && totalSpent > budget;

    const catAllocDetail =
      period.mode === 'month' ? allocatedBudgetsResult?.categoryDetails[cat.id] : undefined;
    const hasCycleBudget =
      period.mode === 'month' ? Boolean(catAllocDetail?.hasCycleAllocation) : false;
    const isProjectedBudget =
      period.mode === 'month' ? Boolean(catAllocDetail?.isProjected) : false;
    const cycleAllocations = catAllocDetail?.cycleAllocations;

    const isSavingCat = cat.id === 'cat-saving' || cat.name.toLowerCase() === 'saving';

    return {
      category: cat,
      totalSpent,
      budget,
      remainingBudget,
      percentageUsed,
      isOverBudget,
      count: spentData.count,
      hasCycleBudget,
      isProjectedBudget,
      cycleAllocations,
      actualSavings: isSavingCat ? actualSavings : 0,
      grossTransfers: isSavingCat ? grossTransfers : 0,
      grossReturns: isSavingCat ? grossReturns : 0,
    };
  });

  const storeSummaries: StoreSummary[] = Object.values(storeMap)
    .map((s) => ({
      store: s.store,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      totalSpent: round2(s.total),
      transactionCount: s.count,
      expenses: s.expenses.sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const year = period.mode === 'month' ? period.year : range.year || new Date().getFullYear();
  const month = period.mode === 'month' ? period.month : range.month || new Date().getMonth() + 1;

  return {
    year,
    month,
    income,
    allocatedIncome: allocationResult?.hasCycleAllocation ? allocationResult.allocatedIncome : undefined,
    isProjectedIncome: allocationResult?.isProjected,
    hasCycleAllocation: allocationResult?.hasCycleAllocation,
    totalExpenses,
    remainingIncome,
    unspentIncome,
    actualSavings,
    availableSpendingBalance,
    grossTransfers,
    grossReturns,
    fixedExpenses,
    variableExpenses,
    recurringTotal,
    oneTimeTotal,
    spendingWithoutOneTime,
    categorySummaries,
    storeSummaries,
    periodMode: period.mode,
    cycle: cycleContext,
    incomeNotSet,
    periodRange: range,
  };
}

/**
 * Calculates comparative financial metrics across ALL historical and active Spending Cycles.
 * Allows deep historical trajectory comparison matching the Month Comparison view.
 */
export function calculateCycleComparison(
  cycles: SpendingCycle[],
  expenses: Expense[],
  categories: Category[],
  lang: Language = 'en',
  bankTransactions: BankTransaction[] = []
): CycleComparisonItem[] {
  const sanitized = sanitizeAndHealCycles(cycles);
  // Sort chronologically ascending for the trajectory chart (oldest to newest)
  const chronological = [...sanitized].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return chronological.map((cycle) => {
    // Authoritatively delegate cycle financial calculations to canonical calculatePeriodFinancialSummary
    const summary = calculatePeriodFinancialSummary(
      expenses,
      categories,
      [],
      { mode: 'cycle', cycleId: cycle.id },
      sanitized,
      lang,
      bankTransactions
    );

    const categoryTotals: Record<string, number> = {};
    categories.forEach((cat) => {
      categoryTotals[cat.id] = 0;
    });
    summary.categorySummaries.forEach((cs) => {
      categoryTotals[cs.category.id] = cs.totalSpent;
    });
    // Assign authoritative actual savings to Saving category
    categoryTotals['cat-saving'] = summary.actualSavings || 0;

    const label = formatDateRange(cycle.startDate, cycle.endDate, lang);

    return {
      cycleId: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      label,
      notes: cycle.notes,
      isOngoing: cycle.endDate === null,
      income: summary.income,
      incomeNotSet: summary.incomeNotSet,
      totalExpenses: summary.totalExpenses,
      fixedExpenses: summary.fixedExpenses,
      variableExpenses: summary.variableExpenses,
      unspentIncome: summary.unspentIncome !== undefined ? summary.unspentIncome : summary.remainingIncome,
      remainingMoney: summary.availableSpendingBalance !== undefined ? summary.availableSpendingBalance : summary.remainingIncome,
      availableSpendingBalance: summary.availableSpendingBalance,
      actualSavings: summary.actualSavings || 0,
      grossTransfers: summary.grossTransfers || 0,
      grossReturns: summary.grossReturns || 0,
      categoryTotals,
      cycle,
    };
  });
}

/**
 * Validates starting a new spending cycle or editing an existing cycle date.
 * Explicitly guards against:
 * 1. Empty or malformed dates.
 * 2. Duplicate start date collision with an existing cycle.
 * 3. Automatic closure determination of the previous active cycle.
 */
export function validateNewCycle(
  newStartDate: string,
  existingCycles: SpendingCycle[],
  editingCycleId?: string
): {
  isValid: boolean;
  error?: string;
  previousCycleToClose?: SpendingCycle;
  calculatedPrevEndDate?: string;
  isHistorical?: boolean;
} {
  if (!newStartDate || !newStartDate.trim()) {
    return { isValid: false, error: 'Start date is required.' };
  }

  // Check ISO format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newStartDate)) {
    return { isValid: false, error: 'Invalid date format (must be YYYY-MM-DD).' };
  }

  // Check duplicate startDate collision
  const collision = existingCycles.find(
    (c) => c.startDate === newStartDate && c.id !== editingCycleId
  );
  if (collision) {
    return {
      isValid: false,
      error: `A spending cycle already exists starting on ${newStartDate}. Please choose a different date.`,
    };
  }

  // Identify active cycle
  const currentActive = existingCycles.find((c) => c.endDate === null && c.id !== editingCycleId);

  if (currentActive) {
    if (newStartDate < currentActive.startDate) {
      // Adding a cycle earlier than current active cycle: this is a historical backfill
      return {
        isValid: true,
        isHistorical: true,
      };
    } else {
      // Starting a new cycle ahead of current active: will close current active cycle
      const calculatedPrevEndDate = getPreviousDayString(newStartDate);
      return {
        isValid: true,
        previousCycleToClose: currentActive,
        calculatedPrevEndDate,
      };
    }
  }

  return { isValid: true };
}
