import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  RotateCw,
  Plus,
  Clock,
  Sparkles,
  ArrowRight,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import {
  MONTH_NAMES_AR,
  MONTH_NAMES_DE,
  MONTH_NAMES_EN,
  formatDateRange,
  formatDateReadable,
} from '../utils/formatters';
import {
  MIN_CALENDAR_YEAR,
  DEFAULT_MAX_CALENDAR_YEAR,
  getLocalMaxCalendarYear,
} from '../utils/calendarRange';
import { Expense, MonthRecord, PeriodMode, SpendingCycle } from '../types/finance';
import {
  DeleteMonthConfirmModal,
  DeleteCycleConfirmModal,
  ResetMonthConfirmModal,
  ResetCycleConfirmModal,
} from './DeleteConfirmationModals';
import { calculateAllocatedIncomeForMonth } from '../utils/periodAbstraction';
import { CalendarMonthPicker } from './CalendarMonthPicker';

interface MonthYearSelectorProps {
  selectedYear: number;
  selectedMonth: number;
  onSelectYear: (year: number) => void;
  onSelectMonth: (month: number) => void;
  lang: Language;
  userId?: string;
  // Spending Cycle Props
  periodMode?: PeriodMode;
  onTogglePeriodMode?: (mode: PeriodMode) => void;
  cycles?: SpendingCycle[];
  selectedCycleId?: string;
  onSelectCycle?: (cycleId: string) => void;
  onOpenStartCycle?: () => void;
  onManageCycles?: () => void;
  // Contextual Reset & Deletion Props
  onResetMonthConfig?: (year: number, month: number) => Promise<void> | void;
  onDeleteMonthData?: (year: number, month: number) => Promise<{ deletedExpensesCount: number }>;
  onResetCycle?: (cycleId: string) => Promise<void> | void;
  onDeleteCycle?: (cycleId: string) => Promise<void> | void;
  expenses?: Expense[];
  monthRecords?: MonthRecord[];
}

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  selectedYear,
  selectedMonth,
  onSelectYear,
  onSelectMonth,
  lang,
  userId,
  periodMode = 'month',
  onTogglePeriodMode,
  cycles = [],
  selectedCycleId,
  onSelectCycle,
  onOpenStartCycle,
  onManageCycles,
  onResetMonthConfig,
  onDeleteMonthData,
  onResetCycle,
  onDeleteCycle,
  expenses = [],
  monthRecords = [],
}) => {
  const t = translations[lang];
  const months =
    lang === 'ar'
      ? MONTH_NAMES_AR
      : lang === 'de'
      ? MONTH_NAMES_DE
      : MONTH_NAMES_EN;

  // Dynamic maximum calendar year persisted per user
  const [maxCalendarYear, setMaxCalendarYear] = useState<number>(() =>
    getLocalMaxCalendarYear(userId)
  );

  useEffect(() => {
    setMaxCalendarYear(getLocalMaxCalendarYear(userId));
  }, [userId]);

  const isMinMonth = selectedYear === MIN_CALENDAR_YEAR && selectedMonth === 1;
  const isMaxMonth = selectedYear >= maxCalendarYear && selectedMonth === 12;

  // Contextual Reset Month State
  const [isConfirmingResetMonth, setIsConfirmingResetMonth] = useState(false);
  const [isResettingMonth, setIsResettingMonth] = useState(false);

  // Contextual Delete Month State
  const [isConfirmingDeleteMonth, setIsConfirmingDeleteMonth] = useState(false);
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);
  const [monthExpenseCount, setMonthExpenseCount] = useState(0);

  // Contextual Reset Cycle State
  const [isConfirmingResetCycle, setIsConfirmingResetCycle] = useState(false);
  const [isResettingCycle, setIsResettingCycle] = useState(false);

  // Contextual Delete Cycle State
  const [isConfirmingDeleteCycle, setIsConfirmingDeleteCycle] = useState(false);
  const [isDeletingCycle, setIsDeletingCycle] = useState(false);
  const [cycleDeleteError, setCycleDeleteError] = useState<string | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Contextual Period Action Menu State
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Interactive Cycle Picker State
  const [isCyclePickerOpen, setIsCyclePickerOpen] = useState(false);
  const cyclePickerRef = useRef<HTMLDivElement>(null);
  const cyclePickerButtonRef = useRef<HTMLButtonElement>(null);

  // Close action menu on click outside or escape key
  useEffect(() => {
    if (!isActionMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node) &&
        actionMenuButtonRef.current &&
        !actionMenuButtonRef.current.contains(e.target as Node)
      ) {
        setIsActionMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsActionMenuOpen(false);
        actionMenuButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActionMenuOpen]);

  // Close cycle picker on click outside or escape key
  useEffect(() => {
    if (!isCyclePickerOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        cyclePickerRef.current &&
        !cyclePickerRef.current.contains(e.target as Node) &&
        cyclePickerButtonRef.current &&
        !cyclePickerButtonRef.current.contains(e.target as Node)
      ) {
        setIsCyclePickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCyclePickerOpen(false);
        cyclePickerButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCyclePickerOpen]);

  // Close menus when switching period mode or when selected period changes
  useEffect(() => {
    setIsActionMenuOpen(false);
    setIsCyclePickerOpen(false);
  }, [periodMode, selectedYear, selectedMonth, selectedCycleId]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      if (selectedYear > MIN_CALENDAR_YEAR) {
        onSelectMonth(12);
        onSelectYear(selectedYear - 1);
      }
    } else {
      onSelectMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      if (selectedYear < maxCalendarYear) {
        onSelectMonth(1);
        onSelectYear(selectedYear + 1);
      }
    } else {
      onSelectMonth(selectedMonth + 1);
    }
  };

  // Find currently selected cycle or default to active/first cycle
  const currentCycle =
    cycles.find((c) => c.id === selectedCycleId) ||
    cycles.find((c) => c.endDate === null) ||
    (cycles.length > 0 ? cycles[0] : null);

  const currentCycleIndex = currentCycle
    ? cycles.findIndex((c) => c.id === currentCycle.id)
    : -1;

  const handlePrevCycle = () => {
    if (currentCycleIndex < cycles.length - 1 && onSelectCycle) {
      onSelectCycle(cycles[currentCycleIndex + 1].id);
    }
  };

  const handleNextCycle = () => {
    if (currentCycleIndex > 0 && onSelectCycle) {
      onSelectCycle(cycles[currentCycleIndex - 1].id);
    }
  };

  // Check if current month is derived from Spending Cycles
  const allocation = calculateAllocatedIncomeForMonth(selectedYear, selectedMonth, cycles);
  const isMonthCycleDerived = allocation.hasCycleAllocation;

  // Handle Month Reset Confirmation
  const handleConfirmResetMonth = async () => {
    if (!onResetMonthConfig) return;
    setIsResettingMonth(true);
    try {
      await onResetMonthConfig(selectedYear, selectedMonth);
      const successMsg = t.monthResetSuccess
        .replace('{month}', selectedMonthName)
        .replace('{year}', String(selectedYear));
      setNotification({
        type: 'success',
        message: successMsg,
      });
      setIsConfirmingResetMonth(false);
    } catch (err: any) {
      console.error('Reset month error:', err);
      setNotification({
        type: 'error',
        message: err?.message || t.failedToResetMonth,
      });
    } finally {
      setIsResettingMonth(false);
    }
  };

  // Handle Month Deletion Initiation
  const handleInitiateDeleteMonth = () => {
    const matchingExpenses = expenses.filter(
      (e) => e.year === selectedYear && e.month === selectedMonth
    );
    const hasMonthRecord = monthRecords.some(
      (m) =>
        m.year === selectedYear &&
        m.month === selectedMonth &&
        (m.income > 0 || Object.keys(m.budgets || {}).length > 0)
    );

    if (matchingExpenses.length === 0 && !hasMonthRecord) {
      const monthName = months[selectedMonth - 1];
      const emptyMsg = t.noDataForMonth
        .replace('{month}', monthName)
        .replace('{year}', String(selectedYear));
      setNotification({
        type: 'info',
        message: emptyMsg,
      });
      return;
    }

    setMonthExpenseCount(matchingExpenses.length);
    setIsConfirmingDeleteMonth(true);
  };

  // Handle Month Deletion Execution
  const handleConfirmDeleteMonth = async () => {
    if (!onDeleteMonthData) return;
    setIsDeletingMonth(true);
    try {
      const monthName = months[selectedMonth - 1];
      const result = await onDeleteMonthData(selectedYear, selectedMonth);
      const successMsg = t.monthDataDeletedSuccess
        .replace('{month}', monthName)
        .replace('{year}', String(selectedYear));
      setNotification({
        type: 'success',
        message: `${successMsg} (${result.deletedExpensesCount} ${t.recordsToBeDeleted.toLowerCase()})`,
      });
      setIsConfirmingDeleteMonth(false);
    } catch (err: any) {
      console.error('Contextual delete month error:', err);
      setNotification({
        type: 'error',
        message: err?.message || t.failedToDeleteMonthData,
      });
    } finally {
      setIsDeletingMonth(false);
    }
  };

  // Handle Spending Cycle Reset Execution
  const handleConfirmResetCycle = async () => {
    if (!currentCycle || !onResetCycle) return;
    setIsResettingCycle(true);
    try {
      await onResetCycle(currentCycle.id);
      setNotification({
        type: 'success',
        message: t.spendingCycleResetSuccess,
      });
      setIsConfirmingResetCycle(false);
    } catch (err: any) {
      console.error('Contextual reset cycle error:', err);
      setNotification({
        type: 'error',
        message: err?.message || t.failedToResetCycle,
      });
    } finally {
      setIsResettingCycle(false);
    }
  };

  // Handle Spending Cycle Deletion Initiation
  const handleInitiateDeleteCycle = () => {
    if (!currentCycle) return;
    setCycleDeleteError(null);
    setIsConfirmingDeleteCycle(true);
  };

  // Handle Spending Cycle Deletion Execution
  const handleConfirmDeleteCycle = async () => {
    if (!currentCycle || !onDeleteCycle) return;
    setIsDeletingCycle(true);
    setCycleDeleteError(null);
    try {
      await onDeleteCycle(currentCycle.id);
      setNotification({
        type: 'success',
        message: t.spendingCycleDeletedSuccess,
      });
      setIsConfirmingDeleteCycle(false);
    } catch (err: any) {
      console.error('Contextual delete cycle error:', err);
      const errMsg = err?.message || t.spendingCycleDeleteFailed;
      setCycleDeleteError(errMsg);
      setNotification({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setIsDeletingCycle(false);
    }
  };

  const isRTL = lang === 'ar';
  const selectedMonthName = months[selectedMonth - 1];

  // Render Compact Period Action Menu Trigger and Popover Dropdown
  const renderActionMenu = () => {
    const hasMonthActions = periodMode === 'month' && (onResetMonthConfig || onDeleteMonthData);
    const hasCycleActions = periodMode === 'cycle' && currentCycle && (onResetCycle || onDeleteCycle);
    if (!hasMonthActions && !hasCycleActions) return null;

    return (
      <div className="relative shrink-0" ref={actionMenuRef}>
        <button
          ref={actionMenuButtonRef}
          type="button"
          onClick={() => {
            setIsCyclePickerOpen(false);
            setIsActionMenuOpen((prev) => !prev);
          }}
          className={`w-10 h-10 min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl border transition-colors shadow-2xs cursor-pointer active:scale-95 shrink-0 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
            isActionMenuOpen
              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200'
          }`}
          title={t.periodActions}
          aria-label={t.periodActions}
          aria-haspopup="true"
          aria-expanded={isActionMenuOpen}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {isActionMenuOpen && (
          <div
            role="menu"
            aria-orientation="vertical"
            aria-label={t.periodActions}
            className={`absolute top-full mt-1.5 z-50 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100 ${
              isRTL ? 'left-0' : 'right-0'
            }`}
          >
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
              {t.periodActions}
            </div>

            {periodMode === 'month' ? (
              <>
                {onResetMonthConfig && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setIsConfirmingResetMonth(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-start cursor-pointer focus:outline-hidden focus:bg-amber-50 dark:focus:bg-amber-950/40"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                      <RotateCw className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{t.resetMonthConfig}</span>
                  </button>
                )}

                {onDeleteMonthData && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      handleInitiateDeleteMonth();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-start cursor-pointer focus:outline-hidden focus:bg-rose-50 dark:focus:bg-rose-950/40"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-100/80 dark:bg-rose-900/40 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">
                      {t.deleteMonthBtn
                        .replace('{month}', selectedMonthName)
                        .replace('{year}', String(selectedYear))}
                    </span>
                  </button>
                )}
              </>
            ) : (
              <>
                {onResetCycle && currentCycle && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setIsConfirmingResetCycle(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-start cursor-pointer focus:outline-hidden focus:bg-amber-50 dark:focus:bg-amber-950/40"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                      <RotateCw className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{t.resetSpendingCycleBtn}</span>
                  </button>
                )}

                {onDeleteCycle && currentCycle && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      handleInitiateDeleteCycle();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-start cursor-pointer focus:outline-hidden focus:bg-rose-50 dark:focus:bg-rose-950/40"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-100/80 dark:bg-rose-900/40 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{t.deleteSpendingCycleBtn}</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs mb-5 sm:mb-6 transition-all">
      {/* Inline Feedback Notification Banner */}
      {notification && (
        <div
          className={`p-2.5 px-3.5 mb-2.5 sm:mb-3 rounded-2xl flex items-center justify-between text-xs font-semibold transition-all animate-in fade-in slide-in-from-top-1 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            {notification.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            {notification.type === 'info' && (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            aria-label={t.closeModal}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary Responsive Controls Container */}
      {periodMode === 'month' ? (
        /* Calendar Month Mode: Two independent layout groups (Mode Switcher on Left, Navigation Group on Right) */
        <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 w-full">
          {/* Area A: Mode Switcher (Left on md+, centered on mobile) */}
          {onTogglePeriodMode && (
            <div className="w-full sm:w-auto shrink-0 flex justify-center md:justify-start">
              <div className="flex items-stretch gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-auto">
                {/* Calendar Month Button */}
                <button
                  type="button"
                  onClick={() => onTogglePeriodMode('month')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] h-full bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                >
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-snug text-center">{t.calendarMonth}</span>
                </button>

                {/* Spending Cycle Button */}
                <button
                  type="button"
                  onClick={() => onTogglePeriodMode('cycle')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] h-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <RotateCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-snug text-center">{t.spendingCycle}</span>
                  {cycles.some((c) => c.endDate === null) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Area B: Navigation Group (Right on md+, centered on mobile) */}
          <div className="w-full md:w-auto shrink-0 flex items-center justify-center md:justify-end min-w-0">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0">
              {/* Previous Month Button */}
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={isMinMonth}
                className="w-10 h-10 min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                title={t.previousMonth}
                aria-label={t.previousMonth}
              >
                <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>

              {/* Single Interactive Calendar Month Picker Button */}
              <CalendarMonthPicker
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onSelect={(year, month) => {
                  onSelectYear(year);
                  onSelectMonth(month);
                }}
                lang={lang}
                userId={userId}
                maxYear={maxCalendarYear}
                onMaxYearChange={setMaxCalendarYear}
                className="flex-1 sm:flex-initial min-w-0 shrink sm:min-w-[180px] md:min-w-[200px]"
                buttonClassName="w-full"
              />

              {/* Next Month Button */}
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={isMaxMonth}
                className="w-10 h-10 min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                title={t.nextMonth}
                aria-label={t.nextMonth}
              >
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>

              {/* Compact Action Menu Button [⋯] */}
              {renderActionMenu()}
            </div>
          </div>
        </div>
      ) : (
        /* Mode 2: Spending Cycle View */
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 w-full xl:flex-nowrap">
          {/* Area A: Mode Switcher (order-1 on mobile, tablet, desktop) */}
          {onTogglePeriodMode && (
            <div className="order-1 w-full md:w-auto shrink-0 md:order-1 xl:order-1">
              <div className="flex items-stretch gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full md:w-auto">
                {/* Calendar Month Button */}
                <button
                  type="button"
                  onClick={() => onTogglePeriodMode('month')}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] h-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-snug text-center">{t.calendarMonth}</span>
                </button>

                {/* Spending Cycle Button */}
                <button
                  type="button"
                  onClick={() => onTogglePeriodMode('cycle')}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] h-full bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                >
                  <RotateCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-snug text-center">{t.spendingCycle}</span>
                  {cycles.some((c) => c.endDate === null) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Area C: Contextual Action (Start New Cycle) in Spending Cycle Mode */}
          {/* Mobile (<768px): order-3 (at bottom); Tablet (768–1279px): order-2 ms-auto (Row 1 right); Desktop (1280px+): order-3 (Row 1 right) */}
          {onOpenStartCycle && (
            <div className="order-3 w-full md:w-auto shrink-0 md:order-2 md:ms-auto xl:order-3 xl:ms-0 flex items-center justify-end">
              <button
                type="button"
                onClick={onOpenStartCycle}
                className="w-full md:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98] shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{t.startNewCycle}</span>
              </button>
            </div>
          )}

          {/* Area B: Spending Cycle Navigation Group */}
          {/* Mobile (<768px): order-2 (Row 2); Tablet (768–1279px): order-3 w-full mt-2 (Row 2 centered); Desktop (1280px+): order-2 flex-1 mt-0 (Row 1 center) */}
          <div className="order-2 w-full shrink-0 md:order-3 md:w-full md:mt-2 xl:order-2 xl:w-auto xl:flex-1 xl:mt-0 flex items-center justify-center min-w-0">
            {cycles.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.noCyclesYet}. {t.startFirstCycle}.</span>
                </div>
                {onOpenStartCycle && (
                  <button
                    type="button"
                    onClick={onOpenStartCycle}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.startNewCycle}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0">
                {/* Previous Cycle Button */}
                <button
                  type="button"
                  onClick={handlePrevCycle}
                  disabled={currentCycleIndex >= cycles.length - 1}
                  className="w-10 h-10 min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title={t.olderCycle}
                  aria-label={t.olderCycle}
                >
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </button>

                {/* Central Interactive Spending Cycle Selector & Picker */}
                {currentCycle && (
                  <div className="relative flex-1 sm:flex-initial min-w-0 sm:min-w-[260px] md:min-w-[280px] lg:min-w-[300px] xl:min-w-[320px] sm:max-w-lg" ref={cyclePickerRef}>
                    <button
                      ref={cyclePickerButtonRef}
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        setIsCyclePickerOpen((prev) => !prev);
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={isCyclePickerOpen}
                      aria-label={t.selectSpendingCycle || t.spendingCycle}
                      className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 md:px-4 py-2 min-h-[44px] rounded-xl border transition-all shadow-2xs min-w-0 cursor-pointer active:scale-[0.99] select-none ${
                        isCyclePickerOpen
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-500/20'
                          : 'bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border-emerald-200/70 dark:border-emerald-800/50'
                      }`}
                    >
                      <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      
                      {/* Standard date display (414px+, tablet, desktop): e.g. "25 Sep 2026 → Present" */}
                      <span className="hidden min-[414px]:inline text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] tracking-tight whitespace-nowrap text-center">
                        {formatDateRange(currentCycle.startDate, currentCycle.endDate, lang, {
                          includeActiveTag: false,
                          includeYear: true,
                        })}
                      </span>

                      {/* Compact date display on narrow mobile (320px–413px): e.g. "25 Sep → Present" */}
                      <span className="inline min-[414px]:hidden text-[10.5px] min-[360px]:text-[11px] font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] tracking-tight whitespace-nowrap text-center">
                        {formatDateRange(currentCycle.startDate, currentCycle.endDate, lang, {
                          includeActiveTag: false,
                          includeYear: false,
                        })}
                      </span>

                      {currentCycle.endDate === null && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] min-[360px]:text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 ml-1 sm:ml-1.5">
                          {t.activeCycle}
                        </span>
                      )}

                      {cycles.length > 1 && (
                        <ChevronDown
                          className={`hidden sm:inline w-3.5 h-3.5 text-emerald-600/80 dark:text-emerald-400/80 shrink-0 transition-transform duration-150 ${
                            isCyclePickerOpen ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>

                    {/* Cycle Picker Popover Dropdown (Centered Below Selector) */}
                    {isCyclePickerOpen && (
                      <div
                        role="listbox"
                        aria-label={t.selectSpendingCycle || t.spendingCycle}
                        className={`absolute top-full mt-1.5 z-50 w-72 sm:w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100 ${
                          isRTL
                            ? 'right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2'
                            : 'left-0 sm:left-auto sm:left-1/2 sm:-translate-x-1/2'
                        }`}
                      >
                        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                          <div className="flex items-center gap-1.5">
                            <RotateCw className="w-3 h-3 text-emerald-500" />
                            <span>{t.spendingCycles}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {cycles.length}
                          </span>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1 p-0.5">
                          {cycles.map((c) => {
                            const isSelected = c.id === currentCycle.id;
                            const isActive = c.endDate === null;
                            const dateRangeText = formatDateRange(c.startDate, c.endDate, lang, {
                              includeActiveTag: false,
                              includeYear: true,
                            });

                            return (
                              <button
                                key={c.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  if (onSelectCycle) onSelectCycle(c.id);
                                  setIsCyclePickerOpen(false);
                                }}
                                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors text-start cursor-pointer focus:outline-hidden ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-bold border border-emerald-200/70 dark:border-emerald-800/60'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-transparent'
                                }`}
                              >
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="truncate">{dateRangeText}</span>
                                    {isActive && (
                                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider shrink-0">
                                        {t.activeCycle}
                                      </span>
                                    )}
                                  </div>
                                  {c.notes && (
                                    <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                      {c.notes}
                                    </span>
                                  )}
                                </div>

                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {onOpenStartCycle && (
                          <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCyclePickerOpen(false);
                                onOpenStartCycle();
                              }}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors text-center cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{t.startNewCycle}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Next Cycle Button */}
                <button
                  type="button"
                  onClick={handleNextCycle}
                  disabled={currentCycleIndex <= 0}
                  className="w-10 h-10 min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title={t.newerCycle}
                  aria-label={t.newerCycle}
                >
                  <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </button>

                {/* Compact Action Menu Button [⋯] */}
                {renderActionMenu()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contextual Confirmation Dialog: Reset Month Configuration */}
      <ResetMonthConfirmModal
        isOpen={isConfirmingResetMonth}
        onClose={() => setIsConfirmingResetMonth(false)}
        onConfirm={handleConfirmResetMonth}
        year={selectedYear}
        month={selectedMonth}
        isCycleDerived={isMonthCycleDerived}
        lang={lang}
        isResetting={isResettingMonth}
      />

      {/* Contextual Confirmation Dialog: Delete Month Data */}
      <DeleteMonthConfirmModal
        isOpen={isConfirmingDeleteMonth}
        onClose={() => setIsConfirmingDeleteMonth(false)}
        onConfirm={handleConfirmDeleteMonth}
        year={selectedYear}
        month={selectedMonth}
        expenseCount={monthExpenseCount}
        lang={lang}
        isDeleting={isDeletingMonth}
      />

      {/* Contextual Confirmation Dialog: Reset Spending Cycle */}
      <ResetCycleConfirmModal
        isOpen={isConfirmingResetCycle}
        onClose={() => setIsConfirmingResetCycle(false)}
        onConfirm={handleConfirmResetCycle}
        cycle={currentCycle}
        activeCycleId={selectedCycleId}
        lang={lang}
        isResetting={isResettingCycle}
      />

      {/* Contextual Confirmation Dialog: Delete Spending Cycle */}
      <DeleteCycleConfirmModal
        isOpen={isConfirmingDeleteCycle}
        onClose={() => {
          setIsConfirmingDeleteCycle(false);
          setCycleDeleteError(null);
        }}
        onConfirm={handleConfirmDeleteCycle}
        cycle={currentCycle}
        activeCycleId={selectedCycleId}
        lang={lang}
        isDeleting={isDeletingCycle}
        error={cycleDeleteError}
      />
    </div>
  );
};
