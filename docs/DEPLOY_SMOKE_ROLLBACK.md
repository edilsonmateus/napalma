# Deploy PWA - Smoke + Rollback

## 1) Pre-deploy
```powershell
cd "C:\Users\edils\OneDrive\Documentos\New project\backend"
npm.cmd run test

cd "C:\Users\edils\OneDrive\Documentos\New project\frontend"
npm.cmd run build
```

## 2) Smoke em ambiente publicado
## A) Publico
1. Abrir `/explore`
2. Filtrar por regiao e por hora
3. Abrir um evento e testar compartilhar
4. Salvar no radar

## B) Conta Casa
1. Login
2. Abrir menu `Eventos`
3. Criar rascunho e publicar evento de teste
4. Confirmar evento no explorar

## C) Conta Produtor
1. Login
2. Enviar claim de casa/artista
3. Validar restricao de edicao fora da carteira

## D) Conta Admin
1. Aprovar claim
2. Validar acesso do produtor apos aprovacao
3. Abrir Ads admin

## 3) Criterio de sucesso
- Nenhum erro bloqueante 5xx
- Fluxo completo de pelo menos 1 evento
- Permissoes por perfil respeitadas

## 4) Rollback rapido
## A) Git
```powershell
git log --oneline -n 10
git checkout <tag_ou_commit_estavel>
```

## B) Rebuild e restart
```powershell
cd backend
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run dev

cd ../frontend
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

## C) Banco (se migration nova quebrou)
1. Restaurar backup do banco anterior ao deploy.
2. Reaplicar apenas migrations validadas.
3. Rodar smoke minimo: login, explorar, radar, historico.
