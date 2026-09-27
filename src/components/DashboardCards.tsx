import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Lock,
  Layers,
  Sparkles,
  Edit2,
  Check,
  X,
  AlertTriangle,
  HelpCircle,
  PiggyBank,
} from 'lucide-react';
import { FinancialSummary } from '../types/finance';
import { formatEUR } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';
import { CategoryIcon } from './CategoryIcon';

interface DashboardCardsProps {
  summary: FinancialSummary;
  onUpdateIncome: (newIncome: number) => void;
  lang: Language;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  summary,
  onUpdateIncome,
  lang,
}) => {
  const t = translations[lang];

  // Inline income editing state
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(summary.income.toString());

  // Toggle for "How much would I spend without one-time expenses?"
  const [showWithoutOneTime, setShowWithoutOneTime] = useState(false);

  const handleSaveIncome = () => {
    const parsed = parseFloat(tempIncome);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateIncome(parsed);
      setIsEditingIncome(false);
    }
  };

  const handleCancelIncome = () => {
    setTempIncome(summary.income.toString());
    setIsEditingIncome(false);
  };

  // Find Supermarket summary if present
  const supermarketSummary = summary.categorySummaries.find(
    (c) => c.category.id === 'cat-supermarket'
  );

  const isDeficit = summary.remainingIncome < 0;

  return (
    <div className="space-y-4 mb-6">
      {/* Primary KPI Grid: 4 Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Monthly Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium">{t.monthlyIncome}</span>
            {!isEditingIncome && (
              <button
                onClick={() => {
                  setTempIncome(summary.income.toString());
                  setIsEditingIncome(true);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
                title="Edit Income"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isEditingIncome ? (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                step="0.01"
                value={tempIncome}
                onChange={(e) => setTempIncome(e.target.value)}
                className="w-full text-lg font-bold font-mono px-2 py-0.5 border border-emerald-500 rounded bg-emerald-50/50 dark:bg-emerald-950/30 text-slate-900 dark:text-white focus:outline-hidden"
                autoFocus
              />
              <button
                onClick={handleSaveIncome}
                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelIncome}
                className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
                {formatEUR(summary.income)}
              </span>
            </div>
          )}

          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{summary.month}/{summary.year}</span>
            <span>·</span>
            <span>Monthly Base</span>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium">{t.totalExpenses}</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatEUR(summary.totalExpenses)}
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>Fixed: {formatEUR(summary.fixedExpenses)}</span>
            <span>·</span>
            <span>Var: {formatEUR(summary.variableExpenses)}</span>
          </div>
        </div>

        {/* Card 3: Saving */}
        <div
          className={`border rounded-xl p-4 shadow-xs transition-colors ${
            isDeficit
              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
              : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span
              className={`font-medium truncate ${
                isDeficit
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {t.remainingMoney}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {isDeficit && (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
                isDeficit
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {formatEUR(summary.remainingIncome)}
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono">
            {summary.income > 0 ? (
              <span>
                {((summary.remainingIncome / summary.income) * 100).toFixed(1)}% of income remaining
              </span>
            ) : (
              <span>No income registered</span>
            )}
          </div>
        </div>

        {/* Card 4: Fixed vs Variable */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium">{t.fixedExpensesLabel}</span>
            <Lock className="w-4 h-4 text-blue-500" />
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatEUR(summary.fixedExpenses)}
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Variable: {formatEUR(summary.variableExpenses)}</span>
            <span className="font-mono">
              {summary.totalExpenses > 0
                ? `${Math.round((summary.fixedExpenses / summary.totalExpenses) * 100)}% fixed`
                : '0%'}
            </span>
          </div>
        </div>

      </div>

      {/* Secondary Row: Supermarket Budget Highlight & One-Time Analytical Switch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        
        {/* Supermarket Budget Card (Responsive Over Budget layout) */}
        {supermarketSummary && (
          <div
            className={`border rounded-xl p-4 sm:p-5 shadow-xs transition-all ${
              supermarketSummary.isOverBudget
                ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-900/50'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {/* Header: Title + Responsive Over Budget Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <CategoryIcon category="cat-supermarket" size="sm" withContainer />
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Supermarket Budget
                  </span>
                </div>

                {supermarketSummary.isOverBudget ? (
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg font-semibold shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap">
                      Over Budget · {supermarketSummary.percentageUsed.toFixed(1)}%
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 rounded-lg font-semibold shrink-0">
                    <span>{supermarketSummary.percentageUsed.toFixed(1)}%</span>
                  </span>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Budget: <span className="font-mono font-bold text-slate-900 dark:text-white">{formatEUR(supermarketSummary.budget)}</span>
                </span>
              </div>
            </div>

            {/* Budget / Spent / Remaining Stats: Reorganized vertically on mobile (< sm), 3-col on sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 py-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/60">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Budget</p>
                <p className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {formatEUR(supermarketSummary.budget)}
                </p>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/60">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t.spent}</p>
                <p className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {formatEUR(supermarketSummary.totalSpent)}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/60">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t.remaining}</p>
                <p
                  className={`text-sm sm:text-base font-bold font-mono tabular-nums mt-0.5 ${
                    supermarketSummary.remainingBudget < 0
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatEUR(supermarketSummary.remainingBudget)}
                </p>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  supermarketSummary.isOverBudget
                    ? 'bg-rose-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, supermarketSummary.percentageUsed)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Feature 12: Recurring vs One-time ("How much would I spend without one-time expenses?") */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold">{t.withoutOneTimeSpend}</span>
            </div>
            <button
              onClick={() => setShowWithoutOneTime(!showWithoutOneTime)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                showWithoutOneTime
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {showWithoutOneTime ? 'Active View' : 'Calculate Without One-Time'}
            </button>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
                {showWithoutOneTime
                  ? formatEUR(summary.spendingWithoutOneTime)
                  : formatEUR(summary.totalExpenses)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {showWithoutOneTime
                  ? `Baseline without ${formatEUR(summary.oneTimeTotal)} one-time items`
                  : `Includes ${formatEUR(summary.oneTimeTotal)} in one-time expenses`}
              </p>
            </div>
            <div className="text-right text-xs font-mono">
              <div className="text-slate-600 dark:text-slate-400">
                Recurring: {formatEUR(summary.recurringTotal)}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                One-Time: {formatEUR(summary.oneTimeTotal)}
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Regular baseline spending helps project future recurring commitments.</span>
          </div>
        </div>

      </div>
    </div>
  );
};
