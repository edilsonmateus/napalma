# 77Gira — Fonte de verdade para KPIs e cartões de status

**Status:** padrão oficial de interface
**Versão:** 1.0
**Atualizado em:** 15/08/2026
**Abrangência:** aplicativo do usuário, Administração, Central de Operações e 77Gira Ads

Este documento complementa o guia oficial de botões. Ele define como números, diagnósticos, atalhos e estados devem ser apresentados sem misturar linguagens claras e escuras nem transformar toda informação em um cartão de mesmo peso.

## 1. Famílias oficiais

### 1.1 KPI numérico

Resume uma medida que precisa ser comparada rapidamente: usuários, campanhas, itens, solicitações ou saldo.

- Ordem visual: rótulo, valor e contexto curto.
- O valor é o elemento de maior peso.
- Não incluir parágrafos, botões ou instruções longas.
- Grade uniforme: cartões irmãos usam mesma altura e padding.
- Cor de atenção só representa desvio, risco ou prazo; nunca decoração.

### 1.2 Cartão de status ou diagnóstico

Informa o estado de um controle: configurado, pendente, expirado, bloqueado ou em revisão.

- Ordem visual: nome do controle, caráter obrigatório/recomendado e badge de estado.
- O badge é compacto; ele não deve alongar o cartão nem competir com o título.
- Verde significa condição aprovada; amarelo/laranja exige atenção; vermelho representa falha ou risco real.
- Não mostrar segredos, tokens ou valores sensíveis.

### 1.3 Cartão de acesso ou ferramenta

Leva a uma área funcional, como “Gestão de usuários”. Não é KPI.

- Pode conter ícone, badge de perfil, título, descrição e uma única chamada de navegação.
- Usa altura maior que um KPI porque explica o destino.
- A chamada deve parecer link de ação, não um segundo botão concorrente.

### 1.4 Cartão de conteúdo

Apresenta informação que exige leitura: revisão, aviso, histórico, prévia ou orientação.

- Pode ter cabeçalho e corpo, mas não deve ser confundido com KPI.
- Parágrafos longos ficam fora da grade de indicadores.
- Agrupamentos usam espaçamento e separadores de baixo contraste.

## 2. Geometria padrão

| Família | Padding | Raio | Altura | Gap interno |
|---|---:|---:|---:|---:|
| KPI | 12–14 px | 8–10 px | 88–104 px | 6 px |
| Status/diagnóstico | 12–14 px | 8–10 px | mínimo 72 px | 6–10 px |
| Acesso/ferramenta | 15–18 px | 14–16 px | 142–160 px | 8–12 px |
| Conteúdo | 16–20 px | 10–14 px | conforme conteúdo | 12–16 px |

- Grades usam `gap` mínimo de 8 px em áreas densas e 12 px em páginas de leitura.
- Cartões irmãos mantêm a mesma geometria.
- Conteúdo nunca encosta nas bordas.
- Em mobile, a grade vira uma coluna antes que títulos ou badges sejam comprimidos.

## 3. Linguagem por ambiente

### Interface do usuário e Administração — escuras

- Superfície: azul-carvão ou cinza escuro destacado do fundo.
- Borda: clara com baixa opacidade; nunca branco sólido.
- Texto principal: quase branco.
- Texto secundário: cinza-azulado legível.
- KPIs e diagnósticos não usam fundo branco, mesmo quando derivados de componentes da Central de Operações.

Tokens recomendados:

```css
--card-surface-dark: rgba(255, 255, 255, .035);
--card-border-dark: rgba(207, 217, 228, .12);
--card-text-dark: #d7e0e8;
--card-muted-dark: #91a2b3;
```

### Central de Operações e 77Gira Ads — claras

- Superfície: branca ou cinza quase branco.
- Borda: cinza-azulada clara.
- Texto: azul-marinho ou grafite.
- Sombras são discretas e só ajudam a separar níveis.

Tokens recomendados:

```css
--card-surface-light: #ffffff;
--card-surface-light-muted: #fcfcfd;
--card-border-light: #dbe3ec;
--card-text-light: #1d2939;
--card-muted-light: #667085;
```

## 4. Tipografia

- Rótulo de KPI: 11–12 px, peso 500–600.
- Valor de KPI: 20–28 px, peso 600; números menores em grades densas.
- Título de status: 13–15 px, peso 600.
- Contexto: 11–12 px, linha 1.4–1.5.
- Badge: 10–11 px, peso 600–700.
- Não usar caixa alta em frases; apenas micro-rótulos institucionais curtos.

## 5. Estados e acessibilidade

- O significado não pode depender apenas da cor: usar texto como “OK”, “Revisar” ou “Expirado”.
- Contraste mínimo deve permanecer legível nos dois temas.
- Cartões clicáveis precisam de foco visível e semântica de link ou botão.
- Cartões meramente informativos não recebem cursor, hover ou aparência de ação.
- Loading deve preservar o espaço da grade e evitar saltos de layout.
- Ausência de dados deve exibir estado vazio, nunca KPI falso igual a zero sem contexto.

## 6. Ícones em cabeçalhos de seção

Quando uma seção possui título e subtítulo, o ícone identifica **o título**, não o bloco inteiro.

- O ícone e o título devem compartilhar a mesma linha e alinhamento vertical.
- O subtítulo inicia abaixo dessa linha e permanece alinhado ao texto do título.
- Nunca centralizar o ícone contra a altura combinada de título e subtítulo: isso o deixa visualmente entre os dois níveis e torna sua função ambígua.
- Tamanho recomendado: 16–18 px, com `gap` de 8–10 px até o título.
- Ícones meramente decorativos devem usar `aria-hidden="true"`.
- Na Administração escura, o laranja identifica cabeçalhos operacionais; não deve ser aplicado automaticamente a todo SVG do cartão.
- Na Central de Operações e em Ads, respeitar a paleta clara do módulo e reservar o laranja para atenção ou micro-rótulo institucional.

Estrutura de referência:

```jsx
<div className="section-heading">
  <div>
    <span className="section-heading__title">
      <Icon aria-hidden="true" />
      <strong>Título da seção</strong>
    </span>
    <small>Explicação complementar.</small>
  </div>
</div>
```

## 7. Regras de governança

1. Antes de criar um cartão, classifique-o em uma das quatro famílias.
2. A classe deve ser escopada ao ambiente; cores claras não podem vazar para páginas escuras.
3. Prefira tokens a cores hexadecimais repetidas.
4. Um componente compartilhado deve aceitar variante de tema ou herdar tokens do shell.
5. Alterações globais exigem validação em Administração, Operações e Ads.
6. Exceções precisam ser registradas neste documento.

## 8. Checklist de revisão

- [ ] A família do cartão está clara?
- [ ] A superfície corresponde ao ambiente?
- [ ] Valor, rótulo e contexto possuem hierarquia correta?
- [ ] Cartões irmãos têm altura, padding e raio consistentes?
- [ ] Badges não deformam o layout?
- [ ] Zero significa dado real, e não falha de carregamento?
- [ ] O estado é compreensível sem depender apenas da cor?
- [ ] Mobile e foco por teclado foram verificados?
- [ ] Nenhuma informação sensível foi exposta?
- [ ] O ícone de seção está ancorado ao título, e não centralizado entre título e subtítulo?
