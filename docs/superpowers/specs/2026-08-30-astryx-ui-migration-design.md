# Migração Visual para Astryx

## Objetivo

Atualizar o design de toda a interface do Genius Finance usando os componentes e tokens do Astryx, preservando o layout atual, as rotas, a lógica de negócio e a responsividade.

## Escopo

- Instalar `@astryxdesign/core`, `@stylexjs/stylex`, `@astryxdesign/theme-neutral` e a CLI do Astryx.
- Configurar reset, tokens e tema global do Astryx.
- Migrar primeiro os componentes compartilhados e o assistente financeiro.
- Migrar progressivamente as telas existentes para os componentes Astryx equivalentes.
- Manter Tailwind durante a transição e remover somente estilos ou dependências comprovadamente sem uso.

Fora do escopo: alterar rotas, contratos de API, Firebase, permissões, regras financeiras ou estrutura de navegação.

## Direção Visual

O tema `neutral` será a base. O layout existente será mantido: sidebar, header, cards, tabelas, modais, FAB e navegação mobile. Cores, tipografia, espaçamento, bordas, elevação e estados interativos serão derivados dos tokens Astryx, com ajustes mínimos para preservar a identidade financeira atual.

## Arquitetura

Componentes Astryx serão importados por subpath, conforme a documentação, para reduzir o bundle. A camada compartilhada será migrada antes das páginas. Cada tela manterá sua lógica e receberá apenas substituições visuais cirúrgicas. Tailwind poderá coexistir enquanto componentes ainda não migrados dependem das classes atuais.

## Comportamento

- Nenhuma mudança funcional deve ocorrer.
- O assistente financeiro mantém o layout atual, Markdown seguro, confirmação em português e escopo de dados existente.
- Todos os controles devem manter estados de foco, hover, disabled, erro e loading.
- A interface deve funcionar em desktop e mobile.

## Verificação

- `npm run lint`
- `npm test`
- `npm run build`
- Revisão visual das telas compartilhadas e do assistente em desktop e mobile.
- Confirmar que alterações pré-existentes do usuário não sejam sobrescritas.
