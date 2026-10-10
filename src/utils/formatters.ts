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

import { Currency, CURRENCIES } from '../types/finance';

let activeCurrencyGlobal: Currency = 'EUR';

export function setActiveCurrencyGlobal(c: Currency): void {
  if (c === 'EUR' || c === 'USD' || c === 'EGP') {
    activeCurrencyGlobal = c;
  }
}

export function getActiveCurrencyGlobal(): Currency {
  return activeCurrencyGlobal;
}

export function getCurrencySymbol(c: Currency = activeCurrencyGlobal): string {
  return CURRENCIES[c]?.symbol || '€';
}

export function getMaskedBankAmount(currency: Currency = activeCurrencyGlobal): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}••••••`;
}

export const MASKED_BANK_AMOUNT = '€••••••';

/**
 * Format a numeric amount as currency string with 2 decimals.
 * NEVER alters or converts the numeric value - purely a display/presentation formatter.
 */
export function formatMoney(
  amount: number,
  currency: Currency = activeCurrencyGlobal,
  locale = 'en-US'
): string {
  const symbol = getCurrencySymbol(currency);

  if (isNaN(amount) || amount === null || amount === undefined) {
    if (locale.startsWith('de')) {
      return `0,00 ${symbol}`;
    }
    return `${symbol}0.00`;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const numLocale = locale.startsWith('de') ? 'de-DE' : 'en-US';
  const formattedNum = new Intl.NumberFormat(numLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  const sign = isNegative ? '-' : '';

  if (locale.startsWith('de')) {
    // German standard: "6.450,00 €", "6.450,00 $", "6.450,00 E£"
    return `${sign}${formattedNum} ${symbol}`;
  }

  // English, Arabic & international standard: "€6,450.00", "$6,450.00", "E£6,450.00"
  // For negative: "-€6,450.00", "-$6,450.00", "-E£6,450.00"
  return `${sign}${symbol}${formattedNum}`;
}

/**
 * Format a number as currency with 2 decimals using active currency.
 * Backwards-compatible alias delegating directly to formatMoney.
 */
export function formatEUR(
  amount: number,
  locale = 'en-US',
  currency: Currency = activeCurrencyGlobal
): string {
  return formatMoney(amount, currency, locale);
}

/**
 * Format a bank monetary amount, or return masked representation if in privacy mode.
 */
export function formatBankAmount(
  amount: number,
  isPrivate = false,
  locale = 'en-US',
  currency: Currency = activeCurrencyGlobal
): string {
  if (isPrivate) {
    return getMaskedBankAmount(currency);
  }
  return formatMoney(amount, currency, locale);
}

/**
 * Format a signed bank amount (+ / -), or masked with sign if in privacy mode.
 */
export function formatSignedBankAmount(
  amount: number,
  isPrivate = false,
  locale = 'en-US',
  currency: Currency = activeCurrencyGlobal
): string {
  if (isPrivate) {
    const masked = getMaskedBankAmount(currency);
    if (amount < 0) return `-${masked}`;
    if (amount > 0) return `+${masked}`;
    return masked;
  }
  const prefix = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${prefix}${formatMoney(Math.abs(amount), currency, locale)}`;
}

/**
 * Format target progress percentage, or masked if in privacy mode.
 */
export function formatBankProgress(progress: number, isPrivate = false): string {
  if (isPrivate) {
    return '••%';
  }
  return `${progress.toFixed(0)}%`;
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
 * Return date string YYYY-MM-DD for exactly ONE DAY BEFORE the input dateStr (YYYY-MM-DD).
 * Uses UTC Date arithmetic to prevent any daylight-saving or local timezone offsets.
 */
export function getPreviousDayString(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  const prevYear = date.getUTCFullYear();
  const prevMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const prevDay = String(date.getUTCDate()).padStart(2, '0');
  return `${prevYear}-${prevMonth}-${prevDay}`;
}

/**
 * Format a human-readable date e.g. "25 Sep 2026" or "25 Sep"
 */
export function formatDateReadable(
  dateStr: string,
  lang: 'en' | 'ar' | 'de' = 'en',
  includeYear: boolean = true
): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const months =
    lang === 'ar' ? MONTH_NAMES_AR : lang === 'de' ? MONTH_NAMES_DE : MONTH_NAMES_EN;
  const monthName = months[m - 1] || '';
  if (lang === 'ar') {
    return includeYear ? `${d} ${monthName} ${y}` : `${d} ${monthName}`;
  }
  return includeYear ? `${d} ${monthName.slice(0, 3)} ${y}` : `${d} ${monthName.slice(0, 3)}`;
}

export interface FormatDateRangeOptions {
  includeActiveTag?: boolean; // Deprecated: active tags are omitted in favor of dedicated badges
  includeYear?: boolean;      // When false, returns "25 Sep → Present" instead of "25 Sep 2026 → Present"
}

/**
 * Format a cycle date range (e.g. "25 Sep 2026 → Present" or "25 Sep 2026 – 23 Oct 2026")
 */
export function formatDateRange(
  startDate: string,
  endDate: string | null,
  lang: 'en' | 'ar' | 'de' = 'en',
  options?: FormatDateRangeOptions
): string {
  const includeYear = options?.includeYear ?? true;
  const start = formatDateReadable(startDate, lang, includeYear);
  if (!endDate) {
    const activeLabel =
      lang === 'ar' ? 'مستمرة' : lang === 'de' ? 'Laufend' : 'Present';
    return `${start} → ${activeLabel}`;
  }
  const end = formatDateReadable(endDate, lang, includeYear);
  return `${start} – ${end}`;
}

/**
 * Calculate total days between start date and end date (inclusive).
 * If endDate is null, calculates from startDate through today.
 */
export function calculateDaysInCycle(startDate: string, endDate?: string | null): number {
  if (!startDate) return 0;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  let endMs: number;
  if (endDate) {
    const [ey, em, ed] = endDate.split('-').map(Number);
    endMs = Date.UTC(ey, em - 1, ed);
  } else {
    const now = new Date();
    endMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const diffTime = Math.max(0, endMs - startMs);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

/**
 * Return today's ISO date string (YYYY-MM-DD) based on the user's local device/browser clock.
 * Uses local getFullYear(), getMonth() + 1, and getDate() to prevent any UTC midnight shifting bugs.
 */
export function getTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

