import React, { useEffect } from 'react';
import { SpendingCycle } from '../types/finance';
import { Language, translations } from '../utils/i18n';
import {
  formatDateRange,
  MONTH_NAMES_EN,
  MONTH_NAMES_AR,
  MONTH_NAMES_DE,
} from '../utils/formatters';
import {
  CalendarX,
  RotateCw,
  X,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from 'lucide-react';

/* =========================================================================
   1. RESET MONTH CONFIRM MODAL
   ========================================================================= */

export interface ResetMonthConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  year: number;
  month: number;
  isCycleDerived: boolean;
  lang: Language;
  isResetting?: boolean;
}

export const ResetMonthConfirmModal: React.FC<ResetMonthConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  year,
  month,
  isCycleDerived,
  lang,
  isResetting = false,
}) => {
  const t = translations[lang];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResetting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isResetting, onClose]);

  if (!isOpen) return null;

  const months =
    lang === 'ar'
      ? MONTH_NAMES_AR
      : lang === 'de'
      ? MONTH_NAMES_DE
      : MONTH_NAMES_EN;
  const localizedMonth = months[month - 1] || String(month);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => {
        if (!isResetting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                {t.resetMonthConfirmTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {localizedMonth} {year}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isResetting) onClose();
            }}
            disabled={isResetting}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cycle-Derived Notice (Do not allow false reset) */}
        {isCycleDerived ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                {t.monthDerivedFromCycleNotice
                  .replace('{month}', localizedMonth)
                  .replace('{year}', String(year))}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Impact Details: What will change vs What will remain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* What will change */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 space-y-2">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <RotateCw className="w-3.5 h-3.5" />
                  {t.whatWillChange}
                </span>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                    <span>{t.resetMonthChange1}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                    <span>
                      {t.resetMonthChange2
                        .replace('{month}', localizedMonth)
                        .replace('{year}', String(year))}
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                    <span>{t.resetMonthChange3}</span>
                  </li>
                </ul>
              </div>

              {/* What will remain */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-2">
                <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t.whatWillRemain}
                </span>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>
                      {t.resetMonthRemain1
                        .replace('{month}', localizedMonth)
                        .replace('{year}', String(year))}
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>{t.resetMonthRemain2}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>{t.resetMonthRemain3}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>{t.resetMonthRemain4}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Reassurance Notice */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t.resetMonthWarning}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isResetting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isResetting}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.resettingMonth}</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{t.resetMonthBtn}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================================
   2. DELETE MONTH CONFIRM MODAL (With explicit What will be deleted vs Remain)
   ========================================================================= */

export interface DeleteMonthConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  year: number;
  month: number;
  expenseCount: number;
  lang: Language;
  isDeleting?: boolean;
}

export const DeleteMonthConfirmModal: React.FC<DeleteMonthConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  year,
  month,
  expenseCount,
  lang,
  isDeleting = false,
}) => {
  const t = translations[lang];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const months =
    lang === 'ar'
      ? MONTH_NAMES_AR
      : lang === 'de'
      ? MONTH_NAMES_DE
      : MONTH_NAMES_EN;
  const localizedMonth = months[month - 1] || String(month);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                {t.deleteMonthConfirmTitle
                  .replace('{month}', localizedMonth)
                  .replace('{year}', String(year))}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                {expenseCount} {t.recordsToBeDeleted}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isDeleting) onClose();
            }}
            disabled={isDeleting}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Impact Details: What will be deleted vs What will remain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* What will be deleted */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
            <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Trash2 className="w-3.5 h-3.5" />
              {t.whatWillBeDeleted}
            </span>
            <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                <span>
                  {t.deleteMonthDel1
                    .replace('{month}', localizedMonth)
                    .replace('{year}', String(year))}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                <span>
                  {t.deleteMonthDel2
                    .replace('{month}', localizedMonth)
                    .replace('{year}', String(year))}
                </span>
              </li>
            </ul>
          </div>

          {/* What will remain */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-2">
            <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.whatWillRemain}
            </span>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.deleteMonthRemain1}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.deleteMonthRemain2}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.deleteMonthRemain3}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.deleteMonthRemain4}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Irreversible Action Warning */}
        <div className="p-3 rounded-2xl bg-rose-100/80 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{t.deleteMonthIrreversibleWarning}</span>
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.deletingMonth}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {t.deleteMonthBtn
                    .replace('{month}', localizedMonth)
                    .replace('{year}', String(year))}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. RESET CYCLE CONFIRM MODAL
   ========================================================================= */

export interface ResetCycleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  cycle: SpendingCycle | null;
  activeCycleId?: string;
  lang: Language;
  isResetting?: boolean;
  error?: string | null;
}

export const ResetCycleConfirmModal: React.FC<ResetCycleConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cycle,
  activeCycleId,
  lang,
  isResetting = false,
  error = null,
}) => {
  const t = translations[lang];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResetting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isResetting, onClose]);

  if (!isOpen || !cycle) return null;

  const isCycleActive = cycle.id === activeCycleId || cycle.endDate === null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => {
        if (!isResetting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                {t.resetSpendingCycleConfirmTitle}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {formatDateRange(cycle.startDate, cycle.endDate, lang)}
                </span>
                {isCycleActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {t.activeCycleBadge}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isResetting) onClose();
            }}
            disabled={isResetting}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cycle.notes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            „{cycle.notes}“
          </p>
        )}

        {/* Impact Details: What will change vs What will remain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* What will change */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 space-y-2">
            <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <RotateCw className="w-3.5 h-3.5" />
              {t.whatWillChange}
            </span>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span>{t.resetCycleChange1}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span>{t.resetCycleChange2}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span>{t.resetCycleChange3}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span>{t.resetCycleChange4}</span>
              </li>
            </ul>
          </div>

          {/* What will remain */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-2">
            <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.whatWillRemain}
            </span>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.resetCycleRemain1}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.resetCycleRemain2}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.resetCycleRemain3}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.resetCycleRemain4}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.resetCycleRemain5}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Non-destructive Reassurance */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{t.resetCycleWarning}</span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isResetting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.resettingCycle}</span>
              </>
            ) : (
              <>
                <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{t.resetSpendingCycleBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. DELETE CYCLE CONFIRM MODAL (With explicit What will be deleted vs Remain)
   ========================================================================= */

export interface DeleteCycleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  cycle: SpendingCycle | null;
  activeCycleId?: string;
  lang: Language;
  isDeleting?: boolean;
  error?: string | null;
}

export const DeleteCycleConfirmModal: React.FC<DeleteCycleConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cycle,
  activeCycleId,
  lang,
  isDeleting = false,
  error = null,
}) => {
  const t = translations[lang];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !cycle) return null;

  const isCycleActive = cycle.id === activeCycleId || cycle.endDate === null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                {t.deleteSpendingCycleConfirmTitle}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {formatDateRange(cycle.startDate, cycle.endDate, lang)}
                </span>
                {isCycleActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {t.activeCycleBadge}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isDeleting) onClose();
            }}
            disabled={isDeleting}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cycle.notes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            „{cycle.notes}“
          </p>
        )}

        {/* Impact Details: What will be deleted vs What will remain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* What will be deleted */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
            <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Trash2 className="w-3.5 h-3.5" />
              {t.whatWillBeDeleted}
            </span>
            <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                <span>{t.deleteCycleDel1}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                <span>{t.deleteCycleDel2}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                <span>{t.deleteCycleDel3}</span>
              </li>
            </ul>
          </div>

          {/* What will remain */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-2">
            <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.whatWillRemain}
            </span>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.deleteCycleRemain1}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.deleteCycleRemain2}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.deleteCycleRemain3}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                <span>{t.deleteCycleRemain4}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Active fallback explanation */}
        {isCycleActive && (
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{t.deleteCycleActiveFallback}</span>
          </div>
        )}

        {/* Irreversible Action Warning */}
        <div className="p-3 rounded-2xl bg-rose-100/80 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{t.deleteCycleIrreversibleWarning}</span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.deletingSpendingCycle}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.deleteSpendingCycleBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
