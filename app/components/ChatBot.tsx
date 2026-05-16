import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { chatStream } from '../lib/ai';
import { computeDRE } from '../lib/dre';
import { formatCurrency } from '../lib/utils';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, User, Lightbulb, TrendingUp, AlertTriangle, DollarSign, Target, Copy, Check } from 'lucide-react';
import { isSameMonth, parseISO, startOfYear, endOfYear, format } from 'date-fns';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_SYSTEM = `Você é o Analista Financeiro do GeniusFinance. Você recebe dados financeiros JÁ CALCULADOS pelo sistema.

REGRAS:
1. Use os valores da seção "VALORES CALCULADOS" — eles já estão corretos.
2. Para renda mensal, use "Média de renda mensal".
3. Para gastos, use "Maiores gastos mensais".
4. Se o usuário pedir faturamento/receita do ano completo, use "Total de receitas no ano (completo/cadastrado)".
5. Se pedir faturamento realizado até hoje, use "Total de receitas no ano (realizado)".
6. Não invente valores. Se faltar dado, diga claramente.
7. Responda em português brasileiro, tom profissional e amigável.
8. Seja DIRETO. Máximo 2-3 parágrafos.
9. Formato: R$ X.XXX,XX.`;

const SUGGESTIONS = [
  { icon: TrendingUp, text: 'Qual foi minha renda esse mês?' },
  { icon: AlertTriangle, text: 'Onde estou gastando mais?' },
  { icon: Lightbulb, text: 'Sugestões para economizar' },
  { icon: Target, text: 'Minha margem líquida está boa?' },
  { icon: DollarSign, text: 'Qual meu saldo total no ano?' },
  { icon: TrendingUp, text: 'Comparação com mês passado' },
];

export default function ChatBot() {
  const { transactions, budgets, categories, activeContext, selectedMonth } = useFinance();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou seu analista financeiro. Tenho acesso a todos os seus dados em tempo real. Como posso ajudar?' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const financialContext = useMemo(() => {
    const yearStart = startOfYear(selectedMonth);
    const yearEnd = endOfYear(selectedMonth);

    const monthTxs = transactions.filter(
      (t) => t.context === activeContext && isSameMonth(parseISO(t.date), selectedMonth)
    );
    const yearTxs = transactions.filter(
      (t) => t.context === activeContext && parseISO(t.date) >= yearStart && parseISO(t.date) <= yearEnd
    );

    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    const monthBudgets = budgets.filter(
      (b) => b.context === activeContext && b.year === year && b.month === month
    );

    const incomeMonth = monthTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expenseMonth = monthTxs.filter((t) => t.type !== 'INCOME').reduce((s, t) => s + t.amount, 0);

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const nowDate = new Date();
    const currentMonthIdx = nowDate.getMonth();
    const currentYear = nowDate.getFullYear();

    const monthlyBreakdown = months.map((name, idx) => {
      const m = idx + 1;
      const mTxs = yearTxs.filter((t) => new Date(t.date).getMonth() + 1 === m);
      const inc = mTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const exp = mTxs.filter((t) => t.type !== 'INCOME').reduce((s, t) => s + t.amount, 0);
      const isPast = (selectedMonth.getFullYear() < currentYear) || (selectedMonth.getFullYear() === currentYear && idx <= currentMonthIdx);
      return { name, inc, exp, saldo: inc - exp, count: mTxs.length, isPast };
    }).filter((m) => m.count > 0);

    // PAST months with income > 0
    const pastIncomeMonths = monthlyBreakdown.filter((m) => m.isPast && m.inc > 0);
    const avgIncome = pastIncomeMonths.length > 0
      ? pastIncomeMonths.reduce((s, m) => s + m.inc, 0) / pastIncomeMonths.length
      : 0;

    // Monthly expenses (averaged per title, not yearly sum)
    const monthlyExpensesMap: Record<string, { total: number; months: Set<number> }> = {};
    for (const t of yearTxs) {
      if (t.type === 'INCOME') continue;
      const key = t.title.toLowerCase().trim();
      if (!monthlyExpensesMap[key]) monthlyExpensesMap[key] = { total: 0, months: new Set() };
      monthlyExpensesMap[key].total += t.amount;
      monthlyExpensesMap[key].months.add(new Date(t.date).getMonth());
    }
    const sortedMonthlyExpenses = (Object.entries(monthlyExpensesMap) as [string, { total: number; months: Set<number> }][])
      .map(([name, v]) => ({ name, monthly: v.total / (v.months.size || 1), total: v.total, months: v.months.size }))
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 5);

    const futureMonths = monthlyBreakdown.filter((m) => !m.isPast);
    const totalYearIncomeRealized = monthlyBreakdown.filter((m) => m.isPast).reduce((s, m) => s + m.inc, 0);
    const totalYearIncomeFull = monthlyBreakdown.reduce((s, m) => s + m.inc, 0);
    const totalYearExpenseRealized = monthlyBreakdown.filter((m) => m.isPast).reduce((s, m) => s + m.exp, 0);
    const totalYearExpenseFull = monthlyBreakdown.reduce((s, m) => s + m.exp, 0);

    return `=== DADOS FINANCEIROS ===
Mês atual: ${format(selectedMonth, 'MMMM/yyyy')} | Tipo: ${activeContext === 'PERSONAL' ? 'Pessoal' : 'Empresa'}

MESES REALIZADOS:
${monthlyBreakdown.filter((m) => m.isPast).map((m) => `  ${m.name}: Receitas ${formatCurrency(m.inc)} | Despesas ${formatCurrency(m.exp)} | Saldo ${formatCurrency(m.saldo)}`).join('\n') || '  nenhum'}

${futureMonths.length > 0 ? `FUTURO (nao incluir em medias):\n${futureMonths.map((m) => `  ${m.name}: Receitas ${formatCurrency(m.inc)} | Despesas ${formatCurrency(m.exp)}`).join('\n')}` : ''}

VALORES CALCULADOS (use estes numeros exatos):
- Media de renda mensal: ${formatCurrency(avgIncome)} (${pastIncomeMonths.length} meses com receita)
- Total de receitas no ano (realizado): ${formatCurrency(totalYearIncomeRealized)}
- Total de receitas no ano (completo/cadastrado): ${formatCurrency(totalYearIncomeFull)}
- Total de despesas no ano (realizado): ${formatCurrency(totalYearExpenseRealized)}
- Total de despesas no ano (completo/cadastrado): ${formatCurrency(totalYearExpenseFull)}
- Maiores gastos mensais:
${sortedMonthlyExpenses.map((e) => `  ${e.name}: ${formatCurrency(e.monthly)}/mes (${e.months}x no ano)`).join('\n') || '  nenhum'}`;
  }, [transactions, budgets, categories, activeContext, selectedMonth]);

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    const userMsg: Message = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    const apiMessages: { role: string; content: string }[] = [
      { role: 'system', content: CHAT_SYSTEM + '\n\n' + financialContext },
    ];
    for (let i = 1; i < newMessages.length; i++) {
      const m = newMessages[i];
      apiMessages.push({ role: m.role, content: m.content });
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const fullResponse = await chatStream(apiMessages,
        (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + token };
            return updated;
          });
        },
        { temperature: 0.2, maxTokens: 1024 },
      );

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, content: fullResponse || last.content };
        return updated;
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro de conexão';
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (!last.content) updated[updated.length - 1] = { ...last, content: `Erro: ${msg}` };
        return updated;
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 cursor-pointer active:scale-95"
          title="Analista Financeiro"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Analista Financeiro</p>
                <p className="text-xs text-purple-200">IA • Dados em tempo real</p>
                <p className="text-[10px] text-purple-300/80 mt-0.5">O conteúdo gerado por IA pode conter imprecisões.</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-purple-200 hover:text-white cursor-pointer transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.text)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors cursor-pointer"
                  >
                    <s.icon className="w-3 h-3" />
                    {s.text}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-purple-600" />
                  </div>
                )}
                <div
                  className={`text-sm px-3 py-2 rounded-lg max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : m.content === ''
                        ? 'bg-white border border-slate-200 rounded-bl-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                  }`}
                >
                  {m.content || (
                    <span className="flex gap-1 items-center h-5">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
                {m.content && (
                  <button
                    onClick={async () => { await navigator.clipboard.writeText(m.content); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500); }}
                    className={`flex-shrink-0 mt-1 p-1 rounded cursor-pointer transition-colors ${m.role === 'user' ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-slate-500'}`}
                    title="Copiar mensagem"
                  >
                    {copiedIdx === i ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-3 border-t border-slate-200 bg-white flex-shrink-0 flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre suas finanças..."
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
