import React, { useState, useEffect, useRef } from 'react';
import { Wallet, ShieldCheck, Cloud, Database, Sun, Moon, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Language, translations, AVAILABLE_LANGUAGES } from '../utils/i18n';
import { FlagIcon } from './FlagIcon';

interface AuthSignInScreenProps {
  lang: Language;
  setLang: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
}

export const AuthSignInScreen: React.FC<AuthSignInScreenProps> = ({
  lang,
  setLang,
  darkMode,
  setDarkMode,
}) => {
  const { loginWithGoogle, loading, error } = useAuth();
  const t = translations[lang];

  // Language dropdown menu state (matching Navbar implementation)
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLangDropdownOpen) {
        setIsLangDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLangDropdownOpen]);

  // Click outside to close language dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(e.target as Node)
      ) {
        setIsLangDropdownOpen(false);
      }
    };
    if (isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangDropdownOpen]);

  const currentLangObj =
    AVAILABLE_LANGUAGES.find((l) => l.code === lang) || AVAILABLE_LANGUAGES[1];

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`${
        darkMode ? 'dark ' : ''
      }min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]`}
    >
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3 shrink-0">
        
        {/* Brand: Logo & Name strictly on ONE single horizontal line */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20 shrink-0 font-bold">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1 shrink-0 whitespace-nowrap">
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Kassa
            </span>
            <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold font-['Plus_Jakarta_Sans',sans-serif]">
              Finance
            </span>
          </div>
        </div>

        {/* Header Controls: Flag Dropdown & Theme Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Flag Dropdown (NO two-letter text codes) */}
          <div className="relative shrink-0" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLangDropdownOpen((prev) => !prev)}
              aria-label={`Language: ${currentLangObj.label}`}
              aria-haspopup="true"
              aria-expanded={isLangDropdownOpen}
              title={`Language: ${currentLangObj.label}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-colors shrink-0 shadow-2xs cursor-pointer bg-white dark:bg-slate-900"
            >
              <FlagIcon code={lang} className="w-5 h-3.5 rounded-xs" />
            </button>

            {isLangDropdownOpen && (
              <div
                className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1.5 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                role="menu"
              >
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Language
                </div>
                {AVAILABLE_LANGUAGES.map((langOpt) => (
                  <button
                    key={langOpt.code}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setLang(langOpt.code);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      lang === langOpt.code
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FlagIcon code={langOpt.code} className="w-5 h-3.5 rounded-xs" />
                      <span>{langOpt.label}</span>
                    </div>
                    {lang === langOpt.code && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
            className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-colors shrink-0 shadow-2xs cursor-pointer bg-white dark:bg-slate-900"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-4 sm:py-6">
        <div className="max-w-[420px] w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-lg shadow-slate-200/50 dark:shadow-none space-y-5">
          
          {/* Headline & Branding */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 mx-auto shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-normal sm:whitespace-nowrap">
                {lang === 'ar'
                  ? 'مرحباً بك في كاسّا فاينانس'
                  : lang === 'de'
                  ? 'Willkommen bei Kassa Finance'
                  : 'Welcome to Kassa Finance'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                {lang === 'ar'
                  ? 'إدارة مالية شخصية متكاملة مع مزامنة سحابية آمنة'
                  : lang === 'de'
                  ? 'Persönliche Finanzverwaltung mit sicherer Cloud-Synchronisation'
                  : 'Personal finance ledger with secure cloud synchronization'}
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs text-center">
              {error}
            </div>
          )}

          {/* Primary Action: Sign in with Google */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {/* Google G Logo SVG */}
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>
                {loading
                  ? lang === 'ar'
                    ? 'جارٍ الاتصال...'
                    : lang === 'de'
                    ? 'Verbinde...'
                    : 'Signing in...'
                  : lang === 'ar'
                  ? 'المتابعة باستخدام Google'
                  : lang === 'de'
                  ? 'Mit Google fortfahren'
                  : 'Continue with Google'}
              </span>
            </button>
            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
              {lang === 'ar'
                ? 'بياناتك المالية محمية ومعزولة تماماً في حسابك الشخصي.'
                : lang === 'de'
                ? 'Ihre Finanzdaten sind isoliert und in Ihrem Cloud-Konto geschützt.'
                : 'Your financial data is strictly isolated and protected in your cloud store.'}
            </p>
          </div>

          {/* Feature Highlights: Compact, balanced visual sections */}
          <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs min-w-0">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {lang === 'ar' ? 'عزل كامل للبيانات' : lang === 'de' ? 'Strikte Datenisolation' : 'Complete Data Privacy'}
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight mt-0.5">
                  {lang === 'ar'
                    ? 'قواعد حماية مشددة تمنع أي وصول غير مصرح به.'
                    : lang === 'de'
                    ? 'Hardened Firestore-Regeln garantieren private Datenhaltung.'
                    : 'Hardened Firestore security rules enforce strict per-user isolation.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Cloud className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs min-w-0">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {lang === 'ar' ? 'مزامنة سحابية تلقائية' : lang === 'de' ? 'Automatische Cloud-Synchronisation' : 'Instant Cloud Sync'}
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight mt-0.5">
                  {lang === 'ar'
                    ? 'الوصول إلى سجلاتك من أي جهاز وحاسوب فورياً.'
                    : lang === 'de'
                    ? 'Synchronisiert Ihren Finanzledger nahtlos über alle Geräte.'
                    : 'Seamless ledger access across all your browsers and devices.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs min-w-0">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {lang === 'ar' ? 'ترحيل سلس للبيانات المحلية' : lang === 'de' ? 'Sichere Migration lokaler Daten' : 'Seamless Local Migration'}
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight mt-0.5">
                  {lang === 'ar'
                    ? 'يتم رصد بيانات المتصفح السابقة ونقلها بأمان لحسابك.'
                    : lang === 'de'
                    ? 'Vorhandene Browserdaten werden automatisch erkannt und übertragen.'
                    : 'Existing browser records are detected and safely migrated.'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-3 text-center text-xs text-slate-400 dark:text-slate-600 shrink-0">
        Kassa Finance &copy; 2026 &middot; Personal Finance Ledger
      </footer>
    </div>
  );
};
