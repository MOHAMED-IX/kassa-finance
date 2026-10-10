import { describe, it, expect } from 'vitest';
import {
  calculateFinancialSummary,
  calculateYearMonthlyComparison,
  isExpenseInCalendarMonth,
} from './calculations';
import {
  filterExpensesByAnalysisPeriod,
  calculatePeriodFinancialSummary,
  calculateCycleComparison,
  getUnassignedCycleExpenses,
  findCycleForExpense,
} from './periodAbstraction';
import {
  isQualifyingSavingTransfer,
  isQualifyingReturnWithdrawal,
  getPeriodSavingTransferInfo,
  calculateBankBalance,
  getBankSummary,
} from './bankCalculations';
import { Category, Expense, MonthRecord, SpendingCycle, BankTransaction } from '../types/finance';

describe('Period Analysis - Calendar Month vs Spending Cycle', () => {
  const categories: Category[] = [
    { id: 'cat-fixed', name: 'Fixed Expenses', color: '#3B82F6', iconName: 'Home', defaultType: 'fixed', stores: ['Rent'] },
    { id: 'cat-supermarket', name: 'Food & Supermarket', color: '#10B981', iconName: 'ShoppingCart', defaultType: 'variable', stores: ['Rewe'] },
    { id: 'cat-shopping', name: 'Shopping', color: '#EC4899', iconName: 'ShoppingBag', defaultType: 'variable', stores: ['Amazon'] },
    { id: 'cat-study', name: 'Study', color: '#8B5CF6', iconName: 'GraduationCap', defaultType: 'variable', stores: ['Books'] },
    { id: 'cat-transport', name: 'Transportation', color: '#F59E0B', iconName: 'Bus', defaultType: 'variable', stores: ['Bahn'] },
    { id: 'cat-saving', name: 'Saving', color: '#10B981', iconName: 'PiggyBank', defaultType: 'fixed', stores: ['Emergency Fund'] },
  ];

  // Spending cycle crossing month boundary: September 25 through October 24 (30 days total)
  const crossMonthCycle: SpendingCycle = {
    id: 'cycle-sep-oct',
    startDate: '2026-09-25',
    endDate: '2026-10-24',
    income: 3000,
    budgets: {
      'cat-supermarket': 600,
      'cat-shopping': 300,
    },
    createdAt: 1,
  };

  const sampleExpenses: Expense[] = [
    // Ordinary transaction in September within the cycle
    {
      id: 'exp-sep-1',
      name: 'Supermarket Groceries',
      amount: 85.5,
      categoryId: 'cat-supermarket',
      store: 'Rewe',
      date: '2026-09-28',
      month: 9,
      year: 2026,
      isRecurring: false,
      type: 'variable',
      createdAt: 10,
    },
    // Fixed obligation dated in September within the cycle
    {
      id: 'exp-sep-rent',
      name: 'Apartment Rent',
      amount: 750,
      categoryId: 'cat-fixed',
      store: 'Rent',
      date: '2026-09-30',
      month: 9,
      year: 2026,
      isRecurring: true,
      type: 'fixed',
      createdAt: 11,
    },
    // Ordinary transaction in October within the cycle
    {
      id: 'exp-oct-1',
      name: 'Autumn Coat',
      amount: 120,
      categoryId: 'cat-shopping',
      store: 'Amazon',
      date: '2026-10-05',
      month: 10,
      year: 2026,
      isRecurring: false,
      type: 'variable',
      createdAt: 20,
    },
    // Fixed expense dated in October within the cycle
    {
      id: 'exp-oct-health',
      name: 'Health Insurance',
      amount: 110,
      categoryId: 'cat-fixed',
      store: 'Barmer',
      date: '2026-10-15',
      month: 10,
      year: 2026,
      isRecurring: true,
      type: 'fixed',
      createdAt: 21,
    },
  ];

  it('correctly identifies calendar month attribution by transaction date', () => {
    const sepExpense = sampleExpenses[0]; // date: 2026-09-28
    const octExpense = sampleExpenses[2]; // date: 2026-10-05

    expect(isExpenseInCalendarMonth(sepExpense, 2026, 9)).toBe(true);
    expect(isExpenseInCalendarMonth(sepExpense, 2026, 10)).toBe(false);

    expect(isExpenseInCalendarMonth(octExpense, 2026, 9)).toBe(false);
    expect(isExpenseInCalendarMonth(octExpense, 2026, 10)).toBe(true);
  });

  it('separates September and October transaction totals in Calendar Month mode', () => {
    const sepSummary = calculateFinancialSummary(
      sampleExpenses,
      categories,
      [],
      2026,
      9,
      [crossMonthCycle]
    );

    const octSummary = calculateFinancialSummary(
      sampleExpenses,
      categories,
      [],
      2026,
      10,
      [crossMonthCycle]
    );

    // September has exp-sep-1 (85.50) + exp-sep-rent (750) = 835.50
    expect(sepSummary.totalExpenses).toBe(835.5);
    expect(sepSummary.fixedExpenses).toBe(750);
    expect(sepSummary.variableExpenses).toBe(85.5);

    // October has exp-oct-1 (120) + exp-oct-health (110) = 230.00
    expect(octSummary.totalExpenses).toBe(230);
    expect(octSummary.fixedExpenses).toBe(110);
    expect(octSummary.variableExpenses).toBe(120);

    // Income is allocated by calendar day overlap (6 days in Sep, 24 days in Oct from 3000 cycle income)
    expect(sepSummary.income).toBe(600); // 6/30 * 3000
    expect(octSummary.income).toBe(2400); // 24/30 * 3000
  });

  it('aggregates the full spending cycle correctly in Spending Cycle mode without tampering with dates', () => {
    const cycleSummary = calculatePeriodFinancialSummary(
      sampleExpenses,
      categories,
      [],
      { mode: 'cycle', cycleId: crossMonthCycle.id },
      [crossMonthCycle]
    );

    // Full cycle contains all 4 expenses: 85.5 + 750 + 120 + 110 = 1065.50
    expect(cycleSummary.totalExpenses).toBe(1065.5);
    expect(cycleSummary.fixedExpenses).toBe(860);
    expect(cycleSummary.variableExpenses).toBe(205.5);
    expect(cycleSummary.income).toBe(3000);
  });

  it('attributes bank savings transfers and returns to appropriate calendar months', () => {
    const bankTxs: BankTransaction[] = [
      {
        id: 'tx-sep-save',
        type: 'saving-transfer',
        amount: 250,
        date: '2026-09-29',
        sourcePeriodMode: 'spending-cycle',
        sourcePeriodId: crossMonthCycle.id,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: 'tx-oct-save',
        type: 'saving-transfer',
        amount: 400,
        date: '2026-10-06',
        sourcePeriodMode: 'spending-cycle',
        sourcePeriodId: crossMonthCycle.id,
        createdAt: 200,
        updatedAt: 200,
      },
    ];

    expect(isQualifyingSavingTransfer(bankTxs[0], 'month', '2026-09')).toBe(true);
    expect(isQualifyingSavingTransfer(bankTxs[0], 'month', '2026-10')).toBe(false);

    expect(isQualifyingSavingTransfer(bankTxs[1], 'month', '2026-09')).toBe(false);
    expect(isQualifyingSavingTransfer(bankTxs[1], 'month', '2026-10')).toBe(true);

    // Verify calculateFinancialSummary Net Actual Savings
    const sepSummary = calculateFinancialSummary(
      sampleExpenses,
      categories,
      [],
      2026,
      9,
      [crossMonthCycle],
      bankTxs
    );

    const octSummary = calculateFinancialSummary(
      sampleExpenses,
      categories,
      [],
      2026,
      10,
      [crossMonthCycle],
      bankTxs
    );

    expect(sepSummary.actualSavings).toBe(250);
    expect(octSummary.actualSavings).toBe(400);
  });

  it('guarantees calculateYearMonthlyComparison produces isolated, distinct monthly figures', () => {
    const monthlyComparison = calculateYearMonthlyComparison(
      sampleExpenses,
      categories,
      [],
      2026,
      [crossMonthCycle]
    );

    const sepItem = monthlyComparison.find((m) => m.month === 9);
    const octItem = monthlyComparison.find((m) => m.month === 10);
    const augItem = monthlyComparison.find((m) => m.month === 8);

    expect(sepItem).toBeDefined();
    expect(octItem).toBeDefined();
    expect(augItem).toBeDefined();

    // September has expenses of 85.5 + 750 = 835.5
    expect(sepItem!.totalExpenses).toBe(835.5);
    // October has expenses of 120 + 110 = 230
    expect(octItem!.totalExpenses).toBe(230);
    // August has 0 expenses and 0 income
    expect(augItem!.totalExpenses).toBe(0);
    expect(augItem!.income).toBe(0);

    // Verify distinct values: September and October must not be identical
    expect(sepItem!.totalExpenses).not.toBe(octItem!.totalExpenses);
    expect(sepItem!.income).not.toBe(octItem!.income);
  });

  it('accurately reproduces and models the October 2026 financial scenario from the prompt', () => {
    // Scenario: October has Income: €948.89, Expenses: €653.18
    // Unspent income = 948.89 - 653.18 = 295.71
    // Net Actual Savings transferred to bank = €300.00
    // Available Spending Balance = 295.71 - 300.00 = -€4.29
    const octExpenses: Expense[] = [
      {
        id: 'exp-oct-rent-fixed',
        name: 'Fixed Housing Obligation',
        amount: 450.00,
        categoryId: 'cat-fixed',
        store: 'Landlord',
        date: '2026-10-01',
        month: 10,
        year: 2026,
        isRecurring: true,
        type: 'fixed',
        createdAt: 101,
      },
      {
        id: 'exp-oct-groceries',
        name: 'Supermarket Groceries',
        amount: 203.18,
        categoryId: 'cat-supermarket',
        store: 'Rewe',
        date: '2026-10-12',
        month: 10,
        year: 2026,
        isRecurring: false,
        type: 'variable',
        createdAt: 102,
      },
    ];

    const octMonthRecord: MonthRecord = {
      year: 2026,
      month: 10,
      income: 948.89,
      budgets: {},
    };

    // Bank transaction: qualifying savings transfer of €300.00 in October
    const bankTxs: BankTransaction[] = [
      {
        id: 'tx-oct-save-300',
        type: 'saving-transfer',
        amount: 300.00,
        date: '2026-10-05',
        sourcePeriodMode: 'calendar-month',
        sourcePeriodId: '2026-10',
        createdAt: 103,
        updatedAt: 103,
      },
    ];

    const octSummary = calculateFinancialSummary(
      octExpenses,
      categories,
      [octMonthRecord],
      2026,
      10,
      [],
      bankTxs
    );

    expect(octSummary.income).toBe(948.89);
    expect(octSummary.totalExpenses).toBe(653.18);
    expect(octSummary.actualSavings).toBe(300.00);
    expect(octSummary.grossTransfers).toBe(300.00);
    expect(octSummary.grossReturns).toBe(0);
    // Unspent income: 948.89 - 653.18 = 295.71. Still available after €300 transferred = -€4.29
    expect(octSummary.availableSpendingBalance).toBe(-4.29);
    expect(octSummary.unspentIncome).toBe(295.71);
    expect(octSummary.remainingIncome).toBe(295.71);

    // Verify September 2026 with no records has zero expenses, zero savings, and zero available
    const sepSummary = calculateFinancialSummary(
      octExpenses,
      categories,
      [octMonthRecord],
      2026,
      9,
      [],
      bankTxs
    );

    expect(sepSummary.income).toBe(0);
    expect(sepSummary.totalExpenses).toBe(0);
    expect(sepSummary.actualSavings).toBe(0);
    expect(sepSummary.availableSpendingBalance).toBe(0);
    expect(sepSummary.remainingIncome).toBe(0);

    // Verify calculateYearMonthlyComparison matches calculateFinancialSummary exactly
    const yearComparison = calculateYearMonthlyComparison(
      octExpenses,
      categories,
      [octMonthRecord],
      2026,
      [],
      bankTxs
    );

    const octComparisonItem = yearComparison.find((m) => m.month === 10);
    const sepComparisonItem = yearComparison.find((m) => m.month === 9);

    expect(octComparisonItem).toBeDefined();
    expect(octComparisonItem!.income).toBe(octSummary.income);
    expect(octComparisonItem!.totalExpenses).toBe(octSummary.totalExpenses);
    expect(octComparisonItem!.actualSavings).toBe(octSummary.actualSavings);
    expect(octComparisonItem!.remainingMoney).toBe(octSummary.availableSpendingBalance);

    expect(sepComparisonItem).toBeDefined();
    expect(sepComparisonItem!.income).toBe(0);
    expect(sepComparisonItem!.totalExpenses).toBe(0);
    expect(sepComparisonItem!.actualSavings).toBe(0);
    expect(sepComparisonItem!.remainingMoney).toBe(sepSummary.availableSpendingBalance);
  });

  describe('Phase 2: Canonical Engine Parity & Edge Cases', () => {
    it('strict parity: calculateFinancialSummary delegates identically to calculatePeriodFinancialSummary', () => {
      const complexExpenses: Expense[] = [
        {
          id: 'par-1',
          name: 'Grocery',
          amount: 142.5,
          categoryId: 'cat-supermarket',
          store: 'Rewe',
          date: '2026-09-15',
          month: 9,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 1,
        },
        {
          id: 'par-2',
          name: 'Gym',
          amount: 45.0,
          categoryId: 'cat-fixed',
          store: 'FitX',
          date: '2026-09-01',
          month: 9,
          year: 2026,
          isRecurring: true,
          type: 'fixed',
          createdAt: 2,
        },
      ];

      const monthRec: MonthRecord = {
        year: 2026,
        month: 9,
        income: 2500,
        budgets: { 'cat-supermarket': 400 },
      };

      const bankTransactions: BankTransaction[] = [
        {
          id: 'tx-par-1',
          type: 'saving-transfer',
          amount: 500,
          date: '2026-09-20',
          sourcePeriodMode: 'calendar-month',
          sourcePeriodId: '2026-9',
          createdAt: 10,
          updatedAt: 10,
        },
      ];

      const legacyViaDelegate = calculateFinancialSummary(
        complexExpenses,
        categories,
        [monthRec],
        2026,
        9,
        [],
        bankTransactions
      );

      const canonicalDirect = calculatePeriodFinancialSummary(
        complexExpenses,
        categories,
        [monthRec],
        { mode: 'month', year: 2026, month: 9 },
        [],
        'en',
        bankTransactions
      );

      expect(legacyViaDelegate.income).toBe(canonicalDirect.income);
      expect(legacyViaDelegate.totalExpenses).toBe(canonicalDirect.totalExpenses);
      expect(legacyViaDelegate.fixedExpenses).toBe(canonicalDirect.fixedExpenses);
      expect(legacyViaDelegate.variableExpenses).toBe(canonicalDirect.variableExpenses);
      expect(legacyViaDelegate.unspentIncome).toBe(canonicalDirect.unspentIncome);
      expect(legacyViaDelegate.actualSavings).toBe(canonicalDirect.actualSavings);
      expect(legacyViaDelegate.availableSpendingBalance).toBe(canonicalDirect.availableSpendingBalance);
      expect(legacyViaDelegate.grossTransfers).toBe(canonicalDirect.grossTransfers);
      expect(legacyViaDelegate.grossReturns).toBe(canonicalDirect.grossReturns);
      expect(legacyViaDelegate.categorySummaries.length).toBe(canonicalDirect.categorySummaries.length);
    });

    it('monthly income priority: explicit MonthRecord.income takes precedence over prorated cycle income', () => {
      const cycle: SpendingCycle = {
        id: 'cyc-overlap',
        startDate: '2026-09-15',
        endDate: '2026-10-14',
        income: 3000,
        createdAt: 1,
      };

      // Case 1: Explicit MonthRecord.income exists
      const monthWithExplicit: MonthRecord = {
        year: 2026,
        month: 9,
        income: 3500,
        budgets: {},
      };

      const summary1 = calculatePeriodFinancialSummary(
        [],
        categories,
        [monthWithExplicit],
        { mode: 'month', year: 2026, month: 9 },
        [cycle],
        'en'
      );
      expect(summary1.income).toBe(3500);

      // Case 2: No explicit MonthRecord, derived from cycle overlap (16 days in Sept / 30 total = ~1600)
      const summary2 = calculatePeriodFinancialSummary(
        [],
        categories,
        [],
        { mode: 'month', year: 2026, month: 9 },
        [cycle],
        'en'
      );
      expect(summary2.income).toBeGreaterThan(0);
      expect(summary2.income).toBe(1600); // 16/30 * 3000 = 1600

      // Case 3: Neither explicit nor cycle income exists
      const summary3 = calculatePeriodFinancialSummary(
        [],
        categories,
        [],
        { mode: 'month', year: 2026, month: 9 },
        [],
        'en'
      );
      expect(summary3.income).toBe(0);
    });

    it('identifies unassigned transactions outside spending cycles without mutating transaction records', () => {
      const activeCycle: SpendingCycle = {
        id: 'cycle-active',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        income: 2000,
        createdAt: 1,
      };

      const expenses: Expense[] = [
        {
          id: 'exp-in-1',
          name: 'Inside Oct Cycle',
          amount: 50,
          categoryId: 'cat-supermarket',
          store: 'Rewe',
          date: '2026-10-15',
          month: 10,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 1,
        },
        {
          id: 'exp-out-sep',
          name: 'Old September Expense',
          amount: 80,
          categoryId: 'cat-shopping',
          store: 'Amazon',
          date: '2026-09-20',
          month: 9,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 2,
        },
        {
          id: 'exp-out-nov',
          name: 'Future November Expense',
          amount: 120,
          categoryId: 'cat-fixed',
          store: 'Telecom',
          date: '2026-11-05',
          month: 11,
          year: 2026,
          isRecurring: true,
          type: 'fixed',
          createdAt: 3,
        },
      ];

      const result = getUnassignedCycleExpenses(expenses, [activeCycle]);
      expect(result.count).toBe(2);
      expect(result.totalAmount).toBe(200);
      expect(result.unassignedExpenses.map((e) => e.id)).toEqual(['exp-out-sep', 'exp-out-nov']);

      // Invariant: original transaction metadata, year, month, date must NOT be mutated
      expect(expenses[1].date).toBe('2026-09-20');
      expect(expenses[1].month).toBe(9);
      expect(expenses[2].date).toBe('2026-11-05');
      expect(expenses[2].month).toBe(11);

      // findCycleForExpense helper
      expect(findCycleForExpense(expenses[0], [activeCycle])?.id).toBe('cycle-active');
      expect(findCycleForExpense(expenses[1], [activeCycle])).toBeNull();
    });

    it('supports negative available spending balance without clamping to zero', () => {
      // Income = 1000, Expenses = 1200 => unspentIncome = -200
      // Transfer to savings = 100 => availableSpendingBalance = -300
      const cycle: SpendingCycle = {
        id: 'cycle-deficit',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        income: 1000,
        createdAt: 1,
      };

      const deficitExpenses: Expense[] = [
        {
          id: 'def-1',
          name: 'Heavy Rent & Bills',
          amount: 1200,
          categoryId: 'cat-fixed',
          store: 'Landlord',
          date: '2026-10-05',
          month: 10,
          year: 2026,
          isRecurring: true,
          type: 'fixed',
          createdAt: 1,
        },
      ];

      const bankTransfers: BankTransaction[] = [
        {
          id: 'tx-def-save',
          type: 'saving-transfer',
          amount: 100,
          date: '2026-10-06',
          sourcePeriodMode: 'spending-cycle',
          sourcePeriodId: 'cycle-deficit',
          createdAt: 10,
          updatedAt: 10,
        },
      ];

      const summary = calculatePeriodFinancialSummary(
        deficitExpenses,
        categories,
        [],
        { mode: 'cycle', cycleId: 'cycle-deficit' },
        [cycle],
        'en',
        bankTransfers
      );

      // Verify unspent income is negative
      expect(summary.unspentIncome).toBe(-200);
      // Available spending balance is negative (-200 - 100 = -300) and NOT clamped to zero
      expect(summary.availableSpendingBalance).toBe(-300);

      // Test transfer info directly: stillAvailable is -300, remainingUntransferred is clamped to 0
      const transferInfo = getPeriodSavingTransferInfo(
        -200,
        'cycle',
        'cycle-deficit',
        bankTransfers,
        '2026-10-01',
        '2026-10-31'
      );
      expect(transferInfo.stillAvailable).toBe(-300);
      expect(transferInfo.availableSpendingBalance).toBe(-300);
      expect(transferInfo.remainingUntransferred).toBe(0);
    });

    it('handles explicit monthly income equal to zero without falling back to cycle income or undefined', () => {
      const cycle: SpendingCycle = {
        id: 'cyc-overlap-sep',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        income: 2000,
        createdAt: 1,
      };

      const zeroMonthRecord: MonthRecord = {
        year: 2026,
        month: 9,
        income: 0,
        budgets: {},
      };

      // Case 1: When MonthRecord.income is explicitly 0, it MUST override the overlapping cycle income of 2000!
      const summaryWithCycle = calculatePeriodFinancialSummary(
        [],
        categories,
        [zeroMonthRecord],
        { mode: 'month', year: 2026, month: 9 },
        [cycle],
        'en'
      );
      expect(summaryWithCycle.income).toBe(0);
      expect(summaryWithCycle.incomeNotSet).toBe(true);

      // Case 2: When MonthRecord has explicit positive income, it overrides cycle income
      const positiveMonthRecord: MonthRecord = {
        year: 2026,
        month: 9,
        income: 2500,
        budgets: {},
      };
      const summaryPositive = calculatePeriodFinancialSummary(
        [],
        categories,
        [positiveMonthRecord],
        { mode: 'month', year: 2026, month: 9 },
        [cycle],
        'en'
      );
      expect(summaryPositive.income).toBe(2500);
      expect(summaryPositive.incomeNotSet).toBe(false);

      // Case 3: When MonthRecord is absent, it correctly falls back to prorated cycle income
      const summaryAbsent = calculatePeriodFinancialSummary(
        [],
        categories,
        [],
        { mode: 'month', year: 2026, month: 9 },
        [cycle],
        'en'
      );
      expect(summaryAbsent.income).toBe(2000);
      expect(summaryAbsent.incomeNotSet).toBe(false);
    });

    it('aggregates multiple spending cycles overlapping a single calendar month proportionally', () => {
      // Cycle 1: Sept 1 to Sept 10 (10 days total, 10 days in Sept), income = 1000
      // Cycle 2: Sept 11 to Oct 10 (30 days total, 20 days in Sept), income = 3000
      // Sept prorated income = 1000 + (20/30 * 3000 = 2000) = 3000
      const cycle1: SpendingCycle = {
        id: 'cyc-1',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        income: 1000,
        createdAt: 1,
      };
      const cycle2: SpendingCycle = {
        id: 'cyc-2',
        startDate: '2026-09-11',
        endDate: '2026-10-10',
        income: 3000,
        createdAt: 2,
      };

      const summary = calculatePeriodFinancialSummary(
        [],
        categories,
        [],
        { mode: 'month', year: 2026, month: 9 },
        [cycle1, cycle2],
        'en'
      );
      expect(summary.income).toBe(3000);
      expect(summary.hasCycleAllocation).toBe(true);
    });

    it('strictly respects first-day and last-day boundary attribution for months and cycles', () => {
      const cycle: SpendingCycle = {
        id: 'cyc-boundary',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        income: 2000,
        createdAt: 1,
      };

      const expenses: Expense[] = [
        {
          id: 'exp-first-day',
          name: 'First Day Oct',
          amount: 100,
          categoryId: 'cat-supermarket',
          store: 'Rewe',
          date: '2026-10-01',
          month: 10,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 1,
        },
        {
          id: 'exp-last-day',
          name: 'Last Day Oct',
          amount: 150,
          categoryId: 'cat-shopping',
          store: 'Amazon',
          date: '2026-10-31',
          month: 10,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 2,
        },
        {
          id: 'exp-day-before',
          name: 'Day Before Oct',
          amount: 200,
          categoryId: 'cat-fixed',
          store: 'Telecom',
          date: '2026-09-30',
          month: 9,
          year: 2026,
          isRecurring: false,
          type: 'fixed',
          createdAt: 3,
        },
        {
          id: 'exp-day-after',
          name: 'Day After Oct',
          amount: 250,
          categoryId: 'cat-study',
          store: 'Campus',
          date: '2026-11-01',
          month: 11,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 4,
        },
      ];

      // Calendar month October filter
      const octFiltered = filterExpensesByAnalysisPeriod(
        expenses,
        { mode: 'month', year: 2026, month: 10 },
        [cycle]
      );
      expect(octFiltered.map((e) => e.id)).toEqual(['exp-first-day', 'exp-last-day']);

      // Spending cycle filter
      const cycleFiltered = filterExpensesByAnalysisPeriod(
        expenses,
        { mode: 'cycle', cycleId: 'cyc-boundary' },
        [cycle]
      );
      expect(cycleFiltered.map((e) => e.id)).toEqual(['exp-first-day', 'exp-last-day']);
    });

    it('bank balance and bank summary remain independent of the selected month or cycle', () => {
      const allBankTxs: BankTransaction[] = [
        {
          id: 'tx-op',
          type: 'opening-balance',
          amount: 5000,
          date: '2026-01-01',
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 'tx-sep-save',
          type: 'saving-transfer',
          amount: 300,
          date: '2026-09-20',
          sourcePeriodMode: 'calendar-month',
          sourcePeriodId: '2026-9',
          createdAt: 2,
          updatedAt: 2,
        },
        {
          id: 'tx-oct-save',
          type: 'saving-transfer',
          amount: 200,
          date: '2026-10-05',
          sourcePeriodMode: 'calendar-month',
          sourcePeriodId: '2026-10',
          createdAt: 3,
          updatedAt: 3,
        },
        {
          id: 'tx-oct-withdraw',
          type: 'bank-withdrawal',
          amount: 50,
          date: '2026-10-15',
          note: 'ATM cash',
          createdAt: 4,
          updatedAt: 4,
        },
      ];

      // Global Bank Balance = 5000 + 300 + 200 - 50 = 5450
      const totalBank = calculateBankBalance(allBankTxs);
      expect(totalBank).toBe(5450);

      // Bank Summary must report the true global bank balance regardless of periods
      const summary = getBankSummary(allBankTxs, [], 'month', '2026-10');
      expect(summary.currentBalance).toBe(5450);
      expect(summary.totalDeposited).toBe(5500);
      expect(summary.totalWithdrawn).toBe(50);
    });

    it('unassigned transactions are identified safely with malformed dates or missing properties', () => {
      const cycle: SpendingCycle = {
        id: 'cyc-1',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        income: 1000,
        createdAt: 1,
      };

      const edgeExpenses: Expense[] = [
        {
          id: 'exp-valid-oct',
          name: 'Valid Oct',
          amount: 100,
          categoryId: 'cat-supermarket',
          store: 'Rewe',
          date: '2026-10-10',
          month: 10,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 1,
        },
        {
          id: 'exp-no-date',
          name: 'Missing Date',
          amount: 75,
          categoryId: 'cat-shopping',
          store: 'Unknown',
          date: '',
          month: 10,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 2,
        },
        {
          id: 'exp-outside',
          name: 'Outside Cycle',
          amount: 25,
          categoryId: 'cat-study',
          store: 'Campus',
          date: '2026-11-05',
          month: 11,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 3,
        },
      ];

      const result = getUnassignedCycleExpenses(edgeExpenses, [cycle]);
      expect(result.count).toBe(2);
      expect(result.totalAmount).toBe(100);
      expect(result.unassignedExpenses.map((e) => e.id)).toEqual(['exp-no-date', 'exp-outside']);
    });

    it('Fix 2 parity & invariants: calculateCycleComparison strictly delegates to calculatePeriodFinancialSummary', () => {
      // Setup 5 cycles covering:
      // 1. Normal cycle with income and expenses
      // 2. Cycle with savings transfers
      // 3. Cycle with savings returns
      // 4. Cycle with negative available spending balance
      // 5. Empty cycle with no transactions
      const cycleNormal: SpendingCycle = {
        id: 'cyc-test-normal',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        income: 2500,
        notes: 'May Salary',
        createdAt: 1,
      };

      const cycleTransfers: SpendingCycle = {
        id: 'cyc-test-transfers',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        income: 3000,
        notes: 'June Salary',
        createdAt: 2,
      };

      const cycleReturns: SpendingCycle = {
        id: 'cyc-test-returns',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        income: 2800,
        notes: 'July Salary',
        createdAt: 3,
      };

      const cycleDeficit: SpendingCycle = {
        id: 'cyc-test-deficit',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        income: 1200,
        notes: 'August Tight Month',
        createdAt: 4,
      };

      const cycleEmpty: SpendingCycle = {
        id: 'cyc-test-empty',
        startDate: '2026-09-01',
        endDate: null,
        income: 0,
        notes: 'September Open Empty',
        createdAt: 5,
      };

      const allCycles = [cycleNormal, cycleTransfers, cycleReturns, cycleDeficit, cycleEmpty];

      const testExpenses: Expense[] = [
        // Normal cycle expenses
        {
          id: 'exp-norm-1',
          name: 'Supermarket',
          amount: 250,
          categoryId: 'cat-supermarket',
          store: 'Rewe',
          date: '2026-05-10',
          month: 5,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 10,
        },
        {
          id: 'exp-norm-2',
          name: 'Rent',
          amount: 800,
          categoryId: 'cat-fixed',
          store: 'Landlord',
          date: '2026-05-01',
          month: 5,
          year: 2026,
          isRecurring: true,
          type: 'fixed',
          createdAt: 11,
        },
        // Transfers cycle expenses
        {
          id: 'exp-trans-1',
          name: 'Living expenses',
          amount: 1000,
          categoryId: 'cat-supermarket',
          store: 'Rewe',
          date: '2026-06-15',
          month: 6,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 20,
        },
        // Returns cycle expenses
        {
          id: 'exp-ret-1',
          name: 'Shopping',
          amount: 1200,
          categoryId: 'cat-shopping',
          store: 'Amazon',
          date: '2026-07-10',
          month: 7,
          year: 2026,
          isRecurring: false,
          type: 'variable',
          createdAt: 30,
        },
        // Deficit cycle expenses
        {
          id: 'exp-def-1',
          name: 'Heavy Tuition & Rent',
          amount: 1500,
          categoryId: 'cat-fixed',
          store: 'University',
          date: '2026-08-05',
          month: 8,
          year: 2026,
          isRecurring: true,
          type: 'fixed',
          createdAt: 40,
        },
      ];

      const testBankTxs: BankTransaction[] = [
        // Savings transfer in June cycle: 500
        {
          id: 'tx-cyc-save-500',
          type: 'saving-transfer',
          amount: 500,
          date: '2026-06-20',
          sourcePeriodMode: 'spending-cycle',
          sourcePeriodId: 'cyc-test-transfers',
          createdAt: 100,
          updatedAt: 100,
        },
        // Transfer and return in July cycle: 400 transferred, 150 returned
        {
          id: 'tx-cyc-save-400',
          type: 'saving-transfer',
          amount: 400,
          date: '2026-07-05',
          sourcePeriodMode: 'spending-cycle',
          sourcePeriodId: 'cyc-test-returns',
          createdAt: 200,
          updatedAt: 200,
        },
        {
          id: 'tx-cyc-ret-150',
          type: 'bank-withdrawal',
          amount: 150,
          date: '2026-07-20',
          note: 'Return to spending cycle balance',
          sourcePeriodMode: 'spending-cycle',
          sourcePeriodId: 'cyc-test-returns',
          createdAt: 201,
          updatedAt: 201,
        },
        // Transfer in Deficit cycle (August): 200 transferred
        {
          id: 'tx-cyc-save-200',
          type: 'saving-transfer',
          amount: 200,
          date: '2026-08-10',
          sourcePeriodMode: 'spending-cycle',
          sourcePeriodId: 'cyc-test-deficit',
          createdAt: 300,
          updatedAt: 300,
        },
      ];

      // Execute calculateCycleComparison
      const comparisonItems = calculateCycleComparison(
        allCycles,
        testExpenses,
        categories,
        'en',
        testBankTxs
      );

      expect(comparisonItems.length).toBe(5);

      // Verify each cycle matches calculatePeriodFinancialSummary directly
      for (const compItem of comparisonItems) {
        const canonicalSummary = calculatePeriodFinancialSummary(
          testExpenses,
          categories,
          [],
          { mode: 'cycle', cycleId: compItem.cycleId },
          allCycles,
          'en',
          testBankTxs
        );

        // Strict parity between calculateCycleComparison and calculatePeriodFinancialSummary
        expect(compItem.income).toBe(canonicalSummary.income);
        expect(compItem.totalExpenses).toBe(canonicalSummary.totalExpenses);
        expect(compItem.fixedExpenses).toBe(canonicalSummary.fixedExpenses);
        expect(compItem.variableExpenses).toBe(canonicalSummary.variableExpenses);
        expect(compItem.unspentIncome).toBe(canonicalSummary.unspentIncome);
        expect(compItem.remainingMoney).toBe(canonicalSummary.availableSpendingBalance);
        expect(compItem.availableSpendingBalance).toBe(canonicalSummary.availableSpendingBalance);
        expect(compItem.actualSavings).toBe(canonicalSummary.actualSavings);
        expect(compItem.grossTransfers).toBe(canonicalSummary.grossTransfers);
        expect(compItem.grossReturns).toBe(canonicalSummary.grossReturns);
        expect(compItem.categoryTotals['cat-saving']).toBe(canonicalSummary.actualSavings);
      }

      // Explicit numeric financial invariant assertions for each scenario:

      // 1. Normal cycle: Income 2500, Expenses 1050 (800 fixed + 250 var) -> Available 1450, Actual Savings 0
      const normItem = comparisonItems.find((c) => c.cycleId === 'cyc-test-normal')!;
      expect(normItem.income).toBe(2500);
      expect(normItem.totalExpenses).toBe(1050);
      expect(normItem.unspentIncome).toBe(1450);
      expect(normItem.actualSavings).toBe(0);
      expect(normItem.availableSpendingBalance).toBe(1450);
      expect(normItem.remainingMoney).toBe(1450);

      // 2. Cycle with savings transfers: Income 3000, Expenses 1000 -> Unspent 2000. Transfer 500 -> Actual Savings 500, Available 1500
      const transItem = comparisonItems.find((c) => c.cycleId === 'cyc-test-transfers')!;
      expect(transItem.income).toBe(3000);
      expect(transItem.totalExpenses).toBe(1000);
      expect(transItem.unspentIncome).toBe(2000);
      expect(transItem.grossTransfers).toBe(500);
      expect(transItem.grossReturns).toBe(0);
      expect(transItem.actualSavings).toBe(500);
      expect(transItem.availableSpendingBalance).toBe(1500);
      expect(transItem.categoryTotals['cat-saving']).toBe(500);

      // 3. Cycle with transfers & returns: Income 2800, Expenses 1200 -> Unspent 1600. Transfer 400, Return 150 -> Net Savings 250, Available 1600 - 400 + 150 = 1350
      const retItem = comparisonItems.find((c) => c.cycleId === 'cyc-test-returns')!;
      expect(retItem.income).toBe(2800);
      expect(retItem.totalExpenses).toBe(1200);
      expect(retItem.unspentIncome).toBe(1600);
      expect(retItem.grossTransfers).toBe(400);
      expect(retItem.grossReturns).toBe(150);
      expect(retItem.actualSavings).toBe(250);
      expect(retItem.availableSpendingBalance).toBe(1350);
      expect(retItem.categoryTotals['cat-saving']).toBe(250);

      // 4. Deficit cycle: Income 1200, Expenses 1500 -> Unspent -300. Transfer 200 -> Net Savings 200, Available -300 - 200 = -500 (unclamped!)
      const defItem = comparisonItems.find((c) => c.cycleId === 'cyc-test-deficit')!;
      expect(defItem.income).toBe(1200);
      expect(defItem.totalExpenses).toBe(1500);
      expect(defItem.unspentIncome).toBe(-300);
      expect(defItem.grossTransfers).toBe(200);
      expect(defItem.actualSavings).toBe(200);
      expect(defItem.availableSpendingBalance).toBe(-500);
      expect(defItem.remainingMoney).toBe(-500);

      // 5. Empty cycle: Income 0, Expenses 0 -> Available 0, Actual Savings 0
      const emptyItem = comparisonItems.find((c) => c.cycleId === 'cyc-test-empty')!;
      expect(emptyItem.income).toBe(0);
      expect(emptyItem.incomeNotSet).toBe(true);
      expect(emptyItem.totalExpenses).toBe(0);
      expect(emptyItem.unspentIncome).toBe(0);
      expect(emptyItem.actualSavings).toBe(0);
      expect(emptyItem.availableSpendingBalance).toBe(0);
      expect(emptyItem.isOngoing).toBe(true);
    });
  });
});
