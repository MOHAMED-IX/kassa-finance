import React, { useState, useMemo } from 'react';
import { Category, Expense, ExpenseType } from '../types/finance';
import { formatEUR, round2 } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';
import { X, Zap, Check, Calculator } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface FastBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (expenses: Omit<Expense, 'id' | 'createdAt'>[]) => void;
  categories: Category[];
  selectedYear: number;
  selectedMonth: number;
  lang: Language;
}

export const FastBatchModal: React.FC<FastBatchModalProps> = ({
  isOpen,
  onClose,
  onSaveBatch,
  categories,
  selectedYear,
  selectedMonth,
  lang,
}) => {
  const t = translations[lang];

  const defaultDate = () => {
    const mStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
    return `${selectedYear}-${mStr}-26`;
  };

  const [store, setStore] = useState('Lidl');
  const [categoryId, setCategoryId] = useState(
    categories.find((c) => c.id === 'cat-supermarket')?.id || categories[0]?.id || ''
  );
  const [rawInput, setRawInput] = useState('');
  const [baseDate, setBaseDate] = useState(defaultDate());
  const [type, setType] = useState<ExpenseType>('variable');
  const [isRecurring, setIsRecurring] = useState(false);
  const [prefixName, setPrefixName] = useState('Groceries');

  // Parse numbers from input (splits on newline, comma, semicolon, space, or tab)
  const parsedAmounts = useMemo(() => {
    if (!rawInput.trim()) return [];

    // Replace German commas (e.g. 66,25 -> 66.25) and currency symbols
    const cleanStr = rawInput
      .replace(/€/g, '')
      .replace(/EUR/gi, '')
      .replace(/,/g, '.');

    const tokens = cleanStr.split(/[\n\r\t ;]+/);
    const validFloats: number[] = [];

    tokens.forEach((tok) => {
      const val = parseFloat(tok.trim());
      if (!isNaN(val) && val > 0) {
        validFloats.push(round2(val));
      }
    });

    return validFloats;
  }, [rawInput]);

  const batchTotal = useMemo(() => {
    return round2(parsedAmounts.reduce((sum, n) => sum + n, 0));
  }, [parsedAmounts]);

  const currentCategory = categories.find((c) => c.id === categoryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmounts.length === 0) return;

    const [y, m] = baseDate.split('-').map(Number);
    const expYear = y || selectedYear;
    const expMonth = m || selectedMonth;

    const batch: Omit<Expense, 'id' | 'createdAt'>[] = parsedAmounts.map((amt, idx) => ({
      name: parsedAmounts.length > 1 ? `${prefixName || store} #${idx + 1}` : prefixName || store,
      amount: amt,
      categoryId,
      store: store.trim() || 'Store',
      date: baseDate,
      year: expYear,
      month: expMonth,
      isRecurring,
      type,
      notes: `Batch added item (${idx + 1}/${parsedAmounts.length})`,
    }));

    onSaveBatch(batch);
    setRawInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] max-h-[90dvh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {t.quickBatchTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.quickBatchDesc}
            </p>

          {/* Store & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.filterStore} *
              </label>
              <input
                type="text"
                required
                list="batch-stores"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="e.g. Lidl"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="batch-stores">
                {currentCategory?.stores.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.filterCategory} *
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-2.5 pointer-events-none">
                  <CategoryIcon category={categories.find((c) => c.id === categoryId)} size="sm" withContainer />
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs pl-11 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'ar' && c.nameAr ? c.nameAr : c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Multi-amount Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.amountsInput} *
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {parsedAmounts.length} amounts parsed
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste receipt totals or type:&#10;66.25&#10;17.83&#10;5.90&#10;3.87&#10;7.15"
              className="w-full text-sm font-mono p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Live Calculated Store Total Banner */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  {store || 'Store'} Total
                </span>
                <span className="block text-[11px] text-emerald-600 dark:text-emerald-400">
                  {parsedAmounts.length} separate transactions will be recorded
                </span>
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
              {formatEUR(batchTotal)}
            </span>
          </div>

          {/* Date & Name prefix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Name Prefix
              </label>
              <input
                type="text"
                value={prefixName}
                onChange={(e) => setPrefixName(e.target.value)}
                placeholder="e.g. Groceries"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          </div>
          {/* End scrollable fields */}

          {/* Pinned Footer CTAs */}
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
              disabled={parsedAmounts.length === 0}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 rounded-xl shadow-xs transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{t.saveAllTransactions} ({parsedAmounts.length})</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
