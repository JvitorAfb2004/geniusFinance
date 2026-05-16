export const POLITICA_PRIVACIDADE = `POLÍTICA DE PRIVACIDADE — GeniusHub

Última atualização: 15 de maio de 2026

Esta Política de Privacidade descreve como a GENIUS WEB, inscrita no CNPJ sob o nº 66.107.006/0001-70, coleta, utiliza, armazena e protege os dados pessoais e financeiros dos usuários da plataforma GeniusHub, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).

1. INFORMAÇÕES GERAIS

Controlador dos dados: GENIUS WEB
CNPJ: 66.107.006/0001-70
E-mail para questões de privacidade: contato@geniusweb.online
Site: geniusweb.online

2. DADOS COLETADOS

2.1. Dados fornecidos pelo usuário:
- Dados de autenticação Google: nome, e-mail, foto de perfil e identificador único (UID) do Firebase Auth;
- Dados financeiros: transações (receitas, despesas, cartões de crédito), categorias, orçamentos, metas financeiras, metas de vendas, relatórios;
- Dados de CRM: leads (nome do cliente, e-mail, telefone, serviço, status, origem, descrição);
- Dados de projetos: projetos, tarefas, subtarefas, responsáveis, prazos, status, tipos de serviço;
- Configurações do usuário: preferências de exibição do dashboard, alertas, escopo ativo (pessoal ou empresarial).

2.2. Dados coletados automaticamente:
- Informações de uso: o Firebase pode coletar endereço IP, tipo de navegador, sistema operacional e dados de sessão para fins de autenticação e segurança;
- Dados de cache local: a plataforma armazena preferências do usuário no localStorage do navegador (escopo ativo, visibilidade de valores, alertas e widgets do dashboard).

2.3. Dados NÃO coletados:
- A plataforma não utiliza cookies próprios;
- A plataforma não utiliza serviços de analytics (Google Analytics, Firebase Analytics, etc.);
- A plataforma não coleta dados de localização geográfica precisa;
- A plataforma não realiza fingerprinting ou tracking entre sites.

3. FINALIDADES DO TRATAMENTO

Os dados são tratados para as seguintes finalidades:

- Autenticação e controle de acesso à plataforma (Firebase Auth);
- Armazenamento e exibição dos dados financeiros e de projetos inseridos pelo usuário;
- Processamento de IA para extração de transações, leads e geração de relatórios (via NVIDIA API);
- Compartilhamento de dados entre membros da mesma conta empresarial;
- Envio de convites para participação em contas empresariais (via Firestore);
- Exportação de transações em CSV;
- Suporte técnico;
- Cumprimento de obrigações legais.

4. BASES LEGAIS (LGPD)

O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais da LGPD:

- Consentimento (art. 7º, I): para o envio de dados à API NVIDIA para processamento de IA;
- Execução de contrato (art. 7º, V): para autenticação, armazenamento e funcionamento da plataforma;
- Interesse legítimo (art. 7º, IX): para suporte técnico e segurança;
- Cumprimento de obrigação legal (art. 7º, II): quando exigido por lei.

5. COMPARTILHAMENTO DE DADOS

Os dados do usuário podem ser compartilhados nas seguintes situações:

5.1. Contas empresariais: quando o usuário participa de uma conta empresarial, os dados inseridos no escopo da conta (transações, projetos, leads, etc.) são acessíveis aos demais membros da conta, conforme as permissões definidas pelo administrador.

5.2. Prestadores de serviços:
- Google LLC (Firebase Auth e Cloud Firestore): autenticação e armazenamento de dados. Política: https://policies.google.com/privacy
- NVIDIA Corporation (NVIDIA API): processamento de IA para extração de dados, relatórios e chat. Política: https://www.nvidia.com/en-us/privacy-center/
- EasyPanel: hospedagem do servidor proxy de IA.

5.3. Autoridades competentes: quando exigido por lei, ordem judicial ou autoridade administrativa.

5.4. Os dados não são vendidos, alugados ou compartilhados para fins de marketing ou publicidade.

6. TRANSFERÊNCIA INTERNACIONAL DE DADOS

Os dados são armazenados no Google Cloud Firestore, cujos servidores podem estar localizados fora do Brasil. O Google LLC possui certificação e adere a padrões internacionais de proteção de dados.

Ao utilizar a plataforma, o usuário consente com a transferência internacional de seus dados para viabilizar o funcionamento do serviço, nos termos do art. 33 da LGPD.

Dados enviados para a API NVIDIA são processados nos servidores da NVIDIA (Estados Unidos ou global) durante a sessão de processamento de IA.

[REVISAR_COM_ADVOGADO: Confirmar se a NVIDIA possui cláusulas contratuais padrão ou certificação adequada para transferência internacional nos termos da LGPD.]

7. ARMAZENAMENTO E RETENÇÃO

Os dados são armazenados no Google Cloud Firestore enquanto a conta do usuário estiver ativa.

O usuário pode solicitar a exclusão de seus dados pelo e-mail contato@geniusweb.online.

[REVISAR_COM_ADVOGADO: Atualmente, a plataforma não possui funcionalidade de exclusão permanente e completa de todos os dados. A exclusão de conta empresarial realiza apenas arquivamento (soft delete). É recomendável implementar exclusão definitiva para conformidade com o art. 15 e art. 16 da LGPD.]

8. DIREITOS DO TITULAR (LGPD)

Nos termos da LGPD, o usuário tem os seguintes direitos:

- Confirmar a existência de tratamento de seus dados (art. 18, I);
- Acessar seus dados (art. 18, II);
- Corrigir dados incompletos, inexatos ou desatualizados (art. 18, III);
- Solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos (art. 18, IV);
- Solicitar a portabilidade dos dados (art. 18, V);
- Solicitar a eliminação dos dados tratados com consentimento (art. 18, VI);
- Obter informações sobre compartilhamento de dados (art. 18, VII);
- Revogar o consentimento (art. 18, IX).

Para exercer esses direitos, entre em contato pelo e-mail: contato@geniusweb.online.

O prazo para resposta é de até 15 dias, conforme o art. 19, II da LGPD. [REVISAR_COM_ADVOGADO: Confirmar prazo aplicável e capacidade operacional de resposta.]

9. SEGURANÇA DOS DADOS

A GENIUS WEB adota as seguintes medidas de segurança:

- Autenticação via Google OAuth 2.0;
- Banco de dados com regras de acesso baseadas em permissões do usuário (Firestore Security Rules);
- Criptografia de dados em trânsito (HTTPS/TLS) e em repouso (Firestore);
- Separação lógica de dados por usuário (escopo pessoal) e por conta empresarial (escopo conta);
- Validação de integridade de documentos (schema validation nas regras do Firestore);
- Proteção contra escrita não autorizada (verificação de userId e papéis de membro);
- Senha e credenciais gerenciadas exclusivamente pelo Google (a plataforma não armazena senhas próprias);
- Isolamento de escopos: usuários não autenticados não têm acesso a nenhum dado.

10. USO DE INTELIGÊNCIA ARTIFICIAL

A plataforma envia dados à API NVIDIA para funcionalidades de IA, incluindo:
- Texto de transações financeiras para extração automática de dados;
- Texto de leads para extração de dados de clientes;
- Dados financeiros agregados para geração de relatórios e sugestões;
- Mensagens do chat conversacional.

[REVISAR_COM_ADVOGADO: Verificar se a NVIDIA utiliza dados enviados pela API para treinamento de modelos. Caso positivo, é necessário informar o usuário e obter consentimento específico.]

Os dados enviados para processamento de IA são transmitidos de forma pontual (por solicitação) e não são armazenados permanentemente pela NVIDIA, conforme os termos de uso da API NVIDIA.

O usuário pode utilizar as funcionalidades da plataforma sem acionar os recursos de IA, caso prefira não ter seus dados processados por terceiros.

11. localStorage

A plataforma utiliza o localStorage do navegador para armazenar preferências do usuário:

| Chave | Finalidade |
|---|---|
| gh_active_scope | Escopo ativo (pessoal ou conta empresarial) |
| dashboard_values_visible | Exibir/ocultar valores financeiros |
| dashboard_alerts_enabled | Ativar/desativar alertas do dashboard |
| dashboard_alerts_dismissed_ids | IDs de alertas dispensados |
| dashboard_widgets | Ordem/seleção de widgets do dashboard |
| gh_terms_accepted | Registro de aceite dos Termos de Uso e Política de Privacidade |

Nenhuma informação pessoal identificável é armazenada no localStorage.

12. UPLOAD DE ARQUIVOS

A plataforma permite upload de arquivos Excel (.xlsx) e CSV para importação de transações financeiras. Os arquivos são processados localmente no navegador do usuário e os dados extraídos são armazenados no Firestore. Para processamento com IA, os dados extraídos podem ser enviados à API NVIDIA.

13. CRIAÇÃO DE CONTA EMPRESARIAL E CONVITES

Ao criar uma conta empresarial, o usuário (proprietário) pode convidar outros usuários por e-mail. O e-mail do convidado é armazenado no Firestore para viabilizar o convite.

O convidado pode verificar convites pendentes ao fazer login na plataforma com o mesmo e-mail.

14. ALTERAÇÕES NESTA POLÍTICA

Esta Política de Privacidade poderá ser atualizada periodicamente. A versão atualizada será publicada na plataforma, com indicação da data de atualização.

Alterações significativas serão comunicadas aos usuários por meio da plataforma.

15. CONTATO DO CONTROLADOR

GENIUS WEB
CNPJ: 66.107.006/0001-70
E-mail: contato@geniusweb.online
Site: geniusweb.online

Para exercer seus direitos como titular de dados ou esclarecer dúvidas sobre esta Política, utilize o e-mail acima.
`;
