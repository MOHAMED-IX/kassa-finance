import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  limit,
  CollectionReference,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Expense, Category, MonthRecord, SpendingCycle, PeriodMode, BankTransaction, BankTarget, Currency } from '../types/finance';
import { sanitizeAndHealCycles } from '../utils/periodAbstraction';

export interface UserCloudState {
  hasData: boolean;
  hasMigrated: boolean;
  activeMonth?: number;
  activeYear?: number;
  activeCycleId?: string;
  periodMode?: PeriodMode;
  currency?: Currency;
  categoryOrder?: string[];
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
  spendingCycles: SpendingCycle[];
  bankTransactions: BankTransaction[];
  bankTargets: BankTarget[];
}

/**
 * Ensure user root document exists in /users/{userId}
 */
export async function syncUserProfile(user: User): Promise<{
  hasMigrated: boolean;
  activeMonth?: number;
  activeYear?: number;
  activeCycleId?: string;
  periodMode?: PeriodMode;
  currency?: Currency;
  categoryOrder?: string[];
}> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const initialProfile = {
        uid: user.uid,
        email: user.email || 'unknown@user.com',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        hasMigratedLocalData: false,
      };
      await setDoc(userRef, initialProfile);
      return { hasMigrated: false };
    } else {
      const data = snap.data();
      return {
        hasMigrated: Boolean(data.hasMigratedLocalData),
        activeMonth: typeof data.activeMonth === 'number' ? data.activeMonth : undefined,
        activeYear: typeof data.activeYear === 'number' ? data.activeYear : undefined,
        activeCycleId: typeof data.activeCycleId === 'string' ? data.activeCycleId : undefined,
        periodMode: data.periodMode === 'month' || data.periodMode === 'cycle' ? data.periodMode : undefined,
        currency: data.currency === 'USD' || data.currency === 'EGP' || data.currency === 'EUR' ? data.currency : undefined,
        categoryOrder: Array.isArray(data.categoryOrder) ? data.categoryOrder.filter((id: any) => typeof id === 'string') : undefined,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

/**
 * Fetch all financial data for a specific authenticated user
 */
export async function fetchUserCloudData(userId: string): Promise<UserCloudState> {
  const expensesPath = `users/${userId}/expenses`;
  const categoriesPath = `users/${userId}/categories`;
  const monthRecordsPath = `users/${userId}/monthRecords`;
  const userPath = `users/${userId}`;

  try {
    const userDocSnap = await getDoc(doc(db, 'users', userId));
    const userData = userDocSnap.exists() ? userDocSnap.data() : null;
    const hasMigrated = userData
      ? Boolean(userData.hasMigratedLocalData)
      : false;
    const activeMonth = userData && typeof userData.activeMonth === 'number'
      ? userData.activeMonth
      : undefined;
    const activeYear = userData && typeof userData.activeYear === 'number'
      ? userData.activeYear
      : undefined;
    const activeCycleId = userData && typeof userData.activeCycleId === 'string'
      ? userData.activeCycleId
      : undefined;
    const periodMode = userData && (userData.periodMode === 'month' || userData.periodMode === 'cycle')
      ? userData.periodMode
      : undefined;
    const currency = userData && (userData.currency === 'USD' || userData.currency === 'EGP' || userData.currency === 'EUR')
      ? (userData.currency as Currency)
      : undefined;
    const categoryOrder = userData && Array.isArray(userData.categoryOrder)
      ? userData.categoryOrder.filter((id: any) => typeof id === 'string')
      : undefined;

    // Fetch expenses
    const expSnap = await getDocs(collection(db, 'users', userId, 'expenses'));
    const expenses: Expense[] = [];
    expSnap.forEach((docItem) => {
      const d = docItem.data();
      expenses.push({
        id: docItem.id,
        name: d.name || '',
        amount: Number(d.amount) || 0,
        categoryId: d.categoryId || '',
        store: d.store || '',
        date: d.date || '',
        month: Number(d.month) || 1,
        year: Number(d.year) || 2026,
        isRecurring: Boolean(d.isRecurring),
        type: (d.type === 'fixed' ? 'fixed' : 'variable'),
        notes: d.notes,
        createdAt: Number(d.createdAt) || Date.now(),
      });
    });

    // Fetch categories
    const catSnap = await getDocs(collection(db, 'users', userId, 'categories'));
    const categories: Category[] = [];
    catSnap.forEach((docItem) => {
      const d = docItem.data();
      categories.push({
        id: docItem.id,
        name: d.name || '',
        nameAr: d.nameAr,
        color: d.color || '#10B981',
        iconName: d.iconName || 'Circle',
        defaultType: (d.defaultType === 'fixed' ? 'fixed' : 'variable'),
        stores: Array.isArray(d.stores) ? d.stores : [],
      });
    });

    // Fetch month records
    const monSnap = await getDocs(collection(db, 'users', userId, 'monthRecords'));
    const monthRecords: MonthRecord[] = [];
    monSnap.forEach((docItem) => {
      const d = docItem.data();
      monthRecords.push({
        year: Number(d.year) || 2026,
        month: Number(d.month) || 1,
        income: Number(d.income) || 0,
        budgets: typeof d.budgets === 'object' && d.budgets !== null ? d.budgets : {},
        notes: d.notes,
      });
    });

    // Fetch spending cycles
    const cycSnap = await getDocs(collection(db, 'users', userId, 'spendingCycles'));
    const rawCycles: SpendingCycle[] = [];
    cycSnap.forEach((docItem) => {
      const d = docItem.data();
      rawCycles.push({
        id: docItem.id,
        startDate: d.startDate || '',
        endDate: d.endDate !== undefined ? d.endDate : null,
        income: typeof d.income === 'number' ? d.income : null,
        expectedNextCycleIncome: typeof d.expectedNextCycleIncome === 'number' ? d.expectedNextCycleIncome : null,
        notes: d.notes || undefined,
        budgets: typeof d.budgets === 'object' && d.budgets !== null ? d.budgets : undefined,
        createdAt: Number(d.createdAt) || Date.now(),
      });
    });
    // Sanitize, heal and sort cycles strictly
    const spendingCycles = sanitizeAndHealCycles(rawCycles);

    // Fetch bank transactions
    const txSnap = await getDocs(collection(db, 'users', userId, 'bankTransactions'));
    const bankTransactions: BankTransaction[] = [];
    txSnap.forEach((docItem) => {
      const d = docItem.data();
      bankTransactions.push({
        id: docItem.id,
        type: d.type,
        amount: Number(d.amount) || 0,
        date: d.date || '',
        note: d.note || undefined,
        sourcePeriodMode: d.sourcePeriodMode || undefined,
        sourcePeriodId: d.sourcePeriodId || undefined,
        targetId: d.targetId || undefined,
        createdAt: Number(d.createdAt) || Date.now(),
        updatedAt: Number(d.updatedAt) || Date.now(),
      });
    });

    // Fetch bank targets
    const targetSnap = await getDocs(collection(db, 'users', userId, 'bankTargets'));
    const bankTargets: BankTarget[] = [];
    targetSnap.forEach((docItem) => {
      const d = docItem.data();
      bankTargets.push({
        id: docItem.id,
        name: d.name || '',
        targetAmount: Number(d.targetAmount) || 0,
        allocatedAmount: Number(d.allocatedAmount) || 0,
        targetDate: d.targetDate || undefined,
        icon: d.icon || undefined,
        accent: d.accent || undefined,
        active: d.active !== false,
        completed: Boolean(d.completed),
        createdAt: Number(d.createdAt) || Date.now(),
        updatedAt: Number(d.updatedAt) || Date.now(),
      });
    });

    const hasData =
      expenses.length > 0 ||
      categories.length > 0 ||
      monthRecords.length > 0 ||
      spendingCycles.length > 0 ||
      bankTransactions.length > 0 ||
      bankTargets.length > 0;

    return {
      hasData,
      hasMigrated,
      activeMonth,
      activeYear,
      activeCycleId,
      periodMode,
      currency,
      categoryOrder,
      expenses,
      categories,
      monthRecords,
      spendingCycles,
      bankTransactions,
      bankTargets,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  }
}

/**
 * Persist user's selected active month and year to their user profile
 */
export async function saveUserActiveMonthCloud(userId: string, month: number, year: number): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(userRef, { activeMonth: month, activeYear: year }, { merge: true });
  } catch (error) {
    console.warn('Could not persist active month to user profile in cloud:', error);
  }
}

/**
 * Persist user's selected period mode ('month' | 'cycle') to their user profile
 */
export async function saveUserPeriodModeCloud(userId: string, periodMode: PeriodMode): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(userRef, { periodMode }, { merge: true });
  } catch (error) {
    console.warn('Could not persist period mode to user profile in cloud:', error);
  }
}

/**
 * Persist user's selected active spending cycle ID to their user profile
 */
export async function saveUserActiveCycleCloud(userId: string, activeCycleId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(userRef, { activeCycleId }, { merge: true });
  } catch (error) {
    console.warn('Could not persist active cycle ID to user profile in cloud:', error);
  }
}

/**
 * Persist user's selected account currency ('EUR' | 'USD' | 'EGP') to their user profile
 */
export async function saveUserCurrencyCloud(userId: string, currency: Currency): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(userRef, { currency }, { merge: true });
  } catch (error) {
    console.warn('Could not persist currency to user profile in cloud:', error);
  }
}

/**
 * Save single expense to user's Firestore subcollection
 */
export async function saveExpenseCloud(userId: string, expense: Expense): Promise<void> {
  const path = `users/${userId}/expenses/${expense.id}`;
  try {
    const expenseRef = doc(db, 'users', userId, 'expenses', expense.id);
    const dataToSave: Record<string, any> = {
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      categoryId: expense.categoryId,
      store: expense.store,
      date: expense.date,
      month: expense.month,
      year: expense.year,
      isRecurring: expense.isRecurring,
      type: expense.type,
      createdAt: expense.createdAt,
    };
    if (expense.notes) {
      dataToSave.notes = expense.notes;
    }
    await setDoc(expenseRef, dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete expense from user's Firestore subcollection
 */
export async function deleteExpenseCloud(userId: string, expenseId: string): Promise<void> {
  const path = `users/${userId}/expenses/${expenseId}`;
  try {
    const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
    await deleteDoc(expenseRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Batch save multiple expenses
 */
export async function saveBatchExpensesCloud(
  userId: string,
  expenses: Expense[]
): Promise<void> {
  if (expenses.length === 0) return;
  const path = `users/${userId}/expenses`;
  try {
    // Firestore batch limit is 500 writes
    const CHUNK_SIZE = 450;
    for (let i = 0; i < expenses.length; i += CHUNK_SIZE) {
      const chunk = expenses.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const exp of chunk) {
        const ref = doc(db, 'users', userId, 'expenses', exp.id);
        const dataToSave: Record<string, any> = {
          id: exp.id,
          name: exp.name,
          amount: exp.amount,
          categoryId: exp.categoryId,
          store: exp.store,
          date: exp.date,
          month: exp.month,
          year: exp.year,
          isRecurring: exp.isRecurring,
          type: exp.type,
          createdAt: exp.createdAt,
        };
        if (exp.notes) dataToSave.notes = exp.notes;
        batch.set(ref, dataToSave);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save category to user's Firestore subcollection
 */
export async function saveCategoryCloud(userId: string, category: Category): Promise<void> {
  const path = `users/${userId}/categories/${category.id}`;
  try {
    const catRef = doc(db, 'users', userId, 'categories', category.id);
    const dataToSave: Record<string, any> = {
      id: category.id,
      name: category.name,
      color: category.color,
      iconName: category.iconName,
      defaultType: category.defaultType,
      stores: category.stores || [],
    };
    if (category.nameAr) {
      dataToSave.nameAr = category.nameAr;
    }
    await setDoc(catRef, dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete category from user's Firestore subcollection
 */
export async function deleteCategoryCloud(userId: string, categoryId: string): Promise<void> {
  const path = `users/${userId}/categories/${categoryId}`;
  try {
    const catRef = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(catRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save MonthRecord (income & budgets) to user's Firestore subcollection
 */
export async function saveMonthRecordCloud(
  userId: string,
  record: MonthRecord
): Promise<void> {
  const recordId = `${record.year}-${record.month}`;
  const path = `users/${userId}/monthRecords/${recordId}`;
  try {
    const monRef = doc(db, 'users', userId, 'monthRecords', recordId);
    const dataToSave: Record<string, any> = {
      id: recordId,
      year: record.year,
      month: record.month,
      income: record.income,
      budgets: record.budgets || {},
    };
    if (record.notes) {
      dataToSave.notes = record.notes;
    }
    await setDoc(monRef, dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save or update a SpendingCycle document in user's subcollection
 */
export async function saveSpendingCycleCloud(
  userId: string,
  cycle: SpendingCycle
): Promise<void> {
  const path = `users/${userId}/spendingCycles/${cycle.id}`;
  try {
    const cycleRef = doc(db, 'users', userId, 'spendingCycles', cycle.id);
    const dataToSave: Record<string, any> = {
      id: cycle.id,
      startDate: cycle.startDate,
      createdAt: cycle.createdAt || Date.now(),
    };
    if (cycle.endDate !== undefined) dataToSave.endDate = cycle.endDate;
    if (cycle.income !== undefined) dataToSave.income = cycle.income;
    if (cycle.expectedNextCycleIncome !== undefined) dataToSave.expectedNextCycleIncome = cycle.expectedNextCycleIncome;
    if (cycle.notes !== undefined) dataToSave.notes = cycle.notes;
    if (cycle.budgets !== undefined) dataToSave.budgets = cycle.budgets;

    await setDoc(cycleRef, dataToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a SpendingCycle document
 */
export async function deleteSpendingCycleCloud(
  userId: string,
  cycleId: string
): Promise<void> {
  const path = `users/${userId}/spendingCycles/${cycleId}`;
  try {
    const cycleRef = doc(db, 'users', userId, 'spendingCycles', cycleId);
    await deleteDoc(cycleRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save or update a BankTransaction document in user's subcollection
 */
export async function saveBankTransactionCloud(
  userId: string,
  tx: BankTransaction
): Promise<void> {
  const path = `users/${userId}/bankTransactions/${tx.id}`;
  try {
    const txRef = doc(db, 'users', userId, 'bankTransactions', tx.id);
    const dataToSave: Record<string, any> = {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      createdAt: tx.createdAt || Date.now(),
      updatedAt: tx.updatedAt || Date.now(),
    };
    if (tx.note !== undefined) dataToSave.note = tx.note;
    if (tx.sourcePeriodMode !== undefined) dataToSave.sourcePeriodMode = tx.sourcePeriodMode;
    if (tx.sourcePeriodId !== undefined) dataToSave.sourcePeriodId = tx.sourcePeriodId;
    if (tx.targetId !== undefined) dataToSave.targetId = tx.targetId;

    await setDoc(txRef, dataToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a BankTransaction document
 */
export async function deleteBankTransactionCloud(
  userId: string,
  txId: string
): Promise<void> {
  const path = `users/${userId}/bankTransactions/${txId}`;
  try {
    const txRef = doc(db, 'users', userId, 'bankTransactions', txId);
    await deleteDoc(txRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save or update a BankTarget document in user's subcollection
 */
export async function saveBankTargetCloud(
  userId: string,
  target: BankTarget
): Promise<void> {
  const path = `users/${userId}/bankTargets/${target.id}`;
  try {
    const targetRef = doc(db, 'users', userId, 'bankTargets', target.id);
    const dataToSave: Record<string, any> = {
      id: target.id,
      name: target.name,
      targetAmount: target.targetAmount,
      allocatedAmount: target.allocatedAmount,
      active: target.active !== false,
      completed: Boolean(target.completed),
      createdAt: target.createdAt || Date.now(),
      updatedAt: target.updatedAt || Date.now(),
    };
    if (target.targetDate !== undefined) dataToSave.targetDate = target.targetDate;
    if (target.icon !== undefined) dataToSave.icon = target.icon;
    if (target.accent !== undefined) dataToSave.accent = target.accent;

    await setDoc(targetRef, dataToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a BankTarget document
 */
export async function deleteBankTargetCloud(
  userId: string,
  targetId: string
): Promise<void> {
  const path = `users/${userId}/bankTargets/${targetId}`;
  try {
    const targetRef = doc(db, 'users', userId, 'bankTargets', targetId);
    await deleteDoc(targetRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Batch update multiple bank targets (e.g. when moving allocation or rebalancing)
 */
export async function updateBankTargetsCloud(
  userId: string,
  targets: BankTarget[]
): Promise<void> {
  const path = `users/${userId}/bankTargets`;
  try {
    const batch = writeBatch(db);
    for (const target of targets) {
      const targetRef = doc(db, 'users', userId, 'bankTargets', target.id);
      const dataToSave: Record<string, any> = {
        id: target.id,
        name: target.name,
        targetAmount: target.targetAmount,
        allocatedAmount: target.allocatedAmount,
        active: target.active !== false,
        completed: Boolean(target.completed),
        createdAt: target.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      if (target.targetDate !== undefined) dataToSave.targetDate = target.targetDate;
      if (target.icon !== undefined) dataToSave.icon = target.icon;
      if (target.accent !== undefined) dataToSave.accent = target.accent;
      batch.set(targetRef, dataToSave, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Start a new spending cycle atomically:
 * - If previous active cycle exists, updates its endDate to 1 day before newCycle.startDate.
 * - Creates the new cycle with endDate = null.
 * - Updates user profile activeCycleId and periodMode to 'cycle'.
 */
export async function startNewSpendingCycleCloud(
  userId: string,
  newCycle: SpendingCycle,
  previousCycleToClose?: SpendingCycle
): Promise<void> {
  const path = `users/${userId}/spendingCycles`;
  try {
    const batch = writeBatch(db);

    if (previousCycleToClose) {
      const prevRef = doc(db, 'users', userId, 'spendingCycles', previousCycleToClose.id);
      const prevData: Record<string, any> = {
        id: previousCycleToClose.id,
        startDate: previousCycleToClose.startDate,
        endDate: previousCycleToClose.endDate,
        createdAt: previousCycleToClose.createdAt,
      };
      if (previousCycleToClose.income !== undefined) prevData.income = previousCycleToClose.income;
      if (previousCycleToClose.expectedNextCycleIncome !== undefined) prevData.expectedNextCycleIncome = previousCycleToClose.expectedNextCycleIncome;
      if (previousCycleToClose.notes !== undefined) prevData.notes = previousCycleToClose.notes;
      if (previousCycleToClose.budgets !== undefined) prevData.budgets = previousCycleToClose.budgets;
      batch.set(prevRef, prevData, { merge: true });
    }

    const newCycleRef = doc(db, 'users', userId, 'spendingCycles', newCycle.id);
    const newCycleData: Record<string, any> = {
      id: newCycle.id,
      startDate: newCycle.startDate,
      endDate: newCycle.endDate !== undefined ? newCycle.endDate : null,
      createdAt: newCycle.createdAt || Date.now(),
    };
    if (newCycle.income !== undefined) newCycleData.income = newCycle.income;
    if (newCycle.expectedNextCycleIncome !== undefined) newCycleData.expectedNextCycleIncome = newCycle.expectedNextCycleIncome;
    if (newCycle.notes !== undefined) newCycleData.notes = newCycle.notes;
    if (newCycle.budgets !== undefined) newCycleData.budgets = newCycle.budgets;
    batch.set(newCycleRef, newCycleData);

    const userDocRef = doc(db, 'users', userId);
    batch.set(userDocRef, { activeCycleId: newCycle.id, periodMode: 'cycle' }, { merge: true });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save user's period preferences (periodMode and activeCycleId)
 */
export async function saveUserPeriodPreferencesCloud(
  userId: string,
  prefs: { periodMode?: PeriodMode; activeCycleId?: string }
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const payload: Record<string, any> = {};
    if (prefs.periodMode) payload.periodMode = prefs.periodMode;
    if (prefs.activeCycleId !== undefined) payload.activeCycleId = prefs.activeCycleId;
    await setDoc(userRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Persist user's custom category display order to their user profile document
 */
export async function saveUserCategoryOrderCloud(
  userId: string,
  categoryOrder: string[]
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { categoryOrder }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Completely populate / migrate user cloud dataset from local data
 */
export async function uploadFullDatasetCloud(
  userId: string,
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[],
  markMigrated: boolean = true,
  spendingCycles: SpendingCycle[] = [],
  bankTransactions: BankTransaction[] = [],
  bankTargets: BankTarget[] = []
): Promise<void> {
  try {
    // 1. Save all categories
    for (const cat of categories) {
      await saveCategoryCloud(userId, cat);
    }

    // 2. Save all month records
    for (const mon of monthRecords) {
      await saveMonthRecordCloud(userId, mon);
    }

    // 3. Save all spending cycles
    for (const cyc of spendingCycles) {
      await saveSpendingCycleCloud(userId, cyc);
    }

    // 4. Save all expenses in chunks
    await saveBatchExpensesCloud(userId, expenses);

    // 5. Save all bank transactions
    for (const tx of bankTransactions) {
      await saveBankTransactionCloud(userId, tx);
    }

    // 6. Save all bank targets
    for (const target of bankTargets) {
      await saveBankTargetCloud(userId, target);
    }

    // 7. Mark migration complete in user profile
    if (markMigrated) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { hasMigratedLocalData: true }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Perform an exact restore of user cloud dataset:
 * 1. Finds all documents currently in user's subcollections.
 * 2. Deletes any cloud documents that are NOT present in the backup.
 * 3. Upserts all documents from the backup preserving exact IDs.
 * 4. Ensures the user's cloud dataset matches the backup exactly.
 */
export async function exactRestoreCloudDataset(
  userId: string,
  backupExpenses: Expense[],
  backupCategories: Category[],
  backupMonthRecords: MonthRecord[],
  backupSpendingCycles: SpendingCycle[] = [],
  backupBankTransactions: BankTransaction[] = [],
  backupBankTargets: BankTarget[] = [],
  backupCategoryOrder?: string[]
): Promise<void> {
  if (!userId) throw new Error('User ID is required for exact cloud restore');

  try {
    // 1. Fetch all current documents for this authenticated user
    const expCol = collection(db, 'users', userId, 'expenses');
    const catCol = collection(db, 'users', userId, 'categories');
    const monCol = collection(db, 'users', userId, 'monthRecords');
    const cycCol = collection(db, 'users', userId, 'spendingCycles');
    const txCol = collection(db, 'users', userId, 'bankTransactions');
    const targetCol = collection(db, 'users', userId, 'bankTargets');

    const [expSnap, catSnap, monSnap, cycSnap, txSnap, targetSnap] = await Promise.all([
      getDocs(expCol),
      getDocs(catCol),
      getDocs(monCol),
      getDocs(cycCol),
      getDocs(txCol),
      getDocs(targetCol),
    ]);

    const existingExpIds = new Set(expSnap.docs.map((d) => d.id));
    const existingCatIds = new Set(catSnap.docs.map((d) => d.id));
    const existingMonIds = new Set(monSnap.docs.map((d) => d.id));
    const existingCycIds = new Set(cycSnap.docs.map((d) => d.id));
    const existingTxIds = new Set(txSnap.docs.map((d) => d.id));
    const existingTargetIds = new Set(targetSnap.docs.map((d) => d.id));

    // 2. Compute IDs present in cloud but NOT in backup
    const backupExpIds = new Set(backupExpenses.map((e) => e.id));
    const backupCatIds = new Set(backupCategories.map((c) => c.id));
    const backupMonIds = new Set(
      backupMonthRecords.map((m) => `${m.year}-${m.month}`)
    );
    const backupCycIds = new Set(backupSpendingCycles.map((c) => c.id));
    const backupTxIds = new Set(backupBankTransactions.map((t) => t.id));
    const backupTargetIds = new Set(backupBankTargets.map((t) => t.id));

    const expIdsToDelete = [...existingExpIds].filter((id) => !backupExpIds.has(id));
    const catIdsToDelete = [...existingCatIds].filter((id) => !backupCatIds.has(id));
    const monIdsToDelete = [...existingMonIds].filter((id) => !backupMonIds.has(id));
    const cycIdsToDelete = [...existingCycIds].filter((id) => !backupCycIds.has(id));
    const txIdsToDelete = [...existingTxIds].filter((id) => !backupTxIds.has(id));
    const targetIdsToDelete = [...existingTargetIds].filter((id) => !backupTargetIds.has(id));

    const BATCH_SIZE = 450;

    // 3. Batch delete orphaned expenses
    for (let i = 0; i < expIdsToDelete.length; i += BATCH_SIZE) {
      const chunk = expIdsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'users', userId, 'expenses', id));
      }
      await batch.commit();
    }

    // 4. Batch delete orphaned categories
    for (let i = 0; i < catIdsToDelete.length; i += BATCH_SIZE) {
      const chunk = catIdsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'users', userId, 'categories', id));
      }
      await batch.commit();
    }

    // 5. Batch delete orphaned month records
    for (let i = 0; i < monIdsToDelete.length; i += BATCH_SIZE) {
      const chunk = monIdsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'users', userId, 'monthRecords', id));
      }
      await batch.commit();
    }

    // 6. Batch delete orphaned spending cycles
    for (let i = 0; i < cycIdsToDelete.length; i += BATCH_SIZE) {
      const chunk = cycIdsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'users', userId, 'spendingCycles', id));
      }
      await batch.commit();
    }

    // 7. Batch delete orphaned bank transactions
    for (let i = 0; i < txIdsToDelete.length; i += BATCH_SIZE) {
      const chunk = txIdsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'users', userId, 'bankTransactions', id));
      }
      await batch.commit();
    }

    // 8. Batch delete orphaned bank targets
    for (let i = 0; i < targetIdsToDelete.length; i += BATCH_SIZE) {
      const chunk = targetIdsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'users', userId, 'bankTargets', id));
      }
      await batch.commit();
    }

    // 9. Upsert all backup categories
    for (let i = 0; i < backupCategories.length; i += BATCH_SIZE) {
      const chunk = backupCategories.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const cat of chunk) {
        const catRef = doc(db, 'users', userId, 'categories', cat.id);
        const dataToSave: Record<string, any> = {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          iconName: cat.iconName,
          defaultType: cat.defaultType,
          stores: cat.stores || [],
        };
        if (cat.nameAr) dataToSave.nameAr = cat.nameAr;
        batch.set(catRef, dataToSave);
      }
      await batch.commit();
    }

    // 10. Upsert all backup month records
    for (let i = 0; i < backupMonthRecords.length; i += BATCH_SIZE) {
      const chunk = backupMonthRecords.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const mon of chunk) {
        const recordId = `${mon.year}-${mon.month}`;
        const monRef = doc(db, 'users', userId, 'monthRecords', recordId);
        const dataToSave: Record<string, any> = {
          id: recordId,
          year: mon.year,
          month: mon.month,
          income: mon.income,
          budgets: mon.budgets || {},
        };
        if (mon.notes) dataToSave.notes = mon.notes;
        batch.set(monRef, dataToSave);
      }
      await batch.commit();
    }

    // 11. Upsert all backup spending cycles
    for (let i = 0; i < backupSpendingCycles.length; i += BATCH_SIZE) {
      const chunk = backupSpendingCycles.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const cyc of chunk) {
        const cycRef = doc(db, 'users', userId, 'spendingCycles', cyc.id);
        const dataToSave: Record<string, any> = {
          id: cyc.id,
          startDate: cyc.startDate,
          createdAt: cyc.createdAt || Date.now(),
        };
        if (cyc.endDate !== undefined) dataToSave.endDate = cyc.endDate;
        if (cyc.income !== undefined) dataToSave.income = cyc.income;
        if (cyc.expectedNextCycleIncome !== undefined) dataToSave.expectedNextCycleIncome = cyc.expectedNextCycleIncome;
        if (cyc.notes !== undefined) dataToSave.notes = cyc.notes;
        if (cyc.budgets !== undefined) dataToSave.budgets = cyc.budgets;
        batch.set(cycRef, dataToSave);
      }
      await batch.commit();
    }

    // 12. Upsert all backup expenses
    for (let i = 0; i < backupExpenses.length; i += BATCH_SIZE) {
      const chunk = backupExpenses.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const exp of chunk) {
        const expRef = doc(db, 'users', userId, 'expenses', exp.id);
        const dataToSave: Record<string, any> = {
          id: exp.id,
          name: exp.name,
          amount: exp.amount,
          categoryId: exp.categoryId,
          store: exp.store,
          date: exp.date,
          month: exp.month,
          year: exp.year,
          isRecurring: exp.isRecurring,
          type: exp.type,
          createdAt: exp.createdAt || Date.now(),
        };
        if (exp.notes) dataToSave.notes = exp.notes;
        batch.set(expRef, dataToSave);
      }
      await batch.commit();
    }

    // 13. Upsert all backup bank transactions
    for (let i = 0; i < backupBankTransactions.length; i += BATCH_SIZE) {
      const chunk = backupBankTransactions.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const tx of chunk) {
        const txRef = doc(db, 'users', userId, 'bankTransactions', tx.id);
        const dataToSave: Record<string, any> = {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          createdAt: tx.createdAt || Date.now(),
          updatedAt: tx.updatedAt || Date.now(),
        };
        if (tx.note) dataToSave.note = tx.note;
        if (tx.sourcePeriodMode) dataToSave.sourcePeriodMode = tx.sourcePeriodMode;
        if (tx.sourcePeriodId) dataToSave.sourcePeriodId = tx.sourcePeriodId;
        if (tx.targetId) dataToSave.targetId = tx.targetId;
        batch.set(txRef, dataToSave);
      }
      await batch.commit();
    }

    // 14. Upsert all backup bank targets
    for (let i = 0; i < backupBankTargets.length; i += BATCH_SIZE) {
      const chunk = backupBankTargets.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const target of chunk) {
        const targetRef = doc(db, 'users', userId, 'bankTargets', target.id);
        const dataToSave: Record<string, any> = {
          id: target.id,
          name: target.name,
          targetAmount: target.targetAmount,
          allocatedAmount: target.allocatedAmount,
          active: target.active !== false,
          completed: Boolean(target.completed),
          createdAt: target.createdAt || Date.now(),
          updatedAt: target.updatedAt || Date.now(),
        };
        if (target.targetDate) dataToSave.targetDate = target.targetDate;
        if (target.icon) dataToSave.icon = target.icon;
        if (target.accent) dataToSave.accent = target.accent;
        batch.set(targetRef, dataToSave);
      }
      await batch.commit();
    }

    // 15. Mark migration complete in user profile document and restore custom category ordering if present in backup
    const userRef = doc(db, 'users', userId);
    const profileUpdates: Record<string, any> = { hasMigratedLocalData: true };
    if (backupCategoryOrder && Array.isArray(backupCategoryOrder)) {
      const validCatIds = new Set(backupCategories.map((c) => c.id));
      const cleanOrder = backupCategoryOrder.filter((id) => typeof id === 'string' && validCatIds.has(id));
      backupCategories.forEach((c) => {
        if (!cleanOrder.includes(c.id)) cleanOrder.push(c.id);
      });
      profileUpdates.categoryOrder = cleanOrder;
    }
    await setDoc(userRef, profileUpdates, { merge: true });

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

export interface DeletionAuditReport {
  initialExpensesCount: number;
  deletedExpensesCount: number;
  initialCategoriesCount: number;
  deletedCategoriesCount: number;
  initialMonthRecordsCount: number;
  deletedMonthRecordsCount: number;
  initialSpendingCyclesCount: number;
  deletedSpendingCyclesCount: number;
  initialBankTransactionsCount?: number;
  deletedBankTransactionsCount?: number;
  initialBankTargetsCount?: number;
  deletedBankTargetsCount?: number;
  userProfileDeleted: boolean;
  verifiedClean: boolean;
}

/**
 * Safely delete an entire Firestore collection/subcollection in iterative batches.
 * Takes all documents returned from server, divides into batches of up to 400, commits them,
 * and loops until server confirms 0 documents remain.
 * Falls back to individual deleteDoc operations if any batch operation fails.
 */
async function deleteCollectionInBatches(
  collectionRef: CollectionReference,
  collectionName: string
): Promise<{ initialCount: number; deletedCount: number }> {
  const BATCH_SIZE = 400; // Well within Firestore's 500-op limit
  let totalDeleted = 0;

  // 1. Fetch initial snapshot directly from server
  const initialSnap = await getDocsFromServer(collectionRef);
  const initialCount = initialSnap.size;

  if (initialCount === 0) {
    return { initialCount: 0, deletedCount: 0 };
  }

  // 2. Iterate and delete until server confirms 0 documents remain
  let currentSnap = initialSnap;
  while (!currentSnap.empty && currentSnap.docs.length > 0) {
    const docs = currentSnap.docs;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const chunk = docs.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      try {
        await batch.commit();
        totalDeleted += chunk.length;
      } catch (batchError) {
        console.warn(`Batch commit failed on ${collectionName}, falling back to individual deletes:`, batchError);
        for (const d of chunk) {
          try {
            await deleteDoc(d.ref);
            totalDeleted++;
          } catch (singleErr) {
            console.error(`Failed to delete document ${d.id} in ${collectionName}:`, singleErr);
            throw singleErr;
          }
        }
      }
    }

    // Direct server verification to see if any documents still remain
    currentSnap = await getDocsFromServer(collectionRef);
  }

  return { initialCount, deletedCount: totalDeleted };
}

/**
 * Permanently delete ALL cloud Firestore data belonging to the authenticated user.
 * Explicitly enumerates and deletes:
 * - /users/{userId}/expenses/*
 * - /users/{userId}/categories/*
 * - /users/{userId}/monthRecords/*
 * - /users/{userId}/spendingCycles/*
 * - /users/{userId}/bankTransactions/*
 * - /users/{userId}/bankTargets/*
 * - /users/{userId} (root user profile document)
 */
export async function deleteUserCloudAccount(userId: string): Promise<DeletionAuditReport> {
  if (!userId) throw new Error('User ID is required for cloud account deletion');

  try {
    const expCol = collection(db, 'users', userId, 'expenses');
    const catCol = collection(db, 'users', userId, 'categories');
    const monCol = collection(db, 'users', userId, 'monthRecords');
    const cycCol = collection(db, 'users', userId, 'spendingCycles');
    const txCol = collection(db, 'users', userId, 'bankTransactions');
    const targetCol = collection(db, 'users', userId, 'bankTargets');

    console.info(`[deleteUserCloudAccount] Initiating cloud purge for user: ${userId}`);

    // 1. Delete all expenses in iterative batches until empty
    const expResult = await deleteCollectionInBatches(expCol, `users/${userId}/expenses`);

    // 2. Delete all categories in iterative batches until empty
    const catResult = await deleteCollectionInBatches(catCol, `users/${userId}/categories`);

    // 3. Delete all monthRecords in iterative batches until empty
    const monResult = await deleteCollectionInBatches(monCol, `users/${userId}/monthRecords`);

    // 4. Delete all spendingCycles in iterative batches until empty
    const cycResult = await deleteCollectionInBatches(cycCol, `users/${userId}/spendingCycles`);

    // 5. Delete all bankTransactions in iterative batches until empty
    const txResult = await deleteCollectionInBatches(txCol, `users/${userId}/bankTransactions`);

    // 6. Delete all bankTargets in iterative batches until empty
    const targetResult = await deleteCollectionInBatches(targetCol, `users/${userId}/bankTargets`);

    // 7. Delete the root user profile document
    const userDocRef = doc(db, 'users', userId);
    try {
      await deleteDoc(userDocRef);
    } catch (userDocErr) {
      console.warn('[deleteUserCloudAccount] Note deleting user root doc:', userDocErr);
    }

    // 8. Strict Server-Side Verification: Query the server directly to verify ALL 7 areas are empty
    const [expVerify, catVerify, monVerify, cycVerify, txVerify, targetVerify, userVerify] = await Promise.all([
      getDocsFromServer(expCol),
      getDocsFromServer(catCol),
      getDocsFromServer(monCol),
      getDocsFromServer(cycCol),
      getDocsFromServer(txCol),
      getDocsFromServer(targetCol),
      getDocFromServer(userDocRef),
    ]);

    const remainingExpenses = expVerify.size;
    const remainingCategories = catVerify.size;
    const remainingMonthRecords = monVerify.size;
    const remainingSpendingCycles = cycVerify.size;
    const remainingTransactions = txVerify.size;
    const remainingTargets = targetVerify.size;
    const userProfileExists = userVerify.exists();

    if (
      remainingExpenses > 0 ||
      remainingCategories > 0 ||
      remainingMonthRecords > 0 ||
      remainingSpendingCycles > 0 ||
      remainingTransactions > 0 ||
      remainingTargets > 0 ||
      userProfileExists
    ) {
      const remainingDetails: string[] = [];
      if (remainingExpenses > 0) remainingDetails.push(`${remainingExpenses} expenses`);
      if (remainingCategories > 0) remainingDetails.push(`${remainingCategories} categories`);
      if (remainingMonthRecords > 0) remainingDetails.push(`${remainingMonthRecords} month records`);
      if (remainingSpendingCycles > 0) remainingDetails.push(`${remainingSpendingCycles} spending cycles`);
      if (remainingTransactions > 0) remainingDetails.push(`${remainingTransactions} bank transactions`);
      if (remainingTargets > 0) remainingDetails.push(`${remainingTargets} bank targets`);
      if (userProfileExists) remainingDetails.push('user profile document');

      throw new Error(
        `Cloud deletion verification failed: ${remainingDetails.join(', ')} still remain in Firestore for user ${userId}. Firebase Auth account deletion has been aborted to protect your data.`
      );
    }

    console.info(`[deleteUserCloudAccount] Verified clean: all subcollections empty and root profile deleted for ${userId}.`);

    return {
      initialExpensesCount: expResult.initialCount,
      deletedExpensesCount: expResult.deletedCount,
      initialCategoriesCount: catResult.initialCount,
      deletedCategoriesCount: catResult.deletedCount,
      initialMonthRecordsCount: monResult.initialCount,
      deletedMonthRecordsCount: monResult.deletedCount,
      initialSpendingCyclesCount: cycResult.initialCount,
      deletedSpendingCyclesCount: cycResult.deletedCount,
      initialBankTransactionsCount: txResult.initialCount,
      deletedBankTransactionsCount: txResult.deletedCount,
      initialBankTargetsCount: targetResult.initialCount,
      deletedBankTargetsCount: targetResult.deletedCount,
      userProfileDeleted: true,
      verifiedClean: true,
    };
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('Cloud deletion verification failed')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}

/**
 * Verify whether all cloud Firestore data for a user is completely deleted.
 */
export async function verifyUserCloudDataClean(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const [expVerify, catVerify, monVerify, cycVerify, txVerify, targetVerify, userVerify] = await Promise.all([
      getDocsFromServer(collection(db, 'users', userId, 'expenses')),
      getDocsFromServer(collection(db, 'users', userId, 'categories')),
      getDocsFromServer(collection(db, 'users', userId, 'monthRecords')),
      getDocsFromServer(collection(db, 'users', userId, 'spendingCycles')),
      getDocsFromServer(collection(db, 'users', userId, 'bankTransactions')),
      getDocsFromServer(collection(db, 'users', userId, 'bankTargets')),
      getDocFromServer(doc(db, 'users', userId)),
    ]);

    return (
      expVerify.size === 0 &&
      catVerify.size === 0 &&
      monVerify.size === 0 &&
      cycVerify.size === 0 &&
      txVerify.size === 0 &&
      targetVerify.size === 0 &&
      !userVerify.exists()
    );
  } catch (err) {
    console.error('Error during verifyUserCloudDataClean:', err);
    return false;
  }
}

/**
 * Dedicated secure cloud operation to delete only a specific month's data:
 * - /users/{userId}/expenses where year == selectedYear && month == selectedMonth
 * - /users/{userId}/monthRecords/{year}-{month} (and any monthRecord document matching that year/month)
 * Preserves categories, user profile, and all other months.
 */
export async function deleteMonthCloudData(
  userId: string,
  year: number,
  month: number
): Promise<{ deletedExpensesCount: number }> {
  if (!userId) throw new Error('User ID is required for month data deletion');

  try {
    const BATCH_SIZE = 450;

    // 1. Query user expenses from server and identify only records belonging to the requested year and month
    const expSnap = await getDocsFromServer(collection(db, 'users', userId, 'expenses'));
    const matchingDocs = expSnap.docs.filter((d) => {
      const data = d.data();
      return Number(data.year) === year && Number(data.month) === month;
    });

    // 2. Delete matching expense documents in batches
    for (let i = 0; i < matchingDocs.length; i += BATCH_SIZE) {
      const chunk = matchingDocs.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }

    // 3. Delete the corresponding month record document by standard ID
    const recordId = `${year}-${month}`;
    const monthRecordRef = doc(db, 'users', userId, 'monthRecords', recordId);
    try {
      await deleteDoc(monthRecordRef);
    } catch (monErr) {
      console.warn('Month record deletion note:', monErr);
    }

    // Also check and delete any other monthRecord doc matching that year and month
    const monSnap = await getDocsFromServer(collection(db, 'users', userId, 'monthRecords'));
    const matchingMonDocs = monSnap.docs.filter((d) => {
      const data = d.data();
      return Number(data.year) === year && Number(data.month) === month;
    });
    for (const d of matchingMonDocs) {
      try {
        await deleteDoc(d.ref);
      } catch (err) {
        console.warn('Error deleting month record doc:', err);
      }
    }

    // 4. Verify on server that 0 expenses remain for this year/month
    const expVerify = await getDocsFromServer(collection(db, 'users', userId, 'expenses'));
    const remainingMatching = expVerify.docs.filter((d) => {
      const data = d.data();
      return Number(data.year) === year && Number(data.month) === month;
    });

    if (remainingMatching.length > 0) {
      throw new Error(
        `Verification failed: ${remainingMatching.length} expenses still remain for ${year}-${month}.`
      );
    }

    return { deletedExpensesCount: matchingDocs.length };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `users/${userId}/expenses?year=${year}&month=${month}`
    );
  }
}


