# 77GiraADS - Resultado da Fase 1D (UI somente leitura)

Data: 2026-06-29

## Objetivo

Adicionar ao Admin Ads uma primeira visualizacao de contas anunciantes sem liberar qualquer mutacao pela interface.

## Feature flag frontend

```text
VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED=false
```

- Ausente ou diferente de `true`: item de menu e conteudo nao sao exibidos.
- Ativa: exibe a secao `Anunciantes`.
- A API ainda exige `ADS_ADVERTISER_ACCOUNTS_ENABLED=true`, autenticacao e papel `admin`.

## Interface implementada

- Item opcional `Anunciantes` no menu lateral do Admin Ads.
- Lista compacta de contas.
- Busca local por nome, razao social ou e-mail.
- Tipo, status e contagem de campanhas/membros.
- Detalhe selecionado com contato, origem, campanhas e memberships.
- Estados de carregamento, erro e base vazia.
- Layout em duas colunas no desktop e empilhado no mobile.

## Travas de seguranca

- Service dedicado possui apenas requisicoes GET.
- Nenhum botao de criar, editar, arquivar, vincular ou revogar.
- Documento fiscal nao e renderizado pela UI.
- Campanhas legadas continuam funcionando quando nao ha contas.
- As secoes existentes do Admin Ads permanecem inalteradas.

## Validacoes

- Backend: 9 arquivos e 59 testes aprovados.
- Contrato estrutural confirma flag desligada e service sem mutacoes.
- Build frontend com flag desligada: aprovado.
- Build frontend com flag ligada temporariamente: aprovado.

## Estado de deploy

- Nenhum deploy realizado.
- Nenhuma flag ativada permanentemente.
- Nenhuma conta criada ou modificada.

## Proximo passo seguro

Antes de liberar escrita pela UI, fazer smoke visual local com as duas flags ligadas e dados controlados. Depois, separar em entregas pequenas: criacao/edicao de conta; memberships; vinculo de campanha. Cada bloco deve ter autorizacao e testes proprios.
