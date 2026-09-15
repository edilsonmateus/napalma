# Conversão de oportunidade em casa interna

## Escopo aprovado

Conectar a ação de conversão à Carteira de aquisição e ao detalhe da oportunidade na Central. Uma oportunidade fechada pode criar uma casa em rascunho usando a rota já existente. Publicação, assinaturas, reivindicações, gestores e eventos seguem seus fluxos próprios.

## Pontos de contato

- Carteira: `frontend/src/pages/admin/AcquisitionAdminPanel.jsx`.
- Central: `frontend/src/pages/OperationsCenterPage.jsx`.
- Modal compartilhado: `frontend/src/components/common/AcquisitionConversionDialog.jsx`.
- Mutação existente: `useConvertAcquisitionLeadToVenueMutation`, com invalidação das consultas de aquisição, histórico e casas.
- API existente: `POST /acquisition/leads/:id/convert-to-venue`, protegida por `canManageAcquisition`.
- Destino: `/settings/venues/:venueId`, ficha administrativa já existente.

## Etapas

- [x] Inspecionar o salvamento de `closed`, as condições de exibição e o destino após conversão.
- [x] Compartilhar o diálogo, com tema escuro na gestão e claro em Operações.
- [x] Exibir a ação no cartão fechado, inclusive quando recolhido.
- [x] Orientar preenchimento de endereço, bairro, região e cidade e encaminhar para edição.
- [x] Exibir vínculo e acesso à ficha nas oportunidades já convertidas.
- [x] Disponibilizar conversão no detalhe da Central.
- [x] Separar oportunidades pendentes de criação das já convertidas no resumo de cinco itens; mostrar contagem e acesso à carteira completa.
- [x] Explicar filtros que escondem as fechadas e oferecer troca de filtro.
- [x] Atualizar a Central ao entrar em Aquisição e ao recuperar foco.
- [x] Mostrar sucesso no diálogo e permitir abrir a ficha, evitando o antigo destino desativado.
- [x] Concluir build e verificações proporcionais.
- [ ] Validação do usuário em localhost.
- [ ] Commit e publicação apenas após solicitação do usuário.

## Cuidados

O backend e o banco permanecem sem alterações. A API continua responsável pelas validações de autorização, etapa, dados obrigatórios e duplicidade. O modal impede envio repetido durante a requisição e mantém a confirmação de sucesso mesmo se um painel não atualizar. A descrição inicial orienta texto de apresentação pública, pois esse campo alimenta a descrição da casa: evitar notas comerciais internas.

Usar diálogo nativo para foco contido, Escape, retorno de foco e sobreposição aos detalhes da Central. Bloquear cancelamento durante envio. Não executar conversões reais para testes automatizados: simular respostas da API no navegador.

## Verificações de aceite

Cartão fechado exibe ação; cartão convertido exibe ficha; cadastro incompleto orienta edição; modal cancela e retorna foco; envio correto mostra sucesso; falha mantém os campos; clique repetido não repete envio; Central acessa todas as pendências pela carteira; rascunho e auditoria preservados na rota existente.

## Resultado da validação local

- Build do frontend concluído.
- Seis testes de aquisição e elegibilidade passaram.
- Teste em Chrome com respostas da API simuladas passou: cancelamento por Escape, retorno do foco, prevenção de envio repetido, sucesso com link correto, recuperação de erro preservando descrição e layout de 390 px.
- No componente real da Carteira, salvar a oportunidade como Fechada mostrou a ação imediatamente; confirmar a conversão atualizou o cartão para o vínculo com a ficha.
- Ao salvar como Fechada, a Carteira passa ao filtro Fechada e limpa os demais filtros para manter o registro acessível.
- Nenhuma conversão real ou implantação em produção foi executada. A autorização e a transação do backend permaneceram no código existente, sem novo teste autenticado contra o banco.
