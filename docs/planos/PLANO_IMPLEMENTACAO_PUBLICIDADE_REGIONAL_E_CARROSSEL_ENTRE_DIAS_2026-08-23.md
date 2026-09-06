# Plano de Implementação — Publicidade Regional e Carrossel Entre Dias

**Projeto:** 77Gira  
**Data de criação:** 23/08/2026  
**Estado geral:** Em andamento — fundação, consentimento, entrega e primeira interface implementados sob flags  
**Referência operacional:** este documento deve ser lido antes de qualquer implementação deste escopo.

## 1. Como usar este documento

Este é um plano operacional vivo, não apenas uma especificação de produto.

Antes de iniciar ou retomar qualquer etapa:

1. Ler integralmente `docs/HANDOFF_NOVA_TAREFA_2026-08-22.md`.
2. Ler integralmente este documento.
3. Conferir o estado atual do Git.
4. Preservar as pastas locais não rastreadas `documentacao/`, `remotion/` e `scripts/`, além do handoff.
5. Validar no código se as referências técnicas deste plano continuam atuais.
6. Não misturar este trabalho com alterações pendentes sem antes identificar sua origem.
7. Não fazer commit, push, migração ou deploy sem autorização correspondente do usuário.

Durante a implementação:

- Atualizar o quadro de fases e os checklists deste documento.
- Registrar decisões novas no histórico ao final do arquivo.
- Marcar uma tarefa como concluída somente depois dos testes e das evidências indicadas.
- Se a implementação real precisar divergir deste plano, registrar a justificativa antes de prosseguir.
- Preservar compatibilidade com sessões, campanhas, criativos, preços e consentimentos já existentes.

Legenda de estado:

- `[ ]` Não iniciada.
- `[~]` Em andamento.
- `[x]` Concluída e validada.
- `[!]` Bloqueada ou dependente de decisão.

> Observação: Markdown não possui um checkbox nativo para `[~]` e `[!]`; eles são usados neste documento como marcadores operacionais.

## 2. Objetivo consolidado

Implementar quatro evoluções coordenadas:

1. Exibir anúncios gerais para todas as pessoas, com ou sem conta.
2. Apresentar uma escolha explícita e amistosa sobre publicidade regional para pessoas autenticadas.
3. Criar uma oportunidade publicitária individual entre dois grupos de dias no Explorar.
4. Criar um carrossel compartilhado entre dias, formado dinamicamente por peças de anunciantes diferentes.

O destaque superior atual do Explorar deve continuar existindo como inventário premium.

## 3. Decisões de produto aprovadas

### 3.1 Alcance

- Anúncios gerais podem aparecer para qualquer visitante.
- Campanhas regionais podem usar apenas a cidade-base da pessoa.
- A cidade-base só pode entrar no motor regional quando houver decisão ativa favorável.
- A escolha regional é voluntária e pode ser alterada depois.
- A pessoa precisa tomar uma decisão no onboarding, mas não precisa aceitar a segmentação regional.
- A recusa não bloqueia recursos do aplicativo.

### 3.2 Texto do convite regional

**Título:** “Ajude o samba a continuar girando”

**Texto-base:**

> O 77Gira é gratuito para quem descobre, faz e vive o samba. Ao permitir campanhas da sua região, você recebe divulgações mais próximas da sua agenda e ajuda a manter o app acessível para toda a comunidade.

**Ações:**

- Principal: “Quero ver campanhas da minha região”.
- Alternativa: “Continuar com anúncios gerais”.

O texto final precisa informar, em linguagem simples, que somente a cidade-base será usada e que dados pessoais não serão entregues aos anunciantes.

### 3.3 Posições e preços iniciais

| Posição | Identificador técnico sugerido | Formato | Preço inicial |
|---|---|---|---:|
| Explorar — destaque superior | `explore_feed_large` | 1080 × 1350 px, 4:5 | 35 patacos/CPM |
| Explorar — entre dias individual | `explore_between_days` | 1080 × 1350 px, 4:5 | 25 patacos/CPM |
| Explorar — carrossel entre dias | `explore_between_days_carousel` | 1080 × 810 px, 4:3 | 20 patacos/CPM |

### 3.4 Regras do carrossel

- O carrossel é um inventário compartilhado montado pelo 77Gira no momento da entrega.
- Cada anunciante pode contribuir com até três peças da mesma campanha ou série.
- A composição deve misturar pelo menos dois anunciantes quando houver inventário disponível.
- Deve priorizar variedade de anunciante e categoria comercial.
- Pode conter de 2 a 21 peças.
- Cada peça mantém título, CTA, destino, identificação ADS e aprovação próprios.
- Impressões, cliques e cobrança são medidos por peça.
- O carrossel não deve cobrar peças apenas carregadas e não visualizadas.

## 4. Estado técnico validado em 23/08/2026

Esta seção descreve o ponto de partida e deve ser revalidada antes da implementação.

### 4.1 Consentimento e onboarding

- O onboarding atual é uma apresentação anônima armazenada localmente no aparelho.
- Ele não deve receber diretamente a nova decisão regional, porque essa decisão precisa pertencer à conta.
- Já existe consentimento `ads_personalization` com histórico aditivo no banco.
- O motor atual já exige consentimento ativo antes de usar a cidade-base na segmentação.
- O Centro de Privacidade já permite conceder e revogar esse consentimento.

### 4.2 Publicidade

- O motor atual entrega uma única peça por solicitação.
- Impressões válidas usam o critério mínimo de 50% de visibilidade por um segundo.
- A entrega possui token individual e proteção contra impressão duplicada.
- Campanhas e criativos possuem aprovação administrativa.
- O catálogo de posições está duplicado entre servidor e frontend.
- O Workspace atualmente organiza os rascunhos de criativos por posição, pressupondo essencialmente uma peça por slot.
- A entrega atual verifica a data de início da campanha; a data final precisa ser aplicada explicitamente antes da expansão do inventário.

### 4.3 Sessões

- A sessão autenticada usa tokens de acesso e renovação persistidos.
- Consentimento regional não faz parte do token e, portanto, não exige encerramento ou rotação de sessões.
- O identificador atual de publicidade fica no armazenamento local sem expiração e não representa adequadamente uma visita.
- O limite de um carrossel por sessão exige separar identificação estável de frequência e sessão temporária de navegação.

## 5. Quadro executivo de fases

| Fase | Entrega | Estado | Evidência necessária |
|---|---|---|---|
| 0 | Validação jurídica e decisões finais | Pendente | Texto e regras aprovados |
| 1 | Fundação de posições, preços e compatibilidade | Em andamento | Migração criada; aplicação em ambiente de teste pendente |
| 2 | Decisão regional associada à conta | Em andamento | API e fluxo implementados; validação manual pendente |
| 3 | Sessão de publicidade V2 | Em andamento | Identidade de visita implementada; cenários multiaba pendentes |
| 4 | Slot individual entre dias | Em andamento | Inserção condicionada implementada; validação visual pendente |
| 5 | Motor e interface do carrossel compartilhado | Em andamento | Composição e renderização implementadas; métricas avançadas pendentes |
| 6 | Workspace do anunciante | Em andamento | Três posições e limite de série implementados; editor dedicado pendente |
| 7 | Administração e relatórios | Em andamento | Slots chegam ao relatório existente; simulador e recortes pendentes |
| 8 | Lançamento gradual | Não iniciada | Smoke test, monitoramento e rollback aprovados |

## 6. Fase 0 — Validação jurídica e decisões finais

### Implementação

- [ ] Validar juridicamente o texto do convite regional.
- [ ] Confirmar que a finalidade permanece limitada à cidade-base.
- [ ] Confirmar que a recusa não bloqueia funcionalidades.
- [ ] Definir a nova versão da política, se necessária.
- [ ] Decidir se consentimentos existentes continuam válidos sem nova pergunta.
- [ ] Confirmar o critério comercial de cobrança por impressão válida de cada slide.
- [ ] Confirmar o fallback quando há menos de dois anunciantes elegíveis.

### Recomendação registrada

- Consentimentos positivos e negativos já existentes devem ser preservados se não houver mudança material de finalidade.
- Com apenas um anunciante elegível, usar o slot individual ou não preencher a oportunidade; não apresentar um carrossel compartilhado de marca única.

### Critério de conclusão

- Texto, finalidade, versão de política, fallback e unidade de cobrança documentados e aprovados.

## 7. Fase 1 — Fundação de posições, preços e compatibilidade

### Banco e servidor

- [ ] Adicionar `explore_between_days` ao enum de posições.
- [ ] Adicionar `explore_between_days_carousel` ao enum de posições.
- [ ] Criar migração somente aditiva.
- [ ] Incluir as novas posições no catálogo oficial do servidor.
- [ ] Registrar dimensões, tipos aceitos, limite de 5 MB e regras comerciais.
- [ ] Criar uma nova versão da tabela de preços.
- [ ] Aplicar explicitamente a data final da campanha no motor de elegibilidade.
- [ ] Impedir que campanhas antigas sejam inscritas automaticamente nos novos slots.

### Catálogo

- [ ] Fazer o Workspace e as prévias consumirem o catálogo do servidor.
- [ ] Manter fallback local temporário para clientes antigos.
- [ ] Eliminar divergências de nomes, dimensões e preços entre frontend e backend.

### Compatibilidade

- [ ] Preservar fotografias de preço de campanhas existentes.
- [ ] Preservar criativos e aprovações existentes.
- [ ] Confirmar que `runInAllSlots` não inclui posições criadas futuramente sem criativo explícito.
- [ ] Confirmar que versões antigas do frontend continuam funcionando com o servidor novo.

### Critério de conclusão

- Migração aplicada em ambiente de teste, flags desligadas, testes antigos passando e nenhuma campanha atual alterada.

## 8. Fase 2 — Decisão regional associada à conta

### API e dados

- [ ] Criar uma leitura leve do estado da decisão regional da conta.
- [ ] Retornar `decided`, `isGranted`, `policyVersion`, `createdAt` e `source`.
- [ ] Criar uma ação específica de decisão com origem controlada como `onboarding`.
- [ ] Preservar o histórico aditivo de consentimento.
- [ ] Registrar evento de auditoria para aceite e recusa.
- [ ] Tornar a gravação idempotente contra duplo clique.

### Interface

- [ ] Criar uma etapa autenticada separada do onboarding anônimo atual.
- [ ] Apresentar o texto aprovado e as duas ações sem checkbox pré-marcado.
- [ ] Preservar o destino original da pessoa depois da decisão.
- [ ] Integrar o fluxo após cadastro.
- [ ] Integrar o fluxo após login quando ainda não houver decisão.
- [ ] Integrar o fluxo com sessões que já estavam abertas.
- [ ] Sincronizar a decisão com o Centro de Privacidade.
- [ ] Atualizar outras abas ou dispositivos quando a decisão mudar.

### Conta sem cidade-base

- [ ] Levar a ação regional ao preenchimento da cidade-base.
- [ ] Gravar cidade e consentimento de forma consistente.
- [ ] Manter “Continuar com anúncios gerais” disponível.
- [ ] Não tornar bairro ou CEP obrigatórios para essa finalidade.

### Falha e modo degradado

- [ ] Não bloquear a pessoa se a API de privacidade estiver indisponível.
- [ ] Usar somente anúncios gerais enquanto o estado não puder ser confirmado.
- [ ] Solicitar a decisão novamente em uma oportunidade segura.

### Critério de conclusão

- Contas novas, contas existentes com decisão, contas existentes sem decisão, contas sem cidade e modo offline testados.

## 9. Fase 3 — Sessão de publicidade V2

### Modelo

- [ ] Preservar o identificador atual como identidade estável de frequência (`viewerId`).
- [ ] Criar um identificador temporário de visita (`visitSessionId`).
- [ ] Armazenar a visita em `sessionStorage` ou equivalente temporário.
- [ ] Renovar a visita após 30 minutos de inatividade.
- [ ] Limitar a duração absoluta da visita a 24 horas.
- [ ] Enviar os dois identificadores ao servidor sem expor os valores brutos nos registros.

### Carrossel por sessão

- [ ] Garantir no máximo uma oportunidade de carrossel por visita no Explorar.
- [ ] Tornar a composição idempotente durante sua validade.
- [ ] Evitar que uma atualização de página crie reservas e ordens diferentes desnecessariamente.
- [ ] Manter frequência diária por campanha baseada na identidade estável.

### Critério de conclusão

- Atualização, múltiplas abas, fechamento do navegador, inatividade e frequência diária testados sem apagar o identificador anterior.

## 10. Fase 4 — Slot individual entre dias

### Regras de inserção

- [ ] Consultar o slot apenas quando existirem pelo menos dois grupos de agenda.
- [ ] Inserir depois do primeiro grupo visível.
- [ ] Nunca inserir antes do primeiro dia.
- [ ] Não renderizar espaço vazio quando não houver anúncio.
- [ ] Recalcular corretamente ao aplicar filtros.
- [ ] Permitir que o destaque superior e uma oportunidade entre dias coexistam.
- [ ] Impedir que slot individual e carrossel apareçam juntos no mesmo intervalo.

### Layout

- [ ] Usar o formato 4:5 do card de evento.
- [ ] Preservar corpo textual, CTA e identificação ADS.
- [ ] Validar altura, espaçamento, foco e área clicável.
- [ ] Validar mobile, tablet e desktop.

### Critério de conclusão

- Hoje/Amanhã, filtro com um único dia, agenda vazia, atualização da programação e no-fill testados visualmente e por testes automatizados.

## 11. Fase 5 — Motor e interface do carrossel compartilhado

### Modelo de entrega

- [ ] Criar uma entidade ou agrupamento de entrega do carrossel.
- [ ] Relacionar cada entrega individual ao grupo e à sua posição.
- [ ] Manter token próprio para cada peça.
- [ ] Registrar quantidade de peças, anunciantes e contexto da composição.
- [ ] Definir validade e reaproveitamento do grupo dentro da visita.

### Seleção de inventário

- [ ] Selecionar somente campanhas ativas, aprovadas, no período e com saldo.
- [ ] Aplicar alcance geral ou regional.
- [ ] Aplicar frequência e ritmo diário.
- [ ] Agrupar candidatos por conta anunciante.
- [ ] Limitar cada anunciante a três peças da mesma campanha/série.
- [ ] Priorizar variedade de anunciante e categoria comercial.
- [ ] Alternar a primeira marca entre visitas.
- [ ] Montar entre 2 e 21 peças.
- [ ] Aplicar o fallback aprovado quando não houver diversidade suficiente.

### Medição e cobrança

- [ ] Observar visibilidade por slide.
- [ ] Registrar impressão somente com 50% de visibilidade por pelo menos um segundo.
- [ ] Cobrar apenas a peça efetivamente vista.
- [ ] Manter impressão idempotente por token.
- [ ] Registrar clique no destino da peça correspondente.
- [ ] Confirmar que peças carregadas fora da tela não consomem saldo.

### Componente visual

- [ ] Implementar navegação manual, sem autoplay.
- [ ] Implementar swipe e encaixe no mobile.
- [ ] Implementar controles de teclado e botões no desktop.
- [ ] Usar indicador compacto `atual/total`.
- [ ] Mostrar indicação parcial da próxima peça no mobile.
- [ ] Exibir até duas peças conforme a largura disponível no desktop.
- [ ] Carregar a primeira imagem prioritariamente e as demais sob demanda.
- [ ] Respeitar redução de movimento.
- [ ] Validar texto alternativo e identificação ADS em todas as peças.

### Critério de conclusão

- Diversidade, limites, fallback, ordem estável, acessibilidade, lazy loading, impressão e cobrança por slide validados.

## 12. Fase 6 — Workspace do anunciante

### Escolha de posicionamento

- [ ] Exibir as três opções do Explorar separadamente.
- [ ] Informar local, dimensão, formato, CPM e modalidade.
- [ ] Exibir prévia mobile e desktop.
- [ ] Diferenciar atenção exclusiva e inventário compartilhado.
- [ ] Explicar que o carrossel final pode conter outras marcas.

### Série para carrossel

- [ ] Alterar o estado do formulário para aceitar uma lista de peças no slot de carrossel.
- [ ] Permitir adicionar, editar, ordenar e remover de uma a três peças.
- [ ] Manter imagem, título, CTA, destino e texto alternativo por peça.
- [ ] Validar o limite de três também no servidor.
- [ ] Permitir salvar rascunhos sem perder peças ao trocar de etapa.
- [ ] Enviar para revisão somente quando todos os requisitos obrigatórios estiverem completos.
- [ ] Reabrir apenas a peça editada quando uma série aprovada for alterada.

### Alcance e orçamento

- [ ] Tratar campanha sem cidade ou região como geral.
- [ ] Tratar campanha com cidade ou região como regional.
- [ ] Mostrar estimativa agregada de alcance elegível.
- [ ] Não revelar dados individuais da audiência.
- [ ] Aplicar 35, 25 ou 20 patacos/CPM conforme a posição.

### Campanhas existentes

- [ ] Não criar automaticamente novos criativos.
- [ ] Não alterar preço congelado.
- [ ] Não alterar aprovação ou status.
- [ ] Permitir adesão voluntária aos novos slots mediante novo criativo e revisão.

### Critério de conclusão

- Criação, rascunho, edição, upload múltiplo, orçamento, revisão e retorno para ajustes testados ponta a ponta.

## 13. Fase 7 — Administração e relatórios

### Revisão

- [ ] Adicionar filtros pelas novas posições.
- [ ] Identificar claramente o inventário compartilhado.
- [ ] Exibir todas as peças de uma série.
- [ ] Validar formato, tamanho, destino, categoria e texto alternativo.
- [ ] Mostrar contador de peças por anunciante.
- [ ] Manter aprovação individual por campanha e criativo.
- [ ] Não exigir aprovação manual de cada combinação dinâmica.

### Simulador

- [ ] Criar uma composição simulada com o inventário atualmente elegível.
- [ ] Identificar que a composição é uma previsão, não uma reserva definitiva.
- [ ] Alertar falta de diversidade ou audiência regional.
- [ ] Não gerar cobrança, impressão ou entrega real durante a simulação.

### Relatórios

- [ ] Separar resultados por slot, campanha, anunciante e peça.
- [ ] Medir carrosséis montados e visualizados.
- [ ] Medir impressão e clique por slide.
- [ ] Medir posição média da peça.
- [ ] Medir avanço e profundidade no carrossel.
- [ ] Medir participação do anunciante nas impressões válidas.
- [ ] Medir média de anunciantes por composição.
- [ ] Medir no-fill e fallback por falta de inventário.
- [ ] Separar alcance geral e regional.
- [ ] Medir aceite, recusa e revogação regional.

### Critério de conclusão

- Administração consegue revisar peças e simular o inventário; anunciante e operação conseguem reconciliar entrega e cobrança.

## 14. Fase 8 — Validação e lançamento gradual

### Flags independentes sugeridas

- [ ] `ADS_REGIONAL_ONBOARDING_ENABLED`.
- [ ] `ADS_EXPLORE_BETWEEN_DAYS_ENABLED`.
- [ ] `ADS_EXPLORE_SHARED_CAROUSEL_ENABLED`.
- [ ] Equivalentes do frontend quando necessários.

### Ordem de liberação

- [ ] Aplicar migração aditiva com flags desligadas.
- [ ] Liberar leitura do estado regional sem mostrar a tela.
- [ ] Liberar a decisão para contas internas.
- [ ] Liberar para novas contas.
- [ ] Liberar gradualmente para contas existentes sem decisão.
- [ ] Liberar o slot individual com campanhas internas.
- [ ] Liberar o carrossel em simulação administrativa.
- [ ] Liberar o carrossel com saldo de teste.
- [ ] Liberar comercialmente após reconciliação financeira.

### Validações obrigatórias

- [ ] Campanha geral para visitante anônimo.
- [ ] Campanha geral para pessoa autenticada sem consentimento.
- [ ] Campanha regional para pessoa com consentimento e cidade compatível.
- [ ] Ausência de campanha regional sem consentimento.
- [ ] Ausência de vazamento de cidade para anunciante.
- [ ] Campanhas com datas futuras e encerradas.
- [ ] Campanhas sem saldo e com frequência esgotada.
- [ ] Mistura de anunciantes e limite de três peças.
- [ ] Fallback com inventário insuficiente.
- [ ] Impressão, clique e cobrança idempotentes.
- [ ] Mobile, desktop, teclado e leitor de tela.
- [ ] Conexão lenta, offline e sessão degradada.
- [ ] Campanhas, criativos e sessões anteriores ao lançamento.

### Rollback

- [ ] Confirmar que cada novidade pode ser desligada isoladamente.
- [ ] Desligar primeiro a exibição, preservando dados e auditoria.
- [ ] Não tentar reverter destrutivamente o enum ou apagar entregas durante rollback operacional.
- [ ] Manter o destaque superior atual como fallback seguro.

### Critério de conclusão

- Smoke test de produção aprovado, métricas reconciliadas e procedimento de rollback testado.

## 15. Matriz de impacto em sessões e dados existentes

| Estado existente | Tratamento obrigatório |
|---|---|
| Sessão autenticada válida | Continuar válida; não rotacionar tokens por causa do consentimento |
| Sessão degradada ou offline | Não bloquear; servir apenas anúncios gerais |
| Consentimento regional positivo | Preservar e não perguntar novamente, salvo exigência jurídica |
| Consentimento regional negativo | Preservar como decisão válida; servir anúncios gerais |
| Nenhum registro de decisão | Mostrar a nova escolha uma vez em contexto seguro |
| Conta sem cidade | Permitir cadastrar cidade ou continuar com anúncios gerais |
| Visitante anônimo | Manter acesso público e publicidade geral |
| Identificador antigo de Ads | Preservar como identidade estável; não usar como visita infinita |
| Campanha ativa existente | Não alterar preço, slots, criativos, status ou aprovação |
| Campanha com `runInAllSlots` | Não incluir slots futuros automaticamente |
| Criativo existente | Não redimensionar nem migrar automaticamente |
| Fotografia de preço existente | Continuar sendo a fonte de cobrança da campanha atual |

## 16. Arquivos e áreas que devem ser revalidados

### Backend

- `backend/prisma/schema.prisma`
- `backend/src/config/adPlacements.js`
- `backend/src/config/privacyConsents.js`
- `backend/src/controllers/ads.controller.js`
- `backend/src/controllers/privacy.controller.js`
- `backend/src/routes/index.js`
- `backend/src/services/adPricing.service.js`
- `backend/src/services/privacyConsent.service.js`
- `backend/src/utils/adCreativeFormat.js`
- `backend/src/utils/adTargetingPolicy.js`

### Frontend

- `frontend/src/App.jsx`
- `frontend/src/pages/OnboardingPage.jsx`
- `frontend/src/pages/SignupPage.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/PrivacyCenterPage.jsx`
- `frontend/src/pages/ExplorePage.jsx`
- `frontend/src/pages/AdvertiserPortalPage.jsx`
- `frontend/src/components/ads/AdSlotCard.jsx`
- `frontend/src/components/ads/AdsPlacementMockup.jsx`
- `frontend/src/config/adsSlots.js`
- `frontend/src/services/events.service.js`
- `frontend/src/store/authStore.js`

### Testes existentes relacionados

- `backend/tests/ads.controller.test.js`
- `backend/tests/ads-targeting-workspace.test.js`
- `backend/tests/ads.placements.test.js`
- `backend/tests/ads.review-workflow.test.js`
- `backend/tests/privacy-governance-foundation.test.js`
- `backend/tests/explore-ad-placement-layout.test.js`
- `backend/tests/ads-campaign-review-preview.test.js`
- `backend/tests/ads-delivery-click-url.test.js`

## 17. Critérios globais de aceite

- [ ] Nenhum login existente é encerrado.
- [ ] Nenhuma campanha existente muda de preço ou posição automaticamente.
- [ ] Anúncios gerais alcançam visitantes anônimos e contas sem consentimento regional.
- [ ] A cidade-base nunca é usada sem decisão ativa favorável.
- [ ] A escolha regional pode ser alterada depois.
- [ ] O destaque superior e uma oportunidade entre dias podem coexistir.
- [ ] O intervalo entre dias exibe slot individual ou carrossel, nunca os dois juntos.
- [ ] O carrossel mistura anunciantes quando houver inventário suficiente.
- [ ] Nenhum anunciante contribui com mais de três peças por série.
- [ ] Apenas slides efetivamente vistos geram impressão e cobrança.
- [ ] A navegação mobile permanece acessível e sem autoplay.
- [ ] Todas as novidades podem ser desligadas de forma independente.
- [ ] Relatórios e carteira reconciliam exatamente as impressões cobradas.

## 18. Histórico de decisões e execução

### 23/08/2026 — Criação do plano

- Consolidado o onboarding regional, os dois slots entre dias, o inventário compartilhado, preços, administração, relatórios e lançamento gradual.
- Registrada a exigência de preservar sessões autenticadas, campanhas, criativos, preços e consentimentos existentes.
- Registrada a necessidade de separar identidade publicitária estável de sessão temporária de navegação.
- Nenhuma implementação de código foi iniciada por meio deste documento.

### 23/08/2026 — Primeira implementação sob flags

- Criados os slots `explore_between_days` (4:5, 25 patacos/CPM) e `explore_between_days_carousel` (4:3, 20 patacos/CPM), com migração aditiva ainda **não aplicada**.
- Atualizada a precificação para a versão `2026-08-v2`; campanhas existentes continuam usando sua fotografia de preço.
- Implementada a decisão regional autenticada, com histórico aditivo, auditoria, escolha de cidade-base, tratamento idempotente e redirecionamento seguro para sessões existentes.
- Separada a identidade estável de publicidade da sessão temporária de visita, com renovação após inatividade e composição do carrossel preservada durante a visita.
- Implementados o slot individual entre dias e o carrossel compartilhado condicional no Explorar. O carrossel exige pelo menos dois anunciantes e limita cada um a três peças.
- Atualizado o Workspace com as três posições, formatos, CPMs e bloqueio de uma quarta peça no carrossel.
- Validação executada: 55 testes direcionados de Ads aprovados; compilação de produção do frontend aprovada. A geração do cliente Prisma permanece pendente porque o processo local mantém o motor Prisma bloqueado.
- Não foram realizados commit, push, deploy ou aplicação de migração.

---

Ao finalizar cada fase, acrescentar aqui:

- Data.
- Fase concluída.
- Arquivos alterados.
- Migrações aplicadas.
- Testes executados e resultados.
- Evidência visual, quando aplicável.
- Decisões ou desvios em relação ao plano.
- Estado de commit, push e deploy.
