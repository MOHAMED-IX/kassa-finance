import {
  BankTransaction,
  Category,
  CategorySummary,
  Expense,
  FinancialSummary,
  MonthComparisonItem,
  MonthRecord,
  SpendingCycle,
  StoreSummary,
} from '../types/finance';
import { MONTH_NAMES_EN, round2 } from './formatters';
import {
  calculateAllocatedCategoryBudgetsForMonth,
  calculateAllocatedIncomeForMonth,
  calculatePeriodFinancialSummary,
} from './periodAbstraction';
import { getPeriodSavingTransferInfo } from './bankCalculations';

export * from './periodAbstraction';

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
 * Calculates complete financial metrics for a specific month and year.
 * Canonical delegate to calculatePeriodFinancialSummary({ mode: 'month', year, month }).
 */
export function calculateFinancialSummary(
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[],
  year: number,
  month: number,
  spendingCycles: SpendingCycle[] = [],
  bankTransactions: BankTransaction[] = []
): FinancialSummary {
  return calculatePeriodFinancialSummary(
    expenses,
    categories,
    monthRecords,
    { mode: 'month', year, month },
    spendingCycles,
    'en',
    bankTransactions
  );
}

/**
 * Calculates month-by-month financial metrics across an entire year for comparison.
 */
export function calculateYearMonthlyComparison(
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[],
  year: number,
  spendingCycles: SpendingCycle[] = [],
  bankTransactions: BankTransaction[] = []
): MonthComparisonItem[] {
  const result: MonthComparisonItem[] = [];

  for (let m = 1; m <= 12; m++) {
    const summary = calculateFinancialSummary(
      expenses,
      categories,
      monthRecords,
      year,
      m,
      spendingCycles,
      bankTransactions
    );

    const categoryTotals: Record<string, number> = {};
    summary.categorySummaries.forEach((cs) => {
      categoryTotals[cs.category.id] = cs.totalSpent;
    });
    // Authoritative actual savings for Saving category
    categoryTotals['cat-saving'] = summary.actualSavings || 0;

    result.push({
      year,
      month: m,
      monthName: MONTH_NAMES_EN[m - 1],
      income: summary.income,
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
    });
  }

  return result;
}

/**
 * Filter expenses belonging to a specific SpendingCycle.
 * Date matching:
 * - date >= cycle.startDate
 * - if cycle.endDate is set: date <= cycle.endDate
 */
export function filterExpensesByCycle(expenses: Expense[], cycle: SpendingCycle): Expense[] {
  if (!cycle || !cycle.startDate) return [];
  return expenses.filter((exp) => {
    if (!exp.date) return false;
    if (exp.date < cycle.startDate) return false;
    if (cycle.endDate && exp.date > cycle.endDate) return false;
    return true;
  });
}

/**
 * Calculates complete financial metrics for a specific SpendingCycle.
 * Preserved for backwards compatibility, delegating strictly to canonical calculatePeriodFinancialSummary.
 */
export function calculateCycleFinancialSummary(
  expenses: Expense[],
  categories: Category[],
  cycle: SpendingCycle,
  budgets: Record<string, number> = {},
  bankTransactions: BankTransaction[] = []
): FinancialSummary {
  const customCycle: SpendingCycle = budgets && Object.keys(budgets).length > 0
    ? { ...cycle, budgets: { ...cycle.budgets, ...budgets } }
    : cycle;

  return calculatePeriodFinancialSummary(
    expenses,
    categories,
    [],
    { mode: 'cycle', cycleId: cycle.id },
    [customCycle],
    'en',
    bankTransactions
  );
}

