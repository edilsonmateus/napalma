# UI/UX + Operacao Audit - Rodada 1

Data: 2026-05-24
Escopo desta rodada: riscos altos (dados, permissao, comportamento em producao)

## Resumo executivo
- Encontrados 2 riscos altos (alta prioridade de correcao antes de go-live)
- Encontrados 2 riscos medios (recomendado corrigir ainda nesta fase)
- Fluxo de revisao antes de publicar evento: implementado e compilando

## Achados priorizados

### [ALTA] Exposicao de rascunhos via endpoint publico de eventos
- Severidade: Alta
- Arquivo: backend/src/controllers/events.controller.js
- Evidencia:
  - Query aceita `includeDrafts=true`
  - Rota `GET /api/events` e publica (sem auth obrigatorio)
- Risco:
  - Usuario anonimo pode tentar listar eventos em rascunho
  - Pode vazar conteudo incompleto, interno ou sensivel
- Recomendacao:
  - Ignorar `includeDrafts` para requests anonimas
  - Permitir drafts apenas para roles autenticadas (`admin`, `producer`, `venue_manager`) e com escopo correto

### [ALTA] Fallback para mock em erro de API no frontend
- Severidade: Alta
- Arquivo: frontend/src/services/events.service.js
- Evidencia:
  - `getEvents`, `getRegions`, `getVenues` fazem `catch` e retornam `mockData`
- Risco:
  - Em falha de backend, app mostra dados fake em producao
  - Impacto de confianca e operacao (usuario pensa que sao dados reais)
- Recomendacao:
  - Em producao: remover fallback para mocks e exibir estado de erro/indisponibilidade
  - Manter mock fallback apenas via flag explicitamente DEV

### [MEDIA] CORS global aberto sem restricao de origem
- Severidade: Media
- Arquivo: backend/src/app.js
- Evidencia:
  - `app.use(cors())` sem whitelist
- Risco:
  - Consumo da API por origens nao esperadas
- Recomendacao:
  - Parametrizar `CORS_ORIGINS` por ambiente e restringir dominos oficiais

### [MEDIA] Upload local em disco para ambiente cloud
- Severidade: Media
- Arquivos:
  - backend/src/app.js
  - backend/src/controllers/uploads.controller.js
- Evidencia:
  - arquivos servidos de `/uploads` local
- Risco:
  - perda de arquivos em restart/deploy horizontal
- Recomendacao:
  - migrar para storage externo (S3/Cloudinary) antes de lancamento

## Estado dos fluxos criticos
- Login de teste x producao: gate aplicado (ok)
- Revisao obrigatoria antes de publicar evento: implementada (ok)
- Build frontend: ok

## Proximo passo recomendado
1. Corrigir os 2 itens de severidade Alta imediatamente
2. Validar novamente com smoke test dos fluxos publicos
3. Avancar para rodada 2 de refinamento UI/UX visual
