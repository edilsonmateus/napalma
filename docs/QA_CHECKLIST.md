# QA Checklist v2 - Bloco 5

## Objetivo
Validar operacao completa por perfil (`publico`, `casa`, `produtor`, `admin`) antes de deploy PWA.

## 1) Ambiente
- [ ] Backend online em `http://localhost:3333`
- [ ] Frontend online em `http://localhost:5173` (ou porta alternativa mostrada no terminal)
- [ ] Sem erro bloqueante no console do navegador
- [ ] Sem erro `500` no terminal do backend durante fluxo principal

## 2) Publico
- [ ] `Explorar` carrega cards por dia e regiao
- [ ] Filtros (`Hoje/Semana`, regiao, busca, data, hora, ao vivo) funcionam em conjunto
- [ ] `Partiu Agora` abre opcoes de rota (Maps, Waze, Uber)
- [ ] Abrir casa -> abrir evento -> compartilhar link/mensagem
- [ ] `Acho que eu vou` salva/remove no Radar
- [ ] `Meu Radar` mostra botao `Eu Fui` apenas na janela valida
- [ ] `Historico` recebe item apos `Eu Fui`
- [ ] `Pela Hora` manual e automatico salvam plano sem erro

## 3) Casa (venue_manager)
- [ ] Login redireciona para painel de casa
- [ ] Menu lateral aparece por padrao
- [ ] `Eventos` permite criar/editar/excluir evento da unidade ativa
- [ ] `Dados da casa` permite enviar alteracoes com justificativa
- [ ] `Produtores` permite vincular/desvincular produtor
- [ ] `Solicitar acesso` envia claim de nova filial
- [ ] `Zona de perigo` (quando aplicavel) funciona sem apagar casa da plataforma por engano

## 4) Produtor
- [ ] Login redireciona para `workspace/produtor`
- [ ] Menu lateral e KPI carregam
- [ ] Claim de casa/artista cria solicitacao pendente
- [ ] Antes da aprovacao: nao edita ativos fora da carteira
- [ ] Apos aprovacao: edita somente ativos aprovados
- [ ] Sem acesso ao painel de Ads admin

## 5) Admin
- [ ] Painel de gestao carrega secoes (`Casas`, `Artistas`, `Regioes`, `Reivindicacoes`, `Eventos`)
- [ ] Aprovar/rejeitar claims atualiza permissoes
- [ ] Verificacao de artista reflete selo no front
- [ ] Criar regiao mantem lista existente (nao sobrescreve)
- [ ] Excluir regiao respeita bloqueio por casas vinculadas
- [ ] Ads admin acessivel apenas para admin

## 6) Permissoes visuais (matriz)
- [ ] Publico: sem links de gestao admin/casa/produtor
- [ ] Casa: acesso a painel proprio e gestao de unidade
- [ ] Produtor: acesso a painel produtor e gestao da carteira aprovada
- [ ] Admin: acesso total incluindo Ads

## 7) Feedback UX (sem pulo de layout)
- [ ] Toast discreto aparece em acoes-chave (evento, radar, pela hora)
- [ ] Toast some automaticamente
- [ ] Nenhuma acao critica depende de toast para continuar fluxo

## 8) Go/No-Go
- [ ] Todos os itens criticos acima aprovados
- [ ] Bugs restantes classificados como baixa prioridade
- [ ] Release pronta para smoke de deploy
