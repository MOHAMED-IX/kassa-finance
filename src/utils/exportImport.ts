import { Category, Expense, MonthRecord } from '../types/finance';

export interface BackupData {
  version: string;
  exportedAt: string;
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
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
  monthRecords: MonthRecord[]
) {
  const data: BackupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    expenses,
    categories,
    monthRecords,
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

    return {
      success: true,
      data: {
        version: parsed.version || '1.0.0',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
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
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'JSON parsing failed';
    return { success: false, error: msg };
  }
}
