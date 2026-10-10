import React, { useState } from 'react';
import { Expense } from '../types/finance';
import { formatEUR } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';
import {
  Lock,
  Repeat,
  Plus,
  Trash2,
  ArrowRightCircle,
  CheckCircle2,
  Pencil,
} from 'lucide-react';

interface FixedExpensesModalProps {
  expenses: Expense[];
  selectedYear: number;
  selectedMonth: number;
  onPropagateToMonth: (targetYear: number, targetMonth: number) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onOpenAddExpense: () => void;
  lang: Language;
}

export const FixedExpensesView: React.FC<FixedExpensesModalProps> = ({
  expenses,
  selectedYear,
  selectedMonth,
  onPropagateToMonth,
  onEditExpense,
  onDeleteExpense,
  onOpenAddExpense,
  lang,
}) => {
  const t = translations[lang];
  const [copySuccess, setCopySuccess] = useState(false);

  // Filter fixed expenses for current selected month
  const fixedExpenses = expenses.filter(
    (e) =>
      e.year === selectedYear &&
      e.month === selectedMonth &&
      (e.type === 'fixed' || e.isRecurring)
  );

  const totalFixed = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleCopyNextMonth = () => {
    let nextMonth = selectedMonth + 1;
    let nextYear = selectedYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    onPropagateToMonth(nextYear, nextMonth);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Monthly Fixed Obligations Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title, Icon, and Context */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
              {t.fixedObligations} ({selectedMonth}/{selectedYear})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {t.predictableCommitmentsDesc}
            </p>
          </div>
        </div>

        {/* Amount & CTA: Stacks cleanly on mobile, side-by-side on tablet/desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {t.fixedExpensesLabel} {t.total}
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
              {formatEUR(totalFixed)}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenAddExpense}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">{t.addFixedExpense}</span>
          </button>
        </div>
      </div>

      {/* Propagate to Next Month Action: Automatic Recurring Roll-Forward */}
      <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <Repeat className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
            <span className="font-semibold">{t.automaticRecurringRollForward}</span>{' '}
            {t.rollForwardDesc
              .replace('{count}', fixedExpenses.length.toString())
              .replace(
                '{targetPeriod}',
                `${selectedMonth === 12 ? 1 : selectedMonth + 1}/${selectedMonth === 12 ? selectedYear + 1 : selectedYear}`
              )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyNextMonth}
          disabled={fixedExpenses.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          {copySuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t.copied}</span>
            </>
          ) : (
            <>
              <ArrowRightCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{t.propagateToNextMonth}</span>
            </>
          )}
        </button>
      </div>

      {/* List of Fixed Commitments: Responsive Stacked Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {fixedExpenses.length === 0 ? (
          <div className="col-span-1 md:col-span-2 py-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
            {t.noFixedExpensesMonth}
          </div>
        ) : (
          fixedExpenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* ROW 1: Expense Icon, Name & Amount Aligned to Right */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-2xs border border-blue-100/60 dark:border-blue-900/60">
                    {exp.store ? exp.store.slice(0, 2).toUpperCase() : 'FE'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {exp.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {exp.store}
                    </p>
                  </div>
                </div>

                {/* Amount: Prominent, tabular nums, right-aligned, never overlaps name */}
                <div className="text-right shrink-0">
                  <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {formatEUR(exp.amount)}
                  </span>
                </div>
              </div>

              {/* ROW 2: Store / Provider Name, Date, and Description Details */}
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {exp.store}
                  </span>
                  <span>·</span>
                  <span>{exp.date}</span>
                </div>
                {exp.notes && (
                  <p className="text-slate-600 dark:text-slate-300 text-xs break-words leading-relaxed">
                    {exp.notes}
                  </p>
                )}
              </div>

              {/* ROW 3 & 4: Recurring Status (Left) and Icon-Only Edit & Delete Actions (Right) */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 gap-2">
                {/* Recurring Status */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {exp.isRecurring ? (
                    <>
                      <Repeat className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.recurringMonthly}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.fixedBadge}</span>
                    </>
                  )}
                </div>

                {/* Edit and Delete Actions: Icons ONLY on ALL screen sizes */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditExpense(exp)}
                    aria-label={t.editFixedExpense}
                    title={t.editFixedExpense}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteExpense(exp.id)}
                    aria-label={t.deleteFixedExpense}
                    title={t.deleteFixedExpense}
                    className="w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-colors border border-rose-200/80 dark:border-rose-900/80 shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
