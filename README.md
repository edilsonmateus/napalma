# NaPalma

Aplicativo web mobile-first focado em eventos de samba.

## Inicio rapido

1. Backend
```bash
cd backend
npm.cmd install
copy .env.example .env
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name init
npm.cmd run prisma:seed
npm.cmd run dev
```

2. Frontend
```bash
cd frontend
npm.cmd install
npm.cmd run dev
```

3. URLs locais
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3333`

## Contas demo

Senha para todas: `123456`

- `admin@napalma.app` (admin)
- `produtor@napalma.app` (produtor)
- `casa@napalma.app` (casa)
- `lia@napalma.app` (publico)

## Operacao e qualidade

- Guia operacional: `docs/OPERACAO.md`
- Checklist QA manual: `docs/QA_CHECKLIST.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Versionamento e release: `docs/VERSIONAMENTO.md`
- Fechamento de release v1: `docs/LAUNCH_CHECKLIST_V1.md`

## Recursos implementados

- Auth JWT + refresh token
- RBAC por perfil
- Ownership de dados no backend
- Gestao de casas/artistas/eventos
- Gestao de vinculos de produtores por casa
- Radar, historico e conquistas
- Plano do Dia (Pela Hora) com sugestao/manual e timeline
- Publicidade (slots, placeholders, tracking e relatorios)
- Paineis por perfil (produtor, casa, publico)

## Comandos uteis

Backend:
```bash
cd backend
npm.cmd run test
npm.cmd run prisma:seed:achievements
```

Frontend:
```bash
cd frontend
npm.cmd run build
npm.cmd run preview
```

