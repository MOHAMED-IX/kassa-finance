import {
  BankTarget,
  BankTransaction,
  BankPeriodMetrics,
  PeriodSavingTransferInfo,
  SavingTransferState,
  SourcePeriodMode,
  BankSummary,
} from '../types/finance';
import { round2 } from './formatters';

/**
 * Calculates current bank balance strictly from the immutable ledger of transactions.
 * Bank Balance = Opening Balances + Saving Transfers + Positive Adjustments - Bank Withdrawals + Negative Adjustments
 */
export function calculateBankBalance(transactions: BankTransaction[]): number {
  if (!transactions || transactions.length === 0) return 0;

  let balance = 0;
  for (const tx of transactions) {
    if (tx.type === 'opening-balance' || tx.type === 'saving-transfer') {
      balance += Math.abs(tx.amount);
    } else if (tx.type === 'bank-withdrawal') {
      balance -= Math.abs(tx.amount);
    } else if (tx.type === 'manual-adjustment') {
      // Manual adjustment amount can be signed (+ or -)
      balance += tx.amount;
    }
  }
  return round2(balance);
}

/**
 * Calculates all deposits (inflows) in a transaction list:
 * Opening balance + Saving transfers + Positive manual adjustments
 */
export function calculateBankDeposits(transactions: BankTransaction[]): number {
  if (!transactions || transactions.length === 0) return 0;

  let deposits = 0;
  for (const tx of transactions) {
    if (tx.type === 'opening-balance' || tx.type === 'saving-transfer') {
      deposits += Math.abs(tx.amount);
    } else if (tx.type === 'manual-adjustment' && tx.amount > 0) {
      deposits += tx.amount;
    }
  }
  return round2(deposits);
}

/**
 * Calculates all withdrawals (outflows) in a transaction list:
 * Bank withdrawals + Negative manual adjustments (returned as positive sum)
 */
export function calculateBankWithdrawals(transactions: BankTransaction[]): number {
  if (!transactions || transactions.length === 0) return 0;

  let withdrawals = 0;
  for (const tx of transactions) {
    if (tx.type === 'bank-withdrawal') {
      withdrawals += Math.abs(tx.amount);
    } else if (tx.type === 'manual-adjustment' && tx.amount < 0) {
      withdrawals += Math.abs(tx.amount);
    }
  }
  return round2(withdrawals);
}

/**
 * Calculates net bank change: total deposits minus total withdrawals.
 */
export function calculateBankNetChange(transactions: BankTransaction[]): number {
  return round2(calculateBankDeposits(transactions) - calculateBankWithdrawals(transactions));
}

/**
 * Checks whether bank has been initialized (i.e. has at least one opening balance or ledger transaction)
 */
export function isBankInitialized(transactions: BankTransaction[]): boolean {
  if (!transactions || transactions.length === 0) return false;
  return transactions.some((t) => t.type === 'opening-balance' || t.amount !== 0);
}

/**
 * Filters transactions that belong to a specific analysis period:
 * 1. Transactions directly linked via sourcePeriodMode and sourcePeriodId (e.g. saving-transfers)
 * 2. Transactions whose transaction date falls within the period date range [startDate, endDate]
 */
export function filterTransactionsByPeriod(
  transactions: BankTransaction[],
  periodMode: 'month' | 'cycle',
  periodId: string,
  startDate?: string,
  endDate?: string
): BankTransaction[] {
  if (!transactions || transactions.length === 0) return [];

  const sourceMode: SourcePeriodMode = periodMode === 'cycle' ? 'spending-cycle' : 'calendar-month';

  return transactions.filter((tx) => {
    // 1. Direct period tag match
    if (tx.sourcePeriodId && tx.sourcePeriodId === periodId) {
      return true;
    }
    if (tx.sourcePeriodMode === sourceMode && tx.sourcePeriodId === periodId) {
      return true;
    }
    // 2. Date range match for un-tagged transactions (such as withdrawals or adjustments)
    if (!tx.sourcePeriodId && tx.date) {
      if (startDate) {
        if (endDate) {
          return tx.date >= startDate && tx.date <= endDate;
        }
        return tx.date >= startDate;
      }
      if (periodMode === 'month' && periodId) {
        const [yStr, mStr] = periodId.split('-');
        const [txY, txM] = tx.date.split('-');
        if (yStr && mStr && txY && txM) {
          return parseInt(txY, 10) === parseInt(yStr, 10) && parseInt(txM, 10) === parseInt(mStr, 10);
        }
      }
    }
    return false;
  });
}

/**
 * Calculates period-specific bank metrics: deposits, withdrawals, net change.
 */
export function calculatePeriodBankMetrics(
  transactions: BankTransaction[],
  periodMode: 'month' | 'cycle',
  periodId: string,
  startDate?: string,
  endDate?: string
): BankPeriodMetrics {
  const periodTxs = filterTransactionsByPeriod(transactions, periodMode, periodId, startDate, endDate);
  const periodDeposited = calculateBankDeposits(periodTxs);
  const periodWithdrawn = calculateBankWithdrawals(periodTxs);
  const periodNetChange = round2(periodDeposited - periodWithdrawn);

  return {
    periodDeposited,
    periodWithdrawn,
    periodNetChange,
  };
}

/**
 * Determines whether a bank transaction represents a qualifying savings transfer
 * from a specific spending cycle or calendar month.
 */
export function isQualifyingSavingTransfer(
  tx: BankTransaction,
  periodMode: 'month' | 'cycle',
  periodId: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (tx.type !== 'saving-transfer') return false;

  if (periodMode === 'cycle') {
    // 1. Direct explicit link
    if (tx.sourcePeriodId && tx.sourcePeriodId === periodId) return true;
    if (tx.sourcePeriodMode === 'spending-cycle' && tx.sourcePeriodId === periodId) return true;

    // If explicitly linked to a different cycle, reject
    if (tx.sourcePeriodId && tx.sourcePeriodId !== periodId) return false;

    // 2. Fallback by date if unlinked to any period
    if (!tx.sourcePeriodId && tx.date) {
      if (startDate) {
        return endDate ? tx.date >= startDate && tx.date <= endDate : tx.date >= startDate;
      }
    }
    return false;
  }

  // periodMode === 'month'
  const [yStr, mStr] = periodId.split('-');
  const targetY = parseInt(yStr, 10);
  const targetM = parseInt(mStr, 10);

  // 1. Explicit link to this calendar month
  if (tx.sourcePeriodMode === 'calendar-month' && tx.sourcePeriodId) {
    const [syStr, smStr] = tx.sourcePeriodId.split('-');
    if (parseInt(syStr, 10) === targetY && parseInt(smStr, 10) === targetM) {
      return true;
    }
    // Linked to a different month
    return false;
  }
  if (tx.sourcePeriodId && tx.sourcePeriodId === periodId) return true;

  // 2. Transaction date falls in this calendar month (for cycle-initiated or unlinked transfers)
  if (tx.date) {
    if (startDate && endDate) {
      return tx.date >= startDate && tx.date <= endDate;
    }
    const [txY, txM] = tx.date.split('-');
    if (txY && txM) {
      return parseInt(txY, 10) === targetY && parseInt(txM, 10) === targetM;
    }
  }

  return false;
}

/**
 * Determines whether a bank transaction represents a qualifying return from savings
 * to a specific spending cycle or calendar month.
 *
 * Strict Attribution Invariant:
 * - Unrelated bank withdrawals (ATM cash, personal spend, fees) do NOT reduce Actual Savings.
 * - Only explicit returns or transactions identifiable as cycle returns are qualified.
 */
export function isQualifyingReturnWithdrawal(
  tx: BankTransaction,
  periodMode: 'month' | 'cycle',
  periodId: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (tx.type !== 'bank-withdrawal') return false;

  const returnKeywords = [
    'return',
    'returned',
    'rück',
    'cycle',
    'دورة',
    'مرتجع',
    'إرجاع',
    'رجع',
    'spending balance',
    'spendable',
  ];
  const isReturnNote = (note?: string): boolean => {
    if (!note) return false;
    const lower = note.toLowerCase();
    return returnKeywords.some((kw) => lower.includes(kw));
  };

  if (periodMode === 'cycle') {
    // 1. Direct explicit link to this cycle/period
    if (tx.sourcePeriodId && tx.sourcePeriodId === periodId) return true;
    if (tx.sourcePeriodMode === 'spending-cycle' && tx.sourcePeriodId === periodId) return true;

    // If it is explicitly linked to a DIFFERENT period, it does NOT belong to this period
    if (tx.sourcePeriodId && tx.sourcePeriodId !== periodId) return false;

    // 2. Unlinked transactions: only qualify if date falls in period AND note confirms it is a return to spending
    if (!tx.sourcePeriodId && tx.date) {
      let inDateRange = false;
      if (startDate) {
        inDateRange = endDate ? tx.date >= startDate && tx.date <= endDate : tx.date >= startDate;
      }
      if (!inDateRange) return false;
      return isReturnNote(tx.note);
    }
    return false;
  }

  // periodMode === 'month'
  const [yStr, mStr] = periodId.split('-');
  const targetY = parseInt(yStr, 10);
  const targetM = parseInt(mStr, 10);

  // 1. Explicit link to this calendar month
  if (tx.sourcePeriodMode === 'calendar-month' && tx.sourcePeriodId) {
    const [syStr, smStr] = tx.sourcePeriodId.split('-');
    if (parseInt(syStr, 10) === targetY && parseInt(smStr, 10) === targetM) {
      return true;
    }
    return false;
  }
  if (tx.sourcePeriodId && tx.sourcePeriodId === periodId) return true;

  // 2. Transaction date falls in this calendar month
  if (tx.date) {
    let inMonth = false;
    if (startDate && endDate) {
      inMonth = tx.date >= startDate && tx.date <= endDate;
    } else {
      const [txY, txM] = tx.date.split('-');
      if (txY && txM) {
        inMonth = parseInt(txY, 10) === targetY && parseInt(txM, 10) === targetM;
      }
    }
    if (!inMonth) return false;

    // If it was already a cycle return or has return keyword in note
    if (tx.sourcePeriodMode === 'spending-cycle') return true;
    return isReturnNote(tx.note);
  }

  return false;
}

/**
 * Evaluates Saving -> Bank transfer status and current cycle available spendable balance:
 * - Period Saving = Income - Total Expenses (Saving generated by cycle/month)
 * - Transferred Amount = Net amount currently in Bank from cycle transfers (gross transfers minus returns)
 * - Returned Amount = Net amount currently in Cycle from Bank returns (not yet re-transferred)
 * - Net Transferred = Transferred Amount - Returned Amount
 * - Still Available (Current Cycle Balance) = Period Saving - Transferred Amount + Returned Amount
 * - Remaining Untransferred = Math.max(0, Still Available)
 */
export function getPeriodSavingTransferInfo(
  periodSaving: number,
  periodMode: 'month' | 'cycle',
  periodId: string,
  transactions: BankTransaction[],
  startDate?: string,
  endDate?: string
): PeriodSavingTransferInfo {
  const allTxs = transactions || [];

  // Match transactions attributed to this period using strict qualification rules:
  // - saving-transfer: money moved to Bank savings
  // - bank-withdrawal: qualifying returns from savings to cycle (unrelated withdrawals excluded)
  const periodTransfers = allTxs.filter((t) =>
    isQualifyingSavingTransfer(t, periodMode, periodId, startDate, endDate)
  );
  const periodWithdrawals = allTxs.filter((t) =>
    isQualifyingReturnWithdrawal(t, periodMode, periodId, startDate, endDate)
  );

  const grossTransfers = round2(
    periodTransfers.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  );

  const grossReturns = round2(
    periodWithdrawals.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  );

  // Actual Savings = Gross transfers minus qualifying returns (never below 0)
  const netTransferredAmount = Math.max(0, round2(grossTransfers - grossReturns));

  // Chronological ledger-based Net Position tracking:
  // We sort all period-associated transfers and returns chronologically.
  // A return moves money from Bank back into the cycle:
  // - Decreases netTransferred in Bank
  // - Increases returned funds currently available in the cycle
  // A subsequent transfer moves money from cycle to Bank:
  // - Increases netTransferred in Bank
  // - Absorbs previously returned funds sitting in the cycle (reduces netReturned)
  const getTxTimestamp = (t: BankTransaction): number => {
    if (t.createdAt) return t.createdAt;
    if (t.id && t.id.startsWith('tx_')) {
      const parts = t.id.split('_');
      const ts = parseInt(parts[1], 10);
      if (!isNaN(ts) && ts > 0) return ts;
    }
    return 0;
  };

  const allPeriodTxs = [...periodTransfers, ...periodWithdrawals].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const timeA = getTxTimestamp(a);
    const timeB = getTxTimestamp(b);
    if (timeA !== timeB) return timeA - timeB;
    return (a.id || '').localeCompare(b.id || '');
  });

  let runningTransferred = 0;
  let runningReturned = 0;

  for (const tx of allPeriodTxs) {
    const amt = Math.abs(tx.amount);
    if (tx.type === 'saving-transfer') {
      runningTransferred += amt;
      runningReturned = Math.max(0, round2(runningReturned - amt));
    } else if (tx.type === 'bank-withdrawal') {
      runningTransferred = Math.max(0, round2(runningTransferred - amt));
      runningReturned = round2(runningReturned + amt);
    }
  }

  const currentTransferredAmount = round2(runningTransferred);
  const currentReturnedAmount = round2(runningReturned);

  const roundedSaving = round2(periodSaving);
  // Current cycle spendable balance / remaining available to transfer:
  // Starts at periodSaving (Income - Expenses), reduced by transfers to bank, increased by returns:
  const stillAvailable = round2(roundedSaving - grossTransfers + grossReturns);
  const remainingUntransferred = Math.max(0, stillAvailable);

  let status: SavingTransferState = 'not-transferred';
  if (roundedSaving <= 0 && currentTransferredAmount <= 0) {
    status = 'not-transferred';
  } else if (currentTransferredAmount <= 0) {
    status = 'not-transferred';
  } else if (stillAvailable > 0.009) {
    status = 'partial';
  } else {
    status = 'fully-transferred';
  }

  return {
    periodSaving: roundedSaving,
    availableSpendingBalance: stillAvailable,
    actualSavingsHeldInBank: currentTransferredAmount,
    transferredAmount: currentTransferredAmount,
    returnedAmount: currentReturnedAmount,
    netTransferredAmount,
    grossTransferredAmount: grossTransfers,
    grossReturnedAmount: grossReturns,
    hasTransfers: periodTransfers.length > 0,
    hasReturns: periodWithdrawals.length > 0,
    stillAvailable,
    remainingUntransferred,
    status,
    transactions: periodTransfers,
    withdrawalTransactions: periodWithdrawals,
  };
}

/**
 * Calculates net actual savings for a spending cycle/month from the Bank transaction ledger:
 * - Gross transfers to savings: sum of saving-transfer transactions attributable to the relevant cycle
 * - Gross returns from savings: sum of bank-withdrawal transactions returned from savings to the relevant cycle
 * - Net actual savings: gross transfers minus gross returns
 * Unrelated bank withdrawals, manual balance adjustments, or unidentifiable transactions are excluded.
 */
export interface CycleActualSavingsResult {
  grossTransfers: number;
  grossReturns: number;
  netActualSavings: number;
  transferTransactions: BankTransaction[];
  returnTransactions: BankTransaction[];
}

export function calculateCycleActualSavings(
  periodMode: 'month' | 'cycle',
  periodId: string,
  transactions: BankTransaction[],
  startDate?: string,
  endDate?: string
): CycleActualSavingsResult {
  const info = getPeriodSavingTransferInfo(
    0,
    periodMode,
    periodId,
    transactions,
    startDate,
    endDate
  );

  return {
    grossTransfers: info.grossTransferredAmount,
    grossReturns: info.grossReturnedAmount,
    netActualSavings: info.netTransferredAmount,
    transferTransactions: info.transactions,
    returnTransactions: info.withdrawalTransactions || [],
  };
}

/**
 * Calculates total allocated amount across all active virtual bank targets.
 */
export function calculateTotalTargetAllocations(targets: BankTarget[]): number {
  if (!targets || targets.length === 0) return 0;
  const total = targets
    .filter((t) => t.active !== false)
    .reduce((sum, t) => sum + Math.max(0, t.allocatedAmount || 0), 0);
  return round2(total);
}

/**
 * Calculates unallocated bank balance = max(0, Bank Balance - sum(all target allocations)).
 */
export function calculateAvailableUnallocatedBankBalance(
  bankBalance: number,
  targets: BankTarget[]
): number {
  const allocated = calculateTotalTargetAllocations(targets);
  return Math.max(0, round2(bankBalance - allocated));
}

/**
 * Calculates target progress percentage (0 - 100).
 */
export function calculateTargetProgress(target: BankTarget): number {
  if (!target || target.targetAmount <= 0) return 0;
  const pct = (target.allocatedAmount / target.targetAmount) * 100;
  return Math.min(100, Math.max(0, round2(pct)));
}

/**
 * Builds complete BankSummary for UI display.
 */
export function getBankSummary(
  transactions: BankTransaction[],
  targets: BankTarget[],
  periodMode: 'month' | 'cycle',
  periodId: string,
  startDate?: string,
  endDate?: string
): BankSummary {
  const currentBalance = calculateBankBalance(transactions);
  const totalDeposited = calculateBankDeposits(transactions);
  const totalWithdrawn = calculateBankWithdrawals(transactions);
  const totalAllocated = calculateTotalTargetAllocations(targets);
  const unallocatedBalance = calculateAvailableUnallocatedBankBalance(currentBalance, targets);
  const periodMetrics = calculatePeriodBankMetrics(
    transactions,
    periodMode,
    periodId,
    startDate,
    endDate
  );
  const initialized = isBankInitialized(transactions);

  return {
    currentBalance,
    totalDeposited,
    totalWithdrawn,
    totalAllocated,
    unallocatedBalance,
    periodDeposited: periodMetrics.periodDeposited,
    periodWithdrawn: periodMetrics.periodWithdrawn,
    periodNetChange: periodMetrics.periodNetChange,
    isInitialized: initialized,
  };
}
