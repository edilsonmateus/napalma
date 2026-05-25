# NaPalma - Runbook de Rollback (PWA) - 2026-05-24

## Objetivo
Restaurar rapidamente o servico quando um deploy gerar erro critico em producao.

## Quando acionar rollback
- Erro de login em massa (401/500)
- Falha em endpoints principais (`/events`, `/venues`, `/auth/*`)
- Queda de disponibilidade (healthcheck instavel)
- Bug que impede operacao de Admin/Casa/Produtor

## Janela de decisao
- Maximo: 10 minutos apos detectar incidente.
- Decisor: responsavel de plantao do deploy.

## Pre-check rapido
1. Confirmar que o problema comecou apos deploy.
2. Verificar logs backend e erros frontend.
3. Confirmar impacto em usuarios reais.

## Rollback Backend
1. Voltar para a release/tag anterior no ambiente de execucao.
2. Reiniciar processo backend.
3. Validar:
   - `GET /health` => `200`
   - `POST /api/auth/login` => funcional
   - `GET /api/events` => retorna dados

## Rollback Frontend (PWA)
1. Publicar artefato `dist` da versao anterior.
2. Invalidar cache CDN (se houver).
3. Verificar `index.html` e bundle principal.
4. Atualizar service worker (forcar nova versao no host).

## Banco de dados
- Regra: nao executar rollback destrutivo de schema sem plano.
- Se houve migracao:
  - Preferir forward-fix rapido.
  - Fazer rollback de schema somente com script validado e backup recente.

## Pos-rollback (obrigatorio)
1. Confirmar fluxos:
   - Publico: Explorar / Evento / Radar
   - Casa: painel e criacao de evento
   - Produtor: carteira e reivindicacoes
   - Admin: claims e catalogo
2. Abrir incidente interno com:
   - horario
   - causa provavel
   - acao tomada
   - proximo fix

## Comunicacao curta (modelo)
- "Rollback executado. Servico estabilizado em `<hora>`. Causa em analise, sem perda de dados confirmada ate o momento."

