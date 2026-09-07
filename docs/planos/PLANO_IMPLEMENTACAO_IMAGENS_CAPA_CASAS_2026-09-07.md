# Plano de implementação — imagens de capa das casas

Data de referência: 2026-09-07
Estado: implementação local concluída
Responsável técnico: Codex, sob validação de produto da 77Gira

## 1. Objetivo

Permitir que uma pessoa responsável por uma casa envie uma fotografia comum e obtenha uma capa consistente, sem depender de Canva ou Photoshop, preservando o fluxo administrativo e evitando perda dos dados já preenchidos.

O trabalho inclui:

- correção da desmontagem do formulário durante renovação silenciosa da sessão;
- comunicação explícita do formato ideal antes da escolha do arquivo;
- validação local e no servidor;
- enquadramento assistido para capa e miniatura;
- geração de variantes otimizadas;
- armazenamento no Cloudflare R2;
- integração com edição administrativa e solicitação de alteração feita pela casa;
- compatibilidade integral com casas que possuem somente `imageUrl`.

## 2. Contrato visual e de arquivo

### 2.1 Capa

- formato ideal: 1600 × 900 px;
- proporção: 16:9 horizontal;
- mínimo recomendado: 1200 × 675 px;
- formatos aceitos: JPG/JPEG, PNG e WebP;
- peso máximo: 5 MB;
- conteúdo importante deve permanecer na região central.

### 2.2 Miniatura

- formato gerado: 640 × 640 px;
- proporção: 1:1;
- derivada da mesma imagem enviada, com enquadramento próprio.

### 2.3 Saídas responsivas

- capa principal: 1600 × 900 WebP;
- capa intermediária: 1200 × 675 WebP;
- capa compacta: 800 × 450 WebP;
- miniatura principal: 640 × 640 WebP;
- miniatura compacta: 256 × 256 WebP.

## 3. Regras invariantes

Estas regras não podem ser quebradas durante a implementação:

1. Nenhuma casa existente pode deixar de exibir sua imagem atual.
2. `Venue.imageUrl` permanece como fallback compatível.
3. Alterações solicitadas por administradores de casa continuam dependendo de aprovação da 77Gira.
4. O upload isolado não altera a imagem pública da casa.
5. Um usuário não pode vincular um conjunto de imagens enviado por outra conta.
6. Falhas de formato, sessão, rede, armazenamento ou processamento não fecham o formulário.
7. Eventos, artistas, publicidade e parceiros não terão seus pipelines de imagem alterados nesta entrega.
8. O controle `Casa Gold Partner` continua exclusivo de administradores da 77Gira.
9. Toda alteração de banco deve ser aditiva e aceitar valores nulos.
10. O editor deve funcionar por teclado e possuir ações claras de cancelar, substituir e confirmar.

## 4. Estratégia de implementação por fases

### Fase A — preservar a sessão e o formulário

- [x] Separar validação inicial da sessão de renovações silenciosas de token.
- [x] Manter a árvore de rotas montada quando um token for renovado em segundo plano.
- [x] Exibir a tela integral de validação somente no bootstrap ou em retomada explicitamente solicitada.
- [x] Confirmar que `VenuesAdminPage` não perde `editingVenueId`, formulário ou seção durante refresh de token.
- [x] Garantir que falhas temporárias não redirecionem usuários autenticados para o Explorar.
- [x] Cobrir o contrato com testes de regressão de sessão.

Critério de saída: uma requisição iniciada com access token expirado pode renovar a sessão e concluir ou falhar sem desmontar a tela ativa.

### Fase B — contrato de upload e comunicação

- [x] Criar constantes compartilháveis no frontend para tipos, tamanho, resolução e proporção.
- [x] Exibir, antes do seletor, 1600 × 900 px, 16:9, JPG/PNG/WebP e 5 MB.
- [x] Validar no navegador tipo declarado, tamanho, leitura e dimensões.
- [x] Mostrar nome, formato, peso e resolução da imagem escolhida.
- [x] Tratar baixa resolução como alerta, não bloqueio automático.
- [x] Exibir erros junto ao campo, preservando todos os dados.

Critério de saída: a pessoa conhece o formato antes de abrir o explorador e recebe diagnóstico claro antes de qualquer envio.

### Fase C — modelo de dados aditivo

- [x] Criar `VenueImageAsset` com proprietário, chaves/URLs das variantes, dimensões, checksum, status, expiração e auditoria temporal.
- [x] Adicionar relação opcional da imagem ativa em `Venue`.
- [x] Acrescentar URLs opcionais de capa e miniatura ao payload de leitura, mantendo `imageUrl`.
- [x] Criar migração sem backfill destrutivo e sem alteração dos registros existentes.
- [x] Definir estados `draft`, `attached`, `rejected` e `expired`.

Critério de saída: casas antigas funcionam sem alteração e novos conjuntos de imagem podem existir como rascunho sem publicação.

### Fase D — processamento seguro no servidor

- [x] Criar endpoint específico para rascunhos de imagem de casa; não ampliar silenciosamente `/uploads/image`.
- [x] Exigir autenticação e perfil permitido.
- [x] Para casa existente, confirmar acesso administrativo ou operacional à casa.
- [x] Validar o conteúdo real com Sharp.
- [x] Aplicar rotação EXIF e limitar quantidade de pixels.
- [x] Rejeitar JPG/PNG/WebP inválidos e formatos não suportados.
- [x] Remover metadados pela recodificação.
- [x] Implementar modo `cover` e modo `contain_blur`.
- [x] Gerar todas as variantes WebP previstas neste documento.
- [x] Armazenar variantes com chaves aleatórias e cache imutável no R2.
- [x] Registrar checksum, dimensões, autoria e estado de rascunho.
- [x] Não retornar segredos, caminhos internos sensíveis ou metadados pessoais.

Critério de saída: um arquivo válido produz um conjunto imutável e auditável; um arquivo inválido não grava ativos parciais utilizáveis.

### Fase E — editor de enquadramento

- [x] Abrir modal após validação local, antes do upload.
- [x] Mostrar prévia 16:9 e prévia 1:1.
- [x] Permitir arrastar, aplicar zoom e redefinir posição.
- [x] Oferecer `Preencher o banner` e `Mostrar a imagem inteira`.
- [x] Usar URL local (`blob:`) para prévia e revogá-la no descarte.
- [x] Confirmar acessibilidade de foco, Escape, rótulos e navegação por teclado.
- [x] Desabilitar somente a ação em andamento, não o formulário inteiro.
- [x] Mostrar progresso e resultado junto ao campo.

Critério de saída: imagens horizontais, verticais e quadradas podem ser enquadradas sem distorção.

### Fase F — integração com edição e reivindicações

- [x] Admin da 77Gira pode anexar o ativo confirmado ao salvar a casa.
- [x] Administrador de casa envia apenas `venueImageAssetId` na solicitação de alteração.
- [x] Validar no servidor que o ativo pertence ao solicitante e corresponde à casa, quando aplicável.
- [x] Mostrar a imagem proposta na revisão administrativa.
- [x] Na aprovação, anexar ativo e atualizar URLs em transação.
- [x] Na recusa, manter a imagem pública e marcar o rascunho como rejeitado.
- [x] Atualizar a lista segura de campos/processamento de `venue_update` sem aceitar URLs arbitrárias como substituto do ativo.
- [x] Registrar a alteração na auditoria.

Critério de saída: nenhuma imagem enviada por casa aparece publicamente antes da aprovação.

### Fase G — consumo das variantes

- [x] Perfil público usa capa 16:9 e `imageUrl` como fallback.
- [x] Diretório de reivindicação usa miniatura e fallback atual.
- [x] Ficha administrativa usa miniatura e fallback atual.
- [x] Central de Operações mostra atual e proposta na revisão.
- [x] Usar `srcset`/`sizes` nas imagens responsivas quando aplicável.
- [x] Substituir alturas fixas da capa por `aspect-ratio: 16 / 9` sem alterar os cards de eventos.

Critério de saída: cada superfície usa a variante adequada e registros antigos continuam visíveis.

### Fase H — retenção, observabilidade e implantação

- [x] Definir prazo para rascunhos abandonados.
- [x] Criar limpeza idempotente de banco e objetos R2 expirados.
- [x] Medir sucesso, rejeição por formato, baixa resolução, falha de processamento e falha R2.
- [x] Colocar o editor sob feature flag.
- [ ] Implantar backend e migração antes do frontend.
- [ ] Executar smoke test como admin e administrador de casa.
- [x] Manter rollback por flag para o seletor atual.

Critério de saída: o fluxo pode ser ativado gradualmente e desligado sem tornar imagens existentes indisponíveis.

## 5. Contrato sugerido do endpoint

`POST /venues/image-assets`

Multipart:

- `file`: arquivo original;
- `venueId`: opcional para criação administrativa, obrigatório em edição de casa existente;
- `bannerMode`: `cover` ou `contain_blur`;
- `bannerCrop`: JSON normalizado com posição e zoom;
- `thumbnailCrop`: JSON normalizado com posição e zoom.

Resposta mínima:

```json
{
  "item": {
    "id": "uuid",
    "status": "draft",
    "bannerUrl": "https://...",
    "bannerMediumUrl": "https://...",
    "bannerSmallUrl": "https://...",
    "thumbnailUrl": "https://...",
    "thumbnailSmallUrl": "https://...",
    "sourceWidth": 1600,
    "sourceHeight": 900,
    "sourceMimeType": "image/jpeg"
  }
}
```

O servidor nunca confiará nas dimensões ou no MIME enviados pelo navegador.

## 6. Testes obrigatórios

### Sessão

- access token válido;
- access token expirado com refresh válido;
- refresh temporariamente indisponível;
- refresh definitivamente inválido;
- formulário permanece montado durante renovação silenciosa.

### Arquivos

- JPG, PNG e WebP válidos;
- extensão falsa;
- HEIC, GIF, BMP e AVIF;
- arquivo vazio ou corrompido;
- imagem vertical, horizontal e quadrada;
- baixa resolução;
- arquivo no limite e acima de 5 MB;
- imagem comprimida com dimensões excessivas.

### Processamento

- rotação EXIF;
- dimensões exatas das cinco variantes;
- `cover` sem distorção;
- `contain_blur` sem faixas vazias;
- metadados removidos;
- falha intermediária sem ativo anexável.

### Autorização e aprovação

- admin anexa diretamente;
- casa cria rascunho próprio;
- produtor sem acesso não anexa;
- usuário não reutiliza ativo de terceiro;
- aprovação aplica o conjunto correto;
- recusa preserva a imagem atual;
- Gold Partner permanece imutável para não admins.

### Regressão visual

- perfil público em desktop e mobile;
- listagem de casas;
- ficha administrativa;
- Central de Operações;
- casas legadas contendo somente `imageUrl`.

## 7. Protocolo de execução

Antes de iniciar cada fase, reler integralmente a seção correspondente e confirmar as regras invariantes. Após cada fase:

1. executar testes direcionados;
2. executar build do frontend quando houver alteração visual;
3. revisar `git diff --check`;
4. atualizar os checkboxes deste documento apenas para itens realmente concluídos;
5. não avançar se a fase introduzir regressão em autenticação, reivindicação, publicação ou exibição legada.

## 8. Fora de escopo inicial

- conversão de HEIC/HEIF;
- reconhecimento de rosto ou inteligência artificial externa;
- editor de texto, filtros ou efeitos;
- alteração dos criativos de publicidade;
- alteração de imagens de eventos e artistas;
- migração obrigatória das imagens antigas.

## 9. Definição de pronto

- instruções 1600 × 900, 16:9, JPG/PNG/WebP e 5 MB aparecem antes do seletor;
- sessão renovada não fecha nem reinicia o formulário;
- arquivo inválido gera mensagem local clara;
- editor produz capa e miniatura sem distorção;
- imagens de casas só são publicadas no momento autorizado;
- casas antigas continuam usando `imageUrl` sem falha;
- testes de sessão, processamento, autorização, aprovação e regressão visual passam;
- feature flag permite rollback operacional.

## 10. Registro de execução — 07/09/2026

- Fases A a G implementadas e verificadas no repositório.
- Fase H implementada no código para expiração em sete dias, limpeza idempotente, métricas técnicas e rollback por flag.
- Migração aditiva `20260907194500_venue_image_assets` aplicada com sucesso no banco local, sem backfill ou remoção de dados.
- Cliente Prisma regenerado depois de encerrar somente a instância local do backend que mantinha a DLL bloqueada.
- Backend reiniciado e respondendo como `ready` na porta 3333; frontend local respondendo na porta 5173.
- Build de produção do frontend concluído.
- Testes direcionados: 30 aprovações em 12 arquivos, incluindo sessão, autorização, processamento, anexação, recusa, limpeza e fallbacks.
- Suíte ampla: 310 de 317 testes aprovados; as sete falhas restantes já existiam fora deste escopo (textos jurídicos/produto, mocks de pagamentos Ads e expectativa antiga de espaçamento do anúncio).
- Permanecem deliberadamente em aberto: implantação coordenada em produção e smoke test humano com contas admin/casa depois dessa implantação.
