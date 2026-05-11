import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format, parseISO } from 'date-fns';
import { ContextType, FinanceContextState, Transaction, ViewType, Category, Budget, DRESection, SalesTarget, Tag, FinancialGoal, Lead, LeadOption, ServiceType, Project } from '../types';
import { auth, db, signInWithGoogle, signOut } from '../lib/firebase';
import { handleFirestoreError } from '../lib/handleFirestoreError';
import { DEFAULT_CATEGORIES } from '../lib/categories';
import { ALL_DEFAULT_LEAD_OPTIONS } from '../lib/leadDefaults';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [leadOptionsLoaded, setLeadOptionsLoaded] = useState(false);

  const [activeContext, setActiveContext] = useState<ContextType>('PERSONAL');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<ViewType>('DASHBOARD');

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setTransactions([]);
        setCategories([]);
        setBudgets([]);
        setSalesTargets([]);
        setTags([]);
        setGoals([]);
        setLeads([]);
        setLeadOptions([]);
        setServiceTypes([]);
        setProjects([]);
        setCategoriesLoaded(false);
        setLeadOptionsLoaded(false);
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
          categoryId: data.categoryId,
          endDate: data.endDate,
          tagIds: data.tagIds || [],
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

  // Categories listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/categories`),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats: Category[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          name: data.name,
          section: data.section,
          order: data.order,
          isDefault: data.isDefault,
        } as Category;
      });
      setCategories(cats);
      setCategoriesLoaded(true);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/categories`, user);
    });
    return () => unsubscribe();
  }, [user]);

  // Budgets listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/budgets`),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const buds: Budget[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          context: data.context,
          year: data.year,
          month: data.month,
          categoryId: data.categoryId,
          plannedAmount: data.plannedAmount,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as Budget;
      });
      setBudgets(buds);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/budgets`, user);
    });
    return () => unsubscribe();
  }, [user]);

  // Sales targets listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/sales-targets`),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const targets: SalesTarget[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          context: data.context,
          year: data.year,
          month: data.month,
          channel: data.channel,
          seller: data.seller,
          targetAmount: data.targetAmount,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as SalesTarget;
      });
      setSalesTargets(targets);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/sales-targets`, user);
    });
    return () => unsubscribe();
  }, [user]);

  // Tags listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/tags`),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const t: Tag[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return { id: docSnap.id, userId: data.userId, name: data.name, color: data.color } as Tag;
      });
      setTags(t);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/tags`, user);
    });
    return () => unsubscribe();
  }, [user]);

  // Goals listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/goals`), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const g: FinancialGoal[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id, userId: data.userId, name: data.name,
          targetAmount: data.targetAmount, currentAmount: data.currentAmount,
          deadline: data.deadline, category: data.category, color: data.color,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as FinancialGoal;
      });
      setGoals(g);
    }, (err) => { handleFirestoreError(err, 'list', `users/${user.uid}/goals`, user); });
    return () => unsubscribe();
  }, [user]);

  // Leads listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/leads`),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const l: Lead[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          proposalDate: data.proposalDate || '',
          clientName: data.clientName || '',
          responsible: data.responsible || '',
          email: data.email || '',
          phone: data.phone || '',
          service: data.service || '',
          status: data.status || 'Novo',
          description: data.description || '',
          source: data.source || '',
          link: data.link || '',
          additionalField: data.additionalField || '',
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as Lead;
      });
      setLeads(l);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/leads`, user);
    });
    return () => unsubscribe();
  }, [user]);

  // Lead options listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/lead-options`),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const opts: LeadOption[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          field: data.field,
          value: data.value,
          color: data.color,
          order: data.order,
          isDefault: data.isDefault,
        } as LeadOption;
      });
      setLeadOptions(opts);
      setLeadOptionsLoaded(true);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/lead-options`, user);
    });
    return () => unsubscribe();
  }, [user]);

  // Service types listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/service-types`),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const st: ServiceType[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          name: data.name,
          steps: data.steps || [],
          customFieldDefs: data.customFieldDefs || [],
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as ServiceType;
      });
      setServiceTypes(st);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/service-types`, user);
    });
    return () => unsubscribe();
  }, [user]);

  // Projects listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/projects`),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p: Project[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          title: data.title,
          serviceTypeId: data.serviceTypeId || undefined,
          leadId: data.leadId || undefined,
          clientName: data.clientName || '',
          description: data.description || '',
          status: data.status || 'BACKLOG',
          stepStatuses: data.stepStatuses || [],
          customFieldValues: data.customFieldValues || [],
          dueDate: data.dueDate || undefined,
          price: data.price || undefined,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as Project;
      });
      setProjects(p);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/projects`, user);
    });
    return () => unsubscribe();
  }, [user]);

  // Auto-seed lead options on first access
  useEffect(() => {
    if (!user || !leadOptionsLoaded) return;
    if (leadOptions.length === 0) {
      seedDefaultLeadOptions();
    }
  }, [user, leadOptionsLoaded, leadOptions.length]);

  // Auto-seed categories on first access
  useEffect(() => {
    if (!user || !categoriesLoaded) return;
    if (categories.length === 0) {
      seedDefaultCategories();
    }
  }, [user, categoriesLoaded, categories.length]);

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
        const endDate = (txData as Record<string, unknown>).endDate as string | undefined;
        const maxMonths = endDate
          ? Math.max(1, Math.ceil((new Date(endDate).getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1)
          : 24;
        const count = Math.min(maxMonths, 120); // Cap at 10 years
        for (let i = 0; i < count; i++) {
          const docDate = addMonths(baseDate, i);
          // Stop if we passed endDate
          if (endDate && docDate > new Date(endDate)) break;
          const docRef = doc(collectionRef);
          batch.set(docRef, {
            ...txData,
            date: format(docDate, 'yyyy-MM-dd'),
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

  const upsertBudget = async (categoryId: string, plannedAmount: number) => {
    if (!user) return;
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const existing = budgets.find(
        (b) => b.categoryId === categoryId && b.year === year && b.month === month && b.context === activeContext
      );

      if (existing) {
        const docRef = doc(db, `users/${user.uid}/budgets/${existing.id}`);
        const batch = writeBatch(db);
        batch.update(docRef, { plannedAmount, updatedAt: serverTimestamp() });
        await batch.commit();
      } else {
        const docRef = doc(collection(db, `users/${user.uid}/budgets`));
        const batch = writeBatch(db);
        batch.set(docRef, {
          userId: user.uid,
          context: activeContext,
          year,
          month,
          categoryId,
          plannedAmount,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/budgets`, user);
    }
  };

  const seedDefaultCategories = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, `users/${user.uid}/categories`);

      for (const cat of DEFAULT_CATEGORIES) {
        const docRef = doc(collectionRef);
        batch.set(docRef, {
          userId: user.uid,
          name: cat.name,
          section: cat.section,
          order: cat.order,
          isDefault: true,
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/categories`, user);
    }
  };

  const addCategory = async (name: string, section: DRESection) => {
    if (!user) return;
    try {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.order), 0);
      const docRef = doc(collection(db, `users/${user.uid}/categories`));
      const batch = writeBatch(db);
      batch.set(docRef, {
        userId: user.uid,
        name,
        section,
        order: maxOrder + 1,
        isDefault: false,
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/categories`, user);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Pick<Category, 'name' | 'section' | 'order'>>) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/categories/${id}`);
      const batch = writeBatch(db);
      batch.update(docRef, updates);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/categories/${id}`, user);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    const cat = categories.find((c) => c.id === id);
    if (!cat || cat.isDefault) return;
    try {
      const docRef = doc(db, `users/${user.uid}/categories/${id}`);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/categories/${id}`, user);
    }
  };

  const upsertSalesTarget = async (target: Omit<SalesTarget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const existing = salesTargets.find(
        (t) =>
          t.context === target.context &&
          t.year === target.year &&
          t.month === target.month &&
          t.channel === target.channel &&
          t.seller === target.seller
      );

      if (existing) {
        const docRef = doc(db, `users/${user.uid}/sales-targets/${existing.id}`);
        const batch = writeBatch(db);
        batch.update(docRef, { targetAmount: target.targetAmount, updatedAt: serverTimestamp() });
        await batch.commit();
      } else {
        const docRef = doc(collection(db, `users/${user.uid}/sales-targets`));
        const batch = writeBatch(db);
        const docData: Record<string, unknown> = {
          userId: user.uid,
          context: target.context,
          year: target.year,
          month: target.month,
          targetAmount: target.targetAmount,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (target.channel) docData.channel = target.channel;
        if (target.seller) docData.seller = target.seller;
        batch.set(docRef, docData);
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/sales-targets`, user);
    }
  };

  const deleteSalesTarget = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/sales-targets/${id}`);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/sales-targets/${id}`, user);
    }
  };

  const addTag = async (name: string, color: string) => {
    if (!user) return;
    try {
      const docRef = doc(collection(db, `users/${user.uid}/tags`));
      const batch = writeBatch(db);
      batch.set(docRef, { userId: user.uid, name, color });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/tags`, user);
    }
  };

  const updateTag = async (id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/tags/${id}`);
      const batch = writeBatch(db);
      batch.update(docRef, updates);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/tags/${id}`, user);
    }
  };

  const deleteTag = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/tags/${id}`);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/tags/${id}`, user);
    }
  };

  const addGoal = async (goal: Omit<FinancialGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const docRef = doc(collection(db, `users/${user.uid}/goals`));
      const batch = writeBatch(db);
      batch.set(docRef, { ...goal, userId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) { handleFirestoreError(error, 'create', `users/${user.uid}/goals`, user); }
  };

  const updateGoal = async (id: string, updates: Partial<FinancialGoal>) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/goals/${id}`);
      const batch = writeBatch(db);
      batch.update(docRef, { ...updates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) { handleFirestoreError(error, 'update', `users/${user.uid}/goals/${id}`, user); }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/goals/${id}`);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) { handleFirestoreError(error, 'delete', `users/${user.uid}/goals/${id}`, user); }
  };

  // Lead CRUD
  const addLead = async (leadData: Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const docRef = doc(collection(db, `users/${user.uid}/leads`));
      const batch = writeBatch(db);
      batch.set(docRef, {
        ...leadData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/leads`, user);
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/leads/${id}`);
      const batch = writeBatch(db);
      batch.update(docRef, { ...updates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/leads/${id}`, user);
    }
  };

  const deleteLead = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/leads/${id}`);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/leads/${id}`, user);
    }
  };

  // Lead Options CRUD
  const seedDefaultLeadOptions = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, `users/${user.uid}/lead-options`);
      for (const opt of ALL_DEFAULT_LEAD_OPTIONS) {
        const docRef = doc(collectionRef);
        batch.set(docRef, {
          userId: user.uid,
          field: opt.field,
          value: opt.value,
          color: opt.color || null,
          order: opt.order,
          isDefault: true,
        });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/lead-options`, user);
    }
  };

  const addLeadOption = async (field: LeadOption['field'], value: string, color?: string) => {
    if (!user) return;
    try {
      const maxOrder = leadOptions.filter(o => o.field === field).reduce((max, o) => Math.max(max, o.order), -1);
      const docRef = doc(collection(db, `users/${user.uid}/lead-options`));
      const batch = writeBatch(db);
      const data: Record<string, unknown> = {
        userId: user.uid,
        field,
        value,
        order: maxOrder + 1,
        isDefault: false,
      };
      if (color) data.color = color;
      batch.set(docRef, data);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/lead-options`, user);
    }
  };

  const updateLeadOption = async (id: string, updates: Partial<Pick<LeadOption, 'value' | 'color'>>) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/lead-options/${id}`);
      const batch = writeBatch(db);
      batch.update(docRef, updates);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/lead-options/${id}`, user);
    }
  };

  const deleteLeadOption = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/lead-options/${id}`);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/lead-options/${id}`, user);
    }
  };

  // Service Type CRUD
  const addServiceType = async (data: Omit<ServiceType, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const docRef = doc(collection(db, `users/${user.uid}/service-types`));
      const batch = writeBatch(db);
      batch.set(docRef, {
        ...data,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/service-types`, user);
    }
  };

  const updateServiceType = async (id: string, updates: Partial<ServiceType>) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/service-types/${id}`);
      const batch = writeBatch(db);
      batch.update(docRef, { ...updates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/service-types/${id}`, user);
    }
  };

  const deleteServiceType = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/service-types/${id}`);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/service-types/${id}`, user);
    }
  };

  // Project CRUD
  const addProject = async (data: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const docRef = doc(collection(db, `users/${user.uid}/projects`));
      const batch = writeBatch(db);
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/projects`, user);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/projects/${id}`);
      const batch = writeBatch(db);
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      batch.update(docRef, { ...cleanUpdates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/projects/${id}`, user);
    }
  };

  const deleteProject = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/projects/${id}`);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/projects/${id}`, user);
    }
  };

  return (
    <FinanceContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      signOut,
      transactions,
      categories,
      budgets,
      salesTargets,
      tags,
      goals,
      leads,
      leadOptions,
      serviceTypes,
      projects,
      activeContext,
      selectedMonth,
      currentView,
      setActiveContext,
      setSelectedMonth,
      setCurrentView,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      toggleStatus,
      upsertBudget,
      seedDefaultCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      upsertSalesTarget,
      deleteSalesTarget,
      addTag,
      updateTag,
      deleteTag,
      addGoal,
      updateGoal,
      deleteGoal,
      addLead,
      updateLead,
      deleteLead,
      addLeadOption,
      updateLeadOption,
      deleteLeadOption,
      seedDefaultLeadOptions,
      addServiceType,
      updateServiceType,
      deleteServiceType,
      addProject,
      updateProject,
      deleteProject,
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
