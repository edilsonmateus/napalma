# UI/UX Audit Brief - 77Gira / NaPalma

## Objetivo
Executar uma auditoria completa de UI/UX no produto atual, sem redesenhar do zero, priorizando consistência visual, fluidez operacional e confiabilidade de interação antes de lançamento público.

## Escopo (sem reescrever regras de negócio)
1. Auditar consistência visual global entre áreas pública e administrativas.
2. Corrigir fricções de uso sem alterar lógica de permissão e fluxo principal.
3. Validar responsividade mobile-first e desktop.

## Páginas obrigatórias
1. Explorar
2. Detalhe do evento
3. Detalhe da casa
4. Meu Radar
5. Pela Hora
6. Histórico
7. Configurações
8. Painéis Casa, Produtor e Admin
9. Gestão de Publicidade

## Checklist de auditoria
1. Hierarquia tipográfica: títulos, subtítulos e textos auxiliares.
2. Espaçamento vertical/horizontal consistente entre blocos.
3. Estados de botão: default, hover, disabled, loading, sucesso e erro.
4. Estados de feedback: toast, erro de formulário e confirmação.
5. Contraste e legibilidade em todos os temas (foco admin dark).
6. Coerência de bordas, outlines e sombras.
7. Alinhamento de ícones e baseline textual.
8. Comportamento de modal: foco, fechamento, scroll interno e sobreposição.
9. Tamanho de toque para mobile (tap targets).
10. Overflow e quebra em cards/listas/títulos.

## Resoluções obrigatórias
1. 360x800
2. 390x844
3. 768x1024
4. 1366x768
5. 1920x1080

## Fluxos críticos de validação
1. Casa cria evento como rascunho.
2. Casa publica evento com checklist obrigatório.
3. Produtor reivindica carteira.
4. Admin aprova/reprova claim.
5. Usuário salva no Radar e marca "Eu fui".
6. Usuário usa "Partiu agora" (Maps/Waze/Uber).
7. Filtro Ao Vivo + Data/Hora em Explorar.

## Critérios de aceite
1. Nenhum overflow ou quebra visual nas resoluções-alvo.
2. Nenhum CTA crítico com ambiguidade.
3. Zero truncamento problemático de texto em botões/menus/chips.
4. Feedback de erro/sucesso claro em formulários críticos.
5. Navegação entre perfis sem confusão de contexto.

## Entregáveis esperados
1. Lista priorizada de problemas por severidade (Alta, Média, Baixa).
2. Correções aplicadas por patch focado em UI/UX.
3. Evidência antes/depois para problemas de Alta severidade.
4. Relatório final de conformidade com checklist.

## Diretrizes de priorização
1. Alta: bloqueia ação, gera erro de operação ou confusão crítica.
2. Média: reduz eficiência, causa dúvida, mas permite continuidade.
3. Baixa: refinamento visual sem impacto operacional.

## Restrições
1. Não alterar regras de autorização/permissão sem aprovação explícita.
2. Não mudar estrutura de dados ou contratos de API no escopo desta auditoria.
3. Não introduzir nova dependência pesada sem justificativa clara.

## Observações de contexto
1. Existem modos de uso distintos: público e backoffice (Casa/Produtor/Admin).
2. Identidade visual pública pode ser mais expressiva; backoffice deve manter sobriedade.
3. O objetivo final é estabilidade + clareza para lançamento.
