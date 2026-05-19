# QA Manual - NaPalma

## Smoke geral

1. App abre em `http://localhost:5173`.
2. Login funciona com conta demo.
3. Navegacao inferior responde sem erro.
4. Nao existe erro 500 no console de backend ao navegar no frontend.

## Publico

1. `Explorar` carrega eventos.
2. `Radar` marca/desmarca evento.
3. `Historico` marca como foi e mostra progresso de conquista.
4. `Pela Hora` permite montar plano manual e salvar.
5. `Pela Hora` em modo automatico sugere roteiro quando houver eventos na data.
6. Compartilhamento no detalhe de evento abre intent (WhatsApp/Telegram/Facebook ou copia link).

## Produtor

1. Redireciona para `/workspace/produtor`.
2. KPIs do painel aparecem.
3. Atalhos abrem gestao nas secoes corretas.
4. Em gestao:
- criar/editar/excluir casa
- criar/editar/excluir artista
- criar/editar/excluir evento

## Casa

1. Redireciona para `/workspace/casa`.
2. Painel mostra agenda ligada.
3. Gestao abre em foco de eventos.
4. Criacao/edicao de evento funciona.

## Gestao (escala)

1. Busca funciona em casas/artistas/eventos.
2. Ordenacao `Mais recentes` e `A-Z` funciona.
3. Paginacao avanca/volta corretamente.
4. Exportacao CSV baixa arquivo valido.
5. Filtro temporal de eventos (`Todos/Futuros/Passados`) funciona.

## Publicidade

1. Placeholder visual aparece quando `VITE_AD_PLACEHOLDER=true`.
2. Slots carregam sem quebrar layout em `Explorar`, `Detalhe da casa` e topo do `Radar`.
3. Gestao de Ads no admin cria/edita campanha e criativo.
4. Relatorios de Ads retornam dados por periodo.

## Erros e feedback

1. Toast aparece em sucesso.
2. Toast aparece em erro.
3. Toast desaparece sozinho.
