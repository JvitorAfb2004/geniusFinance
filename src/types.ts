import { User } from 'firebase/auth';

export type ContextType = 'PERSONAL' | 'BUSINESS';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'CREDIT_CARD';
export type TransactionStatus = 'PENDING' | 'PAID';
export type ViewType = 'DASHBOARD' | 'TRANSACTIONS' | 'CREDIT_CARDS' | 'FIXED_MONTHLY' | 'REPORTS' | 'SETTINGS' | 'DRE' | 'BUDGET' | 'SALES' | 'IMPORT' | 'CALCULATORS' | 'GOALS' | 'COMMERCIAL';

export type DRESection = 'RECEITA' | 'CUSTOS' | 'DESPESAS';

export interface Category {
  id: string;
  userId: string;
  name: string;
  section: DRESection;
  order: number;
  isDefault: boolean;
}

export interface Budget {
  id: string;
  userId: string;
  context: ContextType;
  year: number;
  month: number;
  categoryId: string;
  plannedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'SAVINGS' | 'INVESTMENT' | 'DEBT_PAYOFF' | 'PURCHASE';
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface SalesTarget {
  id: string;
  userId: string;
  context: ContextType;
  year: number;
  month: number;
  channel?: string;
  seller?: string;
  targetAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadOption {
  id: string;
  userId: string;
  field: 'status' | 'source' | 'service';
  value: string;
  color?: string;
  order: number;
  isDefault: boolean;
}

export interface Lead {
  id: string;
  userId: string;
  proposalDate: string;
  clientName: string;
  responsible: string;
  email: string;
  phone: string;
  service: string;
  status: string;
  description: string;
  source: string;
  link: string;
  additionalField: string;
  createdAt: string;
  updatedAt: string;
}

export interface DRERow {
  label: string;
  section: DRESection | 'TOTAL';
  indent: number;
  isBold: boolean;
  isSubtotal: boolean;
  categoryId?: string;
  planned: number;
  actual: number;
  months: { planned: number; actual: number }[];
}

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
  groupId?: string;
  installmentInfo?: string;
  endDate?: string; // Data fim para recorrência fixa

  categoryId?: string;
  tagIds?: string[];

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
  categories: Category[];
  budgets: Budget[];
  salesTargets: SalesTarget[];
  tags: Tag[];
  goals: FinancialGoal[];
  leads: Lead[];
  leadOptions: LeadOption[];
  activeContext: ContextType;
  selectedMonth: Date;
  currentView: ViewType;

  setActiveContext: (ctx: ContextType) => void;
  setSelectedMonth: (date: Date) => void;
  setCurrentView: (view: ViewType) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, generateMultiple?: 'INSTALLMENTS' | 'FIXED', count?: number) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>, applyToFuture?: boolean) => Promise<void>;
  deleteTransaction: (id: string, deleteFuture?: boolean) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;

  upsertBudget: (categoryId: string, plannedAmount: number) => Promise<void>;
  seedDefaultCategories: () => Promise<void>;
  addCategory: (name: string, section: DRESection) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'section' | 'order'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  upsertSalesTarget: (target: Omit<SalesTarget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteSalesTarget: (id: string) => Promise<void>;
  addTag: (name: string, color: string) => Promise<void>;
  updateTag: (id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addGoal: (goal: Omit<FinancialGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<FinancialGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addLeadOption: (field: LeadOption['field'], value: string, color?: string) => Promise<void>;
  updateLeadOption: (id: string, updates: Partial<Pick<LeadOption, 'value' | 'color'>>) => Promise<void>;
  deleteLeadOption: (id: string) => Promise<void>;
  seedDefaultLeadOptions: () => Promise<void>;
}
