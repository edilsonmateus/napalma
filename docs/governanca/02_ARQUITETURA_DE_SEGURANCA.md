# Arquitetura de Segurança e Auditoria

## Controles existentes

- TLS provido pela infraestrutura publicada.
- Senhas protegidas por hash bcrypt; tokens de refresh persistidos como hash.
- RBAC para admin, produtor, casa, público e papéis de anunciantes/equipe artística.
- Rate limits em autenticação, upload, Ads, pagamento mock, push e pedidos de privacidade.
- Tokens opacos e expiráveis para entrega de Ads; IP e sessão em hash nos eventos de entrega.
- R2 para arquivos quando habilitado; uploads passam por validação e transformação de imagem.

## Fundação de auditoria

`AuditLog` registra ator, ação, recurso, metadados minimizados, IP em hash e data. Não registrar senha, refresh token, documento completo, conteúdo de evidência, mensagem privada ou IP bruto.

Prioridade de cobertura: permissões, claims, exclusões, decisões de privacidade, contas anunciantes, patacos, revisão de campanha e mudanças de credenciais.

## Operação

- Segredos apenas em environment variables; nunca em Git ou front-end.
- Backups devem ter teste de restauração documentado.
- Admin revisa acessos privilegiados periodicamente.
- Incidentes devem registrar impacto, contenção, evidência, comunicação e ação corretiva.
- `TRUST_PROXY_HOPS` só deve ser configurado após confirmar a cadeia de proxy do ambiente publicado.
