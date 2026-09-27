import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  Wallet,
  LayoutDashboard,
  Receipt,
  Repeat,
  BarChart3,
  Store,
  Layers,
  HardDrive,
  Plus,
  Zap,
  Moon,
  Sun,
  Check,
  LogOut,
  Cloud,
  FlaskConical,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  Language,
  translations,
  AVAILABLE_LANGUAGES,
} from '../utils/i18n';
import { FlagIcon } from './FlagIcon';

export type ActiveTab =
  | 'dashboard'
  | 'expenses'
  | 'fixed'
  | 'comparison'
  | 'stores'
  | 'categories'
  | 'backup';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onOpenAddExpense: () => void;
  onOpenFastBatch: () => void;
  user?: User | null;
  onLogout?: () => void;
  onOpenTestData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  lang,
  setLang,
  darkMode,
  setDarkMode,
  onOpenAddExpense,
  onOpenFastBatch,
  user,
  onLogout,
  onOpenTestData,
}) => {
  const t = translations[lang];
  // Sidebar hidden by default on all screen sizes, including desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Language dropdown menu state for desktop header
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close sidebar or language dropdown on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLangDropdownOpen) setIsLangDropdownOpen(false);
        if (isSidebarOpen) setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, isLangDropdownOpen]);

  // Click outside to close desktop language dropdown
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

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { id: 'expenses', label: t.expenses, icon: <Receipt className="w-4 h-4 shrink-0" /> },
    { id: 'fixed', label: t.fixedHub, icon: <Repeat className="w-4 h-4 shrink-0" /> },
    { id: 'comparison', label: t.comparison, icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
    { id: 'stores', label: t.stores, icon: <Store className="w-4 h-4 shrink-0" /> },
    { id: 'categories', label: t.categories, icon: <Layers className="w-4 h-4 shrink-0" /> },
    { id: 'backup', label: t.settings, icon: <HardDrive className="w-4 h-4 shrink-0" /> },
  ];

  const handleSelectNav = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    // Automatically close sidebar on smaller screens
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const currentLangObj =
    AVAILABLE_LANGUAGES.find((l) => l.code === lang) || AVAILABLE_LANGUAGES[1];

  // Reusable Kassa Finance branding matching identical typography, icon, weight, size, spacing, and green accent
  const BrandLogo = () => (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20 shrink-0 font-bold">
        <Wallet className="w-4 h-4" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
          Kassa
        </span>
        <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold font-['Plus_Jakarta_Sans',sans-serif]">
          Finance
        </span>
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* Main Header Container: Adapts dynamically between mobile 2-tier and tablet/desktop single-bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            
            {/* Top Tier on mobile / Left group on tablet & desktop: Menu Toggle + Kassa Finance Branding */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Accessible Menu / Hamburger Button */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  aria-label={isSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
                  aria-expanded={isSidebarOpen}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-colors shrink-0"
                  title="Navigation Menu"
                >
                  {isSidebarOpen ? (
                    <X className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                  ) : (
                    <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                  )}
                </button>

                {/* Kassa Finance Brand */}
                <BrandLogo />
              </div>
            </div>

            {/* Action Group:
                - On mobile (<640px): Dedicated full-width action row with full labels for ⚡ Quick Batch Add and ＋ Add Expense side-by-side
                - On tablet (640px - 1023px): Positioned on the right with full labels
                - On desktop (>=1024px): Includes ⚡ Quick Batch Add, ＋ Add Expense, Language Selector, and Theme Toggle
            */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              
              {/* ⚡ Quick Batch Add (Full icon AND full text on ALL screens, never converted to icon-only) */}
              <button
                type="button"
                onClick={onOpenFastBatch}
                title={t.batchAdd}
                aria-label={t.batchAdd}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 rounded-xl transition-all shadow-2xs active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="whitespace-nowrap">{t.batchAdd}</span>
              </button>

              {/* ＋ Add Expense (Full icon AND full text on ALL screens, never converted to icon-only) */}
              <button
                type="button"
                onClick={onOpenAddExpense}
                title={t.addExpense}
                aria-label={t.addExpense}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs shadow-emerald-600/30 transition-all"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{t.addExpense}</span>
              </button>

              {/* Desktop-Only Secondary Controls (Language & Theme):
                  Displayed in header on desktop (>=1024px).
                  Moved into Sidebar on smaller screens to avoid duplication and overcrowding.
              */}
              <div className="hidden lg:flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
                {/* Language Dropdown Selector with Pure SVG Country Flags */}
                <div className="relative shrink-0" ref={langDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                    aria-label={`Language: ${currentLangObj.label}`}
                    aria-haspopup="true"
                    aria-expanded={isLangDropdownOpen}
                    title={`Language: ${currentLangObj.label}`}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-colors shrink-0 shadow-2xs"
                  >
                    <FlagIcon code={lang} className="w-5 h-3.5 rounded-xs" />
                  </button>

                  {isLangDropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
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
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
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
                  aria-label={
                    darkMode
                      ? lang === 'ar'
                        ? 'التبديل إلى الوضع الفاتح'
                        : lang === 'de'
                        ? 'Zum hellen Modus wechseln'
                        : 'Switch to light mode'
                      : lang === 'ar'
                      ? 'التبديل إلى الوضع الداكن'
                      : lang === 'de'
                      ? 'Zum dunklen Modus wechseln'
                      : 'Switch to dark mode'
                  }
                  title={
                    darkMode
                      ? lang === 'ar'
                        ? 'الوضع الفاتح'
                        : lang === 'de'
                        ? 'Heller Modus'
                        : 'Light mode'
                      : lang === 'ar'
                      ? 'الوضع الداكن'
                      : lang === 'de'
                      ? 'Dunkler Modus'
                      : 'Dark mode'
                  }
                  className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-colors shrink-0 shadow-2xs"
                >
                  {darkMode ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-700" />
                  )}
                </button>

                {/* User Account & Sign Out on Desktop */}
                {user && (
                  <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs"
                      title={`${user.displayName || user.email || ''} (${t.cloudSync})`}
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="avatar"
                          className="w-5 h-5 rounded-full object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="hidden xl:inline text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[110px] truncate">
                        {user.displayName || user.email?.split('@')[0]}
                      </span>
                      <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </div>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={onLogout}
                        title={t.signOut}
                        aria-label={t.signOut}
                        className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs shrink-0 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* Subtle Backdrop / Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* Responsive Hidden Slide-in Sidebar (Smoothly slides in from the left) */}
      <aside
        aria-label="Sidebar Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header with Identical Kassa Finance Branding */}
        <div className="flex items-center justify-between h-14 sm:h-16 px-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <BrandLogo />

          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items (NO duplicate Quick Batch Add or Add Expense) */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {/* Dedicated Secondary Action: Test Data (September 2026 Scenario) */}
          {onOpenTestData && (
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsSidebarOpen(false);
                  }
                  onOpenTestData();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 border border-amber-200/60 dark:border-amber-800/40 transition-all cursor-pointer group shadow-2xs"
                title={t.testDataTitle}
              >
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left rtl:text-right min-w-0">
                  <span className="font-semibold text-xs text-amber-900 dark:text-amber-200 truncate">
                    {t.testDataTitle}
                  </span>
                  <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 truncate">
                    {lang === 'ar'
                      ? 'سيناريو سبتمبر 2026'
                      : lang === 'de'
                      ? 'Sep 2026 Testszenario'
                      : 'Sep 2026 Scenario'}
                  </span>
                </div>
              </button>
            </div>
          )}
        </nav>

        {/* Sidebar Preferences/Settings Section:
            Displayed in the sidebar ONLY on small/medium screens (<1024px) where they are removed from the header.
            Hidden on desktop (>=1024px) where they reside in the top header.
            NO DUPLICATION between header and sidebar!
        */}
        <div className="block lg:hidden p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
          {/* User Profile in Sidebar (Mobile / Tablet) */}
          {user && (
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-medium shrink-0">
                  <Cloud className="w-2.5 h-2.5" />
                  <span>Cloud</span>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.signOut}</span>
                </button>
              )}
            </div>
          )}

          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            Preferences
          </div>

          {/* Language Selector in Sidebar (Mobile / Tablet) */}
          <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-1">
              Language
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {AVAILABLE_LANGUAGES.map((langOpt) => (
                <button
                  key={langOpt.code}
                  type="button"
                  onClick={() => setLang(langOpt.code)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    lang === langOpt.code
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300/40 dark:border-emerald-700/40 shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={langOpt.label}
                >
                  <FlagIcon code={langOpt.code} className="w-4 h-3 rounded-2xs" />
                  <span className="text-[11px] font-medium truncate">{langOpt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle in Sidebar (Mobile / Tablet) */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-between py-2 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {darkMode ? 'Active: Dark' : 'Active: Light'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
