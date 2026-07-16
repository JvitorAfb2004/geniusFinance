import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  WithFieldValue,
  PartialWithFieldValue,
  DocumentData,
} from 'firebase/firestore';
import type {
  Transaction,
  Category,
  Budget,
  SpendingLimit,
  SalesTarget,
  Tag,
  FinancialGoal,
  Lead,
  LeadOption,
  ServiceType,
  Project,
  Task,
  Account,
  AccountMember,
  AccountInvite,
  ProjectKanbanSettings,
  MonthlyClosing,
} from '../types';

function timestampToISO(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function createConverter<T>(
  fromFirestore: (data: DocumentData, id: string) => T,
  toFirestore: (model: WithFieldValue<T> | PartialWithFieldValue<T>) => DocumentData
): FirestoreDataConverter<T> {
  return {
    toFirestore(model) {
      return toFirestore(model);
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>) {
      return fromFirestore(snapshot.data(), snapshot.id);
    },
  };
}

export const transactionConverter = createConverter<Transaction>(
  (data, id) => ({
    id,
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
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    context: model.context,
    type: model.type,
    title: model.title,
    amount: model.amount,
    date: model.date,
    status: model.status,
    isFixed: model.isFixed,
    groupId: model.groupId,
    installmentInfo: model.installmentInfo,
    categoryId: model.categoryId,
    endDate: model.endDate,
    tagIds: model.tagIds,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const categoryConverter = createConverter<Category>(
  (data, id) => ({
    id,
    userId: data.userId,
    name: data.name,
    section: data.section,
    order: data.order,
    isDefault: data.isDefault,
  }),
  (model) => ({
    userId: model.userId,
    name: model.name,
    section: model.section,
    order: model.order,
    isDefault: model.isDefault,
  })
);

export const budgetConverter = createConverter<Budget>(
  (data, id) => ({
    id,
    userId: data.userId,
    context: data.context,
    year: data.year,
    month: data.month,
    categoryId: data.categoryId,
    plannedAmount: data.plannedAmount,
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    context: model.context,
    year: model.year,
    month: model.month,
    categoryId: model.categoryId,
    plannedAmount: model.plannedAmount,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const spendingLimitConverter = createConverter<SpendingLimit>(
  (data, id) => ({
    id,
    userId: data.userId,
    context: data.context,
    name: data.name,
    limitAmount: data.limitAmount,
    categoryIds: data.categoryIds || [],
    month: data.month,
    year: data.year,
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    context: model.context,
    name: model.name,
    limitAmount: model.limitAmount,
    categoryIds: model.categoryIds,
    month: model.month,
    year: model.year,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const monthlyClosingConverter = createConverter<MonthlyClosing>(
  (data, id) => ({
    id,
    userId: data.userId,
    context: data.context,
    year: data.year,
    month: data.month,
    status: data.status,
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    totalCreditCard: data.totalCreditCard,
    balance: data.balance,
    openingBalance: data.openingBalance,
    closingBalance: data.closingBalance,
    notes: data.notes || '',
    closedBy: data.closedBy,
    closedAt: data.closedAt,
    reopenedBy: data.reopenedBy,
    reopenedAt: data.reopenedAt,
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    context: model.context,
    year: model.year,
    month: model.month,
    status: model.status,
    totalIncome: model.totalIncome,
    totalExpense: model.totalExpense,
    totalCreditCard: model.totalCreditCard,
    balance: model.balance,
    openingBalance: model.openingBalance,
    closingBalance: model.closingBalance,
    notes: model.notes,
    closedBy: model.closedBy,
    closedAt: model.closedAt,
    reopenedBy: model.reopenedBy,
    reopenedAt: model.reopenedAt,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const salesTargetConverter = createConverter<SalesTarget>(
  (data, id) => ({
    id,
    userId: data.userId,
    context: data.context,
    year: data.year,
    month: data.month,
    channel: data.channel,
    seller: data.seller,
    targetAmount: data.targetAmount,
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    context: model.context,
    year: model.year,
    month: model.month,
    channel: model.channel,
    seller: model.seller,
    targetAmount: model.targetAmount,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const tagConverter = createConverter<Tag>(
  (data, id) => ({
    id,
    userId: data.userId,
    name: data.name,
    color: data.color,
  }),
  (model) => ({
    userId: model.userId,
    name: model.name,
    color: model.color,
  })
);

export const goalConverter = createConverter<FinancialGoal>(
  (data, id) => ({
    id,
    userId: data.userId,
    name: data.name,
    targetAmount: data.targetAmount,
    currentAmount: data.currentAmount,
    deadline: data.deadline,
    category: data.category,
    color: data.color,
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    name: model.name,
    targetAmount: model.targetAmount,
    currentAmount: model.currentAmount,
    deadline: model.deadline,
    category: model.category,
    color: model.color,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const leadConverter = createConverter<Lead>(
  (data, id) => ({
    id,
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
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    proposalDate: model.proposalDate,
    clientName: model.clientName,
    responsible: model.responsible,
    email: model.email,
    phone: model.phone,
    service: model.service,
    status: model.status,
    description: model.description,
    source: model.source,
    link: model.link,
    additionalField: model.additionalField,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const leadOptionConverter = createConverter<LeadOption>(
  (data, id) => ({
    id,
    userId: data.userId,
    field: data.field,
    value: data.value,
    color: data.color,
    order: data.order,
    isDefault: data.isDefault,
  }),
  (model) => ({
    userId: model.userId,
    field: model.field,
    value: model.value,
    color: model.color,
    order: model.order,
    isDefault: model.isDefault,
  })
);

export const serviceTypeConverter = createConverter<ServiceType>(
  (data, id) => ({
    id,
    userId: data.userId,
    name: data.name,
    steps: data.steps || [],
    customFieldDefs: data.customFieldDefs || [],
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    name: model.name,
    steps: model.steps,
    customFieldDefs: model.customFieldDefs,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const projectConverter = createConverter<Project>(
  (data, id) => ({
    id,
    userId: data.userId,
    title: data.title,
    serviceTypeId: data.serviceTypeId,
    leadId: data.leadId,
    clientName: data.clientName || '',
    description: data.description || '',
    status: data.status || 'BACKLOG',
    stepStatuses: data.stepStatuses || [],
    customFieldValues: data.customFieldValues || [],
    dueDate: data.dueDate,
    price: data.price,
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    title: model.title,
    serviceTypeId: model.serviceTypeId,
    leadId: model.leadId,
    clientName: model.clientName,
    description: model.description,
    status: model.status,
    stepStatuses: model.stepStatuses,
    customFieldValues: model.customFieldValues,
    dueDate: model.dueDate,
    price: model.price,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const taskConverter = createConverter<Task>(
  (data, id) => ({
    id,
    projectId: data.projectId,
    title: data.title || '',
    done: data.done || false,
    dueDate: data.dueDate,
    priority: data.priority || 'MEDIUM',
    assignee: data.assignee,
    description: data.description,
    subtasks: data.subtasks || [],
    order: data.order ?? 0,
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    projectId: model.projectId,
    title: model.title,
    done: model.done,
    dueDate: model.dueDate,
    priority: model.priority,
    assignee: model.assignee,
    description: model.description,
    subtasks: model.subtasks,
    order: model.order,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const accountConverter = createConverter<Account>(
  (data, id) => ({
    id,
    name: data.name,
    ownerId: data.ownerId,
    memberRole: data.memberRole,
    status: data.status,
    settings: data.settings,
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    name: model.name,
    ownerId: model.ownerId,
    memberRole: model.memberRole,
    status: model.status,
    settings: model.settings,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const accountMemberConverter = createConverter<AccountMember>(
  (data) => ({
    uid: data.uid,
    email: data.email,
    role: data.role,
    invitedBy: data.invitedBy,
    permissions: data.permissions,
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    uid: model.uid,
    email: model.email,
    role: model.role,
    invitedBy: model.invitedBy,
    permissions: model.permissions,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export const accountInviteConverter = createConverter<AccountInvite>(
  (data, id) => ({
    id,
    accountId: data.accountId,
    email: data.email,
    role: data.role,
    status: data.status,
    createdBy: data.createdBy,
    expiresAt: data.expiresAt,
    createdAt: timestampToISO(data.createdAt),
  }),
  (model) => ({
    accountId: model.accountId,
    email: model.email,
    role: model.role,
    status: model.status,
    createdBy: model.createdBy,
    expiresAt: model.expiresAt,
    createdAt: model.createdAt,
  })
);

export const projectKanbanSettingsConverter = createConverter<ProjectKanbanSettings>(
  (data, id) => ({
    id,
    userId: data.userId,
    columns: data.columns || [],
    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),
  }),
  (model) => ({
    userId: model.userId,
    columns: model.columns,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  })
);

export type FinanceCollectionName =
  | 'transactions'
  | 'categories'
  | 'budgets'
  | 'sales-targets'
  | 'tags'
  | 'goals'
  | 'leads'
  | 'lead-options'
  | 'service-types'
  | 'projects'
  | 'project-kanban-settings'
  | 'spending-limits'
  | 'monthly-closings';

export const converters: Record<FinanceCollectionName, FirestoreDataConverter<unknown>> = {
  transactions: transactionConverter,
  categories: categoryConverter,
  budgets: budgetConverter,
  'spending-limits': spendingLimitConverter,
  'sales-targets': salesTargetConverter,
  tags: tagConverter,
  goals: goalConverter,
  leads: leadConverter,
  'lead-options': leadOptionConverter,
  'service-types': serviceTypeConverter,
  projects: projectConverter,
  'project-kanban-settings': projectKanbanSettingsConverter,
  'monthly-closings': monthlyClosingConverter,
};