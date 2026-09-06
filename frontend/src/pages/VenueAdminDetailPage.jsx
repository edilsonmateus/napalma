import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FilePenLine,
  MapPin,
  MenuSquare,
  PauseCircle,
  ShieldAlert,
  Trash2,
  UsersRound
} from "lucide-react";
import {
  useAdminVenueDeletionImpactQuery,
  useAdminVenueDeletionMutation,
  useAdminVenueOverviewQuery,
  useAdminVenueVisibilityImpactQuery,
  useAdminVenueVisibilityMutation
} from "../hooks/useEventsQuery";
import "../styles/venue-admin-detail.css";

const STATUS_LABEL = {
  draft: "Rascunho",
  published: "Publicada",
  paused: "Pausada"
};

const MENU_STATUS_LABEL = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
  not_configured: "Ainda não configurado"
};

const PAUSE_REASONS = [
  ["venue_request", "Solicitação da casa"],
  ["temporary_closure", "Fechamento temporário"],
  ["catalog_review", "Revisão de catálogo"],
  ["schedule_issue", "Inconsistência de programação"],
  ["operational_other", "Outro motivo operacional"]
];

function formatDate(value, withTime = false) {
  if (!value) return "Ainda não registrada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(new Date(value));
}

function statusDescription(status) {
  if (status === "draft") return "A casa ainda não aparece no catálogo público. A operação interna permanece disponível.";
  if (status === "paused") return "A casa está fora das experiências públicas. Dados, agenda e vínculos foram preservados.";
  return "A casa pode aparecer nas experiências públicas compatíveis com sua programação e demais regras.";
}

function EmptyValue({ children = "Não informado" }) {
  return <span className="venue-admin-detail__empty">{children}</span>;
}

export default function VenueAdminDetailPage() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { data: venue, isLoading, isError, error, refetch } = useAdminVenueOverviewQuery(venueId);
  const [visibilityDialog, setVisibilityDialog] = useState("");
  const [pauseReasonCode, setPauseReasonCode] = useState(PAUSE_REASONS[0][0]);
  const [actionFeedback, setActionFeedback] = useState("");
  const [deletionDialog, setDeletionDialog] = useState(false);
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [deletionFeedback, setDeletionFeedback] = useState("");
  const [deletionCompleted, setDeletionCompleted] = useState(false);
  const confirmButtonRef = useRef(null);
  const deletionConfirmButtonRef = useRef(null);
  const deletionInputRef = useRef(null);
  const deletionDialogRef = useRef(null);
  const impactQuery = useAdminVenueVisibilityImpactQuery(venueId, Boolean(visibilityDialog));
  const visibilityMutation = useAdminVenueVisibilityMutation();
  const deletionImpactQuery = useAdminVenueDeletionImpactQuery(venueId, deletionDialog);
  const deletionMutation = useAdminVenueDeletionMutation();

  useEffect(() => {
    if (!visibilityDialog) return undefined;
    const previousFocus = document.activeElement;
    const timer = window.setTimeout(() => confirmButtonRef.current?.focus(), 0);
    const handleEscape = (event) => {
      if (event.key === "Escape" && !visibilityMutation.isPending) setVisibilityDialog("");
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleEscape);
      previousFocus?.focus?.();
    };
  }, [visibilityDialog, visibilityMutation.isPending]);

  useEffect(() => {
    if (!deletionDialog) return undefined;
    const previousFocus = document.activeElement;
    const timer = window.setTimeout(() => {
      if (deletionCompleted) deletionConfirmButtonRef.current?.focus();
      else if (deletionInputRef.current && !deletionInputRef.current.disabled) deletionInputRef.current.focus();
      else deletionDialogRef.current?.focus();
    }, 0);
    const handleEscape = (event) => {
      if (event.key === "Escape" && !deletionMutation.isPending && !deletionCompleted) setDeletionDialog(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleEscape);
      previousFocus?.focus?.();
    };
  }, [deletionCompleted, deletionDialog, deletionMutation.isPending]);

  if (isLoading) {
    return <section className="venue-admin-detail venue-admin-detail--loading" aria-busy="true"><p>Carregando ficha administrativa da casa…</p></section>;
  }

  if (isError) {
    const status = error?.response?.status;
    const title = status === 404 ? "Casa não encontrada" : status === 403 ? "Acesso restrito" : "Não foi possível abrir esta ficha";
    const message = status === 404
      ? "A casa pode ter sido removida ou o endereço está incorreto."
      : status === 403
        ? "Esta ficha é exclusiva para administração da plataforma."
        : "Seus dados continuam preservados. Tente novamente ou volte para a lista de casas.";
    return (
      <section className="venue-admin-detail venue-admin-detail--error">
        <ShieldAlert aria-hidden="true" size={28} />
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="venue-admin-detail__actions">
          {status !== 403 && status !== 404 ? <button type="button" className="venue-admin-detail__button venue-admin-detail__button--primary" onClick={() => refetch()}>Tentar novamente</button> : null}
          <Link className="venue-admin-detail__button venue-admin-detail__button--secondary" to="/settings/venues?section=venues">Voltar para Casas</Link>
        </div>
      </section>
    );
  }

  const status = venue.visibility.status;
  const isPublished = status === "published";
  const menuStatus = venue.menu?.status || "not_configured";
  const location = [venue.presentation.neighborhood, venue.presentation.region, venue.presentation.city, venue.presentation.state].filter(Boolean).join(" · ");
  const dialogImpact = impactQuery.data?.impact || venue.impact;
  const dialogTitle = visibilityDialog === "pause"
    ? "Pausar visibilidade da casa?"
    : visibilityDialog === "publish"
      ? "Publicar esta casa?"
      : "Reativar visibilidade da casa?";
  const dialogStatus = visibilityDialog === "pause" ? "paused" : "published";

  async function confirmVisibilityChange() {
    try {
      setActionFeedback("");
      const result = await visibilityMutation.mutateAsync({
        venueId,
        status: dialogStatus,
        reasonCode: visibilityDialog === "pause" ? pauseReasonCode : undefined,
        expectedStatus: status
      });
      setVisibilityDialog("");
      if (!result.changed) {
        setActionFeedback("A casa já estava neste estado.");
      } else if (dialogStatus === "paused") {
        setActionFeedback(`Visibilidade pausada. ${result.cancelledReminders || 0} lembrete(s) pendente(s) foram interrompidos.`);
      } else if (status === "draft") {
        setActionFeedback("Casa publicada. A programação confirmada volta a ficar elegível nas experiências públicas.");
      } else {
        setActionFeedback("Visibilidade reativada. Lembretes cancelados durante a pausa não são recriados automaticamente.");
      }
    } catch (mutationError) {
      if (mutationError?.response?.status === 409) {
        await refetch();
        setActionFeedback("O estado desta casa mudou em outra sessão. A ficha foi atualizada; confira antes de confirmar novamente.");
        setVisibilityDialog("");
        return;
      }
      setActionFeedback(mutationError?.response?.data?.message || "Não foi possível atualizar a visibilidade agora.");
    }
  }

  function openDeletionDialog() {
    setDeletionConfirmation("");
    setDeletionFeedback("");
    setDeletionCompleted(false);
    setDeletionDialog(true);
  }

  async function confirmDeletion() {
    try {
      setDeletionFeedback("");
      await deletionMutation.mutateAsync({ venueId, confirmationName: deletionConfirmation });
      setDeletionCompleted(true);
    } catch (mutationError) {
      if (mutationError?.response?.status === 409) {
        await deletionImpactQuery.refetch();
      }
      setDeletionFeedback(mutationError?.response?.data?.message || "Não foi possível excluir esta casa agora.");
    }
  }

  return (
    <section className="venue-admin-detail">
      <Link className="venue-admin-detail__back" to="/settings/venues?section=venues"><ArrowLeft size={16} /> Voltar para Casas</Link>

      <header className="venue-admin-detail__header">
        <div className="venue-admin-detail__identity">
          {venue.presentation.imageUrl ? <img src={venue.presentation.imageUrl} alt="" className="venue-admin-detail__image" /> : <div className="venue-admin-detail__image venue-admin-detail__image--fallback" aria-hidden="true">77</div>}
          <div>
            <p className="venue-admin-detail__eyebrow">FICHA ADMINISTRATIVA</p>
            <h1>{venue.name}</h1>
            <p className="venue-admin-detail__location"><MapPin size={15} /> {location || "Localização não informada"}</p>
            <span className={`venue-admin-detail__status venue-admin-detail__status--${status}`}><span aria-hidden="true" />{STATUS_LABEL[status] || status}</span>
            {venue.visibility.changedAt ? <p className="venue-admin-detail__changed">Última mudança de visibilidade: {formatDate(venue.visibility.changedAt, true)}</p> : null}
          </div>
        </div>
        <div className="venue-admin-detail__header-actions">
          <Link className="venue-admin-detail__button venue-admin-detail__button--primary" to={`/settings/venues?section=venues&edit=${venue.id}`}><FilePenLine size={16} /> Editar dados</Link>
          {isPublished ? <Link className="venue-admin-detail__button venue-admin-detail__button--secondary" to={`/venues/${venue.id}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Ver perfil público</Link> : null}
          <button type="button" className={`venue-admin-detail__button ${isPublished ? "venue-admin-detail__button--warning" : "venue-admin-detail__button--success"}`} onClick={() => setVisibilityDialog(isPublished ? "pause" : status === "draft" ? "publish" : "resume")}>
            {isPublished ? <><PauseCircle size={16} /> Pausar visibilidade</> : <><CheckCircle2 size={16} /> {status === "draft" ? "Publicar casa" : "Reativar visibilidade"}</>}
          </button>
        </div>
      </header>

      {status !== "published" ? <div className="venue-admin-detail__notice" role="status"><PauseCircle size={18} /> <span>{statusDescription(status)}</span></div> : null}
      {actionFeedback ? <div className="venue-admin-detail__feedback" role="status">{actionFeedback}</div> : null}

      <div className="venue-admin-detail__grid">
        <article className="venue-admin-detail__card venue-admin-detail__card--presentation">
          <h2>Apresentação pública</h2>
          <dl>
            <div><dt>Nome de exibição</dt><dd>{venue.presentation.displayNameWithArticle || venue.name}</dd></div>
            <div><dt>Apelido</dt><dd>{venue.presentation.nickname || <EmptyValue />}</dd></div>
            <div><dt>Descrição</dt><dd>{venue.presentation.description || <EmptyValue />}</dd></div>
            <div><dt>Endereço</dt><dd>{venue.presentation.address || <EmptyValue />}</dd></div>
            <div><dt>Dias de funcionamento</dt><dd>{venue.presentation.openDays.length ? venue.presentation.openDays.join(", ") : <EmptyValue />}</dd></div>
            <div><dt>Instagram</dt><dd>{venue.presentation.instagramUrl ? <a href={venue.presentation.instagramUrl} target="_blank" rel="noreferrer">Abrir perfil</a> : <EmptyValue />}</dd></div>
          </dl>
        </article>

        <article className="venue-admin-detail__card">
          <h2><UsersRound size={18} /> Operação</h2>
          <dl>
            <div><dt>Responsável</dt><dd>{venue.operation.contactName || <EmptyValue />}</dd></div>
            <div><dt>Telefone</dt><dd>{venue.operation.contactPhone || <EmptyValue />}</dd></div>
            <div><dt>Criador do registro</dt><dd>{venue.operation.createdBy?.name || venue.operation.createdBy?.email || <EmptyValue />}</dd></div>
            <div><dt>Acessos vinculados</dt><dd>{venue.operation.accessCount}</dd></div>
          </dl>
          <div className="venue-admin-detail__people"><strong>Gestores</strong>{venue.operation.managers.length ? venue.operation.managers.map((person) => <span key={person.id}>{person.name || person.email}</span>) : <EmptyValue>Nenhum gestor vinculado</EmptyValue>}</div>
          <div className="venue-admin-detail__people"><strong>Produtores</strong>{venue.operation.producers.length ? venue.operation.producers.map((person) => <span key={person.id}>{person.name || person.email}</span>) : <EmptyValue>Nenhum produtor vinculado</EmptyValue>}</div>
        </article>

        <article className="venue-admin-detail__card">
          <h2><CalendarDays size={18} /> Programação</h2>
          <div className="venue-admin-detail__metrics">
            <span><strong>{venue.programming.totalEvents}</strong>Total de eventos</span>
            <span><strong>{venue.programming.futureEvents}</strong>Futuros</span>
            <span><strong>{venue.programming.confirmedEvents}</strong>Confirmados</span>
            <span><strong>{venue.programming.draftEvents}</strong>Rascunhos</span>
          </div>
          {venue.programming.upcomingEvents.length ? <ul className="venue-admin-detail__event-list">{venue.programming.upcomingEvents.map((event) => <li key={event.id}><span>{event.title}</span><small>{formatDate(event.startDate, true)} · {event.status === "confirmed" ? "Confirmado" : "Rascunho"}</small></li>)}</ul> : <p className="venue-admin-detail__empty">Nenhum próximo evento cadastrado.</p>}
          <Link className="venue-admin-detail__inline-link" to="/settings/venues?section=events">Abrir gestão da programação</Link>
        </article>

        <article className="venue-admin-detail__card">
          <h2><MenuSquare size={18} /> Cardápio e recursos</h2>
          <dl>
            <div><dt>Cardápio</dt><dd>{MENU_STATUS_LABEL[menuStatus] || menuStatus}</dd></div>
            <div><dt>Última revisão</dt><dd>{venue.menu?.reviewedAt ? formatDate(venue.menu.reviewedAt, true) : <EmptyValue />}</dd></div>
            <div><dt>Analytics</dt><dd>{venue.analytics.tier}</dd></div>
            <div><dt>Origem do acesso</dt><dd>{venue.analytics.accessSource || <EmptyValue />}</dd></div>
          </dl>
          <Link className="venue-admin-detail__inline-link" to={`/settings/venues/${venue.id}/menu`}>Gerenciar cardápio</Link>
        </article>

        <article className="venue-admin-detail__card venue-admin-detail__card--visibility">
          <h2><Clock3 size={18} /> Visibilidade</h2>
          <p>{statusDescription(status)}</p>
          <div className="venue-admin-detail__impact-summary">
            <span><strong>{venue.impact.futureConfirmed}</strong> eventos confirmados futuros</span>
            <span><strong>{venue.impact.pendingReminders}</strong> lembretes pendentes</span>
            <span><strong>{venue.impact.activeRadarMarks}</strong> marcações futuras no Radar</span>
          </div>
          <p className="venue-admin-detail__muted">A alteração exige confirmação, registra a decisão e mantém programação, cardápio e vínculos intactos.</p>
        </article>

        <article className="venue-admin-detail__card venue-admin-detail__card--risk">
          <h2><ShieldAlert size={18} /> Área de risco</h2>
          <p>Para retirada temporária, use a pausa de visibilidade. A exclusão definitiva só é possível quando a casa não possui nenhum vínculo operacional ou histórico.</p>
          <p className="venue-admin-detail__muted">A confirmação exige digitar exatamente o nome da casa e registra a decisão na auditoria.</p>
          <button type="button" className="venue-admin-detail__button venue-admin-detail__button--danger" onClick={openDeletionDialog}><Trash2 size={16} /> Excluir definitivamente</button>
        </article>
      </div>
      <div className="venue-admin-detail__screen-reader-status" aria-live="polite">Ficha administrativa carregada para {venue.name}.</div>
      {visibilityDialog ? <div className="venue-admin-detail__dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !visibilityMutation.isPending) setVisibilityDialog(""); }}>
        <section className="venue-admin-detail__dialog" role="dialog" aria-modal="true" aria-labelledby="venue-visibility-dialog-title">
          <h2 id="venue-visibility-dialog-title">{dialogTitle}</h2>
          <p>{visibilityDialog === "pause"
            ? "A casa deixará de aparecer publicamente. Eventos, cardápio, vínculos, campanha e histórico serão preservados."
            : "A casa voltará a ser elegível para as experiências públicas compatíveis com sua programação."}</p>
          {visibilityDialog === "pause" ? <label className="venue-admin-detail__dialog-field">Motivo da pausa<select value={pauseReasonCode} onChange={(event) => setPauseReasonCode(event.target.value)} disabled={visibilityMutation.isPending}>{PAUSE_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
          <div className="venue-admin-detail__dialog-impact" aria-busy={impactQuery.isLoading}>
            <strong>Impacto previsto</strong>
            <span>{dialogImpact.futureConfirmed} eventos confirmados futuros</span>
            <span>{dialogImpact.futureDraft} rascunhos futuros</span>
            <span>{dialogImpact.pendingReminders} lembretes pendentes {visibilityDialog === "pause" ? "a interromper" : "que não serão recriados"}</span>
            <span>{dialogImpact.activeRadarMarks} marcações futuras no Radar</span>
          </div>
          {visibilityDialog === "resume" ? <p className="venue-admin-detail__dialog-note">Lembretes cancelados durante a pausa não são recriados automaticamente.</p> : null}
          <div className="venue-admin-detail__dialog-actions">
            <button type="button" className="venue-admin-detail__button venue-admin-detail__button--secondary" onClick={() => setVisibilityDialog("")} disabled={visibilityMutation.isPending}>Cancelar</button>
            <button ref={confirmButtonRef} type="button" className={`venue-admin-detail__button ${visibilityDialog === "pause" ? "venue-admin-detail__button--warning" : "venue-admin-detail__button--success"}`} onClick={confirmVisibilityChange} disabled={visibilityMutation.isPending}>{visibilityMutation.isPending ? "Confirmando…" : visibilityDialog === "pause" ? "Confirmar pausa" : visibilityDialog === "publish" ? "Confirmar publicação" : "Confirmar reativação"}</button>
          </div>
        </section>
      </div> : null}
      {deletionDialog ? <div className="venue-admin-detail__dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletionMutation.isPending && !deletionCompleted) setDeletionDialog(false); }}>
        <section ref={deletionDialogRef} tabIndex="-1" className="venue-admin-detail__dialog venue-admin-detail__dialog--danger" role="dialog" aria-modal="true" aria-labelledby="venue-deletion-dialog-title">
          {deletionCompleted ? <>
            <h2 id="venue-deletion-dialog-title">Casa excluída</h2>
            <p>O registro foi removido e a decisão foi registrada na auditoria.</p>
            <div className="venue-admin-detail__dialog-actions"><button ref={deletionConfirmButtonRef} type="button" className="venue-admin-detail__button venue-admin-detail__button--primary" onClick={() => navigate("/settings/venues?section=venues")}>Voltar para Casas</button></div>
          </> : <>
            <h2 id="venue-deletion-dialog-title">Excluir definitivamente esta casa?</h2>
            <p>Esta ação é irreversível. Antes de permitir a exclusão, verificamos eventos, cardápio, acessos, reivindicações, aquisição e histórico de Ads.</p>
            <div className="venue-admin-detail__dialog-impact" aria-busy={deletionImpactQuery.isLoading}>
              <strong>Verificação de vínculos</strong>
              {deletionImpactQuery.isLoading ? <span>Verificando vínculos…</span> : deletionImpactQuery.isError ? <span>Não foi possível verificar os vínculos agora.</span> : <>
                <span>{deletionImpactQuery.data?.totalDependencies || 0} vínculo(s) encontrado(s)</span>
                <span>{deletionImpactQuery.data?.canDelete ? "A exclusão pode prosseguir." : "A exclusão está bloqueada para preservar dados relacionados."}</span>
              </>}
            </div>
            {!deletionImpactQuery.isLoading && !deletionImpactQuery.isError ? <label className="venue-admin-detail__dialog-field">Digite <strong>{venue.name}</strong> para confirmar<input ref={deletionInputRef} value={deletionConfirmation} onChange={(event) => setDeletionConfirmation(event.target.value)} autoComplete="off" disabled={deletionMutation.isPending || !deletionImpactQuery.data?.canDelete} /></label> : null}
            {deletionFeedback ? <p className="venue-admin-detail__dialog-error" role="alert">{deletionFeedback}</p> : null}
            <div className="venue-admin-detail__dialog-actions">
              <button type="button" className="venue-admin-detail__button venue-admin-detail__button--secondary" onClick={() => setDeletionDialog(false)} disabled={deletionMutation.isPending}>Cancelar</button>
              <button ref={deletionConfirmButtonRef} type="button" className="venue-admin-detail__button venue-admin-detail__button--danger" onClick={confirmDeletion} disabled={deletionMutation.isPending || !deletionImpactQuery.data?.canDelete || deletionConfirmation !== venue.name}>{deletionMutation.isPending ? "Excluindo…" : "Confirmar exclusão"}</button>
            </div>
          </>}
        </section>
      </div> : null}
    </section>
  );
}
