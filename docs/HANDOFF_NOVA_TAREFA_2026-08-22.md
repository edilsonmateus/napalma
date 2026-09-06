# Handoff — continuidade do 77Gira

Data: 22/08/2026

## Como começar

1. Trabalhe em `C:\Users\edils\OneDrive\Documentos\New project`.
2. Leia este documento inteiro.
3. Rode `git status --short --branch` antes de qualquer alteração.
4. Não edite, apague nem inclua em commit as pastas não rastreadas listadas abaixo sem primeiro inspecioná-las e obter autorização do usuário.
5. Na primeira resposta ao usuário, confirme que o contexto foi carregado e aguarde a próxima solicitação. Não implemente nada por iniciativa própria.

## Estado do Git na transição

- Branch: `main`
- Commit local: `8ebf305` — `fix: permite nova reivindicacao apos encerramento legal`
- `origin/main`: `8ebf305`
- Arquivos já rastreados: sem alterações pendentes no momento da transição.
- Pastas não rastreadas e deliberadamente preservadas:
  - `documentacao/`
  - `remotion/`
  - `scripts/`

Essas pastas podem conter material do usuário ou artefatos em desenvolvimento. Não presumir que devam ser commitadas, movidas ou removidas.

## Marco funcional atual

O projeto já possui, entre outros módulos:

- aplicativo público com Explorar, Radar, Pela Hora, Histórico, casas, eventos e perfis de artistas;
- ambientes de gestão para casas, produtores e artistas;
- 77Gira Ads, workspace do anunciante e console administrativo de publicidade;
- Central de Operações com filas administrativas, privacidade, aquisições, comunicações e documentos;
- infraestrutura documental versionada, aceite auditável e assinatura formal reforçada;
- armazenamento persistente de mídia em Cloudflare R2;
- player `77Play` para vídeos do EPK.

## Fluxo jurídico-profissional recém-trabalhado

O fluxo atual permite que uma conta comum solicite acesso profissional a uma casa ou artista:

1. usuário solicita vínculo/gestão;
2. solicitação aparece na Central de Operações com a natureza correta (por exemplo, acesso à equipe de uma casa, sem ser rotulada como reivindicação de artista);
3. administrador decide a elegibilidade;
4. quando aplicável, o sistema gera a assinatura formal;
5. usuário lê o documento, confirma ciência, valida senha, recebe código por e-mail e conclui a assinatura;
6. apenas após a conclusão legal o acesso profissional é liberado;
7. recusa ou encerramento anterior não deve bloquear uma nova solicitação válida.

Commits recentes relacionados:

- `8ebf305` — permite nova reivindicação após encerramento legal;
- `9cef9b7` — adiciona player 77Play para vídeos do EPK;
- `a9d38c7` — estabiliza confirmação e recusa de assinaturas;
- `4189d96` — restaura ações no aceite documental;
- `0f451f3` — controla envio de código para assinatura;
- `e9222b0` — atualiza homologação legal e Central de Operações;
- `9a5cd6b` — identifica acessos a equipes de casas;
- `87a1b54` — refina hierarquia dos ícones jurídicos.

## Último comportamento observado

No teste local com a usuária Lia:

- ela solicitou gestão de uma casa;
- o administrador aprovou a elegibilidade;
- o documento formal foi assinado;
- o card `Gestão de casas` passou a aparecer depois que a usuária saiu e entrou novamente na conta.

Ponto ainda a observar: a necessidade de relogin sugere que o frontend pode não atualizar imediatamente os vínculos/claims depois da assinatura. Isso ainda não foi confirmado como bug nem autorizado como correção. Antes de editar, reproduza e diagnostique o processo de atualização da sessão e do perfil autenticado.

## Regras de segurança e produto que não podem ser quebradas

- Não enfraquecer autenticação de produção.
- Não remover guards globais nem liberar acesso anônimo a Operações, administração ou Ads.
- Login de teste deve permanecer restrito a desenvolvimento e às flags próprias.
- Documentos jurídicos precisam manter versão, integridade, identidade, data e trilha de auditoria.
- Minutas de homologação local não têm validade jurídica e nunca devem ser publicadas em produção.
- Não registrar chaves, tokens, senhas ou valores de variáveis de ambiente em arquivos, commits, logs ou respostas.
- O R2 é a fonte persistente para mídias que precisam sobreviver a deploys.
- Não reconstruir o módulo Ads nem alterar sua arquitetura sem solicitação explícita.
- Preservar a estrutura de `/settings/ads` e as regras de autorização existentes, salvo pedido específico.

## Direção visual consolidada

- Interface do usuário final: tema escuro, delicado e consistente.
- Central de Operações e Ads: fundo claro, alta densidade informacional e referência visual semelhante ao Cloudflare Dashboard.
- Evitar campos brancos no tema escuro, controles desalinhados e botões sem hierarquia.
- Consultar os guias de interface/documentação existentes antes de criar novos padrões.

## Como rodar localmente

Backend:

```powershell
cd "C:\Users\edils\OneDrive\Documentos\New project\backend"
npm run dev
```

Frontend, em outro terminal:

```powershell
cd "C:\Users\edils\OneDrive\Documentos\New project\frontend"
npm run dev
```

Antes de alterar banco ou migrations, inspecione o estado atual. O histórico já apresentou drift local em migrations antigas; não aceite reset destrutivo sem avaliar os dados e sem autorização explícita.

## Produção

- Frontend: Vercel.
- Backend e PostgreSQL: Render.
- Mídia: Cloudflare R2.
- E-mail transacional: Brevo.
- A branch de publicação utilizada atualmente é `main`.

Antes de mudar comandos de inicialização, seeds, migrations ou variáveis de ambiente, verifique a configuração vigente e o impacto sobre dados reais e mocks.

## Conduta esperada na nova tarefa

- Tratar este arquivo como ponto de partida, não como substituto da inspeção do código.
- Preservar mudanças do usuário e o worktree existente.
- Diagnosticar antes de corrigir quando o usuário pedir investigação.
- Implementar e verificar quando o usuário pedir mudança.
- Não fazer commit, push, deploy ou alteração externa sem solicitação explícita.
