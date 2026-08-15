# 77Gira — Fonte de verdade para botões

**Status:** padrão oficial de interface
**Versão:** 1.0
**Atualizado em:** 15/08/2026
**Abrangência:** aplicativo do usuário, Administração, Central de Operações e 77Gira Ads

Este documento é a referência obrigatória para criar, revisar ou alterar botões na plataforma 77Gira. Uma feature nova não deve inventar altura, raio, tipografia, cor ou espaçamento próprios. Exceções precisam ser justificadas no código e registradas neste guia.

## 1. Princípios invariáveis

1. Botões que convivem na mesma linha têm **a mesma altura, tipografia e alinhamento vertical**.
2. A hierarquia vem da cor e do peso visual, não de tamanhos incompatíveis.
3. Ícone e texto formam uma unidade centralizada, com `gap` constante.
4. O texto nunca encosta nas bordas, quebra involuntariamente ou escapa do botão.
5. Ações destrutivas não reutilizam a aparência de ações primárias.
6. Estados `hover`, `focus`, `disabled`, `loading` e `selected` fazem parte do componente; não são acabamento opcional.
7. Links que executam navegação podem parecer botões, mas devem preservar semântica de link e foco de teclado.
8. Em telas de toque, a área acionável deve ter ao menos 40 px de altura; ações essenciais em formulários usam preferencialmente 40–44 px.

## 2. Escala oficial

| Escala | Altura mínima | Padding horizontal | Fonte | Ícone | Gap ícone/texto | Uso |
|---|---:|---:|---:|---:|---:|---|
| Compacta | 32 px | 10 px | 11–12 px / 600 | 14 px | 6 px | filtros, tabelas densas e ações auxiliares |
| Padrão | 40 px | 16 px | 13 px / 600 | 16 px | 7 px | formulários, modais e ações comuns |
| Destaque | 44 px | 18 px | 14 px / 650 | 17 px | ação principal única ou conversão importante |
| Ícone | 36–40 px | 0 | — | 16–18 px | — | ação reconhecível com `aria-label` e tooltip |

Regras complementares:

- `line-height: 1` no conteúdo do botão.
- `display: inline-flex; align-items: center; justify-content: center`.
- Botões de uma mesma barra usam `gap: 12px`.
- O texto pode definir a largura. Não se força largura igual entre “Enviar para análise” e “Cancelar”; força-se **altura e ritmo iguais**.
- Em mobile estreito, botões de formulário podem ocupar a largura disponível, mantendo 10–12 px entre eles.

## 3. Variantes semânticas

### Primário

Conclui a tarefa principal da tela: salvar, enviar, publicar, confirmar ou avançar. Deve existir, em regra, apenas um primário por contexto decisório.

### Secundário

Alternativa segura: cancelar, voltar, fechar ou adiar. Tem a mesma geometria do primário, mas superfície neutra.

### Terciário ou discreto

Ação de baixa prioridade em barras densas, listas e tabelas. Não deve competir com o CTA principal.

### Selecionável

Filtro, modo ou estado alternável. Precisa diferenciar claramente `default`, `hover`, `selected` e `disabled`. Seleção não pode depender apenas de cor; quando necessário, usar ícone, texto ou `aria-pressed`.

### Destrutivo

Exclusão, revogação definitiva, encerramento ou rejeição irreversível. Usa vermelho somente no momento decisório, fisicamente separado de ações rotineiras e, quando o risco exigir, atrás de confirmação reforçada.

## 4. Linguagem por ambiente

### Interface do usuário — escura

- Superfície secundária: tom escuro levemente destacado do fundo, sem contorno insistente.
- Texto: branco ou quase branco.
- Primário: gradiente 77Gira apenas para a ação principal real.
- Raio: pill para ações públicas compactas; 8–10 px em formulários quando a composição exigir aparência mais estrutural.
- O glow do **Tô na Pista** é exceção de produto preservada.
- Campos associados usam fundo escuro, texto claro e borda de baixo contraste; nunca o branco nativo do navegador.

### Administração — escura e operacional

- Priorizar densidade, leitura e previsibilidade.
- Primário pode usar gradiente 77Gira; secundários permanecem neutros.
- Em tabelas e atalhos, usar escala compacta. Em formulários e modais, usar escala padrão.
- Não misturar `chip` compacto com CTA alto na mesma barra sem normalização local.

### Central de Operações — clara

- Primário azul; secundário branco com borda cinza-azulada; terciário discreto.
- Vermelho exclusivamente para risco alto ou ação irreversível; laranja para atenção e SLA.
- Raio preferencial de 6–8 px, sem pills decorativas.
- Tipografia: Inter/Segoe UI, peso 600–650.

### 77Gira Ads — clara

- Compartilha a precisão da Central de Operações.
- Primário azul, secundário branco, laranja para orientação/atenção comercial.
- Altura padrão de 36–40 px conforme densidade; raio de 6 px.
- Ações de campanha devem deixar explícito o estado: salvar, enviar para revisão, pausar, encerrar ou duplicar.

## 5. Estados obrigatórios

- **Hover:** mudança sutil de superfície; não alterar tamanho nem deslocar o layout.
- **Focus-visible:** anel de 2 px com contraste suficiente e afastamento de 2 px.
- **Pressed:** resposta imediata e curta; sem animação que atrase a ação.
- **Disabled:** sem clique, contraste reduzido, cursor coerente; o rótulo continua legível.
- **Loading:** mantém largura e altura originais, desabilita repetição e comunica progresso no próprio rótulo.
- **Success:** feedback posterior separado; não transformar permanentemente todo CTA em verde, salvo quando o estado persistente for parte do produto.
- **Error:** mensagem próxima ao contexto. O botão não deve ser o único meio de comunicar erro.

## 6. Texto e microcopy

- Usar verbo + objeto: “Enviar para análise”, “Salvar parceiro”, “Criar campanha”.
- Evitar “OK”, “Sim” e “Continuar” quando a consequência puder ser nomeada.
- Botão destrutivo descreve a consequência: “Excluir conta definitivamente”.
- Capitalização em frase, sem caixa alta integral.
- Rótulos devem caber em uma linha no desktop. Em mobile, prefira reorganizar a barra antes de reduzir a fonte.

## 7. Implementação e governança

Antes de criar CSS local, verificar se a tela já pertence a um destes escopos:

- interface pública: `.chip`, `.btn-primary`, `.auth-btn` e ações específicas da feature;
- Administração: regras sob `.app-shell-admin`;
- Operações: componentes e tokens `ops-*`;
- Ads: regras sob `.app-shell-ads`, `.ads-workspace-v2` e `.ads-admin-console`.

Uma normalização local é permitida quando componentes legados diferentes aparecem juntos. Ela deve:

1. ser limitada à tela ou formulário;
2. corrigir geometria e estados sem mudar outros ambientes;
3. não usar `!important` salvo conflito legado documentado;
4. ser candidata à migração para um componente compartilhado.

## 8. Padrão de formulários e modais

- Barra de ações alinhada ao final do formulário.
- `gap: 12px` entre ações.
- Primário primeiro e secundário depois, exceto em confirmações legais que adotem ordem explícita própria.
- Mesma altura e raio para todos os botões da barra.
- Em viewport estreito, ações podem usar `flex: 1` ou empilhar sem perder hierarquia.
- Campos: altura mínima 40 px, padding horizontal 12 px, texto 13 px; textarea com padding vertical equivalente.

## 9. Antipadrões proibidos

- Botões adjacentes com alturas, fontes ou raios diferentes.
- Margens automáticas herdadas dentro de uma barra flexível.
- Branco nativo de `input/select/textarea` dentro da interface escura.
- Chevron colado à borda do `select`.
- Gradiente em duas ações concorrentes.
- Vermelho como decoração.
- Texto sublinhado dentro de botão, salvo link textual deliberado.
- Alterar o tamanho do botão entre estado normal e loading.

## 10. Checklist de revisão

- [ ] O ambiente correto foi identificado?
- [ ] A variante representa a consequência da ação?
- [ ] Botões adjacentes compartilham altura, fonte, raio e alinhamento?
- [ ] Ícone e texto estão centralizados e separados pelo gap padrão?
- [ ] Hover, foco, disabled, loading e erro foram verificados?
- [ ] O layout funciona em 320 px e com zoom de 200%?
- [ ] A ação é compreensível sem depender apenas da cor?
- [ ] A implementação evita efeitos colaterais fora da tela?
- [ ] A nova decisão exige atualização desta fonte de verdade?
