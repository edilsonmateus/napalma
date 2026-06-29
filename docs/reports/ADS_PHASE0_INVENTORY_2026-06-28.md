# 77GiraADS - Fase 0: inventario e contratos atuais

Data: 2026-06-28  
Escopo: somente inspecao e documentacao  
Risco desta fase: R0  
Resultado: nenhum schema, endpoint ou comportamento de runtime alterado

## 1. Resumo executivo

O 77Gira ja possui um modulo funcional de publicidade. O caminho seguro e evoluir esse nucleo, sem criar um sistema paralelo.

O modulo atual oferece:

- campanhas;
- criativos;
- tres slots;
- entrega publica;
- tracking de impressoes e cliques;
- frequency cap diario para usuario autenticado;
- relatorios globais e por casa;
- interface administrativa;
- exportacao CSV;
- simulacao de entrega;
- integracao no Explorar, detalhe da casa e Meu Radar.

A Fase 1 pode introduzir contas anunciantes de maneira aditiva, mas somente depois de aprovar uma migration pequena, campos opcionais, backfill idempotente e testes de autorizacao.

## 2. Estado do repositorio no inicio

`git status --short` apresentou apenas:

```text
?? docs/CHATGPT_REPLANEJAMENTO_77GIRA_ADS.md
```

Esse arquivo foi criado como briefing interno na rodada anterior. Ele nao altera runtime e nao foi adicionado ao Git nesta fase. O documento conceitual externo do 77GiraADS nao foi copiado para o repositorio.

## 3. Backend encontrado

### 3.1 Schema e enums

Arquivo: `backend/prisma/schema.prisma`

Enums existentes:

```text
AdCampaignStatus: draft, active, paused, ended
AdSlot: explore_feed_large, venue_detail_inline, radar_header
AdEventType: impression, click
```

Modelos existentes:

### `AdCampaign`

- `id`;
- `advertiser` textual e obrigatorio;
- `name`;
- `status`;
- `startsAt` e `endsAt` opcionais;
- `priority`, de 1 a 10 na validacao HTTP;
- `frequencyCapDaily`, com default 3;
- `runInAllSlots`;
- `isEnabled`;
- `targeting` JSON opcional;
- `createdByUserId` opcional;
- relacoes com criativos e eventos;
- timestamps.

### `AdCreative`

- `campaignId`;
- `slot`;
- `title`;
- `imageUrl` obrigatoria;
- `destinationUrl`;
- `altText`;
- `width` e `height`;
- `isEnabled`;
- timestamps.

### `AdEventLog`

- `type`;
- `slot`;
- `campaignId`;
- `creativeId`;
- `venueId` opcional;
- `userId` opcional;
- `sessionId` opcional;
- `userAgent` opcional;
- `ipHash` opcional;
- `createdAt`.

Indices atuais cobrem campanha, criativo, usuario e casa por tipo/data.

### 3.2 Migrations de Ads localizadas

- `20260515135420_ads_tracking_cap`;
- `20260516181518_ads_venue_summary_scope`.

A primeira cria enums, campanhas, criativos, logs, indices e relacionamentos. A segunda adiciona `venueId` ao log e seu indice.

Nenhuma migration foi criada, executada ou modificada nesta fase.

### 3.3 Rotas e autorizacao

Arquivo: `backend/src/routes/index.js`

Rotas publicas/operacionais:

```text
GET  /api/ads/slots/:slot/delivery
POST /api/ads/track/impression
POST /api/ads/track/click
```

Rotas administrativas, restritas a `admin`:

```text
GET   /api/ads/report
GET   /api/ads/activity
GET   /api/ads/campaigns
POST  /api/ads/campaigns
PATCH /api/ads/campaigns/:id
POST  /api/ads/campaigns/:campaignId/creatives
PATCH /api/ads/creatives/:id
```

Resumo por casa:

```text
GET /api/ads/venue-summary
```

Permitido para `admin` e `venue_manager`, com escopo calculado no controller.

O tracking usa rate limit dedicado de 120 requisicoes por minuto por chave do limiter, alem do limiter global da API.

### 3.4 Delivery atual

Arquivo: `backend/src/controllers/ads.controller.js`

Fluxo observado:

1. valida o slot pelo enum Prisma;
2. consulta campanhas habilitadas e com status `active`;
3. filtra pela janela de inicio/fim;
4. inclui criativos habilitados do slot solicitado ou `explore_feed_large` como fallback;
5. respeita `runInAllSlots`;
6. para usuario autenticado, conta impressoes do dia e aplica `frequencyCapDaily`;
7. escolhe aleatoriamente um candidato da lista filtrada;
8. devolve `{ item: null }` quando nao ha entrega;
9. devolve `{ item: { campaignId, campaignName, slot, creativeId, imageUrl, destinationUrl, altText, title } }` quando ha entrega.

Observacao: apesar da consulta ordenar campanhas por prioridade, a escolha final e aleatoria entre todos os elegiveis. Portanto, prioridade nao representa peso deterministico no motor atual.

### 3.5 Tracking atual

Impressao e clique criam linhas independentes em `AdEventLog`.

O tracking guarda:

- campanha;
- criativo;
- slot;
- casa, quando enviada pelo frontend;
- usuario, quando autenticado;
- sessao;
- user agent.

O campo `ipHash` existe no banco, mas nao e preenchido pelo controller atual.

Nao foi encontrada deduplicacao por impressao, clique, sessao ou delivery. Nao existem `requestId`, `deliveryId`, `dedupeKey` ou motivo de no-fill.

### 3.6 Relatorios atuais

Relatorio administrativo global:

- impressoes e cliques por campanha;
- CTR por campanha;
- impressoes e cliques por slot;
- CTR por slot;
- serie diaria;
- resumo por periodo de 1 a 90 dias.

Atividade:

- lista dos logs recentes;
- campanha;
- anunciante;
- criativo;
- slot;
- tipo;
- data.

Resumo por casa:

- escopo por casa administrada;
- resumo de impressoes, cliques e CTR;
- slots;
- serie diaria;
- dez campanhas principais.

### 3.7 Upload e storage

Arquivos:

- `backend/src/middlewares/upload.js`;
- `backend/src/controllers/uploads.controller.js`;
- `backend/src/app.js`.

O upload atual:

- usa Multer em memoria;
- limita arquivo a 5 MB;
- aceita JPEG, PNG e WebP;
- grava em `backend/uploads`;
- serve arquivos em `/uploads` pelo Express;
- aceita perfis `admin`, `producer` e `venue_manager`;
- limita a 20 uploads por minuto.

A whitelist de pastas contem `venues`, `artists` e `events`. Ads nao possui pasta propria. O Admin Ads atual recebe URL de imagem em texto e nao usa diretamente esse upload.

Risco: filesystem do Render nao e armazenamento persistente adequado para criativos comerciais.

## 4. Frontend encontrado

### 4.1 Rota administrativa

Arquivo: `frontend/src/App.jsx`

```text
/settings/ads
```

Protegida no frontend para papel `admin`. O backend repete a protecao, que e a barreira efetiva.

### 4.2 Pagina Admin Ads

Arquivo: `frontend/src/pages/AdsAdminPage.jsx`

Secoes encontradas:

- Visao Geral;
- Campanhas;
- Criativos por Slot;
- Saude e Alertas;
- Atividade;
- Relatorios.

Capacidades encontradas:

- criar campanha;
- duplicar campanha;
- pausar campanhas expiradas;
- alterar status individual e em lote;
- habilitar/desabilitar campanha;
- criar criativo;
- habilitar/desabilitar criativo;
- validar aproximadamente a proporcao do criativo;
- buscar e filtrar campanhas;
- visualizar cobertura por slot;
- simular delivery;
- visualizar graficos;
- exportar relatorio CSV.

### 4.3 Servicos e React Query

Arquivos:

- `frontend/src/services/events.service.js`;
- `frontend/src/hooks/useEventsQuery.js`.

Contratos de API atuais sao encapsulados em funcoes para campanhas, criativos, delivery, relatorios, atividade e resumo por casa.

As chaves principais incluem:

- `ad-campaigns`;
- `ad-delivery` + slot;
- `ads-report` + periodo;
- `ads-activity` + limite.

O `QueryClient` usa configuracao padrao. A query de delivery nao define explicitamente `staleTime`, `refetchInterval` ou politica propria de reentrega.

### 4.4 Componente de exibicao

Arquivo: `frontend/src/components/ads/AdSlotCard.jsx`

Responsabilidades:

- cria/persiste uma sessao em `localStorage`;
- registra impressao em `useEffect`;
- registra clique;
- acrescenta UTM ao destino;
- abre destino em nova aba;
- exibe rotulo `Patrocinado`;
- ainda contem suporte residual a placeholder, embora as paginas atuais nao gerem placeholder.

UTMs atuais:

```text
utm_source=napalma
utm_medium=app
utm_campaign=<nome ou id>
utm_content=<slot>
```

### 4.5 Pontos de contato atuais

#### Explorar

- solicita `explore_feed_large`;
- renderiza o anuncio antes da barra-resumo e do feed.

#### Detalhe da casa

- solicita `venue_detail_inline`;
- so insere anuncio quando ha pelo menos tres eventos;
- insere apos o segundo evento;
- envia `venueId` ao tracking.

#### Meu Radar

- solicita `radar_header` somente para usuario autenticado;
- renderiza antes dos cards do Radar.

## 5. Contratos que nao podem quebrar

1. Os valores atuais de `AdSlot`.
2. Os valores atuais de `AdCampaignStatus`.
3. Os valores atuais de `AdEventType`.
4. As tres URLs publicas de delivery/tracking.
5. O envelope `{ item }` do delivery.
6. O envelope `{ items }` da lista de campanhas.
7. Os campos atuais de campanha e criativo consumidos pelo frontend.
8. O payload de tracking com `campaignId`, `creativeId`, `slot`, `sessionId` e `venueId` opcional.
9. A rota `/settings/ads`.
10. O acesso administrativo global.
11. O resumo por casa e seu escopo.
12. Os tres slots ja implantados nas paginas.
13. A leitura das campanhas legadas sem conta anunciante ou Ad Set.

## 6. Dividas tecnicas e riscos encontrados

### Prioridade alta antes de escala comercial

1. **Storage efemero**: arquivos locais podem desaparecer em deploy/reinicio.
2. **Ausencia de testes de Ads**: nao ha teste especifico localizado para schema, delivery, tracking, relatorios ou RBAC do modulo.
3. **Tracking sem deduplicacao**: remounts e repeticoes podem inflar metricas.
4. **Sem delivery ID**: clique e impressao nao sao associados a uma mesma decisao.
5. **Frequency cap anonimo inexistente**: o limite e aplicado apenas quando `req.user` existe.
6. **Targeting armazenado, mas nao aplicado**: o JSON existe na campanha, sem uso no delivery observado.
7. **Prioridade nao governa selecao final**: elegiveis sao sorteados uniformemente.
8. **Sem auditoria/revisao**: alteracoes e aprovacoes nao possuem trilha dedicada.

### Prioridade media

9. `ipHash` nao e preenchido.
10. Nao ha registro de no-fill.
11. Nao ha conta anunciante nem isolamento por anunciante.
12. Nao ha validacao de dominio/allowlist para URL de destino.
13. A validacao de proporcao existe apenas na UI e aceita tolerancia, sem enforcement backend.
14. O upload generico nao inclui pasta Ads.
15. O arquivo `.env.example` do frontend documenta `VITE_API_BASE_URL`, enquanto o codigo le `VITE_API_URL`.

### Bugs/riscos de frontend a tratar em rodada propria

16. `AdSlotCard` retorna antes de chamar `useEffect` quando `ad` e nulo. Se a mesma instancia alternar entre nulo e objeto, isso pode violar a ordem de hooks.
17. A impressao e enviada por montagem do componente, sem `IntersectionObserver`; portanto pode contar anuncio que entrou no DOM sem visibilidade real.
18. O identificador local ainda usa a chave legada `napalma:ad-session`.
19. Existem textos com encoding corrompido em arquivos relacionados a Ads. A correcao deve ser pontual e separada, nunca uma substituicao massiva.

## 7. Feature flags

Nao foi localizado um sistema geral de feature flags para o modulo Ads. Existem configuracoes por variavel de ambiente para outras capacidades, mas nao um padrao consolidado que justifique criar uma flag nesta Fase 0.

Decisao: nenhuma flag foi adicionada.

Recomendacao para a Fase 1:

- definir primeiro se flags serao backend, frontend ou ambas;
- usar nomes ASCII e documentados;
- manter qualquer fluxo novo desligado por default;
- nao usar flag para esconder migration obrigatoria;
- prever leitura segura quando a variavel estiver ausente.

## 8. Cobertura de testes encontrada e adicionada

Testes backend existentes:

- RBAC;
- ownership;
- `ToNaPista`.

No inicio da Fase 0, nao foram encontrados testes especificos para Ads.

Como passo seguro anterior a Fase 1, foi adicionada uma camada minima de testes de caracterizacao para:

- rotas publicas e administrativas existentes;
- no-fill;
- payload publico do delivery;
- frequency cap autenticado;
- tracking de impression/click;
- rejeicao de payload de tracking invalido;
- envelope e campos da listagem de campanhas;
- RBAC do Admin Ads;
- acesso ao resumo por casa.

Arquivos adicionados:

- `backend/tests/ads.controller.test.js`;
- `backend/tests/ads.routes.test.js`.

Resultado apos a inclusao:

```text
5 arquivos de teste aprovados
31 testes aprovados
```

Ainda faltam testes de caracterizacao para janela de campanha, criativo desabilitado, relatorio global e escopo detalhado do resumo por casa. Eles podem entrar antes ou junto da preparacao da Fase 1, sem migration.

## 9. Proposta da Fase 1, ainda nao autorizada

### Objetivo

Criar a fundacao de conta anunciante sem mudar delivery, tracking ou interface publica.

### Mudancas candidatas

1. `AdvertiserAccount` aditiva.
2. `AdvertiserMembership` aditiva.
3. `advertiserAccountId` opcional em `AdCampaign`.
4. Manter `advertiser` textual obrigatorio durante a transicao.
5. Backfill idempotente separado.
6. Endpoints administrativos inicialmente somente leitura/criacao controlada.
7. Nenhuma mudanca no motor de entrega.
8. Nenhuma mudanca em criativos.
9. Nenhuma mudanca no portal publico.

### Riscos previstos

- duplicar contas por variacoes de nome;
- vincular campanha ao anunciante incorreto;
- abrir escopo de dados entre contas;
- introduzir membership sem testes de RBAC;
- tornar FK obrigatoria cedo demais;
- misturar conta comercial com entidade casa/artista/produtor.

### Pre-condicoes

- aprovar modelo de tipos e status;
- aprovar regra de vinculo com casas/artistas/produtores;
- criar testes de caracterizacao do legado;
- revisar migration antes de executar;
- definir feature flag;
- definir rollback logico;
- confirmar que nenhum campo legado sera removido.

## 10. Comandos de inspecao executados

Foram utilizados apenas comandos de leitura:

- `git status --short`;
- listagem da raiz;
- `rg --files`;
- buscas `rg` por entidades, rotas, slots, tracking, upload, flags e testes;
- leitura seletiva de schema, migrations, controllers, rotas, componentes, services, hooks, app, packages e exemplos de ambiente.

Validacoes executadas ao final:

```text
Backend: npm.cmd test
Resultado final: 5 arquivos aprovados, 31 testes aprovados.

Frontend: npm.cmd run build
Resultado: build Vite de producao concluido, 2553 modulos transformados.
```

Os testes aprovados cobrem ownership, RBAC, ToNaPista e os contratos basicos de Ads descritos na secao 8.

Nao foram executados:

- migration;
- seed;
- reset;
- Prisma generate;
- escrita no banco;
- deploy;
- commit;
- push.

## 11. Ponto de parada

Fase 0 concluida no nivel de inventario.

Nao iniciar Fase 1 sem autorizacao humana explicita e sem apresentar antes:

- schema proposto;
- migration proposta;
- estrategia de backfill;
- testes de caracterizacao;
- feature flag;
- impacto por perfil;
- rollback.
