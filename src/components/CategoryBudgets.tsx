import React, { useState } from 'react';
import {
  CategorySummary,
} from '../types/finance';
import { formatEUR } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';
import { AlertTriangle, CheckCircle2, Edit3, Check, X } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface CategoryBudgetsProps {
  categorySummaries: CategorySummary[];
  onUpdateCategoryBudget: (categoryId: string, newBudget: number) => void;
  lang: Language;
  income?: number;
  totalExpenses?: number;
  remainingIncome?: number;
}

export const CategoryBudgets: React.FC<CategoryBudgetsProps> = ({
  categorySummaries,
  onUpdateCategoryBudget,
  lang,
  income = 0,
  totalExpenses = 0,
  remainingIncome,
}) => {
  const t = translations[lang];

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState<string>('');

  const handleStartEdit = (catId: string, currentBudget: number) => {
    setEditingCatId(catId);
    setBudgetInput(currentBudget > 0 ? currentBudget.toString() : '');
  };

  const handleSaveBudget = (catId: string) => {
    const parsed = parseFloat(budgetInput);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateCategoryBudget(catId, parsed);
    } else if (budgetInput.trim() === '') {
      onUpdateCategoryBudget(catId, 0);
    }
    setEditingCatId(null);
  };

  // Compute saving amount from income - totalExpenses
  const savingAmount = remainingIncome !== undefined ? remainingIncome : income - totalExpenses;
  const savingsRate = income > 0 ? Math.max(0, (savingAmount / income) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            {t.budgetsTitle}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor budget limits, remaining allowances, and over-budget alerts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {categorySummaries.map((catSummary) => {
          const { category, totalSpent, budget, remainingBudget, percentageUsed, isOverBudget } =
            catSummary;
          const isEditing = editingCatId === category.id;
          const hasBudget = budget > 0;
          const isSavingCategory = category.id === 'cat-saving' || category.name.toLowerCase() === 'saving';

          // Special render for the Saving outcome category
          if (isSavingCategory) {
            const isPositive = savingAmount >= 0;
            return (
              <div
                key={category.id}
                className="p-3.5 rounded-xl border transition-all bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryIcon category={category} size="md" withContainer />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {lang === 'ar' && category.nameAr ? category.nameAr : category.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isPositive ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{savingsRate.toFixed(1)}% Saved</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Deficit</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Numbers Row */}
                <div className="grid grid-cols-3 gap-2 py-1.5 text-xs border-y border-emerald-200/60 dark:border-emerald-800/60 my-2">
                  <div>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                      {t.monthlyIncome}
                    </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatEUR(income)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                      {t.totalExpenses}
                    </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatEUR(totalExpenses)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                      {t.saving}
                    </span>
                    <span
                      className={`font-bold font-mono tabular-nums ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatEUR(savingAmount)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, savingsRate))}%`,
                    }}
                  />
                </div>

                {/* Saving Status Notice */}
                {isPositive ? (
                  <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{savingsRate.toFixed(1)}% of income remaining</span>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Deficit of {formatEUR(Math.abs(savingAmount))}</span>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={category.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isOverBudget
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
              }`}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon category={category} size="md" withContainer />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {lang === 'ar' && category.nameAr ? category.nameAr : category.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isOverBudget ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{percentageUsed.toFixed(1)}%</span>
                    </span>
                  ) : hasBudget ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{percentageUsed.toFixed(1)}%</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">No Limit</span>
                  )}
                </div>
              </div>

              {/* Numbers Row */}
              <div className="grid grid-cols-3 gap-2 py-1.5 text-xs border-y border-slate-200/60 dark:border-slate-700/60 my-2">
                <div>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                    {t.spent}
                  </span>
                  <span className="font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatEUR(totalSpent)}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                    {t.budget}
                  </span>
                  {isEditing ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="10"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        placeholder="0"
                        className="w-16 px-1 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-emerald-500 rounded text-slate-900 dark:text-white focus:outline-hidden"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveBudget(category.id)}
                        className="p-0.5 text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(category.id, budget)}
                      className="group flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                      title="Click to edit budget"
                    >
                      <span className="font-semibold tabular-nums">
                        {hasBudget ? formatEUR(budget) : 'Set'}
                      </span>
                      <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />
                    </button>
                  )}
                </div>

                <div>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                    {t.remaining}
                  </span>
                  <span
                    className={`font-bold font-mono tabular-nums ${
                      !hasBudget
                        ? 'text-slate-400'
                        : isOverBudget
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {hasBudget ? formatEUR(remainingBudget) : '—'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    !hasBudget
                      ? 'bg-slate-400'
                      : isOverBudget
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: hasBudget ? `${Math.min(100, percentageUsed)}%` : '0%',
                  }}
                />
              </div>

              {/* Over Budget Notice */}
              {isOverBudget && (
                <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{t.overBudgetWarning} {formatEUR(Math.abs(remainingBudget))}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
