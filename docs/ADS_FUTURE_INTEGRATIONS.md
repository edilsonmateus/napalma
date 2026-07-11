# 77Gira Ads — Integrações futuras deliberadamente adiadas

Estas integrações não fazem parte do lançamento atual. O Ads opera, por enquanto, com o gateway mock e monitoramento interno; este documento evita que o tema se perca e define como retomá-lo com segurança.

## Webhook de Saúde

O código já possui suporte opcional, desligado por padrão, para enviar alertas agregados de entrega. Ele nunca inclui IP, identificador de sessão, e-mail ou outro dado pessoal.

Quando houver um canal operacional definido (Slack, e-mail transacional, incident management ou equivalente), revisar:

1. Destino autenticado via HTTPS e segredo armazenado no ambiente de produção.
2. Responsáveis, horário de atendimento e regra de escalonamento.
3. Tipos de alerta que justificam interrupção humana: inventário esgotado, campanha bloqueada, frequência anormal e CTR fora do padrão.
4. Teste de falha do destino e retenção de logs.

Variáveis existentes, que devem permanecer desativadas até essa decisão:

```env
ADS_HEALTH_ALERTS_ENABLED=false
ADS_HEALTH_ALERT_WEBHOOK_URL=""
ADS_HEALTH_ALERT_INTERVAL_MS=900000
ADS_HEALTH_ALERT_COOLDOWN_MS=21600000
```

## Gateway Mercado Pago

O gateway mock existe para permitir desenvolvimento e homologação de patacos sem cobrança real ou obrigação fiscal prematura. A migração ao Mercado Pago deve preservar o contrato de produto atual: pedido de compra, retorno automático ao workspace, confirmação idempotente, crédito em carteira e alocação à campanha.

Antes de iniciar:

1. Definir empresa recebedora, modelo fiscal, política de reembolso e atendimento.
2. Criar credenciais separadas de sandbox e produção; nunca reutilizar token de teste em produção.
3. Implementar webhook assinado do provedor com validação de assinatura, idempotência e reconciliação.
4. Substituir o mock por um adaptador de pagamento, mantendo a mesma interface de pedido para não quebrar o workspace.
5. Fazer conciliação: pagamento aprovado, crédito de carteira, alocação de campanha e comprovante devem fechar entre si.

Critério de entrada: decisão fiscal/comercial formal e responsável operacional definido. Até lá, não ativar chave de produção do gateway.
