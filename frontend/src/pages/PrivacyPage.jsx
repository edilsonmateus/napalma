import BackLink from "../components/common/BackLink";
import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <section className="screen legal-screen">
      <header className="page-header">
        <h2>Política de Privacidade</h2>
        <p>Transparência, escolha e segurança no tratamento de dados de público, artistas, casas, produtores, equipes e anunciantes do 77Gira.</p>
      </header>

      <article className="clean-card legal-card">
        <h3>1. Quem somos e qual é o alcance desta política</h3>
        <p>Esta Política de Privacidade explica como o 77Gira trata dados pessoais no aplicativo, site, páginas públicas, painéis administrativos, workspaces profissionais, ambiente de publicidade, recursos de localização, canais de suporte e demais pontos de contato da plataforma. Ela deve ser lida em conjunto com os <Link to="/terms">Termos de Uso</Link>.</p>
        <p>O 77Gira atua como controlador quando define as finalidades e os meios do tratamento descrito nesta política. Em integrações ou serviços operados por terceiros, cada participante poderá ter responsabilidades próprias, conforme sua atuação e a legislação aplicável.</p>
        <p>Para dúvidas, exercício de direitos ou comunicações sobre privacidade, utilize a <Link to="/settings/privacy">Central de Privacidade e Dados</Link> ou escreva para <a href="mailto:77giramundo@gmail.com">77giramundo@gmail.com</a>.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>2. Dados que podemos tratar</h3>
        <ul className="legal-list">
          <li><strong>Cadastro e identidade:</strong> nome, sobrenome, nome de usuário, e-mail, senha protegida por hash, telefone, perfil de Instagram, foto e dados necessários para autenticação e recuperação da conta.</li>
          <li><strong>Localização-base:</strong> cidade, bairro e CEP informados pelo usuário. Não solicitamos endereço residencial completo para liberar o recurso “Tô na Pista”.</li>
          <li><strong>Localização atual e notificações:</strong> coordenadas fornecidas pelo navegador ou dispositivo durante uma sessão do “Tô na Pista”, estado da sessão, sugestões entregues e dados da assinatura de push quando as notificações forem ativadas.</li>
          <li><strong>Uso e preferências:</strong> eventos visualizados, guardados no Radar ou compartilhados; histórico; artistas seguidos; buscas; filtros; interações com rotas; preferências culturais e publicitárias; e escolhas salvas no dispositivo.</li>
          <li><strong>Perfis e operação profissional:</strong> vínculos com artistas, casas, produtores, equipes e anunciantes; papéis e permissões; agendas; EPKs; mídias; contatos profissionais; convites; solicitações e atividades nos workspaces.</li>
          <li><strong>Reivindicações e legitimidade:</strong> declarações aceitas, versão do aviso legal, data e hora da ciência, justificativas, documentos ou evidências enviados, análise, decisão e registros de auditoria relacionados ao vínculo solicitado.</li>
          <li><strong>Contratações:</strong> nome ou empresa, e-mail, telefone, cidade, bairro ou região, data desejada, tipo de evento, público estimado, orçamento e mensagem enviados à equipe autorizada do artista.</li>
          <li><strong>Publicidade e carteira de mídia:</strong> conta anunciante, responsáveis e membros, campanhas, segmentação contextual, criativos, destinos, revisões, inventário, patacos, movimentações de carteira, ordens e estados de processamento.</li>
          <li><strong>Métricas e entrega:</strong> impressões, cliques, slot, campanha, criativo, data e hora, identificadores técnicos de visitante ou sessão, limites de frequência, integridade da entrega e indicadores agregados de desempenho.</li>
          <li><strong>Conteúdo e arquivos:</strong> fotos, capas, banners, criativos e outros arquivos enviados, com metadados técnicos necessários para validação, armazenamento, transformação e entrega.</li>
          <li><strong>Dados técnicos e de segurança:</strong> endereço IP, navegador, sistema, dispositivo, data e horário, identificadores de sessão, registros de autenticação, falhas, limites de requisição, eventos de auditoria e sinais de fraude ou abuso.</li>
          <li><strong>Comunicações e direitos:</strong> mensagens ao suporte, solicitações de acesso, correção, exportação, oposição, anonimização ou exclusão, confirmações de identidade, prazos, decisões e notas de atendimento.</li>
        </ul>
      </article>

      <article className="clean-card legal-card">
        <h3>3. Como os dados são obtidos</h3>
        <p>Recebemos dados diretamente de você, de representantes ou integrantes autorizados de uma equipe, do navegador ou dispositivo mediante permissão, do uso das funcionalidades, de páginas e cadastros profissionais legítimos e de prestadores que apoiam a operação. Também geramos registros técnicos, métricas, classificações de status e trilhas de auditoria a partir da atividade realizada na plataforma.</p>
        <p>Quem envia dados de terceiros — por exemplo, integrantes de uma equipe, contratantes ou representantes — deve possuir fundamento legítimo para fazê-lo e compartilhar apenas o necessário.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>4. Para que usamos os dados</h3>
        <ul className="legal-list">
          <li>Criar, autenticar, recuperar e proteger contas e sessões.</li>
          <li>Exibir agendas, eventos, páginas de casas, perfis de artistas, EPKs, rotas e conteúdos públicos.</li>
          <li>Sincronizar Radar, histórico, seguidores, preferências e configurações entre dispositivos.</li>
          <li>Operar equipes com múltiplos administradores, papéis, permissões e workspaces profissionais.</li>
          <li>Analisar reivindicações, comprovar legitimidade, prevenir apropriação indevida de perfis e manter rastreabilidade das decisões.</li>
          <li>Encaminhar oportunidades de contratação às pessoas autorizadas a administrar o artista.</li>
          <li>Operar contas anunciantes, campanhas, criativos, revisões, inventário, carteira de mídia e controles de veiculação.</li>
          <li>Entregar publicidade, controlar frequência, contabilizar impressões e cliques, detectar tráfego inválido e produzir relatórios agregados.</li>
          <li>Ativar recomendações de proximidade e notificações quando solicitadas pelo usuário.</li>
          <li>Atender solicitações de privacidade, exportar dados, registrar consentimentos e manter evidências de atendimento.</li>
          <li>Prevenir fraude, spam, abuso e acessos não autorizados; investigar incidentes; depurar falhas e preservar a estabilidade do serviço.</li>
          <li>Cumprir obrigações legais ou regulatórias e exercer ou defender direitos em processos administrativos, arbitrais ou judiciais.</li>
        </ul>
      </article>

      <article className="clean-card legal-card">
        <h3>5. Bases legais</h3>
        <p>O tratamento é realizado de acordo com a Lei Geral de Proteção de Dados Pessoais — LGPD. Conforme a finalidade e o contexto, podemos utilizar: execução de contrato ou procedimentos preliminares solicitados pelo titular; cumprimento de obrigação legal ou regulatória; exercício regular de direitos; legítimo interesse, após avaliação de finalidade, necessidade, proporcionalidade, impactos e salvaguardas — inclusive em atividades compatíveis de segurança e prevenção de abuso —; e consentimento, quando essa for a base adequada.</p>
        <p>Permissões do navegador ou dispositivo, como localização atual e notificações, são controles adicionais e podem ser revogadas nas configurações correspondentes. A revogação não invalida tratamentos anteriores realizados de forma legítima nem impede tratamentos baseados em outra hipótese legal aplicável.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>6. Localização e “Tô na Pista”</h3>
        <p>A localização-base — cidade, bairro e CEP — representa uma referência geral de circulação e é exigida para ativar o “Tô na Pista”. Ela não corresponde à localização atual e não inclui rua ou número residencial.</p>
        <p>Quando você ativa o recurso, o navegador pode solicitar acesso à localização atual. As coordenadas são usadas para comparar sua posição com casas e eventos próximos, abrir uma sessão temporária e entregar recomendações. A sessão ativa dura até 1 hora e pode ser encerrada antes pelo usuário. Registros mínimos da ativação e das entregas poderão ser mantidos por segurança, auditoria, prevenção de abuso e avaliação do funcionamento, conforme os critérios de retenção desta política.</p>
        <p>O “Tô na Pista” é opcional. Sem localização-base completa ou sem a permissão de localização atual, o restante do aplicativo continua disponível, ressalvadas as funções que dependem diretamente desses dados.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>7. Publicidade, personalização e métricas</h3>
        <p>O 77Gira utiliza espaços publicitários identificados para financiar e ampliar a plataforma sem transformar a experiência em um mural indiscriminado. Campanhas podem considerar contexto como slot, cidade, região, período, inventário disponível e relação com casas, eventos ou artistas.</p>
        <p>Para medir e proteger a entrega, registramos impressões, cliques e identificadores técnicos de visitante ou sessão, aplicamos limites de frequência e mecanismos contra duplicidade ou tráfego inválido. Anunciantes recebem resultados agregados de campanha; não recebem nome, e-mail, telefone, localização precisa, histórico individual ou identidade dos usuários que visualizaram ou clicaram em anúncios.</p>
        <p>Preferências opcionais de personalização cultural e publicidade mais relevante podem ser alteradas na <Link to="/settings/privacy">Central de Privacidade e Dados</Link>. Quando a personalização não estiver permitida, ainda poderão existir anúncios contextuais, institucionais ou necessários à operação comercial, sem uso da preferência opcional recusada.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>7.1. Cardápios, interações e patrocínios</h3>
        <p>Casas podem publicar um Cardápio Essencial com itens, descrições, preços, disponibilidade, porções e características. As informações são fornecidas e revisadas pela equipe autorizada da casa; valores e disponibilidade podem mudar e devem ser confirmados no local.</p>
        <p>Usuários autenticados podem indicar que desejam provar, recomendam ou querem salvar um item. Essas escolhas ficam vinculadas à conta para sincronização e prevenção de abuso. A casa visualiza apenas sinais agregados quando houver volume mínimo suficiente; não recebe a identidade individual de quem interagiu.</p>
        <p>Cardápios podem conter publicidade identificada pelas expressões “PUBLICIDADE” e “Cardápio apresentado por”. O inventário é administrado exclusivamente pelo 77Gira; a elegibilidade e a entrega podem considerar política comercial, período, orçamento, ritmo, frequência, localização, contexto editorial e disponibilidade, sem permitir que a casa selecione, aprove, rejeite ou bloqueie anunciantes.</p>
        <p>A publicidade não altera preços, não representa recomendação individual do usuário nem cria necessariamente parceria entre a marca e a casa. As exibições não geram cashback, Patacos, remuneração ou participação automática em receita para a casa.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>8. Patacos e processamento de pagamentos</h3>
        <p>Patacos são unidades de mídia usadas para organizar orçamento e veiculação de campanhas. Durante a fase de desenvolvimento, o gateway disponível é uma simulação controlada: ele registra ordens, estados de teste e movimentações de carteira, mas não realiza cobrança real nem solicita dados bancários ou de cartão.</p>
        <p>Antes da ativação de um meio de pagamento real, esta política e os fluxos de transparência serão atualizados para informar o provedor, os dados tratados, as responsabilidades, as finalidades e as regras aplicáveis à transação. Dados financeiros processados diretamente por um futuro provedor estarão também sujeitos aos termos e à política desse prestador.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>9. Conteúdo público, equipes e compartilhamento</h3>
        <p>Informações publicadas em eventos, páginas de casas, perfis de artistas, EPKs, agendas, mídias e anúncios podem ser visíveis mesmo para pessoas sem conta. Antes de publicar, verifique se o conteúdo é adequado à exposição pública e se você possui autorização sobre imagens, contatos e demais informações de terceiros.</p>
        <p>Dados de contratação, reivindicação, equipe e operação são disponibilizados apenas a usuários com vínculo e permissão compatíveis. Administradores do 77Gira podem acessá-los quando necessário para revisão, suporte, segurança, auditoria, moderação ou cumprimento de obrigações.</p>
        <p>Podemos compartilhar o mínimo necessário com operadores de hospedagem, banco de dados, armazenamento de objetos e entrega de conteúdo — inclusive o Cloudflare R2 quando habilitado —, comunicação, notificações, monitoramento, segurança e suporte. Também poderemos compartilhar informações por obrigação legal, ordem válida de autoridade, proteção de direitos ou operação societária legítima, com as salvaguardas cabíveis.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>10. Armazenamento local, cookies e tecnologias semelhantes</h3>
        <p>O aplicativo utiliza armazenamento local, armazenamento de sessão e tecnologias equivalentes para manter autenticação, onboarding, preferências, filtros, estado da interface, identificadores técnicos, prevenção de repetição e funcionamento de recursos. A limpeza desses dados, o bloqueio pelo navegador ou a navegação privada podem encerrar sessões, redefinir escolhas ou limitar funcionalidades.</p>
        <p>Quando uma tecnologia não for estritamente necessária e exigir consentimento, ofereceremos controle compatível com a finalidade. As escolhas registradas poderão ser consultadas ou alteradas nos recursos de privacidade disponíveis.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>11. Armazenamento e transferências internacionais</h3>
        <p>Dados e arquivos podem ser processados por infraestrutura em nuvem localizada no Brasil ou no exterior. Quando houver transferência internacional de dados pessoais, adotaremos mecanismo previsto na LGPD e na regulamentação da ANPD, além de medidas contratuais, técnicas e organizacionais compatíveis com o risco e com a natureza do tratamento.</p>
        <p>A localização dos servidores não altera os direitos assegurados nesta política. Avaliamos fornecedores considerando finalidade, necessidade, segurança, acesso e continuidade do serviço.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>12. Retenção e eliminação</h3>
        <p>Conservamos dados pelo tempo necessário para entregar a funcionalidade, cumprir a finalidade informada, manter integridade de contas e campanhas, atender obrigações legais, resolver disputas, prevenir fraude e exercer direitos. Os prazos variam segundo a categoria, o vínculo, o estado da conta e o risco envolvido.</p>
        <p>Após o término do tratamento, os dados serão eliminados ou anonimizados, salvo quando sua conservação for permitida ou exigida. Registros de auditoria, segurança, consentimento, reivindicação, revisão publicitária, carteira e atendimento de direitos podem ser mantidos por período compatível com prestação de contas, defesa e obrigações aplicáveis. Cópias de segurança podem persistir por ciclo limitado até sua sobrescrita segura.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>13. Segurança e resposta a incidentes</h3>
        <p>Adotamos medidas técnicas e organizacionais proporcionais ao serviço, incluindo senhas protegidas por hash, autenticação por tokens, controles de acesso por função e permissão, validação de entrada e arquivos, limitação de requisições, proteção de rotas, segregação de ambientes, registros de auditoria, encerramento de sessões em dispositivos e monitoramento operacional.</p>
        <p>Nenhum sistema é absolutamente invulnerável. Proteja suas credenciais, não compartilhe sessões e informe imediatamente qualquer suspeita de acesso indevido. Quando ocorrer incidente que possa gerar risco ou dano relevante, adotaremos medidas de contenção, investigação e comunicação aos titulares e à ANPD, quando exigido pela legislação.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>14. Seus direitos e como exercê-los</h3>
        <p>Nos termos da LGPD, você pode solicitar confirmação do tratamento; acesso; correção; informação sobre compartilhamento; anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade; portabilidade, quando regulamentada e aplicável; eliminação de dados tratados com consentimento, observadas as exceções legais; informação sobre a possibilidade de negar consentimento; revogação do consentimento; oposição; e revisão de decisões tomadas unicamente com base em tratamento automatizado que afetem seus interesses.</p>
        <p>Você pode ajustar preferências, baixar uma cópia dos seus dados, registrar solicitações e acompanhar o histórico na <Link to="/settings/privacy">Central de Privacidade e Dados</Link>. Para proteger a conta e terceiros, poderemos confirmar sua identidade antes de concluir o pedido. Responderemos nos prazos e formatos aplicáveis, informando eventual impossibilidade ou fundamento legítimo para retenção.</p>
        <p>Recomendações, moderação preventiva e métricas podem utilizar regras automatizadas, mas o produto atualmente não prevê decisão exclusivamente automatizada com efeito jurídico ou impacto equivalente sobre o usuário.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>15. Crianças e adolescentes</h3>
        <p>O 77Gira não é desenvolvido especificamente para crianças. Menores de idade devem utilizar o serviço com assistência ou representação de responsável legal, conforme a idade, a capacidade e a legislação aplicável. Se identificarmos tratamento incompatível com essas condições, poderemos restringir o acesso, solicitar confirmação do responsável ou adotar medidas para eliminar ou regularizar os dados.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>16. Atualizações desta política</h3>
        <p>Esta política poderá ser atualizada para acompanhar novas funcionalidades, fornecedores, práticas de segurança, modelos comerciais ou exigências legais. Mudanças relevantes serão comunicadas por meios adequados. Quando uma nova finalidade depender de consentimento, solicitaremos uma decisão específica antes do tratamento correspondente.</p>
        <p>A versão, a data e as decisões de consentimento registradas permitem distinguir as regras vigentes em cada momento. A versão atual permanecerá disponível nesta página.</p>
      </article>

      <p className="meta-line legal-updated">Versão 1.2 · Última atualização: 15/07/2026</p>
      <BackLink to="/settings">Voltar para Configurações</BackLink>
    </section>
  );
}
