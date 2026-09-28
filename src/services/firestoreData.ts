import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Expense, Category, MonthRecord } from '../types/finance';

export interface UserCloudState {
  hasData: boolean;
  hasMigrated: boolean;
  activeMonth?: number;
  activeYear?: number;
  expenses: Expense[];
  categories: Category[];
  monthRecords: MonthRecord[];
}

/**
 * Ensure user root document exists in /users/{userId}
 */
export async function syncUserProfile(user: User): Promise<{ hasMigrated: boolean; activeMonth?: number; activeYear?: number }> {
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

    const hasData = expenses.length > 0 || categories.length > 0 || monthRecords.length > 0;

    return {
      hasData,
      hasMigrated,
      activeMonth,
      activeYear,
      expenses,
      categories,
      monthRecords,
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
 * Completely populate / migrate user cloud dataset from local data
 */
export async function uploadFullDatasetCloud(
  userId: string,
  expenses: Expense[],
  categories: Category[],
  monthRecords: MonthRecord[],
  markMigrated: boolean = true
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

    // 3. Save all expenses in chunks
    await saveBatchExpensesCloud(userId, expenses);

    // 4. Mark migration complete in user profile
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
  backupMonthRecords: MonthRecord[]
): Promise<void> {
  if (!userId) throw new Error('User ID is required for exact cloud restore');

  try {
    // 1. Fetch all current documents for this authenticated user
    const expCol = collection(db, 'users', userId, 'expenses');
    const catCol = collection(db, 'users', userId, 'categories');
    const monCol = collection(db, 'users', userId, 'monthRecords');

    const [expSnap, catSnap, monSnap] = await Promise.all([
      getDocs(expCol),
      getDocs(catCol),
      getDocs(monCol),
    ]);

    const existingExpIds = new Set(expSnap.docs.map((d) => d.id));
    const existingCatIds = new Set(catSnap.docs.map((d) => d.id));
    const existingMonIds = new Set(monSnap.docs.map((d) => d.id));

    // 2. Compute IDs present in cloud but NOT in backup
    const backupExpIds = new Set(backupExpenses.map((e) => e.id));
    const backupCatIds = new Set(backupCategories.map((c) => c.id));
    const backupMonIds = new Set(
      backupMonthRecords.map((m) => `${m.year}-${m.month}`)
    );

    const expIdsToDelete = [...existingExpIds].filter((id) => !backupExpIds.has(id));
    const catIdsToDelete = [...existingCatIds].filter((id) => !backupCatIds.has(id));
    const monIdsToDelete = [...existingMonIds].filter((id) => !backupMonIds.has(id));

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

    // 6. Upsert all backup categories
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

    // 7. Upsert all backup month records
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

    // 8. Upsert all backup expenses
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

    // 9. Mark migration complete in user profile document
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { hasMigratedLocalData: true }, { merge: true });

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

