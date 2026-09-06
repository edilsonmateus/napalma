# Publicação controlada do piloto de casas e aceites

## Objetivo

Disponibilizar a participação gratuita de casas e produtores no 77Gira sem ativar 77Gira Ads, cobrança, patrocínio, compra de mídia ou qualquer compromisso comercial. O fluxo deve registrar ciência antes da reivindicação e, quando a assinatura reforçada estiver habilitada, exigir a assinatura antes da liberação do acesso de gestão.

## Documentos do pacote

Os quatro documentos oficiais de trabalho estão em `docs/juridico/pacote_piloto_casas_v1_5/`.

| Documento | Categoria no sistema | Onde aparece | Público |
| --- | --- | --- | --- |
| Termos de Uso 77Gira Piloto | `terms_of_use` | página pública e documentos da conta | todas as contas e visitantes |
| Política de Privacidade 77Gira Piloto | `privacy_cookies` | página pública e documentos da conta | todas as contas e visitantes |
| Termo de Reivindicação e Gestão de Perfil no Piloto | `claim_management` | antes da reivindicação e na assinatura reforçada após aprovação | gestores de casa e produtores |
| Política de Conteúdo Moderação e Denúncias no Piloto | `content_moderation` | página pública e referência de moderação | todas as contas e visitantes |

## Regra de não ativação automática

Nenhuma versão deve ser publicada diretamente por seed, deploy ou alteração de código. A ativação é uma decisão operacional registrada na Central de Operações. Isso protege as contas existentes: somente versões com estado `active` podem pedir aceite ou bloquear uma ação.

## Ordem de publicação na Central de Operações

1. Abrir **Central de Operações > Documentos e aceites**.
2. Confirmar que o catálogo já contém os quatro documentos acima. Não criar uma segunda categoria para o piloto.
3. Criar versão `1.5.0` para cada documento, copiando o texto correspondente do pacote piloto.
4. Marcar a mudança como **material**. Para Termos de Uso e Privacidade, marcar também que requer novo aceite quando a versão for publicada para contas existentes.
5. Conferir o público de cada versão conforme a tabela e revisar a prévia integralmente.
6. Consultar o impacto estimado antes de continuar. Não publicar se houver texto incompleto, dado institucional incorreto ou pendência jurídica relevante.
7. Mover a versão por **rascunho**, **em revisão**, **aprovada** e **vigência agendada**. Registrar uma justificativa objetiva em cada etapa.
8. Na data e hora escolhidas, publicar a versão. A publicação substitui a versão ativa anterior da mesma categoria, mas preserva os registros de aceite históricos.

## Ordem recomendada para reduzir impacto em sessões existentes

1. Publicar primeiro a Política de Conteúdo e os Termos de Uso nas páginas públicas.
2. Publicar a Política de Privacidade e comunicar a atualização por meio adequado.
3. Publicar o Termo de Reivindicação e Gestão de Perfil no Piloto.
4. Testar com uma conta nova de casa: envio de reivindicação, análise, aprovação e assinatura reforçada.
5. Só então iniciar reuniões e convites para as casas.

Contas já autenticadas não devem ser deslogadas por essa mudança. Quando uma versão material exigir aceite, o pedido aparecerá no momento adequado: documentos de conta na área de configurações e Termo de Reivindicação antes de enviar o pedido profissional. Uma reivindicação iniciada antes da publicação deve permanecer consultável; não altere, cancele ou substitua seu histórico.

## Fluxo esperado da casa

1. A pessoa cria ou acessa sua conta comum no 77Gira.
2. Solicita a reivindicação ou gestão da casa.
3. Lê e aceita eletronicamente o Termo de Reivindicação e Gestão de Perfil no Piloto.
4. A equipe 77Gira analisa legitimidade e evidências.
5. Se elegível e se a assinatura reforçada estiver habilitada, a pessoa recebe o termo congelado, confirma senha, recebe código e assina.
6. Apenas depois da conclusão da assinatura, o acesso de gestão é liberado.
7. A casa pode cadastrar produtores autorizados e publicar programação, respeitando os Termos, a Política de Conteúdo e a Política de Privacidade.

## Verificações obrigatórias antes da primeira casa real

- Dados institucionais do rodapé, e-mail e endereço conferidos.
- Não há texto de teste, marcador de homologação ou pendência jurídica nos documentos a publicar.
- Não há referência a cobrança, publicidade, Patacos ou patrocínio como recurso disponível no piloto.
- A página de Termos, a Política de Privacidade e a Central de Ajuda exibem a etapa piloto com a mesma regra de gratuidade.
- O Termo de Reivindicação aparece antes do envio e novamente, congelado, no fluxo de assinatura reforçada.
- Uma conta já existente continua navegando normalmente e não perde dados, permissões ou histórico por causa da nova versão.
- Uma conta nova consegue concluir o fluxo completo em ambiente local.

## Limites desta etapa

Este pacote não substitui a revisão jurídica final nem autoriza a futura operação da 77Gira Ads. Antes de publicidade, pagamentos, patrocínio, contratação comercial ou mudança de identificação empresarial, devem ser publicados documentos próprios, com dados atualizados da parte contratante e fluxos específicos de aceite.
