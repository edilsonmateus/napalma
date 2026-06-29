# Instruções ao ChatGPT para replanejar o módulo 77GiraADS

## 1. Sua missão

Você receberá, junto destas instruções, o documento conceitual `77GiraADS_Documento_Base_Produto_Arquitetura.md`.

Sua tarefa **não é escrever código** e também **não é tratar o documento conceitual como se o sistema ainda fosse começar do zero**.

Você deverá:

1. Ler integralmente o documento conceitual do 77GiraADS.
2. Confrontar suas propostas com a realidade técnica descrita neste briefing.
3. Identificar o que já existe, o que deve evoluir, o que deve ser descartado e o que precisa ser introduzido.
4. Reorganizar a proposta em etapas pequenas, migráveis, testáveis e reversíveis.
5. Produzir, ao final, um **prompt mestre de implementação para o Codex**, pronto para ser usado no repositório real do 77Gira.

O prompt final deverá orientar o Codex a inspecionar o código antes de editar, implementar por fases, testar cada fase e preservar compatibilidade com produção.

---

## 2. Regra central: não redesenhe um sistema imaginário

O 77Gira é uma aplicação real, extensa, já implantada e em operação experimental. Ela possui frontend, backend, banco PostgreSQL, autenticação, painéis administrativos, publicidade, métricas, PWA, notificações e integrações em produção.

Portanto:

- não proponha uma reescrita completa;
- não crie um segundo módulo de publicidade paralelo ao existente;
- não duplique entidades que já existem sem demonstrar necessidade;
- não sugira troca de stack como premissa;
- não presuma TypeScript, Next.js, NestJS, microsserviços ou filas se isso não for indispensável;
- não altere contratos públicos existentes sem estratégia de compatibilidade;
- não recomende migração “big bang”;
- não presuma que tabelas possam ser apagadas ou recriadas;
- não use reset de banco como estratégia de desenvolvimento ou deploy.

O objetivo é **evoluir o módulo atual com segurança**, e não substituí-lo de uma só vez.

---

## 3. Stack real do projeto

### Frontend

- React com JSX;
- Vite;
- React Router;
- React Query;
- Zustand;
- CSS próprio e design system já consolidado;
- PWA;
- hospedagem na Vercel.

### Backend

- Node.js;
- Express;
- módulos ESM;
- Prisma ORM;
- PostgreSQL;
- JWT;
- Zod;
- hospedagem no Render.

### Perfis de acesso atuais

- `admin`;
- `producer`;
- `venue_manager`;
- `attendee`.

### Infraestrutura e cuidados reais

- o banco de produção já contém migrations e dados;
- deploy de migration deve usar `prisma migrate deploy`;
- `prisma migrate dev` é interativo e não deve ser usado em produção;
- o Render pode reiniciar instâncias e seu filesystem local não deve ser considerado armazenamento permanente;
- o frontend e o backend possuem variáveis de ambiente próprias;
- o CORS precisa preservar domínio de produção, previews autorizados e localhost de desenvolvimento;
- qualquer mudança deve preservar Vercel, Render, PostgreSQL e os fluxos atuais.

---

## 4. O que já existe no módulo de publicidade

O sistema atual não é apenas um placeholder. Já existe um módulo funcional de campanhas, criativos, entrega e métricas.

### 4.1 Entidades e enums existentes

#### `AdCampaignStatus`

- `draft`;
- `active`;
- `paused`;
- `ended`.

#### `AdSlot`

- `explore_feed_large`;
- `venue_detail_inline`;
- `radar_header`.

#### `AdEventType`

- `impression`;
- `click`.

#### `AdCampaign`

Já guarda, entre outros campos:

- anunciante em texto;
- nome da campanha;
- status;
- início e fim;
- prioridade;
- limite de frequência;
- opção de rodar em todos os slots;
- habilitação;
- targeting em JSON;
- autor da criação.

#### `AdCreative`

Já guarda:

- campanha;
- slot;
- título;
- URL da imagem;
- URL de destino;
- texto alternativo;
- largura e altura;
- habilitação.

#### `AdEventLog`

Já registra:

- impressão ou clique;
- campanha;
- criativo;
- slot;
- casa relacionada;
- usuário, quando identificado;
- sessão;
- user agent;
- hash de IP;
- data e hora.

### 4.2 Entrega atual

O backend já:

- filtra campanhas ativas;
- considera janela de início e fim;
- considera campanha e criativo habilitados;
- aplica frequency cap;
- seleciona uma entrega entre candidatos elegíveis;
- expõe endpoint público de delivery;
- registra impressão e clique;
- aplica rate limit nos endpoints de tracking.

### 4.3 Administração atual

Existe uma página administrativa de publicidade em `/settings/ads` com:

- visão geral;
- criação e gestão de campanhas;
- criação e gestão de criativos por slot;
- métricas;
- relatórios;
- atividade;
- cobertura por slot;
- resumo relacionado a casas.

Hoje, a gestão completa de publicidade é protegida por regra equivalente a `canManageAds`, restrita ao administrador.

### 4.4 Pontos de contato já integrados

Existem integrações no frontend para:

- feed Explorar;
- detalhe da casa, entre atrações;
- cabeçalho do Meu Radar.

O componente de entrega já lida com visualização, clique e tracking.

### 4.5 Relatórios existentes

O sistema já calcula ou expõe:

- impressões;
- cliques;
- CTR;
- métricas por campanha;
- métricas por slot;
- série diária;
- atividade;
- resumo para casa.

### 4.6 Upload atual

O upload atual usa filesystem local do backend/Render e aceita JPEG, PNG e WebP.

Isso é uma dívida técnica importante: arquivos de campanha precisam migrar para armazenamento persistente de objetos, como Cloudinary, S3 ou serviço equivalente, antes de uma operação comercial robusta.

---

## 5. Outras capacidades do 77Gira que afetam o 77GiraADS

O planejamento deve considerar que a plataforma já possui:

- casas, artistas, produtores e eventos;
- regiões e futura expansão por praças;
- perfis e permissões;
- Radar do usuário;
- histórico e presença;
- compartilhamento;
- rotas por Maps, Waze e Uber;
- analytics do produto;
- painel `Impacto 77Gira`;
- métricas de visualização, intenção e conversão;
- campanhas e espaços publicitários existentes;
- PWA;
- Service Worker;
- notificações push;
- modo `Tô na Pista`, com sessão temporária, localização e regras de sugestão;
- painéis de Admin, Casa e Produtor;
- aquisição comercial de casas.

O `Tô na Pista` já possui lógica sensível de consentimento, localização, janela ativa e push. Qualquer publicidade nesse canal deve ser tratada como etapa de alto risco, posterior à estabilização do núcleo do novo ADS.

---

## 6. Diferenças entre o documento conceitual e a realidade

O documento-base propõe elementos como:

- contas de anunciante;
- membros de conta;
- carteira e créditos/Patacos;
- hierarquia Campanha > Ad Set > Anúncio;
- inventário e placements mais amplos;
- revisão e aprovação;
- novos tipos de tracking;
- painel público do anunciante;
- segmentação geográfica e contextual;
- entrega patrocinada no `Tô na Pista`;
- monetização e cobrança.

Essas ideias podem ser válidas, mas o plano precisa resolver as sobreposições com o sistema atual.

### Correções obrigatórias ao documento-base

1. `AdCampaign`, `AdCreative` e `AdEventLog` já existem; não devem ser recriados com nomes diferentes.
2. Já existem slots de entrega; novos placements devem evoluir `AdSlot` ou uma camada compatível.
3. Já existe tracking de impressão e clique; um novo pipeline deve ampliar o existente.
4. Já existe uma interface administrativa; ela deve ser preservada e evoluída.
5. A arquitetura não começa com `AdvertiserAccount`, mas essa entidade pode ser adicionada gradualmente.
6. A hierarquia com `AdSet` não deve obrigar migração imediata de todas as campanhas atuais.
7. A carteira de créditos não deve bloquear a evolução inicial de targeting, revisão e relatórios.
8. Publicidade no `Tô na Pista` não deve ser a primeira etapa.
9. Upload comercial não deve continuar dependente do filesystem efêmero do Render.
10. O sistema precisa de feature flags, trilha de auditoria e rollback por fase.

---

## 7. Direção arquitetural recomendada

Use esta direção como hipótese principal e critique-a apenas se houver justificativa técnica clara.

### 7.1 Preservar e ampliar as tabelas existentes

- adicionar `AdvertiserAccount`;
- adicionar `AdvertiserMembership`;
- adicionar uma FK opcional de anunciante à `AdCampaign`;
- fazer backfill gradual das campanhas atuais;
- manter temporariamente o campo textual de anunciante para compatibilidade;
- só tornar a relação obrigatória quando dados e UI estiverem migrados.

### 7.2 Introduzir `AdSet` sem quebrar campanhas antigas

Se a hierarquia Campanha > Ad Set > Anúncio for aprovada:

- `AdSet` deve entrar inicialmente como camada opcional;
- campanhas existentes devem continuar funcionando sem Ad Set;
- pode existir um Ad Set padrão criado por backfill;
- APIs antigas precisam continuar respondendo durante a transição;
- a UI deve migrar por feature flag;
- nenhum criativo existente pode ficar órfão.

### 7.3 Evoluir tracking, não duplicá-lo

Preferir ampliar `AdEventLog` com campos como:

- `requestId`;
- `deliveryId`;
- motivo de no-fill;
- origem da entrega;
- contexto anonimizado;
- versão da regra de decisão;
- metadados mínimos para auditoria.

Não dividir impressão e clique em sistemas paralelos sem demonstrar benefício operacional e plano de migração.

### 7.4 Separar inventário de representação técnica

Definir um catálogo canônico de placements com:

- chave estável;
- canal;
- página;
- formato;
- dimensões recomendadas;
- proporção;
- disponibilidade desktop/mobile;
- elegibilidade;
- regras comerciais;
- prioridade;
- limites de frequência;
- fallback/no-fill.

O catálogo deve mapear os slots atuais, não ignorá-los.

### 7.5 Armazenamento persistente antes da escala comercial

Planejar migração de imagens para object storage com:

- upload assinado ou mediado pelo backend;
- validação de MIME real;

- limite de tamanho;
- dimensões e proporção;
- geração de variantes, quando necessário;
- URL persistente;
- remoção segura;
- fallback;
- política de retenção.

### 7.6 Revisão e aprovação

Introduzir estados claros para criativos/campanhas, por exemplo:

- rascunho;
- enviado para revisão;
- aprovado;
- rejeitado;
- pausado;
- encerrado.

Toda decisão deve guardar:

- autor;
- data;
- justificativa;
- versão analisada;
- alteração posterior que exija nova revisão.

### 7.7 Financeiro desacoplado da primeira entrega

Carteira, créditos, Patacos, gateway e cobrança devem ser planejados, mas não precisam bloquear:

- conta de anunciante;
- inventário;
- targeting;
- revisão;
- relatório;
- auditoria.

O plano deve mostrar claramente quando o financeiro passa a ser obrigatório para ativação de campanha.

---

## 8. Protocolo “Departamento do Vai Dar Problema”

O projeto usa uma abordagem deliberadamente pessimista antes de qualquer mudança sensível. Você deve trabalhar como o “Departamento do Vai Dar Problema”.

Para cada fase, responda antes:

1. O que pode quebrar?
2. Quais tabelas, endpoints, telas e perfis serão afetados?
3. A mudança é aditiva ou destrutiva?
4. Existe backfill?
5. Existe dupla leitura ou dupla escrita temporária?
6. Como dados antigos continuam válidos?
7. Como desativar a feature sem apagar dados?
8. Como fazer rollback?
9. Que métricas comprovam que funcionou?
10. Como testar localmente?
11. Como testar em produção sem expor todos os usuários?
12. O que precisa de feature flag?
13. O que exige consentimento ou atenção à LGPD?
14. O que pode gerar cobrança indevida, entrega duplicada ou relatório incorreto?
15. O que acontece se Render, Vercel, banco, storage ou push estiverem indisponíveis?

Nenhuma etapa de alto risco deve ser misturada com refatoração visual, rename amplo ou limpeza não relacionada.

---

## 9. Classificação obrigatória das tarefas

Classifique cada tarefa em duas dimensões.

### 9.1 Complexidade

- **S — simples:** alteração isolada, sem migration, sem mudança de contrato;
- **M — média:** envolve mais de uma camada, mas é reversível e localizada;
- **L — complexa:** migration, autorização, tracking, decisão de entrega ou integração externa;
- **XL — crítica:** financeiro, push patrocinado, privacidade, billing, migração destrutiva ou troca de motor de entrega.

### 9.2 Risco

- **R0 — sem risco operacional relevante:** documentação, catálogo, feature flag desligada;
- **R1 — baixo:** UI interna, endpoint novo sem alterar os atuais;
- **R2 — moderado:** modelo aditivo, backfill, permissões novas;
- **R3 — alto:** tracking, targeting, aprovação, uploads, contrato existente;
- **R4 — crítico:** cobrança, carteira, entrega patrocinada por localização/push, exclusão ou rename destrutivo.

Para cada tarefa, informe:

- complexidade;
- risco;
- dependências;
- arquivos/camadas prováveis;
- testes;
- rollback;
- critério de conclusão.

---

## 10. Sequência recomendada de fases

Você deve validar, detalhar e eventualmente ajustar esta sequência.

### Fase 0 — Inventário e contratos atuais

- mapear schema real;
- mapear rotas existentes;
- mapear página administrativa;
- mapear slots no frontend;
- mapear relatórios;
- mapear permissões;
- registrar contratos que não podem quebrar;
- criar flags, sem alterar comportamento.

### Fase 1 — Fundação de anunciante

- `AdvertiserAccount`;
- membros e papéis;
- relação opcional com campanha;
- backfill;
- autorização por escopo;
- auditoria inicial.

### Fase 2 — Inventário canônico

- catálogo de placements;
- mapeamento dos três slots atuais;
- dimensões e proporções;
- canais e elegibilidade;
- UI administrativa somente leitura primeiro.

### Fase 3 — Storage persistente e criativos

- object storage;
- validação;
- upload seguro;
- preview;
- compatibilidade com URLs atuais;
- migração gradual.

### Fase 4 — Revisão e governança

- fluxo de submissão;
- aprovação/rejeição;
- justificativas;
- trilha de auditoria;
- alertas;
- regras para nova revisão após edição.

### Fase 5 — Ad Set e segmentação

- Ad Set opcional;
- targeting tipado;
- filtros por praça, região, casa, evento, horário e contexto;
- estimativa de alcance;
- compatibilidade com `targeting` JSON atual;
- backfill/default Ad Set.

### Fase 6 — Motor de decisão v2

- elegibilidade;
- prioridade/peso;
- pacing;
- frequency cap;
- exclusões;
- no-fill;
- request/delivery ID;
- shadow mode antes de ativação;
- comparação com entrega atual.

### Fase 7 — Relatórios e portal do anunciante

- métricas confiáveis;
- funil impressão > clique > ação;
- comparação por placement;
- exportação;
- escopo por conta;
- mascaramento e privacidade;
- painel externo sem acesso administrativo global.

### Fase 8 — Carteira, créditos e billing

- ledger imutável;
- saldo derivado;
- idempotência;
- reservas;
- estorno;
- conciliação;
- gateway;
- webhooks;
- auditoria;
- proteção contra saldo negativo e dupla cobrança.

### Fase 9 — Patrocínio no `Tô na Pista`

- somente após consentimento, push e motor v2 estáveis;
- limite de frequência específico;
- distinção inequívoca de conteúdo patrocinado;
- prioridade sem degradar relevância orgânica;
- opt-out;
- auditoria;
- fallback;
- guard-rails geográficos e temporais.

---

## 11. Regras obrigatórias para migrations

O plano e o prompt final para Codex devem exigir:

- migrations pequenas e aditivas;
- nenhuma migration com reset;
- nenhuma alteração retroativa em migration já aplicada;
- `prisma migrate deploy` em produção;
- backfill em script separado e idempotente quando necessário;
- constraints obrigatórias apenas depois do backfill;
- índices criados de forma consciente;
- campos novos inicialmente opcionais quando houver dados legados;
- validação do Prisma Client após mudança de schema;
- teste em banco local ou ambiente isolado;
- plano explícito para falha parcial;
- backup antes de fases de risco alto;
- documentação de baseline quando aplicável.

---

## 12. Regras obrigatórias de compatibilidade

O prompt final deve orientar o Codex a:

- preservar endpoints atuais até migração concluída;
- preservar os três slots atuais;
- manter campanhas atuais entregando;
- manter relatórios atuais funcionando;
- manter Admin Ads acessível ao administrador;
- introduzir novos fluxos por feature flag;
- evitar renames físicos prematuros;
- criar adaptadores quando o modelo novo divergir do antigo;
- testar perfis `admin`, `producer`, `venue_manager` e `attendee`;
- não expor dados de um anunciante para outro;
- não permitir que uma casa veja métricas ou campanhas fora do seu escopo.

---

## 13. Segurança, privacidade e LGPD

O planejamento deve incluir:

- minimização de dados;
- identificadores de sessão pseudonimizados;
- retenção de logs;
- hash de IP sem uso como identidade permanente;
- consentimento quando houver localização e push;
- separação entre analytics operacional e targeting;
- RBAC por conta de anunciante;
- auditoria de ações administrativas;
- rate limit;
- validação de URL de destino;
- prevenção de open redirect;
- proteção contra upload malicioso;
- sanitização de campos;
- idempotência no tracking e financeiro;
- transparência de conteúdo patrocinado;
- possibilidade de exclusão e retenção legalmente coerente.

---

## 14. Cuidados editoriais e de codificação

O projeto já sofreu com corrupção de acentuação e mojibake. O prompt final deve exigir:

- UTF-8 em todos os arquivos;
- nenhuma substituição massiva cega;
- preservar identificadores técnicos em ASCII;
- acentuar apenas textos visíveis e conteúdo editorial;
- build do frontend após alterações textuais;
- inspeção de caracteres como `�`, `Ã`, `Â` e sequências corrompidas;
- não renomear campos, enums ou propriedades apenas para acentuar apresentação.

---

## 15. O que você deve entregar

Sua resposta deverá conter, nesta ordem:

### 15.1 Resumo executivo

- visão consolidada do novo 77GiraADS;
- o que aproveitar do documento-base;
- o que corrigir diante do sistema real;
- caminho recomendado de evolução.

### 15.2 Matriz “já existe / evoluir / criar / adiar / rejeitar”

Para cada capacidade do documento-base, classifique-a e justifique.

### 15.3 Arquitetura-alvo evolutiva

Inclua:

- componentes;
- entidades;
- relações;
- APIs;
- autorização;
- entrega;
- tracking;
- relatórios;
- storage;
- billing;
- integrações.

Use Mermaid quando ajudar, mas não dependa apenas do diagrama.

### 15.4 Plano faseado

Para cada fase:

- objetivo;
- escopo;
- fora de escopo;
- dependências;
- tarefas;
- complexidade;
- risco;
- migrations;
- endpoints;
- UI;
- testes;
- observabilidade;
- rollback;
- critérios de aceite.

### 15.5 Matriz de riscos

Inclua pelo menos:

- duplicação de sistemas;
- perda de campanha legada;
- tracking duplicado;
- cobrança duplicada;
- upload perdido;
- vazamento entre anunciantes;
- targeting incorreto;
- excesso de push;
- regressão nos slots atuais;
- migration bloqueada;
- CORS/deploy;
- acentuação/encoding.

### 15.6 Plano de migrations e backfill

Especifique a ordem exata, sem SQL destrutivo e sem reset.

### 15.7 Plano de testes

Inclua:

- unitários;
- integração;
- contrato;
- autorização;
- migration;
- delivery;
- tracking;
- relatórios;
- billing;
- UI;
- mobile/PWA;
- smoke em produção;
- rollback testado.

### 15.8 Backlog priorizado

Forneça tarefas pequenas, identificadas e ordenadas, cada uma com complexidade e risco.

### 15.9 Decisões que exigem validação humana

Liste decisões comerciais, jurídicas, financeiras e de UX que o Codex não deve tomar sozinho.

### 15.10 Prompt mestre para o Codex

Esta é a entrega principal. Gere um prompt final autocontido, pronto para ser colado no Codex.

Esse prompt deve:

- começar mandando inspecionar o repositório real;
- proibir implementação big bang;
- dividir o trabalho em fases;
- começar pela fase mais segura;
- pedir atualizações curtas durante o trabalho;
- exigir build e testes;
- exigir inspeção de `git diff` e `git status`;
- proibir reset de banco;
- preservar mudanças não relacionadas;
- exigir parada e diagnóstico diante de migration inesperada;
- solicitar confirmação antes de fases R3/R4;
- indicar arquivos e áreas prováveis, sem inventar caminhos não verificados;
- exigir documentação de rollout e rollback;
- não mandar commitar ou fazer push automaticamente sem autorização explícita;
- manter o documento conceitual externo fora do repositório.

---

## 16. Forma esperada do prompt mestre para o Codex

O prompt mestre deve ser operacional, não apenas estratégico. Ele precisa conter:

1. contexto do produto;
2. stack real;
3. estado atual do ADS;
4. objetivo da fase;
5. escopo permitido;
6. escopo proibido;
7. inspeções iniciais obrigatórias;
8. arquivos e contratos a localizar;
9. implementação em passos pequenos;
10. testes e comandos esperados;
11. critérios de aceite;
12. riscos e rollback;
13. formato do relatório final;
14. ponto exato onde o Codex deve parar antes da próxima fase.

O prompt deve ser detalhado o suficiente para reduzir ambiguidades, mas não deve fingir conhecer linhas ou caminhos que ainda precisam ser confirmados no repositório.

---

## 17. Restrições sobre arquivos e Git

O documento conceitual original está fora do workspace principal e serve apenas como referência.

Você deve orientar explicitamente que:

- o arquivo externo não seja copiado para o repositório;
- o arquivo externo não seja adicionado ao Git;
- artefatos temporários de análise não sejam versionados;
- apenas código, migrations, testes e documentação final aprovada entrem no projeto;
- antes de qualquer commit seja executado `git status --short`;
- arquivos estranhos ou inesperados interrompam o processo para revisão humana.

---

## 18. Critério de qualidade da sua resposta

Sua resposta será considerada boa apenas se:

- demonstrar que compreendeu o módulo existente;
- evitar duplicação arquitetural;
- transformar o documento-base em evolução compatível;
- separar tarefas simples das complexas;
- explicitar risco e rollback;
- proteger migrations e produção;
- preservar os slots e relatórios atuais;
- tratar storage, auditoria, autorização e tracking como fundamentos;
- adiar billing e `Tô na Pista` patrocinado até as bases estarem maduras;
- entregar um prompt final realmente utilizável pelo Codex.

Não responda com generalidades. Não escreva código da solução. Primeiro produza o replanejamento; depois gere o prompt mestre de implementação.

