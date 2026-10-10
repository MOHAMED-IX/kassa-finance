export type Currency = 'EUR' | 'USD' | 'EGP';

export interface CurrencyConfig {
  code: Currency;
  name: string;
  symbol: string;
  label: string;
  nameKey: 'currencyEuro' | 'currencyUsd' | 'currencyEgp';
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    label: 'EUR',
    nameKey: 'currencyEuro',
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    label: 'USD',
    nameKey: 'currencyUsd',
  },
  EGP: {
    code: 'EGP',
    name: 'Egyptian Pound',
    symbol: 'E£',
    label: 'EGP',
    nameKey: 'currencyEgp',
  },
} as const;

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  CURRENCIES.EUR,
  CURRENCIES.USD,
  CURRENCIES.EGP,
];

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

export type PeriodMode = 'month' | 'cycle';

export interface MonthPeriod {
  mode: 'month';
  year: number;
  month: number;
}

export interface CyclePeriod {
  mode: 'cycle';
  cycleId?: string;
}

export type AnalysisPeriod = MonthPeriod | CyclePeriod;

export interface AnalysisPeriodRange {
  mode: PeriodMode;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive)
  isOngoing: boolean;
  label: string;
  sublabel?: string;
  cycle?: SpendingCycle;
  year?: number;
  month?: number;
}

export interface SpendingCycle {
  id: string;
  startDate: string; // YYYY-MM-DD (e.g. "2026-09-25")
  endDate: string | null; // YYYY-MM-DD or null while cycle is active
  income?: number | null; // EUR amount (e.g. 1186.00) - Authoritative Actual Income
  expectedNextCycleIncome?: number | null; // Optional planning expected income for next cycle
  notes?: string; // Optional label/notes (e.g. "September Salary")
  budgets?: Record<string, number>; // Optional category budgets specific to this cycle
  createdAt: number;
}

export interface FinancialSummary {
  year: number;
  month: number;
  income: number;
  allocatedIncome?: number;
  isProjectedIncome?: boolean;
  hasCycleAllocation?: boolean;
  totalExpenses: number;
  remainingIncome: number; // Backwards-compatible alias for unspentIncome
  unspentIncome?: number; // Income - Total Expenses
  actualSavings?: number; // Net amount explicitly transferred from spending to savings (not returned)
  availableSpendingBalance?: number; // Money currently available to spend = unspentIncome - actualSavings
  grossTransfers?: number; // Sum of saving-transfer transactions
  grossReturns?: number; // Sum of qualifying returns from savings
  fixedExpenses: number;
  variableExpenses: number;
  recurringTotal: number;
  oneTimeTotal: number;
  spendingWithoutOneTime: number;
  categorySummaries: CategorySummary[];
  storeSummaries: StoreSummary[];
  // Spending Cycle context (optional)
  periodMode?: PeriodMode;
  cycle?: SpendingCycle;
  incomeNotSet?: boolean;
  periodRange?: AnalysisPeriodRange;
}

export interface CategoryBudgetCycleAllocation {
  cycleId: string;
  amount: number;
  overlapDays: number;
  totalCycleDays: number;
  isProjected: boolean;
}

export interface AllocatedCategoryBudgetResult {
  allocatedBudget: number;
  isProjected: boolean;
  hasCycleAllocation: boolean;
  cycleAllocations: CategoryBudgetCycleAllocation[];
}

export interface AllocatedMonthBudgetsResult {
  budgets: Record<string, number>;
  categoryDetails: Record<string, AllocatedCategoryBudgetResult>;
  hasAnyCycleAllocation: boolean;
  isAnyProjected: boolean;
}

export interface CategorySummary {
  category: Category;
  totalSpent: number;
  budget: number;
  remainingBudget: number; // budget - totalSpent (can be negative if over budget)
  percentageUsed: number; // (totalSpent / budget) * 100
  isOverBudget: boolean;
  count: number;
  isProjectedBudget?: boolean;
  hasCycleBudget?: boolean;
  cycleAllocations?: CategoryBudgetCycleAllocation[];
  // Actual net savings for Saving category (from Bank transaction ledger)
  actualSavings?: number;
  grossTransfers?: number;
  grossReturns?: number;
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
  unspentIncome?: number; // Income - Total Expenses
  remainingMoney: number; // Available Spending Balance
  availableSpendingBalance?: number; // Explicit alias for remainingMoney
  actualSavings?: number; // Net actual savings
  grossTransfers?: number;
  grossReturns?: number;
  categoryTotals: Record<string, number>;
}

export interface CycleComparisonItem {
  cycleId: string;
  startDate: string;
  endDate: string | null;
  label: string;
  notes?: string;
  isOngoing: boolean;
  income: number;
  incomeNotSet?: boolean;
  totalExpenses: number;
  fixedExpenses: number;
  variableExpenses: number;
  unspentIncome?: number; // Income - Total Expenses
  remainingMoney: number; // Available Spending Balance
  availableSpendingBalance?: number; // Explicit alias for remainingMoney
  actualSavings?: number; // Net actual savings
  grossTransfers?: number;
  grossReturns?: number;
  categoryTotals: Record<string, number>;
  cycle: SpendingCycle;
}

export type BankTransactionType =
  | 'opening-balance'
  | 'saving-transfer'
  | 'bank-withdrawal'
  | 'manual-adjustment';

export type SourcePeriodMode = 'calendar-month' | 'spending-cycle';

export interface BankTransaction {
  id: string;
  type: BankTransactionType;
  amount: number; // In EUR. For opening-balance, saving-transfer, bank-withdrawal it's positive. For manual-adjustment, can be signed (+ or -).
  date: string; // YYYY-MM-DD
  note?: string;
  sourcePeriodMode?: SourcePeriodMode; // 'calendar-month' | 'spending-cycle'
  sourcePeriodId?: string; // e.g. "2026-09" or cycle.id
  targetId?: string; // Optional reference to BankTarget if allocated or withdrawn from a target
  createdAt: number;
  updatedAt: number;
}

export interface BankTarget {
  id: string;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
  targetDate?: string; // YYYY-MM-DD (optional)
  icon?: string; // Lucide icon name
  accent?: string; // Color identifier
  active: boolean;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export type SavingTransferState = 'not-transferred' | 'partial' | 'fully-transferred';

export interface PeriodSavingTransferInfo {
  periodSaving: number; // Income - Total Expenses (Unspent period income / Available to Transfer to Savings)
  availableSpendingBalance: number; // Money currently available for spending in the current period (= stillAvailable)
  actualSavingsHeldInBank: number; // Actual savings explicitly transferred to Bank (= transferredAmount)
  transferredAmount: number; // Backwards-compatible alias for actualSavingsHeldInBank
  returnedAmount: number; // Current unabsorbed funds returned from Bank into the spending balance
  netTransferredAmount: number; // grossTransfers - grossReturns
  grossTransferredAmount: number; // Cumulative gross transfers from cycle to Bank
  grossReturnedAmount: number; // Cumulative gross returns from Bank to cycle
  hasTransfers: boolean; // Whether any transfer transaction exists for this period
  hasReturns: boolean; // Whether any return/withdrawal transaction exists for this period
  stillAvailable: number; // Backwards-compatible alias for availableSpendingBalance
  remainingUntransferred: number; // Math.max(0, stillAvailable)
  status: SavingTransferState;
  transactions: BankTransaction[];
  withdrawalTransactions?: BankTransaction[];
}

export interface BankPeriodMetrics {
  periodDeposited: number;
  periodWithdrawn: number;
  periodNetChange: number;
}

export interface BankSummary {
  currentBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalAllocated: number;
  unallocatedBalance: number;
  periodDeposited: number;
  periodWithdrawn: number;
  periodNetChange: number;
  isInitialized: boolean;
}
