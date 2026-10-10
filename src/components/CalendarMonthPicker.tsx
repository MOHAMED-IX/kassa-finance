import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import {
  MONTH_NAMES_AR,
  MONTH_NAMES_DE,
  MONTH_NAMES_EN,
} from '../utils/formatters';
import {
  MIN_CALENDAR_YEAR,
  DEFAULT_MAX_CALENDAR_YEAR,
  getLocalMaxCalendarYear,
  saveLocalMaxCalendarYear,
  getAvailableCalendarYears,
} from '../utils/calendarRange';

export interface CalendarMonthPickerProps {
  selectedYear: number;
  selectedMonth: number;
  onSelect: (year: number, month: number) => void;
  lang: Language;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
  onMaxYearChange?: (maxYear: number) => void;
  userId?: string;
  id?: string;
  ariaLabel?: string;
  align?: 'center' | 'left' | 'right';
  showCurrentMonthButton?: boolean;
}

export const CalendarMonthPicker: React.FC<CalendarMonthPickerProps> = ({
  selectedYear,
  selectedMonth,
  onSelect,
  lang,
  className = '',
  buttonClassName = '',
  disabled = false,
  minYear = MIN_CALENDAR_YEAR,
  maxYear,
  onMaxYearChange,
  userId,
  id,
  ariaLabel,
  align = 'center',
  showCurrentMonthButton = true,
}) => {
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const months =
    lang === 'ar'
      ? MONTH_NAMES_AR
      : lang === 'de'
      ? MONTH_NAMES_DE
      : MONTH_NAMES_EN;

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(selectedYear);
  const [isYearListOpen, setIsYearListOpen] = useState(false);

  // Dynamic maximum year with UID-scoped persistence
  const [effectiveMaxYear, setEffectiveMaxYear] = useState<number>(() => {
    if (typeof maxYear === 'number' && maxYear >= DEFAULT_MAX_CALENDAR_YEAR) {
      return maxYear;
    }
    return getLocalMaxCalendarYear(userId);
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);
  const yearListScrollRef = useRef<HTMLDivElement>(null);

  // Keep effectiveMaxYear in sync if maxYear prop changes
  useEffect(() => {
    if (typeof maxYear === 'number' && maxYear >= DEFAULT_MAX_CALENDAR_YEAR) {
      setEffectiveMaxYear(maxYear);
    }
  }, [maxYear]);

  // Sync viewYear when popover opens or selectedYear changes
  useEffect(() => {
    if (isOpen) {
      setViewYear(selectedYear);
      setIsYearListOpen(false);
    }
  }, [isOpen, selectedYear]);

  // Handle outside click and escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // If year list is open and click was outside year list, close year list first
      if (
        isYearListOpen &&
        yearListRef.current &&
        !yearListRef.current.contains(e.target as Node)
      ) {
        setIsYearListOpen(false);
        return;
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsYearListOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isYearListOpen) {
          setIsYearListOpen(false);
        } else {
          setIsOpen(false);
          triggerButtonRef.current?.focus();
        }
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
  }, [isOpen, isYearListOpen]);

  const handleYearChange = (newYear: number) => {
    if (newYear >= minYear && newYear <= effectiveMaxYear) {
      setViewYear(newYear);
    }
  };

  const handleSelectMonth = (monthNumber: number) => {
    onSelect(viewYear, monthNumber);
    setIsOpen(false);
    setIsYearListOpen(false);
    triggerButtonRef.current?.focus();
  };

  // Extend future years by +1 and auto-scroll
  const handleAddFutureYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMax = effectiveMaxYear + 1;
    setEffectiveMaxYear(nextMax);
    saveLocalMaxCalendarYear(nextMax, userId);
    if (onMaxYearChange) {
      onMaxYearChange(nextMax);
    }
    // Auto-scroll the year list so the newly added year and button are visible
    setTimeout(() => {
      if (yearListScrollRef.current) {
        yearListScrollRef.current.scrollTop =
          yearListScrollRef.current.scrollHeight;
      }
    }, 40);
  };

  const selectedMonthName = months[selectedMonth - 1] || '';

  // Calculate current real-world date for subtle indicator
  const today = new Date();
  const currentRealYear = today.getFullYear();
  const currentRealMonth = today.getMonth() + 1;

  // Available selectable years starting at MIN_CALENDAR_YEAR (2026) up to effectiveMaxYear
  const availableYears = getAvailableCalendarYears(effectiveMaxYear).filter(
    (y) => y >= minYear
  );

  // Determine alignment styling for popover
  const alignmentClass =
    align === 'left'
      ? isRTL
        ? 'right-0'
        : 'left-0'
      : align === 'right'
      ? isRTL
        ? 'left-0'
        : 'right-0'
      : isRTL
      ? 'right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2'
      : 'left-0 sm:left-auto sm:left-1/2 sm:-translate-x-1/2';

  return (
    <div
      ref={containerRef}
      className={`relative ${className || 'inline-block'}`}
      id={id}
    >
      {/* Trigger Button: [ 📅 September 2026 ] */}
      <button
        ref={triggerButtonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || t.selectCalendarMonth}
        className={`flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 sm:px-4 py-2 min-h-[44px] rounded-xl border transition-all shadow-2xs cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
          isOpen
            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20'
            : 'border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-slate-100/70 dark:hover:bg-slate-800'
        } ${buttonClassName}`}
      >
        <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate text-center">
          {selectedMonthName} {selectedYear}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
          }`}
        />
      </button>

      {/* Popover Calendar Month Picker Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.selectCalendarMonth}
          className={`absolute top-full mt-1.5 z-50 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-100 ${alignmentClass}`}
        >
          {/* Header: [ ‹ ] [ Year Selector ] [ › ] */}
          <div className="relative flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
            {/* Previous Year Button (disabled at 2026) */}
            <button
              type="button"
              onClick={() => handleYearChange(viewYear - 1)}
              disabled={viewYear <= minYear}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95 shadow-2xs shrink-0"
              title={t.previousYear}
              aria-label={t.previousYear}
            >
              <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Year Selection Pill with expandable Year List */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsYearListOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isYearListOpen}
                aria-label={t.year}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs select-none ${
                  isYearListOpen
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                }`}
              >
                <span>{viewYear}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${
                    isYearListOpen ? 'rotate-180 text-emerald-600' : ''
                  }`}
                />
              </button>

              {/* Scrollable Year Selection Popover with "+ Add Future Year" */}
              {isYearListOpen && (
                <div
                  ref={yearListRef}
                  role="listbox"
                  aria-label={t.year}
                  className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-30 w-44 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* Fixed-height internally scrolling year list */}
                  <div
                    ref={yearListScrollRef}
                    className="max-h-48 overflow-y-auto space-y-0.5 p-0.5 scroll-smooth overscroll-contain"
                  >
                    {availableYears.map((y) => {
                      const isCurrentView = y === viewYear;
                      return (
                        <button
                          key={y}
                          type="button"
                          role="option"
                          aria-selected={isCurrentView}
                          onClick={() => {
                            setViewYear(y);
                            setIsYearListOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-start ${
                            isCurrentView
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-200/70 dark:border-emerald-800/60'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold border border-transparent'
                          }`}
                        >
                          <span>{y}</span>
                          {isCurrentView && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Clean Divider */}
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  {/* Subtle "+ Add Future Year" Button */}
                  <button
                    type="button"
                    onClick={handleAddFutureYear}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer active:scale-95 text-center"
                    title={t.addFutureYear}
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.addFutureYear}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Next Year Button (disabled when reaching effectiveMaxYear until future year added) */}
            <button
              type="button"
              onClick={() => handleYearChange(viewYear + 1)}
              disabled={viewYear >= effectiveMaxYear}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95 shadow-2xs shrink-0"
              title={t.nextYear}
              aria-label={t.nextYear}
            >
              <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* 12-Month Grid: 3 columns x 4 rows */}
          <div className="grid grid-cols-3 gap-1.5 p-0.5">
            {months.map((mName, idx) => {
              const monthNum = idx + 1;
              const isSelected =
                monthNum === selectedMonth && viewYear === selectedYear;
              const isCurrentRealMonth =
                monthNum === currentRealMonth && viewYear === currentRealYear;

              return (
                <button
                  key={monthNum}
                  type="button"
                  onClick={() => handleSelectMonth(monthNum)}
                  className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs transition-all cursor-pointer select-none active:scale-95 focus:outline-hidden relative ${
                    isSelected
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-semibold border border-transparent'
                  } ${
                    isCurrentRealMonth && !isSelected
                      ? 'ring-1 ring-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                      : ''
                  }`}
                >
                  <span className="truncate w-full text-center">{mName}</span>
                  {isCurrentRealMonth && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-emerald-500'
                      }`}
                      title={t.currentMonth}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Optional Footer: Fast jump to Current Month */}
          {showCurrentMonthButton && (
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const targetY = Math.min(
                    Math.max(now.getFullYear(), minYear),
                    effectiveMaxYear
                  );
                  const targetM = now.getMonth() + 1;
                  onSelect(targetY, targetM);
                  setIsOpen(false);
                  setIsYearListOpen(false);
                  triggerButtonRef.current?.focus();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer text-center"
              >
                <span>{t.currentMonth}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
