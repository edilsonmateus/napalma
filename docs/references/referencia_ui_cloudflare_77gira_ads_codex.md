# 77Gira Ads — Referências de UI Cloudflare para nova Shell clara

## Objetivo do documento

Criar uma orientação visual para o Codex desenvolver uma **shell separada para o ambiente 77Gira Ads**, abandonando o tema escuro atual nessa área e aproximando a experiência de uma UI operacional no estilo das páginas internas da Cloudflare.

A inspiração não é copiar a Cloudflare literalmente. A intenção é absorver a lógica visual:

- fundo claro;
- cards brancos;
- linhas cinza de 1px;
- laranja usado com controle;
- tipografia limpa;
- layout modular;
- densidade informacional bem administrada;
- aparência de produto SaaS sério, técnico e confiável.

---

# 1. Princípio central

A área de Ads não deve parecer uma landing promocional escura do 77Gira.

Ela deve parecer uma **área operacional de produto**, onde o usuário entende:

- onde está;
- qual ação deve executar;
- qual status sua conta/campanha possui;
- quais fluxos dependem de revisão;
- onde comprar créditos;
- onde acompanhar campanhas;
- onde consultar métricas;
- onde resolver pendências.

A estética deve comunicar:

> clareza, controle, revisão, segurança e operação.

Não deve comunicar:

> festa, cartaz, brilho, glow, excesso de marca ou campanha visual.

---

# 2. Separação de tema

Criar uma shell específica para Ads.

## Não reaproveitar automaticamente o tema escuro do app público

O app público do 77Gira pode manter:

- fundo escuro;
- gradientes;
- energia noturna;
- cards com clima cultural;
- atmosfera de samba/rolê.

Mas o ambiente de Ads deve ter outra natureza:

- painel administrativo;
- workspace comercial;
- centro de controle;
- compra de créditos;
- campanhas;
- auditoria;
- revisão;
- métricas.

## Nome sugerido

```txt
AdsShell
```

ou:

```txt
AdvertiserShell
```

ou:

```txt
WorkspaceShell
```

Critério: não quebrar a arquitetura atual. Se já houver shell/painel para workspace, criar variante visual clara.

---

# 3. Estrutura base da shell

## Desktop

```txt
┌──────────────────────────────────────────────────────────────┐
│ Topbar                                                       │
├───────────────┬──────────────────────────────────────────────┤
│ Sidebar       │ Conteúdo                                     │
│               │                                              │
│ Navegação     │ Header da página                             │
│ Ads           │ Cards / tabelas / formulários                 │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

## Mobile

```txt
┌──────────────────────────────┐
│ Topbar com menu              │
├──────────────────────────────┤
│ Conteúdo                     │
│ Cards empilhados             │
│ Tabelas simplificadas        │
└──────────────────────────────┘
```

A navegação lateral pode virar drawer ou lista compacta no mobile.

---

# 4. Paleta recomendada

## Backgrounds

```css
--ads-bg: #F8FAFC;
--ads-surface: #FFFFFF;
--ads-surface-subtle: #F9FAFB;
--ads-surface-muted: #F3F4F6;
```

Uso:

- `#F8FAFC`: fundo geral da aplicação Ads.
- `#FFFFFF`: cards, containers principais, tabelas.
- `#F9FAFB`: áreas secundárias, sidebar, cabeçalhos de tabela, blocos informativos.
- `#F3F4F6`: badges neutros, código, inputs desabilitados.

## Bordas

```css
--ads-border: #E5E7EB;
--ads-border-strong: #D1D5DB;
```

Uso:

- sempre 1px;
- nada de borda colorida forte em volta de cards comuns;
- separar seções com linha, não com sombra pesada.

## Textos

```css
--ads-text: #111827;
--ads-text-secondary: #4B5563;
--ads-text-muted: #6B7280;
--ads-text-disabled: #9CA3AF;
```

Uso:

- `#111827`: títulos, labels importantes.
- `#4B5563`: corpo de texto.
- `#6B7280`: descrições e metadados.
- `#9CA3AF`: texto auxiliar, vazio, placeholder, desabilitado.

## Laranja de acento

```css
--ads-orange: #F97316;
--ads-orange-hover: #EA580C;
--ads-orange-soft: #FFF7ED;
--ads-orange-border: #FED7AA;
```

Uso:

- botão principal;
- estado ativo;
- indicador de progresso;
- badge importante;
- detalhe de 2px no topo de um card especial;
- ícone de acento.

Não usar laranja como:

- borda de todos os cards;
- gradiente de fundo grande;
- glow;
- decoração abundante;
- contorno permanente em múltiplos blocos.

---

# 5. Tipografia

Usar stack de sistema com Inter, se disponível.

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

## Escala sugerida

```css
--text-xs: 12px;
--text-sm: 13px;
--text-base: 14px;
--text-md: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-hero: 40px;
```

## Pesos

```css
Regular: 400;
Medium: 500;
Semibold: 600;
Bold: 700;
```

Evitar títulos extremamente pesados no ambiente Ads. O visual deve parecer painel SaaS, não campanha publicitária.

---

# 6. Bordas, raios e sombras

## Radius

```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
```

Uso:

- botões: 6px;
- inputs: 6px ou 8px;
- cards: 8px;
- painéis maiores: 8px ou 12px;
- badges: 999px.

## Bordas

```css
border: 1px solid #E5E7EB;
```

## Sombras

Preferir nenhuma sombra.

Quando necessário:

```css
box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
```

Evitar:

```css
box-shadow: 0 20px 60px rgba(...);
glow;
neon;
sombra colorida;
```

---

# 7. Layout e espaçamento

## Container

```css
max-width: 1160px;
padding: 24px;
```

## Gaps

```css
--gap-xs: 6px;
--gap-sm: 8px;
--gap-md: 12px;
--gap-lg: 16px;
--gap-xl: 24px;
--gap-2xl: 32px;
```

## Padrão de seções

```txt
Título da seção
Descrição curta opcional

[conteúdo em card/tabela]
```

Não criar blocos muito dramáticos. Separar a informação em módulos claros.

---

# 8. Topbar

## Aparência

```css
height: 56px ou 60px;
background: #FFFFFF;
border-bottom: 1px solid #E5E7EB;
```

## Conteúdo sugerido

```txt
77Gira Ads                         Workspace / Conta / Ajuda / Usuário
```

Elementos:

- marca discreta;
- nome do workspace;
- seletor de conta anunciante, se existir;
- avatar/usuário à direita;
- botão secundário para voltar ao app público, se necessário.

## Evitar

- logo gigante;
- gradiente;
- tagline;
- fundo escuro;
- texto muito grande.

---

# 9. Sidebar

A sidebar deve parecer ferramenta, não menu de app cultural.

## Aparência

```css
width: 240px;
background: #FFFFFF ou #F9FAFB;
border-right: 1px solid #E5E7EB;
```

## Itens sugeridos

```txt
Visão geral
Campanhas
Criativos
Créditos
Faturamento
Relatórios
Revisões
Configurações
```

## Item ativo

```css
background: #FFF7ED;
color: #C2410C;
border-left: 2px solid #F97316;
```

Ou, se preferir algo mais sutil:

```css
background: #F3F4F6;
color: #111827;
```

Usar laranja apenas se fizer sentido para destaque de contexto.

---

# 10. Page header

Cada página interna deve começar com um header funcional.

## Exemplo

```txt
Campanhas

Crie, revise e acompanhe campanhas publicitárias dentro do 77Gira.

[+ Nova campanha]
```

## CSS sugerido

```css
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}
```

## Título

```css
font-size: 24px;
line-height: 1.25;
font-weight: 700;
color: #111827;
```

## Descrição

```css
font-size: 14px;
color: #6B7280;
max-width: 680px;
```

---

# 11. Cards

## Card padrão

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
}
```

## Card com cabeçalho

```txt
┌────────────────────────────┐
│ Título              Ação   │
├────────────────────────────┤
│ Conteúdo                    │
└────────────────────────────┘
```

```css
.card-header {
  padding: 16px;
  border-bottom: 1px solid #E5E7EB;
}
.card-body {
  padding: 16px;
}
```

## Card de métrica

```txt
Saldo disponível
R$ 250,00
+ Comprar créditos
```

```css
.metric-label: 12px / #6B7280
.metric-value: 28px / #111827 / 700
.metric-sub: 13px / #6B7280
```

## Evitar

- cards com bordas multicoloridas;
- todos os cards com gradiente;
- cards escuros dentro de shell clara;
- excesso de sombras;
- títulos em caixa alta em todos os lugares.

---

# 12. Botões

## Primário

```css
.btn-primary {
  background: #F97316;
  border: 1px solid #F97316;
  color: #FFFFFF;
  border-radius: 6px;
  height: 36px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
}
.btn-primary:hover {
  background: #EA580C;
  border-color: #EA580C;
}
```

## Secundário

```css
.btn-secondary {
  background: #FFFFFF;
  border: 1px solid #D1D5DB;
  color: #111827;
}
.btn-secondary:hover {
  background: #F9FAFB;
}
```

## Ghost

```css
.btn-ghost {
  background: transparent;
  border: 1px solid transparent;
  color: #4B5563;
}
.btn-ghost:hover {
  background: #F3F4F6;
}
```

## Regras

- Um botão primário por tela ou por região de decisão.
- Não usar gradiente em botão dentro da shell Ads.
- Não usar botões grandes demais.
- Botão deve parecer ferramenta, não CTA de landing.

---

# 13. Inputs e formulários

## Input

```css
.input {
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  background: #FFFFFF;
  color: #111827;
  padding: 0 10px;
  font-size: 14px;
}
.input:focus {
  outline: 2px solid rgba(249, 115, 22, 0.25);
  border-color: #F97316;
}
```

## Label

```css
font-size: 13px;
font-weight: 600;
color: #374151;
margin-bottom: 6px;
```

## Help text

```css
font-size: 12px;
color: #6B7280;
```

## Erro

```css
border-color: #DC2626;
help-text: #B91C1C;
background opcional: #FEF2F2;
```

---

# 14. Tabelas

As tabelas devem ser limpas, finas e utilitárias.

## Exemplo

```txt
Campanha        Status        Orçamento      Cliques      Ações
Samba Julho     Em revisão    R$ 100,00       —            Ver
```

## CSS sugerido

```css
.table {
  width: 100%;
  border-collapse: collapse;
  background: #FFFFFF;
}
th {
  background: #F9FAFB;
  color: #6B7280;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
  padding: 10px 12px;
}
td {
  border-bottom: 1px solid #E5E7EB;
  padding: 12px;
  font-size: 14px;
  color: #374151;
}
tr:hover {
  background: #F9FAFB;
}
```

## Evitar

- zebra pesada;
- bordas verticais em excesso;
- células grandes demais;
- texto branco sobre escuro;
- chips coloridos demais.

---

# 15. Badges e status

## Status de campanha

```txt
Rascunho
Em revisão
Aprovada
Reprovada
Ativa
Pausada
Encerrada
```

## Estilo base

```css
.badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
}
```

## Cores

```css
draft:      bg #F3F4F6 / border #E5E7EB / text #374151
review:     bg #FFF7ED / border #FED7AA / text #C2410C
approved:   bg #F0FDF4 / border #BBF7D0 / text #15803D
rejected:   bg #FEF2F2 / border #FECACA / text #B91C1C
active:     bg #EFF6FF / border #BFDBFE / text #1D4ED8
paused:     bg #F9FAFB / border #D1D5DB / text #4B5563
```

Usar status por semântica, não por decoração.

---

# 16. Alerts / banners informativos

## Info

```css
background: #EFF6FF;
border: 1px solid #BFDBFE;
color: #1E40AF;
```

## Warning / revisão

```css
background: #FFF7ED;
border: 1px solid #FED7AA;
color: #C2410C;
```

## Success

```css
background: #F0FDF4;
border: 1px solid #BBF7D0;
color: #15803D;
```

## Error

```css
background: #FEF2F2;
border: 1px solid #FECACA;
color: #B91C1C;
```

## Exemplo de uso

```txt
Sua conta anunciante está em revisão.
Você poderá criar campanhas após a aprovação da equipe 77Gira.
```

---

# 17. Ícones

Usar ícones simples, lineares, com espessura aproximada de 1.5px.

## Recomendações

- Lucide;
- Heroicons;
- Phosphor icons.

## Estilo

```css
width: 16px;
height: 16px;
stroke-width: 1.5;
color: currentColor;
```

## Evitar

- emojis em produção;
- ícones preenchidos demais;
- ilustrações grandes;
- ícones coloridos em excesso;
- ícones diferentes demais entre si.

---

# 18. Padrão de páginas internas

## Visão geral

```txt
Header: Visão geral
Cards: saldo, campanhas ativas, em revisão, gasto no período
Tabela: últimas campanhas
Painel lateral: pendências / status da conta
```

## Campanhas

```txt
Header + botão Nova campanha
Filtros horizontais
Tabela de campanhas
Empty state quando não houver campanha
```

## Criativos

```txt
Lista de criativos
Status de revisão
Preview pequeno
Ações: editar, reenviar, arquivar
```

## Créditos

```txt
Saldo atual
Comprar créditos
Pacotes
Histórico de compras
Ledger/extrato
```

## Faturamento

```txt
Método de pagamento
Compras
Notas / recibos
Status de pagamento
```

## Revisões

```txt
Pendências
Motivo de reprovação
Orientações para ajuste
Enviar novamente
```

---

# 19. Empty states

A Cloudflare tende a tratar telas vazias com clareza operacional.

## Exemplo

```txt
Nenhuma campanha criada

Crie sua primeira campanha para impulsionar eventos, casas ou artistas dentro do 77Gira.

[+ Nova campanha]
```

## Aparência

```css
background: #FFFFFF;
border: 1px dashed #D1D5DB;
border-radius: 8px;
padding: 32px;
text-align: center;
```

## Evitar

- ilustração grande demais;
- tom brincalhão;
- fundo escuro;
- mensagem vaga.

---

# 20. Página inicial de solicitação de acesso

Esta página pode ser pública/semi-pública, mas ainda deve usar a shell clara.

## Estrutura recomendada

```txt
Topbar

Hero em 2 colunas:
- Título forte
- Texto explicativo
- Solicitar acesso
- Já tenho conta

Card lateral:
- Entrada por aprovação
- Revisão de campanhas
- Controle de contexto

Como funciona
Para quem
Fluxo seguro
Acesso ao workspace
CTA final
```

## Direção visual

- Sem fundo escuro.
- Sem borda magenta/laranja em tudo.
- Sem gradiente grande.
- Sem título ocupando altura excessiva.
- Mais espaço branco.
- Mais leitura.
- Mais confiança.

---

# 21. Densidade visual

O ambiente Ads deve ser mais denso que uma landing, mas menos denso que um ERP.

## Regra prática

- Se é decisão comercial: card limpo.
- Se é acompanhamento: tabela.
- Se é status: badge.
- Se é ação: botão pequeno.
- Se é explicação: alert/banner.
- Se é métrica: card de métrica.
- Se é fluxo: stepper.

---

# 22. O que remover do tema atual do Ads

Remover ou evitar:

- fundo roxo/preto predominante;
- gradientes grandes;
- bordas magenta;
- bordas laranja em todos os cards;
- glow;
- botões com gradiente;
- contraste teatral;
- linguagem visual de evento;
- hero gigante escuro;
- excesso de caixa alta;
- cards que parecem peças promocionais.

Manter apenas:

- laranja como acento;
- nome 77Gira Ads;
- personalidade editorial do texto;
- cuidado com revisão e legitimidade;
- relação com cultura/samba no conteúdo, não no excesso visual.

---

# 23. O que preservar do 77Gira

Mesmo com shell clara, a área Ads ainda deve ser reconhecida como 77Gira.

Preservar:

- uso controlado do laranja;
- tom humano nos textos;
- ideia de cena, cultura e contexto;
- revisão editorial;
- relação com casas, artistas e produtores;
- linguagem menos corporativa do que uma ferramenta de mídia tradicional.

Evitar que vire:

- genérico demais;
- frio demais;
- parecido com banco;
- parecido com painel de ERP.

O equilíbrio é:

> Cloudflare na estrutura, 77Gira no vocabulário.

---

# 24. Design tokens sugeridos

```css
:root {
  --ads-bg: #F8FAFC;
  --ads-surface: #FFFFFF;
  --ads-surface-subtle: #F9FAFB;
  --ads-surface-muted: #F3F4F6;

  --ads-border: #E5E7EB;
  --ads-border-strong: #D1D5DB;

  --ads-text: #111827;
  --ads-text-secondary: #4B5563;
  --ads-text-muted: #6B7280;
  --ads-text-disabled: #9CA3AF;

  --ads-orange: #F97316;
  --ads-orange-hover: #EA580C;
  --ads-orange-soft: #FFF7ED;
  --ads-orange-border: #FED7AA;

  --ads-success-bg: #F0FDF4;
  --ads-success-border: #BBF7D0;
  --ads-success-text: #15803D;

  --ads-error-bg: #FEF2F2;
  --ads-error-border: #FECACA;
  --ads-error-text: #B91C1C;

  --ads-info-bg: #EFF6FF;
  --ads-info-border: #BFDBFE;
  --ads-info-text: #1D4ED8;

  --ads-radius-sm: 6px;
  --ads-radius-md: 8px;
  --ads-radius-lg: 12px;

  --ads-shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.04);
}
```

---

# 25. Classes utilitárias sugeridas

```css
.ads-shell {}
.ads-topbar {}
.ads-sidebar {}
.ads-main {}
.ads-page-header {}
.ads-card {}
.ads-card-header {}
.ads-card-body {}
.ads-table {}
.ads-badge {}
.ads-button {}
.ads-button-primary {}
.ads-button-secondary {}
.ads-alert {}
.ads-empty-state {}
.ads-metric-card {}
```

Evitar misturar esses estilos com o tema escuro do app público.

---

# 26. Critérios de aceite visual

A nova shell estará no caminho certo se:

- o fundo principal for claro;
- os cards forem brancos;
- as separações forem feitas por linhas cinza de 1px;
- o laranja aparecer apenas como acento;
- o conteúdo parecer painel operacional;
- os botões parecerem de produto SaaS;
- os status forem claros;
- as tabelas forem legíveis;
- a navegação for óbvia;
- a página de Ads não parecer mais uma landing escura;
- o app público 77Gira continuar visualmente independente.

---

# 27. Pedido direto ao Codex

Codex, antes de implementar em definitivo:

1. Identifique quais componentes hoje controlam o ambiente Ads.
2. Verifique se existe uma shell comum reaproveitada do app público.
3. Proponha a melhor forma de criar uma shell clara separada sem quebrar o tema escuro do app principal.
4. Crie tokens CSS específicos para Ads.
5. Refaça primeiro a página de solicitação de acesso como prova visual.
6. Não altere regras de negócio nesta etapa.
7. Não reorganize o fluxo funcional sem autorização.
8. Priorize visual, hierarquia, responsividade e isolamento de tema.

---

# 28. Fontes de referência consultadas

- Cloudflare Blog — Dark Mode for the Cloudflare Dashboard  
  https://blog.cloudflare.com/dark-mode/

- Cloudflare Blog — Thinking about color  
  https://blog.cloudflare.com/thinking-about-color/

- Cloudflare Blog — A new look on your Cloudflare dashboard  
  https://blog.cloudflare.com/a-new-look-on-your-cloudflare-dashboard/

- Cloudflare Developers — Custom dashboards available to all customers  
  https://developers.cloudflare.com/changelog/post/2026-04-22-custom-dashboards-ga/

- Cloudflare Developers — Components / DashButton / Details  
  https://developers.cloudflare.com/style-guide/components/

- Cloudflare Developers — Screenshots guidance  
  https://developers.cloudflare.com/style-guide/documentation-content-strategy/component-attributes/screenshots/

## Síntese das referências

A Cloudflare trabalha com a ideia de design system como conjunto de primitivas: tipografia, cor, layout, ícones e padrões de interface. A direção observada no dashboard é de clareza operacional, modularidade, responsividade, uso cuidadoso de cor e foco em métricas/ações críticas. Para o 77Gira Ads, a melhor tradução disso é uma shell clara, modular, com cards brancos, cinzas bem definidos, laranja econômico e forte disciplina hierárquica.