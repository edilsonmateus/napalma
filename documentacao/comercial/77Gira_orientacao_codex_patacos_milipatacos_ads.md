# 77GiraADS — Orientação ao Codex sobre Patacos, Milipatacos e Consumo por Impressão

## Objetivo

Esta especificação registra a decisão de produto e orienta a implementação da nova lógica de consumo publicitário da 77Gira.

O sistema **não deve aplicar a regra de 1 impressão por pataco**. Um pataco representa valor financeiro dentro da plataforma, enquanto uma impressão representa uma entrega publicitária. São unidades diferentes.

## Decisão central

- **1 pataco = R$ 1,00 de saldo publicitário.**
- **1 pataco = 1.000 milipatacos.**
- **1 milipataco = R$ 0,001.**
- O preço da publicidade será definido por CPM — custo por mil impressões.
- O consumo unitário de uma impressão será uma fração de pataco, armazenada internamente como um número inteiro de milipatacos.
- A interface pode exibir valores consolidados em patacos; a camada financeira e o ledger devem operar em milipatacos inteiros.

## Por que 1 impressão não pode custar 1 pataco

Se uma impressão consumir 1 pataco, então:

```text
1.000 impressões × 1 pataco = 1.000 patacos = R$ 1.000
```

Isso produziria um CPM de R$ 1.000, incompatível com a régua inicialmente definida para a 77Gira:

| Modalidade | CPM em patacos | CPM equivalente em reais |
|---|---:|---:|
| Rotativa | 35 | R$ 35,00 |
| Segmentada | 55 | R$ 55,00 |
| Premium | 80 | R$ 80,00 |

Portanto, **pataco não é sinônimo de impressão**.

## Conversão correta

A fórmula comercial é:

```text
custo_em_patacos = (impressoes_validas × cpm_em_patacos) ÷ 1.000
```

Como 1 pataco possui 1.000 milipatacos, a fórmula interna pode ser simplificada:

```text
custo_em_milipatacos = impressoes_validas × cpm_em_patacos
```

Essa simplificação é válida quando o CPM é um número inteiro expresso em patacos.

### Custo unitário

| Modalidade | Custo por impressão em patacos | Custo por impressão em milipatacos |
|---|---:|---:|
| Rotativa | 0,035 | 35 |
| Segmentada | 0,055 | 55 |
| Premium | 0,080 | 80 |

### Exemplos

| Entrega | Cálculo | Consumo final |
|---|---:|---:|
| 1.000 impressões rotativas | 1.000 × 35 milipatacos | 35.000 milipatacos = 35 patacos |
| 1.000 impressões segmentadas | 1.000 × 55 milipatacos | 55.000 milipatacos = 55 patacos |
| 1.000 impressões premium | 1.000 × 80 milipatacos | 80.000 milipatacos = 80 patacos |
| 500 impressões rotativas | 500 × 35 milipatacos | 17.500 milipatacos = 17,5 patacos |
| 100 impressões premium | 100 × 80 milipatacos | 8.000 milipatacos = 8 patacos |

## Regras obrigatórias de implementação

### 1. Armazenamento monetário

- Armazenar saldo, reserva, débito, estorno e bônus como **inteiros em milipatacos**.
- Não utilizar `float`, `double`, `Number` fracionário ou ponto flutuante para operações financeiras.
- No banco de dados, utilizar `BIGINT` ou tipo inteiro equivalente.
- No Node/TypeScript, avaliar `bigint` quando os limites de `number` puderem ser alcançados.
- Nunca usar o valor formatado da interface como fonte de verdade.

Exemplo conceitual:

```ts
const MILIPATACOS_POR_PATACO = 1000n;

const CPM_MILIPATACOS_POR_IMPRESSAO = {
  ROTATIVA: 35n,
  SEGMENTADA: 55n,
  PREMIUM: 80n,
} as const;

function calcularConsumoMilipatacos(
  impressoesValidas: bigint,
  custoUnitarioMilipatacos: bigint,
): bigint {
  return impressoesValidas * custoUnitarioMilipatacos;
}
```

> Observação: o nome `CPM_MILIPATACOS_POR_IMPRESSAO` deve ser ajustado se causar ambiguidade. Uma alternativa melhor é `CUSTO_IMPRESSAO_MILIPATACOS`.

### 2. Preço congelado na campanha

Quando uma campanha for criada ou contratada, registrar um snapshot do preço aplicável:

- modalidade;
- CPM em patacos;
- custo unitário em milipatacos;
- data de vigência;
- versão da tabela de preços;
- eventuais descontos ou bonificações;
- quantidade contratada, quando houver;
- orçamento máximo autorizado.

Alterações futuras na tabela não devem modificar retroativamente campanhas já contratadas.

### 3. Separação entre saldo, reserva e consumo

Manter três conceitos distintos:

- **saldo disponível:** valor que ainda pode ser comprometido;
- **saldo reservado:** valor bloqueado para campanhas ativas, mas ainda não consumido;
- **saldo consumido:** valor debitado por impressões válidas já entregues.

Fluxo recomendado:

```text
Compra ou concessão de créditos
        ↓
Saldo disponível
        ↓ ativação da campanha
Reserva de orçamento
        ↓ impressão válida
Conversão gradual da reserva em consumo
        ↓ encerramento
Liberação de eventual reserva não utilizada
```

Uma campanha não deve iniciar se não houver saldo ou limite autorizado suficiente para a política escolhida.

### 4. Momento do débito

Não cobrar quando o servidor apenas selecionar ou tentar enviar um anúncio.

O débito deve acontecer somente após o registro de uma **impressão válida**, conforme definição operacional da 77Gira. A regra deve considerar, no mínimo:

- anúncio efetivamente renderizado;
- campanha ativa no momento da entrega;
- posicionamento e criativo válidos;
- ausência de duplicidade do mesmo evento de impressão;
- ausência de tráfego reconhecido como inválido ou automatizado;
- registro de data, campanha, criativo, posicionamento e contexto de entrega;
- aplicação da política de frequência;
- respeito às regras de privacidade e LGPD.

Se a plataforma ainda não medir visibilidade, nomear a métrica simplesmente como `impression`. Não chamá-la de `viewable_impression` ou vCPM sem implementar os critérios correspondentes.

### 5. Ledger imutável

Toda movimentação deve gerar um lançamento no ledger, sem alteração destrutiva de registros anteriores.

Tipos mínimos sugeridos:

```text
CREDIT_PURCHASE
CREDIT_BONUS
CAMPAIGN_RESERVATION
AD_IMPRESSION_DEBIT
CAMPAIGN_RELEASE
ADJUSTMENT_CREDIT
ADJUSTMENT_DEBIT
REFUND
```

Cada lançamento deve conter:

- identificador único;
- anunciante ou conta proprietária;
- campanha relacionada, quando aplicável;
- quantidade em milipatacos;
- natureza crédito ou débito;
- saldo anterior e saldo posterior, ou referência suficiente para reconstruí-los;
- data e hora;
- motivo;
- origem da operação;
- identificador de idempotência;
- usuário ou serviço responsável.

Correções devem ser feitas por lançamento compensatório, nunca apagando silenciosamente o débito original.

### 6. Idempotência e duplicidade

O processamento de uma mesma impressão ou lote não pode gerar dois débitos.

- Cada evento ou lote faturável deve possuir uma chave de idempotência estável.
- Criar restrição única no banco para essa chave dentro do escopo adequado.
- Reprocessamentos devem retornar o resultado já registrado, sem novo consumo.
- O débito e o registro da impressão devem participar da mesma transação ou de um fluxo transacional/outbox confiável.

### 7. Débito individual ou em lotes

Para reduzir escrita excessiva no ledger, a 77Gira pode registrar eventos de impressão individualmente e consolidar o débito em lotes auditáveis.

O lote deve manter:

- campanha;
- período inicial e final;
- quantidade de impressões válidas;
- custo unitário em milipatacos;
- custo total;
- IDs ou referência verificável dos eventos incluídos;
- chave de idempotência do lote.

O resultado financeiro do lote precisa ser exatamente igual à soma das impressões válidas.

### 8. Limites de orçamento

- Não permitir que o consumo ultrapasse o orçamento máximo da campanha.
- Interromper ou pausar a campanha antes que uma nova entrega provoque saldo negativo.
- Considerar concorrência entre requisições simultâneas.
- Usar transação, bloqueio ou atualização atômica para impedir gasto duplicado.
- Definir uma margem operacional somente se ela estiver documentada; não criar tolerância implícita.

### 9. Exibição na interface

O saldo pode ser exibido em patacos com até três casas decimais quando necessário:

```text
35 milipatacos = 0,035 pataco
17.500 milipatacos = 17,500 patacos
```

Para telas comerciais, é aceitável mostrar duas casas decimais, desde que:

- o arredondamento seja apenas visual;
- o saldo real continue armazenado integralmente em milipatacos;
- relatórios detalhados possam expor a precisão necessária;
- a soma exibida não seja reutilizada para novos cálculos.

## Modelo de dados conceitual

Os nomes abaixo são sugestões e devem ser adaptados à arquitetura existente.

### Tabela de preços

```text
AdPriceTable
- id
- version
- placementType
- pricingModel             // CPM inicialmente
- cpmPatacos
- impressionCostMilipatacos
- validFrom
- validUntil
- active
```

### Snapshot financeiro da campanha

```text
AdCampaignPricing
- campaignId
- priceTableVersion
- pricingModel
- cpmPatacos
- impressionCostMilipatacos
- budgetMilipatacos
- reservedMilipatacos
- consumedMilipatacos
- currency                 // BRL
- unit                     // MILIPATACO
```

### Ledger

```text
AdCreditLedger
- id
- accountId
- campaignId
- entryType
- direction                // CREDIT ou DEBIT
- amountMilipatacos
- idempotencyKey
- referenceType
- referenceId
- metadata
- createdAt
```

## Invariantes do domínio

O Codex deve preservar as seguintes invariantes:

1. `1 pataco = 1 real = 1.000 milipatacos`.
2. Uma impressão nunca equivale automaticamente a um pataco.
3. O custo da impressão depende do preço congelado da campanha.
4. Valores financeiros persistidos são inteiros em milipatacos.
5. Nenhuma impressão pode ser debitada mais de uma vez.
6. O consumo total não pode superar o orçamento autorizado.
7. Campanhas antigas não mudam de preço quando a tabela é atualizada.
8. Estornos e ajustes são lançamentos compensatórios e auditáveis.
9. Impressões inválidas ou meras tentativas de entrega não geram cobrança.
10. A interface não é fonte de verdade para cálculos financeiros.

## Critérios mínimos de aceite

### Cálculo

- [ ] 1.000 impressões rotativas consomem exatamente 35.000 milipatacos.
- [ ] 1.000 impressões segmentadas consomem exatamente 55.000 milipatacos.
- [ ] 1.000 impressões premium consomem exatamente 80.000 milipatacos.
- [ ] 500 impressões rotativas consomem exatamente 17.500 milipatacos.
- [ ] 100 impressões premium consomem exatamente 8.000 milipatacos.

### Segurança financeira

- [ ] O mesmo evento ou lote reprocessado não gera novo débito.
- [ ] Duas requisições simultâneas não conseguem gastar o mesmo saldo.
- [ ] O sistema não permite saldo disponível negativo.
- [ ] Atualizar a tabela de preços não altera campanhas existentes.
- [ ] Estorno gera lançamento compensatório sem apagar o lançamento original.

### Entrega

- [ ] Tentativa de entrega sem renderização válida não gera consumo.
- [ ] Impressão válida registra campanha, criativo, posicionamento e data.
- [ ] Impressão ou lote possui vínculo auditável com o débito correspondente.
- [ ] Encerramento da campanha libera a reserva não consumida.

## Casos de teste obrigatórios

1. Comprar 100 patacos e confirmar saldo de 100.000 milipatacos.
2. Reservar 35 patacos para uma campanha rotativa.
3. Entregar 1.000 impressões válidas e confirmar consumo total de 35 patacos.
4. Entregar apenas 800 das 1.000 impressões, consumir 28 patacos e liberar 7 patacos ao encerrar.
5. Reprocessar o mesmo lote e confirmar que o consumo permanece inalterado.
6. Alterar o CPM rotativo de 35 para 40 e confirmar que campanha anterior permanece em 35.
7. Criar nova campanha após a alteração e confirmar snapshot em 40.
8. Simular eventos simultâneos próximos ao limite e confirmar que não há saldo negativo.
9. Invalidar uma impressão antes do faturamento e confirmar ausência de débito.
10. Estornar um débito e confirmar rastreabilidade completa no ledger.

## Orientação final ao Codex

Antes de modificar código ou banco de dados:

1. Inspecione a implementação atual de patacos, créditos, campanhas, `AdImpression`, `AdClick`, `AdDeliveryLog`, reservas e ledger.
2. Identifique migrações, contratos de API, jobs e interfaces afetados.
3. Apresente um plano de alteração com impacto e estratégia de migração dos saldos existentes.
4. Não suponha que patacos atuais possam ser reinterpretados sem migração ou compatibilidade.
5. Preserve dados e comportamentos já existentes que não conflitem com esta decisão.
6. Implemente a menor mudança coerente que mantenha auditabilidade e permita evolução futura para outros modelos, como CPC, CPD ou vCPM.
7. Adicione testes unitários, de integração, concorrência e idempotência.
8. Documente qualquer divergência encontrada entre esta regra e o código atual antes de decidir silenciosamente.

### Instrução resumida

> Não implementar 1 impressão por pataco. Um pataco equivale a R$ 1 de saldo publicitário, e 1 pataco contém 1.000 milipatacos. A cobrança deve seguir o CPM congelado na campanha. Com CPMs de 35, 55 e 80 patacos, cada impressão consome respectivamente 35, 55 ou 80 milipatacos. Armazene e movimente valores financeiros como inteiros em milipatacos, debite apenas impressões válidas, mantenha ledger imutável, idempotência, reserva de orçamento e proteção contra saldo negativo. Antes de alterar a implementação, audite o modelo existente e apresente a migração necessária.

---

**Status:** decisão de produto para implementação e validação técnica.  
**Projeto:** 77GiraADS.  
**Data:** agosto de 2026.
