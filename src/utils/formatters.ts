/**
 * Precision formatting utilities for currency, dates, and percentages.
 * Ensures consistent 2-decimal presentation avoiding floating-point rounding errors.
 */

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const MONTH_NAMES_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

/**
 * Format a number as EUR currency (€) with 2 decimals.
 * e.g. 1186 -> "1,186.00 €" or 26.15 -> "26.15 €"
 */
export function formatEUR(amount: number, locale = 'en-US'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0.00 €';
  }
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} €`;
}

/**
 * Round float to 2 decimal places strictly.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Format a percentage, e.g. 138.06%
 */
export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0.0%';
  return `${value.toFixed(2)}%`;
}

/**
 * Format date string (YYYY-MM-DD) to European standard DD.MM.YYYY
 */
export function formatDateEU(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

/**
 * Get current year and month tuple
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // 1-indexed
  };
}
