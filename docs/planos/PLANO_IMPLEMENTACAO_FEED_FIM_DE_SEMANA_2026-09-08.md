# Plano de implementação — horizonte do feed e filtro Fim de semana

**Projeto:** 77Gira
**Data:** 08/09/2026
**Estado atual:** implementação local concluída e pronta para homologação.
**Criticidade:** média-alta. O fluxo afeta descoberta de eventos, filtros persistidos, agrupamento por dia, Tô na Pista e publicidade entre dias.
**Fonte operacional obrigatória:** reler este documento antes de iniciar e antes de concluir cada fase.

---

## 1. Regra de execução

- [x] Conferir a branch e o `git status` antes de editar.
- [x] Preservar alterações locais alheias e não incluir `remotion/` em commits.
- [x] Executar uma fase por vez e marcar como concluída somente após teste.
- [x] Não alterar banco, contratos de API ou dados existentes sem necessidade comprovada.
- [x] Não fazer commit, push ou deploy sem solicitação do usuário.
- [x] Registrar neste documento qualquer desvio do desenho aprovado.

Legenda: `[ ]` pendente, `[~]` em andamento, `[x]` concluída, `[!]` bloqueada.

---

## 2. Diagnóstico confirmado

O backend público já devolve eventos confirmados de casas publicadas e remove ocorrências encerradas. O problema observado está no frontend:

1. o período padrão é `semana`;
2. a janela atual considera aproximadamente os próximos sete dias;
3. os eventos são ordenados cronologicamente;
4. `eventRows.slice(0, limit)` corta a linha do tempo nos primeiros oito eventos;
5. `canLoadMore` está fixado como `false`, portanto não existe recuperação dos itens cortados.

Evidência local em 08/09/2026: havia 12 eventos elegíveis na semana — 3 na terça, 3 na quarta, 3 na quinta, 2 na sexta e 1 no sábado. O corte dos primeiros oito terminava na quinta e ocultava o fim de semana.

---

## 3. Objetivos

1. Garantir que os dias do horizonte selecionado apareçam sem serem eliminados por um limite global.
2. Adicionar `Fim de semana` como atalho no modal de filtros.
3. Fazer o fim de semana significar sexta, sábado e domingo no calendário de São Paulo.
4. Preservar filtros, Radar, atualização automática, agrupamento, Tô na Pista e publicidade entre dias.
5. Manter a interface escalável quando um único dia tiver muitos eventos.

---

## 4. Contrato de produto

### 4.1 Períodos

- `hoje`: eventos iniciados hoje e ainda não encerrados.
- `semana`: hoje e os sete dias-calendário seguintes, sem corte global por quantidade.
- `fim_de_semana`: sexta, sábado e domingo do bloco vigente ou mais próximo.

Regra do fim de semana:

- segunda a quinta: próxima sexta até o domingo seguinte;
- sexta: sexta atual até domingo;
- sábado: sexta anterior até domingo;
- domingo: sexta anterior até o fim do próprio domingo;
- eventos já encerrados permanecem excluídos.

### 4.2 Fuso horário

- Toda decisão de dia, hora, Hoje/Amanhã e fim de semana usa `America/Sao_Paulo`.
- O resultado não pode mudar porque o dispositivo está configurado em outro fuso.

### 4.3 Escalabilidade visual

- Todos os grupos de dias elegíveis são montados antes de limitar cards.
- Cada dia mostra inicialmente até oito eventos.
- Dias com mais de oito recebem `Ver mais neste dia`.
- Não haverá mais limite global de oito eventos nem botão global inativo.

### 4.4 Combinação de filtros

- Selecionar Hoje, Semana ou Fim de semana limpa uma data específica anterior.
- Selecionar uma data específica retorna o período-base a Semana e usa a data como autoridade.
- Hora, região e busca podem ser combinadas com Fim de semana.
- `Limpar tudo` restaura Semana e os demais padrões atuais.

---

## 5. Invariantes

- [x] O backend e seus contratos públicos não foram alterados nesta entrega.
- [x] Somente eventos confirmados de casas publicadas continuam públicos.
- [x] Eventos encerrados não retornam ao feed.
- [x] Busca, região, hora, “Tá rolando agora” e Radar mantêm seu comportamento.
- [x] O carrossel/anúncio entre dias continua dependendo de pelo menos dois grupos.
- [x] Preferências antigas no `localStorage` continuam legíveis.
- [x] O Tô na Pista continua procurando eventos imediatos, sem ser bloqueado pelo filtro de fim de semana.
- [x] Nenhuma dependência nova foi adicionada.

---

## 6. Arquitetura prevista

### 6.1 Utilitário puro de calendário

Criar `frontend/src/utils/exploreDateScope.js` para centralizar:

- chave de data em São Paulo;
- hora em São Paulo;
- soma de dias-calendário;
- intervalo do fim de semana vigente/próximo;
- verificação de pertencimento a Hoje, Semana ou Fim de semana;
- rótulo do período.

O utilitário não acessa React, DOM, rede ou armazenamento e deve possuir testes unitários.

### 6.2 Separação das linhas

Em `ExplorePage.jsx`, separar:

- `baseEventRows`: eventos futuros válidos após casa, região e busca;
- `eventRows`: aplicação dos filtros de período, data, hora e ao vivo;
- `onTrackRecommendations`: derivadas de `baseEventRows`, mantendo a janela imediata de 12 horas.

Essa separação evita que selecionar Fim de semana desligue silenciosamente o Tô na Pista em uma terça-feira.

### 6.3 Agrupamento antes da limitação

O agrupamento deve usar todos os `eventRows`. O limite de oito passa a ser aplicado dentro de cada grupo de dia, com expansão local controlada por estado não persistente.

---

## 7. Fases

### Fase A — baseline e testes do calendário `[x]`

- [x] Confirmar status do repositório e arquivos fora de escopo.
- [x] Criar o utilitário puro.
- [x] Testar segunda, quinta, sexta, sábado e domingo.
- [x] Testar Semana até o sétimo dia-calendário seguinte.
- [x] Testar um dispositivo conceitualmente fora do fuso de São Paulo.

Critério de saída: regras de calendário aprovadas sem alterar a tela.

### Fase B — estado e compatibilidade de preferências `[x]`

- [x] Aceitar `fim_de_semana` em `loadPrefs`.
- [x] Ignorar com segurança o antigo campo persistido `limit`.
- [x] Manter fallback para `semana` em valores desconhecidos.
- [x] Atualizar rótulo e contagem de filtros ativos.
- [x] Fazer data específica e período não se contradizerem.

Critério de saída: refresh preserva os três períodos e sessões antigas continuam válidas.

### Fase C — composição do feed `[x]`

- [x] Separar `baseEventRows` e `eventRows`.
- [x] Aplicar as regras do utilitário.
- [x] Remover `slice(0, limit)` do agrupamento.
- [x] Remover `canLoadMore = false` e a ação global morta.
- [x] Criar limite por dia e expansão `Ver mais neste dia`.
- [x] Garantir contagem total coerente no cabeçalho e modal.

Critério de saída: eventos de sexta a domingo não são ocultados por eventos anteriores.

### Fase D — interface do filtro `[x]`

- [x] Adicionar botão `Fim de semana` junto de Hoje e Semana.
- [x] Informar estado selecionado visual e semanticamente.
- [x] Limpar data específica ao selecionar um período.
- [x] Manter combinação com hora, região e busca.
- [x] Garantir disposição adequada no mobile.

Critério de saída: o filtro funciona em um clique e não cria estados ambíguos.

### Fase E — integrações `[x]`

- [x] Manter Tô na Pista baseado em `baseEventRows` e janela de 12 horas.
- [x] Verificar Radar e links de evento.
- [x] Verificar anúncio individual e carrossel entre dias.
- [x] Verificar refresh por foco/retomada.
- [x] Registrar seleção do período na telemetria sem dados pessoais.

Critério de saída: integrações existentes permanecem funcionais.

### Fase F — regressão e entrega local `[x]`

- [x] Executar testes dirigidos.
- [x] Executar build do frontend.
- [x] Executar testes relacionados ao catálogo público, Ads, Radar e Tô na Pista.
- [x] Executar `git diff --check`.
- [x] Revisar visualmente desktop e mobile quando houver sessão disponível.
- [x] Registrar resultados e pendências abaixo.

Critério de saída: implementação local pronta para homologação do usuário.

---

## 8. Matriz mínima de aceitação

| Situação | Resultado esperado |
|---|---|
| Terça com 12 eventos, 9 antes de sexta | Sexta, sábado e domingo permanecem visíveis |
| Fim de semana selecionado na terça | Mostra sexta a domingo próximos |
| Fim de semana selecionado na sexta | Mostra sexta atual a domingo |
| Fim de semana selecionado no domingo | Mostra somente eventos ainda válidos do domingo |
| Data específica ativa e usuário toca Semana | Data é limpa e Semana passa a valer |
| Fim de semana + hora | Mostra apenas eventos do fim de semana naquela hora |
| Dia com mais de oito eventos | Outros dias aparecem; o dia oferece expansão local |
| Tô na Pista ativo + Fim de semana | Recomendações imediatas continuam independentes |
| Apenas um grupo de dia | Anúncio entre dias não aparece |
| Dois ou mais grupos | Regra atual do anúncio entre dias continua funcionando |

---

## 9. Fora de escopo

- Alterar cadastro ou publicação de eventos.
- Paginar o endpoint público no servidor.
- Criar recomendação personalizada de fim de semana.
- Mudar preços ou regras de publicidade.
- Alterar a ordem cronológica dos eventos dentro de cada dia.
- Redesenhar integralmente o modal ou os cards.

---

## 10. Histórico de execução

### 08/09/2026 — documento criado

- Diagnóstico confirmado no código e na resposta local da API.
- Plano aprovado pelo usuário para documentação e implementação.
- Nenhuma alteração funcional registrada até este ponto.

### 08/09/2026 — Fase A concluída

- Criado utilitário puro de calendário do Explorar, fixado em `America/Sao_Paulo`.
- Cobertos Hoje, Semana, fim de semana de segunda a domingo e virada UTC/São Paulo.
- Teste dirigido: 8 testes aprovados em `explore-date-scope.test.js`.
- Nenhuma tela, API, banco ou dado foi alterado nesta fase.

### 08/09/2026 — Fases B a E concluídas

- Preferências antigas permanecem compatíveis; o antigo `limit` é descartado com segurança.
- O feed passou a separar eventos-base dos filtros de período e removeu o corte global de oito itens.
- O limite passou a ser de oito eventos por dia, com expansão local sem remover dias posteriores.
- `Fim de semana` foi incluído no modal com estado visual e semântico, combinável com busca, hora e região.
- Tô na Pista permanece independente do período; Radar, links e posicionamento entre dias foram preservados.
- A seleção de período gera telemetria apenas com o identificador do filtro, sem dado pessoal.
- Nenhuma alteração foi feita em banco, API pública, dependências ou backend de produção.

### 08/09/2026 — Fase F concluída

- Teste dirigido do novo calendário e agrupamento: 11 testes aprovados.
- Regressão dirigida de calendário, catálogo público, preferências/Radar e Tô na Pista: 22 testes aprovados em quatro arquivos.
- Build de produção do frontend aprovado, com 2.645 módulos processados.
- Suíte completa do backend: 327 testes aprovados e sete falhas preexistentes, sem relação com esta entrega.
- A verificação específica de layout de Ads conserva uma expectativa CSS antiga já divergente do código-base; não foi alterada nesta entrega.
- `git diff --check` aprovado.
- Homologação visual no localhost aprovada em desktop e viewport mobile de 390 × 844 px.
- No cenário real disponível, Semana mostrou 12 eventos incluindo sexta e sábado; Fim de semana mostrou os três eventos elegíveis de sexta e sábado.
- O utilitário de agrupamento foi extraído para teste direto; isso não muda o desenho aprovado e reduz o risco de regressão do limite por dia.
- Commit, push e deploy não foram executados.

### Modelo de registro

```text
Data:
Fase:
Arquivos alterados:
Testes executados:
Resultado:
Riscos ou desvios:
Commit/push/deploy:
Próxima etapa:
```
