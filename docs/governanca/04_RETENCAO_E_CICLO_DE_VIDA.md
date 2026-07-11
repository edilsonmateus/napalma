# Retenção e ciclo de vida dos dados

Os prazos abaixo são parâmetros técnicos iniciais e exigem validação jurídica antes de virarem política definitiva.

| Categoria | Uso | Tratamento proposto |
| --- | --- | --- |
| Sessões e refresh tokens | autenticação | revogar no encerramento; remover expirados por rotina |
| Localização temporária Tô na Pista | proximidade | expirar ao fim da sessão; não reutilizar para Ads |
| Push inativo | notificações | desativar/remover após falhas ou inatividade definida |
| Analytics identificável | melhoria do produto | agregar/anonimizar após janela aprovada |
| Eventos de Ads | cobrança e antifraude | preservar somente o necessário, com identificadores em hash |
| Claims e decisões | segurança e exercício de direitos | reter conforme necessidade legal e disputa |
| Arquivos R2 | perfil/EPK/criativo | remover órfãos e versões substituídas segundo política |

Toda rotina de descarte deve começar em `dry-run`, registrar resultado em auditoria e ter monitoramento antes da exclusão efetiva.

## Implementação atual

O comando abaixo produz somente contagens de candidatos por categoria, sem listar identificadores nem remover registros:

```powershell
cd backend
npm.cmd run privacy:retention:preview
```

O endpoint administrativo `GET /api/admin/privacy-retention/preview` expõe o mesmo resultado para operação autenticada. Nenhuma rotina de descarte automático está habilitada nesta fase.
