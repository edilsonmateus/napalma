# Contributing

Thanks for contributing to NaPalma.

## Branching

- `main`: stable branch.
- Feature branches: `feat/<short-name>`
- Fix branches: `fix/<short-name>`

## Commit style

Use short, objective commits:

- `feat: add events time filter`
- `fix: handle prisma auth error message`
- `docs: update operation guide`

## Local setup

1. Backend:
```bash
cd backend
npm.cmd install
copy .env.example .env
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name init
npm.cmd run prisma:seed
npm.cmd run dev
```

2. Frontend:
```bash
cd frontend
npm.cmd install
npm.cmd run dev
```

## Validation before merge

- Frontend build passes:
```bash
cd frontend
npm.cmd run build
```

- Backend tests pass:
```bash
cd backend
npm.cmd run test
```

- Run manual checks from `docs/QA_CHECKLIST.md`.

## Pull request checklist

- [ ] Feature works for intended role(s).
- [ ] No regressions in public flow.
- [ ] Docs updated when behavior changed.
- [ ] Build/tests passing.
