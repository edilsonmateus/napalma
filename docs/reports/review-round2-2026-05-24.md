# NaPalma - Revisao Tecnica (Round 2) - 2026-05-24

## Escopo revisado
- Permissoes por rota (backend)
- Exposicao de dados sensiveis em rotas publicas
- Comportamento de fallback de mocks no frontend
- Base de configuracao para deploy seguro

## Correcoes aplicadas neste round

### 1) Drafts protegidos na listagem publica
- Arquivo: `backend/src/controllers/events.controller.js`
- Mudanca:
  - `includeDrafts` agora so vale para `admin`, `producer`, `venue_manager`.
  - Usuarios publicos sempre recebem apenas `confirmed`.
- Risco mitigado:
  - Vazamento de rascunhos por querystring.

### 2) Drafts protegidos no detalhe por ID
- Arquivo: `backend/src/controllers/events.controller.js`
- Mudanca:
  - `GET /events/:id` retorna 404 para evento `draft` quando o solicitante nao tem permissao de gestao.
  - So perfis administrativos com gestao do evento conseguem abrir o draft.
- Risco mitigado:
  - Descoberta/abertura de rascunho via URL direta.

### 3) Mock fallback controlado por ambiente/flag
- Arquivo: `frontend/src/services/events.service.js`
- Mudanca:
  - Fallback de mocks so ativa em dev (padrao) ou com `VITE_ENABLE_API_FALLBACK_MOCKS=true`.
  - Em producao sem flag, erro de API nao e mascarado com mock.
- Risco mitigado:
  - Exibicao de dados falsos em ambiente real.

### 4) CORS com allowlist configuravel
- Arquivo: `backend/src/app.js`
- Mudanca:
  - CORS agora usa `CORS_ORIGINS` (lista separada por virgula).
  - Em dev, continua permissivo quando nao configurado.
- Risco mitigado:
  - API aberta a qualquer origem em producao.

### 5) Exemplos de ambiente atualizados
- Arquivos:
  - `backend/.env.example`
  - `frontend/.env.example`
- Mudanca:
  - Incluidas flags e variaveis necessarias para deploy controlado.

## Pendencias recomendadas (proximo round)

1. Rate limiting para auth/claims/uploads
- Aplicar limite por IP e por rota sensivel.

2. Uploads em storage persistente
- Trocar disco local por bucket (S3/R2/Cloudinary) para producao.

3. Auditoria de acao administrativa
- Registrar trilha de alteracao para claims, regioes, casas e eventos.

4. Segregacao forte de ambientes
- DB e `.env` isolados por projeto para evitar cruzamento entre copias.

## Status final do round
- **Concluido**: riscos criticos de exposicao de drafts e mascaramento de dados.
- **Pronto para proximo passo**: endurecimento operacional (rate limit + storage + auditoria).
