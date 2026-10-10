import React, { useState, useEffect } from 'react';
import { Category, CategorySummary, ExpenseType, Currency } from '../types/finance';
import { Language, translations } from '../utils/i18n';
import { Layers, Plus, Trash2, Check, X, Tag, Info, RotateCw, ChevronDown } from 'lucide-react';
import { formatEUR, getCurrencySymbol } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { POPULAR_CATEGORY_ICONS, EXTENDED_CATEGORY_ICONS } from '../utils/categoryMeta';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  lang: Language;
}

const COLOR_PALETTE = [
  '#10B981', // Emerald (default brand)
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#64748B', // Slate
];

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onAddCategory,
  lang,
}) => {
  const t = translations[lang];

  const [name, setName] = useState('');
  const [color, setColor] = useState('#10B981');
  const [type, setType] = useState<ExpenseType>('variable');
  const [selectedIcon, setSelectedIcon] = useState('ShoppingCart');
  const [isMoreIconsOpen, setIsMoreIconsOpen] = useState(false);
  const [stores, setStores] = useState('');

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setColor('#10B981');
      setType('variable');
      setSelectedIcon('ShoppingCart');
      setIsMoreIconsOpen(false);
      setStores('');
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const storesArray = stores
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    onAddCategory({
      name: name.trim(),
      color,
      iconName: selectedIcon,
      defaultType: type,
      stores: storesArray.length > 0 ? storesArray : ['General'],
    });

    onClose();
  };

  // Construct preview category object using the central Category model
  const previewCategory: Category = {
    id: 'preview',
    name: name.trim() || t.categoryPreview,
    color,
    iconName: selectedIcon,
    defaultType: type,
    stores: [],
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh] my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-category-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="create-category-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]"
              >
                {t.createCategoryModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.createCategoryModalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeModal}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* Live Category Preview Strip (Using standard CategoryIcon system, NO raw HEX shown) */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <CategoryIcon category={previewCategory} size="md" withContainer />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {name.trim() || t.categoryPreview}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {type === 'variable' ? t.variableOptionTitle : t.fixedOptionTitle} · {type === 'variable' ? t.variableOptionDesc : t.fixedOptionDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Category Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.categoryName} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.categoryNamePlaceholder}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                autoFocus
              />
            </div>

            {/* 2. Category Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.categoryType}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('variable')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer ${
                    type === 'variable'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {t.variableOptionTitle}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        type === 'variable'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {type === 'variable' && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.variableOptionDesc}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setType('fixed')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer ${
                    type === 'fixed'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {t.fixedOptionTitle}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        type === 'fixed'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {type === 'fixed' && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.fixedOptionDesc}
                  </p>
                </button>
              </div>
            </div>

            {/* 3. Category Icon Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.categoryIcon}
                </label>
                <button
                  type="button"
                  onClick={() => setIsMoreIconsOpen(!isMoreIconsOpen)}
                  className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{isMoreIconsOpen ? t.fewerIcons : t.moreIcons}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isMoreIconsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Initial Popular 12 Icons */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {POPULAR_CATEGORY_ICONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedIcon === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => setSelectedIcon(opt.name)}
                      title={opt.name}
                      aria-label={opt.name}
                      className={`h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/50 scale-105 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                      }`}
                      style={isSelected ? { color } : undefined}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Extended Icons Revealed on "More" */}
              {isMoreIconsOpen && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                  {EXTENDED_CATEGORY_ICONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedIcon === opt.name;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setSelectedIcon(opt.name)}
                        title={opt.name}
                        aria-label={opt.name}
                        className={`h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/50 scale-105 shadow-xs'
                            : 'border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                        }`}
                        style={isSelected ? { color } : undefined}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Accent Color (Clean Swatches, NO Raw HEX Code) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.accentColor}
              </label>
              <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                {COLOR_PALETTE.map((col) => {
                  const isSelected = color === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setColor(col)}
                      aria-label={t.selectColorSwatch}
                      className={`w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-900 scale-110 shadow-sm'
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Merchant Suggestions (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.merchantSuggestions}
              </label>
              <input
                type="text"
                value={stores}
                onChange={(e) => setStores(e.target.value)}
                placeholder={t.merchantSuggestionsPlaceholder}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                {t.merchantSuggestionsHelp}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {t.saveCategory}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CategoryManagerViewProps {
  categories: Category[];
  currentBudgets: Record<string, number>;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onUpdateBudget: (categoryId: string, budget: number) => void;
  lang: Language;
  currency?: Currency;
  periodMode?: string;
  periodLabel?: string;
  categorySummaries?: CategorySummary[];
}

export const CategoryManagerView: React.FC<CategoryManagerViewProps> = ({
  categories,
  currentBudgets,
  onAddCategory,
  onDeleteCategory,
  onUpdateBudget,
  lang,
  currency,
  periodMode = 'month',
  categorySummaries,
}) => {
  const t = translations[lang];

  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {t.categoriesConfigTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {periodMode === 'cycle' ? t.categoriesConfigDescCycle : t.categoriesConfigDescMonth}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newCategory}</span>
        </button>
      </div>

      {/* Centered Modal Dialog for Creating New Category */}
      <CreateCategoryModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        onAddCategory={onAddCategory}
        lang={lang}
      />

      {/* Category List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const budget = currentBudgets[cat.id] || 0;

          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon category={cat} size="md" withContainer />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {cat.id === 'cat-saving' ? t.saving : cat.defaultType === 'fixed' ? t.fixed : t.variable}
                  </span>
                  {/* Delete category button (prevent for Saving or when only 1 left) */}
                  {cat.id !== 'cat-saving' && categories.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(t.confirmDeleteCategory.replace('{name}', cat.name))) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer transition-colors"
                      aria-label={t.deleteCategoryAria.replace('{name}', cat.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Monthly Budget Setting or Outcome Information */}
              {cat.id === 'cat-saving' ? (
                (() => {
                  const catSummary = categorySummaries?.find((cs) => cs.category.id === cat.id);
                  const actualSavings = catSummary?.actualSavings;
                  return (
                    <div className="flex items-center justify-between text-xs py-2 px-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {t.actualSavingsInBank}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {t.transfersMinusReturns}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {actualSavings !== undefined ? formatEUR(actualSavings) : '—'}
                      </span>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const catSummary = categorySummaries?.find((cs) => cs.category.id === cat.id);
                  const isDerived = periodMode === 'month' && catSummary?.hasCycleBudget;

                  return (
                    <div className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {periodMode === 'cycle'
                            ? t.cycleBudget
                            : isDerived
                            ? (catSummary?.isProjectedBudget ? t.estimatedBudget : t.allocatedBudget)
                            : t.monthlyBudgetCap}:
                        </span>
                        {isDerived && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <RotateCw className={`w-2 h-2 ${catSummary?.isProjectedBudget ? 'animate-spin-slow' : ''}`} />
                            <span>{t.budgetFromSpendingCycle}</span>
                          </span>
                        )}
                      </div>

                      {isDerived ? (
                        <div
                          className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-100"
                          title={`${t.calendarBudgetNotice} ${t.editAuthoritativeCycleBudget}`}
                        >
                          <span>{formatEUR(budget)}</span>
                          <span
                            className="p-1 text-slate-400 hover:text-emerald-600 cursor-help"
                            title={t.editAuthoritativeCycleBudget}
                          >
                            <Info className="w-3 h-3" />
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="10"
                            min="0"
                            value={budget || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdateBudget(cat.id, val);
                            }}
                            placeholder="0"
                            className="w-20 px-2 py-1 text-xs font-mono font-bold text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="font-mono text-slate-400">{getCurrencySymbol(currency)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* Stores list */}
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">
                  {t.presetStoresLabel}
                </span>
                <div className="flex flex-wrap gap-1">
                  {cat.stores.map((s) => (
                    <span
                      key={s}
                      className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
