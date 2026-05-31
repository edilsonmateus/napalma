# Bloco 2 — Dicionário Editorial PT-BR (77Gira)

Data: 2026-05-31  
Objetivo: padronizar texto, acentuação, tom de voz e nomenclaturas em toda a interface.

## 1) Princípios editoriais

- Linguagem: PT-BR.
- Tom: próximo, urbano, direto, acolhedor.
- Clareza > criatividade em ações críticas (login, salvar, excluir, rota).
- Evitar duplicidade textual na mesma tela.
- Preferir frases curtas em mobile.

## 2) Identidade verbal padrão

- Marca principal: `77Gira`.
- Produto local: `77Gira SP` (quando contexto exigir praça).
- Slogan curto: `Todos os Sambas Aqui`.
- Nome PWA:
  - `name`: `77Gira SP`
  - `short_name`: `77Gira Sambas SP`

## 3) Regras de ortografia/acentuação

Aplicar em todos os textos visíveis:
- `Configuracoes` -> `Configurações`
- `Nao` -> `Não`
- `possivel` -> `possível`
- `sambas visiveis` -> `sambas visíveis`
- `Amanha` -> `Amanhã`
- `Comeca` -> `Começa`
- `regiao` -> `região`
- `visao` -> `visão`
- `proximo/proxima` -> `próximo/próxima` (quando substantivo comum)
- `camera` -> `câmera`
- `Politica de privacidade` -> `Política de privacidade`

## 4) Dicionário de termos de produto

### Navegação principal
- `Explorar` (fixo)
- `Pela Hora` (fixo)
- `Meu Radar` (fixo)
- `Histórico` (fixo)
- `Config` (tab curta) / `Configurações` (título de página)

### Estados de evento
- Ao vivo: `Tá rolando`
- Início futuro: `Começa às HH:MM`
- Encerramento ao vivo: `Termina às HH:MM`
- Próximo evento em card de casa: `Próxima atração`

### Ações de usuário
- `Entrar`
- `Criar conta`
- `Continuar sem conta`
- `Compartilhar app`
- `QR Code Pro Amigo`
- `Instalar no celular` (desktop) / botão-install visual (mobile)

### Rota
- Prefixo CTA: `Partiu Agora!`
- Provedores: `Maps`, `Waze`, `Uber`
- Ação de saída de rota: `Voltar`

### Plano
- `Passo 1 - Nome e data do plano`
- `Passo 2 - Escolha os eventos do seu plano`
- `Salvar plano do dia`

## 5) Microcopy padrão por contexto

### Convite de compartilhamento do app
```
A amizade, nem mesmo a força do tempo irá destruir...

Seu amigo é um verdadeiro amigo, ele está compartilhando com você a agenda organizada de sambas de São Paulo.
Valorize isto
```

### Estado vazio (explorar)
- `Sem eventos para este filtro no momento.`
- `Tente limpar filtros, trocar região ou ajustar dia/hora.`

### Estado vazio (planos)
- `Nenhum plano salvo ainda.`
- `Escolha 2 ou mais sambas e clique em "Salvar plano do dia".`

## 6) Regras por área (consistência semântica)

- Público: linguagem calorosa e simples.
- Casa/Produtor/Admin: linguagem operacional, objetiva e menos coloquial.
- Zona de perigo: linguagem assertiva + verbo de ação explícito (`Excluir`, `Revogar`, `Desvincular`).

## 7) Capitalização

- Títulos de tela: Title Case curto (ex.: `Meu Radar`, `Termos de uso`).
- Botões principais: Sentence case (`Criar conta`), exceto labels consagradas de marca.
- Evitar caixa alta total, salvo casos intencionais de status/badge.

## 8) Lista de substituição recomendada (global)

1. `Napalma`/`NaPalma` (texto visível) -> `77Gira`  
2. `Todos os sambas aqui` -> `Todos os Sambas Aqui`  
3. `Regiao` -> `Região`  
4. `Historico` -> `Histórico`  
5. `Configuracoes` -> `Configurações`  
6. `Nao foi possivel...` -> `Não foi possível...`  
7. `proxima atracao` -> `Próxima atração`  

## 9) Critério de aceite do bloco editorial

- 100% dos textos de UI pública com acentuação correta.
- 0 ocorrências visíveis de `Nao`, `Configuracoes`, `regiao`, `visiveis`.
- Nome do app e slogan consistentes em:
  - header,
  - onboarding,
  - login/config,
  - manifest/PWA.

