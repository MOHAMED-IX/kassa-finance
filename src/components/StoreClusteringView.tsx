import React, { useState } from 'react';
import { StoreSummary } from '../types/finance';
import { formatDateEU, formatEUR } from '../utils/formatters';
import { Language } from '../utils/i18n';
import { Store, ChevronDown, ChevronUp, Calendar, Tag } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface StoreClusteringViewProps {
  storeSummaries: StoreSummary[];
  selectedMonth: number;
  selectedYear: number;
  lang: Language;
}

export const StoreClusteringView: React.FC<StoreClusteringViewProps> = ({
  storeSummaries,
  selectedMonth,
  selectedYear,
  lang,
}) => {
  const [expandedStore, setExpandedStore] = useState<string | null>(
    storeSummaries[0]?.store || null
  );

  const toggleExpand = (storeName: string) => {
    setExpandedStore(expandedStore === storeName ? null : storeName);
  };

  const totalStoreSpending = storeSummaries.reduce((sum, s) => sum + s.totalSpent, 0);

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] truncate">
              {lang === 'ar' ? 'تجميع وتحليل المتاجر' : 'Store & Merchant Aggregations'} ({selectedMonth}/{selectedYear})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate sm:whitespace-normal">
              Aggregated purchases per merchant, total spend, and itemized transaction receipts.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end sm:text-right pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 sm:block">
            Tracked Merchants
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums sm:ml-0 ml-2">
            {storeSummaries.length}
          </span>
        </div>
      </div>

      {/* Store Clusters */}
      <div className="w-full space-y-3">
        {storeSummaries.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
            No merchant expenses recorded for this month.
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
                        <span>{st.transactionCount} transactions</span>
                        <span>·</span>
                        <span>Avg: {formatEUR(avgBasket)} / visit</span>
                        <span>·</span>
                        <span>{percentOfTotal}% of monthly spend</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="block text-xs text-slate-400">Store Total</span>
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
                        {isExpanded ? 'Hide' : 'Details'}
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
                      Total Spend
                    </span>
                    <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {formatEUR(st.totalSpent)}
                    </span>
                  </div>

                  {/* Mobile 3-Column Stats Grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="block text-[10px] text-slate-400">Orders</span>
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-xs tabular-nums">
                        {st.transactionCount}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="block text-[10px] text-slate-400">Avg / Order</span>
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-[11px] tabular-nums truncate block">
                        {formatEUR(avgBasket)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="block text-[10px] text-slate-400">Share</span>
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
                            <th className="py-2 font-medium">Date</th>
                            <th className="py-2 font-medium">Description</th>
                            <th className="py-2 font-medium">Type</th>
                            <th className="py-2 font-medium text-right">Amount</th>
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
                                {e.type === 'fixed' ? 'Fixed' : 'Variable'}
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
                        Transactions ({st.expenses.length})
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
                              <span>{e.type === 'fixed' ? 'Fixed' : 'Variable'}</span>
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
