import BackLink from "../components/common/BackLink";

export default function HelpPage() {
  return (
    <section className="screen legal-screen">
      <header className="page-header"><h2>Central de Ajuda</h2><p>Encontre os principais caminhos do 77Gira e saiba como agir quando algo não sair como esperado.</p></header>

      <article className="clean-card legal-card"><h3>Descobrir sambas e eventos</h3><ul className="legal-list"><li>Em <strong>Explorar</strong>, use período, região, horário e busca para refinar a agenda.</li><li>O selo “ao vivo” depende do horário cadastrado; confirme alterações diretamente com a casa ou produção.</li><li>Abra o evento para acessar detalhes, artista, casa, compartilhamento e atalhos de rota.</li><li>Use <strong>Pela Hora</strong> para organizar uma sequência de eventos; tempos e rotas são estimativas.</li></ul></article>

      <article className="clean-card legal-card"><h3>Radar, histórico e artistas</h3><ul className="legal-list"><li>Entre na sua conta para salvar eventos no <strong>Meu Radar</strong> e sincronizar preferências.</li><li>Registre presença para construir seu histórico e acompanhar conquistas disponíveis.</li><li>Siga artistas para manter seus interesses organizados e acessar rapidamente perfis oficiais.</li><li>Perfis com selo verificado possuem vínculo confirmado com uma equipe autorizada.</li></ul></article>

      <article className="clean-card legal-card"><h3>Notificações e localização</h3><ul className="legal-list"><li>Recursos de proximidade só funcionam quando a localização é permitida no navegador ou dispositivo.</li><li>Notificações dependem da permissão do sistema e podem ser desativadas a qualquer momento.</li><li>Se não receber alertas, verifique permissões, economia de bateria e bloqueios de notificação do navegador.</li></ul></article>

      <article className="clean-card legal-card"><h3>Perfis de artistas e EPK</h3><ul className="legal-list"><li>Para administrar um artista, abra seu perfil público e selecione <strong>Reivindicar perfil</strong>.</li><li>Após aprovação, o <strong>Hub de Gestão</strong> em Configurações libera perfil profissional, mídias, contratações e desempenho.</li><li>No EPK, mantenha bio curta, release, foto, capa, gêneros, agenda, regiões atendidas e links oficiais atualizados.</li><li>Fotos aceitam JPG, PNG ou WebP. Vídeos são adicionados por links externos compatíveis.</li><li>Solicitações de contratação aparecem em <strong>Contratações</strong> apenas para gestores autorizados daquele artista.</li></ul></article>

      <article className="clean-card legal-card"><h3>Casas e produtores</h3><ul className="legal-list"><li>Casas e produtores veem somente os cadastros autorizados por seu papel e vínculos aprovados.</li><li>Mantenha endereço, região, imagem, contatos, programação, preços e horários corretos.</li><li>Revise eventos antes de publicar; informações encerradas deixam de aparecer na agenda pública.</li><li>Convites e acessos devem ser concedidos apenas a pessoas da operação.</li></ul></article>

      <article className="clean-card legal-card"><h3>Anunciantes e campanhas</h3><ul className="legal-list"><li>A Central do Anunciante aparece quando existe uma conta anunciante vinculada e ativa.</li><li>Campanhas e criativos começam como rascunho e podem exigir envio para revisão.</li><li>Utilize imagens nos formatos e proporções indicados e destinos HTTPS confiáveis.</li><li>Aprovação, rejeição ou pedido de ajustes ficam registrados no fluxo de revisão.</li></ul></article>

      <article className="clean-card legal-card"><h3>Conta, foto e acesso</h3><ul className="legal-list"><li>Em Configurações, toque no avatar para enviar ou substituir sua foto de perfil.</li><li>Se a sessão expirar, entre novamente; suas informações sincronizadas permanecem associadas à conta.</li><li>Não compartilhe senha ou tokens. Em caso de suspeita de acesso indevido, encerre a sessão e procure o suporte.</li><li>Alguns recursos podem estar desativados durante implantação gradual ou manutenção.</li></ul></article>

      <article className="clean-card legal-card"><h3>Solução de problemas</h3><ul className="legal-list"><li>Atualize a página e confirme sua conexão com a internet.</li><li>Verifique se está na conta e no perfil profissional corretos.</li><li>Para uploads, confirme formato, tamanho e permissões do arquivo.</li><li>Ao pedir ajuda, informe e-mail da conta, tela, horário aproximado e mensagem de erro — nunca envie sua senha.</li></ul></article>

      <article className="clean-card legal-card"><h3>Fale com o suporte</h3><p>Envie sua solicitação para <a href="mailto:77giramundo@gmail.com">77giramundo@gmail.com</a>. Pedidos sobre dados pessoais também podem ser encaminhados por esse canal.</p></article>

      <p className="meta-line legal-updated">Última atualização: 05/07/2026</p>
      <BackLink to="/settings">Voltar para Configurações</BackLink>
    </section>
  );
}
