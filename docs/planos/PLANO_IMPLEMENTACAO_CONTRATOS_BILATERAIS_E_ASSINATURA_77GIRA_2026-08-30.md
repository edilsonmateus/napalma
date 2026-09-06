# Plano de implementação - contratos bilaterais e assinatura eletrônica 77Gira

**Data:** 30/08/2026  
**Estado:** em implementação cautelosa. A fundação aditiva foi preparada no código em 30/08/2026; a migração ainda não foi aplicada, nenhuma rota nova foi ativada e nenhum envelope existente foi alterado.  
**Substitui:** a proposta inicial de modal administrativo que permitia escolher livremente a minuta.

## 1. Decisões consolidadas

1. O tipo de documento deve ser determinado pelo **contexto de negócio**, e não pela escolha livre de um administrador.
2. A contraparte preenche seus próprios dados cadastrais e de representação por convite seguro; a operação da 77Gira não digita esses dados em nome dela.
3. Não haverá download, edição externa e reenvio de DOCX dentro do fluxo de contratação.
4. A plataforma preenche somente variáveis controladas de uma minuta versionada; cláusulas não terão editor livre.
5. O texto final preenchido será exibido antes da assinatura, congelado, hasheado e mantido com a trilha de auditoria.
6. A emissão, por si só, não será tratada implicitamente como assinatura da 77Giramundo. Cada tipo de contrato terá uma regra explícita de conclusão.
7. Publicidade padronizada poderá usar o modelo de **proposta vinculante emitida pela 77Giramundo + assinatura da contraparte**, se a minuta e a autorização interna forem aprovadas juridicamente.
8. Parceria e patrocínio usarão o modelo de **assinatura da contraparte + ratificação eletrônica da 77Giramundo** antes de o contrato ficar concluído.

## 2. Contextos que determinam a minuta

| Contexto | Gatilho | Documento determinado pelo servidor | Ação administrativa |
|---|---|---|---|
| Reivindicação de Artista/Casa | Solicitação de ownership, team access ou inclusão | Termo de Reivindicação e Gestão, conforme alvo e audiência | Aprovar/rejeitar elegibilidade; não escolher minuta |
| Aceite de publicidade já existente | Pedido de acesso ou etapa de campanha | Termos de Publicidade / Patacos, conforme contexto | Aprovar conta/campanha quando aplicável |
| Contrato bilateral de publicidade | Evento futuro definido de contratação formal de publicidade | Contrato-base de Publicidade | Iniciar emissão somente quando o contexto for elegível |
| Contrato bilateral de parceria/patrocínio | Registro/aprovação de parceria formal | Contrato-base de Parceria e Patrocínio | Iniciar emissão somente quando a parceria estiver elegível |
| Documento excepcional | Solicitação fora dos fluxos acima | Documento explicitamente aprovado | Emissão manual avançada, restrita e auditada |

### Regra de segurança

O endpoint recebe o identificador do contexto, nunca um identificador livre de minuta. O servidor resolve a categoria, a audiência e a versão elegível. A emissão manual continua possível apenas em área avançada, com permissão específica e registro reforçado.

## 3. Dados que a contraparte preencherá

### Campos obrigatórios iniciais

- Razão social;
- CNPJ;
- sede/endereço;
- nome completo do representante;
- qualidade ou cargo de representação;
- e-mail do signatário.

### Fora do primeiro recorte

- título de campanha/parceria;
- vigência;
- valor;
- anexos comerciais;
- CPF do representante;
- upload de ato constitutivo, procuração ou outros documentos.

Esses itens não serão coletados ou declarados como verificados nesta primeira versão.

## 4. Modelo de dados e compatibilidade

### Novas estruturas aditivas

Criar um bloco de dados da contraparte associado ao envelope, não à Conta de Anunciante de forma global:

```text
LegalSignatureEnvelope
  counterpartLegalName
  counterpartTaxId
  counterpartRegisteredAddress
  counterpartRepresentativeName
  counterpartRepresentativeCapacity
  counterpartSignatoryEmail
  issueContext
  completionMode
  issuerAcceptedAt
  issuerAcceptedByUserId
  counterpartCompletedAt
  ratifiedAt
  ratifiedByUserId
```

Os campos serão opcionais na migração para preservar envelopes existentes, reivindicações em andamento e assinaturas já concluídas.

### Não fazer nesta fase

- Não substituir dados atuais de `AdvertiserAccount`.
- Não reprocessar conteúdo, hash ou status de envelopes existentes.
- Não invalidar sessão, convite, assinatura ou reivindicação existente.
- Não armazenar rascunho cadastral em `localStorage`, URL ou telemetria de frontend.

## 5. Variáveis permitidas e texto final

As minutas contratuais habilitadas receberão apenas os marcadores:

```text
{{RAZAO_SOCIAL_CONTRAPARTE}}
{{CNPJ_CONTRAPARTE}}
{{SEDE_CONTRAPARTE}}
{{REPRESENTANTE_CONTRAPARTE}}
{{QUALIDADE_REPRESENTANTE}}
{{EMAIL_SIGNATARIO}}
```

### Regras de substituição

1. O servidor valida que todos os marcadores obrigatórios foram preenchidos.
2. Marcador desconhecido bloqueia emissão e gera erro interno auditável.
3. Dados são tratados como texto, com escape de conteúdo para impedir injeção de HTML/Markdown.
4. O conteúdo-base, a versão-base e o conteúdo final permanecem vinculados ao envelope.
5. O hash a ser assinado é calculado sobre o **texto final preenchido**, não só sobre a minuta-base.
6. Depois da emissão, não há edição: somente cancelamento e reemissão.

## 6. Fluxo da contraparte

```text
Gatilho de negócio elegível
→ criação de convite de uso único, com prazo
→ contraparte autentica ou cria conta vinculada ao convite
→ preenche dados cadastrais e declara veracidade/poderes
→ validação de CNPJ e prévia do texto final
→ aceite de que leu o contrato
→ autenticação atual + código por e-mail
→ assinatura da contraparte
→ conclusão ou ratificação, conforme o tipo do contrato
```

### Declaração obrigatória

> Declaro que as informações prestadas são verdadeiras e que possuo poderes suficientes para representar a contraparte neste instrumento.

Essa declaração melhora a trilha de prova, mas não substitui a verificação documental quando ela for necessária.

## 7. Validação cadastral e de representação

### Primeiro nível automatizado

- validar formato e dígitos verificadores do CNPJ;
- consultar fonte pública oficial quando a integração estiver disponível;
- comparar CNPJ, razão social e situação cadastral com os dados informados;
- registrar apenas resultado, data, fonte e divergências; não armazenar resposta pública completa sem necessidade.

### Limite da consulta pública

A consulta pública é suficiente para confirmar a existência e a situação cadastral básica, mas não prova sozinha que quem assinou possui poderes contratuais. A verificação de representação dependerá de regra de risco.

### Regra inicial de risco

- Contrato padrão de baixo risco: declaração de poderes + assinatura reforçada.
- Valor relevante, exclusividade, cessão de dados, cláusula não padronizada ou divergência cadastral: fila de revisão humana.

Critérios monetários e documentais de escalonamento: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]**.

## 8. Modelos de conclusão e assinatura da 77Giramundo

### A. Publicidade padronizada - proposta vinculante

Quando juridicamente aprovado, o usuário autorizado da 77Giramundo emite uma proposta específica e vinculante. A minuta deve prever que o contrato é concluído pela assinatura válida da contraparte, sem uma segunda assinatura visual da 77Giramundo.

Requisitos técnicos:

- emissor tem escopo `legal_contract_issuer`;
- emissão registra usuário, autorização, data/hora, versão e hash;
- o conteúdo final não pode ser alterado após emissão;
- o envelope distingue `issuerAcceptedAt` de simples envio de e-mail;
- a contraparte aceita expressamente o mecanismo de assinatura eletrônica.

### B. Parceria/patrocínio - ratificação

Depois de a contraparte assinar, o envelope fica em `pending_ratification`. Um responsável autorizado da 77Giramundo revisa e ratifica dentro da plataforma, usando autenticação reforçada. Só então o envelope passa para `completed`.

Requisitos técnicos:

- papel `legal_contract_ratifier` separado do emissor quando a governança exigir;
- evento, data/hora, usuário e evidências da ratificação;
- cancelamento possível antes da ratificação;
- notificação clara à contraparte sobre o estado pendente.

### Decisão pendente

Classificação definitiva de quais contratos podem usar proposta vinculante e quais exigem ratificação: **[DECISÃO JURÍDICA/PRODUTO PENDENTE]**.

## 9. Segurança e privacidade por desenho

1. Aplicar autenticação e autorização por objeto: o signatário acessa apenas seu convite/envelope.
2. Usar convite de uso único, hash do token, prazo, limite de tentativas e invalidação após conclusão/cancelamento.
3. Transmitir dados exclusivamente por HTTPS; não expor dados em URL, analytics, logs de navegador ou mensagens de erro.
4. Não persistir o formulário no navegador; rascunho, se necessário, fica no servidor com expiração curta e acesso restrito.
5. Aplicar minimização: os campos são usados para identificar a contraparte no contrato, não para criar um cadastro comercial paralelo.
6. Armazenar o snapshot final e os dados estruturados estritamente necessários para execução, prova, auditoria e defesa de direitos.
7. Restringir leitura a contraparte, emissor, ratificador e administradores jurídicos autorizados; incluir auditoria de leitura de dados sensíveis.
8. Separar dados contratuais de eventos técnicos: logs não repetem CNPJ, endereço ou nome completo.
9. Criptografia em repouso, gestão de chaves, política de retenção, backup e resposta a incidentes devem ser verificados na infraestrutura antes da ativação.
10. Executar revisão de segurança de API, testes de autorização, testes de enumeração de convite, rate limiting e análise de dependências antes do lançamento.

## 10. Interface

### Para administração

O admin não escolhe a minuta em fluxos normais. Ele visualiza o contexto, o tipo de contrato determinado e o estado:

```text
Contrato de publicidade determinado pelo pedido X
Status: aguardando dados da contraparte
```

Somente a área avançada permite emissão manual excepcional, com justificativa obrigatória.

### Para a contraparte

- Modal ou página dedicada por convite, com uma etapa por vez;
- explicação curta de finalidade e dados solicitados;
- campos com validação local e no servidor;
- prévia legível antes do aceite;
- declaração de veracidade e poderes;
- ação separada para assinar;
- comprovante e acesso posterior ao documento final.

## 11. Migração e rollout

1. Criar migração somente aditiva.
2. Manter flags independentes para publicidade contratual e parceria/patrocínio.
3. Lançar primeiro em homologação com documentos de teste.
4. Testar somente contratos de publicidade padronizados com grupo interno controlado.
5. Habilitar parceria/patrocínio somente após aprovar a etapa de ratificação.
6. Ter rollback por flag; envelopes já emitidos continuam acessíveis e não são alterados.

## 12. Testes obrigatórios

- O contexto certo resolve a minuta certa sem input livre de versão.
- Uma reivindicação continua usando o fluxo atual e não abre o formulário cadastral contratual.
- Um pedido de publicidade gera somente o contrato de publicidade elegível.
- CNPJ inválido, campo faltante, marcador sem valor ou marcador desconhecido bloqueiam emissão.
- Dados enviados em HTML/script não alteram a estrutura da minuta.
- Dois convites não permitem acesso cruzado a envelopes.
- Reenvio, recusa, expiração e cancelamento preservam os estados atuais.
- Conteúdo final, hash e dados do snapshot permanecem idênticos após assinatura.
- Proposta vinculante conclui somente com assinatura válida da contraparte.
- Parceria/patrocínio não conclui sem ratificação autorizada.
- Regressão completa de reivindicações, assinaturas existentes, permissões, campanhas e sessões.

## 13. Critério de aceite

O módulo só pode ser ativado quando o contrato correto for determinado pelo contexto, a contraparte preencher os próprios dados, o texto final for imutável e auditável, e a regra de manifestação de vontade da 77Giramundo estiver explicitamente definida para cada tipo de instrumento.

## 14. Registro de implementação

### 30/08/2026 — fundação concluída, ainda desligada

- Criados campos aditivos no envelope para contexto, regra de conclusão, referência interna do negócio, dados da contraparte e marcos de emissão/ratificação.
- Criada migração aditiva pendente de aplicação; ela não reprocessa envelopes, reivindicações, sessões ou assinaturas existentes.
- Criadas flags independentes, inicialmente `false`, para o módulo geral, publicidade e parceria/patrocínio.
- Implementadas validação de CNPJ, validação dos campos obrigatórios, lista fechada de placeholders e escape do texto interpolado antes do congelamento do snapshot.
- Adicionado teste de que o contexto interno, e não uma versão de minuta enviada pelo navegador, determina a política documental.
- Regressões das reivindicações e assinaturas existentes foram executadas com sucesso nesta etapa.

### Próxima etapa controlada

Construir a emissão protegida por contexto e o formulário da contraparte, somente após manter a autorização por objeto e sem conectar a emissão automaticamente à aprovação de conta anunciante ou de parceiro.
