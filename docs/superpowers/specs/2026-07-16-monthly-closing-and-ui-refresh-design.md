# Fechamento Mensal + Ocultar FAB de IA + UI Refresh

Data: 2026-07-16

## Objetivo

1. Ocultar o botão flutuante (FAB) do Analista Financeiro IA do layout global, deixando-o acessível apenas via atalho na sidebar ou página dedicada.
2. Criar um fluxo de fechamento mensal por escopo (`Pessoal` e cada `Empresa/Conta`) com registro de competência, status no dashboard, aviso ao editar transações de mês fechado, e histórico consultável.
3. Ajustar o visual do módulo financeiro para um estilo mais "sistema administrativo" (menos redondo, menos efeito clay, mais tabela e dados densos), mantendo o design system existente (Tailwind + tokens em `app/styles/index.css`).

---

## Em escopo

### Ocultar FAB de IA

- Remover `<ChatBot />` do `app/routes/_app.tsx`.
- O ChatBot continua existindo como componente; a chamada a ele passa a ser por um item na sidebar (`Analista IA`) que abre o chat em modal ou em uma página dedicada.
- A rota `/ai-chat` (ou similar) renderiza o ChatBot em tela cheia ou em um painel lateral.

### Fechamento Mensal

#### Modelo de dados (Firestore)

Nova coleção `monthly-closings` (ou `closings`) por escopo:

```ts
interface MonthlyClosing {
  id: string;                // `${year}-${month}` ex: "2026-07"
  year: number;              // 2026
  month: number;             // 1-12
  context: ContextType;      // PERSONAL ou BUSINESS
  status: 'OPEN' | 'CLOSED';
  // snapshot dos totais no momento do fechamento:
  totalIncome: number;
  totalExpense: number;
  totalCreditCard: number;
  balance: number;           // income - (expense + creditCard)
  openingBalance: number;    // saldo inicial do mês (herdado do fechamento anterior)
  closingBalance: number;    // saldo final = openingBalance + balance
  notes: string;             // observações do usuário
  closedBy: string;          // uid de quem fechou
  closedAt: string;          // ISO datetime
  reopenedBy?: string;       // uid de quem reabriu (se reaberto)
  reopenedAt?: string;       // ISO datetime
  createdAt: string;
  updatedAt: string;
}
```

#### Página de fechamento (`/monthly-closing`)

- Rota nova: `_app.monthly-closing.tsx`.
- Registrada em `app/routes.ts` e na sidebar (seção "Financeiro").
- Lista competências do escopo ativo, ordenadas por ano/mês decrescente.
- Cada linha mostra: competência (ex: "Julho 2026"), status (Aberto/Fechado), totais, saldo.
- Ações por competência:
  - **Fechar** (se `OPEN`): abre modal com resumo (receitas, despesas, cartão, saldo, saldo inicial herdado, saldo final projetado) + campo de observações. Confirma e grava.
  - **Reabrir** (se `CLOSED`): confirmação simples, grava `reopenedBy`/`reopenedAt`, volta status para `OPEN`.
  - **Ver detalhes**: expande os valores snapshot do fechamento.
- O saldo inicial (`openingBalance`) de um mês é herdado do `closingBalance` do mês anterior fechado. Se não houver mês anterior fechado, começa em 0.

#### Dashboard — indicador de mês não fechado

- No `DashboardCards` ou em um card novo no topo do dashboard, exibir:
  - Se mês atual está `OPEN`: badge/aviso "Mês de julho/2026 não foi fechado" com link para `/monthly-closing`.
  - Se mês atual está `CLOSED`: badge verde "Mês fechado em dd/mm".
- Também mostrar o status dos últimos N meses (ex: últimos 3) para indicar pendências.

#### Aviso ao editar transação de mês fechado

- Quando o usuário editar/adicionar uma transação cuja data caia em uma competência com `status: 'CLOSED'`:
  - Exibir um banner/aviso no `TransactionModal`: "Atenção: a competência MM/AAAA está fechada. Esta alteração pode impactar o fechamento já registrado."
  - Não bloquear a edição — só avisar.
- Verificar se a competência está fechada via listener da coleção `monthly-closings` no `useFinance`.

### UI Refresh — estilo mais administrativo

- **Border-radius**: reduzir de `rounded-2xl`/`rounded-3xl` para `rounded-lg`/`rounded-xl` nos cards principais (`clay`).
- **Sombras**: reduzir ou remover efeitos `clay` (shadow com inset) nos cards; usar bordas sólidas (`border`) como separador principal.
- **Sidebar**: já está escura e reta — manter.
- **Cards do dashboard**: trocar `clay` por `bg-white border border-slate-200 rounded-lg`.
- **Tabelas**: já existem; manter estilo atual (já é mais sério).
- **Cores**: manter tokens existentes (`primary`, `bg`, `surface`, etc.).
- O escopo do refresh é **apenas o módulo financeiro** (dashboard, transações, fechamento, DRE, etc.). Landing page, login e componentes não-financeiros não mudam.

---

## Fora de escopo

- Remover ou desabilitar o ChatBot como funcionalidade — apenas muda onde ele é invocado.
- Bloquear edição de transações de mês fechado.
- Refatorar componentes não-financeiros (comercial, projetos, admin).
- Alterar landing page ou login.
- Auditoria completa de mudanças em transações pós-fechamento.
- Migração de dados ou alterações no modelo de transações existentes.

---

## Flow map

### Fechamento
- Usuário acessa `/monthly-closing` → vê lista de competências.
- Clica "Fechar" no mês atual → modal com resumo + observações → confirma → registro criado no Firestore.
- Dashboard passa a mostrar mês como "Fechado".
- Se editar transação daquele mês → banner de aviso no modal de edição.
- Pode reabrir a qualquer momento pela mesma página.

### IA
- Sidebar ganha item "Analista IA" → abre `/ai-chat` (ou modal).
- FAB roxo some do canto da tela.

---

## Critérios de aceite

1. O FAB roxo (`ChatBot`) não aparece mais fixo no canto da tela.
2. O ChatBot continua acessível via sidebar ou atalho.
3. Nova rota `/monthly-closing` lista competências do escopo ativo.
4. É possível fechar um mês, informando observações.
5. O fechamento registra os totais do momento (receita, despesa, cartão, saldo).
6. O saldo inicial do mês é herdado do fechamento do mês anterior.
7. É possível reabrir um mês fechado.
8. O dashboard exibe o status de fechamento do mês atual (Aberto/Fechado).
9. Ao editar transação de uma competência fechada, um aviso aparece no modal.
10. Os cards principais do dashboard têm visual menos redondo e mais plano.
