import React, { useRef, useState } from 'react';
import { Category, Expense, MonthRecord } from '../types/finance';
import { exportToCSV, exportToJSON, parseJSONBackup, BackupData } from '../utils/exportImport';
import { Language, translations } from '../utils/i18n';
import {
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  ShieldCheck,
  Loader2,
  X,
  Database,
  FlaskConical,
} from 'lucide-react';

interface BackupRestoreViewProps {
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
  onRestoreData: (
    expenses: Expense[],
    categories: Category[],
    monthRecords: MonthRecord[]
  ) => Promise<void> | void;
  onResetToTestScenario: () => Promise<void> | void;
  lang: Language;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  expenses,
  categories,
  monthRecords,
  onRestoreData,
  onResetToTestScenario,
  lang,
}) => {
  const t = translations[lang];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Confirmation state for exact restore
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleExportJSON = () => {
    exportToJSON(expenses, categories, monthRecords);
    setNotification({
      type: 'success',
      message: 'JSON backup file exported successfully.',
    });
  };

  const handleExportCSV = () => {
    exportToCSV(expenses, categories);
    setNotification({
      type: 'success',
      message: 'CSV expenses file exported successfully.',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseJSONBackup(content);

      if (result.success && result.data) {
        // Require explicit confirmation before modifying cloud ledger
        setPendingBackup(result.data);
      } else {
        setNotification({
          type: 'error',
          message: result.error || 'Failed to parse and validate backup file.',
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;
    setIsRestoring(true);
    try {
      await onRestoreData(
        pendingBackup.expenses,
        pendingBackup.categories.length > 0 ? pendingBackup.categories : categories,
        pendingBackup.monthRecords.length > 0 ? pendingBackup.monthRecords : monthRecords
      );
      setNotification({
        type: 'success',
        message: `Backup restored successfully! Cloud database matches backup exactly (${pendingBackup.expenses.length} expenses loaded).`,
      });
      setPendingBackup(null);
    } catch (err: any) {
      console.error('Exact restore error:', err);
      setNotification({
        type: 'error',
        message: err?.message || 'Failed to complete cloud restore.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {t.settings}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your financial records are automatically secured in your private cloud Firestore database. Export offline copies anytime.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-medium shrink-0 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cloud Database Active</span>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Official Test Case Verification Card (Item 22) */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.testCaseActive}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              {t.testCaseMatches}
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium shrink-0 self-start sm:self-auto border border-emerald-200 dark:border-emerald-800">
            <FlaskConical className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Available in Sidebar &middot; {t.testDataTitle}</span>
          </div>
        </div>
      </div>

      {/* Export & Import Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Export Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Export Database
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Download your transactions, categories, and monthly budgets for offline archiving or spreadsheets.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV (Excel)</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <FileJson className="w-4 h-4 text-blue-600" />
              <span>Export JSON (Full Backup)</span>
            </button>
          </div>
        </div>

        {/* Import & Restore Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Import & Restore
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Restore previously exported JSON backup files into your cloud ledger and sync automatically.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          <div className="pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Select JSON Backup File</span>
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Modal for Exact Cloud Restore */}
      {pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {lang === 'ar'
                      ? 'تأكيد استعادة النسخة الاحتياطية'
                      : lang === 'de'
                      ? 'Backup-Wiederherstellung bestätigen'
                      : 'Confirm Exact Cloud Restore'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pendingBackup.exportedAt ? `Exported on ${new Date(pendingBackup.exportedAt).toLocaleDateString()}` : 'JSON Backup File'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                disabled={isRestoring}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Notice:</strong>{' '}
              {lang === 'ar'
                ? 'ستجعل عملية الاستعادة بياناتك السحابية مطابقة تماماً لمحتويات هذا الملف. سيتم حذف أي معاملات أو ميزانيات مسجلة حالياً وليست موجودة في هذه النسخة الاحتياطية.'
                : lang === 'de'
                ? 'Dadurch wird Ihr Cloud-Datensatz exakt an diese Sicherungsdatei angepasst. Alle aktuellen Ausgaben oder Budgets, die nicht in dieser Sicherung enthalten sind, werden gelöscht.'
                : 'Restoring this backup will make your cloud ledger match this backup file exactly. Any records currently in your cloud account that are NOT in this backup will be removed.'}
            </div>

            {/* Content summary pills */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-base font-bold text-slate-900 dark:text-white font-mono">
                  {pendingBackup.expenses.length}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {lang === 'ar' ? 'معاملة' : lang === 'de' ? 'Ausgaben' : 'Expenses'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-base font-bold text-slate-900 dark:text-white font-mono">
                  {pendingBackup.categories.length > 0 ? pendingBackup.categories.length : categories.length}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {lang === 'ar' ? 'تصنيف' : lang === 'de' ? 'Kategorien' : 'Categories'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-base font-bold text-slate-900 dark:text-white font-mono">
                  {pendingBackup.monthRecords.length}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {lang === 'ar' ? 'أشهر' : lang === 'de' ? 'Monate' : 'Months'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : lang === 'de' ? 'Abbrechen' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {lang === 'ar'
                        ? 'جارٍ الاستعادة والمزامنة...'
                        : lang === 'de'
                        ? 'Wiederherstellung läuft...'
                        : 'Restoring & Syncing...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ar'
                        ? 'استبدال واستعادة'
                        : lang === 'de'
                        ? 'Exakt wiederherstellen'
                        : 'Exact Replace & Restore'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
