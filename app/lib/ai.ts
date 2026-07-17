const AI_ENDPOINT = '/api/ai/chat';

interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  tools?: any[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatResponse {
  content?: string;
  toolCalls?: ToolCall[];
}

export async function chat(
  messages: { role: string; content: string }[],
  options: ChatOptions = {},
): Promise<ChatResponse> {
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature ?? 0.3,
      tools: options.tools,
      tool_choice: options.toolChoice,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 404 || res.status === 0) {
      throw new Error('API AI nao disponivel. O servidor Remix precisa estar rodando.');
    }
    throw new Error(`Erro ${res.status}: ${err}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message || {};
  return {
    content: message.content || '',
    toolCalls: message.tool_calls || [],
  };
}

export async function agentChat(
  messages: { role: string; content: string }[],
  options: ChatOptions = {},
): Promise<ChatResponse> {
  const res = await fetch('/api/ai/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature ?? 0.1,
      tools: options.tools,
      tool_choice: options.toolChoice,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 404 || res.status === 0) {
      throw new Error('API Agent nao disponivel. O servidor Remix precisa estar rodando.');
    }
    throw new Error(`Erro ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content: data.content || '',
    toolCalls: data.toolCalls || [],
  };
}

export async function chatStream(
  messages: { role: string; content: string }[],
  onToken: (text: string) => void,
  options: ChatOptions = {},
): Promise<ChatResponse> {
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.7,
      stream: true,
      tools: options.tools,
      tool_choice: options.toolChoice,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Stream nao disponivel');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let toolCalls: ToolCall[] = [];
  let currentToolCall: Partial<ToolCall> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta || {};

        if (delta.content) {
          fullText += delta.content;
          onToken(delta.content);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (currentToolCall) toolCalls.push(currentToolCall as ToolCall);
              currentToolCall = {
                id: tc.id,
                type: 'function',
                function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' },
              };
            } else if (currentToolCall) {
              currentToolCall.function!.arguments += tc.function?.arguments || '';
            }
          }
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  if (currentToolCall) toolCalls.push(currentToolCall as ToolCall);

  return { content: fullText, toolCalls };
}

export async function chatJSON(
  messages: { role: string; content: string }[],
  options: ChatOptions = {},
): Promise<unknown> {
  const response = await chat(messages, options);
  const text = response.content || '';
  // Extract JSON from response (sometimes wrapped in markdown fences)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  try {
    // Try to find a JSON array or object in the text
    const bracketMatch = jsonStr.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    return JSON.parse(bracketMatch ? bracketMatch[0] : jsonStr);
  } catch {
    throw new Error(
      "Falha ao interpretar resposta JSON da IA. Resposta bruta: " +
        text.slice(0, 300),
    );
  }
}

const FINANCIAL_PARSE_SYSTEM = `Você é um assistente financeiro especializado em extrair transações de planilhas e textos.

O texto que você recebe pode ser:
- Dados separados por "|" (pipe) vindos de uma planilha Excel/CSV
- Um extrato bancário colado
- Uma descrição em texto livre
- Qualquer combinação dos formatos acima

Sua tarefa: identificar TODAS as transações financeiras e retornar um array JSON.

Formato de cada transação:
{
  "title": "descrição clara e curta em português",
  "amount": número positivo (ex: 150.00),
  "date": "YYYY-MM-DD",
  "type": "INCOME" | "EXPENSE",
  "status": "PAID" | "PENDING"
}

Regras:
- INCOME = receitas, entradas, salário, renda, dinheiro recebido, vendas
- EXPENSE = despesas, gastos, saídas, contas, boletos

- PAID = pago/recebido/confirmado. PENDING = pendente/agendado
- amount SEMPRE positivo (ex: 150.00, nunca -150.00)
- date no formato YYYY-MM-DD. Se não tiver ano, use 2026. Se não tiver mês, use o mês mais provável.
- title em português, curto (máx 80 caracteres)
- Se houver parcelas (ex: "3/12"), crie uma transação por parcela com installmentInfo
- Ignore linhas de cabeçalho, totais e células vazias
- Se houver coluna de valor negativo (ex: -150,00), é EXPENSE. Se positivo (ex: 1500,00), é INCOME.

Retorne APENAS o array JSON, sem explicações.
Se não encontrar nenhuma transação, retorne [].`;

export async function parseTransactions(input: string): Promise<
  {
    title: string;
    amount: number;
    date: string;
    type: "INCOME" | "EXPENSE";
    status: "PAID" | "PENDING";
  }[]
> {
  const result = await chatJSON(
    [
      { role: "system", content: FINANCIAL_PARSE_SYSTEM },
      {
        role: "user",
        content: `Extraia todas as transações financeiras deste texto:\n\n${input}`,
      },
    ],
    { temperature: 0.1, maxTokens: 4096 },
  );

  if (!Array.isArray(result)) {
    throw new Error("IA não retornou um array de transações.");
  }

  return result;
}

const REPORT_ANALYSIS_SYSTEM = `Você é um analista financeiro sênior. Analise os dados financeiros fornecidos e produza um relatório em português brasileiro.

Estrutura do relatório:
1. RESUMO GERAL - visão macro do período (receita total, despesas, lucro/prejuízo, margem)
2. DESTAQUES - principais categorias de receita e despesa, tendências observadas
3. ALERTAS - identifique problemas: gastos excessivos, margem baixa, categorias que cresceram muito
4. RECOMENDAÇÕES - sugestões práticas para melhorar a saúde financeira
5. PROJEÇÃO - com base nos padrões, o que esperar do próximo período

Seja direto, use valores em R$ (reais), mantenha tom profissional mas acessível.
Evite frases genéricas - analise os dados reais fornecidos.`;

const SAVINGS_SYSTEM = `Você é um consultor de economia financeira. Analise os gastos mensais do usuário e sugira cortes realistas.

Para cada sugestão, retorne um array JSON com este formato exato:
[
  {
    "category": "nome da categoria ou tipo de gasto",
    "currentSpending": valor mensal atual em reais (número, use o valor exato dos dados),
    "suggestedReduction": percentual sugerido de redução (número entre 5 e 30, ex: 15),
    "projectedSaving": valor mensal economizado em reais (número, calculado como currentSpending * suggestedReduction / 100),
    "tip": "dica prática de como conseguir essa economia (1 frase curta em português)"
  }
]

Regras CRÍTICAS:
- Use EXATAMENTE os valores fornecidos nos dados. Não invente, não arredonde para milhares, não extrapole.
- Considere também o campo "sampleDescriptions" de cada categoria para entender o contexto real do gasto.
- O projectedSaving DEVE ser exatamente currentSpending * suggestedReduction / 100. Faça a conta corretamente.
- Se o gasto mensal é 150 reais e sugerir 20% de redução, o projectedSaving é 30 reais (150 * 0.20 = 30). SIMPLES.
- NUNCA sugira valores de economia maiores que o próprio gasto mensal.
- Foque apenas em 2-4 sugestões de maior impacto real.
- Seja específico e realista. Não sugira cortar itens essenciais (aluguel, água, luz).
- Retorne APENAS o array JSON, sem explicações.`;

export async function suggestSavings(financialData: unknown): Promise<{
  category: string;
  currentSpending: number;
  suggestedReduction: number;
  projectedSaving: number;
  tip: string;
}[]> {
  const result = await chatJSON([
    { role: 'system', content: SAVINGS_SYSTEM },
    { role: 'user', content: `Analise estes gastos e sugira onde economizar:\n\n${JSON.stringify(financialData, null, 2)}` },
  ], { temperature: 0.3, maxTokens: 2048 });

  if (!Array.isArray(result)) throw new Error('IA nao retornou array de sugestoes.');
  return result;
}

const LEAD_PARSE_SYSTEM = `Você é um assistente comercial especializado em extrair dados de leads a partir de textos livres.

O texto que você recebe pode ser:
- Uma descrição informal de um potencial cliente
- Dados de contato misturados com informações do projeto
- Um resumo de reunião ou conversa
- Qualquer texto contendo informações sobre um lead comercial

Sua tarefa: extrair os dados e retornar um objeto JSON com este formato:
{
  "clientName": "nome do cliente ou empresa",
  "responsible": "nome do responsável pelo lead",
  "email": "email@exemplo.com",
  "phone": "(11) 99999-9999",
  "service": "tipo de serviço mencionado",
  "description": "descrição resumida da oportunidade/projeto",
  "source": "origem do lead (site, instagram, indicação, etc)",
  "link": "url ou link relevante",
  "additionalField": "qualquer informação adicional relevante"
}

Regras:
- Se um campo não for mencionado no texto, use string vazia ""
- clientName: nome da pessoa ou empresa. Se houver ambos, prefira "Nome (Empresa)"
- description: resuma em 1-2 frases em português o que o lead quer/precisa
- service: identifique o tipo de serviço/produto mencionado
- source: tente inferir de onde veio o lead
- email e phone: extraia se presentes no texto
- link: extraia URLs se presentes
- proposalDate: se houver data mencionada, use YYYY-MM-DD, senão deixe vazio ""

Retorne APENAS o objeto JSON, sem explicações.`;

export interface ParsedLeadData {
  clientName: string;
  responsible: string;
  email: string;
  phone: string;
  service: string;
  description: string;
  source: string;
  link: string;
  additionalField: string;
  proposalDate: string;
}

export async function parseLead(input: string): Promise<ParsedLeadData> {
  const result = await chatJSON(
    [
      { role: "system", content: LEAD_PARSE_SYSTEM },
      { role: "user", content: `Extraia os dados do lead deste texto:\n\n${input}` },
    ],
    { temperature: 0.1, maxTokens: 1024 },
  );

  const data = result as Record<string, unknown>;

  return {
    clientName: String(data.clientName || ''),
    responsible: String(data.responsible || ''),
    email: String(data.email || ''),
    phone: String(data.phone || ''),
    service: String(data.service || ''),
    description: String(data.description || ''),
    source: String(data.source || ''),
    link: String(data.link || ''),
    additionalField: String(data.additionalField || ''),
    proposalDate: String(data.proposalDate || ''),
  };
}

export async function generateReport(dreData: unknown): Promise<string> {
  const response = await chat(
    [
      { role: "system", content: REPORT_ANALYSIS_SYSTEM },
      {
        role: "user",
        content: `Analise estes dados financeis e gere um relatorio completo:\n\n${JSON.stringify(dreData, null, 2)}`,
      },
    ],
    { temperature: 0.5, maxTokens: 2048 },
  );
  return response.content || '';
}
