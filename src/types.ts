import { User } from 'firebase/auth';

export type ContextType = 'PERSONAL' | 'BUSINESS';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'CREDIT_CARD';
export type TransactionStatus = 'PENDING' | 'PAID';
export type ViewType = 'DASHBOARD' | 'TRANSACTIONS' | 'CREDIT_CARDS' | 'FIXED_MONTHLY' | 'REPORTS' | 'SETTINGS';

export interface Transaction {
  id: string;
  context: ContextType;
  type: TransactionType;
  title: string;
  amount: number; // Stored as positive absolute value
  date: string; // ISO date string YYYY-MM-DD
  status: TransactionStatus;
  
  // For recurring / installments
  isFixed?: boolean;
  groupId?: string; // To group installments or recurring items together
  installmentInfo?: string; // e.g. "1/12"
  
  userId: string;
  createdAt: string; 
  updatedAt: string;
}

export interface FinanceContextState {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  
  transactions: Transaction[];
  activeContext: ContextType;
  selectedMonth: Date; // represents the currently viewed month
  currentView: ViewType;
  
  setActiveContext: (ctx: ContextType) => void;
  setSelectedMonth: (date: Date) => void;
  setCurrentView: (view: ViewType) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, generateMultiple?: 'INSTALLMENTS' | 'FIXED', count?: number) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>, applyToFuture?: boolean) => Promise<void>;
  deleteTransaction: (id: string, deleteFuture?: boolean) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
}
