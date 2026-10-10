import React, { useState } from 'react';
import {
  Landmark,
  PiggyBank,
  ArrowRight,
  TrendingDown,
  SlidersHorizontal,
  CheckCircle2,
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RotateCw,
} from 'lucide-react';
import { BankSummary, BankTarget, PeriodSavingTransferInfo, PeriodMode } from '../types/finance';
import { Language, translations } from '../utils/i18n';
import { formatEUR, formatBankAmount, formatSignedBankAmount } from '../utils/formatters';

export interface BankDashboardCardProps {
  summary: BankSummary;
  targets: BankTarget[];
  periodSavingTransferInfo?: PeriodSavingTransferInfo;
  periodLabel?: string;
  periodMode?: PeriodMode;
  lang: Language;
  bankPrivacyMode?: boolean;
  onToggleBankPrivacy?: () => void;
  onOpenTransferSaving: () => void;
  onOpenWithdrawal: () => void;
  onOpenAdjustment: () => void;
  onOpenInitBank: () => void;
  onOpenBankHub: () => void;
  onOpenNewTarget: () => void;
}

export const BankDashboardCard: React.FC<BankDashboardCardProps> = ({
  summary,
  targets,
  periodSavingTransferInfo,
  periodMode = 'cycle',
  lang,
  bankPrivacyMode = false,
  onToggleBankPrivacy,
  onOpenTransferSaving,
  onOpenWithdrawal,
  onOpenAdjustment,
  onOpenInitBank,
  onOpenBankHub,
}) => {
  const t = translations[lang] || translations.en;

  // Temporary in-memory collapse state: ALWAYS defaults to COLLAPSED (false) on load
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Uninitialized state: Clean, elegant starter card
  if (!summary.isInitialized) {
    return (
      <div className="bg-gradient-to-br from-emerald-900/10 via-slate-900/5 to-emerald-900/10 dark:from-emerald-950/30 dark:via-slate-900/50 dark:to-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {t.bankAccount}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                  {t.newFeature}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl break-words">
                {t.initBankPrompt}
              </p>
            </div>
          </div>

          <div className="flex items-center shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onOpenInitBank}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-xs shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="break-words">{t.initializeBankBalance}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeTargets = targets.filter((t) => t.active !== false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xs transition-all">
      {/* 1. Header: Bank Balance Identity, Amount, Privacy Toggle, and Chevron Expand/Collapse */}
      <div
        className="flex items-center justify-between gap-3 cursor-pointer select-none"
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls="bank-card-details-content"
        aria-label={isExpanded ? t.collapseBankDetails : t.expandBankDetails}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.currentBankBalance}
              </span>
              {bankPrivacyMode && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-sm">
                  {t.bankPrivacyOn}
                </span>
              )}
            </div>
            <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums break-words block mt-0.5">
              {formatBankAmount(summary.currentBalance, bankPrivacyMode)}
            </span>
          </div>
        </div>

        {/* Right Controls: Eye Privacy Toggle & Chevron Expand Button */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {onToggleBankPrivacy && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleBankPrivacy();
              }}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label={bankPrivacyMode ? t.showBankAmounts : t.hideBankAmounts}
              aria-pressed={bankPrivacyMode}
              title={bankPrivacyMode ? t.showBankAmounts : t.hideBankAmounts}
            >
              {bankPrivacyMode ? (
                <EyeOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label={isExpanded ? t.collapseBankDetails : t.expandBankDetails}
            aria-expanded={isExpanded}
            aria-controls="bank-card-details-content"
            title={isExpanded ? t.collapseBankDetails : t.expandBankDetails}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Expanded Content: Detailed Breakdown & Action Buttons */}
      {isExpanded && (
        <div
          id="bank-card-details-content"
          className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 sm:space-y-5 animate-in fade-in duration-200"
        >
          {/* Quick Hub Navigation Link */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.breakdownAndActivity}
            </span>
            <button
              type="button"
              onClick={onOpenBankHub}
              className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/60 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors cursor-pointer"
            >
              <span className="break-words">{t.openBankHub}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" />
            </button>
          </div>

          {/* Available Unallocated vs Allocated in Goals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Available / Unallocated */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 rounded-xl p-3.5 sm:p-4">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1 break-words">
                {t.unallocatedBankBalance}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums break-words block">
                {formatBankAmount(summary.unallocatedBalance, bankPrivacyMode)}
              </span>
              <span className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-1 block">
                {t.availableForGoalsAndSpending}
              </span>
            </div>

            {/* Allocated in Goals */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-xl p-3.5 sm:p-4">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1 break-words">
                {t.allocatedInTargets} ({activeTargets.length})
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 tabular-nums break-words block">
                {formatBankAmount(summary.totalAllocated, bankPrivacyMode)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                {t.earmarkedAcrossSavingsPots}
              </span>
            </div>
          </div>

          {/* Cash Flow Metrics Row (Deposits, Withdrawals, Net Change) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 py-3 border-y border-slate-100 dark:border-slate-800/80">
            <div className="flex sm:flex-col items-center sm:items-start justify-between p-2 sm:p-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.periodDeposits}:</span>
              <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatSignedBankAmount(summary.periodDeposited, bankPrivacyMode)}
              </span>
            </div>

            <div className="flex sm:flex-col items-center sm:items-start justify-between p-2 sm:p-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.periodWithdrawals}:</span>
              <span className="text-sm sm:text-base font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                {formatSignedBankAmount(-summary.periodWithdrawn, bankPrivacyMode)}
              </span>
            </div>

            <div className="flex sm:flex-col items-center sm:items-start justify-between p-2 sm:p-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.periodNetChange}:</span>
              <span
                className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                  summary.periodNetChange >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatSignedBankAmount(summary.periodNetChange, bankPrivacyMode)}
              </span>
            </div>
          </div>

          {/* Saving Transfer Status Alert or Reconciled Banner */}
          <div>
            {periodSavingTransferInfo && periodSavingTransferInfo.remainingUntransferred > 0 ? (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                  <PiggyBank className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="break-words">
                    {t.periodSavingReadyToTransfer.replace(
                      '{amount}',
                      formatEUR(periodSavingTransferInfo.remainingUntransferred)
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenTransferSaving}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer w-fit"
                >
                  <span>{t.transferSavingToBank} →</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="break-words">{t.bankReconciledWithCurrentPeriod}</span>
              </div>
            )}
          </div>

          {/* Bottom Action Buttons Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
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
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <RotateCw className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="break-words">
                {periodMode === 'month' ? t.returnToCurrentMonth : t.returnToCurrentCycle}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenAdjustment}
              className="w-full sm:w-auto px-3.5 py-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0 text-slate-500" />
              <span className="break-words">{t.manualAdjustment}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
