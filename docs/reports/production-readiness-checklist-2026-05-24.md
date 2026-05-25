# NaPalma - Checklist de Producao (PWA) - 2026-05-24

## 1) Contas e acesso
- [ ] Conta Google principal para Play Console (ex.: `play77giramundo@gmail.com`)
- [ ] Conta tecnica separada (ex.: `dev77giramundo@gmail.com`)
- [ ] 2FA ativo em ambas
- [ ] Codigos de backup do 2FA guardados offline
- [ ] Cofre de senhas com:
  - [ ] Senha Play Console
  - [ ] Senha Auth0
  - [ ] Senha banco/infra
  - [ ] Keystore password
  - [ ] Key alias password

## 2) Ambiente e variaveis

### Backend
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` de producao
- [ ] `JWT_SECRET` forte (>= 32 chars)
- [ ] `CORS_ORIGINS` com dominio real do app (e subdominios necessarios)
- [ ] Pasta de upload substituida por storage persistente (S3/R2/Cloudinary)

### Frontend
- [ ] `VITE_API_BASE_URL` apontando para API de producao
- [ ] `VITE_ENABLE_TEST_LOGIN=false`
- [ ] `VITE_ENABLE_API_FALLBACK_MOCKS=false`

## 3) Segurança (status atual + pendencias)

### Ja aplicado
- [x] Drafts bloqueados em listagem publica
- [x] Drafts bloqueados em detalhe por ID
- [x] CORS com allowlist via env
- [x] Rate-limit em:
  - [x] `/auth/*`
  - [x] `/me/claims`
  - [x] `/uploads/image`
  - [x] `/ads/track/*`

### Recomendado no proximo hardening
- [ ] Rate-limit global por IP no `app.js`
- [ ] Auditoria (log estruturado) para acoes de admin
- [ ] Alertas para pico de 401/403/429/500

## 4) Banco e dados
- [ ] Rodar migracoes em producao
- [ ] Rodar seed somente quando necessario (evitar dados de teste)
- [ ] Backup automatico diario ativo
- [ ] Teste de restore documentado

## 5) Build e deploy

### Frontend (PWA)
- [ ] `npm.cmd run build` sem erro
- [ ] `manifest.json` validado
- [ ] Service worker validado em HTTPS
- [ ] Lighthouse PWA >= alvo interno

### Backend
- [ ] Healthcheck em `/health`
- [ ] Logs de aplicacao coletados
- [ ] Processo em gerenciador (PM2/systemd/container)

## 6) Qualidade final antes do go-live
- [ ] Fluxo publico: Explorar, Radar, Historico, Pela Hora
- [ ] Fluxo Casa: painel, eventos, dados, produtores, solicitar acesso
- [ ] Fluxo Produtor: carteira, claims, edicao permitida
- [ ] Fluxo Admin: moderacao claims, regioes, catalogo, ads
- [ ] Upload de imagem ponta a ponta
- [ ] Compartilhamento (WhatsApp/Telegram/Facebook) com payload final
- [ ] Rotas externas (Maps/Waze/Uber) ok

## 7) Go-live seguro
- [ ] Janela de deploy definida
- [ ] Plano de rollback (frontend e backend) pronto
- [ ] Pessoa responsavel de plantao no dia do deploy
- [ ] Lista de verificacao pos-deploy (15 min, 1h, 24h)

