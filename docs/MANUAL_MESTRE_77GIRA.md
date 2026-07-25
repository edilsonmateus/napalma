# Manual Mestre do 77Gira

## Produto, agentes, jornadas, operação e publicidade

**Versão do manual:** 2.0

**Data de referência:** 19 de julho de 2026

**Aplicação:** 77Gira  
**Escopo:** experiência pública, contas, privacidade, artistas, casas, produtores, cardápios, anunciantes, aquisição, Central de Operações, suporte, segurança e infraestrutura operacional.

**Estado do documento:** atualizado após a consolidação do 77Gira Ads, Cardápio Essencial, Central de Operações e inteligência de aquisição. Quando houver divergência entre este manual e uma regra executada pelo backend, prevalece a autorização e a validação do backend.

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
22. [Histórico desta revisão](#22-histórico-desta-revisão)

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
| Operador interno | Usuário com escopo operacional explícito | Atuar na Central de Operações somente nos módulos autorizados |
| Aquisição | Administrador ou operação comercial autorizada | Prospectar casas, registrar interações, medir cadência e acompanhar conversão |
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
- escopo específico da Central de Operações;
- permissão para username oficial da marca.

Ter acesso a um módulo não concede acesso automático aos demais. A Central de Operações usa escopos como privacidade, reivindicações, catálogo, notificações, auditoria e configurações; o administrador continua sendo responsável por conceder e revogar esses escopos.

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

Salvar não significa necessariamente publicar. Em publicidade, existem portões independentes: campanha válida, criativos compatíveis, revisão editorial, Patacos vinculados, inventário disponível e ativação operacional. Aprovar conteúdo não equivale, isoladamente, a colocá-lo no ar.

---

## 4. Acesso sem login

### 4.1 O que o visitante pode fazer

Sem criar uma conta, o visitante pode:

- abrir a página Explorar;
- consultar eventos futuros e eventos ao vivo;
- filtrar por praça, região, data, horário e busca textual;
- abrir páginas de evento;
- abrir páginas de casas;
- consultar o Cardápio Essencial publicado de uma casa;
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
- acesso ao Cardápio Essencial, quando publicado;
- anúncio contextual, quando houver entrega elegível.

#### Cardápio Essencial — `/venues/:venueId/menu`

Exibe uma seleção curta mantida pela casa:

- categorias e itens ativos;
- nome, descrição, preço e modalidade de preço;
- apresentação ou tamanho da porção;
- características como especialidade da casa, vegetariano, vegano, sem álcool, picante ou edição limitada;
- destaques editoriais;
- ações de interesse, recomendação e salvamento quando habilitadas;
- publicidade apresentada pelo 77Gira, identificada de forma explícita, quando houver campanha elegível.

O cardápio é informativo. Disponibilidade e valores podem mudar; a data da última revisão deve orientar a pessoa antes de consumir. Publicidade exibida no cardápio não significa necessariamente parceria direta entre a marca e a casa.

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

- o access token tem duração curta e é renovado pelo refresh token;
- uma falha transitória ao validar a sessão não deve apagar imediatamente a identidade local nem forçar logout arbitrário;
- o app tenta recuperar a sessão e diferencia indisponibilidade temporária de credencial realmente inválida;
- logout revoga o refresh token utilizado;
- troca de senha e a ação “encerrar sessões em todos os dispositivos” revogam sessões ativas;
- telas protegidas exibem validação de sessão sem liberar conteúdo antes da autorização;
- tokens não devem ser enviados a terceiros, copiados para documentos nem gravados em logs de aplicação.

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
- localização-base;
- troca de senha, separada visualmente dos dados de identidade.

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

Não é solicitado endereço completo. A edição fica dentro de Dados pessoais. Quando Tô na Pista detectar localização incompleta, deve encaminhar a pessoa diretamente a esse fluxo de edição. Após salvar, o botão confirma “Localização salva”.

#### Perfis e acessos

Mostra artistas reivindicados e o caminho para o Hub de Gestão.

#### Suporte e informações

- Ajuda;
- Anunciar no 77Gira;
- Privacidade e dados;
- Privacidade;
- Termos de Uso;
- Sobre o 77Gira.

#### Sessão

- sair da conta.
- encerrar sessões em todos os dispositivos, mediante confirmação da senha atual.

### 6.3 Privacidade e dados — `/settings/privacy`

A Central de Privacidade permite ao titular:

- consultar o resumo das categorias de dados tratados;
- conceder ou retirar consentimentos opcionais de personalização cultural e publicidade relevante;
- baixar uma cópia estruturada dos próprios dados após reautenticação;
- solicitar acesso, exportação, correção, oposição, anonimização ou exclusão;
- acompanhar protocolo, prazo, status e resolução de cada pedido;
- solicitar exclusão da conta com senha atual e confirmação textual.

Uma solicitação de exclusão não apaga tudo imediatamente. O 77Gira primeiro avalia vínculos profissionais, campanhas, créditos, contratos, denúncias, auditoria e outras hipóteses de retenção. O resultado pode ser exclusão, anonimização ou retenção parcial justificada. Toda decisão administrativa deve indicar responsável, fundamento e trilha de auditoria.

### 6.4 Seguir artistas

Na página do artista:

1. tocar em `+ Seguir`;
2. o botão muda para `Seguindo`;
3. tocar novamente para deixar de seguir.

O contador de seguidores é atualizado pelo vínculo da conta com o artista.

### 6.5 Meu Radar — `/radar`

O Radar reúne eventos marcados para acompanhamento. O usuário pode:

- adicionar evento ao Radar;
- remover evento;
- abrir detalhes;
- consultar rotas;
- acompanhar eventos relevantes.

O Radar é pessoal e requer login.

### 6.6 Meu Histórico — `/history`

Permite:

- consultar sambas já frequentados;
- buscar por evento ou casa;
- remover marcação quando necessário;
- visualizar conquistas desbloqueadas.

Contas de casa são redirecionadas ao painel operacional em vez do histórico pessoal.

### 6.7 Conquistas

Conquistas são derivadas de ações e histórico. Elas podem possuir:

- nome;
- descrição;
- ícone;
- pontos;
- requisito.

O usuário não edita conquistas manualmente.

### 6.8 Pela Hora — `/pela-hora`

O usuário organiza um plano de eventos.

Fluxo:

1. definir nome e data do plano;
2. escolher modo manual ou sugestão automática;
3. selecionar eventos;
4. revisar sequência e deslocamentos;
5. salvar plano quando autenticado;
6. consultar ou excluir planos salvos.

### 6.9 Tô na Pista

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
9. ler e aceitar o aviso legal de legitimidade;
10. enviar para análise.

O status fica pendente até decisão administrativa. Alegar falsamente propriedade, representação ou autorização pode gerar recusa, bloqueio e preservação de evidências para auditoria. A aprovação cria acesso e pode verificar o artista conforme a regra operacional vigente; perfil público e EPK básico não dependem de o artista já ter sido reivindicado.

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

### 8.9 Equipe e acessos — `/workspace/artista/equipe`

Um artista pode ter mais de um administrador. Proprietários e gestores autorizados podem:

- consultar integrantes e convites;
- convidar por e-mail;
- escolher o papel compatível com a responsabilidade;
- alterar acesso existente;
- suspender ou revogar integrante;
- acompanhar convites pendentes.

Boas práticas: conceder o menor privilégio necessário, não compartilhar senha, revisar a equipe após mudanças de agência ou produção e manter ao menos um proprietário legítimo ativo.

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

### 9.8 Cardápio Essencial — `/settings/venues/:venueId/menu`

A casa autorizada pode manter até 30 itens ativos em uma seleção pública compacta. O fluxo permite:

- criar e editar item;
- escolher categoria, modalidade de preço, apresentação e status;
- informar descrição e preço;
- aplicar até quatro características;
- destacar um item;
- reordenar a lista;
- arquivar e restaurar itens;
- publicar e registrar a data de revisão dos preços;
- ocultar ou exibir preços;
- filtrar itens ativos e arquivados;
- importar CSV validado sem substituir silenciosamente o conteúdo existente;
- baixar um modelo CSV e exportar o cardápio atual.

Para disponibilizar inventário publicitário no cardápio, a casa registra ciência sobre as condições comerciais. O 77Gira seleciona, revisa e distribui a publicidade; a casa não escolhe o anunciante e não recebe Patacos, remuneração ou participação de receita por essa exibição. A presença de uma campanha não representa parceria direta entre a marca e a casa.

Não existe bloqueio automático de marcas locais pela casa. Conflitos contratuais relevantes devem ser comunicados à equipe 77Gira para tratamento operacional e documental, sem transformar o cardápio em uma ferramenta de veto unilateral.

### 9.9 77First

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

O acesso começa por uma conta comum do 77Gira. Quem ainda não possui conta anunciante envia uma solicitação comercial com marca/projeto, tipo, razão social opcional, contato, objetivo e resumo da intenção. O envio não cria publicidade nem concede acesso automaticamente.

Depois da aprovação, o sistema cria ou ativa a conta anunciante e o membership correspondente. O usuário volta a entrar com o mesmo e-mail e senha da conta 77Gira; não é criada uma segunda senha exclusiva para Ads.

Quando há conta disponível, o usuário pode:

- selecionar conta anunciante;
- consultar campanhas e métricas resumidas;
- duplicar rascunhos para reaproveitar estrutura sem alterar a campanha original;
- criar campanha por um assistente de quatro etapas;
- adquirir e consultar Patacos na Carteira de mídia;
- vincular saldo livre a uma campanha;
- submeter campanha e criativos para revisão;
- acompanhar correções solicitadas, aprovação, ativação, pausa e encerramento.

Sem membership, a tela mostra a solicitação de acesso ou seu status. A rota `/anunciar` explica o produto para pessoas deslogadas e oferece caminhos explícitos para entrar ou criar conta antes da solicitação.

### 11.5 Slots publicitários atuais

- `explore_feed_large`: card grande no Explorar;
- `venue_detail_inline`: anúncio no detalhe da casa;
- `radar_header`: topo do Radar.
- `venue_menu_sponsor`: patrocínio vertical no Cardápio Essencial.

Dimensões atuais da fonte de verdade:

| Slot | Arquivo recomendado |
|---|---:|
| Explorar | 580 × 350 px |
| Página da casa | 580 × 240 px |
| Meu Radar | 580 × 258 px |
| Cardápio apresentado por | 900 × 1200 px |

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

O assistente do anunciante organiza a criação em:

1. **Objetivo e período:** anunciante, nome, objetivo, início e fim;
2. **Posição:** um ou mais slots e um criativo independente para cada posição escolhida;
3. **Orçamento:** aquisição simulada e vínculo de Patacos à campanha;
4. **Revisão:** conferência final e envio administrativo.

Cada slot preserva seu próprio arquivo, título e destino. Trocar o posicionamento no formulário não deve sobrescrever o criativo dos demais slots. Imagens incompatíveis recebem alerta contextual com dimensão real, proporção exigida e orientação de correção.

Status operacionais:

- draft;
- active;
- paused;
- ended.

Status operacional e status editorial são diferentes. Uma campanha pode estar aprovada editorialmente e ainda aguardar Patacos, janela de veiculação, inventário ou ativação.

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

Campanhas e criativos rejeitados ou com ajuste solicitado deixam a fila de pendências e ficam disponíveis para correção, acompanhados do fundamento. Rejeitar sem justificativa não deve concluir a decisão.

Na Gestão de Publicidade, a fila de revisão exibe imagem integral no formato do slot, placeholder quando não há asset e mockup coerente com a experiência apresentada ao anunciante. A aba Criativos é uma visão operacional e diagnóstica; não deve funcionar como uma segunda aprovação editorial disfarçada.

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

O backend gera uma entrega autorizada e registra impressão e clique por token de entrega. A ativação da campanha é o controle de veiculação; ligar um criativo individualmente é uma ação técnica excepcional, reservada a diagnóstico ou correção operacional.

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

O anunciante acompanha impressões, cliques, CTR, Patacos consumidos e saldo restante. A operação acompanha também fill rate, bloqueios, saúde por slot e atividade auditável. Métricas devem ser interpretadas com período, slot e campanha claramente definidos.

### 11.11 Carteira de mídia e Patacos

Patacos são unidades internas de orçamento publicitário. A carteira separa:

- saldo livre da conta anunciante;
- saldo já vinculado a campanhas;
- entradas, alocações, consumo, estorno e saldo após cada movimento;
- pedidos de aquisição e seu estado.

O gateway atualmente implementado é um simulador controlado, aberto apenas pelo fluxo de teste de aquisição. Ele reproduz ida, processamento e retorno automático, mas não realiza cobrança real nem substitui obrigações fiscais. O provedor definitivo e webhooks reais permanecem etapa futura documentada.

Depois do retorno, o saldo deve aparecer na carteira. Para constar no orçamento de uma campanha, os Patacos precisam estar vinculados àquela campanha; saldo livre e orçamento reservado são números diferentes.

### 11.12 Cloudflare R2

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

Na taxonomia operacional, **praça** significa cidade de atuação, como São Paulo; **região** significa a divisão territorial interna da praça, como Centro, Zona Norte, Zona Sul, Zona Leste ou Zona Oeste. Não trocar esses rótulos em tabelas e indicadores.

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

Cada mudança de etapa e interação relevante alimenta uma linha do tempo comercial. A leitura analítica permite filtrar por período de 1, 7, 30, 90 ou 120 dias e por etapa, acompanhando:

- movimentos realizados na linha do tempo;
- distribuição por status: mapeada, contato iniciado, conversa em andamento, apresentação marcada, proposta enviada, negociação, fechada, perdida ou retomar depois;
- funil e conversão;
- leads sem movimentação por sete dias ou mais;
- follow-ups vencidos;
- intervalo médio entre movimentos;
- cadência diária;
- responsável, origem, potencial e temperatura.

A carteira administrativa em `/settings/venues?section=acquisition` é a fonte de edição. A Central de Operações apresenta leitura, prioridade e histórico, encaminhando alterações detalhadas para essa carteira para evitar duas fontes concorrentes.

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

A função atual de cada área é:

- **Painel:** instrumentos de saúde, volume, bloqueios e atalhos;
- **Anunciantes:** aprovação comercial, contas e memberships;
- **Revisão:** única fila editorial para campanhas e criativos;
- **Campanhas:** ciclo operacional, período, orçamento, ativação, pausa, encerramento e duplicação;
- **Criativos:** diagnóstico de assets, slots e estado de entrega, sem repetir a aprovação;
- **Inventário:** disponibilidade e regras de cada placement;
- **Saúde:** alertas de entrega, configuração e anomalias;
- **Atividade:** trilha de alterações;
- **Financeiro:** carteira, pedidos e movimentações;
- **Relatórios:** impressões, cliques, CTR e exportações.

### 12.10 Central de Operações — `/operacoes`

É o cockpit interno independente da experiência comum. Possui fundo claro, alta densidade informacional e navegação responsiva, inclusive por gesto horizontal no mobile. O menu e o título acompanham a seção ativa.

Nem toda seção substitui o painel especializado. A Central prioriza, resume, revela contexto e encaminha a decisão; cadastros extensos e operações de domínio continuam em seus painéis de origem quando isso evita duplicidade de regras.

Módulos atuais:

- Visão geral;
- Privacidade e solicitações;
- Reivindicações de artistas e casas;
- Casas e programação;
- Aquisição;
- Praças e regiões;
- 77Gira Ads;
- Qualidade e moderação;
- Notificações;
- Auditoria;
- Configurações internas.

#### Acesso e escopos

A rota só abre para admin ou usuário com escopo operacional concedido. Estar autenticado no PWA comum não basta quando a conta não possui autorização. O backend valida cada escopo; ocultar um item do menu não é controle de segurança.

#### Privacidade

A lista inicial reduz exposição: mostra protocolo, nome redigido, tipo, status, prazo, risco e responsável. E-mail, username, motivo completo, vínculos e retenções só aparecem após abertura explícita do caso, que gera evento de auditoria.

Uma decisão pode solicitar informação, assumir responsabilidade, concluir com retenção, anonimizar ou avaliar exclusão definitiva. Ações irreversíveis exigem justificativa, protocolo digitado e confirmação reforçada. Quando WebAuthn estiver configurado, biometria ou senha do dispositivo confirma o desafio assinado; não substitui a análise legal.

#### Reivindicações

A Central exibe evidências restritas e permite aprovar ou recusar usando o mesmo motor transacional do fluxo administrativo. Recusa exige fundamento; aprovação pode criar vínculos reais de acesso.

#### Aquisição

Mostra KPIs, série temporal, distribuição por etapa, funil, cadência, leads parados, follow-ups vencidos e detalhe somente leitura com linha do tempo. A edição permanece na carteira completa de aquisição.

#### Auditoria e responsabilidade

A Central registra abertura de dados restritos, ator, ação, assunto, horário e metadados necessários. Decisões de alto risco não devem ser executadas por atalhos sem responsável ou justificativa.

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

Eventos analíticos registram interações de descoberta, artista, rota, Cardápio Essencial, anúncio e outros sinais. O registro deve respeitar políticas de privacidade e finalidade. Anunciantes recebem resultados agregados; não recebem uma lista com dados pessoais de quem viu ou clicou.

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

Criativos de Ads também são validados por slot: dimensão, proporção, MIME, tamanho máximo e vínculo com a conta/campanha. Prévia no navegador não substitui validação backend.

### 14.5 Segurança de produção

- login dev não funciona com `NODE_ENV=production`;
- guards backend são obrigatórios;
- esconder menu no frontend não substitui autorização;
- cadastro público não escolhe role;
- senha é armazenada por hash bcrypt;
- refresh tokens são armazenados por hash;
- troca de senha revoga sessões;
- rate limits protegem login, uploads, tracking, interações de cardápio, pagamentos simulados e ações sensíveis;
- CORS aceita somente origens públicas configuradas;
- cabeçalhos e HTTPS público são validados no boot de produção;
- ações administrativas e de privacidade geram auditoria;
- a Central de Operações usa autorização por escopo;
- WebAuthn permite confirmação reforçada vinculada à origem e ao dispositivo;
- dados sensíveis são minimizados na listagem e revelados apenas após ação explícita;
- secrets ficam no backend/infraestrutura;
- username oficial exige permissão explícita.

Senhas não podem ser recuperadas em texto claro porque são armazenadas como hash. O banco de dados, porém, não deve ser descrito como “ilegível por definição”: campos operacionais continuam acessíveis a processos autorizados e à infraestrutura. A proteção depende de credenciais fortes, isolamento do banco, TLS em trânsito, controles de acesso, auditoria, backups e minimização. Criptografia adicional por campo deve ser aplicada somente quando o modelo de risco e a necessidade operacional justificarem.

### 14.6 Resiliência de carregamento e PWA

- a inicialização distingue sessão inválida de API temporariamente indisponível;
- a tela pública não deve ficar branca por falha não tratada;
- consultas críticas possuem estados de carregamento, erro e tentativa novamente;
- a linha superior do Explorar funciona como indicador de carregamento sem deslocar o conteúdo;
- eventos podem ser consultados novamente quando o backend gratuito acorda;
- o onboarding aparece uma única vez por instalação/perfil do navegador e não deve reiniciar no último slide;
- service worker e assets versionados exigem validação após cada deploy para evitar mistura entre bundles antigos e novos.

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
| Manter Cardápio Essencial | Não | Não | Não | Com vínculo | Com vínculo autorizado | Não | Sim |
| Interagir com item de cardápio | Não | Sim | Sim | Sim | Sim | Sim | Sim |
| Criar campanha própria | Não | Não | Se membro anunciante | Se membro anunciante | Se membro anunciante | Com membership | Sim |
| Aprovar publicidade | Não | Não | Não | Não | Não | Não | Sim |
| Solicitar direito de privacidade | Não | Sim | Sim | Sim | Sim | Sim | Sim |
| Operar solicitação de privacidade | Não | Não | Não | Não | Não | Não | Sim/escopo explícito |
| Consultar inteligência de aquisição | Não | Não | Não | Não | Conforme autorização | Não | Sim/escopo explícito |
| Criar usuário comum | Não | Não | Não | Não | Não | Não | Sim |
| Autorizar username oficial | Não | Não | Não | Não | Não | Não | Sim |

“Com acesso” e “com vínculo” significam que o backend confirmou uma autorização específica; o papel isolado não basta.

Operadores internos não aparecem como um papel global separado nesta tabela: sua capacidade é calculada por escopos específicos. Um operador de privacidade, por exemplo, não recebe automaticamente poder sobre Ads, catálogo ou configurações.

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
- `VITE_ADS_CREDITS_PURCHASE_ENABLED`
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
- `ADS_CREDITS_PURCHASE_ENABLED`
- `ADS_MOCK_PAYMENT_ENABLED`
- `ADS_PAYMENT_PROVIDER`
- `ADS_MENU_SPONSOR_ENABLED`
- `VENUE_MENU_ENABLED`
- `VENUE_MENU_INTERACTIONS_ENABLED`
- `R2_SHARED_UPLOADS_ENABLED`
- `TO_NA_PISTA_SCHEDULER_ENABLED`

Flags equivalentes de frontend e backend devem estar coerentes. Interface visível com endpoint desligado gera erro; endpoint ligado com interface desligada mantém a função inacessível pela navegação normal.

---

## 17. Rotas funcionais principais

### Públicas

- `/explore`
- `/events/:eventId`
- `/venues/:venueId`
- `/venues/:venueId/menu`
- `/artists/:artistId`
- `/artistas/:artistId`
- `/privacy`
- `/terms`
- `/help`
- `/about`
- `/login`
- `/signup`
- `/anunciar`

### Conta

- `/settings`
- `/settings/account`
- `/settings/privacy`
- `/radar`
- `/history`
- `/pela-hora`

### Artista

- `/workspace/artista`
- `/workspace/artista/contratacoes`
- `/workspace/artista/midia`
- `/workspace/artista/desempenho`
- `/workspace/artista/equipe`

### Profissionais

- `/workspace/produtor`
- `/workspace/casa`
- `/workspace/anunciante`
- `/workspace/anunciante/campanhas`
- `/workspace/anunciante/novo-anuncio`
- `/workspace/anunciante/carteira`
- `/workspace/anunciante/pagamento/mock/:orderId`

### Administração

- `/settings/venues`
- `/settings/ads`
- `/settings/users`
- `/settings/venues/:venueId/menu`
- `/operacoes`

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

### “O app acordou, mas não trouxe os eventos”

Verificar:

- se o backend está acordando no Render;
- se a consulta saiu do estado de erro e foi refeita;
- se o indicador de atualização terminou;
- se filtros continuam válidos;
- se a sessão foi recuperada sem apagar o usuário;
- se há falha de CORS, service worker antigo ou asset incompatível no console.

O estado “sem eventos” só deve aparecer depois de uma resposta válida vazia. Timeout ou falha temporária deve oferecer tentativa novamente.

### “Criativo não foi salvo”

Verificar:

- slot selecionado no card e no dropdown;
- arquivo específico para cada posicionamento;
- JPG, PNG ou WebP;
- tamanho máximo de 5 MB;
- dimensão e proporção do slot;
- título e URL quando exigidos;
- feedback de erro próximo aos mockups;
- status da campanha: uma campanha em revisão não pode ser editada até voltar para correção ou ser duplicada como rascunho.

### “Comprei Patacos, mas o orçamento continua zero”

Confirmar se:

1. o pedido simulado foi processado;
2. o retorno automático recuperou a carteira correta;
3. o saldo aparece como livre;
4. o saldo foi vinculado à campanha.

Comprar adiciona saldo à carteira; vincular reserva orçamento para uma campanha. São movimentos separados e auditáveis.

### “Item do Cardápio não aparece”

Verificar:

- casa correta;
- item ativo ou arquivado;
- status disponível/indisponível;
- cardápio publicado;
- filtro da categoria;
- limite de itens ativos;
- feature flags do backend;
- data de revisão e cache da página pública.

---

## 19. Checklist por agente

### Visitante

- [ ] Explorar agenda
- [ ] Abrir evento
- [ ] Consultar casa
- [ ] Consultar artista
- [ ] Compartilhar
- [ ] Abrir rota
- [ ] Consultar Cardápio Essencial publicado
- [ ] Criar conta quando desejar personalização

### Público cadastrado

- [ ] Completar conta
- [ ] Cadastrar localização-base
- [ ] Seguir artistas
- [ ] Usar Radar
- [ ] Registrar histórico
- [ ] Criar plano Pela Hora
- [ ] Testar Tô na Pista
- [ ] Revisar consentimentos e solicitações em Privacidade e dados

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
- [ ] Revisar equipe, convites e papéis de acesso

### Casa

- [ ] Confirmar vínculo
- [ ] Completar dados
- [ ] Cadastrar programação
- [ ] Revisar artistas antes de criar
- [ ] Configurar recorrência
- [ ] Acompanhar eventos
- [ ] Gerenciar equipe autorizada
- [ ] Criar, publicar, exportar e revisar Cardápio Essencial
- [ ] Registrar ciência das condições de publicidade do cardápio
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
- [ ] Definir objetivo e período
- [ ] Escolher um ou mais posicionamentos
- [ ] Enviar um criativo compatível para cada posição
- [ ] Adquirir Patacos e vincular orçamento
- [ ] Submeter revisão
- [ ] Corrigir rejeições
- [ ] Colocar campanha aprovada no ar
- [ ] Acompanhar impressões, cliques, CTR e saldo

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
- [ ] Monitorar cadência, leads parados e follow-ups vencidos
- [ ] Operar a Central conforme escopos e registrar decisões
- [ ] Tratar solicitações de privacidade com retenção e auditoria
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
11. Solicitação de exclusão nunca deve apagar dados antes da análise de vínculos e retenções.
12. Dados restritos só devem ser abertos dentro de um caso e com evento de auditoria.
13. Escopo da Central de Operações deve seguir menor privilégio e revisão periódica.
14. Aprovação editorial, orçamento, inventário e ativação de Ads devem permanecer controles independentes.
15. Saldo de Patacos deve ser conciliável pelo ledger; nunca inferido apenas pela interface.
16. Cardápio patrocinado deve identificar publicidade e não prometer remuneração à casa.
17. Métrica comercial precisa ter período, etapa e fonte definidos antes de orientar decisão.
18. Toda mudança de status em aquisição deve alimentar histórico e responsável.

---

## 21. Encerramento

O 77Gira não é apenas uma agenda. A implementação atual combina:

- descoberta cultural;
- identidade pública de artistas e casas;
- relacionamento com público;
- rotas e planejamento;
- contratação artística;
- operação profissional;
- Cardápio Essencial;
- publicidade de marca;
- aquisição com cadência e inteligência comercial;
- Central de Operações com privacidade, auditoria e escopos;
- governança de acesso;
- métricas de impacto.

O princípio central para todos os agentes é simples: descoberta é aberta; personalização exige conta; gestão exige vínculo; governança exige autorização; e identidade oficial exige validação.

---

## 22. Histórico desta revisão

### Versão 2.0 — 19 de julho de 2026

Esta revisão incorporou:

- Central de Privacidade, consentimentos, exportação e solicitações de direitos;
- Central de Operações, autorização por escopo, auditoria e confirmação reforçada por WebAuthn;
- gestão de reivindicações com aviso legal e múltiplos administradores de artista;
- Cardápio Essencial público e administrativo, CSV, arquivamento, interações e inventário patrocinado;
- 77Gira Ads com workspace de quatro etapas, mockups por slot, alertas de compatibilidade, carteira e Patacos;
- gateway de pagamento simulado e separação entre saldo livre e orçamento de campanha;
- revisão, entrega, tracking de impressão/clique, relatórios e saúde de inventário;
- aquisição com histórico de status, interações, série temporal, funil, cadência e alertas de inatividade;
- resiliência de carregamento, recuperação de sessão, PWA e tratamento do backend adormecido;
- novas rotas, flags, permissões, diagnósticos e checklists.

### Limites ainda assumidos

- o gateway de pagamento permanece simulado, sem cobrança ou webhook financeiro real;
- obrigações fiscais e conciliação com provedor definitivo dependem de implantação futura;
- WebAuthn exige origem HTTPS válida e cadastro prévio do dispositivo;
- a qualidade das métricas depende de tracking ativo, inventário real e uso suficiente;
- feature flags e migrações precisam estar coerentes entre frontend, backend e produção.
