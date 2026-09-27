export type ExpenseType = 'fixed' | 'variable';

export interface Expense {
  id: string;
  name: string;
  amount: number; // In EUR, e.g. 26.15
  categoryId: string;
  store: string; // e.g. "Lidl", "Aldi", "Rewe", "Barmer", "Rent"
  date: string; // YYYY-MM-DD
  month: number; // 1 to 12
  year: number; // e.g. 2026
  isRecurring: boolean; // Yes / No
  type: ExpenseType; // 'fixed' | 'variable'
  notes?: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  color: string;
  iconName: string;
  defaultType: ExpenseType;
  stores: string[];
}

export interface MonthlyBudget {
  categoryId: string;
  budget: number; // monthly budget in EUR
}

export interface MonthRecord {
  year: number;
  month: number;
  income: number;
  budgets: Record<string, number>; // categoryId -> budget
  notes?: string;
}

export interface FinancialSummary {
  year: number;
  month: number;
  income: number;
  totalExpenses: number;
  remainingIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  recurringTotal: number;
  oneTimeTotal: number;
  spendingWithoutOneTime: number;
  categorySummaries: CategorySummary[];
  storeSummaries: StoreSummary[];
}

export interface CategorySummary {
  category: Category;
  totalSpent: number;
  budget: number;
  remainingBudget: number; // budget - totalSpent (can be negative if over budget)
  percentageUsed: number; // (totalSpent / budget) * 100
  isOverBudget: boolean;
  count: number;
}

export interface StoreSummary {
  store: string;
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  transactionCount: number;
  expenses: Expense[];
}

export interface MonthComparisonItem {
  year: number;
  month: number;
  monthName: string;
  income: number;
  totalExpenses: number;
  fixedExpenses: number;
  variableExpenses: number;
  remainingMoney: number;
  categoryTotals: Record<string, number>;
}
