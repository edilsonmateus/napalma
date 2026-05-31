# Bloco 1 — Inventário de Textos Visíveis ao Usuário

Data: 2026-05-31  
Escopo: Frontend (textos exibidos para usuários em web/mobile/PWA)

## 1) Rotas públicas e de uso geral

### `/explore` — Explorar
- Header: marca/logo + conceito.
- Filtros: `Hoje`, `Semana`, `Ao vivo (N)`, `Todas`, regiões.
- Busca e ações: placeholder de busca, botão calendário, `Limpar filtros`.
- Estado de filtro: `Filtro ativo: ...`.
- Sumário: `X sambas visiveis`, `Escopo: ...`, `Modo ao vivo/Modo geral`.
- Estados:
  - loading (skeleton),
  - erro (`Nao foi possivel carregar os sambas agora.`),
  - vazio (`Sem eventos para este filtro no momento.` etc.).
- Grupos de data: `Hoje`, `Amanha`, `sem data`.
- Card de casa/evento:
  - nome da casa,
  - bairro/região,
  - label de próxima atração,
  - título do evento,
  - tempo de início (`Começa às ...`) ou ao vivo (`Tá rolando`, `termina às ...`),
  - badges de audiência.
- Ações de rota: `Partiu Agora!`, ícones Maps/Waze/Uber, `Voltar`.
- Placeholder de coluna: `Mais samba chegando`, mensagens auxiliares.

### `/events/:id` — Detalhe do evento
- Nome/título do evento e preço.
- Endereço e data/hora.
- Badges (ex.: público).
- CTA Radar (`Acho que eu vou` / `Marcado no seu Radar`).
- Compartilhamento:
  - campo mensagem,
  - botões de share,
  - bloco QR/mais opções.

### `/venues/:id` — Detalhe da casa
- Nome da casa, descrição, endereço/localização.
- `Funciona: ...`.
- CTA de rota/modal.
- Lista de próximas atrações.

### `/radar` — Meu Radar
- Título/subtítulo.
- Filtros por região.
- Cards de eventos salvos.
- Ações pós-evento (`Eu fui!`, `Não fui`) quando aplicável.

### `/history` — Histórico
- Título/subtítulo.
- Lista de eventos frequentados.
- Conquistas/progresso.

### `/pela-hora` — Pela Hora
- Título/subtítulo.
- Bloco “como funciona”.
- Passo 1 e Passo 2.
- Lista de seleção de eventos.
- `Salvar plano do dia`.
- Planos salvos + timeline e ações de rota.

### `/settings`
- Título `Configurações`.
- Bloco `Sua conta`.
- Itens: `Privacidade`, `Ajuda`, `Avaliar`, `Termos de uso`, `Sobre`.
- Botões: instalar/compartilhar/QR.
- CTA de login/cadastro.
- Rodapé legal (`77Gira v1.0.0` + texto institucional).

### `/login`
- Título/subtítulo de entrada.
- Form e placeholders.
- Ações: `Entrar`, `Criar conta`, `Continuar sem conta`.
- Bloco instalar/compartilhar/QR.
- Mensagem legal com links de termos/privacidade.
- Rodapé legal.
- Observação: modo teste exibe chips de contas demo.

### `/signup`
- Título/subtítulo de criação de conta.
- Form de cadastro e mensagens de validação/erro/sucesso.
- CTA de retorno/login.

### `/onboarding`
- 3 telas com título e subtítulo.
- Indicadores e CTA final.

## 2) Páginas institucionais

- `/privacy` — Política de privacidade.
- `/terms` — Termos de uso.
- `/help` — Ajuda/FAQ/canais.
- `/about` — Sobre a plataforma.

## 3) Áreas administrativas (UI de operação)

### Admin geral (`/settings/venues`)
- Header por perfil.
- Menu lateral: visão geral, casas, artistas, regiões, produtores, reivindicações, eventos.
- KPIs, filtros, listagens, formulários CRUD.
- Mensagens de permissão, erro, sucesso e estados vazios.

### Publicidade (`/settings/ads`)
- Painel de métricas e campanhas.
- Labels de status, tabela/lista, alertas e ações.

### Produtor (`/settings/producer`)
- Header por perfil.
- Menu lateral próprio.
- Reivindicação de carteira e status.
- CRUD autorizado de entidades vinculadas.

### Casa (`/settings/house` / agenda)
- Header por perfil.
- Unidade ativa.
- Menu lateral (visão geral, eventos, dados, produtores, solicitar acesso).
- CRUD de eventos da casa.
- Cards de solicitação e zona de perigo.

## 4) Componentes transversais

- BottomNav (Explorar, Pela Hora, Meu Radar, Histórico, Config).
- Toasts/feedbacks.
- Badges (verificado, gold partner, ao vivo etc.).
- Modais de confirmação/perigo.

## 5) Chaves legadas de texto/namespace percebidas

- Há termos legados com `napalma` em localStorage/keys e alguns textos sem acento.
- O rename visível já evoluiu para `77Gira`, mas ainda existem pontos para padronização final.

## 6) Prioridade para revisão textual (alto impacto)

1. Explorar (maior volume e frequência de contato).  
2. Login/Configurações (aquisição e retenção).  
3. Detalhe de evento e casa (conversão e rota).  
4. Pela Hora (engajamento avançado).  
5. Admin/Casa/Produtor (operação diária).

