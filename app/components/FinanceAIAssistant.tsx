import { useEffect, useRef, useState } from "react";
import { Bot, Check, Loader2, Send, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useFinance } from "~/hooks/useFinance";
import { apiFetch } from "~/lib/api";
import { confirmationActionLabels, confirmationFieldLabels, getConfirmationEntries } from "~/lib/finance-agent-types";
import type { AgentMessage, AgentProposal } from "~/lib/finance-agent-types";

type Message = AgentMessage & { proposal?: AgentProposal };

const welcome: Message = {
  role: "assistant",
  content: "Olá! Posso consultar e analisar suas finanças neste escopo. Para qualquer alteração, vou pedir sua confirmação antes de executar.",
};

const suggestions = [
  "Qual foi minha receita este mês?",
  "Onde estou gastando mais?",
  "Compare este mês com o anterior",
];

const valueLabels: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  CREDIT_CARD: "Cartão de crédito",
  PAID: "Pago",
  PENDING: "Pendente",
};

function formatPreview(key: string, value: unknown) {
  if (typeof value === "number") {
    if (key === "year" || key === "month") return String(value);
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (typeof value === "string") return valueLabels[value] ?? value;
  return JSON.stringify(value, null, 2);
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="ai-markdown text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <h1 className="mb-2 mt-1 text-base font-bold text-text-primary">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-3 text-sm font-bold text-text-primary">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold text-text-primary">{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
          blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-text-secondary">{children}</blockquote>,
          table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="w-full min-w-max border-collapse text-xs">{children}</table></div>,
          th: ({ children }) => <th className="border border-border bg-slate-50 px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
          code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{children}</code>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function FinanceAIAssistant() {
  const { user, activeScope, setActiveScope } = useFinance();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages.length]);

  async function send(text = input) {
    const content = text.trim();
    if (!content || sending || !user) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const result = await apiFetch("/api/ai/agent", {
        method: "POST",
        headers: { "X-Active-Scope": JSON.stringify(activeScope) },
        body: JSON.stringify({ messages: next.map(({ role, content: message }) => ({ role, content: message })) }),
      });
      setMessages((current) => [...current, { role: "assistant", content: result.content || "Não encontrei uma resposta.", proposal: result.proposal }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "Não foi possível consultar a IA." }]);
    } finally {
      setSending(false);
    }
  }

  async function confirm(proposal: AgentProposal) {
    if (confirming) return;
    setConfirming(proposal.id);
    setMessages((current) => current.map((item) => item.proposal?.id === proposal.id ? { ...item, proposal: undefined } : item));
    try {
      const result = await apiFetch("/api/ai/agent-confirm", {
        method: "POST",
        headers: { "X-Active-Scope": JSON.stringify(activeScope) },
        body: JSON.stringify({ proposal }),
      }) as { switched?: boolean; scope?: { type: string; userId: string; accountId?: string; accountName?: string } };
      if (proposal.action === "switch_scope" && result.switched && result.scope) {
        const newScope = result.scope.type === "PERSONAL"
          ? { type: "PERSONAL" as const, userId: result.scope.userId }
          : { type: "ACCOUNT" as const, userId: result.scope.userId, accountId: result.scope.accountId || "", accountName: result.scope.accountName || "", role: "owner" as const };
        setActiveScope(newScope);
        setMessages((current) => [...current, { role: "assistant", content: `Conta alterada para **${result.scope!.type === "PERSONAL" ? "Pessoal" : result.scope!.accountName}**. Agora refaça a operação.` }]);
      } else {
        setMessages((current) => [...current, { role: "assistant", content: "Concluído." }]);
        await send("Operação concluída. Se há mais algo para fazer na mesma solicitação original, prossiga com a próxima tarefa agora.");
      }
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "Não foi possível confirmar a alteração." }]);
    } finally {
      setConfirming(null);
    }
  }

  if (!user) return null;

  return (
    <>
      {!open && (
        <button
          aria-label="Abrir assistente financeiro"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-700 active:scale-95 transition-transform lg:bottom-6 lg:right-6"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
      {open && (
        <section aria-label="Assistente financeiro" className="fixed inset-0 z-50 flex flex-col bg-surface lg:inset-auto lg:bottom-6 lg:right-6 lg:h-[min(600px,calc(100vh-3rem))] lg:w-[min(440px,calc(100vw-2rem))] lg:rounded-lg lg:border lg:border-border lg:shadow-2xl">
          <header className="flex items-center justify-between border-b border-border bg-slate-900 px-4 py-3 text-white lg:rounded-t-lg">
            <div className="flex items-center gap-2.5"><Bot className="h-5 w-5 text-teal-300" /><p className="text-sm font-semibold">Assistente financeiro</p></div>
             <button onClick={() => setOpen(false)} className="p-2 text-white/70 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
            {messages.length === 1 && <div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)} disabled={sending} className="rounded-full border border-border bg-white px-3 py-1.5 text-left text-xs text-text-secondary hover:border-primary hover:text-primary">{suggestion}</button>)}</div>}
            {messages.map((message, index) => <div key={`${index}-${message.content}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-lg px-3 py-2 ${message.role === "user" ? "whitespace-pre-wrap bg-primary text-sm leading-relaxed text-white" : "border border-border bg-white text-text-primary"}`}>{message.role === "user" ? message.content : <AssistantMarkdown content={message.content} />}
              {message.proposal && <div className="mt-3 space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"><p className="font-semibold">Confirmação necessária</p><p>Operação: {confirmationActionLabels[message.proposal.action] || message.proposal.action}</p>{getConfirmationEntries(message.proposal.arguments).map(([key, value]) => <p key={key}><strong>{confirmationFieldLabels[key] || key}:</strong> {formatPreview(key, value)}</p>)}<div className="flex gap-2 pt-1"><button onClick={() => confirm(message.proposal!)} disabled={confirming !== null} className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1.5 font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />{confirming === message.proposal.id ? "Executando" : "Confirmar"}</button><button onClick={() => setMessages((current) => current.map((item) => item.proposal?.id === message.proposal?.id ? { ...item, proposal: undefined, content: "Alteração cancelada." } : item))} disabled={confirming !== null} className="rounded border border-amber-300 bg-white px-2.5 py-1.5 font-semibold disabled:opacity-50">Cancelar</button></div></div>}
            </div></div>)}
            {sending && <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Consultando seus dados...</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2 border-t border-border bg-white p-3 lg:rounded-b-lg"><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} disabled={sending} maxLength={4000} placeholder="Pergunte sobre suas finanças..." className="clay-input min-w-0 flex-1 px-3 py-2 text-sm" /><button type="submit" disabled={sending || !input.trim()} className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"><Send className="h-4 w-4" /></button></form>
        </section>
      )}
    </>
  );
}
