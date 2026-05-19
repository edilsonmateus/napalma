# Operacao do NaPalma

## Sequencia de inicializacao

1. Abrir terminal do backend:
```bash
cd backend
npm.cmd run dev
```

2. Abrir terminal do frontend:
```bash
cd frontend
npm.cmd run dev
```

3. Abrir no navegador:
- `http://localhost:5173`

## Rotina recomendada

1. Antes de codar:
- confirmar backend online em `:3333`
- confirmar frontend online em `:5173`

2. Depois de mudar frontend:
```bash
cd frontend
npm.cmd run build
```

3. Depois de mudar backend:
```bash
cd backend
npm.cmd run test
```

## Seeds e banco

Quando precisar sincronizar conquistas sem reset:
```bash
cd backend
npm.cmd run prisma:seed:achievements
```

Recriar estado base (ambiente dev):
```bash
cd backend
npm.cmd run prisma:migrate -- --name init
npm.cmd run prisma:seed
```

## Perfis para validacao

- Admin: `admin@napalma.app`
- Produtor: `produtor@napalma.app`
- Casa: `casa@napalma.app`
- Publico: `lia@napalma.app`
- Senha: `123456`
