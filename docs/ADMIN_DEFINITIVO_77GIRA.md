# Admin definitivo 77Gira

Este projeto ainda mantém usuários de teste no seed, como `admin@napalma.app`.
Esses acessos são úteis para desenvolvimento, mas não devem ser tratados como o
administrador definitivo da operação.

## Regra segura

O administrador definitivo deve ser criado por variáveis de ambiente, sem senha
fixa no código e sem depender do seed de mock.

## Variáveis necessárias no backend

Configure no `.env` local ou nas Environment Variables do Render:

```env
ADMIN_BOOTSTRAP_EMAIL="seu-email-admin"
ADMIN_BOOTSTRAP_USERNAME="admin.77gira"
ADMIN_BOOTSTRAP_FIRST_NAME="Seu nome"
ADMIN_BOOTSTRAP_LAST_NAME="77Gira"
ADMIN_BOOTSTRAP_PASSWORD="uma-senha-forte-com-10-ou-mais-caracteres"
```

## Comando local

No PowerShell:

```powershell
cd "C:\Users\edils\OneDrive\Documentos\New project\backend"
npm.cmd run admin:bootstrap
```

## O que o comando faz

- Se o e-mail ainda não existir, cria o usuário como `admin`.
- Se o e-mail já existir, atualiza nome, username, senha e garante o papel `admin`.
- Não apaga casas, eventos, usuários, métricas ou dados de aquisição.

## Importante

Antes de iniciar prospecção real de casas, evite depender de seeds destrutivos em
produção. O seed atual recria a base de demonstração e deve ser tratado como massa
de teste/mock.
