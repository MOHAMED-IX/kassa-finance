import React, { useState } from 'react';
import { FinancialSummary } from '../types/finance';
import { formatEUR } from '../utils/formatters';
import { Language } from '../utils/i18n';
import { PieChart, Store as StoreIcon } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface ChartsSectionProps {
  summary: FinancialSummary;
  lang: Language;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ summary, lang }) => {
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState<number | null>(null);

  // Filter categories with spending > 0
  const activeCategories = summary.categorySummaries
    .filter((c) => c.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const totalSpent = summary.totalExpenses;

  // Donut SVG Calculations
  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const slices = activeCategories.map((cat, idx) => {
    const fraction = totalSpent > 0 ? cat.totalSpent / totalSpent : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercent * circumference;
    cumulativePercent += fraction;

    return {
      cat,
      index: idx,
      strokeDasharray,
      strokeDashoffset,
      fraction,
    };
  });

  const activeCategory =
    hoveredCategoryIndex !== null ? activeCategories[hoveredCategoryIndex] : null;

  // Top Stores
  const topStores = summary.storeSummaries.slice(0, 6);
  const maxStoreSpend = topStores.length > 0 ? topStores[0].totalSpent : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
      
      {/* Chart 1: Donut Breakdown by Category (7 cols) */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {lang === 'ar' ? 'توزيع المصروفات حسب التصنيف' : 'Expense Distribution by Category'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {activeCategories.length} Active Categories
          </span>
        </div>

        {totalSpent === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No expenses recorded for this month.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* SVG Donut */}
            <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
              <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {slices.map((slice) => (
                  <circle
                    key={slice.cat.category.id}
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke={slice.cat.category.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    fill="transparent"
                    className="transition-all duration-300 cursor-pointer hover:opacity-80"
                    onMouseEnter={() => setHoveredCategoryIndex(slice.index)}
                    onMouseLeave={() => setHoveredCategoryIndex(null)}
                  />
                ))}
              </svg>

              {/* Center Metrics */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                  {activeCategory
                    ? lang === 'ar' && activeCategory.category.nameAr
                      ? activeCategory.category.nameAr
                      : activeCategory.category.name
                    : 'Total'}
                </span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {formatEUR(activeCategory ? activeCategory.totalSpent : totalSpent)}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeCategory
                    ? `${((activeCategory.totalSpent / totalSpent) * 100).toFixed(1)}%`
                    : `${activeCategories.length} categories`}
                </span>
              </div>
            </div>

            {/* Category Legend & Proportions */}
            <div className="w-full space-y-2">
              {activeCategories.map((cs, idx) => {
                const percent = ((cs.totalSpent / totalSpent) * 100).toFixed(1);
                const isHovered = hoveredCategoryIndex === idx;

                return (
                  <div
                    key={cs.category.id}
                    onMouseEnter={() => setHoveredCategoryIndex(idx)}
                    onMouseLeave={() => setHoveredCategoryIndex(null)}
                    className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isHovered
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryIcon category={cs.category} size="xs" withContainer />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {lang === 'ar' && cs.category.nameAr ? cs.category.nameAr : cs.category.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatEUR(cs.totalSpent)}
                      </span>
                      <span className="text-[11px] text-slate-400 w-12 text-right">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* Chart 2: Top Stores & Merchants (5 cols) */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StoreIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {lang === 'ar' ? 'أعلى المتاجر إنفاقاً' : 'Top Stores & Spending'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {summary.storeSummaries.length} Stores
          </span>
        </div>

        {topStores.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No store purchases recorded.
          </div>
        ) : (
          <div className="space-y-3">
            {topStores.map((st) => {
              const barPercent = Math.min(100, (st.totalSpent / maxStoreSpend) * 100);

              return (
                <div key={st.store} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {st.store}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[11px] text-slate-400">
                        {st.transactionCount} {st.transactionCount === 1 ? 'order' : 'orders'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatEUR(st.totalSpent)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
