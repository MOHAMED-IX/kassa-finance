import React, { useState, useMemo } from 'react';
import {
  Landmark,
  PiggyBank,
  TrendingDown,
  SlidersHorizontal,
  Target,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Search,
  RotateCw,
  Shield,
  Plane,
  Laptop,
  Car,
  Home,
  GraduationCap,
  Heart,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  BankSummary,
  BankTarget,
  BankTransaction,
  BankTransactionType,
  MonthRecord,
  PeriodSavingTransferInfo,
  SpendingCycle,
  Expense,
  PeriodMode,
} from '../types/finance';
import { Language, translations } from '../utils/i18n';
import {
  formatEUR,
  formatBankAmount,
  formatSignedBankAmount,
  formatBankProgress,
} from '../utils/formatters';
import { calculateTargetProgress } from '../utils/bankCalculations';

export interface BankBalanceSectionProps {
  summary: BankSummary;
  targets: BankTarget[];
  transactions: BankTransaction[];
  periodSavingTransferInfo?: PeriodSavingTransferInfo;
  currentPeriodLabel?: string;
  periodMode?: PeriodMode;
  spendingCycles: SpendingCycle[];
  monthRecords: MonthRecord[];
  expenses: Expense[];
  lang: Language;
  bankPrivacyMode?: boolean;
  onToggleBankPrivacy?: () => void;
  onOpenTransferSaving: () => void;
  onOpenWithdrawal: () => void;
  onOpenAdjustment: () => void;
  onOpenOpeningBalance: () => void;
  onOpenNewTarget: () => void;
  onOpenEditTarget: (target: BankTarget) => void;
  onOpenAdjustTargetFunds: (target: BankTarget) => void;
  onDeleteTarget: (targetId: string) => Promise<void>;
  onDeleteTransaction: (txId: string) => Promise<void>;
}

export const BankBalanceSection: React.FC<BankBalanceSectionProps> = ({
  summary,
  targets,
  transactions,
  periodMode = 'cycle',
  lang,
  bankPrivacyMode = false,
  onToggleBankPrivacy,
  onOpenTransferSaving,
  onOpenWithdrawal,
  onOpenAdjustment,
  onOpenOpeningBalance,
  onOpenNewTarget,
  onOpenEditTarget,
  onOpenAdjustTargetFunds,
  onDeleteTarget,
  onDeleteTransaction,
}) => {
  const t = translations[lang] || translations.en;

  // Filter & Search states for the Transaction Ledger
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Target to delete confirmation
  const [targetToDelete, setTargetToDelete] = useState<BankTarget | null>(null);
  const [txToDelete, setTxToDelete] = useState<BankTransaction | null>(null);

  // Render Icon helper for Targets
  const renderTargetIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Shield':
        return <Shield className="w-5 h-5 shrink-0" />;
      case 'Plane':
        return <Plane className="w-5 h-5 shrink-0" />;
      case 'Laptop':
        return <Laptop className="w-5 h-5 shrink-0" />;
      case 'Car':
        return <Car className="w-5 h-5 shrink-0" />;
      case 'Home':
        return <Home className="w-5 h-5 shrink-0" />;
      case 'GraduationCap':
        return <GraduationCap className="w-5 h-5 shrink-0" />;
      case 'Heart':
        return <Heart className="w-5 h-5 shrink-0" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 shrink-0" />;
      default:
        return <Target className="w-5 h-5 shrink-0" />;
    }
  };

  // Filter and sort transactions (newest date first)
  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNote = tx.note?.toLowerCase().includes(q);
          const matchDate = tx.date.includes(q);
          const matchType = tx.type.toLowerCase().includes(q);
          return matchNote || matchDate || matchType;
        }
        return true;
      })
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [transactions, typeFilter, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Header Overview & Primary Balances */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight break-words">
                  {t.bankTitle}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                  Ledger
                </span>
                {onToggleBankPrivacy && (
                  <button
                    type="button"
                    onClick={onToggleBankPrivacy}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label={bankPrivacyMode ? t.showBankAmounts : t.hideBankAmounts}
                    aria-pressed={bankPrivacyMode}
                    title={bankPrivacyMode ? t.showBankAmounts : t.hideBankAmounts}
                  >
                    {bankPrivacyMode ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                )}
                {bankPrivacyMode && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-sm">
                    {t.bankPrivacyOn}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl break-words">
                {t.bankSubtitle}
              </p>
            </div>
          </div>

          {/* Opening balance button */}
          <div className="flex items-center shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onOpenOpeningBalance}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Edit2 className="w-4 h-4 shrink-0" />
              <span className="break-words">
                {summary.isInitialized ? `${t.edit} ${t.initialBankBalance}` : t.initializeBankBalance}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Overview Metric Cards - 1 col on mobile, 2 on tablet, 4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-5">
          {/* Metric 1: Total Bank Balance */}
          <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1 break-words">
                {t.currentBankBalance}
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums break-words block">
                {formatBankAmount(summary.currentBalance, bankPrivacyMode)}
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
              <span>{t.allLedgerAccounts}</span>
            </div>
          </div>

          {/* Metric 2: Available Unallocated */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1 break-words">
                {t.unallocatedBankBalance}
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-emerald-700 dark:text-emerald-300 tabular-nums break-words block">
                {formatBankAmount(summary.unallocatedBalance, bankPrivacyMode)}
              </span>
            </div>
            <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-2 border-t border-emerald-200/50 dark:border-emerald-900/50">
              <span>{t.readyForGoalsOrReserves}</span>
            </div>
          </div>

          {/* Metric 3: Total Allocated in Goals */}
          <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1 break-words">
                {t.allocatedInTargets}
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums break-words block">
                {formatBankAmount(summary.totalAllocated, bankPrivacyMode)}
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
              <span>{t.acrossGoalsCount.replace('{count}', targets.length.toString())}</span>
            </div>
          </div>

          {/* Metric 4: Period Activity */}
          <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1 break-words">
                {t.periodNetChange}
              </span>
              <span
                className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums break-words block ${
                  summary.periodNetChange >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatSignedBankAmount(summary.periodNetChange, bankPrivacyMode)}
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex-wrap">
              <span className="text-emerald-600 font-mono font-medium">
                {formatSignedBankAmount(summary.periodDeposited, bankPrivacyMode)}
              </span>
              <span>·</span>
              <span className="text-rose-600 font-mono font-medium">
                {formatSignedBankAmount(-summary.periodWithdrawn, bankPrivacyMode)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar - Stacked on Mobile, Inline on Desktop */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onOpenTransferSaving}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-xs shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <PiggyBank className="w-4 h-4 shrink-0" />
            <span className="break-words">{t.transferSavingToBank}</span>
          </button>

          <button
            type="button"
            onClick={onOpenWithdrawal}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <RotateCw className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="break-words">
              {periodMode === 'month' ? t.returnToCurrentMonth : t.returnToCurrentCycle}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenAdjustment}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0 text-slate-500" />
            <span className="break-words">{t.manualAdjustment}</span>
          </button>
        </div>
      </div>

      {/* 2. Virtual Savings Goals & Pots Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words">
                {t.savingsTargetsTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                {t.earmarkedAcrossSavingsPots}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenNewTarget}
            className="w-full sm:w-auto px-3 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="break-words">{t.newSavingsTarget}</span>
          </button>
        </div>

        {targets.length === 0 ? (
          <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Target className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3 opacity-60" />
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto break-words">
              {t.noTargetsYet}
            </p>
            <button
              type="button"
              onClick={onOpenNewTarget}
              className="mt-4 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{t.createFirstSavingsGoal}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {targets.map((target) => {
              const progress = calculateTargetProgress(target);
              const remainingToGoal = Math.max(0, target.targetAmount - target.allocatedAmount);

              return (
                <div
                  key={target.id}
                  className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-shadow hover:shadow-xs space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Icon, Title, Actions */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs mt-0.5">
                          {renderTargetIcon(target.icon)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight break-words whitespace-normal">
                            {target.name}
                          </h4>
                          {target.targetDate && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span>{target.targetDate}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenEditTarget(target)}
                          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors cursor-pointer"
                          title={t.editTarget}
                          aria-label={t.editCategoryAria.replace('{name}', target.name)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetToDelete(target)}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors cursor-pointer"
                          title={t.deleteTarget}
                          aria-label={t.deleteCategoryAria.replace('{name}', target.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Monetary amounts: Allocated vs Goal */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pt-1">
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase font-semibold block mb-0.5">
                          {t.targetAllocated}
                        </span>
                        <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums break-words">
                          {formatBankAmount(target.allocatedAmount, bankPrivacyMode)}
                        </span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold block mb-0.5">
                          {t.targetAmount}
                        </span>
                        <span className="text-sm font-bold font-mono text-slate-600 dark:text-slate-400 tabular-nums break-words">
                          {formatBankAmount(target.targetAmount, bankPrivacyMode)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${bankPrivacyMode ? 0 : progress}%` }}
                        className={`h-full rounded-full transition-all ${
                          target.completed
                            ? 'bg-emerald-500'
                            : 'bg-emerald-600 dark:bg-emerald-400'
                        }`}
                      />
                    </div>

                    {/* Percentage & Remaining status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {t.targetProgressPercent.replace(
                          '{percent}',
                          formatBankProgress(progress, bankPrivacyMode)
                        )}
                      </span>
                      {target.completed ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.goalCompleted}</span>
                        </span>
                      ) : (
                        <span className="font-mono text-slate-500">
                          {t.amountRemaining.replace(
                            '{amount}',
                            formatBankAmount(remainingToGoal, bankPrivacyMode)
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Funds adjustment button */}
                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-700/70">
                    <button
                      type="button"
                      onClick={() => onOpenAdjustTargetFunds(target)}
                      className="w-full sm:w-auto px-3.5 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-300/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span className="break-words">{t.adjustFunds}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Bank Transaction Ledger Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words">
                {t.bankLedgerTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                {t.bankLedgerDesc}
              </p>
            </div>
          </div>

          {/* Filters & Search - Stacked on Mobile, Inline on Desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchTransactions}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
            >
              <option value="all">{t.allTransactionTypes}</option>
              <option value="opening-balance">{t.openingBalance}</option>
              <option value="saving-transfer">{t.savingTransfer}</option>
              <option value="bank-withdrawal">{t.returnToCurrentCycle}</option>
              <option value="manual-adjustment">{t.manualAdjustment}</option>
            </select>
          </div>
        </div>

        {/* Transactions Empty or List */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs sm:text-sm text-slate-400">
            <Landmark className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
            <span className="break-words">{t.noTransactionsYet}</span>
          </div>
        ) : (
          <div>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3 px-3">{t.date}</th>
                    <th className="pb-3 px-3">{t.category}</th>
                    <th className="pb-3 px-3">{t.descriptionMemo}</th>
                    <th className="pb-3 px-3">{t.linkedPeriod}</th>
                    <th className="pb-3 px-3 text-right">{t.amount}</th>
                    <th className="pb-3 px-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {filteredTransactions.map((tx) => {
                    const isDeposit =
                      tx.type === 'opening-balance' ||
                      tx.type === 'saving-transfer' ||
                      (tx.type === 'manual-adjustment' && tx.amount >= 0);

                    const typeLabels: Record<BankTransactionType, { label: string; badge: string }> = {
                      'opening-balance': {
                        label: t.openingBalance,
                        badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40',
                      },
                      'saving-transfer': {
                        label: t.savingTransfer,
                        badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40',
                      },
                      'bank-withdrawal': {
                        label: periodMode === 'month' ? t.returnToCurrentMonth : t.returnToCurrentCycle,
                        badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40',
                      },
                      'manual-adjustment': {
                        label: t.manualAdjustment,
                        badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40',
                      },
                    };

                    const typeConfig = typeLabels[tx.type] || {
                      label: tx.type,
                      badge: 'bg-slate-100 text-slate-700',
                    };

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border font-sans ${typeConfig.badge}`}
                          >
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-sans max-w-sm break-words whitespace-normal">
                          {tx.note || (tx.type === 'bank-withdrawal' ? t.returnedToCurrentCycle : '—')}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-sans whitespace-nowrap">
                          {tx.sourcePeriodMode ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              {tx.sourcePeriodMode === 'spending-cycle' ? (
                                <>
                                  <RotateCw className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>{t.cycleLinked.replace('{id}', tx.sourcePeriodId?.substring(0, 10) || '')}</span>
                                </>
                              ) : (
                                <>
                                  <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span>{t.monthLinked.replace('{id}', tx.sourcePeriodId || '')}</span>
                                </>
                              )}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-sm">
                          <span
                            className={
                              isDeposit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {formatSignedBankAmount(isDeposit ? Math.abs(tx.amount) : -Math.abs(tx.amount), bankPrivacyMode)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap font-sans">
                          <button
                            type="button"
                            onClick={() => setTxToDelete(tx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title={t.deleteTransaction}
                            aria-label={t.deleteTransaction}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTransactions.map((tx) => {
                const isDeposit =
                  tx.type === 'opening-balance' ||
                  tx.type === 'saving-transfer' ||
                  (tx.type === 'manual-adjustment' && tx.amount >= 0);

                const typeLabels: Record<BankTransactionType, { label: string; badge: string }> = {
                  'opening-balance': {
                    label: t.openingBalance,
                    badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40',
                  },
                  'saving-transfer': {
                    label: t.savingTransfer,
                    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40',
                  },
                  'bank-withdrawal': {
                    label: periodMode === 'month' ? t.returnToCurrentMonth : t.returnToCurrentCycle,
                    badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40',
                  },
                  'manual-adjustment': {
                    label: t.manualAdjustment,
                    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40',
                  },
                };

                const typeConfig = typeLabels[tx.type] || {
                  label: tx.type,
                  badge: 'bg-slate-100 text-slate-700',
                };

                return (
                  <div key={tx.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                    {/* Header: Type Badge, Date, Delete Action */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border font-sans ${typeConfig.badge}`}
                        >
                          {typeConfig.label}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {tx.date}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTxToDelete(tx)}
                        className="p-2 -mr-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
                        title={t.deleteTransaction}
                        aria-label={t.deleteTransaction}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Amount & Period */}
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-lg sm:text-xl font-extrabold font-mono tabular-nums ${
                          isDeposit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatSignedBankAmount(isDeposit ? Math.abs(tx.amount) : -Math.abs(tx.amount), bankPrivacyMode)}
                      </span>

                      {tx.sourcePeriodMode && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-sans">
                          {tx.sourcePeriodMode === 'spending-cycle' ? (
                            <>
                              <RotateCw className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{t.cycleLinked.replace('{id}', tx.sourcePeriodId?.substring(0, 10) || '')}</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                              <span>{t.monthLinked.replace('{id}', tx.sourcePeriodId || '')}</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Note / Memo with full wrapping */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-sans break-words whitespace-normal leading-relaxed">
                      {tx.note || (tx.type === 'bank-withdrawal' ? t.returnedToCurrentCycle : undefined)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Target Modal */}
      {targetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-[calc(100vw-24px)] sm:max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words">
              {t.deleteTarget}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed break-words">
              {t.deleteTargetConfirm}
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTargetToDelete(null)}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-center"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteTarget(targetToDelete.id);
                  setTargetToDelete(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer text-center"
              >
                {t.delete} {t.savingsTarget}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Transaction Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-[calc(100vw-24px)] sm:max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words">
              {t.deleteTransaction}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed break-words">
              {t.confirmDelete}
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-center"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteTransaction(txToDelete.id);
                  setTxToDelete(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer text-center"
              >
                {t.deleteTransaction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
