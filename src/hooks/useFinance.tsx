import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format, parseISO } from 'date-fns';
import { ContextType, FinanceContextState, Transaction, ViewType } from '../types';
import { auth, db, signInWithGoogle, signOut } from '../lib/firebase';
import { handleFirestoreError } from '../lib/handleFirestoreError';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, onSnapshot, doc, writeBatch, serverTimestamp, 
  getDocs, where
} from 'firebase/firestore';

const FinanceContext = createContext<FinanceContextState | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [activeContext, setActiveContext] = useState<ContextType>('PERSONAL');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<ViewType>('DASHBOARD');

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setTransactions([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Data sync listener
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // We listen to all transactions for the user. In real-world, might want to limit by date range.
    const q = query(
      collection(db, `users/${user.uid}/transactions`),
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          context: data.context,
          type: data.type,
          title: data.title,
          amount: data.amount,
          date: data.date,
          status: data.status,
          isFixed: data.isFixed,
          groupId: data.groupId,
          installmentInfo: data.installmentInfo,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as Transaction;
      });
      setTransactions(txs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/transactions`, user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addTransaction = async (
    txData: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, 
    generateMultiple?: 'INSTALLMENTS' | 'FIXED', 
    count: number = 1
  ) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const groupId = uuidv4();
      const baseDate = parseISO(txData.date);
      const collectionRef = collection(db, `users/${user.uid}/transactions`);

      if (generateMultiple === 'INSTALLMENTS') {
        const installmentAmount = txData.amount / count;
        for (let i = 0; i < count; i++) {
          const docRef = doc(collectionRef);
          batch.set(docRef, {
            ...txData,
            amount: parseFloat(installmentAmount.toFixed(2)),
            date: format(addMonths(baseDate, i), 'yyyy-MM-dd'),
            groupId,
            installmentInfo: `${i + 1}/${count}`,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } else if (generateMultiple === 'FIXED') {
        for (let i = 0; i < 24; i++) {
          const docRef = doc(collectionRef);
          batch.set(docRef, {
            ...txData,
            date: format(addMonths(baseDate, i), 'yyyy-MM-dd'),
            groupId,
            isFixed: true,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } else {
        const docRef = doc(collectionRef);
        batch.set(docRef, {
          ...txData,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/transactions`, user);
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>, applyToFuture?: boolean) => {
    if (!user) return;
    try {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      const batch = writeBatch(db);

      if (applyToFuture && tx.groupId && tx.isFixed) {
        // Find all related future ones in memory (or via query)
        const futureTxs = transactions.filter(t => t.groupId === tx.groupId && new Date(t.date) >= new Date(tx.date));
        for (const ft of futureTxs) {
          const docRef = doc(db, `users/${user.uid}/transactions/${ft.id}`);
          const toUpdate = { ...updates };
          // Do not override their date if they are future recurrences!
          delete toUpdate.date; 
          batch.update(docRef, { ...toUpdate, updatedAt: serverTimestamp() });
        }
      } else {
        const docRef = doc(db, `users/${user.uid}/transactions/${id}`);
        batch.update(docRef, { ...updates, updatedAt: serverTimestamp() });
      }

      await batch.commit();
    } catch (error) {
       handleFirestoreError(error, 'update', `users/${user.uid}/transactions/${id}`, user);
    }
  };

  const deleteTransaction = async (id: string, deleteFuture?: boolean) => {
    if (!user) return;
    try {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      const batch = writeBatch(db);

      if (deleteFuture && tx.groupId) {
        const futureTxs = transactions.filter(t => t.groupId === tx.groupId && new Date(t.date) >= new Date(tx.date));
        for (const ft of futureTxs) {
          const docRef = doc(db, `users/${user.uid}/transactions/${ft.id}`);
          batch.delete(docRef);
        }
      } else {
        const docRef = doc(db, `users/${user.uid}/transactions/${id}`);
        batch.delete(docRef);
      }

      await batch.commit();
    } catch (error) {
       handleFirestoreError(error, 'delete', `users/${user.uid}/transactions/${id}`, user);
    }
  };

  const toggleStatus = async (id: string) => {
    if (!user) return;
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    try {
      const docRef = doc(db, `users/${user.uid}/transactions/${id}`);
      await updateTransaction(id, { status: tx.status === 'PAID' ? 'PENDING' : 'PAID' });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <FinanceContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      signOut,
      transactions,
      activeContext,
      selectedMonth,
      currentView,
      setActiveContext,
      setSelectedMonth,
      setCurrentView,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      toggleStatus
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
}
