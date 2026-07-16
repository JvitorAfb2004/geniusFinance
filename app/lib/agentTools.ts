import type { Transaction, Category, Budget, ActiveScope, ContextType } from '../types';

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'list_transactions',
    description: 'Lista transações com filtros opcionais. Use para consultar gastos, receitas, transações de um período, categoria, etc.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Data inicial YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Data final YYYY-MM-DD' },
        type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'CREDIT_CARD'], description: 'Tipo de transação' },
        categoryId: { type: 'string', description: 'Filtrar por categoria' },
        status: { type: 'string', enum: ['PAID', 'PENDING'], description: 'Status' },
        limit: { type: 'number', description: 'Máximo de resultados (padrão 50)' },
        offset: { type: 'number', description: 'Paginação' },
      },
      required: [],
    },
  },
  {
    name: 'create_transaction',
    description: 'Cria uma nova transação (receita, despesa ou cartão de crédito).',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título/descrição curta' },
        amount: { type: 'number', description: 'Valor positivo (ex: 150.00)' },
        date: { type: 'string', description: 'Data YYYY-MM-DD' },
        type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'CREDIT_CARD'], description: 'Tipo' },
        categoryId: { type: 'string', description: 'ID da categoria (opcional)' },
        status: { type: 'string', enum: ['PAID', 'PENDING'], description: 'Status (padrão PAID)' },
        isFixed: { type: 'boolean', description: 'Se é recorrente fixa' },
        endDate: { type: 'string', description: 'Data fim para recorrência fixa YYYY-MM-DD' },
        installmentInfo: { type: 'string', description: 'Info de parcela ex: 1/12' },
        tagIds: { type: 'array', items: { type: 'string' }, description: 'Tags' },
      },
      required: ['title', 'amount', 'date', 'type'],
    },
  },
  {
    name: 'update_transaction',
    description: 'Atualiza uma transação existente.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID da transação' },
        title: { type: 'string' },
        amount: { type: 'number' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'CREDIT_CARD'] },
        categoryId: { type: 'string' },
        status: { type: 'string', enum: ['PAID', 'PENDING'] },
        isFixed: { type: 'boolean' },
        endDate: { type: 'string' },
        tagIds: { type: 'array', items: { type: 'string' } },
        applyToFuture: { type: 'boolean', description: 'Se true, aplica a transações futuras do mesmo grupo (recorrentes)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_transaction',
    description: 'Deleta uma transação. Pode deletar apenas uma ou todas as futuras de uma recorrência.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID da transação' },
        deleteFuture: { type: 'boolean', description: 'Se true, deleta todas as futuras do mesmo grupo (recorrentes)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_categories',
    description: 'Lista todas as categorias do usuário/conta.',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: ['RECEITA', 'CUSTOS', 'DESPESAS'], description: 'Filtrar por seção DRE' },
      },
      required: [],
    },
  },
  {
    name: 'create_category',
    description: 'Cria uma nova categoria.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome da categoria' },
        section: { type: 'string', enum: ['RECEITA', 'CUSTOS', 'DESPESAS'], description: 'Seção DRE' },
      },
      required: ['name', 'section'],
    },
  },
  {
    name: 'list_budgets',
    description: 'Lista orçamentos do mês/ano atual ou específico.',
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Ano (padrão: ano atual)' },
        month: { type: 'number', description: 'Mês 1-12 (padrão: mês atual)' },
      },
      required: [],
    },
  },
  {
    name: 'create_budget',
    description: 'Cria ou atualiza orçamento para uma categoria no mês/ano.',
    parameters: {
      type: 'object',
      properties: {
        categoryId: { type: 'string', description: 'ID da categoria' },
        plannedAmount: { type: 'number', description: 'Valor planejado' },
        year: { type: 'number', description: 'Ano' },
        month: { type: 'number', description: 'Mês 1-12' },
      },
      required: ['categoryId', 'plannedAmount', 'year', 'month'],
    },
  },
  {
    name: 'generate_financial_report',
    description: 'Gera relatório financeiro completo (DRE, fluxo de caixa, análise) para um período.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Data inicial YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Data final YYYY-MM-DD' },
        includeProjections: { type: 'boolean', description: 'Incluir projeções baseadas em padrões' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_dre_data',
    description: 'Obtém dados do DRE (Demonstrativo de Resultado do Exercício) para um período.',
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Ano' },
        month: { type: 'number', description: 'Mês 1-12 (opcional, se omitido retorna ano completo)' },
      },
      required: ['year'],
    },
  },
  {
    name: 'get_cash_flow',
    description: 'Obtém projeção de fluxo de caixa para os próximos meses.',
    parameters: {
      type: 'object',
      properties: {
        months: { type: 'number', description: 'Quantidade de meses para projetar (padrão 6)' },
      },
      required: [],
    },
  },
  {
    name: 'detect_recurring',
    description: 'Detecta transações recorrentes sugeridas baseadas no histórico.',
    parameters: {
      type: 'object',
      properties: {
        minOccurrences: { type: 'number', description: 'Mínimo de ocorrências (padrão 2)' },
      },
      required: [],
    },
  },
];

export const TOOL_NAMES = [
  'list_transactions',
  'create_transaction',
  'update_transaction',
  'delete_transaction',
  'list_categories',
  'create_category',
  'list_budgets',
  'create_budget',
  'generate_financial_report',
  'get_dre_data',
  'get_cash_flow',
  'detect_recurring',
];
export type ToolName = typeof TOOL_NAMES[number];

export interface ToolCall {
  name: ToolName;
  arguments: Record<string, unknown>;
  id: string;
}

export interface ToolResult {
  toolCallId: string;
  name: ToolName;
  result: unknown;
  error?: string;
}

export function formatToolsForPrompt(): string {
  return AGENT_TOOLS.map(t => {
    const params = JSON.stringify(t.parameters, null, 2);
    return `## ${t.name}\n${t.description}\nParâmetros:\n${params}`;
  }).join('\n\n');
}