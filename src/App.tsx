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
import { AddExpenseModal } from './components/AddExpenseModal';
import { FastBatchModal } from './components/FastBatchModal';
import { FixedExpensesView } from './components/FixedExpensesModal';
import { MonthlyComparisonView } from './components/MonthlyComparisonView';
import { StoreClusteringView } from './components/StoreClusteringView';
import { CategoryManagerView } from './components/CategoryManagerModal';
import { BackupRestoreView } from './components/BackupRestoreModal';
import { AuthSignInScreen } from './components/AuthSignInScreen';
import { LocalDataMigrationBanner } from './components/LocalDataMigrationBanner';
import { TestDataModal } from './components/TestDataModal';

import { AuthProvider, useAuth } from './context/AuthContext';
import { Category, Expense, MonthRecord } from './types/finance';
import {
  calculateFinancialSummary,
  calculateYearMonthlyComparison,
} from './utils/calculations';
import {
  loadStoredData,
  saveStoredData,
  resetToDefaultDataset,
  detectExistingLocalData,
  StoredData,
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
  uploadFullDatasetCloud,
  exactRestoreCloudDataset,
} from './services/firestoreData';
import { exportToCSV } from './utils/exportImport';
import { Language, translations } from './utils/i18n';
import { round2 } from './utils/formatters';

function KassaFinanceApp() {
  const { user, loading: authLoading, logout, hasMigrated, setHasMigrated } = useAuth();

  // Database States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthRecords, setMonthRecords] = useState<MonthRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingMigrationData, setPendingMigrationData] = useState<StoredData | null>(null);

  // Active View & Date Selection (default to Sep 2026 per verification test case)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Preferences: Language & Dark Mode
  const [lang, setLang] = useState<Language>('en');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kassa_theme');
      if (saved) return saved === 'dark';
      return false; // Default to Light Mode
    }
    return false;
  });

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isFastBatchOpen, setIsFastBatchOpen] = useState(false);
  const [isTestDataOpen, setIsTestDataOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

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

  // Load cloud data for authenticated user & handle migration detection
  useEffect(() => {
    let isSubscribed = true;
    if (!user) {
      setIsLoaded(false);
      return;
    }

    async function initializeUserLedger() {
      setIsLoaded(false);
      try {
        const cloudData = await fetchUserCloudData(user!.uid);
        if (!isSubscribed) return;

        if (cloudData.hasData) {
          // Cloud has existing data -> use Firestore as single source of truth
          setExpenses(cloudData.expenses);
          setCategories(cloudData.categories);
          setMonthRecords(cloudData.monthRecords);
          saveStoredData(cloudData.expenses, cloudData.categories, cloudData.monthRecords);
          setIsLoaded(true);
        } else {
          // Cloud is empty for this user. Check if there is existing local browser data.
          const localData = await detectExistingLocalData();
          if (!isSubscribed) return;

          if (localData && !cloudData.hasMigrated) {
            // Local data detected and user hasn't completed migration -> show migration offer
            setExpenses(localData.expenses);
            setCategories(localData.categories);
            setMonthRecords(localData.monthRecords);
            setPendingMigrationData(localData);
            setIsLoaded(true);
          } else {
            // No local data or already migrated -> initialize cloud with standard default dataset
            await uploadFullDatasetCloud(
              user!.uid,
              DEFAULT_EXPENSES,
              DEFAULT_CATEGORIES,
              DEFAULT_MONTH_RECORDS,
              true
            );
            if (!isSubscribed) return;
            setExpenses(DEFAULT_EXPENSES);
            setCategories(DEFAULT_CATEGORIES);
            setMonthRecords(DEFAULT_MONTH_RECORDS);
            saveStoredData(DEFAULT_EXPENSES, DEFAULT_CATEGORIES, DEFAULT_MONTH_RECORDS);
            setIsLoaded(true);
          }
        }
      } catch (err) {
        console.error('Failed to load user ledger from Firestore:', err);
        // Resilient fallback to local cache when offline
        const localData = await loadStoredData();
        if (!isSubscribed) return;
        setExpenses(localData.expenses);
        setCategories(localData.categories);
        setMonthRecords(localData.monthRecords);
        setIsLoaded(true);
      }
    }

    initializeUserLedger();

    return () => {
      isSubscribed = false;
    };
  }, [user]);

  // Compute Live Financial Summary for the active Month & Year
  const summary = useMemo(() => {
    return calculateFinancialSummary(
      expenses,
      categories,
      monthRecords,
      selectedYear,
      selectedMonth
    );
  }, [expenses, categories, monthRecords, selectedYear, selectedMonth]);

  // Compute Year Comparison
  const yearComparison = useMemo(() => {
    return calculateYearMonthlyComparison(
      expenses,
      categories,
      monthRecords,
      selectedYear
    );
  }, [expenses, categories, monthRecords, selectedYear]);

  // Active month budget mapping
  const currentMonthRecord = useMemo(() => {
    return monthRecords.find(
      (m) => m.year === selectedYear && m.month === selectedMonth
    );
  }, [monthRecords, selectedYear, selectedMonth]);

  const activeBudgets = useMemo(() => {
    return currentMonthRecord ? currentMonthRecord.budgets : {};
  }, [currentMonthRecord]);

  // --- Handlers with Cloud Synchronization ---

  const handleConfirmMigration = async () => {
    if (!user || !pendingMigrationData) return;
    try {
      await uploadFullDatasetCloud(
        user.uid,
        pendingMigrationData.expenses,
        pendingMigrationData.categories,
        pendingMigrationData.monthRecords,
        true
      );
      setHasMigrated(true);
      setPendingMigrationData(null);
      saveStoredData(
        pendingMigrationData.expenses,
        pendingMigrationData.categories,
        pendingMigrationData.monthRecords
      );
    } catch (err) {
      console.error('Migration execution failed:', err);
      throw err;
    }
  };

  const handleDismissMigration = () => {
    setPendingMigrationData(null);
  };

  const handleUpdateIncome = (newIncome: number) => {
    const roundedIncome = round2(newIncome);
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
      saveStoredData(expenses, categories, updated);
      return updated;
    });
  };

  const handleUpdateCategoryBudget = (categoryId: string, newBudget: number) => {
    const roundedBudget = round2(newBudget);
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
      saveStoredData(expenses, categories, updated);
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
        saveStoredData(next, categories, monthRecords);
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
        saveStoredData(next, categories, monthRecords);
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
      saveStoredData(next, categories, monthRecords);
      return next;
    });

    if (user) {
      saveBatchExpensesCloud(user.uid, newItems).catch(console.error);
    }
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveStoredData(next, categories, monthRecords);
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
      saveStoredData(next, categories, monthRecords);
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
      saveStoredData(expenses, next, monthRecords);
      return next;
    });

    if (user) {
      saveCategoryCloud(user.uid, cat).catch(console.error);
    }
  };

  // Update category
  const handleUpdateCategory = (updatedCat: Category) => {
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === updatedCat.id ? updatedCat : c));
      saveStoredData(expenses, next, monthRecords);
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
      saveStoredData(expenses, next, monthRecords);
      return next;
    });

    if (user) {
      deleteCategoryCloud(user.uid, catId).catch(console.error);
    }
  };

  // Restore imported data with exact cloud matching (deletes orphaned cloud records)
  const handleRestoreData = async (
    newExpenses: Expense[],
    newCategories: Category[],
    newMonthRecords: MonthRecord[]
  ) => {
    if (user) {
      await exactRestoreCloudDataset(
        user.uid,
        newExpenses,
        newCategories,
        newMonthRecords
      );
    }
    setExpenses(newExpenses);
    setCategories(newCategories);
    setMonthRecords(newMonthRecords);
    saveStoredData(newExpenses, newCategories, newMonthRecords);
  };

  // Reset to Sep 2026 Test Scenario with exact cloud matching
  const handleResetToTestScenario = async () => {
    const fresh = await resetToDefaultDataset();
    if (user) {
      await exactRestoreCloudDataset(
        user.uid,
        fresh.expenses,
        fresh.categories,
        fresh.monthRecords
      );
    }
    setExpenses(fresh.expenses);
    setCategories(fresh.categories);
    setMonthRecords(fresh.monthRecords);
    setSelectedYear(2026);
    setSelectedMonth(9);
    saveStoredData(fresh.expenses, fresh.categories, fresh.monthRecords);
  };

  const handleExportCSV = () => {
    exportToCSV(expenses, categories);
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
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenAddExpense={() => {
          setEditingExpense(null);
          setIsAddExpenseOpen(true);
        }}
        onOpenFastBatch={() => setIsFastBatchOpen(true)}
        user={user}
        onLogout={logout}
        onOpenTestData={() => setIsTestDataOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Local Data Migration Prompt Banner */}
        {pendingMigrationData && (
          <LocalDataMigrationBanner
            localExpenses={pendingMigrationData.expenses}
            localCategories={pendingMigrationData.categories}
            localMonthRecords={pendingMigrationData.monthRecords}
            onConfirmMigration={handleConfirmMigration}
            onDismiss={handleDismissMigration}
            lang={lang}
          />
        )}

        {/* Month & Year Selection Bar (Always accessible for fast toggling) */}
        <MonthYearSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onSelectYear={setSelectedYear}
          onSelectMonth={setSelectedMonth}
          lang={lang}
        />

        {/* Tab 1: Primary Personal Finance Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            {/* KPI Cards: Income, Total Expenses, Remaining, Fixed */}
            <DashboardCards
              summary={summary}
              onUpdateIncome={handleUpdateIncome}
              lang={lang}
            />

            {/* Category Budgets & Spending Progress Cards */}
            <CategoryBudgets
              categorySummaries={summary.categorySummaries}
              onUpdateCategoryBudget={handleUpdateCategoryBudget}
              lang={lang}
              income={summary.income}
              totalExpenses={summary.totalExpenses}
              remainingIncome={summary.remainingIncome}
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
            />
          </div>
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
          />
        )}

        {/* Tab 3: Dedicated Fixed & Recurring Expenses Hub */}
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

        {/* Tab 4: Month-over-Month Comparison */}
        {activeTab === 'comparison' && (
          <MonthlyComparisonView
            comparisonData={yearComparison}
            categories={categories}
            selectedYear={selectedYear}
            onSelectMonth={(m) => {
              setSelectedMonth(m);
              setActiveTab('dashboard');
            }}
            lang={lang}
          />
        )}

        {/* Tab 5: Stores & Merchants Clustering */}
        {activeTab === 'stores' && (
          <StoreClusteringView
            storeSummaries={summary.storeSummaries}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            lang={lang}
          />
        )}

        {/* Tab 6: Categories & Monthly Budgets Management */}
        {activeTab === 'categories' && (
          <CategoryManagerView
            categories={categories}
            currentBudgets={activeBudgets}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onUpdateBudget={handleUpdateCategoryBudget}
            lang={lang}
          />
        )}

        {/* Tab 7: Backup, Export, Restore & Test Dataset */}
        {activeTab === 'backup' && (
          <BackupRestoreView
            expenses={expenses}
            categories={categories}
            monthRecords={monthRecords}
            onRestoreData={handleRestoreData}
            onResetToTestScenario={handleResetToTestScenario}
            lang={lang}
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

      {/* September 2026 Test Data Modal */}
      <TestDataModal
        isOpen={isTestDataOpen}
        onClose={() => setIsTestDataOpen(false)}
        onConfirm={handleResetToTestScenario}
        lang={lang}
      />

      {/* Quiet, Clean Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Kassa Finance · Personal Finance & Expense Tracker</span>
          <span className="font-mono text-[11px]">
            EUR (€) · Cloud-Backed Firestore Persistence · Cross-Device Ready
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
