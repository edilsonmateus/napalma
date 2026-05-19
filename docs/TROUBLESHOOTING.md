# Troubleshooting

## 1) npm ENOENT / package.json nao encontrado

Causa: comando rodou fora da pasta correta.

Solucao:
```bash
cd /d "C:\Users\edils\OneDrive\Documentos\New project\backend"
npm.cmd install
```

## 2) PowerShell bloqueando npm.ps1

Causa: politica de execucao do PowerShell.

Solucao rapida: usar `npm.cmd` em vez de `npm`.

Exemplo:
```bash
npm.cmd run dev
```

## 3) PrismaClient did not initialize yet

Causa: client do Prisma nao gerado.

Solucao:
```bash
cd backend
npm.cmd run prisma:generate
```

## 4) Authentication failed against database server at localhost

Causa: `DATABASE_URL` com senha errada no `.env`.

Solucao:
1. abrir `backend/.env`
2. ajustar senha real do postgres
3. rodar:
```bash
npm.cmd run prisma:migrate -- --name init
npm.cmd run prisma:seed
```

## 5) localhost:5173 recusando conexao

Causa: frontend nao esta rodando.

Solucao:
```bash
cd frontend
npm.cmd run dev
```

## 6) Proxy do navegador bloqueando localhost

Solucao:
- habilitar excecao para `localhost` e `127.0.0.1`
- ou desativar proxy para enderecos locais

## 7) Tela vazia na gestao apos filtros

Solucao:
- clicar `Limpar filtros`
- confirmar secao ativa (`Tudo/Casas/Artistas/Gestores/Eventos`)
