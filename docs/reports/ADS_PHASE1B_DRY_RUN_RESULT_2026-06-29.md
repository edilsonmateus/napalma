# 77GiraADS - Resultado da Fase 1B (dry-run)

Data: 2026-06-29

## Objetivo

Preparar o mapeamento auditavel de campanhas legadas para contas anunciantes sem oferecer qualquer operacao de escrita no banco.

## Implementado

- Normalizacao deterministica para agrupamento: trim, lowercase, remocao de diacriticos e colapso de espacos.
- `legacyKey` deterministica com SHA-256 do nome normalizado.
- Preservacao da grafia original mais recente como nome de exibicao proposto.
- Plano de criacao ou reutilizacao de conta por grupo.
- Lista explicita das campanhas que seriam vinculadas.
- Deteccao de nome vazio, conta ausente, vinculo divergente e chave legada duplicada.
- Saida JSON auditavel.
- Comando dedicado `prisma:backfill:advertisers:dry-run`.

## Travas de seguranca

- O script nao aceita argumentos.
- Nao existe opcao `--apply`.
- Nao existem chamadas Prisma de create, update, upsert ou delete.
- Nao existe transacao de escrita.
- O teste automatizado inspeciona o codigo-fonte do script para preservar essas garantias.
- Nenhum membership e inferido ou proposto automaticamente.
- Nenhum tipo de anunciante e inferido; criacoes futuras permanecem `unclassified` e `draft`.

## Resultado local

O banco local continha zero campanhas e zero contas anunciantes:

```text
campaignsRead: 0
accountsRead: 0
normalizedGroups: 0
accountsToCreate: 0
campaignsToLink: 0
conflicts: 0
```

Esse resultado valida o caminho vazio, mas nao representa validacao com dados comerciais reais.

## Validacoes

- Backend: 7 arquivos e 40 testes aprovados.
- Frontend: build Vite de producao aprovado.
- Dry-run local: aprovado.
- Nenhuma escrita no banco executada.

## Ponto de parada

Ainda nao deve ser criado um modo de escrita. O proximo passo seguro e executar o mesmo dry-run contra uma base que contenha campanhas reais ou uma copia sanitizada, revisar manualmente cada grupo e somente entao desenhar um script separado de aplicacao idempotente.
