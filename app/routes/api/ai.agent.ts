import type { ActionFunctionArgs } from 'react-router';
import { chat } from '~/lib/ai';
import { AGENT_TOOLS } from '~/lib/agentTools';
import { getUserScope } from '~/lib/auth.server';

const AGENT_SYSTEM = `Você é o Agente Financeiro do GeniusFinance. Acesso a ferramentas para LER/ESCREVER dados financeiros.

REGRAS:
1. SEMPRE use ferramentas para dados reais. Não invente.
2. Para criar/atualizar/deletar: confirme se não for óbvio.
3. Formato: R$ X.XXX,XX
4. RESPONDA EM 1 PARÁGRAFO MÁXIMO. Seja DIRETO. Zero fluff.
5. Cálculos: mostre só o resultado final (ex: "Precisa ganhar R$ 2.009,90").
6. Para relatórios: use generate_financial_report ou get_dre_data.

FERRAMENTAS:
- list_transactions, create_transaction, update_transaction, delete_transaction
- list_categories, create_category
- list_budgets, create_budget
- generate_financial_report, get_dre_data, get_cash_flow, detect_recurring

FLUXO: Pergunta → ferramentas → resposta direta com números.`;

export async function action({ request }: ActionFunctionArgs) {
  try {
    const scope = await getUserScope(request);
    const body = await request.json();

    const messages = [
      { role: 'system' as const, content: AGENT_SYSTEM },
      ...body.messages,
    ];

    const toolCalls: any[] = [];
    const toolResults: any[] = [];
    let finalContent = '';

    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await chat(messages, {
        temperature: 0.1,
        maxTokens: 2048,
        tools: AGENT_TOOLS,
        toolChoice: 'auto',
      });

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const tc of response.toolCalls) {
          try {
            const toolRes = await fetch('/api/ai/agent-tool', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: tc.function.name,
                arguments: JSON.parse(tc.function.arguments),
              }),
            });

            const result = await toolRes.json();
            toolResults.push({ toolCallId: tc.id, name: tc.function.name, result: result.result || result, error: result.error });
            toolCalls.push(tc);

            messages.push({
              role: 'assistant',
              content: response.content || '',
              tool_calls: [tc],
            });
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(result.result || result),
            });
          } catch (e: any) {
            toolResults.push({ toolCallId: tc.id, name: tc.function.name, result: null, error: e.message });
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ error: e.message }),
            });
          }
        }
        continue;
      }

      finalContent = response.content || '';
      break;
    }

    return new Response(JSON.stringify({ content: finalContent, toolCalls, toolResults }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}