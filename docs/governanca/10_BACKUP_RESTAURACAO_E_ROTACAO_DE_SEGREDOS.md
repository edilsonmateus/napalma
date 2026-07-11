# Backup, restauracao e rotacao de segredos

## Principio

Backup que nunca foi restaurado e uma hipotese, nao um controle. Segredos sem responsavel, ambiente e data de rotacao tambem sao um risco operacional. Este procedimento deve ser executado antes de abrir a operacao em escala.

## Backup e restauracao

1. Definir responsavel, frequencia, retencao, criptografia e local de armazenamento para banco e midias.
2. Garantir que contas de backup tenham privilegio minimo e nao compartilhem a mesma credencial de administracao cotidiana.
3. Testar restauracao em ambiente isolado, nunca sobre producao.
4. Registrar data, responsavel, versao restaurada, duracao, resultado e lacunas encontradas.
5. Medir dois objetivos aprovados pela operacao: quanto dado pode ser perdido (RPO) e em quanto tempo o servico deve voltar (RTO).
6. Revisar o plano depois de mudanca de banco, storage, volume de dados ou incidente.

## Rotacao de segredos

Inventariar ao menos: `DATABASE_URL`, `JWT_SECRET`, chaves de storage, VAPID, credenciais de gateway, chaves de webhook e tokens de integracoes.

Para cada segredo, registrar: dono, finalidade, ambiente, local seguro, privilegio concedido, data de criacao, proxima rotacao e procedimento de revogacao.

Ao rotacionar:

1. Criar novo segredo no cofre/variavel de ambiente protegida.
2. Atualizar o ambiente correto e fazer deploy controlado.
3. Confirmar saude de autenticacao, banco, upload, notificacao e integracao afetada.
4. Revogar o segredo antigo somente apos a confirmacao.
5. Registrar a rotacao na trilha operacional sem inserir o valor do segredo em logs, tickets ou commits.

## Verificacao de producao

- `NODE_ENV=production`, `JWT_SECRET` forte e sem valores de desenvolvimento.
- `CORS_ORIGINS` restrito aos dominios autorizados.
- HTTPS ativo no dominio publico e cabecalho HSTS validado depois do TLS.
- APIs com rate limits e logs de erro monitorados.
- Backups e restauracoes testados periodicamente.
- Acesso administrativo revisto e revogado quando nao for mais necessario.

## Limite

O 77Gira possui agora um baseline de cabecalhos HTTP no backend. A configuracao de firewall, WAF, backup gerenciado, cofre de segredos e monitoramento depende da infraestrutura escolhida e deve ser verificada no provedor antes do go-live.
