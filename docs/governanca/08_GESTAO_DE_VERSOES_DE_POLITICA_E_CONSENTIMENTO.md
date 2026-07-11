# Gestao de versoes de politica e consentimento

## Regra central

Uma mudanca material no tratamento de dados nao deve substituir silenciosamente a decisao anterior do titular. O 77Gira registra cada decisao opcional como um novo `PrivacyConsentRecord`, preservando finalidade, versao da politica, origem e momento da escolha.

## Quando criar uma nova versao

Atualize a versao da politica quando houver mudanca material em pelo menos um destes pontos:

- nova finalidade de tratamento ou inferencia;
- nova categoria de dado pessoal ou fonte de coleta;
- novo compartilhamento com operador, fornecedor ou parceiro;
- alteracao relevante em retencao, descarte ou anonimização;
- mudanca no uso de IA, publicidade personalizada ou localizacao;
- alteracao dos direitos, dos canais de exercicio ou da forma de revogacao.

Correcoes tipograficas, esclarecimentos sem efeito pratico e mudancas puramente visuais podem ser documentados internamente sem exigir nova escolha.

## Procedimento de publicacao

1. Descrever mudanca, dados envolvidos, finalidade, necessidade e alternativa menos invasiva.
2. Obter validacao juridica e de seguranca quando a alteracao for material.
3. Atualizar texto publico de politica, termos e avisos contextuais.
4. Alterar a constante `POLICY_VERSION` do backend e a versao enviada pelo cliente de consentimento.
5. Definir se nova escolha e necessaria antes de reativar uma preferencia opcional. Nunca presumir consentimento por silencio.
6. Validar que a nova decisao gera uma linha adicional, sem apagar o historico anterior.
7. Registrar a publicacao na trilha administrativa e manter evidencia da revisao.

## Revogacao e reapresentacao

- Preferencias opcionais devem continuar revogaveis a qualquer momento no Centro de Privacidade.
- Uma revogacao interrompe o tratamento opcional futuro; dados que precisem ser mantidos por seguranca, auditoria, defesa de direitos ou obrigacao legal exigem analise especifica.
- Caso nova versao altere materialmente a finalidade, a preferencia deve aparecer como nao definida ate nova escolha, quando aplicavel.

## Responsabilidades

| Papel | Responsabilidade |
| --- | --- |
| Produto | descreve necessidade e impacto na experiencia |
| Engenharia | implementa minimizacao, controles e registro de versao |
| Seguranca | avalia ameacas, acesso e fornecedores |
| Juridico/privacidade | valida base legal, transparencia, retencao e comunicacao |
| Operacao | publica, monitora solicitacoes e mantem evidencias |

## Limites

Este fluxo e uma base tecnica e operacional. A definicao de quando renovar consentimento, qual base legal aplicar e por quanto tempo reter dados deve ser confirmada para a operacao real por assessoria juridica especializada.
