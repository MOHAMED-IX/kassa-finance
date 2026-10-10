import React, { useState, useMemo } from 'react';
import {
  Category,
  Expense,
  ExpenseType,
  PeriodMode,
  SpendingCycle,
} from '../types/finance';
import { formatDateEU, formatEUR, formatDateRange } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';
import {
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Lock,
  Layers,
  Repeat,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface ExpensesTableProps {
  expenses: Expense[];
  categories: Category[];
  selectedYear: number;
  selectedMonth: number;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onExportCSV: () => void;
  lang: Language;
  periodMode?: PeriodMode;
  currentCycle?: SpendingCycle | null;
}

export const ExpensesTable: React.FC<ExpensesTableProps> = ({
  expenses,
  categories,
  selectedYear,
  selectedMonth,
  onEditExpense,
  onDeleteExpense,
  onExportCSV,
  lang,
  periodMode = 'month',
  currentCycle,
}) => {
  const t = translations[lang];

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all'); // all | fixed | variable
  const [filterRecurring, setFilterRecurring] = useState<string>('all'); // all | yes | no
  const [scopeMonthOnly, setScopeMonthOnly] = useState<boolean>(true);

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'amount' | 'name' | 'store'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Category map for quick lookup
  const categoryMap = useMemo(() => {
    return new Map<string, Category>(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Extract unique stores
  const uniqueStores = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.store && e.store.trim()) set.add(e.store.trim());
    });
    return Array.from(set).sort();
  }, [expenses]);

  // Filtered & Sorted Expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Scoping: Month or Cycle
        if (scopeMonthOnly) {
          if (periodMode === 'cycle' && currentCycle) {
            if (!exp.date || exp.date < currentCycle.startDate) return false;
            if (currentCycle.endDate && exp.date > currentCycle.endDate) return false;
          } else {
            if (exp.year !== selectedYear || exp.month !== selectedMonth) {
              return false;
            }
          }
        }

        // Search query (matches name, store, category name, notes, date, or amount)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const cat = categoryMap.get(exp.categoryId);
          const catName = cat ? cat.name.toLowerCase() : '';
          const storeName = exp.store.toLowerCase();
          const expName = exp.name.toLowerCase();
          const notes = (exp.notes || '').toLowerCase();
          const dateStr = exp.date.toLowerCase();
          const amtStr = exp.amount.toFixed(2);

          const matches =
            expName.includes(q) ||
            storeName.includes(q) ||
            catName.includes(q) ||
            notes.includes(q) ||
            dateStr.includes(q) ||
            amtStr.includes(q);

          if (!matches) return false;
        }

        // Category Filter
        if (filterCategory !== 'all' && exp.categoryId !== filterCategory) {
          return false;
        }

        // Store Filter
        if (filterStore !== 'all' && exp.store.trim() !== filterStore) {
          return false;
        }

        // Type Filter
        if (filterType !== 'all' && exp.type !== filterType) {
          return false;
        }

        // Recurring Filter
        if (filterRecurring === 'yes' && !exp.isRecurring) return false;
        if (filterRecurring === 'no' && exp.isRecurring) return false;

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'date') {
          diff = a.date.localeCompare(b.date);
          if (diff === 0) {
            diff = (a.createdAt || 0) - (b.createdAt || 0);
          }
        } else if (sortField === 'amount') {
          diff = a.amount - b.amount;
        } else if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortField === 'store') {
          diff = a.store.localeCompare(b.store);
        }
        return sortOrder === 'desc' ? -diff : diff;
      });
  }, [
    expenses,
    scopeMonthOnly,
    selectedYear,
    selectedMonth,
    periodMode,
    currentCycle,
    searchQuery,
    filterCategory,
    filterStore,
    filterType,
    filterRecurring,
    sortField,
    sortOrder,
    categoryMap,
  ]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const hasActiveFilters =
    searchQuery !== '' ||
    filterCategory !== 'all' ||
    filterStore !== 'all' ||
    filterType !== 'all' ||
    filterRecurring !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterStore('all');
    setFilterType('all');
    setFilterRecurring('all');
  };

  const handleToggleSort = (field: 'date' | 'amount' | 'name' | 'store') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs mb-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {t.allExpenses}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-medium">
              {filteredExpenses.length} transactions
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total for selection:{' '}
            <span className="font-bold font-mono text-slate-900 dark:text-white">
              {formatEUR(filteredTotal)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Scope Toggle */}
          <button
            onClick={() => setScopeMonthOnly(!scopeMonthOnly)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
              scopeMonthOnly
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {scopeMonthOnly
              ? periodMode === 'cycle'
                ? t.selectedCycleOnly
                : t.selectedMonthOnly
              : t.allTime}
          </button>

          {/* Export CSV button */}
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title={t.exportCSVTooltip}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">{t.exportCSV}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mb-4">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          aria-label={t.filterCategory}
          className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden"
        >
          <option value="all">{t.allCategories}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {lang === 'ar' && c.nameAr ? c.nameAr : c.name}
            </option>
          ))}
        </select>

        {/* Store Filter */}
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          aria-label={t.filterStore}
          className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden"
        >
          <option value="all">{t.allStores}</option>
          {uniqueStores.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          aria-label={t.filterType}
          className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden"
        >
          <option value="all">{t.allTypes}</option>
          <option value="fixed">{t.fixed}</option>
          <option value="variable">{t.variable}</option>
        </select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
          <span>{t.activeFiltersApplied}</span>
          <button
            onClick={handleResetFilters}
            className="text-emerald-600 dark:text-emerald-400 underline hover:no-underline font-medium"
          >
            {t.clearAllFilters}
          </button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th
                onClick={() => handleToggleSort('date')}
                className="py-3 px-3.5 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>{t.colDate}</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('name')}
                className="py-3 px-3.5 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>{t.colName}</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3.5 font-semibold">{t.colCategory}</th>
              <th
                onClick={() => handleToggleSort('store')}
                className="py-3 px-3.5 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>{t.colStore}</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('amount')}
                className="py-3 px-3.5 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-white text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t.colAmount}</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3.5 font-semibold text-center">{t.colType}</th>
              <th className="py-3 px-3.5 font-semibold text-center">{t.colRecurring}</th>
              <th className="py-3 px-3.5 font-semibold text-right">{t.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  No matching expenses found.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => {
                const cat = categoryMap.get(exp.categoryId);

                return (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Date */}
                    <td className="py-2.5 px-3.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDateEU(exp.date)}
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-white">
                      <div>
                        <span>{exp.name}</span>
                        {exp.notes && (
                          <span className="block text-[11px] text-slate-400 truncate max-w-xs">
                            {exp.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category (Colored Lucide Icon + Name) */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={cat} size="xs" withContainer />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {cat
                            ? lang === 'ar' && cat.nameAr
                              ? cat.nameAr
                              : cat.name
                            : t.other}
                        </span>
                      </div>
                    </td>

                    {/* Store */}
                    <td className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                      {exp.store}
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-3.5 font-bold font-mono text-slate-900 dark:text-white text-right tabular-nums whitespace-nowrap">
                      {formatEUR(exp.amount)}
                    </td>

                    {/* Type: Fixed / Variable (Quiet typography) */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-medium ${
                          exp.type === 'fixed'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {exp.type === 'fixed' ? t.fixed : t.variable}
                      </span>
                    </td>

                    {/* Recurring */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-medium ${
                          exp.isRecurring
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {exp.isRecurring ? t.recurringYes : t.recurringNo}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditExpense(exp)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                          title={t.editExpense}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(t.confirmDelete)) {
                              onDeleteExpense(exp.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                          title={t.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
