# NaPalma - Base do Projeto

Base inicial do app **NaPalma** (web mobile-first) em stack React + Node, com foco exclusivo em samba.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App local: `http://localhost:5173`

## Backend

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name auth_refresh_ownership_multi_manager
npm run prisma:seed
npm run dev
```

API local: `http://localhost:3333`

## Autenticacao JWT + Refresh

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me` (token obrigatorio)

Fluxo:

- `login` retorna `accessToken` (curto) + `refreshToken`.
- Frontend envia `Authorization: Bearer` automaticamente.
- Em `401`, frontend tenta `refresh` uma vez e repete a request.
- `logout` revoga o refresh token atual.

Usuarios seed (senha `123456`):

- `admin@napalma.app` (`admin`)
- `produtor@napalma.app` (`producer`)
- `casa@napalma.app` (`venue_manager`)
- `lia@napalma.app` (`attendee`)

## RBAC + Ownership

Permissoes por perfil:

- Eventos (`POST/PATCH/DELETE /events`): `admin`, `producer`, `venue_manager`
- Casas (`POST/PATCH/DELETE /venues`): `admin`, `producer`
- Artistas (`POST/PATCH/DELETE /artists`): `admin`, `producer`

Ownership aplicado:

- `admin`: acesso total.
- `producer`: so edita/deleta casas, artistas e eventos que criou.
- `venue_manager`: so cria/edita/deleta eventos das casas que gerencia (suporte a multiplas casas via vinculos).
- `attendee`: apenas leitura.

## Endpoints principais

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- Eventos: `GET /api/events`, `GET /api/events/:id`, `POST/PATCH/DELETE /api/events/:id`
- Casas: `GET /api/venues`, `GET /api/venues/:id`, `POST/PATCH/DELETE /api/venues/:id`
- Vinculos de gestores de casa:
- `GET /api/venues/:id/managers`
- `POST /api/venues/:id/managers` (body: `{ "userId": "..." }` ou `{ "email": "..." }`)
- `DELETE /api/venues/:id/managers/:userId`
- Artistas: `GET /api/artists`, `GET /api/artists/:id`, `POST/PATCH/DELETE /api/artists/:id`
- Regioes: `GET /api/regions`

## Gestao no frontend

A rota `/settings/venues` permite:

- CRUD de casas
- Vincular/remover gestores por casa
- Busca/autocomplete de gestores (`venue_manager`) para vinculo
- CRUD de artistas
- CRUD de eventos
- Autocomplete de artista no formulario de eventos

## Proximos passos sugeridos

1. Implementar upload real de imagens (S3/Cloudinary).
2. Criar testes de integracao de API (auth + refresh + RBAC + ownership + vinculos).
3. Adicionar CI para executar `npm run test` no backend.
