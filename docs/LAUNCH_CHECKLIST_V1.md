# Launch Checklist v1 - NaPalma

## 1) Ambiente

- [ ] PostgreSQL ativo na porta `5432`.
- [ ] Arquivo `backend/.env` com `DATABASE_URL` valido e `JWT_SECRET`.
- [ ] Arquivo `frontend/.env` revisado (`VITE_API_BASE_URL`, `VITE_AD_PLACEHOLDER`).

## 2) Build e testes (obrigatorio)

Backend:
```bash
cd backend
npm.cmd run test
```

Frontend:
```bash
cd frontend
npm.cmd run build
```

## 3) Banco e seed

```bash
cd backend
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name release-v1-final
npm.cmd run prisma:seed
npm.cmd run prisma:seed:achievements
```

Se nao houver mudanca de schema, o migrate pode retornar `Already in sync` (ok).

## 4) QA funcional minimo (go/no-go)

- [ ] Login por perfil: `admin`, `produtor`, `casa`, `publico`.
- [ ] Explorar: filtros por regiao + busca.
- [ ] Radar: marcar/desmarcar evento.
- [ ] Historico: marcar como fui e progresso de conquistas.
- [ ] Pela Hora: salvar plano manual com 2+ sambas.
- [ ] Ads: pelo menos 1 slot validado (placeholder ou campanha ativa).

## 5) Operacao local

Terminal 1 (backend):
```bash
cd backend
npm.cmd run dev
```

Terminal 2 (frontend):
```bash
cd frontend
npm.cmd run dev
```

## 6) Congelamento da versao

```bash
git add .
git commit -m "chore: release v1.0.0 final polish + checklist"
git tag v1.0.0
```

Se usar remoto:
```bash
git push origin main
git push origin v1.0.0
```

## 7) Plano de rollback simples

- [ ] Manter backup do `.env` atual.
- [ ] Se falhar apos deploy, voltar para a tag estavel anterior.
- [ ] Revalidar apenas smoke: login, explorar, radar, historico.
