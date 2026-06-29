# 77GiraADS - Proposta executavel da Fase 1

Data: 2026-06-28  
Status: proposta; nenhuma migration criada ou executada  
Objetivo: fundacao de contas anunciantes sem alterar delivery, tracking ou campanhas legadas

## 1. Decisao arquitetural

A conta anunciante sera uma camada comercial de midia. Ela nao substitui nem concede automaticamente ownership operacional sobre casas, artistas ou eventos.

As regras atuais continuam soberanas:

- `ProducerVenueAccess` controla acesso do produtor a casa;
- `VenueManagerAccess` controla acesso do perfil casa;
- `ProducerArtistAccess` controla acesso do produtor ao artista;
- claims aprovados criam esses vinculos;
- `access.control.js` continua decidindo quem gerencia casas, artistas e eventos.

Nova regra independente:

```text
Membership na conta anunciante permite operar midia daquela conta.
Ownership/claim permite operar cadastro, agenda e entidade cultural.
Uma permissao nao implica automaticamente a outra.
```

Essa separacao evita que uma agencia ou analista de campanha possa editar uma casa, artista ou evento.

## 2. Escopo dividido para reduzir risco

### Fase 1A - Schema aditivo e testes

- criar enums e modelos de conta/membership;
- adicionar FK opcional em `AdCampaign`;
- manter `advertiser` textual obrigatorio;
- gerar migration aditiva;
- gerar Prisma Client;
- validar schema;
- criar testes das novas regras puras;
- nao executar backfill automaticamente.

Complexidade: M  
Risco: R2

### Fase 1B - Backfill controlado

- criar script idempotente;
- modo padrao `dry-run`;
- exigir `--apply` para escrita;
- agrupar campanhas pelo anunciante textual normalizado;
- criar contas `unclassified` em `draft`;
- vincular campanhas;
- nao criar memberships automaticamente;
- emitir relatorio antes/depois.

Complexidade: M  
Risco: R2

### Fase 1C - API administrativa

- listar contas;
- consultar conta;
- criar/editar conta;
- listar e administrar memberships;
- vincular/desvincular campanha;
- manter tudo restrito ao admin inicialmente;
- nenhuma alteracao no delivery.

Complexidade: M/L  
Risco: R2

### Fase 1D - UI administrativa por flag

- secao de contas anunciantes no Admin Ads;
- inicialmente somente leitura;
- depois criacao/edicao/membros;
- flag desligada por default;
- nenhuma mudanca para usuario publico.

Complexidade: M  
Risco: R1/R2

## 3. Schema Prisma proposto

### 3.1 Enums

```prisma
enum AdvertiserAccountType {
  unclassified
  venue
  producer
  artist
  brand
  agency
  group
  internal
}

enum AdvertiserAccountStatus {
  draft
  pending_review
  active
  suspended
  rejected
  archived
}

enum AdvertiserMembershipRole {
  owner
  admin
  campaign_manager
  analyst
  billing_manager
  viewer
}

enum AdvertiserMembershipStatus {
  invited
  active
  suspended
  revoked
}
```

`unclassified` e necessario para backfill honesto. O sistema nao deve fingir saber se um texto legado representa casa, marca, produtor ou outro tipo.

### 3.2 `AdvertiserAccount`

```prisma
model AdvertiserAccount {
  id              String                  @id @default(uuid())
  name            String
  type            AdvertiserAccountType   @default(unclassified)
  status          AdvertiserAccountStatus @default(draft)
  source          String                  @default("manual")
  legacyKey       String?                 @unique
  legalName       String?
  documentNumber  String?
  contactEmail    String?
  contactPhone    String?
  notes           String?
  createdByUserId String?
  approvedByUserId String?
  approvedAt      DateTime?

  createdBy User? @relation("AdvertiserAccountCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  approvedBy User? @relation("AdvertiserAccountApprovedBy", fields: [approvedByUserId], references: [id], onDelete: SetNull)
  memberships AdvertiserMembership[]
  campaigns  AdCampaign[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status, type])
  @@index([name])
}
```

Observacoes:

- `legacyKey` torna o backfill idempotente sem obrigar unicidade do nome comercial;
- `documentNumber` deve ser opcional e protegido; nao deve aparecer em payload publico;
- `source` inicialmente aceita `manual` e `legacy_backfill` como strings, sem criar enum prematuro;
- aprovacao permanece opcional na fundacao.

### 3.3 `AdvertiserMembership`

```prisma
model AdvertiserMembership {
  id            String                       @id @default(uuid())
  accountId     String
  userId        String
  role          AdvertiserMembershipRole     @default(viewer)
  status        AdvertiserMembershipStatus   @default(invited)
  invitedByUserId String?
  acceptedAt    DateTime?

  account   AdvertiserAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  user      User              @relation("AdvertiserMembershipUser", fields: [userId], references: [id], onDelete: Cascade)
  invitedBy User?             @relation("AdvertiserMembershipInvitedBy", fields: [invitedByUserId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([accountId, userId])
  @@index([userId, status])
  @@index([accountId, status])
}
```

### 3.4 Relacoes em `User`

```prisma
advertiserAccountsCreated  AdvertiserAccount[]    @relation("AdvertiserAccountCreatedBy")
advertiserAccountsApproved AdvertiserAccount[]    @relation("AdvertiserAccountApprovedBy")
advertiserMemberships      AdvertiserMembership[] @relation("AdvertiserMembershipUser")
advertiserMembershipInvites AdvertiserMembership[] @relation("AdvertiserMembershipInvitedBy")
```

### 3.5 Campo opcional em `AdCampaign`

```prisma
advertiserAccountId String?
advertiserAccount AdvertiserAccount? @relation(fields: [advertiserAccountId], references: [id], onDelete: SetNull)

@@index([advertiserAccountId, status])
```

O campo legado abaixo permanece obrigatorio nesta fase:

```prisma
advertiser String
```

## 4. O que nao entra na Fase 1

- nenhum `AdvertiserAccountLink` para casa/artista/produtor;
- nenhuma inferencia automatica de ownership;
- nenhum `AdSet`;
- nenhuma carteira ou Pataco;
- nenhum billing;
- nenhum portal externo;
- nenhuma mudanca de slot;
- nenhuma mudanca de criativo;
- nenhuma mudanca de delivery;
- nenhuma mudanca de tracking;
- nenhuma publicidade no `To na Pista`;
- nenhum campo novo obrigatorio em campanha;
- nenhuma remocao ou rename.

Vinculos entre conta anunciante e entidade cultural devem ser desenhados depois, com FKs explicitas e sem relacao polimorfica sem integridade.

## 5. Migration proposta

A migration deve conter somente:

1. criacao dos quatro enums;
2. criacao de `AdvertiserAccount`;
3. criacao de `AdvertiserMembership`;
4. adicao nullable de `advertiserAccountId` em `AdCampaign`;
5. indices;
6. foreign keys com `SET NULL` ou `CASCADE` conforme schema.

Nao deve conter:

- UPDATE de dados;
- DELETE;
- DROP;
- rename;
- alteracao do campo `advertiser`;
- constraint NOT NULL no novo FK;
- criacao automatica de conta/membership.

Comandos locais previstos, somente depois de autorizacao:

```powershell
cd "C:\Users\edils\OneDrive\Documentos\New project\backend"
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name ads-advertiser-foundation
npm.cmd test
```

Em producao, apenas:

```text
npm run prisma:migrate:deploy
```

Nunca responder `y` a pedido inesperado de reset. Se o Prisma pedir reset, interromper e diagnosticar drift.

## 6. Backfill idempotente proposto

Arquivo futuro sugerido:

```text
backend/prisma/backfill-advertiser-accounts.js
```

### 6.1 Comportamento default

Sem argumentos, o script apenas le e relata:

- campanhas totais;
- campanhas sem conta;
- anunciantes textuais distintos;
- grupos normalizados;
- contas que seriam criadas;
- campanhas que seriam vinculadas;
- conflitos.

Nenhuma escrita sem `--apply`.

### 6.2 Normalizacao

Para agrupamento somente:

- trim;
- lowercase;
- Unicode NFD;
- remocao de diacriticos;
- colapso de espacos;
- preservacao do texto original mais recente como nome de exibicao.

`legacyKey`:

```text
legacy:<sha256 do nome normalizado>
```

### 6.3 Escrita com `--apply`

Para cada grupo:

1. buscar conta por `legacyKey`;
2. criar somente se nao existir;
3. usar `type=unclassified`;
4. usar `status=draft`;
5. usar `source=legacy_backfill`;
6. preencher `notes` com aviso de classificacao pendente;
7. atualizar apenas campanhas com `advertiserAccountId=null`;
8. nao criar membership;
9. executar em transacao por grupo;
10. emitir resumo final.

Rodar duas vezes deve resultar em zero novas contas e zero novos vinculos na segunda execucao.

## 7. Rollback

Rollback principal e logico, nao destrutivo:

1. manter UI nova desligada;
2. delivery ignora `advertiserAccountId`;
3. endpoints novos podem ser desabilitados;
4. campanhas continuam lendo `advertiser` textual;
5. contas e memberships podem permanecer sem uso.

Rollback do backfill, por script separado:

1. localizar contas com `source=legacy_backfill`;
2. definir `advertiserAccountId=null` apenas nas campanhas ligadas a elas;
3. remover somente contas sem memberships e sem outras referencias;
4. exigir `--apply`;
5. dry-run por default.

Nao fazer rollback por DROP de tabelas em producao.

## 8. Feature flags propostas

Backend:

```text
ADS_ADVERTISER_ACCOUNTS_ENABLED=false
```

Frontend:

```text
VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED=false
```

Regras:

- ausente equivale a `false`;
- schema e FK podem existir com flag desligada;
- delivery nunca depende da flag nesta fase;
- flag frontend controla apenas exibicao da secao nova;
- flag backend controla apenas endpoints novos;
- admin atual permanece intacto.

## 9. API administrativa proposta

Inicialmente, todas as rotas usam `requireAuth` + `admin`.

```text
GET    /api/ads/advertiser-accounts
GET    /api/ads/advertiser-accounts/:id
POST   /api/ads/advertiser-accounts
PATCH  /api/ads/advertiser-accounts/:id
GET    /api/ads/advertiser-accounts/:id/memberships
POST   /api/ads/advertiser-accounts/:id/memberships
PATCH  /api/ads/advertiser-memberships/:id
DELETE /api/ads/advertiser-memberships/:id
PATCH  /api/ads/campaigns/:id/advertiser-account
```

`DELETE` de membership deve revogar/remover membership, nunca usuario.

Nao criar endpoint de exclusao fisica da conta nesta fase. Usar status `archived`.

## 10. Regras de RBAC

### Fundacao

- somente admin cria/edita conta;
- somente admin administra membership;
- membership nao concede acesso a endpoints existentes enquanto a flag estiver desligada;
- nenhuma permissao de casa/artista/evento muda.

### Futuro, fora desta fase

Permissoes por membership:

- `owner`: controle da conta, exceto poderes globais;
- `admin`: membros e campanhas;
- `campaign_manager`: campanhas/criativos;
- `analyst`: relatorios;
- `billing_manager`: financeiro futuro;
- `viewer`: leitura.

## 11. Testes exigidos

### Schema/migration

- Prisma validate;
- Prisma generate;
- migration em banco local sem reset;
- colunas legadas preservadas;
- campanhas existentes permanecem legiveis;
- FK opcional aceita null.

### Backfill

- dry-run nao escreve;
- `--apply` cria uma conta por `legacyKey`;
- segunda execucao nao duplica;
- campanhas ja vinculadas nao mudam;
- nomes vazios geram conflito e nao conta;
- nenhum membership e criado.

### API/RBAC

- attendee, producer e venue_manager recebem 403 inicialmente;
- admin lista/cria/edita;
- email e telefone validados;
- document number nunca aparece em endpoint publico;
- membership duplicada retorna 409;
- usuario inexistente retorna 404;
- arquivamento nao apaga campanha;
- vinculo de campanha nao altera `advertiser` textual.

### Regressao

- 31 testes atuais continuam passando;
- delivery legado nao muda;
- tracking legado nao muda;
- relatorios continuam funcionando;
- frontend build passa;
- Admin Ads atual funciona com flags desligadas.

## 12. Matriz Vai Dar Problema

| Risco | Consequencia | Prevencao | Rollback |
|---|---|---|---|
| Conta duplicada por grafia | relatorios fragmentados | `legacyKey` idempotente | mesclar manualmente depois |
| Tipo inferido incorretamente | permissao/comercial errado | `unclassified` | editar classificacao |
| Membership concede ownership | vazamento operacional | separar RBAC comercial do ownership | flag off |
| FK obrigatoria cedo | campanhas legadas quebram | FK nullable | ignorar campo novo |
| Backfill roda no deploy | escrita inesperada | script separado, dry-run default | script logico reverso |
| API vaza contas | dados entre anunciantes | admin-only inicial + testes | flag backend off |
| Delivery passa a depender da conta | no-fill/regressao | nao tocar delivery | campo novo ignorado |
| Migration pede reset | perda de dados | interromper imediatamente | nenhuma execucao |
| Documento/CPF exposto | risco LGPD | payload admin e minimizacao | remover resposta/campo se necessario |

## 13. Criterios de aceite da Fase 1

1. Migration aditiva sem reset.
2. Campanhas legadas continuam funcionando sem conta.
3. `advertiser` textual permanece.
4. Backfill dry-run e idempotente.
5. Flags desligadas por default.
6. Endpoints novos admin-only.
7. Nenhuma mudanca no delivery/tracking.
8. Testes backend passam.
9. Build frontend passa.
10. Smoke local do Admin Ads atual passa.
11. `git status` contem apenas arquivos esperados.
12. Rollback logico documentado.

## 14. Ponto de parada

Esta proposta nao autoriza migration automaticamente.

Antes da implementacao da Fase 1A, revisar e aprovar:

- enums;
- campos de conta;
- papéis de membership;
- uso de `unclassified`;
- ausencia de vinculo automatico com casa/artista/produtor;
- estrategia de flag;
- migration nullable.

