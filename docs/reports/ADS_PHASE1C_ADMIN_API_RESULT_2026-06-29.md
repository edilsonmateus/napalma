# 77GiraADS - Resultado da Fase 1C (API administrativa)

Data: 2026-06-29

## Objetivo

Disponibilizar a fundacao administrativa de contas anunciantes sem alterar delivery, tracking, campanhas legadas ou interface publica.

## Feature flag

```text
ADS_ADVERTISER_ACCOUNTS_ENABLED=false
```

- Ausente ou diferente de `true`: endpoints respondem 404.
- Mesmo com a flag ativa: somente usuario autenticado com papel `admin` passa.
- A flag nao interfere nas rotas legadas de Ads.

## Endpoints adicionados

```text
GET    /api/ads/advertiser-accounts
GET    /api/ads/advertiser-accounts/:id
POST   /api/ads/advertiser-accounts
PATCH  /api/ads/advertiser-accounts/:id
GET    /api/ads/advertiser-accounts/:accountId/memberships
POST   /api/ads/advertiser-accounts/:accountId/memberships
PATCH  /api/ads/advertiser-memberships/:id
DELETE /api/ads/advertiser-memberships/:id
PATCH  /api/ads/campaigns/:id/advertiser-account
```

## Regras implementadas

- Conta criada manualmente recebe `source=manual`.
- Ativacao registra admin aprovador e data.
- Lista geral nao devolve `documentNumber`.
- Detalhe sensivel existe apenas atras de auth, admin e flag.
- Membership duplicada retorna conflito.
- Usuario inexistente nao pode virar membro.
- `DELETE` de membership apenas altera status para `revoked`.
- Nenhum endpoint exclui conta anunciante.
- Conta arquivada nao pode receber campanha.
- Vincular ou desvincular conta altera somente `advertiserAccountId`.
- O campo textual legado `advertiser` permanece intacto.

## Validacoes

- Prisma Client gerado.
- Prisma schema valido.
- Backend: 8 arquivos e 56 testes aprovados.
- Frontend: build Vite de producao aprovado.
- Rotas antigas de Ads continuam cobertas pelos testes de caracterizacao.

## Estado de deploy

- Nenhum deploy realizado.
- Nenhuma flag ativada.
- Nenhuma alteracao aplicada no banco de producao.
- Nenhuma UI adicionada.

## Proximo passo seguro

Fase 1D: interface administrativa inicialmente somente leitura, protegida por `VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED=false` e dependente da flag correspondente no backend. A primeira entrega deve listar contas e abrir detalhes; criacao, edicao e memberships entram somente depois do smoke dessa leitura.
