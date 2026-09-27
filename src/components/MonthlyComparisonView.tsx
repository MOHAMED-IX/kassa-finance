import React, { useState, useMemo } from 'react';
import { Category, MonthComparisonItem } from '../types/finance';
import { formatEUR } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';
import { BarChart3, TrendingUp, TrendingDown, ArrowRight, Calendar } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface MonthlyComparisonViewProps {
  comparisonData: MonthComparisonItem[];
  categories: Category[];
  selectedYear: number;
  onSelectMonth: (month: number) => void;
  lang: Language;
}

export const MonthlyComparisonView: React.FC<MonthlyComparisonViewProps> = ({
  comparisonData,
  categories,
  selectedYear,
  onSelectMonth,
  lang,
}) => {
  const t = translations[lang];
  // Filter months that have either recorded expenses or income
  const activeMonths = useMemo(() => {
    return comparisonData.filter((m) => m.income > 0 || m.totalExpenses > 0);
  }, [comparisonData]);

  // Selected/inspected month for mobile tooltip detail
  const [selectedBarMonth, setSelectedBarMonth] = useState<number | null>(
    activeMonths[activeMonths.length - 1]?.month || null
  );

  // Max value for bar chart height scaling
  const maxBarValue = useMemo(() => {
    let max = 1000;
    activeMonths.forEach((m) => {
      if (m.income > max) max = m.income;
      if (m.totalExpenses > max) max = m.totalExpenses;
    });
    return max * 1.15;
  }, [activeMonths]);

  const inspectedMonthData = useMemo(() => {
    if (!selectedBarMonth) return activeMonths[0] || null;
    return activeMonths.find((m) => m.month === selectedBarMonth) || activeMonths[0] || null;
  }, [selectedBarMonth, activeMonths]);

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] truncate">
              {lang === 'ar' ? `مقارنة الأشهر لعام ${selectedYear}` : `${selectedYear} Month-over-Month Comparison`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate sm:whitespace-normal">
              Track historical trends, spending shifts, and net savings across the year.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end sm:text-right pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 sm:block">
            Active Months
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums sm:ml-0 ml-2">
            {activeMonths.length}
          </span>
        </div>
      </div>

      {/* Visual Chart Card: Income vs Expenses Trajectory */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs overflow-hidden">
        
        {/* Responsive Header & Legend: Wraps naturally on mobile without overlapping */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
              Income vs Expenses Trajectory
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:hidden">
              Tap any month to inspect details
            </p>
          </div>

          {/* Legend Items: Multi-line / flex-wrap capable */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-slate-300 dark:bg-slate-700 shrink-0" />
              <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-rose-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">Total Expenses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-emerald-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs flex items-center gap-1">
                <CategoryIcon category="cat-saving" size="xs" />
                <span>{t.remainingMoney}</span>
              </span>
            </div>
          </div>
        </div>

        {activeMonths.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No monthly data recorded yet for {selectedYear}.
          </div>
        ) : (
          <div className="w-full space-y-3">
            
            {/* Chart Graphic Container */}
            <div className="relative w-full h-56 sm:h-64 flex items-end justify-around gap-1 sm:gap-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              {activeMonths.map((m) => {
                const incomeHeight = Math.min(100, Math.max(4, (m.income / maxBarValue) * 100));
                const expenseHeight = Math.min(100, Math.max(4, (m.totalExpenses / maxBarValue) * 100));
                const remainingHeight = Math.min(100, Math.max(0, (Math.max(0, m.remainingMoney) / maxBarValue) * 100));
                const isSelected = selectedBarMonth === m.month;

                return (
                  <div
                    key={m.month}
                    onClick={() => {
                      setSelectedBarMonth(m.month);
                    }}
                    onDoubleClick={() => onSelectMonth(m.month)}
                    className={`flex-1 flex flex-col items-center gap-1.5 max-w-[90px] cursor-pointer group transition-transform ${
                      isSelected ? 'scale-105' : 'hover:scale-102'
                    }`}
                  >
                    {/* Bars Group */}
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-40 sm:h-48 px-0.5">
                      {/* Income Bar */}
                      <div
                        style={{ height: `${incomeHeight}%` }}
                        className={`w-2 sm:w-3.5 bg-slate-300 dark:bg-slate-700 rounded-t-xs sm:rounded-t-sm transition-all ${
                          isSelected ? 'ring-1 ring-slate-400' : 'group-hover:opacity-90'
                        }`}
                        title={`Income: ${formatEUR(m.income)}`}
                      />
                      {/* Expenses Bar */}
                      <div
                        style={{ height: `${expenseHeight}%` }}
                        className={`w-2 sm:w-3.5 bg-rose-500 rounded-t-xs sm:rounded-t-sm transition-all ${
                          isSelected ? 'ring-1 ring-rose-300' : 'group-hover:opacity-90'
                        }`}
                        title={`Expenses: ${formatEUR(m.totalExpenses)}`}
                      />
                      {/* Saving Bar */}
                      <div
                        style={{ height: `${remainingHeight}%` }}
                        className={`w-2 sm:w-3.5 bg-emerald-500 rounded-t-xs sm:rounded-t-sm transition-all ${
                          isSelected ? 'ring-1 ring-emerald-300' : 'group-hover:opacity-90'
                        }`}
                        title={`${t.remainingMoney}: ${formatEUR(m.remainingMoney)}`}
                      />
                    </div>

                    {/* X-Axis Month Label */}
                    <div className="text-center w-full">
                      <span
                        className={`text-[10px] sm:text-xs font-semibold block transition-colors ${
                          isSelected
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                        }`}
                      >
                        {m.monthName.slice(0, 3)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Month Stat Strip: Shows active values for tapped month without clutter */}
            {inspectedMonthData && (
              <div className="p-2.5 sm:p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{inspectedMonthData.monthName} {inspectedMonthData.year}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-mono text-[11px] sm:text-xs">
                  <div>
                    <span className="text-slate-400 mr-1">Income:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatEUR(inspectedMonthData.income)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 mr-1">Expenses:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {formatEUR(inspectedMonthData.totalExpenses)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 mr-1">{t.remainingMoney}:</span>
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
                  onClick={() => onSelectMonth(inspectedMonthData.month)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium ml-auto sm:ml-0"
                >
                  <span>Open in Dashboard</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Comprehensive Comparison Breakdown */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Detailed Monthly Breakdown
          </h3>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Click any month to view details
          </span>
        </div>

        {/* --- DESKTOP Table View (Hidden on mobile < sm, visible on >= sm) --- */}
        <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3.5 font-semibold">Month</th>
                <th className="py-3 px-3 font-semibold text-right">Income</th>
                <th className="py-3 px-3 font-semibold text-right">Total Expenses</th>
                <th className="py-3 px-3 font-semibold text-right">Fixed</th>
                <th className="py-3 px-3 font-semibold text-right">Variable</th>
                <th className="py-3 px-3 font-semibold text-right">
                  <span className="inline-flex items-center gap-1 justify-end">
                    <CategoryIcon category="cat-supermarket" size="xs" />
                    <span>Food</span>
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <span className="inline-flex items-center gap-1 justify-end">
                    <CategoryIcon category="cat-shopping" size="xs" />
                    <span>Shopping</span>
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <span className="inline-flex items-center gap-1 justify-end">
                    <CategoryIcon category="cat-study" size="xs" />
                    <span>Study</span>
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <span className="inline-flex items-center gap-1 justify-end">
                    <CategoryIcon category="cat-transport" size="xs" />
                    <span>Transport</span>
                  </span>
                </th>
                <th className="py-3 px-3.5 font-semibold text-right">
                  <span className="inline-flex items-center gap-1.5 justify-end">
                    <CategoryIcon category="cat-saving" size="xs" />
                    <span>{t.remainingMoney}</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeMonths.map((m) => {
                const foodTotal = m.categoryTotals['cat-supermarket'] || 0;
                const shoppingTotal = m.categoryTotals['cat-shopping'] || 0;
                const studyTotal = m.categoryTotals['cat-study'] || 0;
                const transportTotal = m.categoryTotals['cat-transport'] || 0;

                return (
                  <tr
                    key={m.month}
                    onClick={() => onSelectMonth(m.month)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {m.monthName} {m.year}
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

        {/* --- MOBILE Card Breakdown (< sm, Zero Horizontal Overflow) --- */}
        <div className="sm:hidden space-y-3">
          {activeMonths.map((m) => {
            const foodTotal = m.categoryTotals['cat-supermarket'] || 0;
            const shoppingTotal = m.categoryTotals['cat-shopping'] || 0;
            const studyTotal = m.categoryTotals['cat-study'] || 0;
            const transportTotal = m.categoryTotals['cat-transport'] || 0;
            const isDeficit = m.remainingMoney < 0;

            return (
              <div
                key={m.month}
                onClick={() => onSelectMonth(m.month)}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 cursor-pointer active:scale-98 transition-all"
              >
                {/* Month Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {m.monthName} {m.year}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>View Dashboard</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Primary Financial Overview Grid */}
                <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Income</span>
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums block">
                      {formatEUR(m.income)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Expenses</span>
                    <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums block">
                      {formatEUR(m.totalExpenses)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.remainingMoney}</span>
                    <span
                      className={`text-xs font-bold font-mono tabular-nums block ${
                        isDeficit
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatEUR(m.remainingMoney)}
                    </span>
                  </div>
                </div>

                {/* Key Categories Mini-Grid */}
                <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-50/50 dark:bg-slate-800/20">
                    <span className="text-[11px] inline-flex items-center gap-1">
                      <CategoryIcon category="cat-fixed" size="xs" />
                      <span>Fixed:</span>
                    </span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {formatEUR(m.fixedExpenses)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-50/50 dark:bg-slate-800/20">
                    <span className="text-[11px] inline-flex items-center gap-1">
                      <CategoryIcon category="cat-personal" size="xs" />
                      <span>Variable:</span>
                    </span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {formatEUR(m.variableExpenses)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-50/50 dark:bg-slate-800/20">
                    <span className="text-[11px] inline-flex items-center gap-1">
                      <CategoryIcon category="cat-supermarket" size="xs" />
                      <span>Food:</span>
                    </span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {formatEUR(foodTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-50/50 dark:bg-slate-800/20">
                    <span className="text-[11px] inline-flex items-center gap-1">
                      <CategoryIcon category="cat-shopping" size="xs" />
                      <span>Shopping:</span>
                    </span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {formatEUR(shoppingTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
