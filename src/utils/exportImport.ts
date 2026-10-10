import { Category, Expense, MonthRecord, SpendingCycle, BankTransaction, BankTarget, Currency } from '../types/finance';

export interface BackupData {
  version: string;
  exportedAt: string;
  currency?: Currency;
  categoryOrder?: string[];
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
  spendingCycles?: SpendingCycle[];
  bankTransactions?: BankTransaction[];
  bankTargets?: BankTarget[];
}

/**
 * Download a file in the browser
 */
function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export full database as a structured JSON backup
 */
export function exportToJSON(
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[],
  spendingCycles: SpendingCycle[] = [],
  bankTransactions: BankTransaction[] = [],
  bankTargets: BankTarget[] = [],
  currency: Currency = 'EUR',
  categoryOrder?: string[]
) {
  const data: BackupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    currency,
    categoryOrder,
    expenses,
    categories,
    monthRecords,
    spendingCycles,
    bankTransactions,
    bankTargets,
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const filename = `kassa-backup-${new Date().toISOString().slice(0, 10)}.json`;
  downloadFile(jsonStr, filename, 'application/json');
}

/**
 * Export expenses list as CSV compatible with Excel, Google Sheets, etc.
 */
export function exportToCSV(expenses: Expense[], categories: Category[]) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = [
    'ID',
    'Date (DD.MM.YYYY)',
    'Name',
    'Category',
    'Store / Subcategory',
    'Amount (EUR)',
    'Type',
    'Recurring',
    'Month',
    'Year',
    'Notes',
  ];

  const escapeCSV = (str: string | number | boolean | undefined) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = expenses.map((exp) => {
    const [y, m, d] = exp.date.split('-');
    const dateFormatted = d && m && y ? `${d}.${m}.${y}` : exp.date;
    const catName = catMap.get(exp.categoryId) || 'Other';

    return [
      escapeCSV(exp.id),
      escapeCSV(dateFormatted),
      escapeCSV(exp.name),
      escapeCSV(catName),
      escapeCSV(exp.store),
      exp.amount.toFixed(2),
      escapeCSV(exp.type),
      escapeCSV(exp.isRecurring ? 'Yes' : 'No'),
      exp.month,
      exp.year,
      escapeCSV(exp.notes || ''),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const filename = `kassa-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Validate and parse imported JSON backup
 */
/**
 * Validate and parse imported JSON backup with comprehensive schema validation
 */
export function parseJSONBackup(jsonString: string): {
  success: boolean;
  data?: BackupData;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON file format: root must be an object.' };
    }
    if (!Array.isArray(parsed.expenses)) {
      return { success: false, error: 'Missing or invalid "expenses" array in backup file.' };
    }

    // Validate each expense item
    for (let i = 0; i < parsed.expenses.length; i++) {
      const exp = parsed.expenses[i];
      if (!exp || typeof exp !== 'object') {
        return { success: false, error: `Expense item at index ${i} is not a valid object.` };
      }
      if (!exp.id || typeof exp.id !== 'string') {
        return { success: false, error: `Expense item at index ${i} has an invalid or missing "id".` };
      }
      if (typeof exp.name !== 'string') {
        return { success: false, error: `Expense "${exp.id}" has an invalid "name".` };
      }
      if (typeof exp.amount !== 'number' || isNaN(exp.amount)) {
        return { success: false, error: `Expense "${exp.id}" has an invalid numerical "amount".` };
      }
      if (typeof exp.categoryId !== 'string') {
        return { success: false, error: `Expense "${exp.id}" is missing a valid "categoryId".` };
      }
      if (typeof exp.store !== 'string') {
        return { success: false, error: `Expense "${exp.id}" has an invalid "store".` };
      }
      if (typeof exp.date !== 'string') {
        return { success: false, error: `Expense "${exp.id}" has an invalid "date" string.` };
      }
      if (typeof exp.month !== 'number' || exp.month < 1 || exp.month > 12) {
        return { success: false, error: `Expense "${exp.id}" has an invalid "month" (must be 1–12).` };
      }
      if (typeof exp.year !== 'number' || exp.year < 2000 || exp.year > 2100) {
        return { success: false, error: `Expense "${exp.id}" has an invalid "year".` };
      }
      if (exp.type !== 'fixed' && exp.type !== 'variable') {
        return { success: false, error: `Expense "${exp.id}" has an invalid "type" (must be "fixed" or "variable").` };
      }
    }

    // Validate categories if provided
    const categories: Category[] = [];
    if (Array.isArray(parsed.categories)) {
      for (let i = 0; i < parsed.categories.length; i++) {
        const cat = parsed.categories[i];
        if (!cat || typeof cat !== 'object' || !cat.id || typeof cat.name !== 'string') {
          return { success: false, error: `Category item at index ${i} is malformed.` };
        }
        categories.push({
          id: String(cat.id),
          name: String(cat.name),
          nameAr: cat.nameAr ? String(cat.nameAr) : undefined,
          color: cat.color ? String(cat.color) : '#10B981',
          iconName: cat.iconName ? String(cat.iconName) : 'Layers',
          defaultType: cat.defaultType === 'fixed' ? 'fixed' : 'variable',
          stores: Array.isArray(cat.stores) ? cat.stores.map(String) : [],
        });
      }
    }

    // Validate monthRecords if provided
    const monthRecords: MonthRecord[] = [];
    if (Array.isArray(parsed.monthRecords)) {
      for (let i = 0; i < parsed.monthRecords.length; i++) {
        const mon = parsed.monthRecords[i];
        if (
          !mon ||
          typeof mon !== 'object' ||
          typeof mon.year !== 'number' ||
          typeof mon.month !== 'number' ||
          typeof mon.income !== 'number'
        ) {
          return { success: false, error: `MonthRecord item at index ${i} is malformed.` };
        }
        monthRecords.push({
          year: mon.year,
          month: mon.month,
          income: mon.income,
          budgets: typeof mon.budgets === 'object' && mon.budgets !== null ? mon.budgets : {},
          notes: mon.notes ? String(mon.notes) : undefined,
        });
      }
    }

    // Validate spendingCycles if provided
    const spendingCycles: SpendingCycle[] = [];
    if (Array.isArray(parsed.spendingCycles)) {
      for (let i = 0; i < parsed.spendingCycles.length; i++) {
        const sc = parsed.spendingCycles[i];
        if (!sc || typeof sc !== 'object' || !sc.id || typeof sc.startDate !== 'string') {
          continue;
        }
        spendingCycles.push({
          id: String(sc.id),
          startDate: String(sc.startDate),
          endDate: sc.endDate ? String(sc.endDate) : null,
          income: typeof sc.income === 'number' ? sc.income : null,
          expectedNextCycleIncome: typeof sc.expectedNextCycleIncome === 'number' ? sc.expectedNextCycleIncome : null,
          notes: sc.notes ? String(sc.notes) : undefined,
          budgets: typeof sc.budgets === 'object' && sc.budgets !== null ? sc.budgets : undefined,
          createdAt: typeof sc.createdAt === 'number' ? sc.createdAt : Date.now(),
        });
      }
    }

    // Validate bankTransactions if provided
    const bankTransactions: BankTransaction[] = [];
    if (Array.isArray(parsed.bankTransactions)) {
      for (let i = 0; i < parsed.bankTransactions.length; i++) {
        const tx = parsed.bankTransactions[i];
        if (!tx || typeof tx !== 'object' || !tx.id || typeof tx.amount !== 'number' || !tx.date || !tx.type) {
          continue;
        }
        bankTransactions.push({
          id: String(tx.id),
          type: tx.type,
          amount: Number(tx.amount),
          date: String(tx.date),
          note: tx.note ? String(tx.note) : undefined,
          sourcePeriodMode: tx.sourcePeriodMode ? tx.sourcePeriodMode : undefined,
          sourcePeriodId: tx.sourcePeriodId ? String(tx.sourcePeriodId) : undefined,
          targetId: tx.targetId ? String(tx.targetId) : undefined,
          createdAt: typeof tx.createdAt === 'number' ? tx.createdAt : Date.now(),
          updatedAt: typeof tx.updatedAt === 'number' ? tx.updatedAt : Date.now(),
        });
      }
    }

    // Validate bankTargets if provided
    const bankTargets: BankTarget[] = [];
    if (Array.isArray(parsed.bankTargets)) {
      for (let i = 0; i < parsed.bankTargets.length; i++) {
        const target = parsed.bankTargets[i];
        if (!target || typeof target !== 'object' || !target.id || typeof target.name !== 'string' || typeof target.targetAmount !== 'number') {
          continue;
        }
        bankTargets.push({
          id: String(target.id),
          name: String(target.name),
          targetAmount: Number(target.targetAmount),
          allocatedAmount: typeof target.allocatedAmount === 'number' ? target.allocatedAmount : 0,
          targetDate: target.targetDate ? String(target.targetDate) : undefined,
          icon: target.icon ? String(target.icon) : undefined,
          accent: target.accent ? String(target.accent) : undefined,
          active: target.active !== false,
          completed: Boolean(target.completed),
          createdAt: typeof target.createdAt === 'number' ? target.createdAt : Date.now(),
          updatedAt: typeof target.updatedAt === 'number' ? target.updatedAt : Date.now(),
        });
      }
    }

    const currency: Currency =
      parsed.currency === 'USD' || parsed.currency === 'EGP' || parsed.currency === 'EUR'
        ? parsed.currency
        : 'EUR';

    const categoryOrder: string[] | undefined =
      Array.isArray(parsed.categoryOrder) && parsed.categoryOrder.every((id: any) => typeof id === 'string')
        ? parsed.categoryOrder
        : undefined;

    return {
      success: true,
      data: {
        version: parsed.version || '1.0.0',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        currency,
        categoryOrder,
        expenses: parsed.expenses.map((e: any) => ({
          id: String(e.id),
          name: String(e.name),
          amount: Number(e.amount),
          categoryId: String(e.categoryId),
          store: String(e.store),
          date: String(e.date),
          month: Number(e.month),
          year: Number(e.year),
          isRecurring: Boolean(e.isRecurring),
          type: e.type === 'fixed' ? 'fixed' : 'variable',
          notes: e.notes ? String(e.notes) : undefined,
          createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
        })),
        categories,
        monthRecords,
        spendingCycles,
        bankTransactions,
        bankTargets,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'JSON parsing failed';
    return { success: false, error: msg };
  }
}
