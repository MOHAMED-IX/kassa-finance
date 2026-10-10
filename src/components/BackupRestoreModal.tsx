import React, { useState, useRef } from 'react';
import { Category, Expense, MonthRecord, SpendingCycle, BankTransaction, BankTarget, Currency } from '../types/finance';
import { exportToCSV, exportToJSON, parseJSONBackup, BackupData } from '../utils/exportImport';
import { Language, translations } from '../utils/i18n';
import { MONTH_NAMES_AR, MONTH_NAMES_DE, MONTH_NAMES_EN, formatDateRange } from '../utils/formatters';
import { CalendarMonthPicker } from './CalendarMonthPicker';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  Loader2,
  X,
  Database,
  CalendarX,
  Trash2,
  AlertOctagon,
  ShieldAlert,
  RotateCw,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { DeleteMonthConfirmModal, DeleteCycleConfirmModal } from './DeleteConfirmationModals';

interface BackupRestoreViewProps {
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
  spendingCycles?: SpendingCycle[];
  activeCycleId?: string;
  bankTransactions?: BankTransaction[];
  bankTargets?: BankTarget[];
  currency?: Currency;
  categoryOrder?: string[];
  onRestoreCurrency?: (currency: Currency) => void;
  onRestoreData: (
    expenses: Expense[],
    categories: Category[],
    monthRecords: MonthRecord[],
    spendingCycles?: SpendingCycle[],
    bankTransactions?: BankTransaction[],
    bankTargets?: BankTarget[],
    categoryOrder?: string[]
  ) => Promise<void> | void;
  onDeleteMonthData: (year: number, month: number) => Promise<{ deletedExpensesCount: number }>;
  onDeleteCycle?: (cycleId: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  lang: Language;
  userId?: string;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  expenses,
  categories,
  monthRecords,
  spendingCycles = [],
  activeCycleId,
  bankTransactions = [],
  bankTargets = [],
  currency = 'EUR',
  categoryOrder,
  onRestoreCurrency,
  onRestoreData,
  onDeleteMonthData,
  onDeleteCycle,
  onDeleteAccount,
  lang,
  userId,
}) => {
  const t = translations[lang];
  const months =
    lang === 'ar'
      ? MONTH_NAMES_AR
      : lang === 'de'
      ? MONTH_NAMES_DE
      : MONTH_NAMES_EN;

  const isRTL = lang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Exact Cloud Restore State
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Delete Month Data State
  const [targetMonth, setTargetMonth] = useState<number>(10);
  const [targetYear, setTargetYear] = useState<number>(2026);
  const [isConfirmingDeleteMonth, setIsConfirmingDeleteMonth] = useState(false);
  const [monthExpenseCount, setMonthExpenseCount] = useState<number>(0);
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);

  // Unified Delete Period Data State
  const [periodDeleteTab, setPeriodDeleteTab] = useState<'month' | 'cycle'>('month');

  // Delete Spending Cycle State
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [isConfirmingDeleteCycle, setIsConfirmingDeleteCycle] = useState(false);
  const [isDeletingCycle, setIsDeletingCycle] = useState(false);
  const [cycleDeleteError, setCycleDeleteError] = useState<string | null>(null);

  const effectiveSelectedCycleId =
    spendingCycles.some((c) => c.id === selectedCycleId)
      ? selectedCycleId
      : spendingCycles.find((c) => c.id === activeCycleId)?.id ||
        spendingCycles[0]?.id ||
        '';

  const selectedCycle = spendingCycles.find((c) => c.id === effectiveSelectedCycleId) || null;

  // Delete Account State (Danger Zone)
  const [isConfirmingDeleteAccount, setIsConfirmingDeleteAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountDeletionError, setAccountDeletionError] = useState<string | null>(null);

  const handleExportJSON = () => {
    exportToJSON(expenses, categories, monthRecords, spendingCycles, bankTransactions, bankTargets, currency, categoryOrder);
    setNotification({
      type: 'success',
      message: 'JSON backup file exported successfully.',
    });
  };

  const handleExportCSV = () => {
    exportToCSV(expenses, categories);
    setNotification({
      type: 'success',
      message: 'CSV expenses file exported successfully.',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseJSONBackup(content);

      if (result.success && result.data) {
        setPendingBackup(result.data);
      } else {
        setNotification({
          type: 'error',
          message: result.error || t.failedToParseBackup,
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;
    setIsRestoring(true);
    try {
      if (pendingBackup.currency && onRestoreCurrency) {
        onRestoreCurrency(pendingBackup.currency);
      }
      await onRestoreData(
        pendingBackup.expenses,
        pendingBackup.categories.length > 0 ? pendingBackup.categories : categories,
        pendingBackup.monthRecords.length > 0 ? pendingBackup.monthRecords : monthRecords,
        pendingBackup.spendingCycles || [],
        pendingBackup.bankTransactions || [],
        pendingBackup.bankTargets || [],
        pendingBackup.categoryOrder
      );
      setNotification({
        type: 'success',
        message: t.backupRestoredSuccess.replace('{count}', String(pendingBackup.expenses.length)),
      });
      setPendingBackup(null);
    } catch (err: any) {
      console.error('Exact restore error:', err);
      setNotification({
        type: 'error',
        message: err?.message || t.failedToRestoreCloud,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Month Deletion Handlers
  const handleInitiateDeleteMonth = () => {
    const matchingExpenses = expenses.filter(
      (e) => e.year === targetYear && e.month === targetMonth
    );
    const hasMonthRecord = monthRecords.some(
      (m) => m.year === targetYear && m.month === targetMonth && (m.income > 0 || Object.keys(m.budgets || {}).length > 0)
    );

    if (matchingExpenses.length === 0 && !hasMonthRecord) {
      const monthName = months[targetMonth - 1];
      const emptyMsg = t.noDataForMonth
        .replace('{month}', monthName)
        .replace('{year}', String(targetYear));
      setNotification({
        type: 'error',
        message: emptyMsg,
      });
      return;
    }

    setMonthExpenseCount(matchingExpenses.length);
    setIsConfirmingDeleteMonth(true);
  };

  const handleExecuteDeleteMonth = async () => {
    setIsDeletingMonth(true);
    try {
      const monthName = months[targetMonth - 1];
      const result = await onDeleteMonthData(targetYear, targetMonth);
      const successMsg = t.monthDataDeletedSuccess
        .replace('{month}', monthName)
        .replace('{year}', String(targetYear));
      setNotification({
        type: 'success',
        message: `${successMsg} ${t.expensesRemoved.replace('{count}', String(result.deletedExpensesCount))}`,
      });
      setIsConfirmingDeleteMonth(false);
    } catch (err: any) {
      console.error('Delete month error:', err);
      setNotification({
        type: 'error',
        message: err?.message || t.failedToDeleteMonthData,
      });
    } finally {
      setIsDeletingMonth(false);
    }
  };

  // Spending Cycle Deletion Handlers
  const handleInitiateDeleteCycle = () => {
    if (!selectedCycle) return;
    setCycleDeleteError(null);
    setIsConfirmingDeleteCycle(true);
  };

  const handleExecuteDeleteCycle = async () => {
    if (!selectedCycle || !onDeleteCycle) return;
    setIsDeletingCycle(true);
    setCycleDeleteError(null);
    try {
      await onDeleteCycle(selectedCycle.id);
      setNotification({
        type: 'success',
        message: t.spendingCycleDeletedSuccess,
      });
      setIsConfirmingDeleteCycle(false);
      const remaining = spendingCycles.filter((c) => c.id !== selectedCycle.id);
      setSelectedCycleId(remaining[0]?.id || '');
    } catch (err: any) {
      console.error('Delete spending cycle error:', err);
      const errMsg = err?.message || t.spendingCycleDeleteFailed;
      setCycleDeleteError(errMsg);
      setNotification({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setIsDeletingCycle(false);
    }
  };

  // Account Deletion Handlers
  const handleExecuteDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    setAccountDeletionError(null);

    try {
      await onDeleteAccount();
      // On full success, the user is signed out and redirected to Auth screen
    } catch (err: any) {
      console.error('Account deletion error:', err);
      const errMsg = err?.message || t.failedToDeleteAccount;
      setAccountDeletionError(errMsg);
      setIsDeletingAccount(false);
    }
  };

  const targetMonthName = months[targetMonth - 1];

  return (
    <div className="space-y-6">
      
      {/* 1. Header: Cloud Database Active */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {t.settings}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t.backupSettingsSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-medium shrink-0 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t.cloudDbActive}</span>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-75 cursor-pointer text-slate-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2 & 3. Export Database & Import & Restore Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Export Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.exportDatabase}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.exportDatabaseDesc}
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{t.exportCSVExcel}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <FileJson className="w-4 h-4 text-blue-600" />
              <span>{t.exportJSONBackup}</span>
            </button>
          </div>
        </div>

        {/* Import & Restore Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.importAndRestore}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.importAndRestoreDesc}
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          <div className="pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{t.selectJSONFile}</span>
            </button>
          </div>
        </div>

      </div>

      {/* 4. Unified Delete Period Data Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.deletePeriodDataTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.deletePeriodDataDesc}
            </p>
          </div>
        </div>

        {/* Segmented Tab Selector: [ Calendar Month ] [ Spending Cycle ] */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-auto self-start">
          <button
            type="button"
            onClick={() => setPeriodDeleteTab('month')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              periodDeleteTab === 'month'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarX className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.calendarMonth}</span>
          </button>
          <button
            type="button"
            onClick={() => setPeriodDeleteTab('cycle')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              periodDeleteTab === 'cycle'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 text-rose-500" />
            <span>{t.spendingCycle}</span>
          </button>
        </div>

        {/* Tab 1: Calendar Month Deletion Controls */}
        {periodDeleteTab === 'month' && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.deleteMonthDataDesc}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Calendar Month Picker */}
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {t.calendarMonth}
                </label>
                <CalendarMonthPicker
                  selectedYear={targetYear}
                  selectedMonth={targetMonth}
                  onSelect={(year, month) => {
                    setTargetYear(year);
                    setTargetMonth(month);
                  }}
                  lang={lang}
                  userId={userId}
                  align={isRTL ? 'right' : 'left'}
                  buttonClassName="w-full justify-between"
                  className="w-full"
                />
              </div>

              {/* Delete Month Button */}
              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleInitiateDeleteMonth}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-xl transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {t.deleteMonthBtn
                      .replace('{month}', targetMonthName)
                      .replace('{year}', String(targetYear))}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Spending Cycle Deletion Controls */}
        {periodDeleteTab === 'cycle' && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.deleteSpendingCycleSectionDesc}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Spending Cycle Selector */}
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {t.selectSpendingCycle}
                </label>
                {spendingCycles.length === 0 ? (
                  <select
                    disabled
                    aria-label={t.selectSpendingCycle}
                    className="w-full text-xs font-medium bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 cursor-not-allowed opacity-75"
                  >
                    <option>{t.noSpendingCyclesAvailable}</option>
                  </select>
                ) : (
                  <select
                    value={effectiveSelectedCycleId}
                    onChange={(e) => setSelectedCycleId(e.target.value)}
                    aria-label={t.selectSpendingCycle}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-2xs truncate"
                  >
                    {spendingCycles.map((cycle) => {
                      const isCycleActive = cycle.id === activeCycleId || cycle.endDate === null;
                      const rangeText = formatDateRange(cycle.startDate, cycle.endDate, lang);
                      const displayLabel = isCycleActive
                        ? `${rangeText} • [${t.activeCycleBadge}]${cycle.notes ? ` - ${cycle.notes}` : ''}`
                        : `${rangeText}${cycle.notes ? ` - ${cycle.notes}` : ''}`;
                      return (
                        <option key={cycle.id} value={cycle.id}>
                          {displayLabel}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Delete Cycle Button */}
              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleInitiateDeleteCycle}
                  disabled={spendingCycles.length === 0 || !selectedCycle || isDeletingCycle}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-xl transition-all cursor-pointer active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.deleteSpendingCycleBtn}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Danger Zone - Delete My Account */}
      <div className="bg-rose-50/40 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/60 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 tracking-wider uppercase">
                {t.dangerZone}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t.deleteMyAccount}
              </h3>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {t.deleteAccountDesc}
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsConfirmingDeleteAccount(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t.deleteAccountBtn}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog: Delete Spending Cycle */}
      <DeleteCycleConfirmModal
        isOpen={isConfirmingDeleteCycle}
        onClose={() => {
          setIsConfirmingDeleteCycle(false);
          setCycleDeleteError(null);
        }}
        onConfirm={handleExecuteDeleteCycle}
        cycle={selectedCycle}
        activeCycleId={activeCycleId}
        lang={lang}
        isDeleting={isDeletingCycle}
        error={cycleDeleteError}
      />

      {/* Confirmation Dialog: Delete Month Data */}
      <DeleteMonthConfirmModal
        isOpen={isConfirmingDeleteMonth}
        onClose={() => setIsConfirmingDeleteMonth(false)}
        onConfirm={handleExecuteDeleteMonth}
        year={targetYear}
        month={targetMonth}
        expenseCount={monthExpenseCount}
        lang={lang}
        isDeleting={isDeletingMonth}
      />

      {/* Confirmation Dialog: Delete My Account (Danger Zone Step 1 & 2) */}
      {isConfirmingDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t.deleteAccountWarningTitle}
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {t.deleteAccountDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingAccount) {
                    setIsConfirmingDeleteAccount(false);
                    setAccountDeletionError(null);
                  }
                }}
                disabled={isDeletingAccount}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checklist of what will be erased */}
            <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 rounded-xl p-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-bold text-rose-700 dark:text-rose-300">
                {t.deleteAccountWarningList}
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] leading-relaxed">
                <li>{t.deleteAccountItem1}</li>
                <li>{t.deleteAccountItem2}</li>
                <li>{t.deleteAccountItem3}</li>
                <li>{t.deleteAccountItem4}</li>
                <li>{t.deleteAccountItem5}</li>
                <li>{t.deleteAccountItem6}</li>
              </ul>
            </div>

            {accountDeletionError && (
              <div className="p-3.5 bg-rose-100 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{accountDeletionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDeleteAccount(false);
                  setAccountDeletionError(null);
                }}
                disabled={isDeletingAccount}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteAccount}
                disabled={isDeletingAccount}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.deletingAccount}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{t.deleteAccountPermanentlyBtn}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Exact Cloud Restore */}
      {pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {lang === 'ar'
                      ? 'تأكيد استعادة النسخة الاحتياطية'
                      : lang === 'de'
                      ? 'Backup-Wiederherstellung bestätigen'
                      : 'Confirm Exact Cloud Restore'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pendingBackup.exportedAt ? `Exported on ${new Date(pendingBackup.exportedAt).toLocaleDateString()}` : 'JSON Backup File'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                disabled={isRestoring}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>{t.restoreNotice}</strong>{' '}
              {t.exactRestoreNotice}
            </div>

            {/* Content summary pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-base font-bold text-slate-900 dark:text-white font-mono">
                  {pendingBackup.expenses.length}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {lang === 'ar' ? 'معاملة' : lang === 'de' ? 'Ausgaben' : 'Expenses'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-base font-bold text-slate-900 dark:text-white font-mono">
                  {pendingBackup.categories.length > 0 ? pendingBackup.categories.length : categories.length}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {lang === 'ar' ? 'تصنيف' : lang === 'de' ? 'Kategorien' : 'Categories'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-base font-bold text-slate-900 dark:text-white font-mono">
                  {pendingBackup.monthRecords.length}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {lang === 'ar' ? 'أشهر' : lang === 'de' ? 'Monate' : 'Months'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {pendingBackup.currency || 'EUR'}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {t.currency}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : lang === 'de' ? 'Abbrechen' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {lang === 'ar'
                        ? 'جارٍ الاستعادة والمزامنة...'
                        : lang === 'de'
                        ? 'Wiederherstellung läuft...'
                        : 'Restoring & Syncing...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ar'
                        ? 'استبدال واستعادة'
                        : lang === 'de'
                        ? 'Exakt wiederherstellen'
                        : 'Exact Replace & Restore'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
