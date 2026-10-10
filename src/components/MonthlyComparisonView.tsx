import React, { useState, useMemo, useEffect } from 'react';
import { Category, MonthComparisonItem, CycleComparisonItem, PeriodMode, BankTransaction } from '../types/finance';
import { formatEUR, MONTH_NAMES_AR, MONTH_NAMES_DE, MONTH_NAMES_EN } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  RotateCw,
  Sparkles,
  CheckCircle2,
  PiggyBank,
  AlertTriangle,
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface MonthlyComparisonViewProps {
  comparisonData: MonthComparisonItem[];
  categories: Category[];
  selectedYear: number;
  selectedMonth?: number;
  onSelectMonth: (month: number) => void;
  onOpenInDashboard?: (month: number) => void;
  lang: Language;
  periodMode?: PeriodMode;
  cycleComparisonData?: CycleComparisonItem[];
  selectedCycleId?: string | null;
  onSelectCycle?: (cycleId: string) => void;
  onOpenCycleInDashboard?: (cycleId: string) => void;
  onTogglePeriodMode?: (mode: PeriodMode) => void;
  bankTransactions?: BankTransaction[];
  onOpenTransferSaving?: (periodMode: 'month' | 'cycle', periodId: string) => void;
}

export const MonthlyComparisonView: React.FC<MonthlyComparisonViewProps> = ({
  comparisonData,
  categories,
  selectedYear,
  selectedMonth,
  onSelectMonth,
  onOpenInDashboard,
  lang,
  periodMode = 'month',
  cycleComparisonData = [],
  selectedCycleId,
  onSelectCycle,
  onOpenCycleInDashboard,
  onTogglePeriodMode,
  bankTransactions = [],
  onOpenTransferSaving,
}) => {
  const t = translations[lang];

  // ================= CALENDAR MONTH MODE DATA =================
  const activeMonths = useMemo(() => {
    return comparisonData.filter((m) => m.income > 0 || m.totalExpenses > 0);
  }, [comparisonData]);

  // Synchronized state for selected calendar month
  const initialMonth = useMemo(() => {
    if (typeof selectedMonth === 'number' && selectedMonth >= 1 && selectedMonth <= 12) {
      return selectedMonth;
    }
    if (activeMonths.length > 0) {
      return activeMonths[activeMonths.length - 1].month;
    }
    return new Date().getMonth() + 1;
  }, [selectedMonth, activeMonths]);

  const [localSelectedMonth, setLocalSelectedMonth] = useState<number>(initialMonth);

  // Synchronize local selection whenever parent selectedMonth changes (e.g. from MonthYearSelector)
  useEffect(() => {
    if (typeof selectedMonth === 'number' && selectedMonth >= 1 && selectedMonth <= 12) {
      setLocalSelectedMonth(selectedMonth);
    }
  }, [selectedMonth]);

  const effectiveSelectedMonth =
    typeof selectedMonth === 'number' && selectedMonth >= 1 && selectedMonth <= 12
      ? selectedMonth
      : localSelectedMonth;

  // Maximum value for scaling calendar chart bars
  const maxMonthBarValue = useMemo(() => {
    let max = 1000;
    activeMonths.forEach((m) => {
      if (m.income > max) max = m.income;
      if (m.totalExpenses > max) max = m.totalExpenses;
      const savings = m.actualSavings || 0;
      if (savings > max) max = savings;
    });
    return max * 1.15;
  }, [activeMonths]);

  // Authoritative inspected month data: always strictly matches effectiveSelectedMonth, never falling back to October
  const inspectedMonthData = useMemo(() => {
    const match = comparisonData.find(
      (m) => m.month === effectiveSelectedMonth && (m.year === undefined || m.year === selectedYear)
    );
    if (match) return match;

    const mIndex = Math.max(0, Math.min(11, effectiveSelectedMonth - 1));
    return {
      year: selectedYear,
      month: effectiveSelectedMonth,
      monthName: MONTH_NAMES_EN[mIndex] || `Month ${effectiveSelectedMonth}`,
      income: 0,
      totalExpenses: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      unspentIncome: 0,
      remainingMoney: 0,
      availableSpendingBalance: 0,
      actualSavings: 0,
      grossTransfers: 0,
      grossReturns: 0,
      categoryTotals: {},
    };
  }, [comparisonData, effectiveSelectedMonth, selectedYear]);

  // Chart displayed months: includes active months plus currently selected month if it has 0 activity
  const chartMonths = useMemo(() => {
    if (activeMonths.length === 0) {
      const selectedDatum = comparisonData.find((m) => m.month === effectiveSelectedMonth);
      return selectedDatum ? [selectedDatum] : [];
    }
    if (!activeMonths.some((m) => m.month === effectiveSelectedMonth)) {
      const selectedDatum = comparisonData.find((m) => m.month === effectiveSelectedMonth);
      if (selectedDatum) {
        return [...activeMonths, selectedDatum].sort((a, b) => a.month - b.month);
      }
    }
    return activeMonths;
  }, [activeMonths, comparisonData, effectiveSelectedMonth]);

  const handleMonthClick = (m: number) => {
    setLocalSelectedMonth(m);
    onSelectMonth?.(m);
  };

  const handleOpenMonthInDashboard = (m: number) => {
    if (onOpenInDashboard) {
      onOpenInDashboard(m);
    } else if (onSelectMonth) {
      onSelectMonth(m);
    }
  };

  // ================= SPENDING CYCLE MODE DATA =================
  const activeCycles = useMemo(() => {
    return cycleComparisonData.filter(
      (c) => c.income > 0 || c.totalExpenses > 0 || c.isOngoing
    );
  }, [cycleComparisonData]);

  const initialCycleId = useMemo(() => {
    if (selectedCycleId && activeCycles.some((c) => c.cycleId === selectedCycleId)) {
      return selectedCycleId;
    }
    return activeCycles[activeCycles.length - 1]?.cycleId || null;
  }, [selectedCycleId, activeCycles]);

  const [localSelectedCycleId, setLocalSelectedCycleId] = useState<string | null>(initialCycleId);

  useEffect(() => {
    if (selectedCycleId) {
      setLocalSelectedCycleId(selectedCycleId);
    }
  }, [selectedCycleId]);

  const effectiveSelectedCycleId = selectedCycleId || localSelectedCycleId;

  const maxCycleBarValue = useMemo(() => {
    let max = 1000;
    activeCycles.forEach((c) => {
      if (c.income > max) max = c.income;
      if (c.totalExpenses > max) max = c.totalExpenses;
      const savings = c.actualSavings || 0;
      if (savings > max) max = savings;
    });
    return max * 1.15;
  }, [activeCycles]);

  const inspectedCycleData = useMemo(() => {
    if (effectiveSelectedCycleId) {
      const match =
        cycleComparisonData.find((c) => c.cycleId === effectiveSelectedCycleId) ||
        activeCycles.find((c) => c.cycleId === effectiveSelectedCycleId);
      if (match) return match;
    }
    return activeCycles[activeCycles.length - 1] || null;
  }, [effectiveSelectedCycleId, cycleComparisonData, activeCycles]);

  const handleCycleClick = (cycleId: string) => {
    setLocalSelectedCycleId(cycleId);
    onSelectCycle?.(cycleId);
  };

  const handleOpenCycleInDashboard = (cycleId: string) => {
    if (onOpenCycleInDashboard) {
      onOpenCycleInDashboard(cycleId);
    } else if (onSelectCycle) {
      onSelectCycle(cycleId);
    }
  };

  const isCycleMode = periodMode === 'cycle';

  const getLocalizedMonthName = (monthNum: number, originalName: string) => {
    const months = lang === 'ar' ? MONTH_NAMES_AR : lang === 'de' ? MONTH_NAMES_DE : MONTH_NAMES_EN;
    return months[monthNum - 1] || originalName;
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Top Header Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
            {isCycleMode ? <RotateCw className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] truncate">
                {t.comparison} {isCycleMode ? `· ${t.spendingCycles}` : `· ${selectedYear}`}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate sm:whitespace-normal">
              {t.periodAnalysisDesc || (isCycleMode ? t.cycleComparisonSubtitle : t.monthComparisonSubtitle)}
            </p>
          </div>
        </div>

        {/* Right Info: Mode Switcher & Counter */}
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
          {onTogglePeriodMode && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => onTogglePeriodMode('month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !isCycleMode
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.calendarMonth}
              </button>
              <button
                type="button"
                onClick={() => onTogglePeriodMode('cycle')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isCycleMode
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.spendingCycle}
              </button>
            </div>
          )}

          <div className="text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {isCycleMode ? t.recordedCycles : t.activeMonths}
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {isCycleMode ? activeCycles.length : activeMonths.length}
            </span>
          </div>
        </div>
      </div>

      {/* ================= SPENDING CYCLE COMPARISON VIEW ================= */}
      {isCycleMode ? (
        <>
          {/* Visual Chart Card */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {t.cycleTrajectoryTitle}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:hidden">
                  {t.tapAnyCycleBarToInspect}
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-slate-300 dark:bg-slate-700 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
                    {t.cycleIncome}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-rose-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
                    {t.totalExpenses}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-emerald-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
                    {t.netActualSavings}
                  </span>
                </div>
              </div>
            </div>

            {activeCycles.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                <Sparkles className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-60" />
                <span>{t.noCyclesRecordedCompare}</span>
              </div>
            ) : (
              <div className="w-full space-y-3">
                {/* Bar Chart Container */}
                <div className="relative w-full h-56 sm:h-64 flex items-end justify-around gap-1 sm:gap-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  {activeCycles.map((c) => {
                    const incomeHeight = Math.min(
                      100,
                      Math.max(4, (c.income / maxCycleBarValue) * 100)
                    );
                    const expenseHeight = Math.min(
                      100,
                      Math.max(4, (c.totalExpenses / maxCycleBarValue) * 100)
                    );
                    const savingsHeight = Math.min(
                      100,
                      Math.max(0, (Math.max(0, c.actualSavings || 0) / maxCycleBarValue) * 100)
                    );
                    const isSelected = effectiveSelectedCycleId === c.cycleId;

                    return (
                      <div
                        key={c.cycleId}
                        onClick={() => handleCycleClick(c.cycleId)}
                        onDoubleClick={() => handleOpenCycleInDashboard(c.cycleId)}
                        className={`flex-1 flex flex-col items-center gap-1.5 max-w-[110px] cursor-pointer group transition-transform ${
                          isSelected ? 'scale-105' : 'hover:scale-102'
                        }`}
                      >
                        {/* Bars Group */}
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-40 sm:h-48 px-0.5">
                          {/* Income Bar */}
                          <div
                            style={{ height: `${incomeHeight}%` }}
                            className={`w-2 sm:w-3.5 bg-slate-300 dark:bg-slate-700 rounded-t-xs sm:rounded-t-sm transition-all ${
                              isSelected ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900' : 'group-hover:opacity-90'
                            }`}
                            title={t.incomeTooltip.replace('{amount}', formatEUR(c.income))}
                          />
                          {/* Expenses Bar */}
                          <div
                            style={{ height: `${expenseHeight}%` }}
                            className={`w-2 sm:w-3.5 bg-rose-500 rounded-t-xs sm:rounded-t-sm transition-all ${
                              isSelected ? 'ring-2 ring-rose-500 ring-offset-1 dark:ring-offset-slate-900' : 'group-hover:opacity-90'
                            }`}
                            title={t.expensesTooltip.replace('{amount}', formatEUR(c.totalExpenses))}
                          />
                          {/* Net Actual Savings Bar */}
                          <div
                            style={{ height: `${savingsHeight}%` }}
                            className={`w-2 sm:w-3.5 bg-emerald-500 rounded-t-xs sm:rounded-t-sm transition-all ${
                              isSelected ? 'ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-slate-900' : 'group-hover:opacity-90'
                            }`}
                            title={`${t.netActualSavings}: ${formatEUR(c.actualSavings || 0)}`}
                          />
                        </div>

                        {/* X-Axis Cycle Label */}
                        <div className="text-center w-full">
                          <span
                            className={`text-[10px] sm:text-xs font-semibold block transition-colors truncate px-1 ${
                              isSelected
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold underline decoration-2 underline-offset-4'
                                : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                            }`}
                          >
                            {c.startDate.slice(5)}
                            {c.isOngoing && ' *'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Inspected Cycle Stat Strip */}
                {inspectedCycleData && (
                  <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl sm:rounded-lg border border-slate-100 dark:border-slate-800 text-xs w-full">
                    {/* 1. Mobile Layout (<640px) */}
                    <div className="flex sm:hidden flex-col gap-3 w-full">
                      {/* Section 1 — Cycle Identity (Stacked header so badges never collide with dates) */}
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="flex items-start gap-1.5 font-bold text-slate-800 dark:text-slate-200 min-w-0 flex-1">
                            <RotateCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                              {inspectedCycleData.label}
                            </span>
                          </div>
                          {inspectedCycleData.isOngoing && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap self-start">
                              {t.activeCycle}
                            </span>
                          )}
                        </div>

                        {/* Subtitle / Notes */}
                        {inspectedCycleData.notes && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic break-words leading-relaxed pl-5">
                            {inspectedCycleData.notes}
                          </div>
                        )}
                      </div>

                      {/* Section 2 — Financial Metrics: Clean 2-column grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2.5 pb-0.5 border-t border-slate-200/70 dark:border-slate-800">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                            {t.income}
                          </span>
                          <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 tabular-nums truncate">
                            {formatEUR(inspectedCycleData.income)}
                          </span>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                            {t.expenses}
                          </span>
                          <span className="text-xs font-semibold font-mono text-rose-600 dark:text-rose-400 tabular-nums truncate">
                            {formatEUR(inspectedCycleData.totalExpenses)}
                          </span>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                            {t.netActualSavings}
                          </span>
                          <span className="text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                            {formatEUR(inspectedCycleData.actualSavings || 0)}
                          </span>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                            {t.availableSpendingBalance}
                          </span>
                          <span
                            className={`text-xs font-semibold font-mono tabular-nums truncate ${
                              inspectedCycleData.remainingMoney < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatEUR(inspectedCycleData.remainingMoney)}
                          </span>
                        </div>
                      </div>

                      {/* Section 3 — Open Dashboard */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenCycleInDashboard(inspectedCycleData.cycleId)}
                          className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>{t.openInDashboard}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </div>
                    </div>

                    {/* 2. Tablet Layout (640px–1023px) */}
                    <div className="hidden sm:flex lg:hidden flex-col gap-3 w-full">
                      {/* Row 1 — Cycle Identity */}
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 min-w-0">
                          <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-sm font-bold text-slate-900 dark:text-white leading-normal break-words">
                            {inspectedCycleData.label}
                          </span>
                        </div>
                        {inspectedCycleData.isOngoing && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
                            {t.activeCycle}
                          </span>
                        )}
                      </div>

                      {/* Row 2 — Cycle Note */}
                      {inspectedCycleData.notes && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic break-words leading-relaxed -mt-1">
                          {inspectedCycleData.notes}
                        </div>
                      )}

                      {/* Row 3 — Financial Metrics (4-column grid) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-3 pb-0.5 border-t border-slate-200/70 dark:border-slate-800">
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                            {t.income}
                          </span>
                          <span className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                            {formatEUR(inspectedCycleData.income)}
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                            {t.expenses}
                          </span>
                          <span className="text-sm font-semibold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                            {formatEUR(inspectedCycleData.totalExpenses)}
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                            {t.netActualSavings}
                          </span>
                          <span className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatEUR(inspectedCycleData.actualSavings || 0)}
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                            {t.availableSpendingBalance}
                          </span>
                          <span
                            className={`text-sm font-semibold font-mono tabular-nums ${
                              inspectedCycleData.remainingMoney < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatEUR(inspectedCycleData.remainingMoney)}
                          </span>
                        </div>
                      </div>

                      {/* Row 4 — Action */}
                      <div className="flex justify-end pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => handleOpenCycleInDashboard(inspectedCycleData.cycleId)}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1.5 font-medium cursor-pointer py-1 select-none active:opacity-75 focus:outline-hidden"
                        >
                          <span>{t.openInDashboard}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </div>
                    </div>

                    {/* 3. Desktop Layout (>=1024px): Compact horizontal presentation */}
                    <div className="hidden lg:flex items-center justify-between gap-3 text-xs w-full">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 min-w-0">
                        <RotateCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{inspectedCycleData.label}</span>
                        {inspectedCycleData.isOngoing && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider shrink-0">
                            {t.activeCycle}
                          </span>
                        )}
                        {inspectedCycleData.notes && (
                          <span className="text-slate-400 font-normal truncate max-w-[200px]" title={inspectedCycleData.notes}>
                            · {inspectedCycleData.notes}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 font-mono text-[11px] sm:text-xs shrink-0">
                        <div>
                          <span className="text-slate-400 mr-1">{t.incomeColon}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatEUR(inspectedCycleData.income)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 mr-1">{t.expensesColon}</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {formatEUR(inspectedCycleData.totalExpenses)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 mr-1">{t.netActualSavings}:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatEUR(inspectedCycleData.actualSavings || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 mr-1">{t.availableSpendingBalance}:</span>
                          <span
                            className={`font-semibold ${
                              inspectedCycleData.remainingMoney < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatEUR(inspectedCycleData.remainingMoney)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenCycleInDashboard(inspectedCycleData.cycleId)}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium shrink-0 cursor-pointer"
                      >
                        <span>{t.openInDashboard}</span>
                        <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                      </button>
                    </div>

                    {/* Negative Available Spending Balance Localized Alert */}
                    {inspectedCycleData.remainingMoney < 0 && (
                      <div className="mt-2.5 flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-[11px]">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span className="leading-snug">{t.negativeBalanceWarning}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detailed Cycle Breakdown Table */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t.detailedCycleBreakdown}
              </h3>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {t.clickCycleOpenDashboard}
              </span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5 font-semibold">{t.spendingCycle}</th>
                    <th className="py-3 px-3 font-semibold text-right">{t.income}</th>
                    <th className="py-3 px-3 font-semibold text-right">{t.totalExpenses}</th>
                    <th className="py-3 px-3 font-semibold text-right">{t.fixed}</th>
                    <th className="py-3 px-3 font-semibold text-right">{t.variable}</th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-supermarket" size="xs" />
                        <span>{t.food}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-shopping" size="xs" />
                        <span>{t.shopping}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-study" size="xs" />
                        <span>{t.study}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-transport" size="xs" />
                        <span>{t.transport}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-saving" size="xs" />
                        <span>{t.saving}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3.5 font-semibold text-right">
                      <span>{t.availableSpendingBalance}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Show newest cycle first in the table */}
                  {[...activeCycles].reverse().map((c) => {
                    const isSelected = effectiveSelectedCycleId === c.cycleId;
                    const foodTotal = c.categoryTotals['cat-supermarket'] || 0;
                    const shoppingTotal = c.categoryTotals['cat-shopping'] || 0;
                    const studyTotal = c.categoryTotals['cat-study'] || 0;
                    const transportTotal = c.categoryTotals['cat-transport'] || 0;

                    return (
                      <tr
                        key={c.cycleId}
                        onClick={() => handleCycleClick(c.cycleId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-semibold'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{c.label}</span>
                            {c.isOngoing && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider shrink-0">
                                {t.activeCycle}
                              </span>
                            )}
                          </div>
                          {c.notes && (
                            <span className="text-[11px] text-slate-400 font-normal block">
                              {c.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap">
                          {formatEUR(c.income)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          {formatEUR(c.totalExpenses)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400 tabular-nums whitespace-nowrap">
                          {formatEUR(c.fixedExpenses)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {formatEUR(c.variableExpenses)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          {formatEUR(foodTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {formatEUR(shoppingTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-purple-600 dark:text-purple-400 tabular-nums whitespace-nowrap">
                          {formatEUR(studyTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                          {formatEUR(transportTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          {formatEUR(c.actualSavings || 0)}
                        </td>
                        <td
                          className={`py-3 px-3.5 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                            c.remainingMoney < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatEUR(c.remainingMoney)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List: Completely redesigned to prevent overlapping and clipping */}
            <div className="sm:hidden space-y-3.5">
              {[...activeCycles].reverse().map((c) => {
                const isDeficit = c.remainingMoney < 0;
                const isSelected = effectiveSelectedCycleId === c.cycleId;
                const relevantCategories = categories
                  .filter((cat) => cat.id !== 'cat-fixed' && cat.id !== 'cat-saving')
                  .filter((cat) => (c.categoryTotals[cat.id] || 0) > 0 || ['cat-supermarket', 'cat-shopping', 'cat-study', 'cat-transport'].includes(cat.id));

                return (
                  <div
                    key={c.cycleId}
                    onClick={() => handleCycleClick(c.cycleId)}
                    className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs space-y-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Header: Clean Stacked Layout to Prevent ANY Text Overlap */}
                    <div className="space-y-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug break-words">
                            {c.label}
                          </h4>
                          {c.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5 break-words">
                              {c.notes}
                            </p>
                          )}
                        </div>
                        {c.isOngoing && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap self-start">
                            {t.activeCycle}
                          </span>
                        )}
                      </div>

                      {/* Row with Sub-dates & Open in Dashboard Action */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {c.startDate} {c.endDate ? `→ ${c.endDate}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCycleInDashboard(c.cycleId);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer py-0.5 active:opacity-75 focus:outline-hidden"
                        >
                          <span>{t.openInDashboard}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </div>
                    </div>

                    {/* Financial Metrics: Spacious 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                          {t.income}
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums truncate">
                          {formatEUR(c.income)}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                          {t.totalExpenses}
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums truncate">
                          {formatEUR(c.totalExpenses)}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                          {t.netActualSavings}
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                          {formatEUR(c.actualSavings || 0)}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                          {t.availableSpendingBalance}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-bold font-mono tabular-nums truncate ${
                            isDeficit
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatEUR(c.remainingMoney)}
                        </span>
                      </div>
                    </div>

                    {/* Fixed & Variable Overview Row */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{t.fixed}:</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {formatEUR(c.fixedExpenses)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{t.variable}:</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {formatEUR(c.variableExpenses)}
                        </span>
                      </div>
                    </div>

                    {/* Category Breakdown: Full-Width Rows for Clean Label Legibility */}
                    <div className="space-y-1.5 pt-1">
                      {relevantCategories.map((cat) => {
                        const total = c.categoryTotals[cat.id] || 0;
                        const catLabel = lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name;
                        return (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/60 dark:border-slate-800/40 text-xs"
                          >
                            <span className="flex items-center gap-2 min-w-0 pr-2">
                              <CategoryIcon category={cat.id} size="xs" />
                              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                                {catLabel}
                              </span>
                            </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                              {formatEUR(total)}
                            </span>
                          </div>
                        );
                      })}

                      {(c.actualSavings || 0) > 0 && (
                        <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 text-xs">
                          <span className="flex items-center gap-2 min-w-0 pr-2">
                            <CategoryIcon category="cat-saving" size="xs" />
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium truncate">
                              {t.saving}
                            </span>
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {formatEUR(c.actualSavings || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* ================= CALENDAR MONTH COMPARISON VIEW ================= */
        <>
          {/* Visual Chart Card */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {t.incomeTrajectoryTitle}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:hidden">
                  {t.tapMonthInspect}
                </p>
              </div>

              {/* Legend Items */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-slate-300 dark:bg-slate-700 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
                    {t.income}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-rose-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
                    {t.totalExpenses}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-emerald-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
                    {t.netActualSavings}
                  </span>
                </div>
              </div>
            </div>

            {chartMonths.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                {t.noMonthlyDataRecorded.replace('{year}', selectedYear.toString())}
              </div>
            ) : (
              <div className="w-full space-y-3">
                <div className="relative w-full h-56 sm:h-64 flex items-end justify-around gap-1 sm:gap-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  {chartMonths.map((m) => {
                    const incomeHeight = Math.min(
                      100,
                      Math.max(4, (m.income / maxMonthBarValue) * 100)
                    );
                    const expenseHeight = Math.min(
                      100,
                      Math.max(4, (m.totalExpenses / maxMonthBarValue) * 100)
                    );
                    const savingsHeight = Math.min(
                      100,
                      Math.max(0, (Math.max(0, m.actualSavings || 0) / maxMonthBarValue) * 100)
                    );
                    const isSelected = effectiveSelectedMonth === m.month;

                    return (
                      <div
                        key={`${m.year || selectedYear}-${m.month}`}
                        onClick={() => handleMonthClick(m.month)}
                        onDoubleClick={() => handleOpenMonthInDashboard(m.month)}
                        className={`flex-1 flex flex-col items-center gap-1.5 max-w-[90px] cursor-pointer group transition-transform ${
                          isSelected ? 'scale-105' : 'hover:scale-102'
                        }`}
                      >
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-40 sm:h-48 px-0.5">
                          <div
                            style={{ height: `${incomeHeight}%` }}
                            className={`w-2 sm:w-3.5 bg-slate-300 dark:bg-slate-700 rounded-t-xs sm:rounded-t-sm transition-all ${
                              isSelected ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900' : 'group-hover:opacity-90'
                            }`}
                            title={t.incomeTooltip.replace('{amount}', formatEUR(m.income))}
                          />
                          <div
                            style={{ height: `${expenseHeight}%` }}
                            className={`w-2 sm:w-3.5 bg-rose-500 rounded-t-xs sm:rounded-t-sm transition-all ${
                              isSelected ? 'ring-2 ring-rose-500 ring-offset-1 dark:ring-offset-slate-900' : 'group-hover:opacity-90'
                            }`}
                            title={t.expensesTooltip.replace('{amount}', formatEUR(m.totalExpenses))}
                          />
                          <div
                            style={{ height: `${savingsHeight}%` }}
                            className={`w-2 sm:w-3.5 bg-emerald-500 rounded-t-xs sm:rounded-t-sm transition-all ${
                              isSelected ? 'ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-slate-900' : 'group-hover:opacity-90'
                            }`}
                            title={`${t.netActualSavings}: ${formatEUR(m.actualSavings || 0)}`}
                          />
                        </div>

                        <div className="text-center w-full">
                          <span
                            className={`text-[10px] sm:text-xs font-semibold block transition-colors ${
                              isSelected
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold underline decoration-2 underline-offset-4'
                                : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                            }`}
                          >
                            {getLocalizedMonthName(m.month, m.monthName).slice(0, 3)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {inspectedMonthData && (
                  <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl sm:rounded-lg border border-slate-100 dark:border-slate-800 text-xs w-full">
                    {/* 1. Mobile Layout (<640px) */}
                    <div className="flex sm:hidden flex-col gap-3 w-full">
                      {/* Section 1 — Month Identity */}
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex items-start gap-1.5 font-bold text-slate-800 dark:text-slate-200 min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                            {getLocalizedMonthName(inspectedMonthData.month, inspectedMonthData.monthName)} {inspectedMonthData.year || selectedYear}
                          </span>
                        </div>
                      </div>

                      {/* Section 2 — Financial Metrics: Clean 2-column grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2.5 pb-0.5 border-t border-slate-200/70 dark:border-slate-800">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                            {t.income}
                          </span>
                          <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 tabular-nums truncate">
                            {formatEUR(inspectedMonthData.income)}
                          </span>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                            {t.expenses}
                          </span>
                          <span className="text-xs font-semibold font-mono text-rose-600 dark:text-rose-400 tabular-nums truncate">
                            {formatEUR(inspectedMonthData.totalExpenses)}
                          </span>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                            {t.netActualSavings}
                          </span>
                          <span className="text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                            {formatEUR(inspectedMonthData.actualSavings || 0)}
                          </span>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                            {t.availableSpendingBalance}
                          </span>
                          <span
                            className={`text-xs font-semibold font-mono tabular-nums truncate ${
                              inspectedMonthData.remainingMoney < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatEUR(inspectedMonthData.remainingMoney)}
                          </span>
                        </div>
                      </div>

                      {/* Section 3 — Open Dashboard */}
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenMonthInDashboard(inspectedMonthData.month)}
                          className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>{t.openInDashboard}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </div>
                    </div>

                    {/* 2. Desktop Layout (>=640px) */}
                    <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 text-xs w-full">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          {getLocalizedMonthName(inspectedMonthData.month, inspectedMonthData.monthName)} {inspectedMonthData.year || selectedYear}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
                        <div>
                          <span className="text-slate-400 mr-1">{t.income}:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatEUR(inspectedMonthData.income)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 mr-1">{t.expenses}:</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {formatEUR(inspectedMonthData.totalExpenses)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 mr-1">{t.netActualSavings}:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatEUR(inspectedMonthData.actualSavings || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 mr-1">{t.availableSpendingBalance}:</span>
                          <span
                            className={`font-semibold ${
                              inspectedMonthData.remainingMoney < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatEUR(inspectedMonthData.remainingMoney)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenMonthInDashboard(inspectedMonthData.month)}
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium ml-auto cursor-pointer"
                      >
                        <span>{t.openInDashboard}</span>
                        <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                      </button>
                    </div>

                    {/* Negative Available Spending Balance Localized Alert */}
                    {inspectedMonthData.remainingMoney < 0 && (
                      <div className="mt-2.5 flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-[11px]">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span className="leading-snug">{t.negativeBalanceWarning}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detailed Monthly Breakdown Table */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t.detailedMonthlyBreakdown}
              </h3>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {t.clickMonthViewDetails}
              </span>
            </div>

            <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5 font-semibold">{t.monthWord}</th>
                    <th className="py-3 px-3 font-semibold text-right">{t.income}</th>
                    <th className="py-3 px-3 font-semibold text-right">{t.totalExpenses}</th>
                    <th className="py-3 px-3 font-semibold text-right">{t.fixed}</th>
                    <th className="py-3 px-3 font-semibold text-right">{t.variable}</th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-supermarket" size="xs" />
                        <span>{t.food}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-shopping" size="xs" />
                        <span>{t.shopping}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-study" size="xs" />
                        <span>{t.study}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-transport" size="xs" />
                        <span>{t.transport}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <CategoryIcon category="cat-saving" size="xs" />
                        <span>{t.saving}</span>
                      </span>
                    </th>
                    <th className="py-3 px-3.5 font-semibold text-right">
                      <span>{t.availableSpendingBalance}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeMonths.map((m) => {
                    const isSelected = effectiveSelectedMonth === m.month;
                    const foodTotal = m.categoryTotals['cat-supermarket'] || 0;
                    const shoppingTotal = m.categoryTotals['cat-shopping'] || 0;
                    const studyTotal = m.categoryTotals['cat-study'] || 0;
                    const transportTotal = m.categoryTotals['cat-transport'] || 0;

                    return (
                      <tr
                        key={`${m.year || selectedYear}-${m.month}`}
                        onClick={() => handleMonthClick(m.month)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-semibold'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {getLocalizedMonthName(m.month, m.monthName)} {m.year}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap">
                          {formatEUR(m.income)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          {formatEUR(m.totalExpenses)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400 tabular-nums whitespace-nowrap">
                          {formatEUR(m.fixedExpenses)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {formatEUR(m.variableExpenses)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          {formatEUR(foodTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {formatEUR(shoppingTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-purple-600 dark:text-purple-400 tabular-nums whitespace-nowrap">
                          {formatEUR(studyTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                          {formatEUR(transportTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          {formatEUR(m.actualSavings || 0)}
                        </td>
                        <td
                          className={`py-3 px-3.5 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                            m.remainingMoney < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatEUR(m.remainingMoney)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Breakdown: Clean, spacious layout without truncation or overlap */}
            <div className="sm:hidden space-y-3.5">
              {[...activeMonths].reverse().map((m) => {
                const isDeficit = m.remainingMoney < 0;
                const isSelected = effectiveSelectedMonth === m.month;
                const relevantCategories = categories
                  .filter((cat) => cat.id !== 'cat-fixed' && cat.id !== 'cat-saving')
                  .filter((cat) => (m.categoryTotals[cat.id] || 0) > 0 || ['cat-supermarket', 'cat-shopping', 'cat-study', 'cat-transport'].includes(cat.id));

                return (
                  <div
                    key={`${m.year || selectedYear}-${m.month}`}
                    onClick={() => handleMonthClick(m.month)}
                    className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs space-y-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Header */}
                    <div className="space-y-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug break-words">
                            {getLocalizedMonthName(m.month, m.monthName)} {m.year || selectedYear}
                          </h4>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap self-start">
                            {lang === 'ar' ? 'المحدد' : lang === 'de' ? 'Ausgewählt' : 'Selected'}
                          </span>
                        )}
                      </div>

                      {/* Open in Dashboard Link */}
                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMonthInDashboard(m.month);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer py-0.5 active:opacity-75 focus:outline-hidden"
                        >
                          <span>{t.openInDashboard}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </div>
                    </div>

                    {/* Financial Metrics: Spacious 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                          {t.income}
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums truncate">
                          {formatEUR(m.income)}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                          {t.totalExpenses}
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums truncate">
                          {formatEUR(m.totalExpenses)}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                          {t.netActualSavings}
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                          {formatEUR(m.actualSavings || 0)}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">
                          {t.availableSpendingBalance}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-bold font-mono tabular-nums truncate ${
                            isDeficit
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatEUR(m.remainingMoney)}
                        </span>
                      </div>
                    </div>

                    {/* Fixed & Variable Overview Row */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{t.fixed}:</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {formatEUR(m.fixedExpenses)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{t.variable}:</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {formatEUR(m.variableExpenses)}
                        </span>
                      </div>
                    </div>

                    {/* Category Breakdown: Full-Width Rows */}
                    <div className="space-y-1.5 pt-1">
                      {relevantCategories.map((cat) => {
                        const total = m.categoryTotals[cat.id] || 0;
                        const catLabel = lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name;
                        return (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/60 dark:border-slate-800/40 text-xs"
                          >
                            <span className="flex items-center gap-2 min-w-0 pr-2">
                              <CategoryIcon category={cat.id} size="xs" />
                              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                                {catLabel}
                              </span>
                            </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                              {formatEUR(total)}
                            </span>
                          </div>
                        );
                      })}

                      {(m.actualSavings || 0) > 0 && (
                        <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 text-xs">
                          <span className="flex items-center gap-2 min-w-0 pr-2">
                            <CategoryIcon category="cat-saving" size="xs" />
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium truncate">
                              {t.saving}
                            </span>
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {formatEUR(m.actualSavings || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
