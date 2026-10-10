import React, { useState, useEffect } from 'react';
import { Category, Expense, ExpenseType, Currency } from '../types/finance';
import { Language, translations } from '../utils/i18n';
import { X, Check } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { getTodayISO, getCurrencySymbol } from '../utils/formatters';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt'> & { id?: string }) => void;
  categories: Category[];
  initialExpense?: Expense | null;
  selectedYear: number;
  selectedMonth: number;
  lang: Language;
  currency?: Currency;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  initialExpense,
  selectedYear,
  selectedMonth,
  lang,
  currency,
}) => {
  const t = translations[lang];

  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || '');
  const [store, setStore] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayISO());
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [type, setType] = useState<ExpenseType>('variable');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Populate when editing or reset to fresh values with TODAY's local date when opening new
  useEffect(() => {
    if (!isOpen) return;

    if (initialExpense) {
      setAmount(initialExpense.amount.toString());
      setCategoryId(initialExpense.categoryId);
      setStore(initialExpense.store);
      setName(initialExpense.name);
      setDate(initialExpense.date);
      setIsRecurring(initialExpense.isRecurring);
      setType(initialExpense.type);
      setNotes(initialExpense.notes || '');
    } else {
      setAmount('');
      const defaultCat = categories[1] || categories[0];
      setCategoryId(defaultCat ? defaultCat.id : '');
      setStore('');
      setName('');
      // Requirement: Expense date must reliably default to current local device date
      setDate(getTodayISO());
      setIsRecurring(false);
      setType(defaultCat ? defaultCat.defaultType : 'variable');
      setNotes('');
    }
    setError('');
  }, [initialExpense, isOpen]);

  // When category changes, auto-suggest default type
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const cat = categories.find((c) => c.id === newCatId);
    if (cat) {
      setType(cat.defaultType);
      if (cat.stores.length > 0 && !store) {
        setStore(cat.stores[0]);
      }
    }
  };

  const currentCategory = categories.find((c) => c.id === categoryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t.validAmountError);
      return;
    }

    if (!categoryId) {
      setError(t.selectCategoryError);
      return;
    }

    // Determine year & month from date input
    const [y, m] = date.split('-').map(Number);
    const expYear = y || selectedYear;
    const expMonth = m || selectedMonth;

    onSave({
      ...(initialExpense?.id ? { id: initialExpense.id } : {}),
      name: name.trim() || store.trim() || 'Expense',
      amount: parsedAmount,
      categoryId,
      store: store.trim() || 'General',
      date,
      year: expYear,
      month: expMonth,
      isRecurring,
      type,
      notes: notes.trim() ? notes.trim() : undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] max-h-[90dvh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            {initialExpense ? t.editExpense : t.addNewExpense}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
            {error && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-lg">
                {error}
              </div>
            )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.amount} *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="26.15"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-lg font-bold font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-sm font-bold text-slate-400 font-mono">
                {getCurrencySymbol(currency)}
              </span>
            </div>
          </div>

          {/* Category & Store Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.category} *
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-2.5 pointer-events-none">
                  <CategoryIcon category={currentCategory} size="sm" withContainer />
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full text-xs pl-11 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'ar' && c.nameAr ? c.nameAr : c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Store / Merchant */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.storeOrSubcategory} *
              </label>
              <input
                type="text"
                list="store-suggestions"
                required
                placeholder={t.storePlaceholder}
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="store-suggestions">
                {currentCategory?.stores.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Expense Name & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.expenseName}
              </label>
              <input
                type="text"
                placeholder={t.expenseNamePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.date} *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Expense Type & Recurring Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Fixed vs Variable */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.type}
              </label>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('variable')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    type === 'variable'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {t.variable}
                </button>
                <button
                  type="button"
                  onClick={() => setType('fixed')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    type === 'fixed'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {t.fixed}
                </button>
              </div>
            </div>

            {/* Recurring: Yes / No */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.recurringMonthlyQuestion}
              </label>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsRecurring(false)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    !isRecurring
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {t.noOneTime}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecurring(true)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isRecurring
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {t.yesRecurring}
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.notes}
            </label>
            <input
              type="text"
              placeholder={t.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          </div>
          {/* End scrollable fields */}

          {/* Pinned Footer CTAs (Always visible and reachable) */}
          <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{t.save}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
