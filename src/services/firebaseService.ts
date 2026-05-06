import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";

export const firebaseService = {
  // Expenses
  getExpenses: async () => {
    if (!auth.currentUser) return [];
    const path = `users/${auth.currentUser.uid}/expenses`;
    try {
      const q = query(
        collection(db, path),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addExpense: async (expenseData: any) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/expenses`;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...expenseData,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      return { _id: docRef.id, ...expenseData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Budgets
  getBudget: async (month: number, year: number) => {
    if (!auth.currentUser) return null;
    const path = `users/${auth.currentUser.uid}/budgets`;
    try {
      const q = query(
        collection(db, path),
        where("month", "==", month),
        where("year", "==", year),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { _id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  upsertBudget: async (amount: number, month: number, year: number) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/budgets`;
    try {
      const existing = await firebaseService.getBudget(month, year);
      if (existing) {
        const docRef = doc(db, path, (existing as any)._id);
        await updateDoc(docRef, { amount });
      } else {
        await addDoc(collection(db, path), {
          amount,
          month,
          year,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
