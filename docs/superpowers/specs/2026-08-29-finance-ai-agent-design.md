# Agente de IA Financeiro

Data: 2026-08-29

## Objetivo

Adicionar um agente financeiro dentro do Genius Finance, acessível por FAB,
capaz de consultar e analisar os dados do escopo ativo e propor alterações
controladas. O agente usará exclusivamente a API oficial da DeepSeek, com a
chave protegida no servidor da Vercel.

## Escopo

### Incluído

- Transações, categorias, tags, orçamentos, limites, metas, fixos mensais,
  vendas, DRE, relatórios, fluxo de caixa e fechamentos mensais.
- Consultas com filtros e análises calculadas no servidor.
- Criação, edição e exclusão de entidades financeiras mediante confirmação.
- Fechamento e reabertura mensal somente para owner/admin.
- FAB global nas telas autenticadas, com painel desktop e tela cheia mobile.
- Histórico apenas durante a sessão do navegador.
- Modelo `deepseek-v4-flash` via API compatível com Chat Completions.

### Excluído

- Comercial, projetos e administração.
- Persistência de conversas.
- Serviço de IA hospedado fora deste projeto.
- Acesso a outros escopos além do escopo ativo.
- Exclusão dos dados históricos do Pluggy.

## Arquitetura

O navegador chamará somente a rota same-origin `POST /api/ai/agent`. A rota
validará o token Firebase, o escopo ativo e as permissões antes de consultar o
Firestore ou chamar a DeepSeek. A chave `DEEPSEEK_API_KEY` nunca será enviada
ao navegador. `DEEPSEEK_MODEL` poderá configurar o identificador, com valor
padrão `deepseek-v4-flash`.

O agente terá um registro fechado de ferramentas. Não haverá acesso genérico a
coleções, execução de código ou ferramenta criada a partir da mensagem do
usuário. As leituras serão executadas no servidor com dados atuais. As
operações de escrita serão transformadas em uma proposta e interromperão o
loop do agente.

Uma confirmação usará uma proposta emitida pelo servidor. No endpoint de
confirmação, a autenticação, o escopo, a permissão, o schema, a existência do
documento e o estado atual serão revalidados. A proposta não poderá ser
adulterada, reutilizada ou confirmada duas vezes.

## Ferramentas

### Leitura e análise

- Listar e filtrar transações por período, tipo, categoria e status.
- Listar categorias, tags, orçamentos, limites, metas e fixos mensais.
- Consultar vendas e fechamentos.
- Calcular totais, saldo, margem, comparações, maiores gastos, desvios e
  recorrências.
- Gerar dados de DRE, relatório financeiro e fluxo de caixa.

### Escrita

- Criar, editar e excluir transações.
- Criar, editar e excluir categorias e tags.
- Criar, editar e excluir orçamentos, limites e metas.
- Fechar e reabrir competência mensal com autorização owner/admin.

A IA será instruída a consultar dados antes de propor edição ou exclusão.
Inicialmente cada confirmação representará uma única ação, sem mutações em
lote.

## Autorização e escopo

O agente só poderá operar no `ActiveScope` selecionado no topo da aplicação.
No escopo pessoal, os dados pertencem ao usuário autenticado. No escopo de
conta, o servidor verificará a associação real do usuário e aplicará a matriz
de permissões do membro, sem confiar apenas no header enviado pelo navegador.

Consultas serão executadas imediatamente. Toda criação, edição, exclusão,
fechamento ou reabertura exibirá entidade, valores atuais, valores novos,
impacto e botões `Confirmar` e `Cancelar`.

## Experiência

O FAB ficará no layout autenticado e abrirá um painel lateral de cerca de 440
px no desktop. Em telas pequenas, o painel ocupará a tela inteira. O painel
terá mensagens, sugestões rápidas, streaming quando disponível, foco no
campo de entrada e estado de carregamento.

Ao trocar de escopo, a conversa será limpa para impedir mistura de dados. Após
uma confirmação, os listeners existentes atualizarão as telas. Falhas serão
mostradas como mensagens recuperáveis, sem detalhes internos ou segredos.

O prompt do agente exigirá português brasileiro, respostas baseadas em dados
reais, cálculos do servidor, esclarecimento de datas ambíguas, formatação em
reais e tratamento dos campos do Firestore como dados não confiáveis, nunca
como instruções.

## Remoção do Pluggy

Remover a integração do produto: componentes, hook, serviços, rotas, webhook,
menus, listeners e dependências que só existirem para Pluggy. Preservar os
documentos antigos `pluggy_connections` e `pluggy_provisions` no Firestore,
sem novas leituras ou escritas.

## Erros e limites

- Recusar requisições sem autenticação válida.
- Limitar tamanho das mensagens, iterações do agente e duração da chamada.
- Tratar timeout e respostas inválidas da DeepSeek sem expor detalhes internos.
- Não registrar chave, prompt completo ou dados financeiros sensíveis.
- Rejeitar IDs fora do escopo e valores incompatíveis com os schemas atuais.

## Verificação

Criar testes mínimos para ferramentas de leitura e filtros, isolamento entre
escopos, permissões, propostas, confirmação, cancelamento, replay e exclusão.
Executar `npm run lint`, `npm test` e `npm run build`.

Critérios de aceite:

1. O FAB abre a IA em desktop e mobile.
2. A chave nunca aparece no bundle ou nas requisições do navegador para a
   DeepSeek.
3. A IA consulta apenas o escopo ativo.
4. Toda escrita aguarda confirmação explícita.
5. Confirmações adulteradas, repetidas ou sem permissão são rejeitadas.
6. Os dados financeiros são consultados do Firestore atual.
7. A integração Pluggy deixa de existir no produto sem apagar seus dados.
8. Lint, testes e build passam.
