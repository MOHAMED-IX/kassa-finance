import React, { useState } from 'react';
import { Category, ExpenseType } from '../types/finance';
import { Language, translations } from '../utils/i18n';
import { Layers, Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { formatEUR } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface CategoryManagerViewProps {
  categories: Category[];
  currentBudgets: Record<string, number>;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onUpdateBudget: (categoryId: string, budget: number) => void;
  lang: Language;
}

export const CategoryManagerView: React.FC<CategoryManagerViewProps> = ({
  categories,
  currentBudgets,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateBudget,
  lang,
}) => {
  const t = translations[lang];

  const [isAdding, setIsAdding] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // New category form fields
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10B981');
  const [newCatType, setNewCatType] = useState<ExpenseType>('variable');
  const [newCatStores, setNewCatStores] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('0');

  const COLOR_PALETTE = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
    '#F97316', // Orange
    '#14B8A6', // Teal
    '#64748B', // Slate
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const storesArray = newCatStores
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    onAddCategory({
      name: newCatName.trim(),
      nameAr: newCatNameAr.trim() || undefined,
      color: newCatColor,
      iconName: 'Tag',
      defaultType: newCatType,
      stores: storesArray.length > 0 ? storesArray : ['General'],
    });

    const parsedBudget = parseFloat(newCatBudget);
    if (!isNaN(parsedBudget) && parsedBudget > 0) {
      // The newly created category will be handled in parent
    }

    setNewCatName('');
    setNewCatNameAr('');
    setNewCatStores('');
    setNewCatBudget('0');
    setIsAdding(false);
  };

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
              {lang === 'ar' ? 'إدارة وتخصيص التصنيفات' : 'Categories & Budget Configuration'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize spending categories, merchant suggestion tags, and default monthly caps.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* New Category Card Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-900 border-2 border-emerald-500/40 rounded-xl p-5 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Create New Category
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Name (English) *
              </label>
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Subscriptions, Travel"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Name (Arabic - optional)
              </label>
              <input
                type="text"
                value={newCatNameAr}
                onChange={(e) => setNewCatNameAr(e.target.value)}
                placeholder="مثال: الاشتراكات"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Color */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Accent Color
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PALETTE.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewCatColor(col)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newCatColor === col ? 'ring-2 ring-emerald-500 scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            {/* Default Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Type
              </label>
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as ExpenseType)}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="variable">Variable</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>

            {/* Stores */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Stores / Tags (comma separated)
              </label>
              <input
                type="text"
                value={newCatStores}
                onChange={(e) => setNewCatStores(e.target.value)}
                placeholder="Store 1, Store 2"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              Save Category
            </button>
          </div>
        </form>
      )}

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
                    {cat.id === 'cat-saving' ? 'Outcome' : cat.defaultType}
                  </span>
                  {/* Delete category button (prevent for Saving or when only 1 left) */}
                  {cat.id !== 'cat-saving' && categories.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete category "${cat.name}"?`)) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Monthly Budget Setting or Outcome Information */}
              {cat.id === 'cat-saving' ? (
                <div className="flex items-center justify-between text-xs py-2 px-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    Financial Metric:
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Income − Total Expenses
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    Monthly Budget Cap:
                  </span>
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
                    <span className="font-mono text-slate-400">€</span>
                  </div>
                </div>
              )}

              {/* Stores list */}
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">
                  Preset stores & merchants:
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
