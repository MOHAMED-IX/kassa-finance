import React, { useState } from 'react';
import { Expense, SpendingCycle, Category, BankTransaction } from '../types/finance';
import { Language, translations } from '../utils/i18n';
import {
  formatDateRange,
  formatDateReadable,
  formatEUR,
  calculateDaysInCycle,
  round2,
} from '../utils/formatters';
import { filterExpensesByCycle } from '../utils/calculations';
import { getUnassignedCycleExpenses } from '../utils/periodAbstraction';
import { getPeriodSavingTransferInfo } from '../utils/bankCalculations';
import {
  RotateCw,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Euro,
  Edit2,
  Trash2,
  LayoutDashboard,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DeleteCycleConfirmModal, ResetCycleConfirmModal } from './DeleteConfirmationModals';

interface SpendingCyclesViewProps {
  cycles: SpendingCycle[];
  expenses: Expense[];
  categories: Category[];
  activeCycleId?: string;
  bankTransactions?: BankTransaction[];
  onOpenStartCycle: () => void;
  onEditCycle: (cycle: SpendingCycle) => void;
  onResetCycle?: (cycleId: string) => Promise<void> | void;
  onDeleteCycle: (cycleId: string) => Promise<void> | void;
  onSelectCycleForDashboard: (cycleId: string) => void;
  lang: Language;
}

export const SpendingCyclesView: React.FC<SpendingCyclesViewProps> = ({
  cycles,
  expenses,
  categories,
  activeCycleId,
  bankTransactions = [],
  onOpenStartCycle,
  onEditCycle,
  onResetCycle,
  onDeleteCycle,
  onSelectCycleForDashboard,
  lang,
}) => {
  const t = translations[lang];

  // Cycle deletion confirmation state
  const [cycleToDelete, setCycleToDelete] = useState<SpendingCycle | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Cycle reset confirmation state
  const [cycleToReset, setCycleToReset] = useState<SpendingCycle | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Review unassigned transactions panel state
  const [showUnassigned, setShowUnassigned] = useState<boolean>(false);

  // Unassigned transactions outside any recorded spending cycle
  const unassignedData = getUnassignedCycleExpenses(expenses, cycles);

  // Identify active cycle (either matching activeCycleId or endDate === null)
  const activeCycle =
    cycles.find((c) => c.id === activeCycleId) ||
    cycles.find((c) => c.endDate === null) ||
    (cycles.length > 0 ? cycles[0] : null);

  const handleResetConfirm = async () => {
    if (!cycleToReset || !onResetCycle) return;
    setIsResetting(true);
    try {
      await onResetCycle(cycleToReset.id);
      setCycleToReset(null);
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!cycleToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteCycle(cycleToDelete.id);
      setCycleToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <RotateCw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.spendingCycles}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized financial periods between your actual salary and payment dates.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenStartCycle}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{t.startNewCycle}</span>
        </button>
      </div>

      {/* Empty State */}
      {cycles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 sm:p-14 text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.noCyclesYet}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.startFirstCycle}. Unlike calendar months, spending cycles follow your real salary day so your balance reflects reality.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenStartCycle}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{t.startNewCycle}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Active Cycle Hero Card */}
          {activeCycle && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 sm:p-7 shadow-lg shadow-emerald-600/20">
              {/* Background Glow */}
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    <span>{t.activeCycleBadge}</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    {formatDateRange(activeCycle.startDate, activeCycle.endDate, lang)}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {t.cycleDaysElapsed.replace(
                        '{days}',
                        calculateDaysInCycle(activeCycle.startDate, activeCycle.endDate).toString()
                      )}
                    </span>
                    {activeCycle.notes && (
                      <span className="bg-black/15 px-2.5 py-0.5 rounded-lg">
                        {activeCycle.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics Pill Grid */}
                {(() => {
                  const cycleExpenses = filterExpensesByCycle(expenses, activeCycle);
                  const totalSpent = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const cycleIncome = activeCycle.income || 0;
                  const unspentIncome = cycleIncome > 0 ? round2(cycleIncome - totalSpent) : 0;
                  let availableSpendingBalance: number | null = null;
                  if (cycleIncome > 0) {
                    if (bankTransactions && bankTransactions.length > 0) {
                      const transferInfo = getPeriodSavingTransferInfo(
                        unspentIncome,
                        'cycle',
                        activeCycle.id,
                        bankTransactions,
                        activeCycle.startDate,
                        activeCycle.endDate || undefined
                      );
                      availableSpendingBalance = transferInfo.stillAvailable;
                    } else {
                      availableSpendingBalance = unspentIncome;
                    }
                  }

                  return (
                    <>
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                      {/* Income Card */}
                      <div className="flex-1 sm:flex-initial bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 min-w-[120px]">
                        <div className="text-[10px] font-medium text-emerald-100 uppercase tracking-wider">
                          {t.cycleIncome}
                        </div>
                        <div className="text-base sm:text-lg font-bold font-mono mt-0.5">
                          {cycleIncome > 0 ? formatEUR(cycleIncome) : t.incomeNotSet}
                        </div>
                      </div>

                      {/* Spent Card */}
                      <div className="flex-1 sm:flex-initial bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 min-w-[120px]">
                        <div className="text-[10px] font-medium text-emerald-100 uppercase tracking-wider">
                          {t.spent}
                        </div>
                        <div className="text-base sm:text-lg font-bold font-mono mt-0.5">
                          {formatEUR(totalSpent)}
                        </div>
                      </div>

                      {/* Available Spending Balance */}
                      {availableSpendingBalance !== null && (
                        <div className="flex-1 sm:flex-initial bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 min-w-[120px]">
                          <div className="text-[10px] font-medium text-emerald-100 uppercase tracking-wider">
                            {t.availableSpendingBalance}
                          </div>
                          <div
                            className={`text-base sm:text-lg font-bold font-mono mt-0.5 flex items-center gap-1 ${
                              availableSpendingBalance < 0 ? 'text-amber-200' : 'text-white'
                            }`}
                          >
                            {availableSpendingBalance >= 0 ? (
                              <TrendingUp className="w-4 h-4 shrink-0 text-emerald-200" />
                            ) : (
                              <TrendingDown className="w-4 h-4 shrink-0 text-amber-300" />
                            )}
                            <span>{formatEUR(availableSpendingBalance)}</span>
                          </div>
                        </div>
                      )}

                      {/* Quick action: View in Dashboard */}
                      <button
                        type="button"
                        onClick={() => onSelectCycleForDashboard(activeCycle.id)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                        title={t.viewInDashboard}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>{t.dashboard}</span>
                      </button>
                    </div>

                    {/* Negative Balance Alert inside Hero Card */}
                    {availableSpendingBalance !== null && availableSpendingBalance < 0 && (
                      <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-black/20 backdrop-blur-md border border-amber-300/40 text-amber-100 text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
                        <span className="leading-snug">{t.negativeBalanceWarning}</span>
                      </div>
                    )}
                  </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* All Cycles List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t.cycleHistory} ({cycles.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {cycles.map((cycle) => {
                const isActive = cycle.endDate === null || cycle.id === activeCycle?.id;
                const cycleExpenses = filterExpensesByCycle(expenses, cycle);
                const totalSpent = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);
                const days = calculateDaysInCycle(cycle.startDate, cycle.endDate);
                const cycleIncome = cycle.income || 0;
                const unspentIncome = cycleIncome > 0 ? round2(cycleIncome - totalSpent) : 0;
                let balance: number | null = null;
                if (cycleIncome > 0) {
                  if (bankTransactions && bankTransactions.length > 0) {
                    const transferInfo = getPeriodSavingTransferInfo(
                      unspentIncome,
                      'cycle',
                      cycle.id,
                      bankTransactions,
                      cycle.startDate,
                      cycle.endDate || undefined
                    );
                    balance = transferInfo.stillAvailable;
                  } else {
                    balance = unspentIncome;
                  }
                }

                return (
                  <div
                    key={cycle.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20 px-2 rounded-2xl"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isActive ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Calendar className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {formatDateRange(cycle.startDate, cycle.endDate, lang)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isActive ? t.activeCycle : t.closedCycle}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            {isActive
                              ? t.cycleDaysElapsed.replace('{days}', days.toString())
                              : t.cycleDaysTotal.replace('{days}', days.toString())}
                          </span>
                          <span>•</span>
                          <span>{cycleExpenses.length} transactions</span>
                          {cycle.notes && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                                {cycle.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Figures & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right space-y-0.5">
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {formatEUR(totalSpent)}
                        </div>
                        {cycleIncome > 0 ? (
                          <div
                            className={`text-[11px] font-mono font-semibold ${
                              balance !== null && balance < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {balance !== null && balance >= 0 ? '+' : ''}
                            {balance !== null ? formatEUR(balance) : ''}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">
                            {t.incomeNotSet}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectCycleForDashboard(cycle.id)}
                          title={t.viewInDashboard}
                          aria-label={t.viewInDashboard}
                          className="p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditCycle(cycle)}
                          title={t.editCycle}
                          aria-label={t.editCycle}
                          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {onResetCycle && (
                          <button
                            type="button"
                            onClick={() => setCycleToReset(cycle)}
                            title={t.resetSpendingCycleBtn}
                            aria-label={t.resetSpendingCycleBtn}
                            className="p-2 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCycleToDelete(cycle)}
                          title={t.deleteCycle}
                          aria-label={t.deleteCycle}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Unassigned Transactions Outside Spending Cycles Warning & Review List */}
      {unassignedData.count > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <span>{t.unassignedTransactionsTitle}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                    {unassignedData.count}
                  </span>
                </h3>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                  {t.unassignedTransactionsCount
                    .replace('{count}', String(unassignedData.count))
                    .replace('{amount}', formatEUR(unassignedData.totalAmount))}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowUnassigned(!showUnassigned)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
            >
              <span>{showUnassigned ? t.hideUnassignedTransactions : t.viewUnassignedTransactions}</span>
              {showUnassigned ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-xs text-amber-800/80 dark:text-amber-300/70 leading-relaxed">
            {t.unassignedReviewHelp}
          </p>

          {showUnassigned && (
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
              <div className="overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-amber-200/60 dark:border-amber-800/40 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">{t.date}</th>
                      <th className="py-2.5 px-3">{t.description}</th>
                      <th className="py-2.5 px-3">{t.category}</th>
                      <th className="py-2.5 px-3">{t.type}</th>
                      <th className="py-2.5 px-3 text-right">{t.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {unassignedData.unassignedExpenses.map((exp) => {
                      const cat = categories.find((c) => c.id === exp.categoryId);
                      return (
                        <tr key={exp.id} className="hover:bg-amber-50/30 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                            {exp.date || `${exp.year}-${String(exp.month).padStart(2, '0')}`}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                            {exp.name} {exp.store ? `(${exp.store})` : ''}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {cat ? cat.name : 'Other'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap capitalize text-[11px] text-slate-500">
                            {exp.type || 'variable'} {exp.isRecurring ? '• recurring' : ''}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatEUR(exp.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reset Cycle Confirmation Modal using shared component */}
      <ResetCycleConfirmModal
        isOpen={Boolean(cycleToReset)}
        onClose={() => setCycleToReset(null)}
        onConfirm={handleResetConfirm}
        cycle={cycleToReset}
        activeCycleId={activeCycleId}
        lang={lang}
        isResetting={isResetting}
      />

      {/* Delete Confirmation Modal using shared component */}
      <DeleteCycleConfirmModal
        isOpen={Boolean(cycleToDelete)}
        onClose={() => setCycleToDelete(null)}
        onConfirm={handleDeleteConfirm}
        cycle={cycleToDelete}
        activeCycleId={activeCycleId}
        lang={lang}
        isDeleting={isDeleting}
      />
    </div>
  );
};
