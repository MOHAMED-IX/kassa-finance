import {
  Category,
  CategorySummary,
  Expense,
  FinancialSummary,
  MonthComparisonItem,
  MonthRecord,
  StoreSummary,
} from '../types/finance';
import { MONTH_NAMES_EN, round2 } from './formatters';

/**
 * Calculates complete financial metrics for a specific month and year.
 */
export function calculateFinancialSummary(
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[],
  year: number,
  month: number
): FinancialSummary {
  // Filter expenses strictly for this month and year
  const currentExpenses = expenses.filter(
    (exp) => exp.year === year && exp.month === month
  );

  // Month Record for income and category budgets
  const monthRecord = monthRecords.find(
    (mr) => mr.year === year && mr.month === month
  );
  const income = monthRecord ? monthRecord.income : 0;
  const customBudgets = monthRecord ? monthRecord.budgets : {};

  let totalExpenses = 0;
  let fixedExpenses = 0;
  let variableExpenses = 0;
  let recurringTotal = 0;
  let oneTimeTotal = 0;

  // Track category spent map
  const catSpentMap: Record<string, { total: number; count: number }> = {};
  categories.forEach((cat) => {
    catSpentMap[cat.id] = { total: 0, count: 0 };
  });

  // Track store spent map
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

  currentExpenses.forEach((exp) => {
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

    // Category tracking
    if (!catSpentMap[exp.categoryId]) {
      catSpentMap[exp.categoryId] = { total: 0, count: 0 };
    }
    catSpentMap[exp.categoryId].total += amt;
    catSpentMap[exp.categoryId].count += 1;

    // Store tracking (normalized by trimmed lower case for matching, preserved display name)
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

  // Round global numbers
  totalExpenses = round2(totalExpenses);
  fixedExpenses = round2(fixedExpenses);
  variableExpenses = round2(variableExpenses);
  recurringTotal = round2(recurringTotal);
  oneTimeTotal = round2(oneTimeTotal);

  const remainingIncome = round2(income - totalExpenses);
  const spendingWithoutOneTime = round2(totalExpenses - oneTimeTotal);

  // Category Summaries
  const categorySummaries: CategorySummary[] = categories.map((cat) => {
    const spentData = catSpentMap[cat.id] || { total: 0, count: 0 };
    const totalSpent = round2(spentData.total);
    const budget = customBudgets[cat.id] !== undefined ? customBudgets[cat.id] : 0;
    const remainingBudget = round2(budget - totalSpent);
    const percentageUsed = budget > 0 ? round2((totalSpent / budget) * 100) : 0;
    const isOverBudget = budget > 0 && totalSpent > budget;

    return {
      category: cat,
      totalSpent,
      budget,
      remainingBudget,
      percentageUsed,
      isOverBudget,
      count: spentData.count,
    };
  });

  // Store summaries sorted by highest spending
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

  return {
    year,
    month,
    income,
    totalExpenses,
    remainingIncome,
    fixedExpenses,
    variableExpenses,
    recurringTotal,
    oneTimeTotal,
    spendingWithoutOneTime,
    categorySummaries,
    storeSummaries,
  };
}

/**
 * Calculates month-by-month financial metrics across an entire year for comparison.
 */
export function calculateYearMonthlyComparison(
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[],
  year: number
): MonthComparisonItem[] {
  const result: MonthComparisonItem[] = [];

  for (let m = 1; m <= 12; m++) {
    const summary = calculateFinancialSummary(
      expenses,
      categories,
      monthRecords,
      year,
      m
    );

    const categoryTotals: Record<string, number> = {};
    summary.categorySummaries.forEach((cs) => {
      categoryTotals[cs.category.id] = cs.totalSpent;
    });

    result.push({
      year,
      month: m,
      monthName: MONTH_NAMES_EN[m - 1],
      income: summary.income,
      totalExpenses: summary.totalExpenses,
      fixedExpenses: summary.fixedExpenses,
      variableExpenses: summary.variableExpenses,
      remainingMoney: summary.remainingIncome,
      categoryTotals,
    });
  }

  return result;
}
