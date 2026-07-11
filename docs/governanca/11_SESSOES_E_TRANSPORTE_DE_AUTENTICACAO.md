# Sessoes e transporte de autenticacao

## Estado atual

O 77Gira utiliza token de acesso de curta duracao e refresh token rotativo, armazenado apenas como hash no banco. Cada refresh invalida o token anterior. Troca de senha revoga os refresh tokens ativos.

As respostas da API agora incluem `Cache-Control: no-store`, reduzindo o risco de navegadores ou proxies manterem respostas de login, perfil, exportacao ou dados administrativos em cache.

## Limite conhecido

O token de refresh ainda e transportado pela aplicacao cliente, e nao por cookie HTTP-only. Isso exige disciplina rigorosa contra XSS e nao deve ser tratado como o desenho final mais resistente para uma operacao de alto risco.

## Evolucao recomendada: sessao em cookie HTTP-only

Antes de migrar, planejar e testar:

1. cookie `HttpOnly`, `Secure` em producao e `SameSite` adequado ao dominio real;
2. protecao CSRF para mutacoes autenticadas quando o navegador enviar cookies automaticamente;
3. estrategia para frontend e API em dominios/subdominios diferentes;
4. logout que limpa cookie e revoga servidor-side;
5. migracao sem derrubar sessoes existentes;
6. testes de login, refresh, logout, expiração, troca de senha e navegacao em mobile.

## Regra operacional

Nao registrar access token, refresh token, cookie, senha ou cabecalho Authorization em auditoria, analytics, logs de erro, tickets ou capturas de tela. Em incidente, revogar sessoes e rotacionar segredos conforme o playbook de seguranca.
