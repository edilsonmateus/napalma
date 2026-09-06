# Plano de implementação — ficha administrativa e controle de visibilidade de casas

**Projeto:** 77Gira  
**Data de criação:** 06/09/2026  
**Estado:** planejamento detalhado; nenhuma implementação deste escopo iniciada.  
**Criticidade:** alta. A visibilidade de uma casa afeta catálogo, agenda, Radar, Pela Hora, cardápios, perfis de artistas, lembretes, publicidade, aquisição, auditoria e vínculos profissionais.  
**Fonte operacional obrigatória:** este documento deve ser consultado antes de iniciar, retomar ou concluir cada fase descrita abaixo.

---

## 1. Regra obrigatória de uso deste documento

Este arquivo não é apenas uma descrição de produto. Ele é o roteiro de execução e a lista de proteção contra regressões deste trabalho.

### Antes de iniciar ou retomar qualquer fase

- [ ] Ler este documento integralmente, inclusive riscos, não objetivos e histórico de execução.
- [ ] Conferir `git status --short`, a branch atual e os últimos commits.
- [ ] Identificar e preservar alterações locais que não pertençam a esta tarefa.
- [ ] Não incluir em commit arquivos temporários do Word, artefatos de renderização ou a pasta `remotion/` sem autorização explícita.
- [ ] Revalidar no código se os arquivos, rotas, modelos e comportamentos citados aqui continuam atuais.
- [ ] Verificar se alguma fase anterior está marcada como `[~]`, `[!]` ou concluída sem evidência.
- [ ] Ler integralmente o bloco da fase que será executada.
- [ ] Confirmar que os critérios de entrada da fase foram satisfeitos.
- [ ] Registrar no histórico, antes de implementar, qualquer divergência necessária em relação ao plano.
- [ ] Não modificar migrações Prisma já aplicadas. Toda mudança de banco deve usar uma nova migração aditiva.
- [ ] Não aplicar migração, fazer commit, push ou deploy sem a autorização correspondente do usuário.

### Durante cada fase

- [ ] Trabalhar somente no escopo daquela fase.
- [ ] Atualizar os checkboxes após validar, nunca apenas após escrever código.
- [ ] Manter mudanças pequenas e revisáveis.
- [ ] Não refatorar áreas adjacentes por conveniência.
- [ ] Preservar compatibilidade com os papéis `admin`, `producer` e `venue_manager`.
- [ ] Preservar sessões autenticadas, eventos, cardápios, reivindicações, acessos, métricas e histórico.
- [ ] Se surgir impacto não contemplado, interromper a fase, documentar o risco e replanejar antes de avançar.

### Ao concluir cada fase

- [ ] Executar os testes específicos da fase.
- [ ] Executar a regressão mínima definida neste documento.
- [ ] Registrar arquivos alterados, testes, evidências e pendências no histórico.
- [ ] Só marcar `[x]` quando código, testes e evidência estiverem completos.
- [ ] Não iniciar a fase seguinte se o critério de saída da fase atual não estiver satisfeito.

### Legenda operacional

- `[ ]` não iniciada.
- `[~]` em andamento.
- `[x]` concluída e validada.
- `[!]` bloqueada ou dependente de decisão.

Se houver compactação de contexto, nova sessão de trabalho ou troca de executor, a leitura integral deste arquivo volta a ser obrigatória.

---

## 2. Objetivo

Criar uma experiência administrativa segura para consultar e governar uma casa sem obrigar o administrador a entrar diretamente no formulário de edição.

O resultado deve oferecer:

1. ficha administrativa de leitura;
2. estado claro de visibilidade da casa;
3. pausa e reativação reversíveis;
4. publicação explícita de casas internas em rascunho;
5. exclusão definitiva protegida e separada das ações rotineiras;
6. auditoria das decisões de visibilidade;
7. aplicação uniforme da visibilidade em todos os canais públicos;
8. preservação integral dos dados e fluxos que já funcionam.

---

## 3. Diagnóstico técnico confirmado em 06/09/2026

### 3.1 Interface atual

- `frontend/src/pages/VenuesAdminPage.jsx` concentra casas, eventos, artistas, produtores, regiões, aquisição e reivindicações em aproximadamente 3.290 linhas.
- A seção Casas apresenta um formulário de criação/edição e uma lista de registros.
- Cada casa oferece atualmente `Cardápio`, `Editar` e `Excluir`.
- Não existe rota de ficha administrativa de casa.
- `Editar` busca os dados completos e preenche o formulário da própria página.
- `Excluir` usa `window.confirm`, sem resumo de impacto.
- Para `producer`, o mesmo fluxo chamado de exclusão remove somente o vínculo com a carteira.
- Para `venue_manager`, a exclusão da casa é recusada pelo servidor.
- O CSS global possui mais de 15 mil linhas e a classe genérica `.venue-card` é reutilizada em várias áreas públicas e administrativas.

### 3.2 Modelo de dados e servidor

- `Venue` não possui estado de visibilidade, pausa, publicação ou arquivamento.
- A exclusão administrativa é física, mas é bloqueada quando existem eventos vinculados.
- O endpoint público de casas e o endpoint de detalhe compartilham grande parte da serialização atual.
- Dados de contato fazem parte do mapeamento atual; uma nova ficha administrativa não pode ampliar sua exposição pública.
- Eventos públicos filtram `Event.status = confirmed`, mas não verificam o estado da casa.
- O fluxo de aquisição informa que a casa convertida não é publicada automaticamente, embora hoje não exista estado técnico que garanta isso.
- `AuditLog` e `recordAuditEvent` já existem e devem ser reutilizados com metadados minimizados.

### 3.3 Consumidores identificados

A visibilidade de uma casa pode afetar diretamente:

- catálogo e busca de casas;
- Explorar;
- detalhe público de casa;
- cardápio público;
- lista e detalhe de eventos;
- perfil público de artista;
- EPK público de artista;
- Radar;
- lembretes de eventos;
- Pela Hora;
- roteiros públicos compartilhados;
- exportação de agenda na Central de Operações;
- fila de qualidade do catálogo;
- anúncios vinculados ao contexto de uma casa;
- conversão de oportunidades de aquisição;
- filtros de regiões;
- histórico e analytics administrativos.

---

## 4. Decisões de produto fixadas para a primeira versão

### 4.1 Estados da casa

Usar um enum fechado:

```text
draft
published
paused
```

Significados:

- `draft`: registro interno ainda não disponibilizado no catálogo público;
- `published`: casa pública e elegível para os canais públicos;
- `paused`: casa temporariamente retirada da experiência pública, sem remoção de dados.

### 4.2 Transições permitidas

```text
draft -> published
published -> paused
paused -> published
```

Não permitir na primeira versão:

- `published -> draft`;
- `paused -> draft`;
- transição de visibilidade feita por usuário não autorizado;
- alteração implícita do estado da casa por edição de evento ou cardápio.

### 4.3 Escopo da pausa

Ao pausar uma casa:

- esconder a casa do catálogo, Explorar e buscas públicas;
- tornar indisponível o detalhe público da casa;
- tornar indisponível seu cardápio público;
- excluir eventos presentes e futuros da entrega pública;
- impedir novos agendamentos e envios de lembretes relacionados a esses eventos;
- retirar eventos futuros da casa das sugestões do Pela Hora;
- impedir exposição dos eventos em roteiros públicos compartilhados;
- retirar os eventos futuros de perfis e EPKs públicos de artistas;
- impedir entrega de slots publicitários cujo contexto dependa diretamente da página da casa;
- manter a casa visível nos ambientes administrativos autorizados.

### 4.4 O que a pausa não pode fazer

- Não excluir nem alterar o status dos eventos.
- Não apagar recorrências ou exceções.
- Não arquivar ou apagar o cardápio.
- Não remover produtores ou gestores.
- Não encerrar reivindicações ou contratos.
- Não apagar Radar, histórico, analytics ou auditoria.
- Não encerrar sessões de usuários.
- Não modificar campanhas publicitárias de forma destrutiva.
- Não alterar o plano de analytics da casa.
- Não transformar pausa temporária em exclusão lógica.

### 4.5 Histórico público e privado

- Eventos atuais e futuros de uma casa pausada não são públicos.
- Eventos passados continuam preservados em histórico pessoal, analytics, auditoria e relatórios internos.
- Esta primeira versão não é um mecanismo de retirada jurídica retroativa. Pedidos dessa natureza pertencem ao fluxo de privacidade/moderação.

### 4.6 Autorização inicial

- Somente `admin` pode publicar, pausar ou reativar uma casa pela interface de Settings.
- Produtores e gestores continuam com suas permissões atuais.
- A ação `Remover da carteira` do produtor deve continuar removendo apenas o vínculo e nunca ser convertida em exclusão da casa.
- Uma futura solicitação de pausa feita pela própria casa pode ser planejada separadamente; não será criada silenciosamente nesta versão.

### 4.7 Exclusão

- A exclusão física continuará existindo nesta versão para evitar uma mudança estrutural adicional.
- As proteções atuais do servidor devem ser preservadas.
- A ação sairá da listagem comum e ficará numa área de risco da ficha administrativa.
- A confirmação deverá exibir impacto e exigir a digitação exata do nome da casa.
- Arquivamento e soft delete ficam fora desta versão.

---

## 5. Não objetivos

Esta implementação não deve:

- redesenhar todo o Settings;
- reescrever o formulário de casa;
- alterar os modelos de acesso de produtores e gestores;
- modificar o fluxo jurídico de reivindicações;
- cancelar eventos automaticamente;
- remover histórico de usuários;
- reestruturar o sistema de cardápio;
- redefinir campanhas ou contratos publicitários;
- migrar a exclusão física para soft delete;
- refatorar globalmente `.venue-card` ou o CSS administrativo;
- adicionar uma nova biblioteca de interface ou de testes sem necessidade comprovada;
- editar migrações antigas para acomodar o novo enum.

---

## 6. Arquitetura-alvo

### 6.1 Regra central de elegibilidade pública

Criar um módulo reutilizável, por exemplo:

```text
backend/src/services/venueVisibility.service.js
```

Responsabilidades:

- expor a condição Prisma para casa pública;
- expor a condição Prisma para evento publicável por estado da casa;
- verificar se um usuário autenticado pode acessar uma entidade não pública em contexto administrativo;
- manter os valores do enum e as decisões de visibilidade fora dos controladores;
- evitar que cada controlador implemente uma regra diferente.

Regra conceitual:

```text
Casa pública = visibilityStatus == published
Evento público = event.status == confirmed AND event.venue.visibilityStatus == published
```

Nenhum endpoint público deve depender de um filtro feito somente no frontend.

### 6.2 Separação de payloads

Criar serializações distintas:

- `mapPublicVenuePayload`: somente dados destinados à experiência pública;
- `mapManagedVenuePayload`: dados necessários aos ambientes profissionais autorizados;
- `mapAdminVenueOverview`: dados administrativos, contatos, vínculos e impactos.

Regras:

- contatos não entram no payload público por consequência da nova ficha;
- o frontend público recebe todos os campos que já utiliza para não quebrar layout, rotas ou filtros;
- a ficha administrativa usa endpoint autenticado próprio;
- o servidor realiza autorização por objeto, além de verificar o papel.

### 6.3 Novos endpoints sugeridos

```text
GET   /admin/venues/:id/overview
GET   /admin/venues/:id/visibility-impact
PATCH /admin/venues/:id/visibility
```

Proteções:

- `requireAuth`;
- `requireRole(["admin"])` na primeira versão;
- UUID validado;
- resposta 404 para entidade inexistente;
- payload de escrita validado com Zod;
- limite de tamanho para campos;
- operação idempotente;
- auditoria minimizada.

Payload sugerido para alteração:

```json
{
  "status": "paused",
  "reasonCode": "venue_request",
  "expectedStatus": "published"
}
```

`expectedStatus` previne uma decisão baseada em tela desatualizada. Se o estado tiver mudado, responder `409 visibility_state_changed` e solicitar atualização da ficha.

### 6.4 Motivos fechados

Usar enum/control list, não texto livre no log:

```text
venue_request
temporary_closure
catalog_review
schedule_issue
operational_other
```

Se no futuro houver observação livre, ela deverá ter tamanho limitado, tratamento de conteúdo, acesso restrito e não ser copiada para telemetria ou metadados genéricos de auditoria.

### 6.5 Transação de alteração de visibilidade

A operação deve:

1. carregar casa e estado atual;
2. validar a transição;
3. comparar `expectedStatus`;
4. calcular impacto relevante;
5. atualizar estado e data;
6. cancelar lembretes pendentes de eventos futuros quando houver pausa;
7. criar `AuditLog` na mesma transação, sempre que tecnicamente possível;
8. retornar estado atualizado e resumo da consequência;
9. não modificar eventos, cardápio, acessos ou campanhas.

Para reativação, eventos confirmados e ainda válidos voltam a ser elegíveis automaticamente. Lembretes anteriormente cancelados não devem ser recriados silenciosamente sem regra específica; essa decisão precisa aparecer no retorno e na interface.

---

## 7. Modelo de dados e migração

### 7.1 Alteração proposta

Adicionar enum Prisma:

```prisma
enum VenueVisibilityStatus {
  draft
  published
  paused
}
```

Adicionar a `Venue`:

```prisma
visibilityStatus    VenueVisibilityStatus @default(published)
visibilityChangedAt DateTime?
```

Adicionar índice compatível com os principais filtros públicos, após verificar o plano real de consultas:

```prisma
@@index([visibilityStatus, region, name])
```

### 7.2 Compatibilidade de migração

- [ ] Criar uma nova pasta de migração com timestamp posterior à última existente.
- [ ] Nunca editar migrações que já foram aplicadas.
- [ ] Adicionar o enum e as colunas de forma aditiva.
- [ ] Garantir que todas as casas existentes recebam `published`.
- [ ] Não preencher `visibilityChangedAt` para registros antigos; `null` significa estado herdado da migração.
- [ ] Preservar IDs, slugs, relações e datas existentes.
- [ ] Validar `prisma migrate status` antes e depois em ambiente local.
- [ ] Executar `prisma generate` sem manter outro processo usando o cliente Prisma no Windows.
- [ ] Não aceitar reset de banco quando a ferramenta detectar drift; investigar antes.

### 7.3 Criação de novas casas

Existem três caminhos conhecidos que devem ser auditados:

1. criação manual administrativa em `venues.controller.js`;
2. conversão em `acquisition.controller.js`;
3. seed local em `backend/prisma/seed.js`.

Comportamento recomendado:

- criação manual administrativa: definir `published` explicitamente para preservar o comportamento atual;
- conversão de aquisição: definir `draft` explicitamente para tornar verdadeira a mensagem já exibida ao administrador;
- seed: definir o estado explicitamente conforme a finalidade do registro de teste.

Não depender apenas do valor default nos caminhos de criação.

---

## 8. Ficha administrativa — especificação de interface

### 8.1 Rota

Adicionar:

```text
/settings/venues/:venueId
```

A rota de cardápio existente permanece:

```text
/settings/venues/:venueId/menu
```

Evitar colisão de rotas e validar carregamento direto, refresh e botão Voltar.

### 8.2 Isolamento de código

Criar página própria, por exemplo:

```text
frontend/src/pages/VenueAdminDetailPage.jsx
```

Criar estilos próprios e integralmente prefixados, por exemplo:

```text
frontend/src/styles/venue-admin-detail.css
.venue-admin-detail ...
```

Não adicionar a nova ficha dentro do corpo de `VenuesAdminPage.jsx`. Não alterar regras genéricas de `.venue-card`, `.clean-card`, `.modal-card` ou `.venue-actions` para ajustar essa tela.

### 8.3 Cabeçalho

Exibir:

- voltar para Casas;
- imagem ou fallback neutro;
- nome da casa;
- bairro, região, cidade e UF;
- selo de estado;
- data da última mudança de visibilidade, quando houver;
- ação principal `Editar dados`;
- ação contextual `Ver perfil público`, somente quando publicada;
- ação `Publicar casa`, quando em rascunho;
- ação `Pausar visibilidade`, quando publicada;
- ação `Reativar visibilidade`, quando pausada.

### 8.4 Seções de leitura

#### Apresentação pública

- nome e apelido;
- formas gramaticais já cadastradas;
- descrição;
- imagem;
- endereço completo;
- coordenadas, sem apresentar precisão desnecessária fora da administração;
- bairro, região, cidade e UF;
- dias de funcionamento;
- Instagram.

#### Operação

- contato responsável;
- telefone;
- origem da casa;
- criador do registro, quando disponível e autorizado;
- gestores vinculados;
- produtores vinculados;
- quantidade de acessos ativos;
- estado de reivindicações relacionadas.

#### Programação

- total de eventos;
- total futuro;
- quantidade de rascunhos e confirmados;
- próximo evento;
- lista curta dos próximos eventos;
- atalho para gestão da programação.

#### Cardápio e recursos

- inexistente, rascunho, publicado ou arquivado;
- data de revisão/publicação quando disponível;
- atalho para gestão;
- plano de analytics e origem do acesso.

#### Visibilidade

- estado atual;
- explicação humana do efeito;
- data e responsável pela última alteração, quando permitido;
- ação correspondente ao estado.

#### Área de risco

- exclusão definitiva;
- explicação de que a pausa é preferível para retirada temporária;
- bloqueios conhecidos antes de abrir a confirmação.

### 8.5 Estados da tela

- carregamento com estrutura estável, sem piscar o formulário de edição;
- 404 administrativo para ID inexistente;
- 403 sem expor dados da casa;
- erro recuperável com `Tentar novamente` e `Voltar para Casas`;
- ausência de imagem, cardápio, agenda, contato ou vínculo tratada com mensagens neutras;
- estado pausado com aviso persistente, sem aparência de erro técnico;
- estado rascunho com explicação de que ainda não está público.

### 8.6 Mobile e acessibilidade

- usar uma coluna no mobile;
- ações em ordem de importância e com área mínima de toque adequada;
- não criar barra fixa que colida com a navegação inferior;
- garantir contraste dos selos e botões;
- não comunicar estado apenas por cor;
- ordem de foco coerente;
- cabeçalhos sem saltos semânticos;
- modais com `role=dialog`, `aria-modal`, título associado, foco inicial, Escape e devolução do foco ao acionador;
- bloquear duplo envio durante mutações;
- leitores de tela devem receber confirmação da mudança via região de status.

---

## 9. Alteração segura da listagem atual

Para o administrador:

- [ ] adicionar selo de visibilidade a cada casa;
- [ ] adicionar `Ver casa` como entrada principal;
- [ ] manter `Editar`;
- [ ] manter `Cardápio`;
- [ ] remover `Excluir` da superfície comum;
- [ ] incluir filtro por estado sem alterar busca, ordenação e paginação existentes;
- [ ] preservar Exportar CSV e decidir explicitamente se o estado entra como nova coluna.

Para o produtor:

- [ ] preservar `Remover da carteira` e seu comportamento atual;
- [ ] não renderizar ações administrativas de publicação ou pausa;
- [ ] não alterar os filtros de escopo gerenciado.

Para o gestor de casa:

- [ ] preservar o fluxo especial de perfil, eventos e responsáveis já existente;
- [ ] não oferecer exclusão, pausa ou publicação administrativa;
- [ ] não redirecionar automaticamente para a nova ficha de administrador.

### Integração com o formulário atual

O botão `Editar dados` da nova ficha deve levar ao formulário existente por uma navegação explícita, preferencialmente:

```text
/settings/venues?section=venues&edit=<venueId>
```

Cuidados:

- validar o ID recebido;
- carregar uma única vez;
- manter o formulário atual e suas validações;
- remover o parâmetro ao cancelar ou concluir;
- não sobrescrever preferências administrativas salvas;
- impedir que uma URL inválida deixe um formulário parcialmente preenchido;
- preservar a justificativa de alteração usada pelo fluxo de produtor.

---

## 10. Modal de pausa e reativação

### 10.1 Prévia de impacto

Antes de pausar, buscar no servidor:

- eventos acontecendo agora;
- eventos futuros confirmados;
- eventos futuros em rascunho;
- eventos recorrentes;
- lembretes pendentes;
- marcações ativas no Radar;
- roteiros públicos que podem conter eventos futuros;
- estado do cardápio;
- anúncios cujo contexto dependa diretamente da casa.

Não retornar listas de usuários nem dados pessoais nessa prévia; somente contagens necessárias à decisão.

### 10.2 Conteúdo do modal

- nome da casa;
- estado atual;
- resumo do impacto;
- afirmação clara de que dados, programação e vínculos serão preservados;
- motivo obrigatório em lista fechada;
- `Cancelar`;
- `Confirmar pausa`.

O botão de confirmação deve usar aparência de advertência, não a mesma semântica visual de exclusão definitiva.

### 10.3 Sucesso

- manter a ficha aberta;
- atualizar o selo e as ações;
- exibir feedback textual;
- invalidar caches relacionados;
- informar que lembretes pendentes foram interrompidos;
- não fechar ou redirecionar sem explicação.

### 10.4 Reativação

- confirmar a ação;
- informar quantos eventos futuros confirmados voltarão a ser públicos;
- deixar claro que lembretes cancelados durante a pausa não serão recriados automaticamente nesta versão;
- manter dados e status dos eventos inalterados;
- atualizar a ficha e caches após sucesso.

---

## 11. Exclusão definitiva protegida

### 11.1 Interface

- somente na área de risco;
- botão rotulado `Excluir definitivamente`;
- prévia de impacto antes da confirmação;
- explicar que pausar é reversível e deve ser usada para retirada temporária;
- exigir a digitação exata do nome da casa;
- desabilitar confirmação enquanto o nome não coincidir;
- manter botão Cancelar visível;
- manter feedback após sucesso ou erro.

### 11.2 Servidor

- preservar verificação de autorização atual;
- preservar bloqueio quando existem eventos;
- revalidar vínculos e dependências no momento da ação, não confiar apenas na prévia;
- executar auditoria de conclusão;
- nunca aceitar nome digitado como única autorização: autenticação e RBAC continuam obrigatórios;
- não alterar a semântica do endpoint do produtor que remove acesso.

### 11.3 Fora de escopo

- soft delete;
- restauração de casa excluída;
- exclusão em cascata de eventos;
- exclusão em massa.

---

## 12. Matriz de comportamento por canal

| Canal | `draft` | `published` | `paused` | Regra de preservação |
|---|---|---|---|---|
| Settings administrativo | visível | visível | visível | sempre gerenciável pelo admin |
| Lista gerenciada do produtor | conforme vínculo | conforme vínculo | conforme vínculo | pausa não revoga vínculo |
| Workspace da casa | conforme vínculo | conforme vínculo | conforme vínculo | pausa não bloqueia preparação interna |
| Explorar | oculto | visível | oculto | filtro obrigatório no servidor |
| Busca/lista pública de casas | oculto | visível | oculto | não confiar no frontend |
| Detalhe público da casa | indisponível | visível | indisponível | resposta neutra, sem motivo interno |
| Cardápio público | indisponível | conforme status do menu | indisponível | menu gerenciado permanece acessível |
| Eventos atuais/futuros públicos | ocultos | conforme status do evento | ocultos | não alterar `Event.status` |
| Perfil/EPK de artista — futuros | ocultos | visíveis | ocultos | aplicar filtro pela casa |
| Histórico de eventos passados | preservado internamente | preservado | preservado | pausa não é remoção retroativa |
| Radar | não oferecer como ativo | normal | ocultar futuro e manter vínculo | não apagar marcação |
| Lembretes | não agendar | normal | cancelar pendentes/bloquear envio | registrar cancelamento técnico |
| Pela Hora | não elegível | elegível | não elegível | validar também eventos recebidos por ID |
| Roteiro público | não exibir | normal | não exibir futuro | evitar vazamento por link compartilhado |
| Analytics e audiência | preservado | preservado | preservado | dados históricos não são apagados |
| Operações/qualidade | visível com selo | visível | visível com selo | interno não deve confundir pausa com erro |
| Ads no detalhe da casa | sem entrega | normal | sem entrega | servidor valida contexto da casa |
| Campanhas com targeting de casa | preservadas | normal | avisar/no-fill no contexto pausado | não cancelar campanha inteira |

---

## 13. Pontos de integração obrigatórios no backend

### 13.1 Casas

Arquivos principais:

- `backend/prisma/schema.prisma`;
- nova migração em `backend/prisma/migrations/`;
- `backend/src/controllers/venues.controller.js`;
- `backend/src/routes/index.js`;
- novo serviço de visibilidade.

Checklist:

- [ ] lista pública filtra `published`;
- [ ] lista gerenciada inclui os três estados;
- [ ] detalhe público não expõe rascunho/pausa;
- [ ] detalhe administrativo usa endpoint protegido;
- [ ] serialização inclui `visibilityStatus` somente onde necessário;
- [ ] criação manual define estado explicitamente;
- [ ] atualização comum não pode alterar visibilidade por campo injetado;
- [ ] alteração de visibilidade usa endpoint específico.

### 13.2 Eventos

Arquivo principal:

- `backend/src/controllers/events.controller.js`.

Checklist:

- [ ] lista pública exige evento confirmado e casa publicada;
- [ ] lista gerenciada continua retornando eventos de casa pausada;
- [ ] detalhe público de evento de casa pausada responde como indisponível;
- [ ] admin/produtor/gestor autorizado consegue consultar e editar internamente;
- [ ] criação e edição durante pausa continuam permitidas para preparar retomada;
- [ ] exportação chamada de pública não inclui casa pausada;
- [ ] recorrências respeitam a visibilidade antes e depois da expansão de ocorrências.

### 13.3 Cardápios

Arquivo principal:

- `backend/src/controllers/venueMenus.controller.js`.

Checklist:

- [ ] menu público exige casa publicada;
- [ ] menu gerenciado continua acessível durante pausa;
- [ ] interações públicas não podem ser criadas em item de casa pausada;
- [ ] estado do menu não muda quando a casa é pausada.

### 13.4 Radar e lembretes

Arquivos principais:

- `backend/src/controllers/radar.controller.js`;
- `backend/src/services/eventReminder.service.js`.

Checklist:

- [ ] não permitir nova marcação pública de evento indisponível;
- [ ] lista do Radar não oferece evento futuro de casa pausada como ativo;
- [ ] marcação existente não é apagada;
- [ ] pausa cancela lembretes `PENDING` e `PROCESSING` de eventos futuros;
- [ ] worker revalida a visibilidade imediatamente antes do envio;
- [ ] reativação não recria lembretes silenciosamente;
- [ ] motivo técnico de cancelamento diferencia pausa da casa.

### 13.5 Pela Hora e compartilhamentos

Arquivo principal:

- `backend/src/controllers/pelaHora.controller.js`.

Checklist:

- [ ] sugestão automática filtra casas publicadas;
- [ ] criação manual valida IDs de eventos contra elegibilidade pública quando o contexto exigir;
- [ ] roteiro público compartilhado não exibe eventos futuros de casa pausada;
- [ ] roteiro privado preserva sequência, podendo indicar item indisponível sem revelar motivo;
- [ ] cálculo de trânsito não usa evento removido da composição pública.

### 13.6 Artistas e EPK

Arquivos principais:

- `backend/src/controllers/artists.controller.js`;
- `backend/src/controllers/artistEpk.controller.js`.

Checklist:

- [ ] próximos eventos públicos filtram casa publicada;
- [ ] EPK não divulga evento atual/futuro de casa pausada;
- [ ] histórico interno do artista permanece;
- [ ] não alterar seguidores, mídia ou equipe do artista.

### 13.7 Operações, regiões e qualidade

Arquivos principais:

- `backend/src/controllers/operations.controller.js`;
- `backend/src/controllers/venues.controller.js` em `listOperationsVenues`;
- `backend/src/controllers/regions.controller.js`.

Checklist:

- [ ] operações recebe o estado e consegue distinguir pausa de falha cadastral;
- [ ] exportação de agenda pública exclui casas pausadas;
- [ ] fila de moderação não acusa uma casa pausada apenas por estar sem entrega pública;
- [ ] regiões não expõem nomes de casa;
- [ ] avaliar se filtros públicos devem ocultar regiões sem nenhuma casa/evento publicado, sem mudar isso incidentalmente.

### 13.8 Aquisição

Arquivo principal:

- `backend/src/controllers/acquisition.controller.js`.

Checklist:

- [ ] conversão cria casa em `draft`;
- [ ] mensagem existente passa a corresponder ao estado real;
- [ ] oportunidade permanece vinculada à casa;
- [ ] conversão não cria usuário, evento ou publicação;
- [ ] ficha mostra origem e atalho para a oportunidade quando permitido;
- [ ] publicação posterior exige ação administrativa explícita.

### 13.9 Publicidade

Arquivo principal:

- `backend/src/controllers/ads.controller.js`.

Checklist:

- [ ] slots `venue_detail_inline` e `venue_menu_sponsor` validam casa publicada;
- [ ] pedido para contexto pausado retorna no-fill sem criar impressão;
- [ ] pausa não encerra campanha inteira que também possua outros contextos;
- [ ] relatório histórico continua íntegro;
- [ ] prévia de impacto retorna somente contagens e não dados de anunciantes desnecessários;
- [ ] campanhas segmentadas para a casa recebem aviso administrativo quando aplicável.

### 13.10 Analytics, audiência e histórico

Arquivos a revalidar:

- `backend/src/controllers/analytics.controller.js`;
- `backend/src/controllers/audience.controller.js`;
- `backend/src/controllers/history.controller.js`;
- `backend/src/services/privacyExport.service.js`.

Checklist:

- [ ] pausa não apaga eventos analíticos;
- [ ] relatórios administrativos continuam encontrando a casa;
- [ ] histórico pessoal passado permanece;
- [ ] exportação de privacidade continua íntegra;
- [ ] nenhum dado de contato novo é enviado para analytics.

---

## 14. Pontos de integração obrigatórios no frontend

### Arquivos principais

- `frontend/src/App.jsx`;
- `frontend/src/pages/VenuesAdminPage.jsx`;
- novo `frontend/src/pages/VenueAdminDetailPage.jsx`;
- `frontend/src/services/events.service.js`;
- `frontend/src/hooks/useEventsQuery.js`;
- estilos próprios da ficha;
- `frontend/src/pages/VenueDetailFlowPage.jsx`;
- `frontend/src/pages/VenueMenuPage.jsx`;
- componentes de fallback/feedback já existentes, quando compatíveis.

### Queries e cache

Criar chaves específicas:

```text
["admin-venue-overview", venueId]
["admin-venue-visibility-impact", venueId]
```

Após publicação, pausa ou reativação, invalidar no cliente administrativo:

- `admin-venue-overview` da casa;
- `admin-venue-visibility-impact` da casa;
- todas as variantes de `venues`;
- todas as variantes de `events`;
- menu público e gerenciado da casa;
- consultas administrativas de operações relacionadas;
- Radar e Pela Hora da sessão atual, se já carregados.

Não usar atualização otimista para a visibilidade na primeira versão. A ficha deve esperar a confirmação do servidor e então atualizar caches.

### Sessões existentes

- não alterar tokens ou dados de autenticação;
- não exigir novo login;
- não adicionar visibilidade ao token;
- uma sessão já aberta recebe a nova regra na próxima consulta/refetch;
- como o catálogo público usa `staleTime: 0` e refetch por foco/reconexão, a retirada tende a ocorrer na próxima atualização;
- a resposta da mutação deve causar atualização imediata no cliente administrativo;
- não armazenar motivo ou estado administrativo em `localStorage`.

---

## 15. Fases de implementação

## Fase 0 — Baseline e proteção do trabalho existente

### Critério de entrada

- plano lido integralmente;
- autorização do usuário para iniciar implementação;
- worktree inspecionada.

### Tarefas

- [x] registrar branch, commit-base e arquivos não rastreados;
- [x] executar suíte atual do backend antes de alterar código;
- [x] executar build atual do frontend antes de alterar código;
- [x] registrar falhas preexistentes separadamente;
- [ ] capturar estado visual da lista de casas em desktop e mobile;
- [ ] confirmar manualmente os comportamentos atuais de admin, produtor e gestor;
- [ ] confirmar que uma casa com eventos não pode ser excluída;
- [ ] confirmar que `Remover da carteira` não exclui a casa;
- [x] conferir status das migrações Prisma sem aplicar reset.

### Critério de saída

- baseline documentada e reproduzível;
- nenhuma falha nova atribuída à tarefa.

---

## Fase 1 — Fundação aditiva de dados

### Critério de entrada

- Fase 0 concluída.

### Tarefas

- [x] criar enum e campos de visibilidade;
- [x] criar índice após validar consultas;
- [x] criar nova migração aditiva;
- [x] garantir backfill de casas existentes como `published`;
- [x] atualizar Prisma Client;
- [x] tornar explícito o estado nos três caminhos de criação;
- [x] criar serviço central de elegibilidade;
- [x] criar testes unitários das transições e condições públicas;
- [x] não alterar ainda a interface de Settings.

### Testes

- [x] migração em banco local preserva contagem e IDs das casas;
- [x] todos os registros antigos ficam publicados;
- [ ] seed continua idempotente conforme comportamento anterior;
- [x] aquisição cria rascunho;
- [x] criação manual administrativa continua pública;
- [ ] suíte preexistente passa.

### Critério de saída

- modelo aditivo validado e nenhum comportamento público existente alterado para as casas antigas.

---

## Fase 2 — Separação público/administrativo e filtros centrais

### Critério de entrada

- Fase 1 concluída e migração testada localmente.

### Tarefas

- [x] separar payload público, gerenciado e administrativo;
- [x] aplicar casa publicada na lista pública;
- [x] aplicar casa publicada no detalhe público;
- [x] aplicar regra aos eventos públicos e detalhes diretos;
- [x] aplicar regra ao cardápio público e interações;
- [x] aplicar regra a artistas e EPK;
- [x] aplicar regra a Pela Hora e compartilhamentos;
- [x] aplicar regra a Radar e lembretes;
- [x] aplicar regra à exportação de agenda pública;
- [x] aplicar regra aos slots de Ads dependentes de casa;
- [x] preservar todas as consultas administrativas;
- [x] garantir que a regra seja no servidor.

### Testes

- [ ] matriz `draft/published/paused` por endpoint;
- [ ] visitante anônimo não acessa casa pausada;
- [ ] usuário comum não acessa casa pausada;
- [ ] admin continua acessando internamente;
- [ ] produtor/gestor autorizado continua preparando eventos;
- [ ] evento confirmado de casa pausada não vaza por nenhum canal público;
- [ ] história passada permanece;
- [ ] contatos não são adicionados a payload público novo.

### Critério de saída

- nenhuma entidade pausada ou em rascunho é entregue como catálogo público; operação interna permanece íntegra.

---

## Fase 3 — API administrativa e auditoria

### Critério de entrada

- Fase 2 concluída.

### Tarefas

- [x] criar endpoint de overview administrativo;
- [x] criar endpoint de impacto;
- [x] criar endpoint de visibilidade;
- [x] validar estado esperado e transição;
- [x] tornar a mutação idempotente;
- [x] cancelar lembretes pendentes na pausa;
- [x] registrar auditoria na mesma unidade transacional;
- [x] usar somente códigos minimizados no log;
- [x] impedir alteração de visibilidade pelo endpoint genérico de edição;
- [ ] validar respostas 400, 403, 404, 409 e 200 em chamadas HTTP reais.

### Testes

- [ ] autorização por papel;
- [ ] ID inválido;
- [ ] casa inexistente;
- [ ] transição inválida;
- [ ] concorrência com `expectedStatus`;
- [ ] repetição da mesma requisição;
- [ ] rollback da transação em falha de auditoria;
- [ ] cancelamento de lembretes;
- [ ] não alteração de eventos, menu, vínculos e campanhas.

### Critério de saída

- API administrativa segura, auditável e testada, ainda sem depender da nova interface.

---

## Fase 4 — Ficha administrativa isolada

### Critério de entrada

- Fase 3 concluída.

### Tarefas

- [x] criar serviço e hook de overview;
- [x] criar rota protegida;
- [x] criar página isolada;
- [x] criar CSS prefixado;
- [x] implementar cabeçalho e selo;
- [x] implementar seções de leitura;
- [x] implementar estados vazio, erro, 403 e 404;
- [x] implementar links de volta, editar, cardápio, eventos e perfil público;
- [ ] validar refresh e deep link em navegador autenticado;
- [x] evitar qualquer alteração no formulário existente nesta subetapa.

### Testes e QA

- [x] build de produção;
- [ ] desktop amplo;
- [ ] tablet;
- [ ] mobile estreito;
- [ ] zoom a 200%;
- [ ] teclado;
- [ ] leitor de tela/nomes acessíveis;
- [ ] casa completa;
- [ ] casa sem imagem;
- [ ] casa sem eventos;
- [ ] casa sem menu;
- [ ] casa pausada;
- [ ] casa em rascunho.

### Critério de saída

- administrador consulta a casa sem entrar no formulário e sem regressão visual em outras telas.

---

## Fase 5 — Integração segura com lista e edição

### Critério de entrada

- Fase 4 concluída.

### Tarefas

- [x] adicionar selo na listagem administrativa;
- [x] adicionar `Ver casa`;
- [x] preservar busca, ordenação, paginação e CSV;
- [x] remover exclusão comum somente para admin;
- [x] preservar ação do produtor;
- [x] conectar `Editar dados` ao formulário atual por parâmetro seguro;
- [x] remover parâmetro ao cancelar/salvar;
- [x] evitar carregamento duplicado;
- [x] preservar preferências e seção ativa.

### Testes

- [ ] admin abre ficha e volta à lista;
- [ ] admin abre edição e salva;
- [ ] produtor mantém carteira e justificativa de alteração;
- [ ] gestor mantém seu fluxo de perfil;
- [ ] paginação e busca preservam comportamento;
- [ ] URL direta de edição inválida não preenche formulário parcialmente.

### Critério de saída

- nova navegação integrada sem reescrever ou duplicar o formulário.

---

## Fase 6 — Pausa, publicação e reativação na interface

### Critério de entrada

- Fase 5 concluída.

### Tarefas

- [x] criar hook de impacto;
- [x] criar mutação de visibilidade;
- [x] criar modal acessível de pausa;
- [x] criar confirmação de publicação;
- [x] criar confirmação de reativação;
- [x] bloquear duplo clique;
- [x] tratar concorrência 409 com refetch;
- [x] manter ficha aberta no sucesso;
- [x] exibir feedback persistente e região de status;
- [x] invalidar caches relacionados;
- [ ] validar comportamento sem rede e em erro do servidor.

### Testes ponta a ponta

- [ ] pausar casa publicada;
- [ ] atualizar Explorar e confirmar retirada;
- [ ] testar link direto da casa e de evento;
- [ ] confirmar retirada de menu, Radar, Pela Hora, EPK e agenda pública;
- [ ] confirmar preservação no administrativo;
- [ ] reativar e confirmar retorno de eventos futuros válidos;
- [ ] publicar casa em rascunho;
- [ ] confirmar que lembretes cancelados não são recriados silenciosamente.

### Critério de saída

- ciclo completo de visibilidade funciona com feedback claro e sem perda de dados.

---

## Fase 7 — Exclusão protegida

### Critério de entrada

- Fase 6 concluída.

### Tarefas

- [x] criar/usar prévia de impacto da exclusão;
- [x] criar área de risco;
- [x] exigir nome exato;
- [x] preservar bloqueios do servidor;
- [x] preservar `Remover da carteira` do produtor;
- [x] registrar auditoria de exclusão concluída;
- [x] tratar dependência criada entre prévia e confirmação;
- [x] validar que nenhuma exclusão em cascata nova foi adicionada.

### Testes

- [ ] casa com evento não pode ser excluída em chamada HTTP real;
- [x] nome incorreto não habilita confirmação;
- [x] produtor remove somente seu acesso;
- [x] gestor não exclui;
- [ ] admin exclui apenas casa realmente sem dependências em banco local;
- [x] erro mantém modal aberto com mensagem útil.

### Critério de saída

- exclusão deixa de ser uma ação casual sem mudar sua regra estrutural.

---

## Fase 8 — Regressão completa e homologação

### Tarefas

- [x] executar toda a suíte do backend;
- [x] executar build de produção do frontend;
- [ ] revisar diff completo por arquivo;
- [ ] buscar usos de `Venue`, `venueId` e consultas de eventos novamente;
- [ ] confirmar que nenhum consumidor público foi esquecido;
- [ ] executar smoke de login e sessão existente;
- [ ] executar smoke de criação/edição de casa;
- [ ] executar smoke de criação/publicação de evento;
- [ ] executar smoke de reivindicação e assinatura;
- [ ] executar smoke de cardápio;
- [ ] executar smoke de Ads;
- [ ] executar smoke de Radar e Pela Hora;
- [ ] executar smoke de aquisição e conversão;
- [ ] testar localhost em desktop e mobile;
- [ ] registrar evidências.

### Critério de saída

- nenhuma regressão conhecida; matriz de aceite integralmente aprovada.

---

## Fase 9 — Commit e lançamento controlado

### Pré-condições

- autorização explícita para commit;
- autorização explícita para push/deploy;
- Fase 8 concluída;
- migração revisada e não destrutiva.

### Estratégia de commits sugerida

1. `feat: add venue visibility foundation and public eligibility`
2. `feat: add administrative venue overview`
3. `feat: add governed venue visibility actions`

Não misturar arquivos alheios à tarefa.

### Ordem de produção

- [ ] verificar migrações pendentes e drift;
- [ ] registrar contagem/IDs/estado das casas antes da migração;
- [ ] publicar fundação aditiva;
- [ ] confirmar todas as casas antigas como `published`;
- [ ] confirmar saúde do backend;
- [ ] testar catálogo público sem usar pausa;
- [ ] publicar interface;
- [ ] usar uma casa controlada de homologação;
- [ ] pausar e validar todos os canais públicos;
- [ ] reativar e validar retorno;
- [ ] monitorar erros, 404/409 e lembretes;
- [ ] liberar uso normal somente após smoke aprovado.

### Rollback operacional

- desabilitar as ações novas na interface, se necessário;
- manter o servidor respeitando estados `paused` e `draft`;
- não remover enum ou colunas em rollback emergencial;
- não tornar casas pausadas públicas para simplificar retorno;
- corrigir por deploy posterior e migração aditiva, se necessário;
- preservar auditoria e estados já registrados.

---

## 16. Testes obrigatórios consolidados

### Banco e migração

- [ ] quantidade de casas preservada;
- [ ] IDs e slugs preservados;
- [ ] casas existentes publicadas;
- [ ] migração reversível operacionalmente sem `reset`;
- [ ] nova criação com estado explícito.

### Autorização e segurança

- [ ] usuário anônimo não acessa endpoints administrativos;
- [ ] usuário comum recebe 403;
- [ ] produtor/gestor não alteram visibilidade;
- [ ] admin altera;
- [ ] payload público não ganha contatos ou metadados internos;
- [ ] razão de pausa não aparece em resposta pública;
- [ ] IDOR testado com casas diferentes;
- [ ] dupla submissão e repetição são seguras.

### Regras públicas

- [ ] casa rascunho não aparece;
- [ ] casa publicada aparece;
- [ ] casa pausada não aparece;
- [ ] evento confirmado só aparece se casa publicada;
- [ ] cardápio só aparece se casa publicada;
- [ ] EPK e perfil de artista não expõem próximos eventos pausados;
- [ ] Pela Hora não seleciona eventos pausados;
- [ ] compartilhamento público não vaza evento pausado;
- [ ] Ads de contexto da casa retornam no-fill;
- [ ] link direto não revela motivo interno.

### Preservação operacional

- [ ] casa pausada continua editável internamente;
- [ ] eventos continuam no banco com os mesmos estados;
- [ ] recorrências permanecem;
- [ ] menu permanece;
- [ ] acessos permanecem;
- [ ] reivindicações permanecem;
- [ ] analytics e histórico permanecem;
- [ ] sessões permanecem válidas;
- [ ] campanhas não são apagadas nem encerradas.

### Interface

- [ ] ficha não abre formulário automaticamente;
- [ ] selo não depende apenas de cor;
- [ ] ações corretas por estado;
- [ ] feedback de sucesso e erro;
- [ ] modal fecha por Cancelar e Escape;
- [ ] foco retorna ao botão de origem;
- [ ] mobile sem sobreposição com navegação;
- [ ] estilos não alteram cards públicos ou Radar;
- [ ] exclusão não aparece como ação comum do admin;
- [ ] produtor mantém `Remover da carteira`.

---

## 17. Registro de riscos

| Risco | Probabilidade | Impacto | Mitigação obrigatória |
|---|---:|---:|---|
| Casa pausada continuar aparecendo por evento | alta sem centralização | crítico | filtro no servidor e matriz de endpoints |
| Lembrete ser enviado após pausa | média | alto | cancelamento transacional e revalidação no worker |
| Mudança no CSS afetar cards públicos | alta se usar classe genérica | alto | página e CSS prefixados |
| Alteração do monólito administrativo quebrar outros módulos | média | alto | nova página isolada e integração mínima |
| Produtor excluir casa ao invés de remover vínculo | baixa, mas grave | crítico | preservar branch de papel e testes dedicados |
| Contatos vazarem no payload público | média | alto | serializações separadas e testes de contrato |
| Migração esconder casas existentes | baixa com backfill | crítico | default/backfill publicado e verificação de contagem |
| Aquisição publicar casa prematuramente | já existente | alto | criar convertidas como `draft` |
| Reativação recriar notificações indesejadas | média | médio | não recriar automaticamente na V1 |
| Estado concorrente sobrescrito | média | médio | `expectedStatus` e resposta 409 |
| Pausa alterar status de eventos | média em implementação ingênua | alto | regra de leitura; proibição explícita de mutação |
| Rollback tornar pausadas públicas | média | crítico | rollback apenas da UI; filtro do servidor permanece |
| Exclusão nova causar cascata | baixa | crítico | não alterar relações/cascatas; preflight e regressão |

---

## 18. Critérios globais de aceite

- [ ] O administrador consegue abrir uma ficha de leitura sem entrar no formulário.
- [ ] A ficha representa corretamente dados públicos, operação, agenda, cardápio, vínculos e visibilidade.
- [ ] Todas as casas existentes permanecem públicas após a migração.
- [ ] Casas de aquisição podem existir como rascunho real.
- [ ] Pausa é reversível e não destrói dados.
- [ ] Nenhum evento atual/futuro de casa pausada aparece em canal público.
- [ ] Nenhum lembrete de evento de casa pausada é enviado.
- [ ] Reativação devolve automaticamente apenas eventos confirmados ainda válidos.
- [ ] Sessões existentes não são encerradas.
- [ ] Produtores e gestores mantêm permissões e fluxos atuais.
- [ ] `Remover da carteira` mantém sua semântica.
- [ ] Exclusão administrativa deixa de ser uma ação comum e exige confirmação reforçada.
- [ ] Auditoria registra publicação, pausa, reativação e exclusão sem dados sensíveis desnecessários.
- [ ] A interface funciona em desktop, tablet, mobile, teclado e leitor de tela.
- [ ] Build, testes e smoke de todos os fluxos relacionados passam.
- [ ] Rollback operacional foi compreendido e não exige apagar dados ou editar migração aplicada.

---

## 19. Arquivos que devem ser revalidados imediatamente antes de implementar

### Backend

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.js`
- `backend/src/controllers/venues.controller.js`
- `backend/src/controllers/events.controller.js`
- `backend/src/controllers/venueMenus.controller.js`
- `backend/src/controllers/radar.controller.js`
- `backend/src/controllers/pelaHora.controller.js`
- `backend/src/controllers/artists.controller.js`
- `backend/src/controllers/artistEpk.controller.js`
- `backend/src/controllers/operations.controller.js`
- `backend/src/controllers/regions.controller.js`
- `backend/src/controllers/acquisition.controller.js`
- `backend/src/controllers/ads.controller.js`
- `backend/src/controllers/analytics.controller.js`
- `backend/src/controllers/audience.controller.js`
- `backend/src/controllers/history.controller.js`
- `backend/src/services/eventReminder.service.js`
- `backend/src/services/privacyExport.service.js`
- `backend/src/services/audit.service.js`
- `backend/src/lib/access.control.js`
- `backend/src/routes/index.js`

### Frontend

- `frontend/src/App.jsx`
- `frontend/src/pages/VenuesAdminPage.jsx`
- `frontend/src/pages/VenueDetailFlowPage.jsx`
- `frontend/src/pages/VenueMenuPage.jsx`
- `frontend/src/pages/VenueOperatorDashboardPage.jsx`
- `frontend/src/pages/ExplorePage.jsx`
- `frontend/src/pages/EventDetailPage.jsx`
- `frontend/src/pages/ProducerDashboardPage.jsx`
- `frontend/src/pages/VenueClaimDirectoryPage.jsx`
- `frontend/src/services/events.service.js`
- `frontend/src/hooks/useEventsQuery.js`
- `frontend/src/components/layout/BottomNav.jsx`
- `frontend/src/styles/globals.css`

### Testes relacionados existentes

- `backend/tests/venue-menu-foundation.test.js`
- `backend/tests/settings-management-hub.test.js`
- `backend/tests/event-poster-feed.test.js`
- `backend/tests/claim-form-consistency.test.js`
- `backend/tests/claim-formal-access-gate.test.js`
- `backend/src/services/eventReminder.service.test.js`

Criar testes novos e focados para visibilidade; não depender somente de testes estáticos de presença de texto.

---

## 20. Histórico de execução

### 06/09/2026 — criação do plano

- Consolidada a necessidade de ficha administrativa separada do formulário.
- Confirmada a ausência de estado de visibilidade em `Venue`.
- Registrada a centralidade da regra de publicação no servidor.
- Registrados os impactos em catálogo, eventos, cardápio, Radar, Pela Hora, lembretes, artistas, Ads, aquisição, analytics e operações.
- Definidos os estados `draft`, `published` e `paused`.
- Definida a preservação integral de dados durante a pausa.
- Definido que a exclusão física não será substituída por soft delete nesta versão.
- Nenhum código, migração, commit, push ou deploy desta feature foi realizado.

### 06/09/2026 — Fase 0 — baseline técnico concluído; validação manual pendente

- **Estado anterior:** branch `main`, commit-base `56a1856473a77eba97ba742f48b4b77f3f896d57` (`fix: apply pending migrations during production startup`). Arquivos não rastreados preservados: o próprio plano, o arquivo temporário `docs/~$nual_de_Ingresso_77Gira_Casas_Produtores_Artistas.docx` e `remotion/`.
- **Baseline do backend:** `npm.cmd run test` executado antes de alterações. Resultado: 259 testes aprovados e 4 falhas preexistentes em três arquivos: dois mocks incompletos em `tests/ads.payments.test.js`, seletor de layout de Ads em `tests/explore-ad-placement-layout.test.js` e versão textual esperada em `tests/product-copy.test.js`. Elas não pertencem a esta feature e não serão corrigidas neste escopo.
- **Baseline do frontend:** `npm.cmd run build` concluído com sucesso (Vite, 2.639 módulos).
- **Evidência visual:** sessão administrativa em produção, `Settings > Casas`, consultada sem editar dados. A lista apresentava 8 casas e, em cada cartão, apenas os caminhos `Cardápio`, `Editar` e `Excluir`; não existe ficha administrativa nem ação de pausar/publicar. Ainda faltam a captura mobile e os cenários manuais autenticados de produtor/gestor.
- **Papéis e exclusão:** os contratos vigentes foram conferidos no controlador: administrador usa exclusão física apenas quando não há eventos vinculados; produtor remove somente seu `ProducerVenueAccess`; gestor não pode excluir. Isso preserva a distinção que a feature não pode romper. A confirmação visual autenticada dos papéis profissionais será repetida na Fase 8, antes de qualquer publicação.
- **Migrações:** `npx.cmd prisma migrate status` informou 61 migrações e schema local em sincronia. Nenhum reset, migração ou alteração de dados foi executado.
- **Decisão:** a fundação pode ser preparada de forma exclusivamente aditiva e sem alterar qualquer comportamento ativo. As quatro confirmações manuais acima permanecem obrigatórias antes da publicação, na Fase 8. Migrações serão criadas, mas não aplicadas sem autorização específica.

### 06/09/2026 — Fase 1 — fundação aplicada localmente e dados preservados

- **Arquivos alterados:** `backend/prisma/schema.prisma`, `backend/prisma/seed.js`, `backend/src/controllers/venues.controller.js`, `backend/src/controllers/acquisition.controller.js`, `backend/src/services/venueVisibility.service.js`, `backend/src/services/venueVisibility.service.test.js` e a nova migração `backend/prisma/migrations/20260906170000_venue_visibility_foundation/migration.sql`.
- **Fundação criada:** enum `VenueVisibilityStatus` com `draft`, `published` e `paused`; campos `visibilityStatus` e `visibilityChangedAt`; índice composto por visibilidade, região e nome. A migração é somente aditiva: a coluna obrigatória tem padrão `published`, portanto não reclassifica nem remove casas existentes.
- **Caminhos explícitos:** criação manual administrativa e seed definem `published`; conversão de aquisição define `draft`, fazendo o comportamento descrito pela tela finalmente corresponder ao banco.
- **Regra central:** criado o serviço puro de elegibilidade pública e transições permitidas. Ele ainda não foi ligado aos endpoints públicos — isso pertence à Fase 2, após validar a migração.
- **Testes executados:** `npm.cmd run prisma:generate` concluído; `npx.cmd vitest run src/services/venueVisibility.service.test.js` passou (3 testes); `git diff --check` não encontrou erro de whitespace.
- **Migração aplicada:** sim, após autorização explícita do usuário. `npm.cmd run prisma:migrate:deploy` aplicou a 62ª migração sem reset. Antes e depois, a consulta de controle preservou 9 casas e todos os respectivos IDs; todas ficaram com `visibilityStatus = published` e `visibilityChangedAt = null`, como previsto pelo backfill aditivo.
- **Verificação adicional:** `npx.cmd prisma migrate status` confirmou schema local em sincronia. Uma criação de teste dentro de transação confirmou que uma casa em `draft` não satisfaz o filtro público; a transação foi revertida e não deixou registro persistente.
- **Decisão:** a Fase 2 foi autorizada porque a migração não ocultou nem removeu casas existentes. A idempotência do seed continua pendente de validação separada, pois o seed normal é destrutivo e não deve ser usado contra a base local de trabalho.

### 06/09/2026 — Fases 2 a 6 — implementação técnica concluída; homologação manual pendente

- **Escopo concluído no servidor:** payload público separado do administrativo; filtros centrais para casas `published` no catálogo, detalhe, eventos, cardápio, artistas/EPK, Pela Hora, Radar, lembretes e entrega de Ads dependente de casa. Os caminhos internos de administração, produtor e gestor foram preservados. Uma casa pausada não tem seus eventos, vínculos, cardápio, campanhas ou histórico apagados; na pausa, somente lembretes futuros pendentes são cancelados.
- **API administrativa:** foram adicionados overview, prévia de impacto e mudança de visibilidade sob rotas exclusivas de administrador. A mudança valida transição e estado esperado, é idempotente, registra auditoria mínima na mesma transação e retorna 409 quando outra sessão alterou o estado antes da confirmação.
- **Interface concluída:** criada ficha administrativa em rota isolada, com visualização de dados, selo textual de estado, acesso ao formulário já existente, perfil público e cardápio. A listagem administrativa recebeu `Ver casa`, selo e filtro de visibilidade. A exclusão deixou de aparecer como ação comum do administrador; o fluxo do produtor continua sendo `Remover da carteira`.
- **Pausa e reativação:** modal acessível com motivo obrigatório de pausa, prévia de impacto, cancelamento, Escape, foco de confirmação, bloqueio contra duplo envio, mensagem persistente de resultado e tratamento de concorrência. A reativação não recria lembretes cancelados.
- **Testes executados:** build de produção do frontend passou (2.641 módulos). A bateria focada passou integralmente: 6 arquivos, 19 testes. A suíte completa do backend teve 272 testes aprovados e as mesmas 4 falhas já registradas no baseline, sem falha nova atribuída a esta feature.
- **Pendências obrigatórias antes de publicar:** smoke autenticado em desktop e mobile; verificação visual com casa completa/vazia/pausada/rascunho; testes HTTP reais de autorização, 403/404/409 e rollback transacional; e a Fase 7, de exclusão definitiva com confirmação reforçada. Nenhum commit, push ou deploy foi realizado.

### 06/09/2026 — Fase 7 — exclusão definitiva protegida implementada; validação com casa descartável pendente

- **Separação de responsabilidades:** a rota antiga `DELETE /venues/:id` foi preservada para o produtor remover exclusivamente seu próprio acesso. Para administradores, ela agora recusa exclusão direta e indica a confirmação reforçada; a exclusão física só ocorre pela nova rota administrativa protegida.
- **Prévia e bloqueio:** a ficha solicita uma prévia administrativa que contabiliza eventos, acessos de produtor e gestor, reivindicações, histórico de Ads, cardápio e conversão de aquisição. Havendo qualquer vínculo, a exclusão é bloqueada — inclusive quando o banco permitiria cascata para algum relacionamento.
- **Confirmação:** a interface exige que o administrador digite exatamente o nome da casa. A mesma verificação e a contagem de vínculos são repetidas dentro da transação de exclusão; uma dependência criada durante a confirmação é devolvida como conflito, sem apagar registro nem auditoria.
- **Auditoria:** em exclusão efetiva, é gravado apenas o código de confirmação e a contagem zero de vínculos, sem contato, endereço ou outra informação desnecessária da casa.
- **Testes executados:** build de produção do frontend passou. A bateria dirigida passou integralmente: 5 arquivos, 16 testes. Permanecem obrigatórios os testes HTTP reais de casa com eventos e de uma casa de homologação sem nenhum vínculo; esses testes não serão feitos usando uma casa operacional.

### 06/09/2026 — Fase 8 — regressão técnica e homologação não autenticada iniciadas

- **Serviços locais:** backend local iniciado e respondeu `200` em `GET /api/venues`. A interface final havia compilado com sucesso antes da tentativa de prévia; posteriormente, o esbuild/Vite passou a apresentar falha de leitura do diretório do OneDrive também ao iniciar a prévia. A prévia aberta não foi considerada evidência de comunicação com o backend local porque a configuração local existente aponta para um endereço de rede. Nenhuma configuração, cache ou dependência foi apagada ou reescrita para contornar esse problema.
- **Contrato público verificado em execução:** `GET /api/venues` retornou 9 casas e o payload não contém `visibilityStatus`, `contactName` nem dados administrativos. Isso confirma, na execução local, a separação de serialização pública.
- **Proteção administrativa verificada em execução:** chamada sem sessão a `GET /api/admin/venues/:id/overview` retornou `401`, sem expor a ficha administrativa.
- **Revisão de consumidores:** a busca final por consultas de `Venue`/`venueId` confirmou os filtros centrais nos canais públicos modificados. Histórico de presenças permanece deliberadamente histórico; reivindicações, analytics e público profissional continuam protegidos por autenticação e escopo, não são canais públicos de catálogo.
- **Suíte completa:** 275 testes aprovados. Persistem apenas as 4 falhas preexistentes de mocks de pagamentos Ads, seletor de layout Ads e expectativa textual antiga da política de privacidade. Nenhuma falha nova foi introduzida pela ficha ou visibilidade de casas.
- **Bloqueio de homologação autenticada:** o navegador local não possui sessão e redireciona para o onboarding. Não foram usadas credenciais, simulações de login, exclusões nem alterações de dados reais. Permanecem pendentes os smoke tests autenticados, a validação mobile e a casa descartável sem vínculos.

### 06/09/2026 — correção durante homologação e alinhamento visual administrativo

- **Erro corrigido:** a ficha administrativa retornava `500` porque o cálculo de impacto consultava entregas pendentes de Ads como `pendingDeliveries`, mas tentava devolver uma variável inexistente. O retorno passou a usar explicitamente `pendingAdDeliveries: pendingDeliveries`; foi acrescentado teste de regressão e o backend reiniciou sem erro.
- **Evidência:** após autenticação local, a chamada de overview deixou de falhar pelo erro de referência. A bateria relacionada passou com 11 testes em 3 arquivos.
- **Interface:** a ficha deixou de usar as superfícies brancas de Operações e passou a respeitar os tokens do modo administrativo: fundo azul-grafite, superfícies escuras, contraste claro, bordas discretas, ações semânticas e modais escuros. O CSS permanece exclusivo de `.venue-admin-detail`, sem alterar catálogo público ou Radar.
- **Correção de contraste:** a regra global de links do administrador sobrepunha a cor do botão `Editar dados`. O seletor da ação primária passou a ter precedência própria e mantém texto e ícone escuros sobre a superfície clara. Build aprovado após a correção.
- **Verificação:** build do frontend passou após a alteração visual. A checagem estética final em desktop e mobile continua pendente de apreciação no localhost autenticado.

### Modelo para os próximos registros

```text
Data:
Fase:
Estado anterior:
Arquivos alterados:
Migração criada/aplicada:
Testes executados:
Resultado:
Evidência visual:
Riscos ou desvios encontrados:
Decisão tomada:
Commit:
Push/deploy:
Próxima etapa autorizada:
```

---

## 21. Regra final de interrupção

Interromper a implementação e retornar ao planejamento se ocorrer qualquer uma destas situações:

- uma casa existente seria ocultada pela migração sem decisão administrativa;
- for necessário alterar ou resetar dados existentes;
- a pausa exigir mudar `Event.status`;
- a única forma encontrada de filtrar for no frontend;
- um papel profissional perder acesso que possui hoje;
- `Remover da carteira` passar a compartilhar a exclusão administrativa;
- um endpoint público precisar receber dados administrativos;
- uma alteração de CSS genérico afetar telas fora da ficha;
- uma migração aplicada precisar ser editada;
- os testes de sessão, evento, cardápio, reivindicação, Radar, Pela Hora ou Ads falharem;
- o rollback depender de tornar casas pausadas públicas.

Nesses casos, registrar o ponto exato neste documento antes de propor qualquer solução alternativa.
