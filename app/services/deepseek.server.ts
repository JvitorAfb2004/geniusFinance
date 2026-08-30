import type { AgentMessage } from "~/lib/finance-agent-types";

export interface DeepSeekToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface DeepSeekResponse {
  content: string;
  toolCalls: DeepSeekToolCall[];
  assistantMessage: AgentMessage;
}

export interface DeepSeekTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

function safeError(status: number, body: string) {
  if (status === 401 || status === 403) return new Error("A chave da IA foi rejeitada.");
  if (status === 429) return new Error("A IA está temporariamente indisponível por limite de uso.");
  return new Error(`A IA não respondeu corretamente (HTTP ${status}).`);
}

export async function completeWithDeepSeek(
  messages: AgentMessage[],
  tools: DeepSeekTool[],
): Promise<DeepSeekResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY não configurada no servidor.");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.1,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const raw = await response.text();
  if (!response.ok) throw safeError(response.status, raw);

  let payload: { choices?: Array<{ message?: { content?: unknown; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> } }> };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    throw new Error("A IA retornou uma resposta inválida.");
  }

  const message = payload.choices?.[0]?.message;
  if (!message) throw new Error("A IA não retornou uma mensagem.");

  const toolCalls = (message.tool_calls || []).map((call) => {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(call.function?.arguments || "{}") as Record<string, unknown>;
    } catch {
      throw new Error("A IA retornou parâmetros de ferramenta inválidos.");
    }
    return {
      id: String(call.id || crypto.randomUUID()),
      name: String(call.function?.name || ""),
      arguments: args,
    };
  });

  const assistantMessage: AgentMessage = {
    role: "assistant",
    content: typeof message.content === "string" ? message.content : "",
    tool_calls: message.tool_calls || [],
  };

  return {
    content: assistantMessage.content,
    toolCalls,
    assistantMessage,
  };
}
