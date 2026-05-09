import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  userId: string;
}

export interface Income {
  id: string;
  amount: number;
  source: string;
  date: string;
  userId: string;
}

export interface Budget {
  amount: number;
  month: number;
  year: number;
  userId: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const expenseService = {
  getLinkedAccounts: async (): Promise<any[]> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    
    const path = "accounts";
    try {
      const q = query(collection(db, path), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  createLinkToken: async (): Promise<string> => {
    const response = await fetch("/api/banking/create-link-token", { method: "POST" });
    const { link_token } = await response.json();
    return link_token;
  },

  exchangePublicToken: async (publicToken: string, metadata: any): Promise<any> => {
    const response = await fetch("/api/banking/exchange-public-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_token: publicToken, metadata })
    });
    return await response.json();
  },

  linkAccount: async (account: any): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const path = "accounts";
    try {
      await addDoc(collection(db, path), {
        ...account,
        userId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  unlinkAccount: async (id: string): Promise<void> => {
    const path = `accounts/${id}`;
    try {
      await deleteDoc(doc(db, "accounts", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  syncTransactions: async (): Promise<void> => {
    try {
      const response = await fetch("/api/banking/sync");
      const { new_transactions } = await response.json();
      
      if (new_transactions && new_transactions.length > 0) {
        for (const tx of new_transactions) {
          if (tx.amount < 0) {
            await expenseService.addExpense({
              amount: Math.abs(tx.amount),
              category: tx.category || "Uncategorized",
              date: tx.date,
              description: tx.description
            });
          } else {
            await expenseService.addIncome({
              amount: tx.amount,
              source: tx.description,
              date: tx.date
            });
          }
        }
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  },

  getExpenses: async (): Promise<Expense[]> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const path = "expenses";
    try {
      const q = query(
        collection(db, path), 
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addExpense: async (expense: Omit<Expense, "id" | "userId">): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const path = "expenses";
    try {
      await addDoc(collection(db, path), {
        ...expense,
        userId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  deleteExpense: async (id: string): Promise<void> => {
    const path = `expenses/${id}`;
    try {
      await deleteDoc(doc(db, "expenses", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  getIncome: async (): Promise<Income[]> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const path = "income";
    try {
      const q = query(
        collection(db, path), 
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      const income = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Income));
      return income.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addIncome: async (income: Omit<Income, "id" | "userId">): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const path = "income";
    try {
      await addDoc(collection(db, path), {
        ...income,
        userId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  deleteIncome: async (id: string): Promise<void> => {
    const path = `income/${id}`;
    try {
      await deleteDoc(doc(db, "income", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  getBudget: async (month: number, year: number): Promise<Budget | null> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    const budgetId = `${userId}_${year}_${month}`;
    const path = `budgets/${budgetId}`;
    try {
      const docRef = doc(db, "budgets", budgetId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as Budget;
      }
      return { amount: 2000, month, year, userId };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  setBudget: async (budget: Budget): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const budgetId = `${userId}_${budget.year}_${budget.month}`;
    const path = `budgets/${budgetId}`;
    try {
      await setDoc(doc(db, "budgets", budgetId), {
        ...budget,
        userId,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
