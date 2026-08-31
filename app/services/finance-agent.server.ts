import { getAdminFirestore } from "~/services/firebase-admin.server";
import { completeWithDeepSeek, type DeepSeekTool } from "~/services/deepseek.server";
import { computeDRE } from "~/lib/dre";
import { detectRecurring } from "~/lib/recurrenceDetector";
import { buildScopedReadContext, createProposal, validateAgentScope } from "~/lib/finance-agent";
import type { AgentMessage, ValidatedAgentScope } from "~/lib/finance-agent-types";

const db = getAdminFirestore();
const MAX_RESULTS = 500;
const SYSTEM_PROMPT = `Você é o Agente Financeiro do Genius Finance.
Responda em português brasileiro, com objetividade e no máximo 5 linhas por conta.
Quando houver mais de uma conta, use sempre um título ## Nome da conta para cada uma e nunca misture os valores.
Ao listar transações (pendentes, do período, etc), SEMPRE use tabelas Markdown com colunas: Descrição | Data | Valor. Nunca use listas com bullets para listar transações — apenas tabelas.
Use tabelas Markdown SEMPRE que listar dados tabulares (transações, resumos, DRE).
Use ferramentas para todos os números e nunca invente dados.
Use apenas os escopos de leitura autorizados recebidos. Alterações (criar/editar/excluir) acontecem SEMPRE e APENAS no escopo ativo. Se o usuário pedir para mover/transferir dados entre contas, use a ferramenta propose_move_transaction — ela cria na conta ativa e exclui da origem automaticamente, sem precisar trocar de conta. Se não puder executar algo, explique o motivo claramente — nunca diga "não encontrei uma resposta" sem explicar por quê.
Antes de editar ou excluir, consulte o registro e use uma ferramenta propose_*. O campo 'id' no propose DEVE ser o ID real retornado pela leitura no escopo ativo — nunca use IDs de outros escopos.
Nunca diga que uma alteração foi feita sem uma confirmação posterior do usuário.
Para datas ambíguas ou dados obrigatórios ausentes (ex: falta valor, descrição ou não sabe em qual conta o usuário quer criar), FAÇA UMA PERGUNTA ao usuário antes de acionar a ferramenta propose_*. (Se o usuário quiser criar numa conta diferente da ativa, avise-o para trocar de conta no aplicativo).
Importante para transações: os parâmetros 'title' (string, descrição) e 'amount' (número) na ferramenta propose são estritamente obrigatórios.
Quando o usuário pedir múltiplas coisas na mesma mensagem (ex: "liste pendências E mude a data da ritalina"), execute TODAS as tarefas em sequência: primeiro leia os dados, depois proponha a alteração. Não pare no meio — complete tudo antes de responder.
Explique brevemente o período e os filtros usados nas análises.`;

const PENDING_INSTRUCTION = "REGRA OBRIGATÓRIA: status PENDING significa não pago, não significa apenas a vencer. Para perguntas sobre pendências ou o que precisa pagar, inclua todas as transações PENDING do período, inclusive as vencidas. É errado omitir uma pendência por a data ter passado. Só filtre para datas futuras se o usuário pedir literalmente apenas as futuras.";

const parameter = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object", properties, required, additionalProperties: false,
});

export const FINANCE_AGENT_TOOLS: DeepSeekTool[] = [
  { type: "function", function: { name: "list_transactions", description: "Lista transações financeiras do escopo ativo com filtros. Status PENDING inclui pendências vencidas e não vencidas.", parameters: parameter({ startDate: { type: "string" }, endDate: { type: "string" }, type: { type: "string", enum: ["INCOME", "EXPENSE", "CREDIT_CARD"] }, categoryId: { type: "string" }, status: { type: "string", enum: ["PAID", "PENDING"] }, limit: { type: "number" } }) } },
  { type: "function", function: { name: "list_pending_transactions", description: "Lista TODAS as transações com status PENDING no período, incluindo as vencidas. Use para responder o que ainda precisa ser pago.", parameters: parameter({ startDate: { type: "string" }, endDate: { type: "string" }, limit: { type: "number" } }) } },
  { type: "function", function: { name: "get_financial_summary", description: "Calcula receitas, despesas, saldo, margem e quantidade do período.", parameters: parameter({ startDate: { type: "string" }, endDate: { type: "string" } }, ["startDate", "endDate"]) } },
  ...(["categories", "tags", "budgets", "spending-limits", "goals", "monthly-closings", "fixed-monthly", "sales"] as const).map((name) => ({ type: "function" as const, function: { name: `list_${name.replace("-", "_")}`, description: `Lista ${name} do escopo ativo.`, parameters: parameter({}) } })),
  { type: "function", function: { name: "get_dre", description: "Calcula o DRE do ano e mês informados.", parameters: parameter({ year: { type: "number" }, month: { type: "number" } }, ["year"]) } },
  { type: "function", function: { name: "get_cash_flow", description: "Calcula o fluxo de caixa dos próximos meses com base nos lançamentos cadastrados.", parameters: parameter({ months: { type: "number" } }) } },
  { type: "function", function: { name: "detect_recurring", description: "Detecta possíveis receitas e despesas recorrentes.", parameters: parameter({}) } },
  ...(["create_transaction", "update_transaction", "delete_transaction", "create_category", "update_category", "delete_category", "create_budget", "update_budget", "delete_budget", "create_goal", "update_goal", "delete_goal", "create_spending_limit", "update_spending_limit", "delete_spending_limit"] as const).map((name) => ({ type: "function" as const, function: { name: `propose_${name}`, description: `Prepara ${name.replaceAll("_", " ")} para confirmação explícita. Nunca executa diretamente.`, parameters: parameter({ arguments: { type: "object" } }, ["arguments"]) } })),
  ...(["create_tag", "update_tag", "delete_tag", "close_month", "reopen_month"] as const).map((name) => ({ type: "function" as const, function: { name: `propose_${name}`, description: `Prepara ${name.replaceAll("_", " ")} para confirmação explícita. Nunca executa diretamente.`, parameters: parameter({ arguments: { type: "object" } }, ["arguments"]) } })),
  { type: "function" as const, function: { name: "propose_move_transaction", description: "Move uma transação de uma conta para a conta ativa. Cria na conta ativa com os mesmos dados e exclui da origem. Use quando o usuário pedir para mover/transferir transação entre contas.", parameters: parameter({ arguments: { type: "object", properties: { id: { type: "string", description: "ID da transação de origem" }, fromScopeType: { type: "string", enum: ["PERSONAL", "ACCOUNT"], description: "Tipo do escopo de origem" }, fromAccountId: { type: "string", description: "ID da conta de origem (obrigatório se fromScopeType for ACCOUNT)" } } } }, ["arguments"]) } },
];

export type AgentContext = { uid: string; scope: ValidatedAgentScope; context: "PERSONAL" | "BUSINESS" };
export type ReadScope = { label: string; context: AgentContext };

function collectionPath(scope: ValidatedAgentScope, collection: string) {
  return scope.type === "ACCOUNT" ? `accounts/${scope.accountId}/${collection}` : `users/${scope.userId}/${collection}`;
}

function asJson(data: FirebaseFirestore.DocumentData, id: string) {
  return JSON.parse(JSON.stringify({ id, ...data }, (_, value) => value?.toDate instanceof Function ? value.toDate().toISOString() : value));
}

async function listCollection(name: string, context: AgentContext) {
  const snapshot = await db.collection(collectionPath(context.scope, name)).get();
  return snapshot.docs.map((doc) => asJson(doc.data(), doc.id)).filter((item: Record<string, unknown>) => item.context === context.context || name === "tags" || name === "monthly-closings");
}

async function listTransactions(args: Record<string, unknown>, context: AgentContext) {
  const rows = await listCollection("transactions", context);
  return rows.filter((item: Record<string, unknown>) => (!args.startDate || String(item.date) >= String(args.startDate)) && (!args.endDate || String(item.date) <= String(args.endDate)) && (!args.type || item.type === args.type) && (!args.categoryId || item.categoryId === args.categoryId) && (!args.status || item.status === args.status)).slice(0, Math.min(Number(args.limit) || MAX_RESULTS, MAX_RESULTS));
}

async function readTool(name: string, args: Record<string, unknown>, context: AgentContext) {
  if (name === "list_transactions") return listTransactions(args, context);
  if (name === "list_pending_transactions") {
    return {
      rule: "Todas as transações abaixo têm status PENDING e precisam ser pagas. Inclua também as que têm data anterior a hoje; vencimento passado não muda o status.",
      transactions: await listTransactions({ ...args, status: "PENDING" }, context),
    };
  }
  if (name === "list_fixed_monthly") return (await listTransactions({}, context)).filter((item: Record<string, unknown>) => item.isFixed === true);
  if (name === "list_sales") return listCollection("sales-targets", context);
  if (name.startsWith("list_")) return listCollection(name.slice(5).replace("_", "-"), context);
  if (name === "detect_recurring") return detectRecurring(await listTransactions({}, context) as never);
  if (name === "get_dre") {
    const year = Number(args.year), month = args.month ? Number(args.month) : undefined;
    const transactions = (await listTransactions({}, context)).filter((item: Record<string, unknown>) => { const date = new Date(String(item.date)); return date.getFullYear() === year && (!month || date.getMonth() + 1 === month); });
    return computeDRE(transactions as never, await listCollection("budgets", context) as never, await listCollection("categories", context) as never);
  }
  if (name === "get_financial_summary") {
    const transactions = await listTransactions(args, context);
    const income = transactions.filter((item: Record<string, unknown>) => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expense = transactions.filter((item: Record<string, unknown>) => item.type !== "INCOME").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { startDate: args.startDate, endDate: args.endDate, income, expense, balance: income - expense, margin: income ? ((income - expense) / income) * 100 : 0, count: transactions.length };
  }
  if (name === "get_cash_flow") {
    const transactions = await listTransactions({}, context);
    const months = Math.min(Math.max(Number(args.months) || 6, 1), 12);
    const now = new Date();
    return Array.from({ length: months }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
      const year = date.getFullYear(), month = date.getMonth();
      const rows = transactions.filter((item: Record<string, unknown>) => { const itemDate = new Date(String(item.date)); return itemDate.getFullYear() === year && itemDate.getMonth() === month; });
      const income = rows.filter((item: Record<string, unknown>) => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const expense = rows.filter((item: Record<string, unknown>) => item.type !== "INCOME").reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return { year, month: month + 1, income, expense, balance: income - expense };
    });
  }
  throw new Error("ferramenta de leitura não permitida");
}

function moduleForAction(action: string) {
  if (action.includes("transaction")) return "transactions";
  if (action.includes("categor") || action.includes("tag")) return "transactions";
  if (action.includes("budget")) return "budget";
  if (action.includes("goal")) return "goals";
  if (action.includes("spending_limit")) return "spending-limits";
  if (action.includes("month")) return "monthly-closing";
  return "reports";
}

export function canUseAction(scope: ValidatedAgentScope, action: string, permission: "view" | "create" | "edit" | "delete") {
  if (scope.type === "PERSONAL" || scope.role === "owner" || scope.role === "admin") return true;
  const module = moduleForAction(action);
  return scope.permissions?.[module]?.includes(permission) === true;
}

export async function resolveFinanceScope(request: Request, uid: string): Promise<AgentContext> {
  const scope = validateAgentScope(request, uid);
  if (scope.type === "ACCOUNT") {
    const member = await db.collection(`accounts/${scope.accountId}/members`).doc(uid).get();
    if (!member.exists) throw new Error("usuário não pertence a este escopo");
    scope.role = (member.data()?.role as ValidatedAgentScope["role"]);
    scope.permissions = member.data()?.permissions as Record<string, string[]> | undefined;
  }
  return { uid, scope, context: scope.type === "ACCOUNT" ? "BUSINESS" : "PERSONAL" };
}

export async function resolveFinanceReadScopes(uid: string): Promise<ReadScope[]> {
  const scopes: ReadScope[] = [{ label: "Pessoal", context: { uid, scope: { type: "PERSONAL", userId: uid }, context: "PERSONAL" } }];
  const memberships = await db.collection(`user-accounts/${uid}/memberships`).get();
  for (const membership of memberships.docs) {
    const data = membership.data();
    const accountId = typeof data.accountId === "string" ? data.accountId : "";
    if (!accountId) continue;
    const member = await db.collection(`accounts/${accountId}/members`).doc(uid).get();
    if (!member.exists) continue;
    const memberData = member.data() || {};
    const account = await db.collection("accounts").doc(accountId).get();
    if (!account.exists) continue;
    const accountData = account.data() || {};
    scopes.push({
      label: String(accountData.name || data.accountName || accountId),
      context: {
        uid,
        scope: { type: "ACCOUNT", userId: uid, accountId, accountName: String(accountData.name || data.accountName || accountId), role: memberData.role, permissions: memberData.permissions },
        context: "BUSINESS",
      },
    });
  }
  return scopes;
}

export async function executeFinanceProposal(proposal: { action: string; arguments: Record<string, unknown> }, context: AgentContext) {
  const action = proposal.action;
  const args = proposal.arguments;
  const now = new Date().toISOString();
  if (action === "close_month" || action === "reopen_month") {
    const year = Number(args.year), month = Number(args.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("competência inválida");
    const ref = db.collection(collectionPath(context.scope, "monthly-closings")).doc(`${year}-${String(month).padStart(2, "0")}`);
    if (action === "reopen_month") {
      await ref.update({ status: "OPEN", reopenedBy: context.uid, reopenedAt: new Date().toISOString(), updatedAt: now });
      return { id: ref.id, status: "OPEN" };
    }
    const rows = await listTransactions({ startDate: `${year}-${String(month).padStart(2, "0")}-01`, endDate: `${year}-${String(month).padStart(2, "0")}-31` }, context);
    const totalIncome = rows.filter((item: Record<string, unknown>) => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalExpense = rows.filter((item: Record<string, unknown>) => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const data = { userId: context.uid, context: context.context, year, month, status: "CLOSED", totalIncome, totalExpense, totalCreditCard: 0, balance: totalIncome - totalExpense, openingBalance: 0, closingBalance: totalIncome - totalExpense, notes: String(args.notes || ""), closedBy: context.uid, closedAt: now, createdAt: now, updatedAt: now };
    await ref.set(data, { merge: true });
    return { id: ref.id, ...data };
  }
  if (action === "move_transaction") {
    const sourceId = typeof args.id === "string" ? args.id : "";
    const sourceScopeType = typeof args.fromScopeType === "string" ? args.fromScopeType : "";
    const sourceAccountId = typeof args.fromAccountId === "string" ? args.fromAccountId : "";
    if (!sourceId || !sourceScopeType) throw new Error("id e fromScopeType são obrigatórios");
    const sourceScope: ValidatedAgentScope = sourceScopeType === "PERSONAL"
      ? { type: "PERSONAL", userId: context.uid }
      : { type: "ACCOUNT", userId: context.uid, accountId: sourceAccountId };
    const sourcePath = collectionPath(sourceScope, "transactions");
    const sourceDoc = await db.collection(sourcePath).doc(sourceId).get();
    if (!sourceDoc.exists) throw new Error("transação de origem não encontrada");
    const sourceData = sourceDoc.data()!;
    const { id: _oldId, userId: _oldUser, createdAt: _oldCreated, ...txData } = sourceData as Record<string, unknown>;
    const newRef = await db.collection(collectionPath(context.scope, "transactions")).add({ ...txData, userId: context.uid, context: context.context, createdAt: now, updatedAt: now });
    await db.collection(sourcePath).doc(sourceId).delete();
    return { moved: true, from: sourceId, to: newRef.id, fromScope: sourceScopeType, toScope: context.scope.type };
  }
  const collection = action.includes("transaction") ? "transactions" : action.includes("category") ? "categories" : action.includes("budget") ? "budgets" : action.includes("goal") ? "goals" : action.includes("spending_limit") ? "spending-limits" : "tags";
  const path = collectionPath(context.scope, collection);
  if (action.startsWith("create_")) {
    if (typeof args.title !== "string" && typeof args.name !== "string") throw new Error("dados obrigatórios ausentes");
    if (args.amount !== undefined && (!Number.isFinite(Number(args.amount)) || Number(args.amount) <= 0)) throw new Error("valor inválido");
    const allowed = new Set(["title", "amount", "date", "type", "status", "isFixed", "groupId", "installmentInfo", "categoryId", "endDate", "tagIds", "name", "section", "order", "year", "month", "plannedAmount", "targetAmount", "currentAmount", "deadline", "category", "color", "limitAmount", "categoryIds"]);
    const clean = Object.fromEntries(Object.entries(args).filter(([key]) => allowed.has(key)));
    const data = { ...clean, userId: context.uid, context: context.context, createdAt: now, updatedAt: now };
    delete (data as Record<string, unknown>).id;
    const ref = await db.collection(path).add(data);
    return { id: ref.id, ...data };
  }

  const id = typeof args.id === "string" ? args.id : "";
  if (!id || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error("ID inválido");
  const ref = db.collection(path).doc(id);
  const current = await ref.get();
  if (!current.exists) throw new Error("registro não encontrado");

  if (action.startsWith("delete_")) {
    await ref.delete();
    return { id, deleted: true };
  }

  const allowed = new Set(["title", "amount", "date", "type", "status", "isFixed", "groupId", "installmentInfo", "categoryId", "endDate", "tagIds", "name", "section", "order", "year", "month", "plannedAmount", "targetAmount", "currentAmount", "deadline", "category", "color", "limitAmount", "categoryIds"]);
  const updates = { ...Object.fromEntries(Object.entries(args).filter(([key]) => allowed.has(key))), updatedAt: now };
  delete (updates as Record<string, unknown>).id;
  await ref.update(updates);
  return { id, ...current.data(), ...updates };
}

export async function consumeProposal(id: string, uid: string, expiresAt: number) {
  try {
    await db.collection("ai_action_nonces").doc(id).create({ uid, expiresAt, createdAt: new Date().toISOString() });
  } catch (error) {
    if ((error as { code?: number }).code === 6) throw new Error("proposta já utilizada");
    throw error;
  }
}

export async function runFinanceAgent(messages: AgentMessage[], active: AgentContext, readScopes: ReadScope[] = [{ label: active.scope.type === "PERSONAL" ? "Pessoal" : active.scope.accountName || "Empresa", context: active }]) {
  const currentDate = new Date().toLocaleDateString("pt-BR");
  const conversation: AgentMessage[] = [{ role: "system", content: `A data de hoje é ${currentDate}.\n\n${SYSTEM_PROMPT}\n${PENDING_INSTRUCTION}` }, ...messages.filter((message) => message.role === "user" || message.role === "assistant").slice(-12)];
  for (let iteration = 0; iteration < 8; iteration++) {
    const response = await completeWithDeepSeek(conversation, FINANCE_AGENT_TOOLS);
    if (!response.toolCalls.length) return { content: response.content };
    conversation.push(response.assistantMessage);
    for (const call of response.toolCalls) {
      if (call.name.startsWith("propose_")) {
        const action = call.name.slice(8);
        const operation = action.startsWith("create_") ? "create" : action.startsWith("delete_") ? "delete" : "edit";
        if (!canUseAction(active.scope, action, operation)) throw new Error("sem permissão para esta operação");
        const args = (call.arguments.arguments as Record<string, unknown>) || call.arguments;
        if ((operation === "edit" || operation === "delete") && action !== "move_transaction") {
          const id = typeof args.id === "string" ? args.id : "";
          if (id) {
            const collection = action.includes("transaction") ? "transactions" : action.includes("category") ? "categories" : action.includes("budget") ? "budgets" : action.includes("goal") ? "goals" : action.includes("spending_limit") ? "spending-limits" : "tags";
            const doc = await db.collection(collectionPath(active.scope, collection)).doc(id).get();
            if (!doc.exists) throw new Error("registro não encontrado no escopo ativo. Verifique se o ID pertence à conta corrente.");
          }
        }
        return { content: "Preparei esta alteração para sua confirmação.", proposal: createProposal({ uid: active.uid, scope: active.scope, action, arguments: args, preview: { operation, action } }) };
      }
      const results = [];
      for (const readScope of readScopes) {
        if (!canUseAction(readScope.context.scope, call.name, "view")) continue;
        results.push({ label: readScope.label, data: await readTool(call.name, call.arguments, readScope.context) });
      }
      if (!results.length) throw new Error("sem permissão para consultar este módulo");
      conversation.push({ role: "tool", content: buildScopedReadContext(results), tool_call_id: call.id });
    }
  }
  const lastAssistant = [...conversation].reverse().find((m) => m.role === "assistant");
  return { content: lastAssistant?.content || "Consulta processada. Se não obteve o resultado esperado, tente um pedido mais simples." };
}
