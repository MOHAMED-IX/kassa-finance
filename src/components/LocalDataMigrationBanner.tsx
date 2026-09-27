import React, { useState } from 'react';
import { Database, ArrowRight, Check, X, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import { Expense, Category, MonthRecord } from '../types/finance';
import { Language, translations } from '../utils/i18n';

interface LocalDataMigrationBannerProps {
  localExpenses: Expense[];
  localCategories: Category[];
  localMonthRecords: MonthRecord[];
  onConfirmMigration: () => Promise<void>;
  onDismiss: () => void;
  lang: Language;
}

export const LocalDataMigrationBanner: React.FC<LocalDataMigrationBannerProps> = ({
  localExpenses,
  localCategories,
  localMonthRecords,
  onConfirmMigration,
  onDismiss,
  lang,
}) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migratedSuccess, setMigratedSuccess] = useState(false);
  const t = translations[lang];

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      await onConfirmMigration();
      setMigratedSuccess(true);
      setTimeout(() => {
        onDismiss();
      }, 1500);
    } catch (err) {
      console.error('Migration failed:', err);
      alert('Failed to migrate data to cloud. Please check your connection and try again.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="relative mb-5 bg-gradient-to-r from-emerald-500/10 via-emerald-600/10 to-teal-500/10 dark:from-emerald-950/40 dark:via-emerald-900/30 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Info */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-emerald-600/30">
            {migratedSuccess ? (
              <Check className="w-5 h-5 text-white animate-in zoom-in" />
            ) : (
              <Sparkles className="w-5 h-5 text-emerald-100" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'ar'
                  ? 'تم العثور على بيانات محلية في هذا المتصفح'
                  : lang === 'de'
                  ? 'Lokale Daten in diesem Browser gefunden'
                  : 'Existing Local Data Detected'}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 rounded-full">
                {localExpenses.length} {lang === 'ar' ? 'مصاريف' : lang === 'de' ? 'Ausgaben' : 'expenses'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
              {lang === 'ar'
                ? 'هل ترغب في ترحيل سجلاتك وبيانات الميزانية الموجودة على هذا الجهاز إلى حسابك السحابي الآمن؟'
                : lang === 'de'
                ? 'Möchten Sie Ihre auf diesem Gerät gespeicherten Ausgaben und Budgets sicher in Ihr Cloud-Konto übertragen?'
                : 'Would you like to migrate your existing browser records (expenses, categories, and month budgets) to your cloud account so they are accessible anywhere?'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={onDismiss}
            disabled={isMigrating || migratedSuccess}
            className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
          >
            {lang === 'ar' ? 'تخطي' : lang === 'de' ? 'Überspringen' : 'Dismiss'}
          </button>

          <button
            type="button"
            onClick={handleMigrate}
            disabled={isMigrating || migratedSuccess}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isMigrating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {lang === 'ar'
                    ? 'جارٍ الترحيل...'
                    : lang === 'de'
                    ? 'Wird migriert...'
                    : 'Migrating...'}
                </span>
              </>
            ) : migratedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? 'تم الترحيل بنجاح!'
                    : lang === 'de'
                    ? 'Erfolgreich migriert!'
                    : 'Migration Complete!'}
                </span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? 'ترحيل إلى السحابة'
                    : lang === 'de'
                    ? 'In Cloud migrieren'
                    : 'Migrate to Cloud'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
