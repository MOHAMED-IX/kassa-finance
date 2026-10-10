import React, { useState, useEffect } from 'react';
import { SpendingCycle, Currency } from '../types/finance';
import { Language, translations } from '../utils/i18n';
import {
  getPreviousDayString,
  formatDateReadable,
  round2,
  formatEUR,
  getCurrencySymbol,
} from '../utils/formatters';
import { validateNewCycle, getTodayISO } from '../utils/periodAbstraction';
import {
  Calendar,
  Wallet,
  FileText,
  AlertTriangle,
  RotateCw,
  X,
  Check,
  ArrowRight,
  ShieldCheck,
  Info,
  Sparkles,
} from 'lucide-react';

interface StartCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCycle: (params: {
    startDate: string;
    income?: number | null;
    expectedNextCycleIncome?: number | null;
    notes?: string;
  }) => Promise<void> | void;
  onUpdateCycle?: (cycle: SpendingCycle) => Promise<void> | void;
  activeCycle?: SpendingCycle | null;
  editingCycle?: SpendingCycle | null;
  cycles?: SpendingCycle[];
  lang: Language;
  currency?: Currency;
}

export const StartCycleModal: React.FC<StartCycleModalProps> = ({
  isOpen,
  onClose,
  onStartCycle,
  onUpdateCycle,
  activeCycle,
  editingCycle,
  cycles = [],
  lang,
  currency,
}) => {
  const t = translations[lang];

  const isEditing = Boolean(editingCycle);

  const [startDate, setStartDate] = useState<string>(getTodayISO());
  const [endDate, setEndDate] = useState<string>('');
  const [income, setIncome] = useState<string>('');
  const [useAsExpectedNextCycle, setUseAsExpectedNextCycle] = useState<boolean>(false);
  const [expectedNextCycleIncome, setExpectedNextCycleIncome] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize form on modal open
  useEffect(() => {
    if (isOpen) {
      if (editingCycle) {
        setStartDate(editingCycle.startDate || getTodayISO());
        setEndDate(editingCycle.endDate || '');
        setIncome(
          editingCycle.income !== undefined && editingCycle.income !== null
            ? editingCycle.income.toString()
            : ''
        );
        if (
          editingCycle.expectedNextCycleIncome !== undefined &&
          editingCycle.expectedNextCycleIncome !== null
        ) {
          setUseAsExpectedNextCycle(true);
          setExpectedNextCycleIncome(editingCycle.expectedNextCycleIncome.toString());
        } else {
          setUseAsExpectedNextCycle(false);
          setExpectedNextCycleIncome('');
        }
        setNotes(editingCycle.notes || '');
      } else {
        setStartDate(getTodayISO());
        setEndDate('');
        setIncome('');
        setUseAsExpectedNextCycle(false);
        setExpectedNextCycleIncome('');
        setNotes('');
      }
      setIsConfirming(false);
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen, editingCycle]);

  if (!isOpen) return null;

  // Calculate closure date for active cycle if starting a new cycle
  const previousCycleToClose =
    !isEditing && activeCycle && activeCycle.startDate !== startDate
      ? activeCycle
      : null;

  // Check if previous cycle had an expected next cycle income
  const inheritedExpectedIncome = (() => {
    if (isEditing) return null;
    if (previousCycleToClose && typeof previousCycleToClose.expectedNextCycleIncome === 'number') {
      return previousCycleToClose.expectedNextCycleIncome;
    }
    const completed = cycles
      .filter((c) => typeof c.expectedNextCycleIncome === 'number' && c.expectedNextCycleIncome! > 0)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
    if (completed.length > 0) {
      return completed[0].expectedNextCycleIncome!;
    }
    return null;
  })();

  const calculatedPrevEndDate = previousCycleToClose
    ? getPreviousDayString(startDate)
    : null;

  const handleValidateAndProceed = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valResult = validateNewCycle(startDate, cycles, editingCycle?.id);
    if (!valResult.isValid) {
      setError(valResult.error || t.selectValidStartDateError);
      return;
    }

    if (isEditing && endDate && endDate < startDate) {
      setError(t.endDateBeforeStartDateError);
      return;
    }

    if (income && income.trim()) {
      const parsedIncome = parseFloat(income);
      if (isNaN(parsedIncome) || parsedIncome < 0) {
        setError(t.validPositiveIncomeError);
        return;
      }
    }

    if (useAsExpectedNextCycle && expectedNextCycleIncome.trim()) {
      const parsedExpected = parseFloat(expectedNextCycleIncome);
      if (isNaN(parsedExpected) || parsedExpected < 0) {
        setError(t.validPositiveExpectedIncomeError);
        return;
      }
    }

    // If starting a new cycle and an active cycle exists, show explicit confirmation dialog first
    if (!isEditing && (valResult.previousCycleToClose || previousCycleToClose)) {
      setIsConfirming(true);
      return;
    }

    // Otherwise submit directly
    executeSubmit();
  };

  const executeSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const parsedIncome =
        income.trim() !== '' ? round2(parseFloat(income)) : null;
      const parsedExpected =
        useAsExpectedNextCycle && expectedNextCycleIncome.trim() !== ''
          ? round2(parseFloat(expectedNextCycleIncome))
          : useAsExpectedNextCycle && parsedIncome !== null
          ? parsedIncome
          : null;
      const cleanNotes = notes.trim() !== '' ? notes.trim() : undefined;

      if (isEditing && editingCycle && onUpdateCycle) {
        await onUpdateCycle({
          ...editingCycle,
          startDate,
          endDate: endDate.trim() !== '' ? endDate : null,
          income: parsedIncome,
          expectedNextCycleIncome: parsedExpected,
          notes: cleanNotes,
        });
      } else {
        await onStartCycle({
          startDate,
          income: parsedIncome,
          expectedNextCycleIncome: parsedExpected,
          notes: cleanNotes,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || t.failedToSaveCycle);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-hidden">
      <div
        className="w-full max-w-[calc(100vw-24px)] sm:max-w-lg max-h-[calc(100dvh-24px)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <RotateCw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {isEditing ? t.editCycle : t.startNewCycle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isEditing
                  ? t.spendingCycle
                  : t.startFirstCycle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isConfirming ? (
            /* Confirmation step before closing previous cycle and starting new cycle */
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{t.confirmStartCycleTitle}</span>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                  {t.confirmStartCycleDesc
                    .replace('{startDate}', formatDateReadable(startDate, lang))
                    .replace(
                      '{endDate}',
                      calculatedPrevEndDate
                        ? formatDateReadable(calculatedPrevEndDate, lang)
                        : ''
                    )}
                </p>

                {previousCycleToClose && calculatedPrevEndDate && (
                  <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1.5 font-mono">
                    <div className="text-slate-500 dark:text-slate-400">
                      {t.previousActiveCycleColon}
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>{formatDateReadable(previousCycleToClose.startDate, lang)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        {formatDateReadable(calculatedPrevEndDate, lang)} {t.closedBadge}
                      </span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 pt-1">
                      {t.newActiveCycleColon}
                    </div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <span>{formatDateReadable(startDate, lang)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.ongoing}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40">
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={executeSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50 text-center"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                  )}
                  <span className="break-words">{t.confirmAndStartCycle}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Input Form */
            <form onSubmit={handleValidateAndProceed} className="space-y-4">
              {/* Start Date Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.cycleStartDate}</span>
                    <span className="text-rose-500">*</span>
                  </div>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {t.selectSalaryDateHint}
                </p>
              </div>

              {/* End Date Input (Only when editing a past or closed cycle) */}
              {isEditing && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t.cycleEndDateOptionalHint}</span>
                    </div>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              )}

              {/* Previous cycle closure notice */}
              {!isEditing && previousCycleToClose && calculatedPrevEndDate && (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                  <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-semibold">{t.automaticCycleRollover}</div>
                    <div className="text-[11px] opacity-90">
                      {t.closePreviousCycleInfo
                        .replace('{prevStart}', formatDateReadable(previousCycleToClose.startDate, lang))
                        .replace('{prevEnd}', formatDateReadable(calculatedPrevEndDate, lang))}
                    </div>
                  </div>
                </div>
              )}

              {/* Cycle Income Input (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5 sm:mb-3">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="break-words">{t.cycleIncomeOptional}</span>
                  </div>
                </label>

                {/* Optional inherited expected income prompt from previous cycle */}
                {inheritedExpectedIncome !== null && (
                  <div className="mb-4 sm:mb-5 p-3.5 sm:p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 transition-all">
                    <div className="space-y-1.5 min-w-0">
                      {/* Row 1: icon + "Expected from previous cycle" text */}
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-blue-900/90 dark:text-blue-200/90">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="break-words leading-tight">
                          {t.expectedFromPreviousCycle.replace(': {amount}', '').replace('{amount}', '').trim()}
                        </span>
                      </div>

                      {/* Row 2: large readable amount */}
                      <div className="text-xl sm:text-2xl font-extrabold font-mono text-blue-700 dark:text-blue-300 tabular-nums break-words pl-6 rtl:pr-6 rtl:pl-0">
                        {formatEUR(inheritedExpectedIncome)}
                      </div>
                    </div>

                    {/* Row 3 on mobile: full-width button; inline on desktop */}
                    <button
                      type="button"
                      onClick={() => {
                        const valStr = inheritedExpectedIncome.toFixed(2);
                        setIncome(valStr);
                        // If user hasn't explicitly set a divergent expected income, sync it
                        if (useAsExpectedNextCycle && (!expectedNextCycleIncome || expectedNextCycleIncome === income)) {
                          setExpectedNextCycleIncome(valStr);
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer shadow-xs shadow-blue-600/20 flex items-center justify-center gap-2 text-center"
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span className="break-words">{t.useExpectedIncome}</span>
                    </button>
                  </div>
                )}

                {/* Actual Cycle Income Input - 100% available width */}
                <div className="relative w-full">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t.cycleIncomePlaceholder}
                    value={income}
                    onChange={(e) => {
                      const newInc = e.target.value;
                      setIncome(newInc);
                      // If user hasn't explicitly set a divergent expected income, sync it
                      if (useAsExpectedNextCycle && (!expectedNextCycleIncome || expectedNextCycleIncome === income)) {
                        setExpectedNextCycleIncome(newInc);
                      }
                    }}
                    className="w-full pl-3.5 pr-10 rtl:pr-3.5 rtl:pl-10 py-2.5 min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3.5 rtl:right-auto rtl:left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-slate-400 pointer-events-none select-none">
                    {getCurrencySymbol(currency)}
                  </span>
                </div>
                <p className="mt-2 sm:mt-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words whitespace-normal">
                  {t.totalSalaryAllocatedHint}
                </p>
              </div>

              {/* Notes Input (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.cycleNotesOptional}</span>
                  </div>
                </label>
                <input
                  type="text"
                  placeholder={t.cycleNotesPlaceholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={200}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>

              {/* Optional Planning Section: Expected Income for Next Cycle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800/60 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="useExpectedIncomeCheckbox"
                      checked={useAsExpectedNextCycle}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseAsExpectedNextCycle(checked);
                        if (checked && !expectedNextCycleIncome && income) {
                          setExpectedNextCycleIncome(income);
                        }
                      }}
                      className="mt-0.5 w-4 h-4 text-emerald-600 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md focus:ring-emerald-500 cursor-pointer"
                    />
                    <label
                      htmlFor="useExpectedIncomeCheckbox"
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none leading-relaxed"
                    >
                      {t.useIncomeAsExpectedNextCycle}
                    </label>
                  </div>

                  {useAsExpectedNextCycle && (
                    <div className="pt-1.5 pl-6 space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {t.expectedNextCycleIncome}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={income || '0.00'}
                          value={expectedNextCycleIncome}
                          onChange={(e) => setExpectedNextCycleIncome(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        />
                        <span className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          {getCurrencySymbol(currency)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {t.expectedNextCycleDesc}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - Stacked on Mobile, Inline on Desktop */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50 text-center"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 shrink-0" />
                  )}
                  <span className="break-words">
                    {isEditing
                      ? t.save
                      : previousCycleToClose
                      ? t.reviewAndStartCycle
                      : t.startNewCycle}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
