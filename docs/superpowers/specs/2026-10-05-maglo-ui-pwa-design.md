# Redesign Maglo e PWA do Genius Finance

## Objetivo

Atualizar a interface do Genius Finance para seguir visualmente as referências Maglo exportadas em `TELA/light`, adaptando o layout ao produto real, e permitir que o PWA receba novas versões publicadas sem reinstalação.

## Referências e escolhas

- Os PNGs em `TELA/light` são a referência visual; `TELA/black` fica fora do escopo. O tema Light será o único tema.
- O layout deve acompanhar de perto as referências: tipografia, fundos, bordas, navegação, tabelas, cartões e composição do dashboard, adaptados aos dados e às rotas financeiras existentes. Manter azul como cor principal do Genius Finance; não adotar o verde/lima Maglo como cor da marca.
- Os PNGs são telas de referência, não substituirão telas funcionais nem dados reais.

## Escopo

1. Atualizar tokens/estilos e componentes compartilhados (estrutura autenticada, navegação, cabeçalho e estados comuns) e aplicar o padrão às rotas do app, começando por dashboard, transações e configurações.
2. Revisar responsividade, estados vazios/erro/carregamento e acessibilidade durante a adaptação; corrigir defeitos encontrados diretamente relacionados às telas tocadas.
3. Adicionar instalação PWA e atualização do service worker após publicação de versão nova, sem exigir desinstalar/reinstalar.
4. Validar fluxos principais e viewport móvel/desktop com Playwright quando o ambiente permitir, além de lint, testes e build.

## Fora do escopo

- Alterações a regras financeiras, contratos Firebase/API, permissões, autenticação ou modelo de dados, salvo correção indispensável e aprovada separadamente.
- Tema Black, novas funcionalidades de produto, migração de framework ou mudanças de marca/conteúdo não exigidas pelo design.
- Cache offline de dados financeiros ou de respostas autenticadas.

## Arquitetura e comportamento

- Manter React Router 7, Tailwind e os componentes Astryx existentes; usar tokens/componentes do projeto quando aplicável, sem reescrever a aplicação como implementação estática dos PNGs.
- Preservar rotas, navegação e comportamento atual; mudanças de apresentação devem ser progressivas e verificadas por dependentes/callers.
- Layout desktop seguirá a composição Maglo com navegação lateral e área de conteúdo; em telas menores, navegação e conteúdo devem se reorganizar sem overflow horizontal e respeitar áreas seguras do dispositivo.
- PWA deve atualizar o shell/arquivos estáticos de forma segura ao detectar nova versão. Dados pessoais/financeiros e respostas autenticadas não devem ser persistidos no cache do service worker. Não interceptar ou cachear APIs Firebase.

## Verificação e pronto

- Conferir visualmente desktop e mobile contra as referências Light e percorrer as rotas representativas sem erros de console.
- Testar navegação e interações essenciais com Playwright, incluindo atualização/registro do PWA se possível no ambiente local.
- Rodar `npm run lint`, `npm test` e `npm run build`.
- Confirmar que funcionalidades e dados existentes continuam preservados; registrar explicitamente qualquer teste bloqueado por falta de ambiente/autenticação.
