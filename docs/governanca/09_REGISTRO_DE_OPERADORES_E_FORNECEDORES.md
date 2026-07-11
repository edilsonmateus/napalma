# Registro de operadores e fornecedores

## Objetivo

Antes de um fornecedor tratar dados do 77Gira, a operacao deve registrar a necessidade, o tipo de dado, o acesso concedido, as medidas de seguranca e o responsavel pela revisao. Esta base ajuda a manter controle sobre armazenamento, hospedagem, comunicacao, analytics, pagamentos e suporte.

## Cadastro minimo por fornecedor

| Campo | Pergunta que deve ser respondida |
| --- | --- |
| Servico e finalidade | Que problema resolve e por que ele e necessario? |
| Papel | Opera dados sob instrucao do 77Gira ou atua como controlador independente? |
| Dados envolvidos | Quais categorias estritamente necessarias podem circular? |
| Local de tratamento | Em quais paises/regioes os dados podem ser armazenados ou processados? |
| Acesso | Quem, dentro do 77Gira e do fornecedor, administra o acesso? |
| Seguranca | Ha criptografia, controle de acesso, logs, backup e resposta a incidente? |
| Retencao | Qual prazo e como ocorre exclusao ou devolucao ao fim do contrato? |
| Suboperadores | Existem terceiros adicionais envolvidos? |
| Contrato | O contrato contempla confidencialidade, seguranca, incidente e instrucao de tratamento? |
| Revisao | Quem aprovou e quando a decisao deve ser revisitada? |

## Fluxo de aprovacao

1. Produto descreve a necessidade e a alternativa menos invasiva.
2. Engenharia delimita dados, escopos, chaves, ambientes e logs.
3. Seguranca revisa privilegios, segredos, autenticacao e superficie de ataque.
4. Juridico/privacidade valida papeis, contrato, transferencia e comunicacao aplicavel.
5. Um responsavel aprova o uso e registra a proxima data de revisao.
6. A integracao entra em producao somente com segredo em ambiente protegido, permissao minima e plano de revogacao.

## Controle continuo

- Revisar fornecedores ao menos quando houver mudanca material de dados, incidente, troca de suboperador, novo pais de tratamento ou renovacao contratual.
- Remover chaves e acessos imediatamente quando a integracao for desativada.
- Nunca registrar token, senha, chave privada ou dado pessoal de teste neste documento.
- Manter inventario tecnico separado para IDs de projeto, responsaveis e datas de rotacao de segredos.

## Situacao no 77Gira

Este registro deve ser preenchido e aprovado antes de assumir qualquer garantia juridica sobre fornecedores. Em especial, integracoes de hospedagem, armazenamento de midia, envio de notificacoes, analytics, gateway de pagamento real e IA exigem revisao especifica antes de expansao comercial.
