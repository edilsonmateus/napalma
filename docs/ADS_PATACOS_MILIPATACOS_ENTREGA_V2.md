# 77Gira Ads — Patacos, milipatacos e entrega por impressão válida

## Regra financeira

- **1 Pataco = R$ 1,00 = 1.000 milipatacos**.
- O saldo é armazenado e movimentado em milipatacos para que a cobrança por impressão seja precisa, sem arredondamento indevido.
- A interface do anunciante exibe Patacos de forma legível; o histórico operacional preserva também o valor exato em milipatacos.

## Preço por impressão válida

| Posicionamento | Modalidade | CPM | Custo por impressão válida |
| --- | --- | ---: | ---: |
| Explorar — destaque | Rotativa | 35 Patacos | 35 milipatacos |
| Página da casa | Segmentada | 55 Patacos | 55 milipatacos |
| Meu Radar | Segmentada | 55 Patacos | 55 milipatacos |
| Cardápio apresentado por | Premium | 80 Patacos | 80 milipatacos |

CPM significa o valor para mil impressões válidas. Exemplo: uma campanha com 100 Patacos no Explorar pode obter, em condições ideais, aproximadamente 2.857 impressões válidas (100.000 ÷ 35).

## Ciclo da campanha

1. O anunciante compra Patacos ou usa saldo já disponível na carteira.
2. Ele vincula o saldo escolhido a uma campanha. Esse valor fica reservado para ela.
3. A campanha e os criativos passam pela revisão 77Gira.
4. Depois da aprovação, cada impressão válida consome o custo exato do posicionamento exibido.
5. A campanha permanece elegível até consumir a verba reservada, ser encerrada pelo anunciante/equipe ou perder algum requisito de entrega.
6. Ao encerrar a campanha, todo saldo reservado e não consumido retorna automaticamente à carteira e pode financiar outra campanha.

Não há prazo obrigatório de término por calendário. Datas de início continuam sendo possíveis quando fizerem sentido para uma ação, mas a regra principal de encerramento é o consumo do saldo.

## O que é uma impressão válida

Uma impressão é registrada somente depois que o criativo recebe um token de entrega e confirma renderização no aplicativo. O motor mantém proteções contra duplicidade, excesso de requisições por sessão e concorrência de saldo. Uma mesma entrega não pode cobrar duas vezes.

Cliques continuam sendo medidos separadamente para cálculo de CTR. Clique não gera uma segunda cobrança.

## Regras de entrega

- Conta anunciante ativa, campanha habilitada e criativo compatível são obrigatórios.
- Campanha e criativo precisam ter revisão aprovada quando o fluxo de revisão estiver ligado.
- A campanha precisa manter saldo reservado suficiente para ao menos uma impressão no slot solicitado.
- Inventário, frequência por pessoa/sessão e ritmo diário protegem a experiência do público e evitam concentração indevida.
- O preço aplicável fica registrado no snapshot da campanha quando ela recebe saldo, preservando o contexto comercial daquela veiculação.

## Indicadores a acompanhar

- Patacos disponíveis na carteira.
- Patacos reservados em campanhas.
- Patacos consumidos e saldo remanescente por campanha.
- Impressões válidas, cliques e CTR por campanha e posicionamento.
- Motivos de bloqueio: sem saldo, sem criativo aprovado, inventário indisponível ou revisão pendente.

## Checklist de liberação

1. Aplicar a migração Prisma no banco de produção.
2. Confirmar as flags de carteira, pagamento e revisão já usadas pelo ambiente.
3. Testar uma compra mock, vinculação de saldo, aprovação, impressão, clique e encerramento.
4. Conferir no histórico se compra, reserva, consumo e devolução foram registrados.

## Fora do escopo desta versão

- Gateway de pagamento oficial e webhooks financeiros.
- Segmentação comercial avançada.
- Leilão, otimização automática ou cobrança por clique.
- Garantia contratual de volume de impressões.
