# Guia de implementação de privacidade

Antes de aprovar uma feature, responder no PR/briefing:

1. Qual dado será coletado ou inferido?
2. Qual funcionalidade deixa de existir sem ele?
3. É pessoal, público, profissional, agregado ou sensível?
4. Quem lê e quem altera?
5. Qual base legal será validada pela operação jurídica?
6. Qual prazo de retenção e ação de descarte?
7. Como o usuário consulta, corrige, revoga ou solicita remoção?
8. Há alternativa agregada, local no dispositivo ou menos invasiva?

Regras técnicas:

- Preferir IDs efêmeros, hashes e agregação a identificadores crus.
- Não enviar dados pessoais a analytics/IA sem contrato e minimização explícita.
- Adicionar migration de retenção e auditoria junto de qualquer novo dado de alto risco.
- Proteger exportações e exclusões com autenticação forte e rate limit.
- Criar testes de autorização, vazamento entre perfis e comportamento de exclusão.
