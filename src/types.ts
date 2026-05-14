import { User } from 'firebase/auth';

export type ContextType = 'PERSONAL' | 'BUSINESS';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'CREDIT_CARD';
export type TransactionStatus = 'PENDING' | 'PAID';
export type ViewType = 'DASHBOARD' | 'TRANSACTIONS' | 'CREDIT_CARDS' | 'FIXED_MONTHLY' | 'REPORTS' | 'SETTINGS' | 'DRE' | 'BUDGET' | 'SALES' | 'IMPORT' | 'CALCULATORS' | 'GOALS' | 'COMMERCIAL' | 'PROJECTS' | 'SERVICE_TYPES';
export type AccountRole = 'owner' | 'admin' | 'member';
export type ActiveScope =
  | { type: 'PERSONAL'; userId: string }
  | { type: 'ACCOUNT'; accountId: string; accountName: string; role: AccountRole };

export type ProjectStatus = 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
export type DRESection = 'RECEITA' | 'CUSTOS' | 'DESPESAS';

export interface Account {
  id: string;
  name: string;
  ownerId: string;
  memberRole?: AccountRole;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface AccountMember {
  uid: string;
  email: string;
  role: AccountRole;
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountInvite {
  id: string;
  accountId: string;
  email: string;
  role: Exclude<AccountRole, 'owner'>;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  createdBy: string;
  expiresAt: string;
  createdAt: string;
}

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

export interface ServiceTypeStep {
  order: number;
  title: string;
}

export interface CustomFieldDef {
  key: string;
  label: string;
}

export interface ServiceType {
  id: string;
  userId: string;
  name: string;
  steps: ServiceTypeStep[];
  customFieldDefs: CustomFieldDef[];
  createdAt: string;
  updatedAt: string;
}

export interface StepStatus {
  stepIndex: number;
  done: boolean;
  notes?: string;
}

export interface CustomFieldValue {
  key: string;
  value: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  serviceTypeId?: string;
  leadId?: string;
  clientName: string;
  description: string;
  status: ProjectStatus;
  stepStatuses: StepStatus[];
  customFieldValues: CustomFieldValue[];
  dueDate?: string;
  price?: number;
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
  serviceTypes: ServiceType[];
  projects: Project[];
  accounts: Account[];
  accountMembers: AccountMember[];
  accountInvites: AccountInvite[];
  activeScope: ActiveScope;
  selectedMonth: Date;
  currentView: ViewType;

  activeContext: ContextType;
  setActiveScope: (scope: ActiveScope) => void;
  setSelectedMonth: (date: Date) => void;
  setCurrentView: (view: ViewType) => void;
  createAccount: (name: string) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  migrateToAccount: (accountId: string) => Promise<{ collection: string; migrated: number; skipped: number; errors: number }[]>;
  inviteMember: (email: string, role: Exclude<AccountRole, 'owner'>) => Promise<void>;
  acceptInvite: (inviteId: string, accountId: string) => Promise<void>;
  pendingInvites: AccountInvite[];
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
  addServiceType: (data: Omit<ServiceType, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateServiceType: (id: string, updates: Partial<ServiceType>) => Promise<void>;
  deleteServiceType: (id: string) => Promise<void>;
  addProject: (data: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}
