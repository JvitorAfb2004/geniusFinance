# IA Global e Markdown

Data: 2026-08-30

## Objetivo

Permitir que o agente consulte o escopo pessoal e todas as empresas às quais o
usuário pertence, mantendo os resultados claramente separados. As respostas
serão curtas e renderizadas como Markdown real, incluindo tabelas.

## Regras

- Leituras podem consultar todos os escopos autorizados do usuário.
- Cada resultado deve identificar a conta com um título Markdown próprio.
- Nunca misturar totais de Pessoal e Empresas no mesmo cálculo sem separar os
  subtotais.
- Criações, edições, exclusões, fechamentos e reaberturas continuam limitados
  ao escopo ativo e exigem confirmação.
- A mensagem da IA deve ser objetiva, sem repetir dados desnecessariamente.
- O cliente deve renderizar títulos, negrito, listas, citações e tabelas; não
  deve exibir a sintaxe Markdown crua.
- HTML arbitrário não será permitido na resposta renderizada.

## Implementação

O servidor reunirá o escopo pessoal e as contas indexadas em
`user-accounts/{uid}/memberships`, verificará a associação real de cada conta
e executará ferramentas de leitura por escopo. A resposta será composta por
blocos identificados por conta. Ferramentas de mutação continuarão recebendo
somente o escopo ativo e suas propostas indicarão esse escopo.

O painel usará `react-markdown` com `remark-gfm` para renderizar Markdown e
tabelas. Links e HTML não confiáveis serão tratados sem execução de scripts.
Mensagens do usuário não serão renderizadas como HTML.

## Verificação

- Testar isolamento e identificação de múltiplas contas.
- Testar que uma conta sem associação real não aparece.
- Testar que mutações continuam limitadas ao escopo ativo.
- Testar renderização de títulos, negrito, listas e tabelas.
- Executar `npm.cmd run lint`, `npm test` e `npm.cmd run build`.
