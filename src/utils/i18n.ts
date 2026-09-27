export type Language = 'en' | 'ar' | 'de';

export interface LanguageOption {
  code: Language;
  label: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
];

export const translations = {
  en: {
    appTitle: 'Kassa Finance',
    tagline: 'Personal Finance & Expense Tracker',
    dashboard: 'Dashboard',
    expenses: 'Expenses',
    fixedHub: 'Fixed Expenses',
    comparison: 'Monthly Comparison',
    stores: 'Stores Analysis',
    categories: 'Categories & Budgets',
    settings: 'Backup & Data',

    // Top Controls
    addExpense: 'Add Expense',
    batchAdd: 'Quick Batch Add',
    year: 'Year',
    month: 'Month',
    currentMonth: 'Current Month',

    // Dashboard Cards
    monthlyIncome: 'Monthly Income',
    totalExpenses: 'Total Expenses',
    remainingMoney: 'Saving',
    saving: 'Saving',
    fixedExpensesLabel: 'Fixed Expenses',
    variableExpensesLabel: 'Variable Expenses',
    recurringLabel: 'Recurring Total',
    oneTimeLabel: 'One-Time Total',
    withoutOneTimeSpend: 'Spending Without One-Time',
    withoutOneTimeExplanation: 'Regular baseline without one-off purchases',
    savingsRate: 'Savings Rate',

    // Budget
    budgetsTitle: 'Category Budgets & Spending',
    spent: 'Spent',
    budget: 'Budget',
    remaining: 'Remaining',
    overBudgetWarning: 'Over budget by',
    onTrack: 'Within budget',
    noBudgetSet: 'No budget set',
    setBudget: 'Set Budget',

    // Tables & Lists
    allExpenses: 'All Transactions',
    searchPlaceholder: 'Search name, store, notes (e.g. Lidl, Rent)...',
    filterCategory: 'Category',
    filterStore: 'Store',
    filterType: 'Type',
    filterRecurring: 'Recurring',
    allCategories: 'All Categories',
    allStores: 'All Stores',
    allTypes: 'All Types',
    fixed: 'Fixed',
    variable: 'Variable',
    recurringYes: 'Recurring',
    recurringNo: 'One-Time',
    sortBy: 'Sort by',
    dateDesc: 'Date (Newest)',
    dateAsc: 'Date (Oldest)',
    amountDesc: 'Amount (Highest)',
    amountAsc: 'Amount (Lowest)',

    // Table Headers
    colDate: 'Date',
    colName: 'Name',
    colCategory: 'Category',
    colStore: 'Store',
    colAmount: 'Amount',
    colType: 'Type',
    colRecurring: 'Recurring',
    colActions: 'Actions',

    // Modals
    editExpense: 'Edit Expense',
    addNewExpense: 'Add New Expense',
    expenseName: 'Expense Name',
    amount: 'Amount (€)',
    category: 'Category',
    storeOrSubcategory: 'Store / Subcategory',
    date: 'Date',
    notes: 'Notes (optional)',
    save: 'Save Expense',
    cancel: 'Cancel',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this expense?',

    // Quick Batch
    quickBatchTitle: 'Fast Multi-Expense Entry',
    quickBatchDesc: 'Enter multiple amounts for the same store quickly. Paste lines or separate by spaces or commas.',
    amountsInput: 'Amounts (e.g. 66.25, 17.83, 5.90...)',
    liveBatchTotal: 'Calculated Store Total',
    saveAllTransactions: 'Save Transactions',

    // Recurring
    fixedObligations: 'Monthly Fixed Obligations',
    propagateToNextMonth: 'Copy Recurring to Next Month',
    propagateSuccess: 'Recurring expenses copied to next month!',

    // Verification Test Case Banner
    testCaseActive: 'September 2026 Test Case Loaded',
    testCaseMatches: 'All 7 verification formulas matched precisely (Fixed: 486.77 €, Lidl: 330.05 €, Supermarket: 345.15 €, Total: 838.92 €, Remaining: 347.08 €, Supermarket Budget: -95.15 € / 138.06%).',
    resetToTestCase: 'Reload Sep 2026 Test Dataset',

    // Auth & Cloud
    signOut: 'Sign Out',
    cloudSync: 'Cloud Synced',
    account: 'Account',

    // Test Data
    testDataTitle: 'Test Data',
    testDataQuestion: 'Load the September 2026 test dataset?',
    testDataDesc: 'This will load the official predefined September 2026 test scenario and synchronize your cloud ledger to match it exactly.',
    loadTestData: 'Load Test Data',
  },
  ar: {
    appTitle: 'كاسّا فاينانس',
    tagline: 'تطبيق إدارة وتتبع المصروفات الشهرية',
    dashboard: 'لوحة التحكم',
    expenses: 'المصروفات',
    fixedHub: 'المصروفات الثابتة',
    comparison: 'مقارنة الأشهر',
    stores: 'تحليل المتاجر',
    categories: 'التصنيفات والميزانية',
    settings: 'النسخ الاحتياطي والبيانات',

    // Top Controls
    addExpense: 'إضافة مصروف',
    batchAdd: 'إدخال سريع لعدة مصروفات',
    year: 'السنة',
    month: 'الشهر',
    currentMonth: 'الشهر الحالي',

    // Dashboard Cards
    monthlyIncome: 'الدخل الشهري',
    totalExpenses: 'إجمالي المصروفات',
    remainingMoney: 'الادخار',
    saving: 'الادخار',
    fixedExpensesLabel: 'المصروفات الثابتة',
    variableExpensesLabel: 'المصروفات المتغيرة',
    recurringLabel: 'إجمالي المتكرر',
    oneTimeLabel: 'إجمالي لمرة واحدة',
    withoutOneTimeSpend: 'الإنفاق بدون المصاريف غير المتكررة',
    withoutOneTimeExplanation: 'الإنفاق الطبيعي بدون المشتريات الطارئة',
    savingsRate: 'نسبة التوفير',

    // Budget
    budgetsTitle: 'ميزانية التصنيفات والإنفاق',
    spent: 'المصروف',
    budget: 'الميزانية',
    remaining: 'المتبقي',
    overBudgetWarning: 'تجاوزت الميزانية بمقدار',
    onTrack: 'ضمن الميزانية',
    noBudgetSet: 'لم تحدد ميزانية',
    setBudget: 'تحديد الميزانية',

    // Tables & Lists
    allExpenses: 'جميع المعاملات',
    searchPlaceholder: 'ابحث عن اسم، متجر، ملاحظات (مثال: Lidl, Rent)...',
    filterCategory: 'التصنيف',
    filterStore: 'المتجر',
    filterType: 'النوع',
    filterRecurring: 'التكرار',
    allCategories: 'جميع التصنيفات',
    allStores: 'جميع المتاجر',
    allTypes: 'جميع الأنواع',
    fixed: 'ثابت',
    variable: 'متغير',
    recurringYes: 'متكرر شهرياً',
    recurringNo: 'لمرة واحدة',
    sortBy: 'ترتيب حسب',
    dateDesc: 'التاريخ (الأحدث)',
    dateAsc: 'التاريخ (الأقدم)',
    amountDesc: 'المبلغ (الأعلى)',
    amountAsc: 'المبلغ (الأقل)',

    // Table Headers
    colDate: 'التاريخ',
    colName: 'اسم المصروف',
    colCategory: 'التصنيف',
    colStore: 'المتجر',
    colAmount: 'المبلغ',
    colType: 'النوع',
    colRecurring: 'متكرر',
    colActions: 'إجراءات',

    // Modals
    editExpense: 'تعديل المصروف',
    addNewExpense: 'إضافة مصروف جديد',
    expenseName: 'اسم المصروف',
    amount: 'المبلغ (€)',
    category: 'التصنيف',
    storeOrSubcategory: 'المتجر / التصنيف الفرعي',
    date: 'التاريخ',
    notes: 'ملاحظات (اختياري)',
    save: 'حفظ المصروف',
    cancel: 'إلغاء',
    delete: 'حذف',
    confirmDelete: 'هل أنت متأكد من رغبتك في حذف هذا المصروف؟',

    // Quick Batch
    quickBatchTitle: 'إدخال سريع لعدة مصروفات',
    quickBatchDesc: 'أدخل عدة مبالغ لنفس المتجر بسرعة. الصق الأرقام أو افصل بينها بمسافات أو فواصل.',
    amountsInput: 'المبالغ (مثال: 66.25, 17.83, 5.90...)',
    liveBatchTotal: 'إجمالي المتجر المحسوب فورياً',
    saveAllTransactions: 'حفظ جميع المعاملات',

    // Recurring
    fixedObligations: 'الالتزامات الشهرية الثابتة',
    propagateToNextMonth: 'نسخ المصاريف المتكررة للشهر القادم',
    propagateSuccess: 'تم نسخ المصاريف المتكررة للشهر القادم بنجاح!',

    // Verification Test Case Banner
    testCaseActive: 'بيانات اختبار سبتمبر 2026 محملة',
    testCaseMatches: 'تم تطابق جميع المعادلات الحسابية السبع بدقة تامة (الثابت: 486.77 €، ليدل: 330.05 €، السوبرماركت: 345.15 €، الإجمالي: 838.92 €، المتبقي: 347.08 €، متبقي الميزانية: -95.15 € / 138.06%).',
    resetToTestCase: 'إعادة تحميل بيانات اختبار سبتمبر 2026',

    // Auth & Cloud
    signOut: 'تسجيل الخروج',
    cloudSync: 'متزامن سحابياً',
    account: 'الحساب',

    // Test Data
    testDataTitle: 'بيانات الاختبار',
    testDataQuestion: 'هل ترغب في تحميل بيانات اختبار سبتمبر 2026؟',
    testDataDesc: 'سيؤدي هذا إلى تحميل سيناريو الاختبار الرسمي لشهر سبتمبر 2026 ومزامنة سجلك السحابي ليطابقه تماماً.',
    loadTestData: 'تحميل بيانات الاختبار',
  },
  de: {
    appTitle: 'Kassa Finance',
    tagline: 'Persönlicher Finanz- und Ausgaben-Tracker',
    dashboard: 'Übersicht',
    expenses: 'Ausgaben',
    fixedHub: 'Fixkosten',
    comparison: 'Monatsvergleich',
    stores: 'Geschäfte',
    categories: 'Kategorien & Budgets',
    settings: 'Sicherung & Daten',

    // Top Controls
    addExpense: 'Ausgabe hinzufügen',
    batchAdd: 'Schnellerfassung',
    year: 'Jahr',
    month: 'Monat',
    currentMonth: 'Aktueller Monat',

    // Dashboard Cards
    monthlyIncome: 'Monatliches Einkommen',
    totalExpenses: 'Gesamtausgaben',
    remainingMoney: 'Ersparnis',
    saving: 'Ersparnis',
    fixedExpensesLabel: 'Fixkosten',
    variableExpensesLabel: 'Variable Ausgaben',
    recurringLabel: 'Wiederkehrend gesamt',
    oneTimeLabel: 'Einmalig gesamt',
    withoutOneTimeSpend: 'Ausgaben ohne Einmaliges',
    withoutOneTimeExplanation: 'Reguläre Grundlinie ohne einmalige Käufe',
    savingsRate: 'Sparquote',

    // Budget
    budgetsTitle: 'Kategorie-Budgets & Ausgaben',
    spent: 'Ausgegeben',
    budget: 'Budget',
    remaining: 'Verbleibend',
    overBudgetWarning: 'Budget überschritten um',
    onTrack: 'Im Budget',
    noBudgetSet: 'Kein Budget festgelegt',
    setBudget: 'Budget festlegen',

    // Tables & Lists
    allExpenses: 'Alle Transaktionen',
    searchPlaceholder: 'Name, Geschäft, Notiz suchen (z. B. Lidl, Miete)...',
    filterCategory: 'Kategorie',
    filterStore: 'Geschäft',
    filterType: 'Typ',
    filterRecurring: 'Wiederkehrend',
    allCategories: 'Alle Kategorien',
    allStores: 'Alle Geschäfte',
    allTypes: 'Alle Typen',
    fixed: 'Fix',
    variable: 'Variabel',
    recurringYes: 'Wiederkehrend',
    recurringNo: 'Einmalig',
    sortBy: 'Sortieren nach',
    dateDesc: 'Datum (Neueste)',
    dateAsc: 'Datum (Älteste)',
    amountDesc: 'Betrag (Höchste)',
    amountAsc: 'Betrag (Niedrigste)',

    // Table Headers
    colDate: 'Datum',
    colName: 'Bezeichnung',
    colCategory: 'Kategorie',
    colStore: 'Geschäft',
    colAmount: 'Betrag',
    colType: 'Typ',
    colRecurring: 'Wiederkehrend',
    colActions: 'Aktionen',

    // Modals
    editExpense: 'Ausgabe bearbeiten',
    addNewExpense: 'Neue Ausgabe hinzufügen',
    expenseName: 'Bezeichnung',
    amount: 'Betrag (€)',
    category: 'Kategorie',
    storeOrSubcategory: 'Geschäft / Unterkategorie',
    date: 'Datum',
    notes: 'Notizen (optional)',
    save: 'Ausgabe speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    confirmDelete: 'Möchten Sie diese Ausgabe wirklich löschen?',

    // Quick Batch
    quickBatchTitle: 'Schnelle Mehrfach-Ausgabenerfassung',
    quickBatchDesc: 'Geben Sie mehrere Beträge für dasselbe Geschäft schnell ein. Zeilen einfügen oder durch Leerzeichen/Kommas trennen.',
    amountsInput: 'Beträge (z. B. 66.25, 17.83, 5.90...)',
    liveBatchTotal: 'Berechnete Geschäftssumme',
    saveAllTransactions: 'Transaktionen speichern',

    // Recurring
    fixedObligations: 'Monatliche feste Verpflichtungen',
    propagateToNextMonth: 'In nächsten Monat übertragen',
    propagateSuccess: 'Wiederkehrende Ausgaben in nächsten Monat kopiert!',

    // Verification Test Case Banner
    testCaseActive: 'Testdatensatz September 2026 geladen',
    testCaseMatches: 'Alle 7 Verifizierungsformeln stimmen exakt überein (Fix: 486,77 €, Lidl: 330,05 €, Supermarkt: 345,15 €, Gesamt: 838,92 €, Verbleibend: 347,08 €, Supermarkt-Budget: -95,15 € / 138,06%).',
    resetToTestCase: 'Sep 2026 Testdatensatz neu laden',

    // Auth & Cloud
    signOut: 'Abmelden',
    cloudSync: 'Cloud synchronisiert',
    account: 'Konto',

    // Test Data
    testDataTitle: 'Testdaten',
    testDataQuestion: 'Testdatensatz für September 2026 laden?',
    testDataDesc: 'Dies lädt das offizielle vordefinierte Testszenario für September 2026 und synchronisiert Ihr Cloud-Hauptbuch exakt damit.',
    loadTestData: 'Testdaten laden',
  },
};
