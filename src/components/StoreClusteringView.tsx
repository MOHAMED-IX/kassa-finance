import React, { useState } from 'react';
import { PeriodMode, SpendingCycle, StoreSummary } from '../types/finance';
import { formatDateEU, formatDateRange, formatEUR } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';
import { Store, ChevronDown, ChevronUp, Calendar, Tag, RotateCw } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface StoreClusteringViewProps {
  storeSummaries: StoreSummary[];
  selectedMonth: number;
  selectedYear: number;
  lang: Language;
  periodMode?: PeriodMode;
  periodLabel?: string;
  currentCycle?: SpendingCycle | null;
}

export const StoreClusteringView: React.FC<StoreClusteringViewProps> = ({
  storeSummaries,
  selectedMonth,
  selectedYear,
  lang,
  periodMode = 'month',
  periodLabel,
  currentCycle,
}) => {
  const t = translations[lang];
  const isCycleMode = periodMode === 'cycle';
  const displayPeriod =
    periodLabel ||
    (isCycleMode && currentCycle
      ? formatDateRange(currentCycle.startDate, currentCycle.endDate, lang)
      : `${selectedMonth}/${selectedYear}`);

  const [expandedStore, setExpandedStore] = useState<string | null>(
    storeSummaries[0]?.store || null
  );

  const toggleExpand = (storeName: string) => {
    setExpandedStore(expandedStore === storeName ? null : storeName);
  };

  const totalStoreSpending = storeSummaries.reduce((sum, s) => sum + s.totalSpent, 0);

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      
      {/* Store & Merchant Aggregations Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs flex flex-col gap-3.5 sm:gap-4 w-full">
        {/* Row 1 & 2: Icon + Title & Description */}
        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 w-full">
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            {isCycleMode ? <RotateCw className="w-5 h-5 shrink-0" /> : <Store className="w-5 h-5 shrink-0" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] leading-snug break-words">
              <span>{t.storeAggregationsTitle}</span>
              {displayPeriod && (
                <span className="font-normal text-slate-500 dark:text-slate-400 text-sm sm:text-base ml-1.5 rtl:mr-1.5">
                  ({displayPeriod})
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 break-words">
              {t.storeAggregationsDesc}
            </p>
          </div>
        </div>

        {/* Dedicated Metric Row: Tracked Merchants */}
        <div className="pt-3 sm:pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 w-full">
          <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            {t.trackedMerchants}
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {storeSummaries.length}
          </span>
        </div>
      </div>

      {/* Store Clusters */}
      <div className="w-full space-y-3">
        {storeSummaries.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
            {t.noMerchantExpenses.replace('{period}', isCycleMode ? t.spendingCycleWord : t.monthWord)}
          </div>
        ) : (
          storeSummaries.map((st) => {
            const isExpanded = expandedStore === st.store;
            const avgBasket = st.totalSpent / st.transactionCount;
            const percentOfTotal =
              totalStoreSpending > 0
                ? ((st.totalSpent / totalStoreSpending) * 100).toFixed(1)
                : '0';

            return (
              <div
                key={st.store}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-all"
              >
                {/* --- DESKTOP Header Bar (hidden on mobile, visible on sm and up) --- */}
                <div
                  onClick={() => toggleExpand(st.store)}
                  className="hidden sm:flex p-4 items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 text-sm shrink-0">
                      {st.store.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-xs">
                          {st.store}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 inline-flex items-center gap-1">
                          <CategoryIcon category={st.categoryName} size="xs" withContainer />
                          <span>{st.categoryName}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{t.transactionCount.replace('{count}', String(st.transactionCount))}</span>
                        <span>·</span>
                        <span>{t.avgPerVisit.replace('{amount}', formatEUR(avgBasket))}</span>
                        <span>·</span>
                        <span>
                          {isCycleMode
                            ? t.percentOfCycleSpend.replace('{percent}', percentOfTotal)
                            : t.percentOfMonthlySpend.replace('{percent}', percentOfTotal)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="block text-xs text-slate-400">{t.storeTotal}</span>
                      <span className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                        {formatEUR(st.totalSpent)}
                      </span>
                    </div>

                    <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* --- MOBILE Reorganized Card Layout (visible only on < sm) --- */}
                <div
                  onClick={() => toggleExpand(st.store)}
                  className="sm:hidden p-3.5 flex flex-col gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Mobile Top Row: Store Badge + Name + Expand Chevron */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 text-xs shrink-0">
                        {st.store.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight break-words">
                          {st.store}
                        </h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 truncate mt-0.5">
                          <CategoryIcon category={st.categoryName} size="xs" withContainer />
                          <span>{st.categoryName}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 p-1 text-slate-400">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {isExpanded ? t.hide : t.details}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* Mobile Total Spend Highlight */}
                  <div className="flex items-baseline justify-between py-1.5 px-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                    <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      {t.totalSpend}
                    </span>
                    <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {formatEUR(st.totalSpent)}
                    </span>
                  </div>

                  {/* Mobile 3-Column Stats Grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="block text-[10px] text-slate-400">{t.orders}</span>
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-xs tabular-nums">
                        {st.transactionCount}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="block text-[10px] text-slate-400">{t.avgPerOrder}</span>
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-[11px] tabular-nums truncate block">
                        {formatEUR(avgBasket)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="block text-[10px] text-slate-400">{t.share}</span>
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-xs tabular-nums">
                        {percentOfTotal}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* --- Expanded Itemized Receipts List --- */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                    
                    {/* Desktop Table View (>= sm) */}
                    <div className="hidden sm:block px-4 pb-4 pt-1 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400 text-[11px] border-b border-slate-200/60 dark:border-slate-700/60">
                            <th className="py-2 font-medium">{t.date}</th>
                            <th className="py-2 font-medium">{t.description}</th>
                            <th className="py-2 font-medium">{t.type}</th>
                            <th className="py-2 font-medium text-right">{t.amount}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {st.expenses.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                              <td className="py-2 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {formatDateEU(e.date)}
                              </td>
                              <td className="py-2 font-medium text-slate-900 dark:text-white">
                                {e.name}
                                {e.notes && (
                                  <span className="text-slate-400 ml-2 font-normal text-[11px]">
                                    {e.notes}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-slate-500 whitespace-nowrap">
                                {e.type === 'fixed' ? t.fixed : t.variable}
                              </td>
                              <td className="py-2 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                                {formatEUR(e.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stacked Card List (< sm, zero horizontal scrolling) */}
                    <div className="sm:hidden p-3 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                        {t.transactionsReceiptsTitle.replace('{count}', String(st.expenses.length))}
                      </div>
                      {st.expenses.map((e) => (
                        <div
                          key={e.id}
                          className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white break-words leading-tight">
                              {e.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{formatDateEU(e.date)}</span>
                              <span>·</span>
                              <span>{e.type === 'fixed' ? t.fixed : t.variable}</span>
                              {e.notes && (
                                <>
                                  <span>·</span>
                                  <span className="truncate max-w-[90px]">{e.notes}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                              {formatEUR(e.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
