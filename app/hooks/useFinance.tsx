import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format, parseISO } from 'date-fns';
import { ContextType, FinanceContextState, Transaction, ViewType, Category, Budget, SpendingLimit, DRESection, SalesTarget, Tag, FinancialGoal, Lead, LeadOption, ServiceType, Project, ProjectKanbanSettings, Task, ActiveScope, Account, AccountMember, AccountInvite, AccountRole, MonthlyClosing } from '../types';
import { auth, db, signInWithGoogle, signOut } from '../lib/firebase';
import { handleFirestoreError } from '../lib/handleFirestoreError';
import { DEFAULT_CATEGORIES } from '../lib/categories';
import { ALL_DEFAULT_LEAD_OPTIONS } from '../lib/leadDefaults';
import { normalizeProjectKanbanSettings } from '../lib/projectKanbanColumns';
import { resolveDataPath } from '../lib/pathAdapter';
import type { FinanceCollectionName } from '../lib/pathAdapter';
import { ensureUserOnboardingDocs } from '../lib/onboarding';
import { createAccount, getUserAccounts, getAccountMembers, getAccountInvites, migrateUserToAccount, createInvite, getPendingInvites, acceptInvite as acceptInviteSvc, archiveAccount, updateAccountSettings, revokeInvite } from '../lib/accountService';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, writeBatch, serverTimestamp, onSnapshot, query,
} from 'firebase/firestore';
import { useCollectionListener } from './useCollectionListener';
import { taskConverter } from '../lib/firestoreConverters';

const ACTIVE_SCOPE_KEY = 'gh_active_scope';

function loadSavedScope(): ActiveScope | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SCOPE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.type === 'string') {
      return parsed as ActiveScope;
    }
  } catch {}
  return null;
}

function saveScope(scope: ActiveScope) {
  try {
    localStorage.setItem(ACTIVE_SCOPE_KEY, JSON.stringify(scope));
  } catch {}
}

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
  const [spendingLimits, setSpendingLimits] = useState<SpendingLimit[]>([]);
  const [monthlyClosings, setMonthlyClosings] = useState<MonthlyClosing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectKanbanSettings, setProjectKanbanSettings] = useState<ProjectKanbanSettings>(
    normalizeProjectKanbanSettings()
  );
  const [tasksMap, setTasksMap] = useState<Record<string, Task[]>>({});
  const taskUnsubscribers = useRef<Record<string, () => void>>({});
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [leadOptionsLoaded, setLeadOptionsLoaded] = useState(false);

  const [activeScope, setActiveScope] = useState<ActiveScope>({ type: 'PERSONAL', userId: '' });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountMembers, setAccountMembers] = useState<AccountMember[]>([]);
  const [accountInvites, setAccountInvites] = useState<AccountInvite[]>([]);
  const [pendingInvites, setPendingInvites] = useState<AccountInvite[]>([]);
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
        setSpendingLimits([]);
        setLeads([]);
        setLeadOptions([]);
        setServiceTypes([]);
        setProjects([]);
        setProjectKanbanSettings(normalizeProjectKanbanSettings());
        setTasksMap({});
        for (const projectId in taskUnsubscribers.current) {
          const unsubscribeTask = taskUnsubscribers.current[projectId];
          if (typeof unsubscribeTask === 'function') {
            unsubscribeTask();
          }
        }
        taskUnsubscribers.current = {};
        setAccounts([]);
        setAccountMembers([]);
        setAccountInvites([]);
        setPendingInvites([]);
        setMonthlyClosings([]);
        setCategoriesLoaded(false);
        setLeadOptionsLoaded(false);
        setActiveScope({ type: 'PERSONAL', userId: '' });
        setLoading(false);
      } else {
        ensureUserOnboardingDocs({
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || '',
          authProvider: u.providerData.some((provider) => provider.providerId === 'google.com') ? 'google' : 'email',
        }).catch((error) => {
          console.error('Erro ao garantir onboarding do usuário:', error);
        });

        const saved = loadSavedScope();
        if (saved) {
          // Restore saved scope, updating userId for PERSONAL
          if (saved.type === 'PERSONAL') {
            setActiveScope({ type: 'PERSONAL', userId: u.uid });
          } else {
            setActiveScope(saved);
          }
        } else {
          setActiveScope({ type: 'PERSONAL', userId: u.uid });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Persist activeScope to localStorage
  useEffect(() => {
    if (activeScope.type === 'PERSONAL' && !activeScope.userId) return; // skip initial empty
    saveScope(activeScope);
  }, [activeScope]);

  // Load user accounts on login
  useEffect(() => {
    if (!user) return;
    getUserAccounts(user.uid).then((result) => {
      setAccounts(result.map((r) => r.account));
    }).catch(() => {});
    // Load pending invites for this user's email
    if (user.email) {
      getPendingInvites(user.email).then((invites) => {
        setPendingInvites(invites);
      }).catch((err) => {
        console.error('Erro ao carregar convites pendentes:', err);
      });
    }
  }, [user]);

  // Load members and invites when account scope is active
  useEffect(() => {
    if (!user || activeScope.type !== 'ACCOUNT') {
      setAccountMembers([]);
      setAccountInvites([]);
      return;
    }
    getAccountMembers(activeScope.accountId).then(setAccountMembers).catch(() => {});
    getAccountInvites(activeScope.accountId).then(setAccountInvites).catch(() => {});
  }, [user, activeScope.type === 'ACCOUNT' ? activeScope.accountId : null]);

// ponytail: generic collection listeners — each replaces a ~20-line useEffect block
  const onTxsLoaded = useCallback(() => setLoading(false), []);
  useCollectionListener(user, activeScope, 'transactions', setTransactions, onTxsLoaded);

  useCollectionListener(user, activeScope, 'categories', setCategories, () => setCategoriesLoaded(true));

  useCollectionListener(user, activeScope, 'budgets', setBudgets);

  useCollectionListener(user, activeScope, 'spending-limits', setSpendingLimits);

  useCollectionListener(user, activeScope, 'sales-targets', setSalesTargets);

  useCollectionListener(user, activeScope, 'tags', setTags);

  useCollectionListener(user, activeScope, 'goals', setGoals);

  useCollectionListener(user, activeScope, 'leads', setLeads);

  useCollectionListener(user, activeScope, 'lead-options', setLeadOptions, () => setLeadOptionsLoaded(true));

  useCollectionListener(user, activeScope, 'service-types', setServiceTypes);

  useCollectionListener(user, activeScope, 'projects', setProjects);

  useCollectionListener(user, activeScope, 'monthly-closings', setMonthlyClosings);

  // Kanban settings: single-doc listener (not a collection, so not using useCollectionListener)

  // Clean up task listeners on scope switch — ponytail: prevents memory leak and data contamination
  useEffect(() => {
    for (const projectId in taskUnsubscribers.current) {
      taskUnsubscribers.current[projectId]?.();
    }
    taskUnsubscribers.current = {};
    setTasksMap({});
  }, [activeScope]);

  // Project Kanban settings listener
  useEffect(() => {
    if (!user) {
      setProjectKanbanSettings(normalizeProjectKanbanSettings());
      return;
    }

    const colPath = resolveDataPath(activeScope, user.uid, 'project-kanban-settings');
    const docRef = doc(db, colPath, 'default');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        setProjectKanbanSettings(normalizeProjectKanbanSettings());
        return;
      }

      const data = snapshot.data();
      setProjectKanbanSettings(normalizeProjectKanbanSettings({
        id: snapshot.id,
        userId: data.userId,
        columns: data.columns || [],
        createdAt: data.createdAt?.toDate?.().toISOString() || undefined,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || undefined,
      }));
    }, (err) => {
      handleFirestoreError(err, 'list', `${colPath}/default`, user);
      setProjectKanbanSettings(normalizeProjectKanbanSettings());
    });

    return () => unsubscribe();
  }, [user, activeScope]);

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
      const colPath = resolveDataPath(activeScope, user.uid, 'transactions');
      const collectionRef = collection(db, colPath);

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
        let count: number;
        if (endDate) {
          const endTime = new Date(endDate).getTime();
          if (isNaN(endTime)) {
            count = 24;
          } else {
            const monthDiff = (endTime - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
            count = Math.min(Math.max(1, Math.ceil(monthDiff) + 1), 120);
          }
        } else {
          count = 24;
        }
        for (let i = 0; i < count; i++) {
          const docDate = addMonths(baseDate, i);
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
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'transactions'), user);
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>, applyToFuture?: boolean) => {
    if (!user) return;
    try {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      const batch = writeBatch(db);
      const colPath = resolveDataPath(activeScope, user.uid, 'transactions');

      if (applyToFuture && tx.groupId && tx.isFixed) {
        const futureTxs = transactions.filter(t => t.groupId === tx.groupId && new Date(t.date) >= new Date(tx.date));
        for (const ft of futureTxs) {
          const docRef = doc(db, colPath, ft.id);
          const toUpdate = { ...updates };
          delete toUpdate.date;
          batch.update(docRef, { ...toUpdate, updatedAt: serverTimestamp() });
        }
      } else {
        const docRef = doc(db, colPath, id);
        batch.update(docRef, { ...updates, updatedAt: serverTimestamp() });
      }

      await batch.commit();
    } catch (error) {
       handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'transactions')}/${id}`, user);
    }
  };

  const deleteTransaction = async (id: string, deleteFuture?: boolean) => {
    if (!user) return;
    try {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      const batch = writeBatch(db);
      const colPath = resolveDataPath(activeScope, user.uid, 'transactions');

      if (deleteFuture && tx.groupId) {
        const futureTxs = transactions.filter(t => t.groupId === tx.groupId && new Date(t.date) >= new Date(tx.date));
        for (const ft of futureTxs) {
          const docRef = doc(db, colPath, ft.id);
          batch.delete(docRef);
        }
      } else {
        const docRef = doc(db, colPath, id);
        batch.delete(docRef);
      }

      await batch.commit();
    } catch (error) {
       handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'transactions')}/${id}`, user);
    }
  };

  const toggleStatus = async (id: string) => {
    if (!user) return;
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    try {
      await updateTransaction(id, { status: tx.status === 'PAID' ? 'PENDING' : 'PAID' });
    } catch (error) {
      console.error(error);
    }
  };

  const closeMonth = async (year: number, month: number, notes?: string) => {
    if (!user) return;
    const contextValue: ContextType = activeScope.type === 'PERSONAL' ? 'PERSONAL' : 'BUSINESS';
    const monthTxs = transactions.filter(
      (t) => t.type !== 'CREDIT_CARD' && t.context === contextValue &&
        new Date(t.date).getFullYear() === year &&
        new Date(t.date).getMonth() + 1 === month
    );
    const totalIncome = monthTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const prevKey = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
    const prevClosing = monthlyClosings.find(
      (c) => c.context === contextValue && c.status === 'CLOSED' && `${c.year}-${c.month}` === prevKey
    );
    const openingBalance = prevClosing ? prevClosing.closingBalance : 0;
    const closingBalance = openingBalance + balance;

    const existingId = `${year}-${String(month).padStart(2, '0')}`;
    const colPath = resolveDataPath(activeScope, user.uid, 'monthly-closings');
    const docRef = doc(db, colPath, existingId);

    try {
      const batch = writeBatch(db);
      batch.set(docRef, {
        userId: user.uid,
        context: contextValue,
        year,
        month,
        status: 'CLOSED',
        totalIncome,
        totalExpense,

        balance,
        openingBalance,
        closingBalance,
        notes: notes || '',
        closedBy: user.uid,
        closedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', colPath, user);
    }
  };

  const reopenMonth = async (year: number, month: number) => {
    if (!user) return;
    const colPath = resolveDataPath(activeScope, user.uid, 'monthly-closings');
    const id = `${year}-${String(month).padStart(2, '0')}`;
    try {
      const batch = writeBatch(db);
      const docRef = doc(db, colPath, id);
      batch.update(docRef, {
        status: 'OPEN',
        reopenedBy: user.uid,
        reopenedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', colPath, user);
    }
  };

  const upsertBudget = async (categoryId: string, plannedAmount: number) => {
    if (!user) return;
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const contextValue: ContextType = activeScope.type === 'PERSONAL' ? 'PERSONAL' : 'BUSINESS';
      const existing = budgets.find(
        (b) => b.categoryId === categoryId && b.year === year && b.month === month && b.context === contextValue
      );

      const colPath = resolveDataPath(activeScope, user.uid, 'budgets');

      if (existing) {
        const docRef = doc(db, colPath, existing.id);
        const batch = writeBatch(db);
        batch.update(docRef, { plannedAmount, updatedAt: serverTimestamp() });
        await batch.commit();
      } else {
        const docRef = doc(collection(db, colPath));
        const batch = writeBatch(db);
        batch.set(docRef, {
          userId: user.uid,
          context: contextValue,
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
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'budgets'), user);
    }
  };

  const seedDefaultCategories = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const colPath = resolveDataPath(activeScope, user.uid, 'categories');
      const collectionRef = collection(db, colPath);

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
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'categories'), user);
    }
  };

  const addCategory = async (name: string, section: DRESection) => {
    if (!user) return;
    try {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.order), 0);
      const colPath = resolveDataPath(activeScope, user.uid, 'categories');
      const docRef = doc(collection(db, colPath));
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
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'categories'), user);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Pick<Category, 'name' | 'section' | 'order'>>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'categories');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.update(docRef, updates);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'categories')}/${id}`, user);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    const cat = categories.find((c) => c.id === id);
    if (!cat || cat.isDefault) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'categories');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'categories')}/${id}`, user);
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

      const colPath = resolveDataPath(activeScope, user.uid, 'sales-targets');

      if (existing) {
        const docRef = doc(db, colPath, existing.id);
        const batch = writeBatch(db);
        batch.update(docRef, { targetAmount: target.targetAmount, updatedAt: serverTimestamp() });
        await batch.commit();
      } else {
        const docRef = doc(collection(db, colPath));
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
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'sales-targets'), user);
    }
  };

  const deleteSalesTarget = async (id: string) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'sales-targets');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'sales-targets')}/${id}`, user);
    }
  };

  const addTag = async (name: string, color: string) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'tags');
      const docRef = doc(collection(db, colPath));
      const batch = writeBatch(db);
      batch.set(docRef, { userId: user.uid, name, color });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'tags'), user);
    }
  };

  const updateTag = async (id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'tags');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.update(docRef, updates);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'tags')}/${id}`, user);
    }
  };

  const deleteTag = async (id: string) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'tags');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'tags')}/${id}`, user);
    }
  };

  const addGoal = async (goal: Omit<FinancialGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'goals');
      const docRef = doc(collection(db, colPath));
      const batch = writeBatch(db);
      batch.set(docRef, { ...goal, userId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) { handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'goals'), user); }
  };

  const updateGoal = async (id: string, updates: Partial<FinancialGoal>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'goals');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.update(docRef, { ...updates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) { handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'goals')}/${id}`, user); }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'goals');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) { handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'goals')}/${id}`, user); }
  };

  // Spending limit CRUD
  const addSpendingLimit = async (data: Omit<SpendingLimit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'spending-limits');
      const docRef = doc(collection(db, colPath));
      const batch = writeBatch(db);
      const payload: Record<string, unknown> = {
        userId: user.uid,
        context: data.context,
        name: data.name,
        limitAmount: data.limitAmount,
        categoryIds: data.categoryIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.month !== undefined) payload.month = data.month;
      if (data.year !== undefined) payload.year = data.year;
      batch.set(docRef, payload);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'spending-limits'), user);
    }
  };

  const updateSpendingLimit = async (id: string, updates: Partial<Pick<SpendingLimit, 'name' | 'limitAmount' | 'categoryIds' | 'month' | 'year'>>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'spending-limits');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      );
      batch.update(docRef, { ...cleanUpdates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'spending-limits')}/${id}`, user);
    }
  };

  const deleteSpendingLimit = async (id: string) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'spending-limits');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'spending-limits')}/${id}`, user);
    }
  };

  // Lead CRUD
  const addLead = async (leadData: Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'leads');
      const docRef = doc(collection(db, colPath));
      const batch = writeBatch(db);
      batch.set(docRef, {
        ...leadData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'leads'), user);
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'leads');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.update(docRef, { ...updates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'leads')}/${id}`, user);
    }
  };

  const deleteLead = async (id: string) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'leads');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'leads')}/${id}`, user);
    }
  };

  // Lead Options CRUD
  const seedDefaultLeadOptions = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const colPath = resolveDataPath(activeScope, user.uid, 'lead-options');
      const collectionRef = collection(db, colPath);
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
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'lead-options'), user);
    }
  };

  const addLeadOption = async (field: LeadOption['field'], value: string, color?: string) => {
    if (!user) return;
    try {
      const maxOrder = leadOptions.filter(o => o.field === field).reduce((max, o) => Math.max(max, o.order), -1);
      const colPath = resolveDataPath(activeScope, user.uid, 'lead-options');
      const docRef = doc(collection(db, colPath));
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
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'lead-options'), user);
    }
  };

  const updateLeadOption = async (id: string, updates: Partial<Pick<LeadOption, 'value' | 'color'>>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'lead-options');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.update(docRef, updates);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'lead-options')}/${id}`, user);
    }
  };

  const deleteLeadOption = async (id: string) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'lead-options');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'lead-options')}/${id}`, user);
    }
  };

  // Service Type CRUD
  const addServiceType = async (data: Omit<ServiceType, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'service-types');
      const docRef = doc(collection(db, colPath));
      const batch = writeBatch(db);
      batch.set(docRef, {
        ...data,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'service-types'), user);
    }
  };

  const updateServiceType = async (id: string, updates: Partial<ServiceType>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'service-types');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.update(docRef, { ...updates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'service-types')}/${id}`, user);
    }
  };

  const deleteServiceType = async (id: string) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'service-types');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'service-types')}/${id}`, user);
    }
  };

  // Project CRUD
  const addProject = async (data: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'projects');
      const docRef = doc(collection(db, colPath));
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
      handleFirestoreError(error, 'create', resolveDataPath(activeScope, user.uid, 'projects'), user);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'projects');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      batch.update(docRef, { ...cleanUpdates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'projects')}/${id}`, user);
    }
  };

  const deleteProject = async (id: string) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'projects');
      const docRef = doc(db, colPath, id);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `${resolveDataPath(activeScope, user.uid, 'projects')}/${id}`, user);
    }
  };

  const updateProjectKanbanSettings = async (updates: Partial<ProjectKanbanSettings>) => {
    if (!user) return;
    try {
      const colPath = resolveDataPath(activeScope, user.uid, 'project-kanban-settings');
      const docRef = doc(db, colPath, 'default');
      const normalized = normalizeProjectKanbanSettings({
        ...projectKanbanSettings,
        ...updates,
      });
      const payload: Record<string, unknown> = {
        userId: user.uid,
        columns: normalized.columns,
        updatedAt: serverTimestamp(),
      };
      const batch = writeBatch(db);
      batch.set(docRef, payload, { merge: true });
      await batch.commit();
      setProjectKanbanSettings(normalized);
    } catch (error) {
      handleFirestoreError(error, 'update', `${resolveDataPath(activeScope, user.uid, 'project-kanban-settings')}/default`, user);
    }
  };

  // ---- Task CRUD (subcollection: projects/{projectId}/tasks) ----

  const getTaskColPath = useCallback((projectId: string) => {
    if (!user) return '';
    const base = resolveDataPath(activeScope, user.uid, 'projects');
    return `${base}/${projectId}/tasks`;
  }, [user, activeScope]);

  const loadTasks = useCallback((projectId: string) => {
    if (!user) return;
    const colPath = getTaskColPath(projectId);
    if (!colPath) return;

    // Already listening
    if (taskUnsubscribers.current[projectId]) return;

    const colRef = collection(db, colPath).withConverter(taskConverter);
    const q = query(colRef);

    const unsub = onSnapshot(q, (snapshot) => {
      const tasks: Task[] = snapshot.docs.map((docSnap) => docSnap.data());
      tasks.sort((a, b) => a.order - b.order);
      setTasksMap(prev => ({ ...prev, [projectId]: tasks }));
    }, (err) => {
      handleFirestoreError(err, 'list', colPath, user);
    });

    taskUnsubscribers.current[projectId] = unsub;
  }, [user, activeScope, getTaskColPath]);

  const unloadTasks = useCallback((projectId: string) => {
    const unsub = taskUnsubscribers.current[projectId];
    if (unsub) {
      unsub();
      delete taskUnsubscribers.current[projectId];
    }
    setTasksMap(prev => {
      if (!(projectId in prev)) return prev;
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
  }, []);

  const addTask = async (projectId: string, data: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const colPath = getTaskColPath(projectId);
    if (!colPath) return;
    try {
      const tasks = tasksMap[projectId] || [];
      const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order), -1);
      const docRef = doc(collection(db, colPath));
      const batch = writeBatch(db);
      batch.set(docRef, {
        ...data,
        projectId,
        userId: user.uid,
        order: data.order ?? (maxOrder + 1),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'create', colPath, user);
    }
  };

  const updateTask = async (projectId: string, taskId: string, updates: Partial<Task>) => {
    if (!user) return;
    const colPath = getTaskColPath(projectId);
    if (!colPath) return;
    try {
      const docRef = doc(db, colPath, taskId);
      const batch = writeBatch(db);
      batch.update(docRef, { ...updates, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'update', `${colPath}/${taskId}`, user);
    }
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    if (!user) return;
    const colPath = getTaskColPath(projectId);
    if (!colPath) return;
    try {
      const docRef = doc(db, colPath, taskId);
      const batch = writeBatch(db);
      batch.delete(docRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'delete', `${colPath}/${taskId}`, user);
    }
  };

  const createAccountFn = async (name: string) => {
    if (!user) return;
    const accountId = await createAccount(user, name);
    // Set state directly — avoids collectionGroup query that rules may reject
    const newAccount: Account = {
      id: accountId,
      name,
      ownerId: user.uid,
      memberRole: 'owner',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAccount]);
    setActiveScope({
      type: 'ACCOUNT',
      accountId,
      accountName: name,
      role: 'owner',
    });
  };

  const migrateToAccountFn = async (accountId: string) => {
    if (!user) return [];
    return migrateUserToAccount(user.uid, accountId);
  };

  const deleteAccountFn = async (accountId: string) => {
    if (!user) return;
    const account = accounts.find((a) => a.id === accountId);
    if (!account || account.ownerId !== user.uid) return;
    await archiveAccount(accountId);
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    if (activeScope.type === 'ACCOUNT' && activeScope.accountId === accountId) {
      setActiveScope({ type: 'PERSONAL', userId: user.uid });
    }
  };

  const inviteMemberFn = async (email: string, role: Exclude<AccountRole, 'owner'>) => {
    if (!user || activeScope.type !== 'ACCOUNT') return;
    const accountName = activeScope.accountName;
    const normalizedEmail = email.trim().toLowerCase();
    await createInvite(activeScope.accountId, normalizedEmail, role, user.uid, accountName);
    // Refresh account invites list
    const invites = await getAccountInvites(activeScope.accountId);
    setAccountInvites(invites);
  };

  const acceptInviteFn = async (inviteId: string, accountId: string) => {
    if (!user) return;
    await acceptInviteSvc(inviteId, accountId, user);
    // Refresh accounts and pending invites
    const result = await getUserAccounts(user.uid);
    setAccounts(result.map((r) => r.account));
    if (user.email) {
      const invites = await getPendingInvites(user.email);
      setPendingInvites(invites);
    }
  };

  const cancelInviteFn = async (inviteId: string) => {
    if (!user || activeScope.type !== 'ACCOUNT') return;
    const invite = accountInvites.find((i) => i.id === inviteId);
    if (!invite) return;
    await revokeInvite(activeScope.accountId, inviteId, invite.email);
    setAccountInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  const updateAccountSettingsFn = async (accountId: string, settings: Partial<Account['settings']>) => {
    await updateAccountSettings(accountId, settings);
    setAccounts((prev) => prev.map((account) => (
      account.id === accountId
        ? { ...account, settings: { ...(account.settings || {}), ...settings } as Account['settings'] }
        : account
    )));
    setActiveScope((prev) => {
      if (prev.type !== 'ACCOUNT' || prev.accountId !== accountId) return prev;
      return { ...prev };
    });
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
      spendingLimits,
      leads,
      leadOptions,
      serviceTypes,
      projects,
      projectKanbanSettings,
      projectKanbanColumns: projectKanbanSettings.columns,
      tasksMap,
      loadTasks,
      unloadTasks,
      accounts,
      accountMembers,
      accountInvites,
      monthlyClosings,
      closeMonth,
      reopenMonth,
      activeScope,
      activeContext: (activeScope.type === 'PERSONAL' ? 'PERSONAL' : 'BUSINESS') as ContextType,
      selectedMonth,
      currentView,
      setActiveScope,
      setSelectedMonth,
      setCurrentView,
      createAccount: createAccountFn,
      deleteAccount: deleteAccountFn,
      migrateToAccount: migrateToAccountFn,
      inviteMember: inviteMemberFn,
      acceptInvite: acceptInviteFn,
      cancelInvite: cancelInviteFn,
      updateAccountSettings: updateAccountSettingsFn,
      pendingInvites,
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
      addSpendingLimit,
      updateSpendingLimit,
      deleteSpendingLimit,
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
      updateProjectKanbanSettings,
      addTask,
      updateTask,
      deleteTask,
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
