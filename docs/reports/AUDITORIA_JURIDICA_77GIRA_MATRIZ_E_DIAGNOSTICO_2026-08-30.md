# Auditoria jurídica 77Gira - matriz de impacto e diagnóstico

**Data:** 30/08/2026  
**Base de validação:** código e documentos locais disponíveis nesta data.  
**Escopo:** 77Gira (plataforma) e 77Giramundo (iniciativa), com implantação inicial em São Paulo e abrangência prevista em todo o território nacional.

## Inventário localizado

| Tipo | Itens/localização | Estado observado |
|---|---|---|
| Política pública | `frontend/src/pages/PrivacyPage.jsx` | Abrange conta, localização, publicidade, Patacos simulados e direitos. |
| Termos públicos | `frontend/src/pages/TermsPage.jsx` | Abrange contas, perfis, eventos, publicidade e moderação. |
| Aceite eletrônico | `backend/src/services/legalAcceptance.service.js`, modelos legais e telas de assinatura | Registra conta, versão, hash de conteúdo, data, user-agent e hash de IP quando disponíveis. |
| Consentimentos | `PrivacyConsentRecord`, `privacyConsents.js`, Central de Privacidade e onboarding regional | Publicidade regional usa apenas cidade-base após decisão afirmativa; anúncios gerais não dependem desse consentimento. |
| Publicidade | controladores, placements, Workspace, revisão e carteira Ads | Conta aprovada, campanha/criativo, entrega tokenizada, impressão e clique; Patacos com gateway simulado. |
| Minutas locais | `documentacao/juridico/minutas/pacote_contratual_v1/` | Versão v1 contém 10 minutas em DOCX; não foi alterada porque é pasta local não rastreada preservada pelo handoff. |
| Catálogo legal no produto | `backend/scripts/seed-local-legal-homologation-catalog.js` e administração legal | Estrutura suporta versão, audiência, vigência e reaceite; conteúdo local de homologação não deve ser confundido com publicação jurídica. |

## Matriz de impacto

| Funcionalidade/relação | Dado ou obrigação | Documento/interface impactado | Alteração necessária | Implementação confirmada? | Decisão pendente? |
|---|---|---|---|---|---|
| Conta e aceite | identidade da conta, versão, data, user-agent e IP com hash | Termos, Privacidade, aceite | Descrever aceite eletrônico sem prometer CPF/CNPJ ou assinatura avançada | Sim, parcialmente | Como comprovar representação de PJ: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]** |
| Atuação nacional | disponibilidade regional | Termos, Privacidade, minutas | Sede em SP; implantação inicial em SP; abrangência nacional sem promessa de cobertura simultânea | Sim | Não |
| Perfis e reivindicações | declaração de legitimidade e evidências | Termos, termo de reivindicação, modal | Distinguir conta, titular e representante; preservar contestação | Sim | Prazo/canal formal de recurso: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]** |
| Ads geral | contexto, sessão, impressão, clique | Privacidade, Termos de publicidade | Explicar publicidade identificada, métricas e ausência de garantia de performance | Sim | Retenção detalhada dos logs: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]** |
| Ads regional | cidade-base e decisão de consentimento | Privacidade, onboarding, Central de Privacidade | Explicar que cidade não é revelada individualmente ao anunciante e que recusa mantém anúncios gerais | Sim | Revisão jurídica da base/versão de política: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]** |
| Localização atual | coordenadas temporárias do Tô na Pista | Privacidade, modal do recurso | Separar permissão técnica, duração e finalidade de proximidade da publicidade regional | Sim | Prazo operacional de retenção: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]** |
| Posicionamentos Ads | inventário e formatos | Termos de publicidade, Workspace | Definição geral, sem lista rígida de slots nem preços fixos | Sim | Não |
| Carrossel entre dias | composição de diferentes anunciantes, slides e medição por peça | Termos Ads, Workspace, Privacidade | Explicar inventário compartilhado e ausência de exclusividade/performance garantida | Sim, sob flags | Critério final de fallback: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]** |
| Patacos | reserva, débito por impressão válida e carteira | Regulamento, telas, Privacidade | Não apresentar como dinheiro; preço antes da contratação; gateway segue simulado | Sim, parcialmente | pagamento real, fiscal, estorno, expiração e transferência: **[DECISÃO FINANCEIRA/JURÍDICA PENDENTE]** |
| Moderação Ads | criativos, destinos, direitos e fraude | Termos, Termos Ads, moderação | Responsabilidade do Anunciante e poder proporcional de revisão/suspensão | Sim | Política formal de categorias restritas: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]** |
| Parceiros | marca, dados agregados e patrocínio | Política/minuta de parceria | Não prometer dados individuais, inventário ou exclusividade sem anexo | Sim, parcialmente | condições comerciais, assinatura externa e foro: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]** |

## Diagnóstico de divergências e riscos

1. As minutas DOCX v1 usam dados fictícios e nomes divergentes (“77 Giramundo Serviços...” e CNPJ fictício). Elas não podem ser usadas como contrato final; devem manter apenas os dois placeholders autorizados.
2. Essas minutas dizem “assinatura por provedor especializado”, enquanto o requisito atual é aceite dentro da 77Gira. Essa cláusula deve ser retirada das minutas de adesão e reservada a contrato bilateral que efetivamente use provedor externo.
3. A lista de fornecedores nos DOCX não está confirmada como cadastro operacional publicado; a Política pública corretamente usa categorias. Não congelar fornecedores, países ou DPAs sem revisão operacional.
4. O código registra versão, hash, data, user-agent e hash de IP para aceite legal quando disponíveis; não há confirmação de coleta de CPF/CNPJ em todos os fluxos. Nenhum documento deve prometer esses dados para todo aceite.
5. O gateway de pagamento é simulado; não há cobrança real, dados de cartão, regra de estorno, documento fiscal ou tributação implementados.
6. O produto entrega anúncios gerais e, com consentimento, campanhas por cidade-base. Não há base para declarar publicidade comportamental por eventos, cliques ou interesses individuais.
7. O produto prevê os slots entre dias sob flags e uma migração ainda não aplicada. Eles devem ser descritos como posicionamentos disponíveis somente quando habilitados, não como promessa comercial permanente.
8. A Política pública já aborda localização e publicidade regional; o principal ajuste de produto é a identificação institucional, a abrangência nacional e a publicação controlada de versões legais.

## Funcionalidades deliberadamente excluídas dos documentos vigentes

- Cobrança real por gateway, cartão ou dado bancário.
- Reembolso, estorno, tributação, nota fiscal e transferência de saldo de Patacos.
- Push patrocinado e novos usos de localização precisa para publicidade.
- Garantia de alcance, conversão, vendas, CTR, posição ou exclusividade.
- Compartilhamento de localização individual ou perfil individual com anunciantes.

## Próximas ações de publicação

1. Atualizar textos públicos confirmados (Termos e Política) sem antecipar decisões pendentes.
2. Submeter as minutas DOCX v1 à revisão humana antes de substituir cópias locais preservadas.
3. Criar versões legais no catálogo administrativo, definir vigência/reaceite e publicar somente após validação jurídica.
4. Antes de ativar pagamento real ou nova publicidade baseada em dados, executar nova avaliação de privacidade e aprovar as decisões pendentes deste relatório.
