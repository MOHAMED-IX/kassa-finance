import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { MONTH_NAMES_AR, MONTH_NAMES_DE, MONTH_NAMES_EN } from '../utils/formatters';

interface MonthYearSelectorProps {
  selectedYear: number;
  selectedMonth: number;
  onSelectYear: (year: number) => void;
  onSelectMonth: (month: number) => void;
  lang: Language;
}

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  selectedYear,
  selectedMonth,
  onSelectYear,
  onSelectMonth,
  lang,
}) => {
  const t = translations[lang];
  const months =
    lang === 'ar'
      ? MONTH_NAMES_AR
      : lang === 'de'
      ? MONTH_NAMES_DE
      : MONTH_NAMES_EN;

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onSelectMonth(12);
      onSelectYear(selectedYear - 1);
    } else {
      onSelectMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onSelectMonth(1);
      onSelectYear(selectedYear + 1);
    } else {
      onSelectMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-xs mb-6">
      {/* Centered on mobile, spaced between on tablet/desktop */}
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-4">
        
        {/* Navigation Stepper: ‹   📅 September 2026   › */}
        <div className="flex items-center justify-center gap-1.5 shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] whitespace-nowrap">
              {months[selectedMonth - 1]} {selectedYear}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Selectors for Month and Year */}
        <div className="flex items-center justify-center gap-2">
          {/* Month Dropdown */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(Number(e.target.value))}
              aria-label={t.month}
              className="text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              {months.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => onSelectYear(Number(e.target.value))}
              aria-label={t.year}
              className="text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};
