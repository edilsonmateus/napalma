# Resposta a incidentes e trilha de auditoria

## Finalidade

Este procedimento orienta a resposta a suspeitas de acesso indevido, vazamento, perda de integridade, indisponibilidade relevante ou uso improprio de dados no 77Gira. Ele complementa controles tecnicos; nao substitui avaliacao juridica, de seguranca e de protecao de dados.

## Sinais que exigem abertura de incidente

- acesso administrativo nao reconhecido;
- atividade anormal em contas, campanhas, pagamentos ou solicitacoes de direitos;
- exposicao acidental de informacao pessoal;
- falha de permissao, autenticacao ou integracao que possa afetar dados;
- indisponibilidade ou alteracao inesperada de registros importantes.

## Primeira hora: conter e preservar

1. Registre data, hora, pessoa que identificou o fato e impacto observado.
2. Preserve evidencias sem copiar dados pessoais para chats, e-mails ou planilhas abertas.
3. Revogue credenciais, sessoes ou integracoes somente quando houver indicio razoavel; anote toda acao tomada.
4. Suspenda apenas o recurso afetado quando possivel. Evite desligar o aplicativo inteiro sem necessidade.
5. Consulte **Usuarios > Trilha de auditoria** e os logs de infraestrutura. A trilha interna exibe somente metadados minimizados.

## Classificacao inicial

| Nivel | Exemplo | Resposta |
| --- | --- | --- |
| Baixo | falha isolada sem dados expostos | corrigir, documentar e monitorar |
| Moderado | permissao errada ou risco limitado | conter e acionar responsavel de privacidade |
| Alto | possivel acesso a dados pessoais, pagamentos ou administracao | conter, preservar evidencias e envolver seguranca/juridico |
| Critico | vazamento confirmado, comprometimento administrativo ou indisponibilidade ampla | tratar como incidente maior e avaliar comunicacao aos titulares e autoridade competente com suporte juridico |

## Investigacao e decisao

- Determine sistemas, contas, categorias de dados e titulares possivelmente afetados.
- Compare auditoria do aplicativo, logs de hospedagem, banco, autenticacao e armazenamento.
- Nao altere ou exclua registros de auditoria para "limpar" o ambiente.
- Documente hipoteses, confirmacoes, decisoes, responsaveis e horarios.
- Antes de notificar titulares ou orgaos, revise obrigacoes aplicaveis com orientacao juridica, considerando risco ou dano relevante.

## Recuperacao e aprendizado

1. Corrija a causa raiz e valide permissoes, limites de taxa, autenticacao e segredos envolvidos.
2. Monitore o recurso afetado ate haver evidencia de estabilidade.
3. Registre a resolucao no incidente e, quando apropriado, na solicitacao de privacidade relacionada.
4. Produza retrospectiva com linha do tempo, impacto, correcao e prevencao.
5. Transforme a prevencao em item verificavel de backlog ou controle automatizado.

## Limites atuais

- A trilha interna nao substitui logs de infraestrutura, firewall, banco ou provedor de pagamentos.
- Retencao e descarte efetivos continuam sujeitos a aprovacao juridica e definicao de prazos formais.
- Este procedimento deve ser revisado antes de operacao em escala, gateway real ou tratamento de categorias sensiveis.
