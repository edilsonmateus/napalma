# Manual Mestre do 77Gira

## Produto, agentes, jornadas, operação e publicidade

**Versão do manual:** 1.0  
**Data de referência:** 5 de julho de 2026  
**Aplicação:** 77Gira  
**Escopo:** experiência pública, contas, artistas, casas, produtores, anunciantes, administração, suporte e infraestrutura operacional.

---

## 1. Objetivo deste manual

Este documento explica o que cada agente pode fazer no 77Gira, desde uma pessoa que acessa a plataforma sem login até a equipe que administra campanhas publicitárias de marcas.

O manual serve a quatro finalidades:

1. orientar usuários e parceiros;
2. treinar equipes de operação, curadoria e suporte;
3. registrar a lógica atual de permissões;
4. reduzir erros ao publicar eventos, reivindicar perfis, administrar casas ou operar publicidade.

As telas e funções descritas correspondem à implementação atual. Alguns recursos dependem de feature flags, autorização administrativa, configuração de push, Cloudflare R2 ou dados previamente cadastrados.

---

## Sumário

1. [Objetivo deste manual](#1-objetivo-deste-manual)
2. [Visão geral do ecossistema](#2-visão-geral-do-ecossistema)
3. [Conceitos fundamentais](#3-conceitos-fundamentais)
4. [Acesso sem login](#4-acesso-sem-login)
5. [Criação de conta e login](#5-criação-de-conta-e-login)
6. [Público cadastrado](#6-público-cadastrado)
7. [Contratante de artista](#7-contratante-de-artista)
8. [Artistas e equipes](#8-artistas-e-equipes)
9. [Casas de samba](#9-casas-de-samba)
10. [Produtores](#10-produtores)
11. [Anunciantes e publicidade de marca](#11-anunciantes-e-publicidade-de-marca)
12. [Administração geral](#12-administração-geral)
13. [Curadoria, moderação e suporte](#13-curadoria-moderação-e-suporte)
14. [Sistema e automações](#14-sistema-e-automações)
15. [Matriz resumida de permissões](#15-matriz-resumida-de-permissões)
16. [Feature flags relevantes](#16-feature-flags-relevantes)
17. [Rotas funcionais principais](#17-rotas-funcionais-principais)
18. [Diagnóstico rápido](#18-diagnóstico-rápido)
19. [Checklist por agente](#19-checklist-por-agente)
20. [Governança recomendada](#20-governança-recomendada)
21. [Encerramento](#21-encerramento)

---

## 2. Visão geral do ecossistema

O 77Gira conecta os seguintes agentes:

| Agente | Identidade principal | Objetivo na plataforma |
|---|---|---|
| Visitante | Sem login | Descobrir sambas, eventos, casas e artistas |
| Público cadastrado | Usuário comum (`attendee`) | Personalizar a experiência, seguir, salvar e receber recomendações |
| Contratante | Visitante ou usuário | Enviar oportunidade para artista oficial |
| Artista ou equipe | Acesso ativo a um perfil de artista | Manter EPK, mídia, agenda, oportunidades e métricas |
| Casa | Usuário `venue_manager` e vínculos de casa | Administrar unidade, programação, equipe e dados da casa |
| Produtor | Usuário `producer` e carteira aprovada | Operar casas, artistas, eventos e reivindicações autorizadas |
| Anunciante | Usuário vinculado a uma conta anunciante | Criar campanhas e criativos e acompanhar revisão |
| Administrador | Usuário `admin` | Governança completa, catálogo, usuários, claims, publicidade e aquisição |
| Suporte/curadoria | Operação autorizada | Analisar evidências, orientar usuários e preservar integridade do catálogo |
| Sistema | Serviços automáticos | Autenticação, push, analytics, storage, entrega de anúncios e jobs |

Uma mesma pessoa pode acumular vínculos. Um usuário comum pode reivindicar um artista, participar de uma conta anunciante e colaborar com uma casa. O papel global e os vínculos específicos são mecanismos diferentes.

---

## 3. Conceitos fundamentais

### 3.1 Papel global

O papel global define o acesso estrutural:

- `attendee`: público comum;
- `venue_manager`: gestor de casa;
- `producer`: produtor;
- `admin`: administrador.

O cadastro público sempre cria `attendee`. Papéis operacionais não podem ser escolhidos pelo cadastro aberto.

### 3.2 Vínculos específicos

Algumas autorizações não dependem apenas do papel global:

- acesso a uma casa;
- acesso a um artista;
- membership em uma conta anunciante;
- permissão para username oficial da marca.

### 3.3 Perfil reivindicado

Um perfil de artista ou uma casa pode existir antes de seu responsável oficial possuir acesso. A reivindicação conecta uma conta autenticada ao ativo depois de análise administrativa.

### 3.4 Feature flag

Feature flag é uma chave de configuração que liga ou desliga um módulo sem remover seu código. Quando uma função esperada não aparece, a equipe deve conferir a flag correspondente no frontend e no backend.

### 3.5 Rascunho, publicação e revisão

Um conteúdo pode passar por estágios distintos:

- rascunho;
- enviado para revisão;
- aprovado;
- rejeitado ou com alterações solicitadas;
- ativo, pausado ou encerrado.

Salvar não significa necessariamente publicar. Em publicidade, a aprovação editorial é separada da ativação da campanha.

---

## 4. Acesso sem login

### 4.1 O que o visitante pode fazer

Sem criar uma conta, o visitante pode:

- abrir a página Explorar;
- consultar eventos futuros e eventos ao vivo;
- filtrar por praça, região, data, horário e busca textual;
- abrir páginas de evento;
- abrir páginas de casas;
- abrir páginas públicas de artistas;
- consultar informações de preço;
- abrir rotas por Google Maps, Waze e Uber quando disponíveis;
- compartilhar evento, casa ou EPK;
- copiar links;
- baixar compromisso de evento em formato de calendário quando oferecido;
- visualizar anúncios entregues nas superfícies públicas;
- iniciar uma solicitação de contratação em EPK elegível;
- consultar Privacidade, Termos, Ajuda e Sobre;
- instalar ou compartilhar o aplicativo quando o navegador oferecer suporte.

### 4.2 O que exige login

O visitante precisa entrar ou criar uma conta para:

- seguir artista;
- usar Meu Radar sincronizado;
- registrar presença/histórico;
- manter conquistas;
- salvar planos no Pela Hora;
- ativar Tô na Pista;
- reivindicar artista ou casa;
- acessar Conta e preferências;
- acessar qualquer workspace profissional.

### 4.3 Navegação pública principal

#### Explorar — `/explore`

É a agenda principal. O topo mostra a marca e, quando houver sessão, nome, username e avatar da pessoa.

Filtros disponíveis:

- praça/cidade;
- filtros avançados;
- eventos ao vivo;
- Tô na Pista;
- busca por casa, bairro, região, evento ou artista;
- data e horário;
- visão de hoje ou da semana.

Os filtros alteram a grade exibida, mas não alteram o cadastro dos eventos.

#### Evento — `/events/:eventId`

Exibe:

- título e artista;
- casa e região;
- data de início e fim;
- preço, gratuidade, consumação ou couvert;
- descrição e imagem;
- status ao vivo quando aplicável;
- compartilhamento;
- rota para o local;
- ações de Radar e histórico quando autenticado.

#### Casa — `/venues/:venueId`

Exibe:

- identidade da casa;
- bairro/região;
- descrição e imagem;
- próximas atrações;
- artistas relacionados aos eventos;
- como chegar;
- anúncio contextual, quando houver entrega elegível.

#### Artista — `/artistas/:artistId`

Exibe o EPK público:

- nome, foto, capa e selo de verificação;
- bio e release;
- gêneros;
- próximos shows;
- casas por onde passou;
- base de atuação;
- formatos de show;
- links oficiais;
- fotos e vídeos publicados;
- ações Seguir, Compartilhar EPK e Contratar.

---

## 5. Criação de conta e login

### 5.1 Criar conta

Na rota `/signup`, informar:

- primeiro nome;
- sobrenome;
- username;
- e-mail;
- senha;
- cidade, bairro e CEP, opcionalmente no cadastro.

A localização-base pode ser preenchida depois, mas é obrigatória para Tô na Pista.

### 5.2 Regras de username

Usernames públicos:

- possuem de 3 a 40 caracteres;
- aceitam letras sem acento, números, ponto, hífen e underline;
- são únicos;
- não podem se passar pela marca ou por funções institucionais.

São protegidas formas como:

- `77gira` e variações com separadores;
- nomes que contenham `77gira`;
- substituições como `77gir4`;
- semelhanças como `77girra` e `77giraa`;
- `admin`, `suporte`, `oficial`, `staff`, `security`, `help` e equivalentes reservados.

Mensagem padrão:

> Este nome parece estar relacionado à marca 77gira e é reservado para contas oficiais. Escolha outro nome de usuário.

Somente contas autorizadas por administração podem utilizar usernames oficiais.

### 5.3 Login normal

Na rota `/login`, informar e-mail e senha. Após autenticação, a rota inicial depende do papel da conta.

### 5.4 Login Admin local

Existe apenas para desenvolvimento. Requer simultaneamente:

- `import.meta.env.DEV` verdadeiro;
- `VITE_ENABLE_TEST_LOGIN=true`;
- backend fora de produção.

O botão Admin não preenche uma senha visível. Ele chama um endpoint dev e cria ou promove uma conta local. Não funciona em produção.

### 5.5 Sessões

- access token tem duração curta;
- refresh token renova a sessão;
- logout revoga o refresh token utilizado;
- troca de senha revoga todas as sessões ativas;
- tokens não devem ser enviados a terceiros nem registrados em documentos.

---

## 6. Público cadastrado

### 6.1 Configurações — `/settings`

É a entrada geral da conta e do Hub de Gestão.

Elementos principais:

- avatar, nome e e-mail;
- menu de três pontos para Conta e preferências;
- instalação e compartilhamento do app;
- QR Code;
- Hub de Gestão, quando houver ferramentas profissionais.

### 6.2 Conta e preferências — `/settings/account`

Reúne:

#### Dados pessoais

- foto de perfil;
- nome;
- sobrenome;
- username;
- e-mail somente leitura;
- telefone;
- Instagram;
- troca de senha.

O lápis abre a edição. Telefone e Instagram são opcionais.

#### Troca de senha

Exige:

- senha atual;
- nova senha com mínimo de 8 caracteres;
- confirmação da nova senha.

Após o sucesso, todas as sessões são encerradas e a pessoa deve entrar novamente.

#### Localização-base

Campos:

- cidade;
- bairro;
- CEP.

Não é solicitado endereço completo. Após salvar, o botão confirma “Localização salva”.

#### Perfis e acessos

Mostra artistas reivindicados e o caminho para o Hub de Gestão.

#### Suporte e informações

- Ajuda;
- Privacidade;
- Termos de Uso;
- Sobre o 77Gira.

#### Sessão

- sair da conta.

### 6.3 Seguir artistas

Na página do artista:

1. tocar em `+ Seguir`;
2. o botão muda para `Seguindo`;
3. tocar novamente para deixar de seguir.

O contador de seguidores é atualizado pelo vínculo da conta com o artista.

### 6.4 Meu Radar — `/radar`

O Radar reúne eventos marcados para acompanhamento. O usuário pode:

- adicionar evento ao Radar;
- remover evento;
- abrir detalhes;
- consultar rotas;
- acompanhar eventos relevantes.

O Radar é pessoal e requer login.

### 6.5 Meu Histórico — `/history`

Permite:

- consultar sambas já frequentados;
- buscar por evento ou casa;
- remover marcação quando necessário;
- visualizar conquistas desbloqueadas.

Contas de casa são redirecionadas ao painel operacional em vez do histórico pessoal.

### 6.6 Conquistas

Conquistas são derivadas de ações e histórico. Elas podem possuir:

- nome;
- descrição;
- ícone;
- pontos;
- requisito.

O usuário não edita conquistas manualmente.

### 6.7 Pela Hora — `/pela-hora`

O usuário organiza um plano de eventos.

Fluxo:

1. definir nome e data do plano;
2. escolher modo manual ou sugestão automática;
3. selecionar eventos;
4. revisar sequência e deslocamentos;
5. salvar plano quando autenticado;
6. consultar ou excluir planos salvos.

### 6.8 Tô na Pista

O recurso cria uma sessão temporária de descoberta por localização.

Pré-requisitos:

- login;
- cidade, bairro e CEP cadastrados;
- permissão de geolocalização do navegador;
- permissão de notificações para push completo;
- eventos elegíveis próximos.

Comportamento:

- sessão dura 1 hora;
- usa localização atual durante a sessão;
- considera raio configurado, atualmente 8 km por padrão;
- envia no máximo 2 sugestões;
- a primeira notificação aguarda 3 minutos;
- o backend procura eventos em uma janela configurável, atualmente 2 horas por padrão;
- a sessão termina sozinha ou pode ser desligada pelo usuário.

Uma segunda notificação só existe quando há outro evento elegível e ainda não entregue.

---

## 7. Contratante de artista

### 7.1 Quem pode solicitar

O formulário público de contratação pode ser utilizado quando:

- a feature de booking está ativa;
- o artista está verificado;
- o perfil foi reivindicado e possui equipe responsável.

### 7.2 Como contratar

Na página do artista:

1. tocar em `Contratar <nome do artista>`;
2. preencher nome ou empresa;
3. informar e-mail para retorno;
4. informar telefone/WhatsApp opcional;
5. escolher data desejada;
6. informar público estimado;
7. informar cidade e bairro/região;
8. indicar tipo do evento;
9. informar orçamento opcional;
10. descrever o evento;
11. enviar solicitação.

### 7.3 O que acontece depois

A solicitação entra no workspace da equipe oficial do artista. Status possíveis:

- nova;
- em conversa;
- proposta enviada;
- ganha;
- perdida;
- arquivada;
- spam.

O 77Gira organiza a oportunidade, mas negociação, contrato, pagamentos e obrigações finais permanecem entre as partes.

---

## 8. Artistas e equipes

### 8.1 Como um perfil nasce

Ao cadastrar um evento com `Artista principal`, o backend:

1. normaliza o nome em slug;
2. procura artista existente;
3. cria um registro mínimo quando não encontra;
4. associa o artista ao evento.

Esse registro inicial:

- não cria login;
- não concede propriedade;
- não verifica o artista;
- não preenche EPK profissional;
- pode ser reivindicado posteriormente.

### 8.2 Reivindicar perfil

No EPK não reivindicado:

1. entrar em uma conta;
2. tocar em `Reivindicar perfil`;
3. informar responsável;
4. telefone;
5. CPF ou CNPJ;
6. relação com o artista;
7. e-mail, Instagram e site oficiais, quando houver;
8. justificativa e evidências;
9. enviar para análise.

O status fica pendente até decisão administrativa. A aprovação cria acesso e verifica o artista conforme a regra operacional atual.

### 8.3 Hub de Gestão

Depois da aprovação, o Hub pode mostrar:

- Meu perfil de artista;
- Contratações;
- Fotos e vídeos;
- Desempenho;
- Mídia kit público.

O Hub pode ser recolhido pelo Chevron. O seletor permite alternar entre artistas quando a conta administra mais de um.

### 8.4 Meu perfil profissional — `/workspace/artista`

#### Identidade

- nome artístico;
- foto de perfil;
- imagem de capa;
- gêneros;
- cidade-base;
- estado.

#### Apresentação

- bio curta, até 320 caracteres;
- release completo;
- bio legada.

#### Para contratantes

- formatos de show;
- tipos de evento;
- regiões atendidas;
- duração média;
- formação;
- disponibilidade;
- e-mail profissional;
- telefone profissional;
- preferência de contato.

#### Links oficiais

- Spotify;
- YouTube;
- Instagram;
- site;
- TikTok;
- SoundCloud;
- WhatsApp profissional.

Ao salvar, o conteúdo atualiza o EPK público.

### 8.5 Fotos e vídeos — `/workspace/artista/midia`

Permite:

- enviar foto JPG, PNG ou WebP;
- adicionar vídeo externo por URL;
- informar título e miniatura;
- publicar ou ocultar mídia;
- remover mídia;
- acompanhar limites de fotos e vídeos.

Vídeos externos não são copiados integralmente para o storage; o perfil registra o link e a miniatura.

### 8.6 Contratações — `/workspace/artista/contratacoes`

A equipe escolhe o artista e consulta oportunidades recebidas. Pode:

- filtrar solicitações;
- consultar dados do contratante;
- ver data, local, público e orçamento;
- ler mensagem;
- entrar em contato por e-mail/telefone;
- atualizar o status comercial.

### 8.7 Desempenho — `/workspace/artista/desempenho`

Exibe sinais privados, como:

- visualizações de perfil;
- cliques em links;
- seguidores;
- cliques de contratação;
- interações com mídia;
- próximos shows;
- oportunidades por status.

Esses dados são acessíveis apenas a quem administra o artista.

### 8.8 Papéis internos do artista

O modelo suporta:

- proprietário;
- gestor;
- editor;
- visualizador.

O acesso também pode estar convidado, ativo, suspenso ou revogado.

---

## 9. Casas de samba

### 9.1 Entrada da casa

Contas `venue_manager` usam o workspace da casa e a gestão em `/settings/venues`.

O acesso deve estar vinculado a uma casa. Uma conta não pode assumir livremente qualquer unidade.

### 9.2 Reivindicação de casa

Quando não há vínculo, o responsável pode solicitar acesso e enviar:

- dados do responsável;
- contato;
- documento;
- relação com a casa;
- canais oficiais;
- justificativa.

O admin aprova ou rejeita.

### 9.3 Dados da casa

Conforme autorização, podem ser mantidos:

- nome e apelido;
- endereço;
- bairro, região, cidade e estado;
- coordenadas;
- descrição;
- imagem;
- dias de funcionamento;
- contatos;
- Instagram;
- gramática editorial de nomes e bairros.

As opções gramaticais ajudam o produto a escrever frases naturais, por exemplo “no Bixiga” ou “em Pinheiros”.

### 9.4 Programação e eventos

A casa pode:

- criar rascunho;
- publicar evento;
- editar evento próprio;
- excluir evento autorizado;
- cadastrar artista principal;
- definir recorrência semanal;
- cancelar ou reativar ocorrência;
- consultar eventos futuros e passados.

Dados do evento:

- título;
- artista principal opcional;
- descrição;
- tipo;
- casa;
- início e fim;
- recorrência;
- imagem;
- tags;
- tipo de ingresso;
- preço mínimo e máximo;
- consumação;
- couvert;
- link de ingresso;
- status rascunho ou confirmado.

### 9.5 Artista criado pelo evento

Se a casa digitar um artista que não existe, um perfil mínimo pode ser criado automaticamente. A casa não recebe propriedade sobre esse perfil.

Boas práticas:

- pesquisar no datalist antes de criar;
- conferir grafia;
- evitar abreviações inconsistentes;
- não criar variantes do mesmo artista;
- corrigir associação pelo painel quando houver erro.

### 9.6 Equipe e produtores

Conforme permissão, a casa pode:

- consultar produtores vinculados;
- criar usuário operacional provisório;
- adicionar produtor à unidade;
- remover vínculo;
- revogar o próprio acesso de casa.

### 9.7 Painel da Casa

O painel mostra:

- próximos eventos;
- impressões e cliques de Ads da casa;
- desempenho por slot;
- principais campanhas relacionadas à unidade;
- indicadores de audiência e impacto quando habilitados.

### 9.8 77First

Em eventos autorizados, o 77First prepara materiais como:

- legenda curta;
- texto para WhatsApp;
- release;
- ficha técnica;
- payload para integração.

O material deve ser revisado antes de divulgação externa.

---

## 10. Produtores

### 10.1 Papel do produtor

O produtor opera uma carteira autorizada de casas, artistas e eventos. Não deve editar ativos fora de seus vínculos.

### 10.2 Painel — `/workspace/produtor`

Áreas principais:

- visão geral;
- reivindicações;
- fila;
- eventos;
- filtros e limpeza de busca.

### 10.3 Reivindicar carteira

O produtor pode solicitar vínculo com casa ou artista informando:

- justificativa profissional;
- responsável legal;
- telefone;
- CPF/CNPJ;
- vínculo declarado;
- canais oficiais;
- evidências.

### 10.4 Depois da aprovação

O produtor pode, dentro da carteira:

- consultar dados completos;
- operar eventos;
- administrar artistas permitidos;
- criar ou atualizar conteúdo autorizado;
- acompanhar próximos eventos;
- usar uploads;
- consultar métricas disponíveis.

### 10.5 Limites

O produtor não pode:

- conceder a si mesmo acesso;
- aprovar a própria reivindicação;
- administrar publicidade global;
- criar admin;
- alterar ativos fora da carteira;
- assumir username oficial sem permissão.

---

## 11. Anunciantes e publicidade de marca

### 11.1 Estrutura do módulo

A publicidade é organizada em:

1. conta anunciante;
2. membership do usuário;
3. campanha;
4. criativos;
5. slots/placements;
6. revisão;
7. entrega;
8. impressão e clique;
9. relatório.

### 11.2 Tipos de conta anunciante

- não classificada;
- casa;
- produtor;
- artista;
- marca;
- agência;
- grupo;
- interna.

Status:

- rascunho;
- revisão pendente;
- ativa;
- suspensa;
- rejeitada;
- arquivada.

### 11.3 Memberships

Papéis possíveis:

- `owner`;
- `admin`;
- `campaign_manager`;
- `analyst`;
- `billing_manager`;
- `viewer`.

Status possíveis:

- convidado;
- ativo;
- suspenso;
- revogado.

O acesso ao portal não depende apenas do login; exige membership ativa em conta anunciante.

### 11.4 Central do Anunciante — `/workspace/anunciante`

Quando há conta disponível, o usuário pode:

- selecionar conta anunciante;
- consultar campanhas;
- criar campanha em rascunho;
- definir anunciante e nome;
- definir início e fim;
- criar criativo;
- escolher slot;
- informar título e destino;
- enviar arquivo;
- submeter campanha ou criativo para revisão;
- acompanhar status.

Sem membership, a tela informa que nenhuma conta está disponível.

### 11.5 Slots publicitários atuais

- `explore_feed_large`: card grande no Explorar;
- `venue_detail_inline`: anúncio no detalhe da casa;
- `radar_header`: topo do Radar.

Cada placement pode definir:

- dimensões recomendadas;
- proporção;
- formatos MIME;
- limite de arquivo;
- dispositivos;
- exigência de aprovação;
- targeting;
- frequency cap;
- disponibilidade comercial.

### 11.6 Campanha

Campos e controles incluem:

- anunciante;
- nome;
- status;
- início e fim;
- prioridade;
- limite de frequência diária;
- entrega em todos os slots;
- habilitação;
- targeting;
- conta anunciante;
- status de revisão.

Status operacionais:

- draft;
- active;
- paused;
- ended.

### 11.7 Criativo

Um criativo contém:

- campanha;
- slot;
- imagem;
- título;
- URL de destino;
- texto alternativo;
- largura e altura;
- metadados do arquivo;
- versão do asset;
- estado de habilitação;
- estado de revisão.

Formatos de upload atuais: JPG, PNG ou WebP, respeitando limites do placement.

### 11.8 Fluxo de revisão

Quando habilitado:

1. campanha começa como rascunho;
2. anunciante envia para revisão;
3. criativos também são enviados;
4. admin consulta a fila;
5. admin aprova, rejeita ou solicita alteração;
6. motivo é obrigatório para rejeição conforme a interface;
7. histórico registra ator, ação, status, motivo e snapshot;
8. edição relevante pode exigir nova revisão.

Status de revisão:

- draft;
- pending_review;
- approved;
- rejected;
- changes_requested.

### 11.9 Entrega

Uma campanha só deve entregar quando os critérios aplicáveis forem satisfeitos:

- campanha habilitada;
- período válido;
- status operacional adequado;
- criativo habilitado;
- slot compatível;
- aprovação quando exigida;
- targeting compatível;
- limite de frequência respeitado.

### 11.10 Métricas

O sistema registra:

- impressão;
- clique;
- campanha;
- criativo;
- slot;
- casa contextual;
- usuário ou sessão quando permitido;
- data;
- hash de IP e user agent conforme implementação.

Relatórios podem consolidar:

- impressões;
- cliques;
- CTR;
- desempenho por slot;
- campanhas;
- criativos;
- período;
- exportação CSV.

### 11.11 Cloudflare R2

O storage compartilhado pode armazenar:

- criativos de publicidade;
- imagens de artistas;
- capas;
- avatares;
- imagens de casas;
- imagens de eventos;
- outros assets futuros.

O app e o painel usam URLs públicas para referenciar os objetos. Credenciais R2 ficam somente no backend.

Organização recomendada:

- `ads/`;
- `artists/`;
- `covers/`;
- `events/`;
- `profiles/`;
- `venues/`;
- prefixos de ambiente quando necessário.

Não colocar token, secret key ou access key no frontend.

---

## 12. Administração geral

### 12.1 Entrada

Administradores acessam o Hub de Gestão em Configurações. Ferramentas principais:

- gestão de casas;
- gestão de publicidade;
- gestão de usuários;
- aquisição;
- reivindicações;
- regiões;
- catálogo de artistas e eventos.

### 12.2 Gestão de usuários — `/settings/users`

Permite:

- criar usuário comum;
- informar nome, sobrenome, username, e-mail, telefone e senha provisória;
- garantir papel `attendee`;
- buscar usuários;
- conceder permissão de username oficial;
- revogar permissão quando o username atual não for reservado.

O admin não pode usar essa tela para criar outro admin. A ferramenta foi deliberadamente limitada a usuários comuns.

### 12.3 Username oficial

Campo de permissão:

`canUseReservedBrandUsername`

A concessão registra:

- ID do admin que concedeu;
- data da concessão.

O bypass é validado no servidor. Marcar um checkbox no frontend sem autorização backend não é suficiente.

### 12.4 Gestão de casas, artistas e eventos

O admin pode:

- criar, editar e excluir casas;
- criar, editar e excluir artistas;
- criar, editar e excluir eventos;
- administrar regiões;
- consultar e decidir reivindicações;
- associar produtores e gestores;
- revisar dados completos;
- exportar CSV quando disponível;
- preparar 77First.

### 12.5 Reivindicações

O admin deve:

1. verificar identidade do solicitante;
2. verificar documento e contato;
3. confirmar relação com casa ou artista;
4. conferir canais oficiais;
5. analisar justificativa;
6. evitar conflito com responsável existente;
7. aprovar ou rejeitar com nota clara.

Ao aprovar ownership de artista, o sistema pode criar acesso ativo e verificar o perfil.

### 12.6 Regiões

Regiões continuam úteis para catálogo e filtros, mas a localização residencial do usuário usa cidade, bairro e CEP. São conceitos diferentes.

O admin pode manter:

- nome;
- cidade;
- estado;
- ordem;
- ativação;
- gramática editorial.

### 12.7 Aquisição de casas

O módulo de aquisição acompanha leads de possíveis casas:

- nome;
- cidade, região e bairro;
- endereço e CEP;
- coordenadas;
- Instagram, telefone e e-mail;
- contato e função;
- status e temperatura;
- próximo follow-up;
- apresentação;
- potencial;
- objeções;
- notas;
- histórico de interações.

Esse módulo é interno e não substitui o cadastro oficial nem a aprovação de acesso.

### 12.8 Impacto e audiência

Administradores, produtores e casas autorizadas podem consultar indicadores de impacto e audiência conforme escopo:

- visitas;
- rotas;
- Radar;
- compartilhamentos;
- presença;
- conversões;
- atividade por ativo.

### 12.9 Gestão de publicidade — `/settings/ads`

Seções:

- Visão Geral;
- Campanhas;
- Criativos por Slot;
- Saúde e Alertas;
- Atividade;
- Revisão;
- Anunciantes;
- Inventário;
- Relatórios.

Funções:

- criar e editar campanhas;
- habilitar, pausar e encerrar;
- cadastrar criativos;
- controlar slots;
- revisar conteúdo;
- criar contas anunciantes;
- administrar memberships;
- vincular campanhas a contas;
- consultar inventário;
- investigar atividade;
- exportar relatórios.

---

## 13. Curadoria, moderação e suporte

### 13.1 Princípios

- preservar identidade de artistas e casas;
- não conceder acesso apenas por alegação verbal;
- registrar decisões;
- evitar duplicidade;
- tratar dados pessoais apenas para a finalidade informada;
- separar suporte de privilégio administrativo;
- nunca pedir senha do usuário.

### 13.2 Atendimento de acesso

Quando alguém não consegue entrar:

1. confirmar ambiente e URL;
2. confirmar se backend responde;
3. confirmar e-mail utilizado;
4. verificar mensagem exata;
5. não redefinir senha manualmente sem processo autorizado;
6. orientar troca de senha pela conta quando ainda autenticado;
7. conferir se sessão foi revogada após mudança de senha.

### 13.3 Atendimento de perfil

Verificar:

- perfil correto;
- slug e ID;
- reivindicação pendente;
- acesso ativo, suspenso ou revogado;
- feature flags;
- vínculo de artista ou casa;
- duplicidade de cadastro.

### 13.4 Atendimento de Ads

Verificar:

- conta anunciante ativa;
- membership ativa;
- papel suficiente;
- campanha em período válido;
- campanha habilitada;
- criativo habilitado;
- slot correto;
- aprovação;
- arquivo público acessível;
- frequência e targeting;
- métricas no período correto.

---

## 14. Sistema e automações

### 14.1 Analytics

Eventos analíticos registram interações de descoberta, artista, rota, anúncio e outros sinais. O registro deve respeitar políticas de privacidade e finalidade.

### 14.2 Push

Push depende de:

- service worker;
- permissão do navegador;
- VAPID configurado;
- subscription ativa;
- backend ativo;
- scheduler do Tô na Pista quando aplicável.

### 14.3 Scheduler Tô na Pista

O backend:

- encerra sessões expiradas;
- busca sessões ativas;
- verifica subscription;
- encontra evento elegível;
- reserva entrega;
- respeita máximo de notificações;
- evita repetir o mesmo evento;
- envia push ou informa fallback.

### 14.4 Uploads

Uploads são limitados por:

- autenticação;
- papel ou vínculo;
- rate limit;
- tipo MIME;
- tamanho;
- processamento de imagem;
- feature flag de storage.

### 14.5 Segurança de produção

- login dev não funciona com `NODE_ENV=production`;
- guards backend são obrigatórios;
- esconder menu no frontend não substitui autorização;
- cadastro público não escolhe role;
- senha é armazenada por hash bcrypt;
- refresh tokens são armazenados por hash;
- troca de senha revoga sessões;
- secrets ficam no backend/infraestrutura;
- username oficial exige permissão explícita.

---

## 15. Matriz resumida de permissões

| Ação | Visitante | Público | Artista/equipe | Casa | Produtor | Anunciante | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Explorar eventos | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Ver casa/artista | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Seguir artista | Não | Sim | Sim | Sim | Sim | Sim | Sim |
| Radar e histórico | Não | Sim | Sim | Limitado ao fluxo da casa | Sim | Sim | Sim |
| Tô na Pista | Não | Sim | Sim | Conforme conta | Sim | Sim | Sim |
| Reivindicar perfil | Não | Sim | Sim | Sim | Sim | Sim | Sim |
| Editar EPK | Não | Não | Com acesso | Não | Com vínculo | Não | Sim |
| Ver leads de contratação | Não | Não | Com acesso | Não | Com vínculo | Não | Sim |
| Criar evento | Não | Não | Não diretamente | Com vínculo | Com vínculo | Não | Sim |
| Editar casa | Não | Não | Não | Com vínculo | Com vínculo | Não | Sim |
| Criar campanha própria | Não | Não | Se membro anunciante | Se membro anunciante | Se membro anunciante | Com membership | Sim |
| Aprovar publicidade | Não | Não | Não | Não | Não | Não | Sim |
| Criar usuário comum | Não | Não | Não | Não | Não | Não | Sim |
| Autorizar username oficial | Não | Não | Não | Não | Não | Não | Sim |

“Com acesso” e “com vínculo” significam que o backend confirmou uma autorização específica; o papel isolado não basta.

---

## 16. Feature flags relevantes

### Frontend

- `VITE_ENABLE_TEST_LOGIN`
- `VITE_ARTIST_EPK_ENABLED`
- `VITE_ARTIST_SELF_SERVICE_ENABLED`
- `VITE_ARTIST_BOOKING_REQUESTS_ENABLED`
- `VITE_ARTIST_MEDIA_GALLERY_ENABLED`
- `VITE_ARTIST_INSIGHTS_ENABLED`
- `VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED`
- `VITE_ADS_PLACEMENT_CATALOG_ENABLED`
- `VITE_ADS_R2_CREATIVE_UPLOAD_ENABLED`
- `VITE_ADS_REVIEW_WORKFLOW_ENABLED`
- `VITE_ENABLE_API_FALLBACK_MOCKS`
- `VITE_VAPID_PUBLIC_KEY`
- `VITE_API_URL`
- `VITE_PUBLIC_APP_URL`

### Backend

- `ARTIST_EPK_ENABLED`
- `ARTIST_SELF_SERVICE_ENABLED`
- `ARTIST_BOOKING_REQUESTS_ENABLED`
- `ARTIST_MEDIA_GALLERY_ENABLED`
- `ARTIST_INSIGHTS_ENABLED`
- `ADS_ADVERTISER_ACCOUNTS_ENABLED`
- `ADS_PLACEMENT_CATALOG_ENABLED`
- `ADS_R2_CREATIVE_UPLOAD_ENABLED`
- `ADS_REVIEW_WORKFLOW_ENABLED`
- `R2_SHARED_UPLOADS_ENABLED`
- `TO_NA_PISTA_SCHEDULER_ENABLED`

Flags equivalentes de frontend e backend devem estar coerentes. Interface visível com endpoint desligado gera erro; endpoint ligado com interface desligada mantém a função inacessível pela navegação normal.

---

## 17. Rotas funcionais principais

### Públicas

- `/explore`
- `/events/:eventId`
- `/venues/:venueId`
- `/artists/:artistId`
- `/artistas/:artistId`
- `/privacy`
- `/terms`
- `/help`
- `/about`
- `/login`
- `/signup`

### Conta

- `/settings`
- `/settings/account`
- `/radar`
- `/history`
- `/pela-hora`

### Artista

- `/workspace/artista`
- `/workspace/artista/contratacoes`
- `/workspace/artista/midia`
- `/workspace/artista/desempenho`

### Profissionais

- `/workspace/produtor`
- `/workspace/casa`
- `/workspace/anunciante`

### Administração

- `/settings/venues`
- `/settings/ads`
- `/settings/users`

---

## 18. Diagnóstico rápido

### “Não aparecem eventos”

Verificar:

- backend ativo;
- `VITE_API_URL`;
- datas futuras;
- filtros;
- região;
- status confirmado;
- recorrência;
- fallback mock no ambiente.

### “Não consigo entrar”

Verificar:

- backend e porta;
- e-mail;
- senha;
- sessão revogada;
- rate limit;
- ambiente dev/prod;
- endpoint correto.

### “Admin local falhou”

Verificar:

- frontend em DEV;
- `VITE_ENABLE_TEST_LOGIN=true`;
- backend fora de produção;
- backend iniciado;
- banco migrado;
- Prisma Client atualizado.

### “Meu artista não aparece no Hub”

Verificar:

- reivindicação aprovada;
- ArtistAccess ativo;
- feature self-service;
- login da conta correta;
- perfil não suspenso/revogado.

### “Não recebi segunda notificação”

Pode não existir segundo evento:

- dentro do raio;
- dentro da janela;
- ainda não entregue;
- com coordenadas válidas;
- durante a sessão ativa.

### “Anúncio não entrega”

Verificar campanha, criativo, slot, período, status, aprovação, targeting, frequency cap e URL do asset.

### “Payload inválido ao editar perfil”

Confirmar formato do username e campos mínimos. Telefone e Instagram vazios são aceitos como opcionais na implementação atual.

---

## 19. Checklist por agente

### Visitante

- [ ] Explorar agenda
- [ ] Abrir evento
- [ ] Consultar casa
- [ ] Consultar artista
- [ ] Compartilhar
- [ ] Abrir rota
- [ ] Criar conta quando desejar personalização

### Público cadastrado

- [ ] Completar conta
- [ ] Cadastrar localização-base
- [ ] Seguir artistas
- [ ] Usar Radar
- [ ] Registrar histórico
- [ ] Criar plano Pela Hora
- [ ] Testar Tô na Pista

### Artista/equipe

- [ ] Localizar perfil
- [ ] Reivindicar
- [ ] Aguardar aprovação
- [ ] Completar identidade
- [ ] Completar apresentação
- [ ] Completar informações para contratantes
- [ ] Adicionar links
- [ ] Publicar mídia
- [ ] Acompanhar oportunidades
- [ ] Consultar desempenho

### Casa

- [ ] Confirmar vínculo
- [ ] Completar dados
- [ ] Cadastrar programação
- [ ] Revisar artistas antes de criar
- [ ] Configurar recorrência
- [ ] Acompanhar eventos
- [ ] Gerenciar equipe autorizada
- [ ] Consultar impacto e Ads

### Produtor

- [ ] Reivindicar carteira
- [ ] Aguardar aprovação
- [ ] Conferir escopo
- [ ] Operar eventos autorizados
- [ ] Manter evidências e contatos
- [ ] Não editar ativos fora da carteira

### Anunciante

- [ ] Obter membership ativa
- [ ] Selecionar conta
- [ ] Criar campanha
- [ ] Definir período
- [ ] Enviar criativo correto
- [ ] Submeter revisão
- [ ] Corrigir rejeições
- [ ] Acompanhar status e métricas

### Admin

- [ ] Revisar reivindicações
- [ ] Manter catálogo
- [ ] Administrar regiões
- [ ] Administrar acessos
- [ ] Proteger usernames oficiais
- [ ] Revisar campanhas e criativos
- [ ] Monitorar saúde e atividade
- [ ] Gerenciar anunciantes
- [ ] Acompanhar aquisição
- [ ] Exportar relatórios

---

## 20. Governança recomendada

1. Toda permissão privilegiada deve ser concedida no backend.
2. Toda reivindicação deve possuir evidência.
3. Username oficial deve ser raro e rastreável.
4. Campanha de marca deve possuir anunciante responsável.
5. Criativo deve passar por revisão quando a flag estiver ativa.
6. Alteração de senha deve revogar sessões.
7. E-mail não deve ser alterado sem confirmação segura.
8. Tokens R2, JWT, VAPID e banco nunca devem aparecer no frontend.
9. Migrações devem ser aplicadas antes de ativar código dependente.
10. Produção deve acompanhar `main` e ser validada após deploy.

---

## 21. Encerramento

O 77Gira não é apenas uma agenda. A implementação atual combina:

- descoberta cultural;
- identidade pública de artistas e casas;
- relacionamento com público;
- rotas e planejamento;
- contratação artística;
- operação profissional;
- publicidade de marca;
- aquisição e curadoria;
- governança de acesso;
- métricas de impacto.

O princípio central para todos os agentes é simples: descoberta é aberta; personalização exige conta; gestão exige vínculo; governança exige autorização; e identidade oficial exige validação.
