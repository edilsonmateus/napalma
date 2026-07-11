# 77Gira Ads — Runbook de produção

Este documento fecha os três requisitos antes de operar campanhas com tráfego real: banco, validação ponta a ponta e proteção de borda. Execute cada bloco na ordem indicada e registre o resultado no deploy.

## 1. Aplicar a migration de métricas reais

Migration envolvida:

`backend/prisma/migrations/20260710230000_ads_real_delivery_tracking/`

Ela cria o registro de entregas verificáveis (`AdDelivery`), liga eventos à entrega e inclui o débito `delivery_charge` no livro de patacos. Não publique frontend novo antes de a migration ser aplicada no banco que atende a API de produção.

No ambiente que tem acesso ao banco de produção:

```powershell
cd "C:\caminho\do\backend"
npm.cmd ci
npm.cmd run prisma:migrate:deploy
$env:PRISMA_GENERATE_NO_ENGINE="true"
npm.cmd run prisma:generate
```

Critério de sucesso: o comando informa que a migration `20260710230000_ads_real_delivery_tracking` foi aplicada, sem migration pendente ou erro de enum.

Rollback: a migration é aditiva e não deve ser removida manualmente. Se houver falha após sua aplicação, pause campanhas no admin, restaure o deploy da API e investigue com backup do banco; não use `prisma migrate reset` em produção.

## 2. Smoke test ponta a ponta

Faça com uma campanha de teste, um criativo aprovado e uma conta anunciante de homologação. Não use campanha comercial nesta etapa.

1. Entre como anunciante e confirme que há patacos na carteira.
2. Crie campanha com um slot, período futuro/ativo e orçamento de pelo menos 10 patacos.
3. Envie um criativo, conclua revisão e confirme que a campanha aparece como elegível.
4. Abra o touchpoint correspondente em uma sessão normal; mantenha o anúncio com ao menos 50% visível por um segundo.
5. No painel Admin > Gestão de Publicidade > Relatórios, confirme uma impressão válida, um pataco debitado e saldo atualizado.
6. Clique no criativo. Confirme abertura do destino com UTM `utm_source=77gira`, `utm_medium=app`, `utm_campaign` e `utm_content`.
7. Confirme um clique no relatório, sem segundo débito de pataco.
8. Abra Admin > Saúde. Confirme inventário, entregas, impressões e ausência de alerta crítico inesperado.

Critério de sucesso: uma impressão = um débito, clique sem cobrança adicional, métricas coerentes e nenhum dado de sessão/IP exposto no painel.

## 3. Cloudflare: WAF e rate limit

No painel Cloudflare da zona `77gira.com.br`, abra **Security > WAF > Rate limiting rules**. Crie as regras abaixo com ação **Block** por 10 minutos. Ajuste a expressão de host para o domínio real da API se ela estiver em subdomínio próprio.

| Regra | Expressão sugerida | Limite |
| --- | --- | --- |
| Entrega de anúncios | `http.request.uri.path matches "^/api/ads/slots/.+/delivery$"` | 60 requisições por IP em 1 minuto |
| Eventos de anúncio | `http.request.uri.path matches "^/api/ads/deliveries/.+/(impression|click)$"` | 60 requisições por IP em 1 minuto |
| Autenticação | `http.request.uri.path matches "^/api/auth/(login|refresh|dev/admin)$"` | 8 requisições por IP em 1 minuto |

Observações:

- Mantenha as regras de borda alinhadas aos limites já existentes na API; a Cloudflare reduz carga antes de chegar ao backend, mas não substitui a validação do token de entrega.
- Na API publicada atrás do Render, configure `TRUST_PROXY_HOPS=1`. Isso faz os limites internos usarem o IP encaminhado pelo proxy em vez do IP compartilhado da infraestrutura. Não aumente esse valor sem confirmar a cadeia de proxies.
- Não use desafio interativo nos slots de anúncio: isso degrada a experiência do público. Para eventos suspeitos, prefira bloqueio temporário por taxa.
- Ative os logs de Security Events e revise falsos positivos na primeira semana.
- Se a API estiver atrás de proxy, confirme que ela recebe o IP real somente por cabeçalhos confiáveis da Cloudflare; não trate um `X-Forwarded-For` livremente enviado pelo cliente como evidência de fraude.

## Aprovação de go-live

Só liberar campanha paga após os três blocos acima passarem. Registre data, operador, campanha de teste e resultado do smoke test no histórico operacional.
