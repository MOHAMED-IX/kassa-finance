import React, { useState } from 'react';
import {
  TrendingDown,
  Lock,
  Receipt,
  Edit2,
  Check,
  X,
  AlertTriangle,
  PiggyBank,
  Info,
  RotateCw,
  Landmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FinancialSummary, PeriodSavingTransferInfo, Currency } from '../types/finance';
import { formatEUR, getCurrencySymbol } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';

interface DashboardCardsProps {
  summary: FinancialSummary;
  onUpdateIncome: (newIncome: number) => void;
  lang: Language;
  currency?: Currency;
  bankPrivacyMode?: boolean;
  periodSavingTransferInfo?: PeriodSavingTransferInfo;
  onTransferSavingToBank?: () => void;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  summary,
  onUpdateIncome,
  lang,
  currency,
  bankPrivacyMode = false,
  periodSavingTransferInfo,
  onTransferSavingToBank,
}) => {
  const t = translations[lang];

  // Collapsible state for Current Cycle Balance card (expanded by default on fresh visit)
  const [isCycleBalanceExpanded, setIsCycleBalanceExpanded] = useState(true);

  // Inline income editing state
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(summary.income.toString());
  const [showIncomeAllocationInfo, setShowIncomeAllocationInfo] = useState(false);

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

  const availableSpending = periodSavingTransferInfo
    ? periodSavingTransferInfo.stillAvailable
    : summary.remainingIncome;
  const savingsHeldInBank = periodSavingTransferInfo
    ? periodSavingTransferInfo.transferredAmount
    : 0;
  const returnedAmount = periodSavingTransferInfo
    ? periodSavingTransferInfo.returnedAmount
    : 0;
  const hasReturns = periodSavingTransferInfo
    ? periodSavingTransferInfo.hasReturns
    : false;

  const fixedPercent = summary.totalExpenses > 0
    ? Math.round((summary.fixedExpenses / summary.totalExpenses) * 100)
    : 0;
  const variablePercent = summary.totalExpenses > 0
    ? Math.round((summary.variableExpenses / summary.totalExpenses) * 100)
    : 0;

  return (
    <div className="space-y-3 sm:space-y-4 mb-6">
      {/* 1. Dashboard Top Summary: Income & Unified Expense Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-stretch">
        
        {/* Card 1: Monthly / Cycle Income */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-medium">
                {summary.periodMode === 'cycle' ? t.cycleIncome : t.monthlyIncome}
              </span>
            <div className="flex items-center gap-1.5">
              {summary.periodMode === 'month' && summary.hasCycleAllocation ? (
                <>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                    <RotateCw className="w-2.5 h-2.5 animate-spin-slow" />
                    <span>{summary.isProjectedIncome ? t.estimatedFromCycle : t.allocatedFromCycles}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowIncomeAllocationInfo((prev) => !prev)}
                    className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded-md transition-colors cursor-pointer"
                    title={t.calendarIncomeAllocatedNotice}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : !isEditingIncome ? (
                <button
                  onClick={() => {
                    setTempIncome(summary.income > 0 ? summary.income.toString() : '');
                    setIsEditingIncome(true);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                  title={summary.incomeNotSet ? t.setIncome : `${t.edit} ${t.income}`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Optional Info popover for Calendar Month allocated income */}
          {showIncomeAllocationInfo && summary.periodMode === 'month' && summary.hasCycleAllocation && (
            <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 relative">
              <button
                type="button"
                onClick={() => setShowIncomeAllocationInfo(false)}
                className="absolute top-1 right-1 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <RotateCw className="w-3 h-3" />
                <span>{t.allocatedFromCycles}</span>
              </div>
              <p className="pr-4">{t.calendarIncomeAllocatedNotice}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                {t.editAuthoritativeCycleIncome}
              </p>
            </div>
          )}

          {isEditingIncome ? (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tempIncome}
                  onChange={(e) => setTempIncome(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-lg font-bold font-mono px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-emerald-500 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveIncome();
                    if (e.key === 'Escape') handleCancelIncome();
                  }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  {getCurrencySymbol(currency)}
                </span>
              </div>
              <button
                onClick={handleSaveIncome}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                title={t.save}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCancelIncome}
                className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer shrink-0"
                title={t.cancel}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
                  summary.incomeNotSet
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {formatEUR(summary.income)}
              </span>
              {summary.incomeNotSet && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {t.incomeNotSet}
                </span>
              )}
            </div>
          )}

          {/* Supporting cycle metadata grouped closely right under amount */}
          {!isEditingIncome && (
            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {summary.periodMode === 'cycle' && summary.cycle ? (
                <div className="flex items-center gap-1 truncate w-full justify-between">
                  <div className="flex items-center gap-1 truncate">
                    {summary.cycle.endDate === null && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <span className="truncate">
                      {summary.cycle.endDate === null
                        ? t.active
                        : summary.cycle.notes || `${summary.cycle.startDate} → ${summary.cycle.endDate}`}
                    </span>
                  </div>
                  {summary.cycle.expectedNextCycleIncome !== undefined &&
                    summary.cycle.expectedNextCycleIncome !== null &&
                    summary.cycle.expectedNextCycleIncome > 0 && (
                      <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                        {t.nextAmount.replace('{amount}', formatEUR(summary.cycle.expectedNextCycleIncome))}
                      </span>
                    )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span>
                    {summary.hasCycleAllocation
                      ? summary.isProjectedIncome
                        ? t.cycleEstimate
                        : t.allocatedFromCycles
                      : t.monthlyBase}
                  </span>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Card 2: Unified Expense Breakdown Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div>
            {/* Card Header: Title & Period Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 sm:mb-2.5">
              <span className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t.expenseBreakdown}
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {summary.periodMode === 'cycle' ? t.spendingCycle : t.monthWord}
              </span>
            </div>

            {/* Desktop & Tablet Layout: 3 Balanced Columns with Subtle Vertical Dividers */}
            <div className="hidden sm:grid sm:grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 rtl:divide-x-reverse items-start">
              {/* Metric A: Total Expenses (Primary metric with strongest visual emphasis) */}
              <div className="pe-3 lg:pe-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium truncate">{t.totalExpenses}</span>
                  <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
                </div>
                <div className="text-xl lg:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums mt-1">
                  {formatEUR(summary.totalExpenses)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  100%
                </div>
              </div>

              {/* Metric B: Fixed Expenses */}
              <div className="px-3 lg:px-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium truncate">{t.fixedExpensesLabel}</span>
                  <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                </div>
                <div className="text-xl lg:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums mt-1">
                  {formatEUR(summary.fixedExpenses)}
                </div>
                <div className="mt-1 text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {t.percentFixed.replace('{percent}', fixedPercent.toString())}
                </div>
              </div>

              {/* Metric C: Variable Expenses */}
              <div className="ps-3 lg:ps-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium truncate">{t.variableExpensesLabel}</span>
                  <Receipt className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                </div>
                <div className="text-xl lg:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums mt-1">
                  {formatEUR(summary.variableExpenses)}
                </div>
                <div className="mt-1 text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  {t.percentVariable.replace('{percent}', variablePercent.toString())}
                </div>
              </div>
            </div>

            {/* Mobile Layout: Total Expenses on Top, Fixed & Variable in 2 Columns Below */}
            <div className="sm:hidden space-y-2.5">
              {/* Primary Metric: Total Expenses */}
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-medium">{t.totalExpenses}</span>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {formatEUR(summary.totalExpenses)}
                  </div>
                </div>
              </div>

              {/* Subtle Hairline Separator */}
              <div className="border-t border-slate-100 dark:border-slate-800" />

              {/* 2 Compact Supporting Columns: Fixed & Variable */}
              <div className="grid grid-cols-2 gap-3 divide-x divide-slate-100 dark:divide-slate-800 rtl:divide-x-reverse">
                {/* Fixed Expenses */}
                <div className="pe-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <Lock className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="font-medium truncate">{t.fixedExpensesLabel}</span>
                  </div>
                  <div className="text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {formatEUR(summary.fixedExpenses)}
                  </div>
                  <div className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                    {t.percentFixed.replace('{percent}', fixedPercent.toString())}
                  </div>
                </div>

                {/* Variable Expenses */}
                <div className="ps-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <Receipt className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="font-medium truncate">{t.variableExpensesLabel}</span>
                  </div>
                  <div className="text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {formatEUR(summary.variableExpenses)}
                  </div>
                  <div className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    {t.percentVariable.replace('{percent}', variablePercent.toString())}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Progress Bar (Fixed vs Variable ratio) */}
          {summary.totalExpenses > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full rounded-s-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, (summary.fixedExpenses / summary.totalExpenses) * 100))}%`,
                  }}
                  title={`${fixedPercent}% ${t.fixedExpensesLabel}`}
                />
                <div
                  className="bg-slate-400 dark:bg-slate-500 h-full rounded-e-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, (summary.variableExpenses / summary.totalExpenses) * 100))}%`,
                  }}
                  title={`${variablePercent}% ${t.variableExpensesLabel}`}
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 2. Section 3: Current Cycle Balance (Always an Independent, Full-Width Card) */}
      <div
        className={`border rounded-2xl p-4 sm:p-5 shadow-xs transition-all duration-200 ${
          availableSpending < 0
            ? 'bg-gradient-to-br from-rose-500/[0.05] via-rose-500/[0.02] to-transparent dark:from-rose-950/40 dark:via-rose-950/20 dark:to-transparent border-rose-200/80 dark:border-rose-900/60'
            : 'bg-gradient-to-br from-emerald-500/[0.05] via-emerald-500/[0.02] to-transparent dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-transparent border-emerald-200/80 dark:border-emerald-900/60'
        }`}
      >
        {/* Permanent Focal Zone: Header & Main Balance (Always visible in both Collapsed and Expanded states) */}
        <div>
          {/* Header Bar: Category Icon, Title, Live Status Indicator, and Collapse/Expand Toggle */}
          <div className="flex items-center justify-between gap-3 min-w-0">
            {/* Left: Icon & Title Grouped Together (matching Bank Balance card styling) */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  availableSpending < 0
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <PiggyBank className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`font-bold uppercase tracking-wider text-[11px] sm:text-xs truncate ${
                      availableSpending < 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {summary.periodMode === 'cycle' ? t.currentCycleBalance : t.availableSpendingBalance}
                  </h3>

                  <span className="text-slate-300 dark:text-slate-600 text-xs hidden sm:inline" aria-hidden="true">
                    ·
                  </span>

                  {/* Clean unboxed live status indicator */}
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
                      availableSpending < 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {availableSpending < 0 ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    )}
                    <span>{availableSpending < 0 ? t.deficit : t.availableForSpending}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Chevron Collapse/Expand Button */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsCycleBalanceExpanded((prev) => !prev)}
                className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0 min-w-[40px] min-h-[40px] ${
                  availableSpending < 0
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/60'
                    : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50'
                }`}
                aria-label={
                  isCycleBalanceExpanded
                    ? t.collapseCycleBalance
                    : t.expandCycleBalance
                }
                aria-expanded={isCycleBalanceExpanded}
                aria-controls="cycle-balance-card-content"
                title={
                  isCycleBalanceExpanded
                    ? t.collapseCycleBalance
                    : t.expandCycleBalance
                }
              >
                {isCycleBalanceExpanded ? (
                  <ChevronUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 transition-transform" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform" />
                )}
              </button>
            </div>
          </div>

          {/* Focal Balance Stage (Prominent, authoritative, uncrowded) */}
          <div className="mt-2.5 sm:mt-3">
            <div
              className={`text-3xl sm:text-4xl lg:text-[44px] font-extrabold font-mono tracking-tight tabular-nums leading-none ${
                availableSpending < 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {formatEUR(availableSpending)}
            </div>

            {/* Subtitle context note (Unspent Income) */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {summary.periodMode === 'cycle'
                ? t.unspentIncome
                : t.unspentPeriodIncome}
            </p>

            {/* Negative Available Spending Balance Localized Alert */}
            {availableSpending < 0 && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="leading-snug">{t.negativeBalanceWarning}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Financial Liquidity & Action Deck */}
        {isCycleBalanceExpanded && (
          <div
            id="cycle-balance-card-content"
            className="mt-4 sm:mt-5 pt-4 border-t border-emerald-200/50 dark:border-emerald-900/30 animate-in fade-in duration-200"
          >
            {/* Supporting Financial Intelligence Deck */}
            <div
              className={`grid gap-3 sm:gap-3.5 ${
                hasReturns
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  : availableSpending > 0 && onTransferSavingToBank
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              {/* Metric Card 1: Savings Held in Bank */}
              <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span className="font-medium text-[11px] uppercase tracking-wider">
                    {savingsHeldInBank > 0 ? t.savingsHeldInBank : t.savingsTransferredToBank}
                  </span>
                  <Landmark className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatEUR(savingsHeldInBank)}
                </div>
              </div>

              {/* Metric Card 2: Returned from Bank (if active) */}
              {hasReturns && (
                <div className="bg-white/80 dark:bg-slate-900/60 border border-blue-200/60 dark:border-blue-900/40 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 mb-1">
                    <span className="font-medium text-[11px] uppercase tracking-wider">
                      {t.returnedFromBank}
                    </span>
                    <RotateCw className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                    {returnedAmount > 0 ? '+' : ''}{formatEUR(returnedAmount)}
                  </div>
                </div>
              )}

              {/* Metric Card 3: Available to Transfer to Savings */}
              <div className="bg-white/80 dark:bg-slate-900/60 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 mb-1">
                  <span className="font-medium text-[11px] uppercase tracking-wider">
                    {t.availableToTransferToSavings}
                  </span>
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {formatEUR(availableSpending)}
                </div>
              </div>

              {/* Action Bay: Cycle Transfer Status & Transfer Button */}
              {availableSpending > 0 && onTransferSavingToBank && (
                <div className="bg-emerald-500/[0.06] dark:bg-emerald-500/[0.1] border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between gap-2.5 sm:col-span-2 lg:col-span-1 shadow-2xs">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                      {summary.periodMode === 'cycle' ? t.spendingCycle : t.monthWord}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-emerald-800 dark:text-emerald-300">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          savingsHeldInBank > 0 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <span>
                        {savingsHeldInBank > 0
                          ? t.statusPartiallyTransferredShort
                          : t.notInBankYet}
                      </span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTransferSavingToBank();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-2xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[38px]"
                  >
                    <Landmark className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {savingsHeldInBank > 0
                        ? t.transferRemainingBtn
                        : t.transferBtn}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
