import React, { useState } from 'react';
import {
  X,
  Landmark,
  PiggyBank,
  TrendingDown,
  SlidersHorizontal,
  Target,
  Shield,
  Plane,
  Laptop,
  Car,
  Home,
  GraduationCap,
  Heart,
  Sparkles,
  Check,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import {
  BankTarget,
  BankTransaction,
  MonthRecord,
  SpendingCycle,
  SourcePeriodMode,
  Expense,
  Currency,
  PeriodMode,
  Category,
} from '../types/finance';
import { Language, translations } from '../utils/i18n';
import { formatEUR, round2, getCurrencySymbol } from '../utils/formatters';
import { DEFAULT_CATEGORIES } from '../utils/initialData';
import {
  getPeriodSavingTransferInfo,
} from '../utils/bankCalculations';
import { calculatePeriodFinancialSummary } from '../utils/periodAbstraction';

const getTodayString = () => new Date().toISOString().split('T')[0];

// ==========================================
// 1. Transfer Saving to Bank Modal
// ==========================================
export interface TransferSavingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  expenses: Expense[];
  monthRecords: MonthRecord[];
  spendingCycles: SpendingCycle[];
  bankTransactions: BankTransaction[];
  initialPeriodMode?: 'month' | 'cycle';
  initialPeriodId?: string; // "YYYY-M" or cycle.id
  currency?: Currency;
  categories?: Category[];
  onSaveTransaction: (tx: BankTransaction) => Promise<void>;
}

export const TransferSavingModal: React.FC<TransferSavingModalProps> = ({
  isOpen,
  onClose,
  lang,
  currency,
  categories = DEFAULT_CATEGORIES,
  expenses,
  monthRecords,
  spendingCycles,
  bankTransactions,
  initialPeriodMode = 'month',
  initialPeriodId,
  onSaveTransaction,
}) => {
  const t = translations[lang] || translations.en;
  const currencySymbol = getCurrencySymbol(currency);

  const [periodMode, setPeriodMode] = useState<SourcePeriodMode>(
    initialPeriodMode === 'cycle' ? 'spending-cycle' : 'calendar-month'
  );

  // Default active period ID
  const defaultPeriodId = () => {
    if (initialPeriodId) return initialPeriodId;
    if (periodMode === 'spending-cycle') {
      const activeCycle = spendingCycles.find((c) => !c.endDate) || spendingCycles[0];
      return activeCycle ? activeCycle.id : '';
    } else {
      const now = new Date();
      return `${now.getFullYear()}-${now.getMonth() + 1}`;
    }
  };

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(defaultPeriodId);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(getTodayString());
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate period financial summary for the selected period
  let periodSaving = 0;
  let periodLabel = '';
  let cycleStartDate: string | undefined;
  let cycleEndDate: string | undefined;

  if (periodMode === 'spending-cycle') {
    const cycle = spendingCycles.find((c) => c.id === selectedPeriodId);
    if (cycle) {
      cycleStartDate = cycle.startDate;
      cycleEndDate = cycle.endDate || undefined;
      const summary = calculatePeriodFinancialSummary(
        expenses,
        categories,
        monthRecords,
        { mode: 'cycle', cycleId: cycle.id },
        spendingCycles,
        lang
      );
      periodSaving = summary.remainingIncome;
      periodLabel = cycle.notes ? `${cycle.startDate} (${cycle.notes})` : cycle.startDate;
    }
  } else {
    // calendar-month
    const [yStr, mStr] = (selectedPeriodId || '').split('-');
    const year = parseInt(yStr, 10) || new Date().getFullYear();
    const month = parseInt(mStr, 10) || new Date().getMonth() + 1;
    const summary = calculatePeriodFinancialSummary(
      expenses,
      categories,
      monthRecords,
      { mode: 'month', year, month },
      spendingCycles,
      lang
    );
    periodSaving = summary.remainingIncome;
    periodLabel = `${month}/${year}`;
  }

  const transferInfo = getPeriodSavingTransferInfo(
    periodSaving,
    periodMode === 'spending-cycle' ? 'cycle' : 'month',
    selectedPeriodId,
    bankTransactions,
    cycleStartDate,
    cycleEndDate
  );

  const handleTransferFull = () => {
    if (transferInfo.stillAvailable > 0) {
      setTransferAmount(transferInfo.stillAvailable.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg(t.validAmountError);
      return;
    }

    if (amountNum > transferInfo.stillAvailable + 0.001) {
      setErrorMsg(t.cannotTransferMoreThanAvailable.replace('{amount}', formatEUR(transferInfo.stillAvailable)));
      return;
    }

    if (!transferDate) {
      setErrorMsg(t.selectDateError);
      return;
    }

    setIsSubmitting(true);
    try {
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newTx: BankTransaction = {
        id: txId,
        type: 'saving-transfer',
        amount: round2(amountNum),
        date: transferDate,
        note: note.trim() || t.savingTransferPeriodNote.replace('{period}', periodLabel),
        sourcePeriodMode: periodMode,
        sourcePeriodId: selectedPeriodId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await onSaveTransaction(newTx);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || t.failedToSaveTransfer);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-[calc(100vw-24px)] sm:max-w-lg max-h-[calc(100dvh-24px)] flex flex-col shadow-2xl overflow-hidden">
        {/* Header - Fixed & Accessible */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight break-words">
                {t.transferSavingToBank}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {t.bankHelpNotice}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeModal}
            className="p-2 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs sm:text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-words">{errorMsg}</span>
              </div>
            )}

            {/* Period Mode Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.sourcePeriod}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPeriodMode('calendar-month');
                    const now = new Date();
                    setSelectedPeriodId(`${now.getFullYear()}-${now.getMonth() + 1}`);
                  }}
                  className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer flex items-center justify-center text-center ${
                    periodMode === 'calendar-month'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.calendarMonth}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodMode('spending-cycle');
                    const activeCycle = spendingCycles.find((c) => !c.endDate) || spendingCycles[0];
                    if (activeCycle) setSelectedPeriodId(activeCycle.id);
                  }}
                  className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer flex items-center justify-center text-center ${
                    periodMode === 'spending-cycle'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.spendingCycle}
                </button>
              </div>
            </div>

            {/* Period Selection Dropdown / Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.sourcePeriod}
              </label>
              {periodMode === 'spending-cycle' ? (
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                >
                  {spendingCycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.startDate} {c.endDate ? `→ ${c.endDate}` : `(${t.active})`} {c.notes ? `· ${c.notes}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="month"
                  value={
                    selectedPeriodId.includes('-')
                      ? `${selectedPeriodId.split('-')[0]}-${selectedPeriodId.split('-')[1].padStart(2, '0')}`
                      : ''
                  }
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-');
                    if (y && m) {
                      setSelectedPeriodId(`${parseInt(y, 10)}-${parseInt(m, 10)}`);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              )}
            </div>

            {/* Period Saving Calculation Info Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm">
                <span className="text-slate-500 dark:text-slate-400 break-words">{t.availableToTransferToSavings}:</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm sm:text-base tabular-nums">
                  {formatEUR(transferInfo.periodSaving)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm">
                <span className="text-slate-500 dark:text-slate-400 break-words">{t.savingsHeldInBank}:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatEUR(transferInfo.transferredAmount)}
                </span>
              </div>
              {transferInfo.hasReturns && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm">
                  <span className="text-slate-500 dark:text-slate-400 break-words">{t.returnedFromBank}:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                    {transferInfo.returnedAmount > 0 ? '+' : ''}{formatEUR(transferInfo.returnedAmount)}
                  </span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm pt-2 border-t border-slate-200/70 dark:border-slate-700 font-bold">
                <span className="text-slate-700 dark:text-slate-300 break-words">{t.availableSpendingBalance}:</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-300 text-base tabular-nums">
                  {formatEUR(transferInfo.stillAvailable)}
                </span>
              </div>
            </div>

            {/* Transfer Amount Input & Quick Fill */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.amount} ({currencySymbol})
                </label>
                {transferInfo.stillAvailable > 0 && (
                  <button
                    type="button"
                    onClick={handleTransferFull}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer text-left sm:text-right break-words"
                  >
                    {t.transferFullSaving.replace('{amount}', formatEUR(transferInfo.stillAvailable))}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={transferInfo.remainingUntransferred.toFixed(2)}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-4 rtl:pl-4 rtl:pr-8 py-2.5 min-h-[44px] rounded-xl font-bold font-mono text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.date}
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.notes} ({t.optional})
              </label>
              <input
                type="text"
                placeholder={t.salarySavingMovedPlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer Actions - Stacked on Mobile, Inline on Desktop */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Landmark className="w-4 h-4 shrink-0" />
              <span className="break-words">{isSubmitting ? t.loading : t.quickTransferSavingBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. Bank Opening Balance & Transaction Modal
// ==========================================
export interface BankTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currency?: Currency;
  mode: 'opening-balance' | 'bank-withdrawal' | 'manual-adjustment';
  bankTargets?: BankTarget[];
  currentBalance: number;
  editingTransaction?: BankTransaction | null;
  activePeriodMode?: PeriodMode;
  activePeriodId?: string;
  activePeriodLabel?: string;
  onSaveTransaction: (tx: BankTransaction) => Promise<void>;
}

export const BankTransactionModal: React.FC<BankTransactionModalProps> = ({
  isOpen,
  onClose,
  lang,
  currency,
  mode,
  bankTargets = [],
  currentBalance,
  editingTransaction,
  activePeriodMode = 'cycle',
  activePeriodId,
  activePeriodLabel,
  onSaveTransaction,
}) => {
  const t = translations[lang] || translations.en;
  const currencySymbol = getCurrencySymbol(currency);

  const [amount, setAmount] = useState<string>(() => {
    if (editingTransaction) return Math.abs(editingTransaction.amount).toString();
    return '';
  });
  const [date, setDate] = useState<string>(() => {
    if (editingTransaction?.date) return editingTransaction.date;
    return getTodayString();
  });
  const [note, setNote] = useState<string>(() => editingTransaction?.note || '');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'add' | 'subtract'>(() => {
    if (editingTransaction && editingTransaction.amount < 0) return 'subtract';
    return 'add';
  });
  const [selectedTargetId, setSelectedTargetId] = useState<string>(() => editingTransaction?.targetId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const getTitle = () => {
    if (mode === 'opening-balance') return t.openingBalance;
    if (mode === 'bank-withdrawal') {
      return activePeriodMode === 'cycle' ? t.returnFundsToCycleTitle : t.returnFundsToMonthTitle;
    }
    return t.manualAdjustment;
  };

  const getSubtitle = () => {
    if (mode === 'opening-balance') return t.initialBankBalance;
    if (mode === 'bank-withdrawal') {
      return activePeriodMode === 'cycle' ? t.returnSubtitleCycle : t.returnSubtitleMonth;
    }
    return t.manualAdjustment;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg(t.validAmountError);
      return;
    }

    if (mode === 'bank-withdrawal' && amountNum > currentBalance + 0.001) {
      setErrorMsg(t.cannotReturnMoreThanBankBalance.replace('{amount}', formatEUR(currentBalance)));
      return;
    }

    if (!date) {
      setErrorMsg(t.selectDateError);
      return;
    }

    let finalAmount = amountNum;
    if (mode === 'manual-adjustment' && adjustmentDirection === 'subtract') {
      finalAmount = -amountNum;
    }

    setIsSubmitting(true);
    try {
      const txId = editingTransaction?.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const defaultNote =
        activePeriodMode === 'cycle' ? t.defaultReturnMemoCycle : t.defaultReturnMemoMonth;
      const tx: BankTransaction = {
        id: txId,
        type: mode,
        amount: round2(finalAmount),
        date,
        note: note.trim() || (mode === 'bank-withdrawal' ? defaultNote : undefined),
        targetId: selectedTargetId || undefined,
        sourcePeriodMode:
          mode === 'bank-withdrawal'
            ? editingTransaction?.sourcePeriodMode ||
              (activePeriodMode === 'cycle' ? 'spending-cycle' : 'calendar-month')
            : undefined,
        sourcePeriodId:
          mode === 'bank-withdrawal'
            ? editingTransaction?.sourcePeriodId || activePeriodId
            : undefined,
        createdAt: editingTransaction?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await onSaveTransaction(tx);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || t.failedToRecordTransaction);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-[calc(100vw-24px)] sm:max-w-md max-h-[calc(100dvh-24px)] flex flex-col shadow-2xl overflow-hidden">
        {/* Header - Fixed & Accessible */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'opening-balance'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  : mode === 'bank-withdrawal'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              {mode === 'opening-balance' && <Landmark className="w-5 h-5" />}
              {mode === 'bank-withdrawal' && <RotateCw className="w-5 h-5" />}
              {mode === 'manual-adjustment' && <SlidersHorizontal className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight break-words">
                {getTitle()}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {getSubtitle()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeModal}
            className="p-2 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs sm:text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-words">{errorMsg}</span>
              </div>
            )}

            {/* Current balance indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs sm:text-sm">
              <span className="text-slate-500 dark:text-slate-400 break-words">{t.currentBankBalanceColon}</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {formatEUR(currentBalance)}
              </span>
            </div>

            {/* Bank Withdrawal returns money directly to active cycle */}
            {mode === 'bank-withdrawal' && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                <RotateCw className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">
                    {activePeriodMode === 'cycle' ? t.returnFundsToCycleTitle : t.returnFundsToMonthTitle}
                  </span>
                  <span className="text-[11px] text-blue-600/90 dark:text-blue-400/90 block">
                    {activePeriodMode === 'cycle'
                      ? t.returnExplTextCycle.replace('{period}', activePeriodLabel || '')
                      : t.returnExplTextMonth.replace('{period}', activePeriodLabel || '')}
                  </span>
                </div>
              </div>
            )}

            {/* Manual adjustment direction (+ / -) */}
            {mode === 'manual-adjustment' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t.manualAdjustment}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentDirection('add')}
                    className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer flex items-center justify-center text-center ${
                      adjustmentDirection === 'add'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    + {t.deposits}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentDirection('subtract')}
                    className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer flex items-center justify-center text-center ${
                      adjustmentDirection === 'subtract'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-400 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    - {t.withdrawals}
                  </button>
                </div>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.amount} ({currencySymbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-4 rtl:pl-4 rtl:pr-8 py-2.5 min-h-[44px] rounded-xl font-bold font-mono text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.date}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {/* Target attribution (optional for withdrawal) */}
            {mode === 'bank-withdrawal' && bankTargets.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.withdrawFromTarget} ({t.optional})
                </label>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 break-words"
                >
                  <option value="">{t.noneWithdrawGeneral}</option>
                  {bankTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name} ({t.targetAllocated}: {formatEUR(target.allocatedAmount)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Note / Memo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.descriptionMemo}
              </label>
              <input
                type="text"
                placeholder={
                  mode === 'opening-balance'
                    ? t.initialBalancePlaceholder
                    : mode === 'bank-withdrawal'
                    ? activePeriodMode === 'cycle'
                      ? t.defaultReturnMemoCycle
                      : t.defaultReturnMemoMonth
                    : t.description
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer Actions - Stacked on Mobile, Inline on Desktop */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer text-center ${
                mode === 'bank-withdrawal'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {mode === 'bank-withdrawal' ? (
                <RotateCw className="w-4 h-4 shrink-0" />
              ) : (
                <Check className="w-4 h-4 shrink-0" />
              )}
              <span className="break-words">
                {isSubmitting ? t.loading : mode === 'bank-withdrawal' ? t.confirmReturn : t.save}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 3. Bank Target / Goal Creation & Edit Modal
// ==========================================
export interface BankTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currency?: Currency;
  editingTarget?: BankTarget | null;
  unallocatedBalance: number;
  onSaveTarget: (target: BankTarget) => Promise<void>;
}

const AVAILABLE_ICONS = [
  { name: 'Target', label: 'Goal' },
  { name: 'Shield', label: 'Safety' },
  { name: 'Plane', label: 'Travel' },
  { name: 'Laptop', label: 'Tech' },
  { name: 'Car', label: 'Vehicle' },
  { name: 'Home', label: 'Home' },
  { name: 'GraduationCap', label: 'Study' },
  { name: 'Heart', label: 'Health' },
  { name: 'Sparkles', label: 'Special' },
];

export const BankTargetModal: React.FC<BankTargetModalProps> = ({
  isOpen,
  onClose,
  lang,
  currency,
  editingTarget,
  unallocatedBalance,
  onSaveTarget,
}) => {
  const t = translations[lang] || translations.en;
  const currencySymbol = getCurrencySymbol(currency);

  const [name, setName] = useState<string>(() => editingTarget?.name || '');
  const [targetAmount, setTargetAmount] = useState<string>(() =>
    editingTarget ? editingTarget.targetAmount.toString() : ''
  );
  const [allocatedAmount, setAllocatedAmount] = useState<string>(() =>
    editingTarget ? editingTarget.allocatedAmount.toString() : '0'
  );
  const [targetDate, setTargetDate] = useState<string>(() => editingTarget?.targetDate || '');
  const [selectedIcon, setSelectedIcon] = useState<string>(() => editingTarget?.icon || 'Target');
  const [accent, setAccent] = useState<string>(() => editingTarget?.accent || 'emerald');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const maxAvailableAllocation = editingTarget
    ? unallocatedBalance + editingTarget.allocatedAmount
    : unallocatedBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetAmountNum = parseFloat(targetAmount);
    if (isNaN(targetAmountNum) || targetAmountNum <= 0) {
      setErrorMsg(t.validTargetAmountError);
      return;
    }

    const allocNum = parseFloat(allocatedAmount) || 0;
    if (allocNum < 0) {
      setErrorMsg(t.allocatedNegativeError);
      return;
    }

    if (allocNum > maxAvailableAllocation) {
      setErrorMsg(
        t.cannotAllocateMoreThanUnallocated.replace('{amount}', formatEUR(maxAvailableAllocation))
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = editingTarget?.id || `target_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const target: BankTarget = {
        id: targetId,
        name: name.trim(),
        targetAmount: round2(targetAmountNum),
        allocatedAmount: round2(allocNum),
        targetDate: targetDate || undefined,
        icon: selectedIcon,
        accent,
        active: editingTarget ? editingTarget.active : true,
        completed: allocNum >= targetAmountNum,
        createdAt: editingTarget?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await onSaveTarget(target);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || t.failedToSaveGoal);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-[calc(100vw-24px)] sm:max-w-md max-h-[calc(100dvh-24px)] flex flex-col shadow-2xl overflow-hidden">
        {/* Header - Fixed & Accessible */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight break-words">
                {editingTarget ? t.editTarget : t.newSavingsTarget}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {t.earmarkedAcrossSavingsPots}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeModal}
            className="p-2 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs sm:text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-words">{errorMsg}</span>
              </div>
            )}

            {/* Goal Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.targetName}
              </label>
              <input
                type="text"
                placeholder={t.savingsGoalPlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={64}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Target Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.targetAmount} ({currencySymbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="1000.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-4 rtl:pl-4 rtl:pr-8 py-2.5 min-h-[44px] rounded-xl font-bold font-mono text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>
            </div>

            {/* Initial Allocated Amount */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.targetAllocated} ({currencySymbol})
                </label>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {t.available}: {formatEUR(maxAvailableAllocation)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxAvailableAllocation}
                  placeholder="0.00"
                  value={allocatedAmount}
                  onChange={(e) => setAllocatedAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 min-h-[44px] rounded-xl font-mono text-sm sm:text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.targetDate}
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {/* Icon Selector - 3 cols on mobile, 5 on desktop */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.category}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-2.5">
                {AVAILABLE_ICONS.map((ico) => {
                  const isSelected = selectedIcon === ico.name;
                  return (
                    <button
                      key={ico.name}
                      type="button"
                      onClick={() => setSelectedIcon(ico.name)}
                      className={`p-2.5 min-h-[52px] rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {ico.name === 'Target' && <Target className="w-5 h-5 shrink-0" />}
                      {ico.name === 'Shield' && <Shield className="w-5 h-5 shrink-0" />}
                      {ico.name === 'Plane' && <Plane className="w-5 h-5 shrink-0" />}
                      {ico.name === 'Laptop' && <Laptop className="w-5 h-5 shrink-0" />}
                      {ico.name === 'Car' && <Car className="w-5 h-5 shrink-0" />}
                      {ico.name === 'Home' && <Home className="w-5 h-5 shrink-0" />}
                      {ico.name === 'GraduationCap' && <GraduationCap className="w-5 h-5 shrink-0" />}
                      {ico.name === 'Heart' && <Heart className="w-5 h-5 shrink-0" />}
                      {ico.name === 'Sparkles' && <Sparkles className="w-5 h-5 shrink-0" />}
                      <span className="text-[11px] font-medium break-words text-center leading-tight">
                        {ico.name === 'Target'
                          ? t.iconGeneral
                          : ico.name === 'Shield'
                          ? t.iconSafety
                          : ico.name === 'Plane'
                          ? t.iconTravel
                          : ico.name === 'Laptop'
                          ? t.iconTech
                          : ico.name === 'Car'
                          ? t.iconVehicle
                          : ico.name === 'Home'
                          ? t.iconHome
                          : ico.name === 'GraduationCap'
                          ? t.iconStudy
                          : ico.name === 'Heart'
                          ? t.iconHealth
                          : t.iconSpecial}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Accent */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.colorAccent}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {['emerald', 'blue', 'purple', 'amber', 'rose', 'cyan'].map((col) => {
                  const isSelected = accent === col;
                  const colClasses: Record<string, string> = {
                    emerald: 'bg-emerald-500',
                    blue: 'bg-blue-500',
                    purple: 'bg-purple-500',
                    amber: 'bg-amber-500',
                    rose: 'bg-rose-500',
                    cyan: 'bg-cyan-500',
                  };
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAccent(col)}
                      aria-label={t.selectColorAccentAria.replace('{color}', col)}
                      className={`w-9 h-9 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        colClasses[col]
                      } ${isSelected ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110 shadow-sm' : 'opacity-85 hover:opacity-100 hover:scale-105'}`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions - Stacked on Mobile, Inline on Desktop */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span className="break-words">{isSubmitting ? t.loading : t.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 4. Adjust Target Funds Modal (Add / Release)
// ==========================================
export interface AdjustTargetFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currency?: Currency;
  target: BankTarget;
  unallocatedBalance: number;
  onUpdateTarget: (updatedTarget: BankTarget) => Promise<void>;
}

export const AdjustTargetFundsModal: React.FC<AdjustTargetFundsModalProps> = ({
  isOpen,
  onClose,
  lang,
  currency,
  target,
  unallocatedBalance,
  onUpdateTarget,
}) => {
  const t = translations[lang] || translations.en;
  const currencySymbol = getCurrencySymbol(currency);
  const [action, setAction] = useState<'add' | 'release'>('add');
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const maxAdd = unallocatedBalance;
  const maxRelease = target.allocatedAmount;

  const handleQuickAmount = (val: number) => {
    setAmount(val.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg(t.validAmountError);
      return;
    }

    if (action === 'add' && amountNum > maxAdd) {
      setErrorMsg(t.cannotAddMoreThanUnallocated.replace('{amount}', formatEUR(maxAdd)));
      return;
    }

    if (action === 'release' && amountNum > maxRelease) {
      setErrorMsg(t.cannotReleaseMoreThanAllocated.replace('{amount}', formatEUR(maxRelease)));
      return;
    }

    const newAllocated =
      action === 'add'
        ? round2(target.allocatedAmount + amountNum)
        : round2(Math.max(0, target.allocatedAmount - amountNum));

    setIsSubmitting(true);
    try {
      const updated: BankTarget = {
        ...target,
        allocatedAmount: newAllocated,
        completed: newAllocated >= target.targetAmount,
        updatedAt: Date.now(),
      };

      await onUpdateTarget(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || t.failedToAdjustFunds);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-[calc(100vw-24px)] sm:max-w-md max-h-[calc(100dvh-24px)] flex flex-col shadow-2xl overflow-hidden">
        {/* Header - Fixed & Accessible */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0 gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight break-words">
              {t.adjustGoalFundsTitle.replace('{name}', target.name)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words font-mono">
              {t.goalAllocatedRatio
                .replace('{allocated}', formatEUR(target.allocatedAmount))
                .replace('{target}', formatEUR(target.targetAmount))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeModal}
            className="p-2 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs sm:text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-words">{errorMsg}</span>
              </div>
            )}

            {/* Action toggle (Add vs Release) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAction('add');
                  setAmount('');
                }}
                className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer flex items-center justify-center text-center ${
                  action === 'add'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                + {t.addFundsToTarget}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAction('release');
                  setAmount('');
                }}
                className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer flex items-center justify-center text-center ${
                  action === 'release'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                - {t.withdrawFromTarget}
              </button>
            </div>

            {/* Max available display */}
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 break-words">
              {action === 'add'
                ? t.availableInUnallocated.replace('{amount}', formatEUR(maxAdd))
                : t.currentlyAllocatedInGoal.replace('{amount}', formatEUR(maxRelease))}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.amount} ({currencySymbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={action === 'add' ? maxAdd : maxRelease}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-4 rtl:pl-4 rtl:pr-8 py-2.5 min-h-[44px] rounded-xl font-bold font-mono text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {[50, 100, 250].map((val) => {
                const max = action === 'add' ? maxAdd : maxRelease;
                if (val > max) return null;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    className="px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {getCurrencySymbol(currency)}{val}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleQuickAmount(action === 'add' ? maxAdd : maxRelease)}
                className="px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors cursor-pointer ml-auto"
              >
                {t.all} ({formatEUR(action === 'add' ? maxAdd : maxRelease)})
              </button>
            </div>
          </div>

          {/* Footer Actions - Stacked on Mobile, Inline on Desktop */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span className="break-words">{isSubmitting ? t.loading : t.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
