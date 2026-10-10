/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { MonthYearSelector } from './components/MonthYearSelector';
import { DashboardCards } from './components/DashboardCards';
import { CategoryBudgets } from './components/CategoryBudgets';
import { ChartsSection } from './components/ChartsSection';
import { ExpensesTable } from './components/ExpensesTable';
import { SpendingCyclesView } from './components/SpendingCyclesView';
import { StartCycleModal } from './components/StartCycleModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { FastBatchModal } from './components/FastBatchModal';
import { FixedExpensesView } from './components/FixedExpensesModal';
import { MonthlyComparisonView } from './components/MonthlyComparisonView';
import { StoreClusteringView } from './components/StoreClusteringView';
import { CategoryManagerView } from './components/CategoryManagerModal';
import { BackupRestoreView } from './components/BackupRestoreModal';
import { AuthSignInScreen } from './components/AuthSignInScreen';
import { BankDashboardCard } from './components/BankDashboardCard';
import { BankBalanceSection } from './components/BankBalanceSection';
import {
  TransferSavingModal,
  BankTransactionModal,
  BankTargetModal,
  AdjustTargetFundsModal,
} from './components/BankModals';

import { AuthProvider, useAuth } from './context/AuthContext';
import {
  AnalysisPeriod,
  Category,
  Expense,
  MonthRecord,
  PeriodMode,
  SpendingCycle,
  BankTransaction,
  BankTarget,
  BankSummary,
  PeriodSavingTransferInfo,
  Currency,
} from './types/finance';
import {
  calculateFinancialSummary,
  calculateCycleFinancialSummary,
  calculateYearMonthlyComparison,
  calculatePeriodFinancialSummary,
  calculateCycleComparison,
  getAnalysisPeriodRange,
  sanitizeAndHealCycles,
  validateNewCycle,
} from './utils/calculations';
import {
  getBankSummary,
  getPeriodSavingTransferInfo,
  calculateBankBalance,
  calculateAvailableUnallocatedBankBalance,
} from './utils/bankCalculations';
import {
  loadStoredData,
  saveStoredData,
  purgeLegacyUnscopedStores,
  deleteUserLocalData,
  deleteMonthLocalData,
  getSavedLocalActiveCycle,
  saveLocalActiveCycle,
  saveLocalPeriodMode,
  getSavedLocalPeriodMode,
  clearLocalNavigationState,
  saveBankTransactionsLocally,
  saveBankTargetsLocally,
  loadBankPrivacyMode,
  saveBankPrivacyMode,
  loadUserCurrency,
  saveUserCurrency,
  saveLocalCategoryOrder,
  getSavedLocalCategoryOrder,
} from './utils/storage';
import {
  DEFAULT_EXPENSES,
  DEFAULT_CATEGORIES,
  DEFAULT_MONTH_RECORDS,
} from './utils/initialData';
import {
  fetchUserCloudData,
  saveExpenseCloud,
  deleteExpenseCloud,
  saveBatchExpensesCloud,
  saveCategoryCloud,
  deleteCategoryCloud,
  saveMonthRecordCloud,
  saveSpendingCycleCloud,
  deleteSpendingCycleCloud,
  startNewSpendingCycleCloud,
  saveUserPeriodModeCloud,
  saveUserActiveCycleCloud,
  uploadFullDatasetCloud,
  exactRestoreCloudDataset,
  saveUserActiveMonthCloud,
  deleteUserCloudAccount,
  deleteMonthCloudData,
  verifyUserCloudDataClean,
  saveBankTransactionCloud,
  deleteBankTransactionCloud,
  saveBankTargetCloud,
  deleteBankTargetCloud,
  updateBankTargetsCloud,
  saveUserCurrencyCloud,
  saveUserCategoryOrderCloud,
} from './services/firestoreData';
import { deleteCurrentAuthUser, reauthenticateCurrentUser } from './services/firebase';
import {
  determineInitialActiveMonth,
  getSavedLocalActiveMonth,
  saveLocalActiveMonth,
} from './utils/monthPersistence';
import { exportToCSV } from './utils/exportImport';
import { reconcileCategoryOrder } from './utils/categoryOrder';
import { Language, translations } from './utils/i18n';
import { round2, getPreviousDayString, setActiveCurrencyGlobal, getCurrencySymbol } from './utils/formatters';

function KassaFinanceApp() {
  const { user, loading: authLoading, logout, hasMigrated, setHasMigrated } = useAuth();

  // Database States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthRecords, setMonthRecords] = useState<MonthRecord[]>([]);
  const [spendingCycles, setSpendingCycles] = useState<SpendingCycle[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [bankTargets, setBankTargets] = useState<BankTarget[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    return getSavedLocalCategoryOrder(user?.uid) || [];
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Active View & Date Selection (persisted per-user and per-device)
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = getSavedLocalActiveMonth();
    if (saved) return saved.year;
    return new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = getSavedLocalActiveMonth();
    if (saved) return saved.month;
    return new Date().getMonth() + 1;
  });
  const [activeCycleId, setActiveCycleId] = useState<string | undefined>(undefined);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Preferences: Language & Dark Mode
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kassa_theme');
      if (saved) return saved === 'dark';
      return false; // Default to Light Mode
    }
    return false;
  });

  // Bank Privacy Mode (Hide / Show sensitive bank monetary figures, UID-scoped)
  const [bankPrivacyMode, setBankPrivacyMode] = useState<boolean>(() => {
    return loadBankPrivacyMode(user?.uid);
  });

  const toggleBankPrivacy = () => {
    setBankPrivacyMode((prev) => {
      const next = !prev;
      saveBankPrivacyMode(next, user?.uid);
      return next;
    });
  };

  // Account Currency State (isolated by userId: kassa_currency_${userId} or kassa_currency_guest)
  // Strictly display/unit setting: ABSOLUTELY NO currency conversion or value alteration
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const initial = loadUserCurrency(user?.uid);
    setActiveCurrencyGlobal(initial);
    return initial;
  });

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    setActiveCurrencyGlobal(newCurrency);
    saveUserCurrency(newCurrency, user?.uid);
    if (user?.uid) {
      saveUserCurrencyCloud(user.uid, newCurrency);
    }
  };

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isFastBatchOpen, setIsFastBatchOpen] = useState(false);
  const [isStartCycleOpen, setIsStartCycleOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingCycle, setEditingCycle] = useState<SpendingCycle | null>(null);

  // Bank Modals & Selection States
  const [isTransferSavingOpen, setIsTransferSavingOpen] = useState(false);
  const [transferSavingInitialPeriod, setTransferSavingInitialPeriod] = useState<
    { mode: 'month' | 'cycle'; id: string } | undefined
  >(undefined);
  const [isBankTxModalOpen, setIsBankTxModalOpen] = useState(false);
  const [bankTxModalMode, setBankTxModalMode] = useState<
    'opening-balance' | 'bank-withdrawal' | 'manual-adjustment'
  >('opening-balance');
  const [editingBankTx, setEditingBankTx] = useState<BankTransaction | null>(null);
  const [isBankTargetModalOpen, setIsBankTargetModalOpen] = useState(false);
  const [editingBankTarget, setEditingBankTarget] = useState<BankTarget | null>(null);
  const [isAdjustTargetFundsOpen, setIsAdjustTargetFundsOpen] = useState(false);
  const [targetToAdjustFunds, setTargetToAdjustFunds] = useState<BankTarget | null>(null);

  // Sync Dark Mode class with HTML root & body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('kassa_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('kassa_theme', 'light');
    }
  }, [darkMode]);

  // Load cloud data for authenticated user & isolate ledger
  useEffect(() => {
    let isSubscribed = true;

    // Immediately clear in-memory state when signed out
    if (!user) {
      setExpenses([]);
      setCategories([]);
      setMonthRecords([]);
      setSpendingCycles([]);
      setBankTransactions([]);
      setBankTargets([]);
      setActiveCycleId(undefined);
      setPeriodMode('month');
      setBankPrivacyMode(false);
      setCategoryOrder(getSavedLocalCategoryOrder() || []);
      const guestCur = loadUserCurrency(undefined);
      setCurrencyState(guestCur);
      setActiveCurrencyGlobal(guestCur);
      setIsLoaded(false);
      return;
    }

    // Immediately clear in-memory state on user change to prevent any cross-account leakage
    setExpenses([]);
    setCategories([]);
    setMonthRecords([]);
    setSpendingCycles([]);
    setBankTransactions([]);
    setBankTargets([]);
    setActiveCycleId(undefined);
    setPeriodMode('month');
    setCategoryOrder(getSavedLocalCategoryOrder(user.uid) || []);
    setBankPrivacyMode(loadBankPrivacyMode(user.uid));
    const userCur = loadUserCurrency(user.uid);
    setCurrencyState(userCur);
    setActiveCurrencyGlobal(userCur);
    setIsLoaded(false);

    async function initializeUserLedger() {
      const currentUid = user!.uid;
      try {
        const cloudData = await fetchUserCloudData(currentUid);
        if (!isSubscribed) return;

        if (cloudData.hasData) {
          // Cloud has existing data -> use Firestore as single source of truth
          setExpenses(cloudData.expenses);
          setCategories(cloudData.categories);
          setMonthRecords(cloudData.monthRecords);
          setSpendingCycles(cloudData.spendingCycles);
          setBankTransactions(cloudData.bankTransactions || []);
          setBankTargets(cloudData.bankTargets || []);
          await saveStoredData(
            cloudData.expenses,
            cloudData.categories,
            cloudData.monthRecords,
            currentUid,
            cloudData.spendingCycles,
            cloudData.bankTransactions || [],
            cloudData.bankTargets || []
          );

          const initialMonth = determineInitialActiveMonth({
            cloudMonth: cloudData.activeMonth,
            cloudYear: cloudData.activeYear,
            userId: currentUid,
            expenses: cloudData.expenses,
            monthRecords: cloudData.monthRecords,
          });
          setSelectedMonth(initialMonth.month);
          setSelectedYear(initialMonth.year);
          saveLocalActiveMonth(initialMonth.month, initialMonth.year, currentUid);

          const initialCycleId =
            cloudData.activeCycleId ||
            getSavedLocalActiveCycle(currentUid) ||
            cloudData.spendingCycles.find((c) => c.endDate === null)?.id ||
            (cloudData.spendingCycles.length > 0 ? cloudData.spendingCycles[0].id : undefined);
          setActiveCycleId(initialCycleId);

          const initialPeriodMode =
            cloudData.periodMode ||
            getSavedLocalPeriodMode(currentUid) ||
            'month';
          setPeriodMode(initialPeriodMode);

          if (cloudData.currency) {
            setCurrencyState(cloudData.currency);
            setActiveCurrencyGlobal(cloudData.currency);
            saveUserCurrency(cloudData.currency, currentUid);
          }

          if (cloudData.categoryOrder && Array.isArray(cloudData.categoryOrder)) {
            const reconciled = reconcileCategoryOrder(cloudData.categories, cloudData.categoryOrder);
            setCategoryOrder(reconciled);
            saveLocalCategoryOrder(reconciled, currentUid);
          } else {
            const localSaved = getSavedLocalCategoryOrder(currentUid);
            if (localSaved && localSaved.length > 0) {
              const reconciled = reconcileCategoryOrder(cloudData.categories, localSaved);
              setCategoryOrder(reconciled);
              saveUserCategoryOrderCloud(currentUid, reconciled).catch(() => {});
            } else {
              const defaultOrder = cloudData.categories.map((c) => c.id);
              setCategoryOrder(defaultOrder);
              saveLocalCategoryOrder(defaultOrder, currentUid);
            }
          }

          setIsLoaded(true);
        } else {
          // Brand new user account with no cloud data: start with fresh clean default dataset
          // CRITICAL REQUIREMENT PART 1: New account starts cleanly on Dashboard!
          setActiveTab('dashboard');
          clearLocalNavigationState(currentUid);

          await uploadFullDatasetCloud(
            currentUid,
            DEFAULT_EXPENSES,
            DEFAULT_CATEGORIES,
            DEFAULT_MONTH_RECORDS,
            true,
            []
          );
          if (!isSubscribed) return;
          const defaultOrder = DEFAULT_CATEGORIES.map((c) => c.id);
          setExpenses(DEFAULT_EXPENSES);
          setCategories(DEFAULT_CATEGORIES);
          setMonthRecords(DEFAULT_MONTH_RECORDS);
          setSpendingCycles([]);
          setActiveCycleId(undefined);
          setPeriodMode('month');
          setCategoryOrder(defaultOrder);
          saveLocalCategoryOrder(defaultOrder, currentUid);
          saveUserCategoryOrderCloud(currentUid, defaultOrder).catch(() => {});
          await saveStoredData(
            DEFAULT_EXPENSES,
            DEFAULT_CATEGORIES,
            DEFAULT_MONTH_RECORDS,
            currentUid,
            []
          );

          const initialMonth = determineInitialActiveMonth({
            userId: currentUid,
            expenses: DEFAULT_EXPENSES,
            monthRecords: DEFAULT_MONTH_RECORDS,
          });
          setSelectedMonth(initialMonth.month);
          setSelectedYear(initialMonth.year);
          saveLocalActiveMonth(initialMonth.month, initialMonth.year, currentUid);

          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load user ledger from Firestore:', err);
        // Resilient fallback to this user's isolated local cache when offline
        const localData = await loadStoredData(currentUid);
        if (!isSubscribed) return;
        if (localData && (localData.expenses.length > 0 || localData.categories.length > 0)) {
          setExpenses(localData.expenses);
          setCategories(localData.categories);
          setMonthRecords(localData.monthRecords);
          setSpendingCycles(localData.spendingCycles || []);
          setBankTransactions(localData.bankTransactions || []);
          setBankTargets(localData.bankTargets || []);

          const localSavedOrder = getSavedLocalCategoryOrder(currentUid);
          if (localSavedOrder && localSavedOrder.length > 0) {
            setCategoryOrder(reconcileCategoryOrder(localData.categories, localSavedOrder));
          }

          const initialMonth = determineInitialActiveMonth({
            userId: currentUid,
            expenses: localData.expenses,
            monthRecords: localData.monthRecords,
          });
          setSelectedMonth(initialMonth.month);
          setSelectedYear(initialMonth.year);

          const savedCycleId = getSavedLocalActiveCycle(currentUid);
          setActiveCycleId(savedCycleId || undefined);
          setPeriodMode(getSavedLocalPeriodMode(currentUid));
        } else {
          setExpenses(DEFAULT_EXPENSES);
          setCategories(DEFAULT_CATEGORIES);
          setMonthRecords(DEFAULT_MONTH_RECORDS);
          setSpendingCycles([]);
          setBankTransactions([]);
          setBankTargets([]);
          const initialMonth = determineInitialActiveMonth({
            userId: currentUid,
            expenses: DEFAULT_EXPENSES,
            monthRecords: DEFAULT_MONTH_RECORDS,
          });
          setSelectedMonth(initialMonth.month);
          setSelectedYear(initialMonth.year);
        }

        setIsLoaded(true);
      }
    }

    initializeUserLedger();

    return () => {
      isSubscribed = false;
    };
  }, [user]);

  // Explicit safe sign-out that completely flushes memory state & purges legacy unowned stores
  const handleLogout = async () => {
    setExpenses([]);
    setCategories([]);
    setMonthRecords([]);
    setSpendingCycles([]);
    setActiveCycleId(undefined);
    setPeriodMode('month');
    setActiveTab('dashboard'); // Always return to dashboard cleanly
    setBankPrivacyMode(false);
    const guestCur = loadUserCurrency(undefined);
    setCurrencyState(guestCur);
    setActiveCurrencyGlobal(guestCur);
    setIsLoaded(false);
    clearLocalNavigationState(user?.uid);
    purgeLegacyUnscopedStores();
    await logout();
  };

  // Active spending cycle object
  const currentCycle = useMemo(() => {
    if (activeCycleId) {
      const found = spendingCycles.find((c) => c.id === activeCycleId);
      if (found) return found;
    }
    return (
      spendingCycles.find((c) => c.endDate === null) ||
      (spendingCycles.length > 0 ? spendingCycles[0] : null)
    );
  }, [spendingCycles, activeCycleId]);

  // Central Analysis Period abstraction
  const currentPeriod: AnalysisPeriod = useMemo(() => {
    if (periodMode === 'cycle') {
      return {
        mode: 'cycle',
        cycleId: activeCycleId || currentCycle?.id,
      };
    }
    return {
      mode: 'month',
      year: selectedYear,
      month: selectedMonth,
    };
  }, [periodMode, activeCycleId, currentCycle, selectedYear, selectedMonth]);

  // Central Period Range
  const currentPeriodRange = useMemo(() => {
    return getAnalysisPeriodRange(currentPeriod, spendingCycles, lang);
  }, [currentPeriod, spendingCycles, lang]);

  // Compute Live Financial Summary for the active view using the central abstraction
  const summary = useMemo(() => {
    return calculatePeriodFinancialSummary(
      expenses,
      categories,
      monthRecords,
      currentPeriod,
      spendingCycles,
      lang,
      bankTransactions
    );
  }, [expenses, categories, monthRecords, currentPeriod, spendingCycles, lang, bankTransactions]);

  // Compute Month-by-Month comparison across the calendar year
  const yearComparison = useMemo(() => {
    return calculateYearMonthlyComparison(
      expenses,
      categories,
      monthRecords,
      selectedYear,
      spendingCycles,
      bankTransactions
    );
  }, [expenses, categories, monthRecords, selectedYear, spendingCycles, bankTransactions]);

  // Compute Cycle-over-Cycle comparison across all spending cycles
  const cycleComparison = useMemo(() => {
    return calculateCycleComparison(
      spendingCycles,
      expenses,
      categories,
      lang,
      bankTransactions
    );
  }, [spendingCycles, expenses, categories, lang, bankTransactions]);

  // Bank Balance Summary & Period Saving Transfer Info
  const activePeriodId =
    periodMode === 'cycle' && currentCycle
      ? currentCycle.id
      : `${selectedYear}-${selectedMonth}`;
  const activePeriodStartDate = currentPeriodRange.startDate;
  const activePeriodEndDate = currentPeriodRange.endDate || undefined;

  const bankSummary = useMemo(() => {
    return getBankSummary(
      bankTransactions,
      bankTargets,
      periodMode,
      activePeriodId,
      activePeriodStartDate,
      activePeriodEndDate
    );
  }, [
    bankTransactions,
    bankTargets,
    periodMode,
    activePeriodId,
    activePeriodStartDate,
    activePeriodEndDate,
  ]);

  const periodSavingTransferInfo = useMemo(() => {
    return getPeriodSavingTransferInfo(
      summary.remainingIncome,
      periodMode,
      activePeriodId,
      bankTransactions,
      activePeriodStartDate,
      activePeriodEndDate
    );
  }, [
    summary.remainingIncome,
    periodMode,
    activePeriodId,
    bankTransactions,
    activePeriodStartDate,
    activePeriodEndDate,
  ]);

  // Enriched category summaries with actual savings figures for the Saving category
  const enrichedCategorySummaries = useMemo(() => {
    return summary.categorySummaries.map((cs) => {
      if (cs.category.id === 'cat-saving' || cs.category.name.toLowerCase() === 'saving') {
        return {
          ...cs,
          actualSavings: periodSavingTransferInfo.netTransferredAmount,
          grossTransfers: periodSavingTransferInfo.grossTransferredAmount,
          grossReturns: periodSavingTransferInfo.grossReturnedAmount,
        };
      }
      return cs;
    });
  }, [summary.categorySummaries, periodSavingTransferInfo]);

  // Active month budget mapping
  const currentMonthRecord = useMemo(() => {
    return monthRecords.find(
      (m) => m.year === selectedYear && m.month === selectedMonth
    );
  }, [monthRecords, selectedYear, selectedMonth]);

  const activeBudgets = useMemo(() => {
    if (periodMode === 'cycle' && currentCycle) {
      if (currentCycle.budgets && Object.keys(currentCycle.budgets).length > 0) {
        return currentCycle.budgets;
      }
      const [cy, cm] = (currentCycle.startDate || '').split('-').map(Number);
      if (cy && cm) {
        const mr = monthRecords.find((m) => m.year === cy && m.month === cm);
        if (mr?.budgets) return mr.budgets;
      }
      return {};
    }
    const map: Record<string, number> = {};
    summary.categorySummaries.forEach((cs) => {
      if (cs.budget > 0) {
        map[cs.category.id] = cs.budget;
      }
    });
    return map;
  }, [periodMode, currentCycle, monthRecords, summary.categorySummaries]);

  const handleUpdateIncome = (newIncome: number) => {
    const roundedIncome = round2(newIncome);

    // If in Spending Cycle mode, update the active cycle's income
    if (periodMode === 'cycle' && currentCycle) {
      const updatedCycle: SpendingCycle = {
        ...currentCycle,
        income: roundedIncome,
      };
      const updated = spendingCycles.map((c) =>
        c.id === updatedCycle.id ? updatedCycle : c
      );
      setSpendingCycles(updated);
      if (user) {
        saveSpendingCycleCloud(user.uid, updatedCycle).catch(console.error);
      }
      saveStoredData(expenses, categories, monthRecords, user?.uid, updated);
      return;
    }

    setMonthRecords((prev) => {
      const idx = prev.findIndex(
        (m) => m.year === selectedYear && m.month === selectedMonth
      );
      let updated: MonthRecord[];
      let targetRecord: MonthRecord;

      if (idx >= 0) {
        updated = [...prev];
        targetRecord = { ...updated[idx], income: roundedIncome };
        updated[idx] = targetRecord;
      } else {
        targetRecord = {
          year: selectedYear,
          month: selectedMonth,
          income: roundedIncome,
          budgets: {},
        };
        updated = [...prev, targetRecord];
      }

      // Sync to cloud and local cache
      if (user) {
        saveMonthRecordCloud(user.uid, targetRecord).catch(console.error);
      }
      saveStoredData(expenses, categories, updated, user?.uid, spendingCycles);
      return updated;
    });
  };

  const handleUpdateCategoryBudget = (categoryId: string, newBudget: number) => {
    const roundedBudget = round2(newBudget);

    // If in Spending Cycle mode, update the active cycle's budgets
    if (periodMode === 'cycle' && currentCycle) {
      const updatedCycle: SpendingCycle = {
        ...currentCycle,
        budgets: {
          ...(currentCycle.budgets || {}),
          [categoryId]: roundedBudget,
        },
      };
      const updated = spendingCycles.map((c) =>
        c.id === updatedCycle.id ? updatedCycle : c
      );
      setSpendingCycles(updated);
      if (user) {
        saveSpendingCycleCloud(user.uid, updatedCycle).catch(console.error);
      }
      saveStoredData(expenses, categories, monthRecords, user?.uid, updated);
      return;
    }

    setMonthRecords((prev) => {
      const idx = prev.findIndex(
        (m) => m.year === selectedYear && m.month === selectedMonth
      );
      let updated: MonthRecord[];
      let targetRecord: MonthRecord;

      if (idx >= 0) {
        updated = [...prev];
        const newBudgets = {
          ...updated[idx].budgets,
          [categoryId]: roundedBudget,
        };
        targetRecord = { ...updated[idx], budgets: newBudgets };
        updated[idx] = targetRecord;
      } else {
        targetRecord = {
          year: selectedYear,
          month: selectedMonth,
          income: 0,
          budgets: { [categoryId]: roundedBudget },
        };
        updated = [...prev, targetRecord];
      }

      // Sync to cloud and local cache
      if (user) {
        saveMonthRecordCloud(user.uid, targetRecord).catch(console.error);
      }
      saveStoredData(expenses, categories, updated, user?.uid);
      return updated;
    });
  };

  const handleSaveExpense = (
    expenseData: Omit<Expense, 'id' | 'createdAt'> & { id?: string }
  ) => {
    let savedExpense: Expense;

    if (expenseData.id) {
      // Editing existing expense
      savedExpense = {
        ...expenseData,
        id: expenseData.id!,
        amount: round2(expenseData.amount),
        createdAt:
          expenses.find((e) => e.id === expenseData.id)?.createdAt || Date.now(),
      };
      setExpenses((prev) => {
        const next = prev.map((e) => (e.id === savedExpense.id ? savedExpense : e));
        saveStoredData(next, categories, monthRecords, user?.uid);
        return next;
      });
    } else {
      // New expense
      savedExpense = {
        ...expenseData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        amount: round2(expenseData.amount),
        createdAt: Date.now(),
      };
      setExpenses((prev) => {
        const next = [savedExpense, ...prev];
        saveStoredData(next, categories, monthRecords, user?.uid);
        return next;
      });
    }

    if (user) {
      saveExpenseCloud(user.uid, savedExpense).catch(console.error);
    }
    setEditingExpense(null);
  };

  const handleSaveBatchExpenses = (
    batch: Omit<Expense, 'id' | 'createdAt'>[]
  ) => {
    const newItems: Expense[] = batch.map((item, idx) => ({
      ...item,
      id: `exp-batch-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      amount: round2(item.amount),
      createdAt: Date.now() + idx,
    }));

    setExpenses((prev) => {
      const next = [...newItems, ...prev];
      saveStoredData(next, categories, monthRecords, user?.uid);
      return next;
    });

    if (user) {
      saveBatchExpensesCloud(user.uid, newItems).catch(console.error);
    }
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveStoredData(next, categories, monthRecords, user?.uid);
      return next;
    });

    if (user) {
      deleteExpenseCloud(user.uid, id).catch(console.error);
    }
  };

  const handlePropagateFixedExpenses = (
    targetYear: number,
    targetMonth: number
  ) => {
    // Collect all recurring fixed expenses from current month
    const fixedToCopy = expenses.filter(
      (e) =>
        e.year === selectedYear &&
        e.month === selectedMonth &&
        (e.type === 'fixed' || e.isRecurring)
    );

    const mStr = targetMonth < 10 ? `0${targetMonth}` : `${targetMonth}`;

    const newExpenses: Expense[] = fixedToCopy.map((orig, idx) => {
      const day = orig.date.split('-')[2] || '01';
      return {
        ...orig,
        id: `exp-prop-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        year: targetYear,
        month: targetMonth,
        date: `${targetYear}-${mStr}-${day}`,
        createdAt: Date.now() + idx,
      };
    });

    setExpenses((prev) => {
      const next = [...newExpenses, ...prev];
      saveStoredData(next, categories, monthRecords, user?.uid);
      return next;
    });

    if (user) {
      saveBatchExpensesCloud(user.uid, newExpenses).catch(console.error);
    }
  };

  // Add category
  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const cat: Category = {
      ...newCat,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => {
      const next = [...prev, cat];
      saveStoredData(expenses, next, monthRecords, user?.uid);
      return next;
    });

    setCategoryOrder((prev) => {
      const nextOrder = [...prev.filter((id) => id !== cat.id), cat.id];
      saveLocalCategoryOrder(nextOrder, user?.uid);
      if (user) {
        saveUserCategoryOrderCloud(user.uid, nextOrder).catch(console.error);
      }
      return nextOrder;
    });

    if (user) {
      saveCategoryCloud(user.uid, cat).catch(console.error);
    }
  };

  // Update category
  const handleUpdateCategory = (updatedCat: Category) => {
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === updatedCat.id ? updatedCat : c));
      saveStoredData(expenses, next, monthRecords, user?.uid);
      return next;
    });

    if (user) {
      saveCategoryCloud(user.uid, updatedCat).catch(console.error);
    }
  };

  // Delete category
  const handleDeleteCategory = (catId: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== catId);
      saveStoredData(expenses, next, monthRecords, user?.uid);
      return next;
    });

    setCategoryOrder((prev) => {
      const nextOrder = prev.filter((id) => id !== catId);
      saveLocalCategoryOrder(nextOrder, user?.uid);
      if (user) {
        saveUserCategoryOrderCloud(user.uid, nextOrder).catch(console.error);
      }
      return nextOrder;
    });

    if (user) {
      deleteCategoryCloud(user.uid, catId).catch(console.error);
    }
  };

  // Drag-and-drop reorder handler for Category Budgets & Spending
  const handleReorderCategories = (newOrder: string[]) => {
    setCategoryOrder(newOrder);
    saveLocalCategoryOrder(newOrder, user?.uid);
    if (user) {
      saveUserCategoryOrderCloud(user.uid, newOrder).catch(console.error);
    }
  };

  // Restore imported data with exact cloud matching (deletes orphaned cloud records)
  const handleRestoreData = async (
    newExpenses: Expense[],
    newCategories: Category[],
    newMonthRecords: MonthRecord[],
    newSpendingCycles: SpendingCycle[] = [],
    newBankTransactions: BankTransaction[] = [],
    newBankTargets: BankTarget[] = [],
    newCategoryOrder?: string[]
  ) => {
    if (user) {
      await exactRestoreCloudDataset(
        user.uid,
        newExpenses,
        newCategories,
        newMonthRecords,
        newSpendingCycles,
        newBankTransactions,
        newBankTargets,
        newCategoryOrder
      );
    }
    setExpenses(newExpenses);
    setCategories(newCategories);
    setMonthRecords(newMonthRecords);
    setSpendingCycles(newSpendingCycles);
    setBankTransactions(newBankTransactions);
    setBankTargets(newBankTargets);
    if (newCategoryOrder && Array.isArray(newCategoryOrder)) {
      const reconciled = reconcileCategoryOrder(newCategories, newCategoryOrder);
      setCategoryOrder(reconciled);
      saveLocalCategoryOrder(reconciled, user?.uid);
    }
    saveStoredData(
      newExpenses,
      newCategories,
      newMonthRecords,
      user?.uid,
      newSpendingCycles,
      newBankTransactions,
      newBankTargets
    );

    const initialMonth = determineInitialActiveMonth({
      userId: user?.uid,
      expenses: newExpenses,
      monthRecords: newMonthRecords,
    });
    setSelectedMonth(initialMonth.month);
    setSelectedYear(initialMonth.year);
    saveLocalActiveMonth(initialMonth.month, initialMonth.year, user?.uid);
    if (user) {
      saveUserActiveMonthCloud(user.uid, initialMonth.month, initialMonth.year).catch(console.error);
    }
  };

  // Spending Cycle Actions
  const handleStartNewCycle = async (params: {
    startDate: string;
    income?: number | null;
    expectedNextCycleIncome?: number | null;
    notes?: string;
  }) => {
    const valResult = validateNewCycle(params.startDate, spendingCycles);
    if (!valResult.isValid) {
      throw new Error(valResult.error || t.selectValidStartDateError);
    }

    let closedPrevious: SpendingCycle | undefined = undefined;
    let newCycleEndDate: string | null = null;

    if (valResult.previousCycleToClose) {
      closedPrevious = {
        ...valResult.previousCycleToClose,
        endDate: valResult.calculatedPrevEndDate || getPreviousDayString(params.startDate),
      };
      newCycleEndDate = null;
    } else if (valResult.isHistorical) {
      const cyclesAfter = spendingCycles.filter((c) => c.startDate > params.startDate);
      const nextCycle = cyclesAfter.sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
      newCycleEndDate = nextCycle ? getPreviousDayString(nextCycle.startDate) : null;
    }

    // Create the new cycle
    const newCycle: SpendingCycle = {
      id: `cycle_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      startDate: params.startDate,
      endDate: newCycleEndDate,
      income: params.income !== undefined ? params.income : null,
      expectedNextCycleIncome: params.expectedNextCycleIncome !== undefined ? params.expectedNextCycleIncome : null,
      notes: params.notes || undefined,
      createdAt: Date.now(),
    };

    const rawList = [
      newCycle,
      ...spendingCycles.map((c) =>
        closedPrevious && c.id === closedPrevious.id ? closedPrevious : c
      ),
    ];
    const updated = sanitizeAndHealCycles(rawList);

    setSpendingCycles(updated);
    setActiveCycleId(newCycle.id);
    setPeriodMode('cycle');

    if (user) {
      await startNewSpendingCycleCloud(user.uid, newCycle, closedPrevious).catch(console.error);
      saveUserPeriodModeCloud(user.uid, 'cycle').catch(console.error);
    }
    saveStoredData(expenses, categories, monthRecords, user?.uid, updated);
    saveLocalActiveCycle(newCycle.id, user?.uid);
    saveLocalPeriodMode('cycle', user?.uid);
  };

  const handleUpdateCycle = async (cycle: SpendingCycle) => {
    const rawList = spendingCycles.map((c) => (c.id === cycle.id ? cycle : c));
    const updated = sanitizeAndHealCycles(rawList);
    setSpendingCycles(updated);
    if (user) {
      await saveSpendingCycleCloud(user.uid, cycle).catch(console.error);
    }
    saveStoredData(expenses, categories, monthRecords, user?.uid, updated);
  };

  const handleDeleteCycle = async (cycleId: string) => {
    if (user) {
      await deleteSpendingCycleCloud(user.uid, cycleId);
    }
    const updated = spendingCycles.filter((c) => c.id !== cycleId);
    setSpendingCycles(updated);
    if (activeCycleId === cycleId) {
      const sortedRemaining = [...updated].sort((a, b) => b.startDate.localeCompare(a.startDate));
      const nextActive =
        sortedRemaining.find((c) => c.endDate === null) ||
        (sortedRemaining.length > 0 ? sortedRemaining[0] : null);
      setActiveCycleId(nextActive ? nextActive.id : undefined);
      if (nextActive && user) {
        saveUserActiveCycleCloud(user.uid, nextActive.id).catch(console.error);
        saveLocalActiveCycle(nextActive.id, user.uid);
      } else if (!nextActive) {
        setPeriodMode('month');
        if (user) {
          saveUserActiveCycleCloud(user.uid, '').catch(console.error);
          saveUserPeriodModeCloud(user.uid, 'month').catch(console.error);
        }
        saveLocalActiveCycle('', user?.uid);
        saveLocalPeriodMode('month', user?.uid);
      }
    }
    saveStoredData(expenses, categories, monthRecords, user?.uid, updated);
  };

  const handleSelectCycle = (cycleId: string) => {
    setActiveCycleId(cycleId);
    if (user) {
      saveUserActiveCycleCloud(user.uid, cycleId).catch(console.error);
    }
    saveLocalActiveCycle(cycleId, user?.uid);
  };

  const handleTogglePeriodMode = (mode: PeriodMode) => {
    setPeriodMode(mode);
    if (user) {
      saveUserPeriodModeCloud(user.uid, mode).catch(console.error);
    }
    saveLocalPeriodMode(mode, user?.uid);
  };

  const handleSelectMonth = (m: number) => {
    setSelectedMonth(m);
    saveLocalActiveMonth(m, selectedYear, user?.uid);
    if (user) {
      saveUserActiveMonthCloud(user.uid, m, selectedYear).catch(console.error);
    }
  };

  const handleSelectYear = (y: number) => {
    setSelectedYear(y);
    saveLocalActiveMonth(selectedMonth, y, user?.uid);
    if (user) {
      saveUserActiveMonthCloud(user.uid, selectedMonth, y).catch(console.error);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(expenses, categories);
  };

  const handleResetMonthConfig = async (
    year: number,
    month: number
  ): Promise<void> => {
    const targetRecord: MonthRecord = {
      year,
      month,
      income: 0,
      budgets: {},
    };

    let recordFound = false;
    const updatedMonthRecords = monthRecords.map((m) => {
      if (m.year === year && m.month === month) {
        recordFound = true;
        return { ...m, income: 0, budgets: {} };
      }
      return m;
    });

    if (!recordFound) {
      updatedMonthRecords.push(targetRecord);
    }

    setMonthRecords(updatedMonthRecords);

    if (user?.uid) {
      await saveMonthRecordCloud(user.uid, targetRecord).catch(console.error);
    }
    saveStoredData(expenses, categories, updatedMonthRecords, user?.uid, spendingCycles);
  };

  const handleResetCycle = async (cycleId: string): Promise<void> => {
    const target = spendingCycles.find((c) => c.id === cycleId);
    if (!target) return;

    const resetCycle: SpendingCycle = {
      ...target,
      income: null,
      expectedNextCycleIncome: null,
      budgets: {},
    };

    const updated = spendingCycles.map((c) =>
      c.id === cycleId ? resetCycle : c
    );
    setSpendingCycles(updated);

    if (user?.uid) {
      await saveSpendingCycleCloud(user.uid, resetCycle).catch(console.error);
    }
    saveStoredData(expenses, categories, monthRecords, user?.uid, updated);
  };

  const handleDeleteMonthData = async (
    year: number,
    month: number
  ): Promise<{ deletedExpensesCount: number }> => {
    const currentUid = user?.uid || 'anonymous';
    if (!user?.uid) {
      await deleteMonthLocalData(currentUid, year, month);
      const deletedCount = expenses.filter((e) => e.year === year && e.month === month).length;
      setExpenses((prev) => prev.filter((e) => !(e.year === year && e.month === month)));
      setMonthRecords((prev) => prev.filter((m) => !(m.year === year && m.month === month)));
      return { deletedExpensesCount: deletedCount };
    }

    // 1. Delete from Firestore cloud
    const cloudResult = await deleteMonthCloudData(user.uid, year, month);

    // 2. Delete from user's isolated local cache
    await deleteMonthLocalData(user.uid, year, month);

    // 3. Update React state immediately
    const updatedExpenses = expenses.filter(
      (e) => !(e.year === year && e.month === month)
    );
    const updatedMonthRecords = monthRecords.filter(
      (m) => !(m.year === year && m.month === month)
    );
    setExpenses(updatedExpenses);
    setMonthRecords(updatedMonthRecords);

    return cloudResult;
  };

  const handleDeleteAccount = async (): Promise<void> => {
    if (!user?.uid) throw new Error('Authentication required');
    const currentUid = user.uid;

    // STEP 1: Require recent Google authentication/re-authentication FIRST.
    // If the user cancels the Google prompt, this throws and nothing is deleted.
    await reauthenticateCurrentUser();

    // STEP 2: Capture verified UID from fresh authenticated session
    const verifiedUid = user.uid || currentUid;

    // STEP 3 & 4: Delete ALL Firestore subcollection documents and root user document
    await deleteUserCloudAccount(verifiedUid);

    // STEP 5: Explicitly verify Firestore contains 0 remaining user-owned documents
    const isClean = await verifyUserCloudDataClean(verifiedUid);
    if (!isClean) {
      throw new Error(
        'Cloud deletion verification failed: Some Firestore documents could not be removed. Account deletion halted to prevent data loss.'
      );
    }

    // STEP 6 & 7: Clear all UID-scoped localStorage and IndexedDB database
    await deleteUserLocalData(verifiedUid);
    clearLocalNavigationState(verifiedUid);

    // STEP 8: Clear all React / in-memory ledger state immediately
    setExpenses([]);
    setCategories([]);
    setMonthRecords([]);
    setSpendingCycles([]);
    setActiveCycleId(undefined);
    setPeriodMode('month');
    setActiveTab('dashboard'); // CRITICAL FIX PART 1: Reset activeTab to dashboard!
    setIsLoaded(false);

    // STEP 9: Delete Firebase Auth user
    await deleteCurrentAuthUser();

    // STEP 10 & 11: Authentication state becomes null and user is safely returned to AuthSignInScreen
  };

  // Bank Transaction & Target Action Handlers
  const handleSaveBankTransaction = async (tx: BankTransaction) => {
    // 1. Update React state
    setBankTransactions((prev) => {
      const idx = prev.findIndex((t) => t.id === tx.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = tx;
        return copy;
      }
      return [...prev, tx];
    });

    // 2. If this is a withdrawal from a specific target, deduct from target allocation
    if (tx.type === 'bank-withdrawal' && tx.targetId) {
      const tgt = bankTargets.find((t) => t.id === tx.targetId);
      if (tgt) {
        const newAllocated = Math.max(0, round2(tgt.allocatedAmount - Math.abs(tx.amount)));
        const updatedTarget: BankTarget = {
          ...tgt,
          allocatedAmount: newAllocated,
          completed: newAllocated >= tgt.targetAmount,
          updatedAt: Date.now(),
        };
        setBankTargets((prev) => prev.map((t) => (t.id === tgt.id ? updatedTarget : t)));
        if (user?.uid) {
          saveBankTargetCloud(user.uid, updatedTarget).catch(console.error);
        }
      }
    }

    // 3. Save locally
    const currentUid = user?.uid || 'guest';
    const updatedTxs = [...bankTransactions.filter((t) => t.id !== tx.id), tx];
    saveBankTransactionsLocally(updatedTxs, currentUid);

    // 4. Save to Firestore
    if (user?.uid) {
      await saveBankTransactionCloud(user.uid, tx);
    }
  };

  const handleDeleteBankTransaction = async (txId: string) => {
    const updated = bankTransactions.filter((t) => t.id !== txId);
    setBankTransactions(updated);
    const currentUid = user?.uid || 'guest';
    saveBankTransactionsLocally(updated, currentUid);
    if (user?.uid) {
      await deleteBankTransactionCloud(user.uid, txId);
    }
  };

  const handleSaveBankTarget = async (target: BankTarget) => {
    setBankTargets((prev) => {
      const idx = prev.findIndex((t) => t.id === target.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = target;
        return copy;
      }
      return [...prev, target];
    });
    const currentUid = user?.uid || 'guest';
    const updatedTargets = [...bankTargets.filter((t) => t.id !== target.id), target];
    saveBankTargetsLocally(updatedTargets, currentUid);
    if (user?.uid) {
      await saveBankTargetCloud(user.uid, target);
    }
  };

  const handleDeleteBankTarget = async (targetId: string) => {
    const updated = bankTargets.filter((t) => t.id !== targetId);
    setBankTargets(updated);
    const currentUid = user?.uid || 'guest';
    saveBankTargetsLocally(updated, currentUid);
    if (user?.uid) {
      await deleteBankTargetCloud(user.uid, targetId);
    }
  };

  const handleUpdateTargetFunds = async (updatedTarget: BankTarget) => {
    await handleSaveBankTarget(updatedTarget);
  };

  // Auth Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wider">
            Authenticating Kassa Finance...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated State: Render Sign-in screen
  if (!user) {
    return (
      <AuthSignInScreen
        lang={lang}
        setLang={setLang}
        currency={currency}
        setCurrency={handleCurrencyChange}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  // Cloud Data Loading State
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wider">
            Loading cloud ledger...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`${darkMode ? 'dark ' : ''}min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]`}
    >
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        currency={currency}
        setCurrency={handleCurrencyChange}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenAddExpense={() => {
          setEditingExpense(null);
          setIsAddExpenseOpen(true);
        }}
        onOpenFastBatch={() => setIsFastBatchOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        


        {/* Month & Year Selection Bar (Always accessible for fast toggling) */}
        <MonthYearSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onSelectYear={handleSelectYear}
          onSelectMonth={handleSelectMonth}
          lang={lang}
          userId={user?.uid}
          periodMode={periodMode}
          onTogglePeriodMode={handleTogglePeriodMode}
          cycles={spendingCycles}
          selectedCycleId={activeCycleId}
          onSelectCycle={handleSelectCycle}
          onOpenStartCycle={() => {
            setEditingCycle(null);
            setIsStartCycleOpen(true);
          }}
          onManageCycles={() => setActiveTab('cycles')}
          onResetMonthConfig={handleResetMonthConfig}
          onDeleteMonthData={handleDeleteMonthData}
          onResetCycle={handleResetCycle}
          onDeleteCycle={handleDeleteCycle}
          expenses={expenses}
          monthRecords={monthRecords}
        />

        {/* Tab 1: Primary Personal Finance Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            {/* 1. Primary Row: 4 Primary Financial Cards (Cycle Income, Total Expenses, Saving, Fixed Expenses) */}
            <DashboardCards
              summary={summary}
              onUpdateIncome={handleUpdateIncome}
              lang={lang}
              currency={currency}
              bankPrivacyMode={bankPrivacyMode}
              periodSavingTransferInfo={periodSavingTransferInfo}
              onTransferSavingToBank={() => {
                setTransferSavingInitialPeriod(undefined);
                setIsTransferSavingOpen(true);
              }}
            />

            {/* 2. Secondary Row: Bank Balance Dashboard Overview Card (Full-width, Collapsed by default) */}
            <div className="mb-6 sm:mb-7">
              <BankDashboardCard
                summary={bankSummary}
                targets={bankTargets}
                periodSavingTransferInfo={periodSavingTransferInfo}
                periodLabel={
                  periodMode === 'cycle' && currentCycle
                    ? currentCycle.startDate
                    : `${selectedMonth}/${selectedYear}`
                }
                periodMode={periodMode}
                lang={lang}
                bankPrivacyMode={bankPrivacyMode}
                onToggleBankPrivacy={toggleBankPrivacy}
                onOpenTransferSaving={() => {
                  setTransferSavingInitialPeriod(undefined);
                  setIsTransferSavingOpen(true);
                }}
                onOpenWithdrawal={() => {
                  setBankTxModalMode('bank-withdrawal');
                  setEditingBankTx(null);
                  setIsBankTxModalOpen(true);
                }}
                onOpenAdjustment={() => {
                  setBankTxModalMode('manual-adjustment');
                  setEditingBankTx(null);
                  setIsBankTxModalOpen(true);
                }}
                onOpenInitBank={() => {
                  setBankTxModalMode('opening-balance');
                  setEditingBankTx(null);
                  setIsBankTxModalOpen(true);
                }}
                onOpenBankHub={() => setActiveTab('bank')}
                onOpenNewTarget={() => {
                  setEditingBankTarget(null);
                  setIsBankTargetModalOpen(true);
                }}
              />
            </div>

            {/* Category Budgets & Spending Progress Cards */}
            <CategoryBudgets
              categorySummaries={enrichedCategorySummaries}
              categoryOrder={categoryOrder}
              onReorderCategories={handleReorderCategories}
              onUpdateCategoryBudget={handleUpdateCategoryBudget}
              lang={lang}
              currency={currency}
              income={summary.income}
              totalExpenses={summary.totalExpenses}
              remainingIncome={summary.remainingIncome}
              periodMode={periodMode}
              periodSavingTransferInfo={periodSavingTransferInfo}
              onTransferSavingToBank={() => {
                setTransferSavingInitialPeriod(undefined);
                setIsTransferSavingOpen(true);
              }}
            />

            {/* Visual Charts: Donut Category Distribution + Top Stores Bar */}
            <ChartsSection summary={summary} lang={lang} />

            {/* Recent / Month Transactions */}
            <ExpensesTable
              expenses={expenses}
              categories={categories}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onEditExpense={(exp) => {
                setEditingExpense(exp);
                setIsAddExpenseOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
              onExportCSV={handleExportCSV}
              lang={lang}
              periodMode={periodMode}
              currentCycle={currentCycle}
            />
          </div>
        )}

        {/* Dedicated Bank Balance & Savings Goals Hub */}
        {activeTab === 'bank' && (
          <BankBalanceSection
            summary={bankSummary}
            targets={bankTargets}
            transactions={bankTransactions}
            periodSavingTransferInfo={periodSavingTransferInfo}
            currentPeriodLabel={
              periodMode === 'cycle' && currentCycle
                ? currentCycle.startDate
                : `${selectedMonth}/${selectedYear}`
            }
            periodMode={periodMode}
            spendingCycles={spendingCycles}
            monthRecords={monthRecords}
            expenses={expenses}
            lang={lang}
            bankPrivacyMode={bankPrivacyMode}
            onToggleBankPrivacy={toggleBankPrivacy}
            onOpenTransferSaving={() => {
              setTransferSavingInitialPeriod(undefined);
              setIsTransferSavingOpen(true);
            }}
            onOpenWithdrawal={() => {
              setBankTxModalMode('bank-withdrawal');
              setEditingBankTx(null);
              setIsBankTxModalOpen(true);
            }}
            onOpenAdjustment={() => {
              setBankTxModalMode('manual-adjustment');
              setEditingBankTx(null);
              setIsBankTxModalOpen(true);
            }}
            onOpenOpeningBalance={() => {
              setBankTxModalMode('opening-balance');
              const existingOpening = bankTransactions.find((t) => t.type === 'opening-balance');
              setEditingBankTx(existingOpening || null);
              setIsBankTxModalOpen(true);
            }}
            onOpenNewTarget={() => {
              setEditingBankTarget(null);
              setIsBankTargetModalOpen(true);
            }}
            onOpenEditTarget={(target) => {
              setEditingBankTarget(target);
              setIsBankTargetModalOpen(true);
            }}
            onOpenAdjustTargetFunds={(target) => {
              setTargetToAdjustFunds(target);
              setIsAdjustTargetFundsOpen(true);
            }}
            onDeleteTarget={handleDeleteBankTarget}
            onDeleteTransaction={handleDeleteBankTransaction}
          />
        )}

        {/* Tab 2: Full Expenses Table & Ledger */}
        {activeTab === 'expenses' && (
          <ExpensesTable
            expenses={expenses}
            categories={categories}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setIsAddExpenseOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
            onExportCSV={handleExportCSV}
            lang={lang}
            periodMode={periodMode}
            currentCycle={currentCycle}
          />
        )}

        {/* Tab 3: Dedicated Spending Cycles Hub */}
        {activeTab === 'cycles' && (
          <SpendingCyclesView
            cycles={spendingCycles}
            expenses={expenses}
            categories={categories}
            activeCycleId={activeCycleId}
            bankTransactions={bankTransactions}
            onOpenStartCycle={() => {
              setEditingCycle(null);
              setIsStartCycleOpen(true);
            }}
            onEditCycle={(cycle) => {
              setEditingCycle(cycle);
              setIsStartCycleOpen(true);
            }}
            onResetCycle={handleResetCycle}
            onDeleteCycle={handleDeleteCycle}
            onSelectCycleForDashboard={(cycleId) => {
              handleSelectCycle(cycleId);
              setPeriodMode('cycle');
              if (user) saveUserPeriodModeCloud(user.uid, 'cycle').catch(console.error);
              saveLocalPeriodMode('cycle', user?.uid);
              setActiveTab('dashboard');
            }}
            lang={lang}
          />
        )}

        {/* Tab 4: Dedicated Fixed & Recurring Expenses Hub */}
        {activeTab === 'fixed' && (
          <FixedExpensesView
            expenses={expenses}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onPropagateToMonth={handlePropagateFixedExpenses}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setIsAddExpenseOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
            onOpenAddExpense={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            lang={lang}
          />
        )}

        {/* Tab 5: Month-over-Month & Cycle-over-Cycle Comparison */}
        {activeTab === 'comparison' && (
          <MonthlyComparisonView
            comparisonData={yearComparison}
            categories={categories}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onSelectMonth={handleSelectMonth}
            onOpenInDashboard={(m) => {
              handleSelectMonth(m);
              setActiveTab('dashboard');
            }}
            lang={lang}
            periodMode={periodMode}
            cycleComparisonData={cycleComparison}
            selectedCycleId={activeCycleId}
            onSelectCycle={handleSelectCycle}
            onOpenCycleInDashboard={(cycleId) => {
              handleSelectCycle(cycleId);
              setPeriodMode('cycle');
              if (user) saveUserPeriodModeCloud(user.uid, 'cycle').catch(console.error);
              saveLocalPeriodMode('cycle', user?.uid);
              setActiveTab('dashboard');
            }}
            onTogglePeriodMode={handleTogglePeriodMode}
            bankTransactions={bankTransactions}
            onOpenTransferSaving={(mode, id) => {
              setTransferSavingInitialPeriod({ mode, id });
              setIsTransferSavingOpen(true);
            }}
          />
        )}

        {/* Tab 6: Stores & Merchants Clustering */}
        {activeTab === 'stores' && (
          <StoreClusteringView
            storeSummaries={summary.storeSummaries}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            lang={lang}
            periodMode={periodMode}
            periodLabel={currentPeriodRange.label}
            currentCycle={currentCycle}
          />
        )}

        {/* Tab 7: Categories & Monthly Budgets Management */}
        {activeTab === 'categories' && (
          <CategoryManagerView
            categories={categories}
            currentBudgets={activeBudgets}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onUpdateBudget={handleUpdateCategoryBudget}
            lang={lang}
            currency={currency}
            periodMode={periodMode}
            periodLabel={currentPeriodRange.label}
            categorySummaries={enrichedCategorySummaries}
          />
        )}

        {/* Tab 8: Backup, Export & Restore */}
        {activeTab === 'backup' && (
          <BackupRestoreView
            expenses={expenses}
            categories={categories}
            monthRecords={monthRecords}
            spendingCycles={spendingCycles}
            activeCycleId={activeCycleId}
            bankTransactions={bankTransactions}
            bankTargets={bankTargets}
            currency={currency}
            categoryOrder={categoryOrder}
            onRestoreCurrency={handleCurrencyChange}
            onRestoreData={handleRestoreData}
            onDeleteMonthData={handleDeleteMonthData}
            onDeleteCycle={handleDeleteCycle}
            onDeleteAccount={handleDeleteAccount}
            lang={lang}
            userId={user?.uid}
          />
        )}

      </main>

      {/* Add / Edit Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        categories={categories}
        initialExpense={editingExpense}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        lang={lang}
        currency={currency}
      />

      {/* Fast Multi-Expense Batch Modal */}
      <FastBatchModal
        isOpen={isFastBatchOpen}
        onClose={() => setIsFastBatchOpen(false)}
        onSaveBatch={handleSaveBatchExpenses}
        categories={categories}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        lang={lang}
      />

      {/* Start / Edit Spending Cycle Modal */}
      <StartCycleModal
        isOpen={isStartCycleOpen}
        onClose={() => {
          setIsStartCycleOpen(false);
          setEditingCycle(null);
        }}
        onStartCycle={handleStartNewCycle}
        onUpdateCycle={handleUpdateCycle}
        activeCycle={currentCycle}
        editingCycle={editingCycle}
        cycles={spendingCycles}
        lang={lang}
        currency={currency}
      />

      {/* Bank System: Transfer Saving to Bank Modal */}
      <TransferSavingModal
        isOpen={isTransferSavingOpen}
        onClose={() => {
          setIsTransferSavingOpen(false);
          setTransferSavingInitialPeriod(undefined);
        }}
        lang={lang}
        currency={currency}
        categories={categories}
        expenses={expenses}
        monthRecords={monthRecords}
        spendingCycles={spendingCycles}
        bankTransactions={bankTransactions}
        initialPeriodMode={transferSavingInitialPeriod?.mode || periodMode}
        initialPeriodId={transferSavingInitialPeriod?.id || activePeriodId}
        onSaveTransaction={handleSaveBankTransaction}
      />

      {/* Bank System: Opening Balance / Withdrawal / Manual Adjustment Modal */}
      <BankTransactionModal
        isOpen={isBankTxModalOpen}
        onClose={() => {
          setIsBankTxModalOpen(false);
          setEditingBankTx(null);
        }}
        lang={lang}
        currency={currency}
        mode={bankTxModalMode}
        bankTargets={bankTargets}
        currentBalance={bankSummary.currentBalance}
        editingTransaction={editingBankTx}
        activePeriodMode={periodMode}
        activePeriodId={activePeriodId}
        activePeriodLabel={currentPeriodRange.label}
        onSaveTransaction={handleSaveBankTransaction}
      />

      {/* Bank System: Create / Edit Savings Goal Modal */}
      <BankTargetModal
        isOpen={isBankTargetModalOpen}
        onClose={() => {
          setIsBankTargetModalOpen(false);
          setEditingBankTarget(null);
        }}
        lang={lang}
        currency={currency}
        editingTarget={editingBankTarget}
        unallocatedBalance={bankSummary.unallocatedBalance}
        onSaveTarget={handleSaveBankTarget}
      />

      {/* Bank System: Adjust Goal Funds Modal */}
      {targetToAdjustFunds && (
        <AdjustTargetFundsModal
          isOpen={isAdjustTargetFundsOpen}
          onClose={() => {
            setIsAdjustTargetFundsOpen(false);
            setTargetToAdjustFunds(null);
          }}
          lang={lang}
          currency={currency}
          target={targetToAdjustFunds}
          unallocatedBalance={bankSummary.unallocatedBalance}
          onUpdateTarget={handleUpdateTargetFunds}
        />
      )}

      {/* Quiet, Clean Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t.appTitle} · {t.footerTagline}</span>
          <span className="font-mono text-[11px]">
            {t.footerSubline
              .replace('{currency}', currency)
              .replace('{symbol}', getCurrencySymbol(currency))}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <KassaFinanceApp />
    </AuthProvider>
  );
}
