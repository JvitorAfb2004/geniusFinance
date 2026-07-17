import type { ActionFunctionArgs } from 'react-router';
import { getAdminAuth } from '~/services/firebase-admin.server';
import { getAdminFirestore } from '~/services/firebase-admin.server';
import { computeDRE } from '~/lib/dre';
import { detectRecurring } from '~/lib/recurrenceDetector';
import { formatCurrency } from '~/lib/utils';
import { isSameMonth, parseISO, startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import type { DocumentData, QueryDocumentSnapshot, DocumentSnapshot } from 'firebase-admin/firestore';

const db = getAdminFirestore();

interface ToolRequest {
  name: string;
  arguments: Record<string, unknown>;
}

interface TransactionDoc {
  id: string;
  userId: string;
  context: string;
  type: 'INCOME' | 'EXPENSE';
  title: string;
  amount: number;
  date: string;
  status: 'PAID' | 'PENDING';
  isFixed?: boolean;
  groupId?: string;
  installmentInfo?: string;
  categoryId?: string;
  endDate?: string;
  tagIds?: string[];
  createdAt: string;
  updatedAt: string;
}

interface CategoryDoc {
  id: string;
  userId: string;
  context: string;
  name: string;
  section: 'RECEITA' | 'CUSTOS' | 'DESPESAS';
  order: number;
  isDefault: boolean;
}

function docToData(doc: any): any {
  return { id: doc.id, ...doc.data() };
}

async function getUserScope(request: Request): Promise<{
  userId: string;
  scope: { type: 'PERSONAL'; userId: string } | { type: 'ACCOUNT'; accountId: string; accountName: string; role: string };
  context: 'PERSONAL' | 'BUSINESS';
}> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.slice(7);
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(token);
  const userId = decoded.uid;

  const activeScopeHeader = request.headers.get('X-Active-Scope');
  let scope: { type: 'PERSONAL'; userId: string } | { type: 'ACCOUNT'; accountId: string; accountName: string; role: string };
  let context: 'PERSONAL' | 'BUSINESS' = 'PERSONAL';

  if (activeScopeHeader) {
    try {
      scope = JSON.parse(activeScopeHeader);
      context = scope.type === 'PERSONAL' ? 'PERSONAL' : 'BUSINESS';
    } catch {
      scope = { type: 'PERSONAL', userId };
    }
  } else {
    scope = { type: 'PERSONAL', userId };
  }

  return { userId, scope, context };
}

function resolveDataPath(scope: { type: 'PERSONAL'; userId: string } | { type: 'ACCOUNT'; accountId: string }, uid: string, collection: string) {
  if (scope.type === 'ACCOUNT') {
    return `accounts/${scope.accountId}/${collection}`;
  }
  return `users/${uid}/${collection}`;
}

async function listTransactions(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const dataPath = resolveDataPath(scope, userId, 'transactions');
  let query = db.collection(dataPath).where('context', '==', context);

  if (scope.type === 'PERSONAL') {
    query = query.where('userId', '==', userId);
  }

  if (args.startDate) query = query.where('date', '>=', args.startDate);
  if (args.endDate) query = query.where('date', '<=', args.endDate);
  if (args.type) query = query.where('type', '==', args.type);
  if (args.categoryId) query = query.where('categoryId', '==', args.categoryId);
  if (args.status) query = query.where('status', '==', args.status);

  query = query.orderBy('date', 'desc');
  if (args.limit) query = query.limit(args.limit);
  if (args.offset) query = query.offset(args.offset);

  const snapshot = await query.get();
  return snapshot.docs.map(docToData);
}

async function createTransaction(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const dataPath = resolveDataPath(scope, userId, 'transactions');
  const insertData = {
    ...args,
    userId,
    context,
    accountId: scope.type === 'ACCOUNT' ? scope.accountId : null,
    status: args.status || 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = await db.collection(dataPath).add(insertData);
  const doc = await docRef.get();
  return docToData(doc);
}

async function updateTransaction(args: any, { userId, scope }: Awaited<ReturnType<typeof getUserScope>>) {
  const { id, applyToFuture, ...updates } = args;
  const dataPath = resolveDataPath(scope, userId, 'transactions');
  const docRef = db.collection(dataPath).doc(id);

  await docRef.update({ ...updates, updatedAt: new Date().toISOString() });

  if (applyToFuture) {
    const doc = await docRef.get();
    const data = doc.data();
    if (data?.groupId) {
      const futureQuery = db.collection(dataPath)
        .where('groupId', '==', data.groupId)
        .where('date', '>=', data.date);
      const futureSnapshot = await futureQuery.get();
      const batch = db.batch();
      futureSnapshot.docs.forEach(futureDoc => {
        if (futureDoc.id !== id) {
          batch.update(futureDoc.ref, { ...updates, updatedAt: new Date().toISOString() });
        }
      });
      await batch.commit();
    }
  }

  const updated = await docRef.get();
  return docToData(updated);
}

async function deleteTransaction(args: any, { userId, scope }: Awaited<ReturnType<typeof getUserScope>>) {
  const { id, deleteFuture } = args;
  const dataPath = resolveDataPath(scope, userId, 'transactions');
  const docRef = db.collection(dataPath).doc(id);

  const doc = await docRef.get();
  const data = doc.data();

  if (deleteFuture && data?.groupId) {
    const futureQuery = db.collection(dataPath)
      .where('groupId', '==', data.groupId)
      .where('date', '>=', data.date);
    const futureSnapshot = await futureQuery.get();
    const batch = db.batch();
    futureSnapshot.docs.forEach(futureDoc => batch.delete(futureDoc.ref));
    await batch.commit();
    return { deleted: true, count: 'future_included' };
  }

  await docRef.delete();
  return { deleted: true };
}

async function listCategories(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const dataPath = resolveDataPath(scope, userId, 'categories');
  let query = db.collection(dataPath).where('context', '==', context);

  if (scope.type === 'PERSONAL') query = query.where('userId', '==', userId);
  else query = query.where('accountId', '==', scope.accountId);

  if (args.section) query = query.where('section', '==', args.section);
  query = query.orderBy('order', 'asc');

  const snapshot = await query.get();
  return snapshot.docs.map(docToData);
}

async function createCategory(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const dataPath = resolveDataPath(scope, userId, 'categories');
  const catsSnapshot = await db.collection(dataPath).where('context', '==', context).get();
  const maxOrder = catsSnapshot.docs.reduce((m, d) => Math.max(m, d.data().order || 0), 0);

  const insertData = {
    ...args,
    userId,
    context,
    accountId: scope.type === 'ACCOUNT' ? scope.accountId : null,
    order: maxOrder + 1,
    isDefault: false,
  };

  const docRef = await db.collection(dataPath).add(insertData);
  const doc = await docRef.get();
  return docToData(doc);
}

async function listBudgets(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const now = new Date();
  const year = args.year || now.getFullYear();
  const month = args.month || now.getMonth() + 1;

  const dataPath = resolveDataPath(scope, userId, 'budgets');
  let query = db.collection(dataPath)
    .where('context', '==', context)
    .where('year', '==', year)
    .where('month', '==', month);

  if (scope.type === 'PERSONAL') query = query.where('userId', '==', userId);
  else query = query.where('accountId', '==', scope.accountId);

  const snapshot = await query.get();
  return snapshot.docs.map(docToData);
}

async function createBudget(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const dataPath = resolveDataPath(scope, userId, 'budgets');
  const insertData = {
    ...args,
    userId,
    context,
    accountId: scope.type === 'ACCOUNT' ? scope.accountId : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingQuery = db.collection(dataPath)
    .where('categoryId', '==', args.categoryId)
    .where('year', '==', args.year)
    .where('month', '==', args.month)
    .where('context', '==', context)
    .limit(1);
  const existing = await existingQuery.get();

  if (!existing.empty) {
    const docRef = existing.docs[0].ref;
    await docRef.update({ plannedAmount: args.plannedAmount, updatedAt: new Date().toISOString() });
    const updated = await docRef.get();
    return docToData(updated);
  }

  const docRef = await db.collection(dataPath).add(insertData);
  const doc = await docRef.get();
  return docToData(doc);
}

async function generateFinancialReport(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const transactions = await listTransactions({ startDate: args.startDate, endDate: args.endDate }, { userId, scope, context });
  const categories = await listCategories({}, { userId, scope, context });

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type !== 'INCOME').reduce((s, t) => s + t.amount, 0);

  const byCategory: Record<string, { income: number; expense: number; count: number }> = {};
  for (const t of transactions) {
    const cat = categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria';
    if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0, count: 0 };
    if (t.type === 'INCOME') byCategory[cat].income += t.amount;
    else byCategory[cat].expense += t.amount;
    byCategory[cat].count++;
  }

  const topExpenses = Object.entries(byCategory)
    .filter(([, v]) => v.expense > 0)
    .sort(([, a], [, b]) => b.expense - a.expense)
    .slice(0, 10)
    .map(([name, v]) => ({ name, total: v.expense, count: v.count }));

  let projections = '';
  if (args.includeProjections) {
    const recurring = detectRecurring(transactions as any);
    if (recurring.length > 0) {
      projections = '\n\nPROJEÇÕES RECORRENTES:\n' + recurring.map(r =>
        `- ${r.title}: ${formatCurrency(r.amount)}/mês (confiança ${Math.round(r.confidence * 100)}%)`
      ).join('\n');
    }
  }

  return {
    period: { start: args.startDate, end: args.endDate },
    summary: { totalIncome: income, totalExpense: expenses, net: income - expenses, transactionCount: transactions.length },
    topExpenses,
    projections,
  };
}

async function getDREData(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const transactions = await listTransactions({}, { userId, scope, context });
  const categories = await listCategories({}, { userId, scope, context });

  const filtered = transactions.filter(t => {
    const d = new Date(t.date);
    if (d.getFullYear() !== args.year) return false;
    if (args.month && d.getMonth() + 1 !== args.month) return false;
    return true;
  });

  const budgets = await listBudgets({ year: args.year, month: args.month }, { userId, scope, context });
  const dre = computeDRE(filtered as any, budgets as any, categories as any);
  return dre;
}

async function getCashFlow(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const transactions = await listTransactions({}, { userId, scope, context });
  const months = args.months || 6;
  const now = new Date();
  const projections = [];

  for (let i = 0; i < months; i++) {
    const targetDate = addMonths(now, i);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    const monthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });

    const income = monthTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter(t => t.type !== 'INCOME').reduce((s, t) => s + t.amount, 0);

    projections.push({
      month: format(targetDate, 'MMMM/yyyy'),
      projectedIncome: income,
      projectedExpense: expense,
      projectedBalance: income - expense,
    });
  }

  return { projections };
}

async function detectRecurringTool(args: any, { userId, scope, context }: Awaited<ReturnType<typeof getUserScope>>) {
  const transactions = await listTransactions({}, { userId, scope, context });
  const suggestions = detectRecurring(transactions as any);
  return suggestions.filter(s => s.confidence >= 0.5).slice(0, 10);
}

const HANDLERS: Record<string, (args: any, scope: Awaited<ReturnType<typeof getUserScope>>) => Promise<any>> = {
  list_transactions: listTransactions,
  create_transaction: createTransaction,
  update_transaction: updateTransaction,
  delete_transaction: deleteTransaction,
  list_categories: listCategories,
  create_category: createCategory,
  list_budgets: listBudgets,
  create_budget: createBudget,
  generate_financial_report: generateFinancialReport,
  get_dre_data: getDREData,
  get_cash_flow: getCashFlow,
  detect_recurring: detectRecurringTool,
};

export async function action({ request }: ActionFunctionArgs) {
  try {
    const scope = await getUserScope(request);
    const body: ToolRequest = await request.json();

    const handler = HANDLERS[body.name];
    if (!handler) {
      return new Response(JSON.stringify({ error: `Tool ${body.name} not found` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await handler(body.arguments, scope);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}