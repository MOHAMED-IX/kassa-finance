import React, { useState } from 'react';
import { FlaskConical, X, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface TestDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  lang: Language;
}

export const TestDataModal: React.FC<TestDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  lang,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const t = translations[lang];

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsExecuting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Failed to load test dataset:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExecuting) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center shrink-0 shadow-2xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                {t.testDataTitle}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                September 2026 Test Scenario
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t.testDataQuestion}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.testDataDesc}
          </p>

          {/* Test Case Metrics Badge */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Predefined Test Benchmarks:</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div>Income: <span className="font-semibold text-slate-900 dark:text-white">1,186.00 €</span></div>
              <div>Fixed Expenses: <span className="font-semibold text-slate-900 dark:text-white">486.77 €</span></div>
              <div>Lidl Total: <span className="font-semibold text-slate-900 dark:text-white">330.05 €</span></div>
              <div>Total Spent: <span className="font-semibold text-slate-900 dark:text-white">838.92 €</span></div>
              <div className="col-span-2 text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                Saving: <span className="font-bold">347.08 €</span> &middot; Supermarket Budget: <span className="font-bold">-95.15 € (138.1%)</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {lang === 'ar'
                ? 'ملاحظة: سيتم تحديث سجلك السحابي ليطابق بيانات الاختبار بدقة تامة.'
                : lang === 'de'
                ? 'Hinweis: Ihr Cloud-Hauptbuch wird aktualisiert, um exakt dem Testdatensatz zu entsprechen.'
                : 'Note: Your active ledger and cloud database will be updated to match the test scenario.'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-xs shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {lang === 'ar'
                    ? 'جارٍ التحميل...'
                    : lang === 'de'
                    ? 'Wird geladen...'
                    : 'Loading...'}
                </span>
              </>
            ) : (
              <>
                <FlaskConical className="w-3.5 h-3.5" />
                <span>{t.loadTestData}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
