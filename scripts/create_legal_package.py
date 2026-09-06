from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = Path(r"C:\Users\edils\OneDrive\Documentos\New project\documentacao\juridico\minutas\pacote_contratual_v1")
OUT.mkdir(parents=True, exist_ok=True)

LEGAL_NAME = "77 Giramundo Serviços de Comunicação e Publicidade"
CNPJ = "77.777.777/0001-77"
PENDING = "[INFORMAR/VALIDAR: dado jurídico, comercial ou operacional aplicável a este item]"

def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr(); shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), color); tcPr.append(shd)

def border(cell, color='D9E2F0'):
    tcPr = cell._tc.get_or_add_tcPr(); borders = OxmlElement('w:tcBorders')
    for e in ('top','left','bottom','right'):
        x = OxmlElement('w:'+e); x.set(qn('w:val'),'single'); x.set(qn('w:sz'),'6'); x.set(qn('w:color'),color); borders.append(x)
    tcPr.append(borders)

def set_cell_text(cell, text, bold=False, color=None, size=9):
    cell.text = ''
    p = cell.paragraphs[0]; r = p.add_run(text); r.bold=bold; r.font.size=Pt(size)
    if color: r.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

def base(code, title, subtitle):
    d=Document(); sec=d.sections[0]; sec.top_margin=Inches(.65); sec.bottom_margin=Inches(.65); sec.left_margin=Inches(.75); sec.right_margin=Inches(.75)
    styles=d.styles; styles['Normal'].font.name='Aptos'; styles['Normal'].font.size=Pt(10); styles['Normal']._element.rPr.rFonts.set(qn('w:eastAsia'),'Aptos')
    for h,size,col in [('Title',25,'17223B'),('Heading 1',15,'17223B'),('Heading 2',11,'E85D21')]:
        styles[h].font.name='Aptos Display'; styles[h].font.size=Pt(size); styles[h].font.color.rgb=RGBColor.from_string(col)
    h=sec.header.paragraphs[0]; h.text=f'77GIRA  |  JURÍDICO — {code}'; h.runs[0].font.size=Pt(8); h.runs[0].font.bold=True; h.runs[0].font.color.rgb=RGBColor(230,93,33)
    f=sec.footer.paragraphs[0]; f.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=f.add_run('MINUTA PARA REVISÃO JURÍDICA — versão 1.0  |  '); r.font.size=Pt(8); r.font.color.rgb=RGBColor(100,110,125)
    fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); f._p.append(fld)
    d.add_heading(title,0); p=d.add_paragraph(subtitle); p.style='Subtitle'
    t=d.add_table(rows=1, cols=4); t.alignment=WD_TABLE_ALIGNMENT.CENTER
    vals=[('Status','Minuta com campos de complementação'),('Versão','1.0'),('Operador',LEGAL_NAME+' | CNPJ '+CNPJ),('Canal jurídico','77giramundo@gmail.com | validar canal formal LGPD')]
    for c,(a,b) in zip(t.rows[0].cells,vals):
        shade(c,'F4F7FB'); border(c); set_cell_text(c,a+'\n'+b,False,'43536A',8)
    d.add_paragraph()
    note=d.add_table(rows=1,cols=1); c=note.cell(0,0); shade(c,'FFF5E8'); border(c,'F4C57B'); set_cell_text(c,'AVISO DE REVISÃO\nEsta minuta consolida a operação atual do 77Gira. Não deve ser publicada ou assinada sem revisão por advogado(a), preenchimento dos campos pendentes e validação comercial/tributária.',True,'7A4D00',9)
    d.add_paragraph()
    return d

def add_sections(d, sections):
    for heading, paragraphs in sections:
        d.add_heading(heading,1)
        for item in paragraphs:
            if isinstance(item, tuple) and item[0]=='bullets':
                for b in item[1]: d.add_paragraph(b, style='List Bullet')
            else: d.add_paragraph(item)

def save(d, name): d.save(OUT/name)

# Cada campo pendente recebe uma orientação específica para a negociação e a
# revisão jurídica. Assim a minuta explica o que deve ser decidido, em vez de
# deixar uma instrução genérica para o preenchimento.
CONTEXTUAL_FIELDS = {
    '02_termos_de_uso_77gira.docx': [
        '[DEFINIR: limites de responsabilidade aplicáveis, foro competente e procedimento prévio de negociação ou mediação]',
        '[INFORMAR: endereço completo da sede da 77 Giramundo, cidade/UF e CEP]',
    ],
    '03_politica_de_privacidade_e_cookies.docx': [
        '[VALIDAR: fornecedores atuais, função de cada um no tratamento, países de hospedagem e links para termos/DPA]',
        '[DEFINIR: prazo de retenção por categoria de dado — conta, conteúdo, logs, solicitações LGPD, campanhas e auditoria]',
        '[INFORMAR: nome ou canal do Encarregado/DPO, e-mail oficial e procedimento de comunicação de incidentes]',
    ],
    '04_termos_de_publicidade_77gira_ads.docx': [
        '[DEFINIR: janela de consolidação das métricas, critérios de impressão e clique válidos e procedimento de contestação]',
        '[DEFINIR: gateway, responsável pela emissão fiscal, regras de reembolso/estorno e tratamento tributário]',
    ],
    '05_regulamento_patacos_e_milipatacos.docx': [
        '[ANEXAR: tabela comercial de milipatacos por slot, formato, modalidade e regra de atualização]',
        '[DEFINIR: autoridade interna para concessão, teto acumulado por conta e regras para exceções registradas]',
        '[DEFINIR: prazo máximo para contestar o consumo e canal de suporte comercial]',
    ],
    '06_termo_de_reivindicacao_e_gestao_de_perfil.docx': [
        '[DEFINIR: prazo para contestação, canal de recurso e critérios de reversão de decisão]',
    ],
    '07_politica_de_conteudo_moderacao_e_denuncias.docx': [
        '[DEFINIR: encaminhamento a organizadores/autoridades, responsáveis internos e forma de comunicação ao denunciante]',
    ],
    '09_contrato_base_de_parceria_e_patrocinio.docx': [
        '[INFORMAR: razão social, CNPJ, sede e representante legal do parceiro]',
        LEGAL_NAME+' | CNPJ '+CNPJ+' | [INFORMAR: endereço completo e representante legal da 77Gira]',
        '[DEFINIR: iniciativa apoiada, objetivos, território, canais e período de execução]',
        '[DEFINIR: contrapartida financeira ou institucional, ativos de marca, aprovações e obrigações do parceiro]',
        '[DEFINIR: entregas autorizadas — por exemplo, logomarca em página de parceiros, régua institucional de e-mails, roteiros, mapas, conteúdos, ativações ou formatos Ads — indicando quantidade, canal e período]',
        '[DEFINIR: data de início, término, renovação e marcos de entrega]',
        '[DEFINIR: aviso prévio, valores, condições de rescisão, multas se aplicáveis e tratamento de valores já pagos]',
        '[VALIDAR: limites de responsabilidade, cláusula anticorrupção, cessão, tributos, foro e mediação]',
        '[DEFINIR: plataforma de assinatura eletrônica, signatários e nível de assinatura exigido]',
    ],
    '10_contrato_base_de_publicidade.docx': [
        '[INFORMAR: razão social, CNPJ, sede e representante legal do anunciante]',
        LEGAL_NAME+' | CNPJ '+CNPJ+' | [INFORMAR: endereço completo e representante legal da 77Gira]',
        '[DEFINIR: nome, objetivo, território se aplicável, janela e critérios de veiculação da campanha]',
        '[DEFINIR: limite de frequência, deduplicação, filtragem de tráfego inválido e prazo de contestação]',
        '[DEFINIR: preço, tributos, documento fiscal, gateway, condições de pagamento, reembolso, estorno e chargeback]',
        '[DEFINIR: vigência, encerramento, confidencialidade, limite de responsabilidade e foro]',
    ],
    '11_termo_de_tratamento_de_dados_e_fornecedores.docx': [
        '[DEFINIR: controlador, operador, eventual Encarregado/DPO e responsabilidades de cada fornecedor]',
        '[DEFINIR: frequência de backup, retenção, responsáveis, testes de restauração e objetivos RPO/RTO]',
        '[DEFINIR: países/regiões aplicáveis, contato de incidentes, prazo de notificação e plano de resposta]',
        '[DEFINIR: prazo de devolução/eliminação, exceções por backup ou obrigação legal e forma de comprovação]',
    ],
}

def _all_paragraphs(document):
    for paragraph in document.paragraphs:
        yield paragraph
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    yield paragraph

def contextualize_fields(filename, replacements):
    path = OUT / filename
    document = Document(path)
    remaining = iter(replacements)
    replaced = 0
    for paragraph in _all_paragraphs(document):
        for run in paragraph.runs:
            while PENDING in run.text:
                try:
                    run.text = run.text.replace(PENDING, next(remaining), 1)
                except StopIteration:
                    raise RuntimeError(f'Campos contextuais insuficientes em {filename}')
                replaced += 1
    try:
        next(remaining)
        raise RuntimeError(f'Campos contextuais excedentes em {filename}')
    except StopIteration:
        pass
    if replaced != len(replacements):
        raise RuntimeError(f'Foram substituídos {replaced} de {len(replacements)} campos em {filename}')
    document.save(path)

def terms():
    d=base('02','Termos de Uso — 77Gira','Regras gerais para uso da plataforma por público, casas, produtores, artistas e demais contas.')
    add_sections(d,[
      ('1. Aceite e escopo',['Ao criar conta, utilizar recursos autenticados ou continuar após aviso de atualização, a pessoa usuária aceita estes Termos e a Política de Privacidade. O 77Gira organiza informações culturais e ferramentas de operação; não é produtor, organizador, seguradora, transportador ou vendedor de ingressos, salvo contratação expressa.']),
      ('2. Conta e conduta',[('bullets',['Informar dados verdadeiros e manter acesso protegido;','Não usar nome, marca, imagem ou conteúdo de terceiro sem autorização;','Não publicar fraude, assédio, discriminação, ameaça, material ilegal, link malicioso ou conteúdo enganoso;','Responder por atos praticados pela conta e avisar suspeita de acesso indevido.'])]),
      ('3. Conteúdo e licença',['A pessoa conserva a titularidade do conteúdo que possuir. Ao publicar nome, marca, avatar, cartaz, foto, vídeo, bio e links, concede ao 77Gira licença não exclusiva, gratuita, mundial e limitada ao prazo necessário para hospedar, reproduzir, adaptar tecnicamente, exibir e divulgar o conteúdo dentro do serviço e suas comunicações ligadas ao serviço. A licença não autoriza uso publicitário autônomo fora dessa finalidade sem base própria.']),
      ('4. Moderação e medidas',['O 77Gira pode limitar, ocultar, corrigir, suspender ou remover conteúdo/perfis diante de violação destes Termos, denúncia fundamentada, risco a pessoas, fraude, violação de direitos ou obrigação legal. Quando compatível com segurança e lei, haverá notificação, prazo de correção e canal de contestação. Medidas urgentes podem ser imediatas.']),
      ('5. Disponibilidade e responsabilidade',['O serviço é oferecido conforme disponibilidade técnica. Não há garantia de agenda completa, permanência de evento, comparecimento, resultados comerciais, alcance, vendas ou disponibilidade contínua. Limites legais de responsabilidade, foro e regras de consumo devem ser validados juridicamente. '+PENDING]),
      ('6. Alterações e contato',['Mudanças materiais serão comunicadas com antecedência razoável, preferencialmente de 30 dias quando viável, e poderão exigir novo aceite. Dúvidas: 77giramundo@gmail.com. Operador legal e endereço: '+PENDING+'.'])])
    save(d,'02_termos_de_uso_77gira.docx')

def privacy():
    d=base('03','Política de Privacidade e Cookies','Transparência, escolha e segurança para o tratamento de dados pessoais no 77Gira.')
    add_sections(d,[
      ('1. Dados tratados',[('bullets',['Identidade e conta: nome, e-mail, nome de usuário, avatar e credenciais protegidas;','Uso: preferências, Radar, Pela Hora, interações e registros necessários à experiência;','Localização-base opcional: cidade, bairro e CEP, sem exigência de endereço completo;','Profissionais: dados enviados em perfis, reivindicações, casas, eventos, cardápios e campanhas;','Técnicos: logs, identificadores de sessão, IP, dispositivo e segurança;','Publicidade: eventos de impressão e clique agregados, sem entregar dados individuais a anunciantes.'])]),
      ('2. Finalidades e bases',['Usamos dados para executar o serviço, proteger contas, responder solicitações, cumprir obrigações legais, melhorar recursos e, quando aplicável, consentimento para personalização, publicidade relevante e notificações push. Consentimentos são apresentados de forma separada, registrados com versão/data e podem ser revogados nas configurações.']),
      ('3. Compartilhamento e fornecedores',['Dados podem ser tratados por fornecedores de infraestrutura, armazenamento, e-mail transacional e segurança: Vercel, Render/PostgreSQL, Cloudflare/R2, Brevo e GitHub; futuro gateway Mercado Pago quando ativado. Há possível transferência internacional conforme infraestrutura dos fornecedores. Contratos/DPA e países devem ser revisados periodicamente. '+PENDING]),
      ('4. Retenção, segurança e direitos',['Mantemos dados pelo tempo necessário às finalidades, obrigações legais, auditoria e defesa de direitos. Prazos por categoria: '+PENDING+'. A pessoa pode solicitar confirmação, acesso, correção, anonimização, portabilidade, revogação de consentimento e exclusão, sujeitos a retenções legais. Canal: 77giramundo@gmail.com e Central de Privacidade e Dados autenticada.']),
      ('5. Incidentes e contato',['Incidentes são avaliados por severidade, alcance e risco. O responsável interno decide a escalada com apoio jurídico/técnico; titulares, autoridades e parceiros serão comunicados quando a lei exigir. Encarregado/DPO e canal específico: '+PENDING+'.'])])
    save(d,'03_politica_de_privacidade_e_cookies.docx')

def ads():
    d=base('04','Termos de Publicidade — 77Gira Ads','Regras comerciais para contas anunciante, campanhas, criativos, inventário, revisão e métricas.')
    add_sections(d,[
      ('1. Acesso e aprovação',['A conta anunciante depende de solicitação e aprovação comercial. Aprovação não é promessa de veiculação, crédito, inventário ou resultado. Casas, produtores e artistas podem acessar o workspace conforme conta aprovada e permissões.']),
      ('2. Campanhas e revisão',['Campanhas, destinos, criativos e slots passam por revisão. O 77Gira pode aprovar, pedir correção, rejeitar, pausar ou encerrar itens por adequação, qualidade, segurança, indisponibilidade ou obrigação legal. Criativos devem respeitar a proporção do slot.']),
      ('3. Entrega e identificação',['Publicidade é identificada por sinalização ADS/patrocinado, separada de conteúdo editorial e não representa recomendação da casa, do artista ou do item. Entrega ocorre conforme saldo, inventário, frequência, regras do slot e controles de qualidade; não há garantia de alcance, venda, CTR, posição ou exclusividade sem contrato específico.']),
      ('4. Categorias proibidas e restritas',[('bullets',['Proibidas: apostas/bets, tabaco/vape, armas, conteúdo adulto explícito, desinformação, fraude, phishing, pirâmides, discriminação, exploração e atividades ilegais.','Restritas e sujeitas a avaliação: álcool, saúde, suplementos, serviços financeiros/crédito, mobilidade e conteúdo político/cívico.'])]),
      ('5. Métricas e divergência',['Métricas podem incluir impressões válidas, cliques, CTR, período, slot e saldo consumido. Filtros técnicos excluem eventos inválidos, repetição suspeita, robôs e tráfego inconsistente conforme regra operacional. Divergências são analisadas por logs e janela de consolidação: '+PENDING+'. Dados individuais não são entregues ao anunciante.']),
      ('6. Faturamento e reembolso',['Enquanto o gateway estiver em simulação, não há cobrança real. Na ativação comercial, fornecedor, emissão fiscal, reembolso, estorno e tributos serão definidos por contrato/política específica. '+PENDING+'.'])])
    save(d,'04_termos_de_publicidade_77gira_ads.docx')

def credits():
    d=base('05','Regulamento de Patacos e Milipatacos','Regras de saldo promocional e de mídia aplicáveis ao 77Gira Ads.')
    add_sections(d,[
      ('1. Unidade e conversão',['Um Pataco corresponde a 1.000 milipatacos. Cada impressão válida consome milipatacos conforme slot e modalidade contratada. O custo pode variar por posição, formato, segmentação, prioridade e inventário. Tabela comercial vigente: '+PENDING+'.']),
      ('2. Consumo e saldo',['Campanhas podem rodar até o consumo do orçamento, respeitando revisão, inventário e controles de frequência. Saldo remanescente permanece disponível para nova campanha, salvo regra contratual específica. Patacos não são moeda, valor mobiliário, transferência bancária ou direito de conversão em dinheiro.']),
      ('3. Bonificações',['A operação pode conceder créditos de teste de 250, 500 ou 750 Patacos. A bonificação é discricionária, não transferível, sem saque e pode ter validade. Padrão operacional: 30 dias, com possibilidade de nova concessão manual registrada. Teto e exceções: '+PENDING+'.']),
      ('4. Expiração, reversão e contestação',['Patacos promocionais expirados não geram reembolso. Créditos pagos, reembolsos, chargebacks e estornos dependerão do gateway real e termos comerciais futuros. Contestação de consumo deve ser feita em '+PENDING+' dias, com análise dos registros técnicos.']),
      ('5. Uso indevido',['O 77Gira pode bloquear saldo, campanha ou conta em caso de fraude, chargeback, violação de regras, risco de segurança ou erro material.'])])
    save(d,'05_regulamento_patacos_e_milipatacos.docx')

def claim():
    d=base('06','Termo de Reivindicação e Gestão de Perfil','Regras para reivindicar e administrar perfis de artistas, casas e equipes vinculadas.')
    add_sections(d,[
      ('1. Declaração de legitimidade',['Quem solicita a reivindicação declara ser titular, integrante autorizado, representante legal ou pessoa com poderes suficientes para gerir o perfil. É proibido reivindicar perfil de terceiro sem autorização.']),
      ('2. Verificação e equipe',['O 77Gira pode pedir documentos, links oficiais, comprovação de vínculo ou informações adicionais. Um perfil pode ter mais de um administrador, com permissões e registros de alterações. A concessão de selo/verificação não é automática e poderá seguir critérios próprios.']),
      ('3. Conteúdo e responsabilidade',['Administradores respondem pela exatidão de bio, agenda, mídia, contatos, links e materiais enviados. O 77Gira pode corrigir, suspender ou remover materiais em caso de denúncia, inconsistência, fraude ou violação de direitos.']),
      ('4. Aviso legal e contestação',['A pessoa solicitante toma ciência de que falsas declarações podem gerar restrição de acesso, remoção do vínculo e medidas cabíveis. Decisões serão registradas; canal de contestação e prazo: '+PENDING+'.'])])
    save(d,'06_termo_de_reivindicacao_e_gestao_de_perfil.docx')

def moderation():
    d=base('07','Política de Conteúdo, Moderação e Denúncias','Critérios para reporte, análise, correção, suspensão e preservação de evidências.')
    add_sections(d,[
      ('1. Categorias de denúncia',[('bullets',['Fraude, identidade falsa e informações enganosas;','Assédio, ameaça, violência, discriminação ou discurso de ódio;','Violação de direito autoral, marca, imagem ou dados falsos;','Link malicioso, phishing, exposição de dados e campanha irregular;','Risco à segurança relacionado a evento físico.'])]),
      ('2. Canais e evidências',['Denúncias anônimas podem ser aceitas para fraude, assédio/discriminação, segurança, links maliciosos e exposição de dados. Alegações de direito autoral, marca ou imagem exigem identificação e evidências suficientes, salvo situação excepcional.']),
      ('3. Processo e urgência',['O 77Gira registra protocolo, avalia gravidade, pode solicitar esclarecimentos e dá prazo de correção/recurso quando compatível com o risco. Suspensão imediata pode ocorrer diante de exposição de dados, phishing/malware, fraude, ameaça, violência/exploração, risco grave ou ordem legal.']),
      ('4. Registros preservados',['Podem ser preservados protocolo, denúncia, conteúdo, evidências, links, datas, comunicações, decisões, responsáveis e logs técnicos, respeitados os limites legais de retenção.']),
      ('5. Eventos físicos',['O 77Gira não substitui autoridades, organizadores, segurança privada ou seguro. Não há seguro/reserva operacional própria nesta fase. Protocolo para incidentes físicos: '+PENDING+'.'])])
    save(d,'07_politica_de_conteudo_moderacao_e_denuncias.docx')

def partners():
    d=base('08','Política de Parcerias Estratégicas','Princípios para relacionamento institucional, apoios, patrocínios e presença de parceiros.')
    add_sections(d,[
      ('1. Finalidade',['Parcerias podem apoiar roteiros, mapas, rotas, conteúdos, experiências, ativações presenciais, projetos culturais, dados agregados, Ads e eventos, conforme contrato específico.']),
      ('2. Critérios e independência',['A curadoria de eventos permanece independente. Parceiros não interferem na ordem da agenda ou na seleção editorial. A presença institucional deve ser identificada de modo claro, por exemplo “apoiado por [Marca]”.']),
      ('3. Categorias vedadas',[('bullets',['Apostas/bets e jogos de azar;','Tabaco/vape, armas, conteúdo adulto explícito;','Desinformação, fraude, pirâmides, exploração, discriminação ou atividade ilegal.'])]),
      ('4. Visibilidade e dados',['Logos podem aparecer em página pública, ativações ou régua institucional de e-mails somente quando o parceiro estiver ativo, autorizado e publicamente visível. Dados fornecidos são agregados e não identificam indivíduos, salvo base legal/contrato específico.']),
      ('5. Exclusividade',['Exclusividade ou bloqueio de concorrente só existe mediante contrato escrito, escopo, período, categoria, contrapartida e aprovação interna definidos.'])])
    save(d,'08_politica_de_parcerias_estrategicas.docx')

def partner_contract():
    d=base('09','Contrato Base de Parceria e Patrocínio','Minuta bilateral para formalizar parceria estratégica com o 77Gira.')
    add_sections(d,[
      ('Partes e objeto',['CONTRATANTE/PARCEIRO: '+PENDING+'. CONTRATADA: '+PENDING+'. Objeto: apoio/patrocínio de '+PENDING+', com entregas, cronograma, investimento e critérios descritos em Anexo Comercial.']),
      ('Entregas e governança',[('bullets',['Entregas do parceiro: '+PENDING+'.','Entregas do 77Gira: '+PENDING+'.','Aprovação de marca, peças e uso de logo seguirá fluxo escrito; nenhuma parte altera conteúdo editorial sem autorização.'])]),
      ('Dados, marca e confidencialidade',['Cada parte responde pelos dados que tratar. Relatórios serão agregados e sem dados pessoais identificáveis, salvo base legal/documento específico. Marcas e materiais permanecem de seus titulares; licença de uso limitada ao objeto, território, canais e vigência. Informações comerciais não públicas são confidenciais.']),
      ('Vigência, rescisão e responsabilidade',['Vigência: '+PENDING+'. Rescisão, aviso prévio, valores, multas e reembolso: '+PENDING+'. Limites de responsabilidade, anticorrupção, cessão, tributos, foro e mediação exigem validação jurídica antes da assinatura. '+PENDING+'.']),
      ('Assinaturas',['Assinatura eletrônica individual por provedor especializado, com trilha de auditoria. Plataforma escolhida: '+PENDING+'.'])])
    save(d,'09_contrato_base_de_parceria_e_patrocinio.docx')

def ad_contract():
    d=base('10','Contrato Base de Publicidade','Minuta bilateral para contratação de campanha, mídia e regras de veiculação no 77Gira Ads.')
    add_sections(d,[
      ('Partes, campanha e orçamento',['ANUNCIANTE: '+PENDING+'. 77GIRA: '+PENDING+'. Campanha: '+PENDING+'. Objetivo, slots, período, saldo, tabela de custo em milipatacos e criativos constarão no Pedido de Inserção.']),
      ('Veiculação e revisão',['A veiculação depende de conta aprovada, campanha, criativos compatíveis, revisão concluída, saldo e inventário. O 77Gira não garante alcance, vendas, conversão, público, posição ou disponibilidade. Campanha pode ser pausada/corrigida por qualidade, segurança, lei ou falta de saldo.']),
      ('Métricas e entrega',['Relatório poderá apresentar impressões válidas, cliques, CTR, slot, janela, saldo consumido e filtros aplicados. Regras de frequência, deduplicação, tráfego inválido e divergência operacional constarão na Política de Métricas: '+PENDING+'.']),
      ('Financeiro',['Preço, tributos, documento fiscal, meio de pagamento, reembolso, estorno, chargeback e saldo remanescente: '+PENDING+'. Enquanto houver gateway simulado, não há cobrança real.']),
      ('Restrições, marcas e encerramento',['Aplicam-se categorias proibidas/restritas e política de revisão. Exclusividade é excepcional e só vale se anexada por escrito. Vigência, rescisão, responsabilidade, confidencialidade e foro: '+PENDING+'.'])])
    save(d,'10_contrato_base_de_publicidade.docx')

def processors():
    d=base('11','Termo de Tratamento de Dados e Fornecedores','Minuta-base para governança de operadores, transferências internacionais e segurança.')
    add_sections(d,[
      ('1. Papéis e instruções',['Controlador, operadores, corresponsáveis e encarregado/DPO devem ser definidos por fluxo e fornecedor: '+PENDING+'. O fornecedor trata dados somente conforme instruções documentadas, contrato, termos aplicáveis e lei.']),
      ('2. Fornecedores atuais',[('bullets',['Vercel: hospedagem/frontend;','Render/PostgreSQL: backend e banco;','Cloudflare/R2: DNS, rede, CDN e armazenamento de mídia;','Brevo: e-mail transacional;','GitHub: repositório e desenvolvimento;','Push Web: infraestrutura nativa de navegadores;','Mercado Pago: futuro gateway de pagamentos, quando ativado.'])]),
      ('3. Segurança e acessos',['Devem existir controles de acesso por função, segredos em variáveis protegidas, rotação/revogação de chaves, autenticação reforçada em sistemas críticos, logs e revisão de permissões. Política de backup, restauração e periodicidade: '+PENDING+'.']),
      ('4. Suboperadores, internacional e incidente',['Transferências internacionais podem ocorrer conforme infraestrutura dos provedores. O fornecedor deve comunicar incidentes sem demora injustificada, colaborar na investigação e preservar evidências. Prazos, contatos e plano de resposta: '+PENDING+'.']),
      ('5. Retenção e término',['Ao término, dados devem ser devolvidos ou eliminados conforme instruções, exceto retenção legal, segurança, backup ou defesa de direitos. Prazos e comprovação: '+PENDING+'.'])])
    save(d,'11_termo_de_tratamento_de_dados_e_fornecedores.docx')

terms(); privacy(); ads(); credits(); claim(); moderation(); partners(); partner_contract(); ad_contract(); processors()
for _filename, _replacements in CONTEXTUAL_FIELDS.items():
    contextualize_fields(_filename, _replacements)
(OUT/'README_pacote_contratual_v1.md').write_text('# Pacote contratual v1\n\n10 minutas preparadas para revisão jurídica. Campos pendentes aparecem como `[PREENCHER/VALIDAR COM JURÍDICO]`.\n\nNão publicar nem assinar sem revisão profissional, identificação formal da pessoa jurídica e definição comercial/fiscal.',encoding='utf-8')
print('OK', OUT)
